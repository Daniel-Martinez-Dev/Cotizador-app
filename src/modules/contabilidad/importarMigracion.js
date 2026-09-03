// Lectura del JSON de migración del libro "VENTAS CCS 2026".
//
// Es una fuente mejor que el CSV crudo de la hoja FACT: ya trae los clientes
// deduplicados con sus aliases, los productos normalizados, los arrastres de
// 2025 separados de las facturas y los pagos como entidades propias. Este
// módulo lo traduce al modelo de la app y, de paso, arregla lo que el archivo
// no podía traer:
//
//   · Las notas crédito no dicen a qué factura corrigen. Se enlazan por
//     cliente + neto idéntico + fecha anterior cuando la coincidencia es única.
//   · Los abonos vienen pegados a una sola factura, y 53 la desbordan por
//     $366.622.893 porque el pago consolidado se anotaba donde cayera. Se
//     reimputan por antigüedad (ver imputacion.js).
//   · 50 documentos traen el subtotal digitado sin valor unitario. Se deriva.
//
// Todo es puro: recibe texto, devuelve objetos. Nada se guarda hasta que la
// pantalla lo confirme.

import {
  DESTINO_DOCUMENTO,
  DESTINO_SALDO,
  PLAZO_POR_DEFECTO,
  TIPO_FACTURA,
  TIPO_NOTA_CREDITO,
  TIPO_NOTA_DEBITO,
  UNIDAD_POR_DEFECTO,
} from "./catalogos";
import { aNumero, redondear, sumarDias } from "./calculos";
import { capacidadDocumento, imputarTodos, resumirImputacion } from "./imputacion";
import { porcentajeIva } from "./importarFact";

// ─── Reparación del archivo ─────────────────────────────────────────────────

/**
 * El JSON sale del Excel repartido en varias celdas, y al pegarlo vuelve
 * envuelto como campo de CSV: comillas alrededor, comillas internas dobladas y
 * una frontera rota en cada unión de celdas —que llega a partir un dato por la
 * mitad ("DIVISIONES TERMICA" + "S", "anticipo_3": n + ull—.
 *
 * Esta función deshace las dos cosas. Si el texto ya es JSON válido lo deja
 * como está, así que se puede llamar siempre sin preguntar.
 */
export function repararJsonDeExcel(texto = "") {
  const limpio = String(texto).replace(/^﻿/, "").trim();
  if (!limpio.startsWith('"')) return limpio;

  const cuerpo = limpio.slice(1, -1);

  // Una comilla legítima siempre viene doblada; las sueltas son las fronteras
  // de celda, y vienen en pares con solo espacios en blanco entre medio.
  const sueltas = [];
  for (let i = 0; i < cuerpo.length; i += 1) {
    if (cuerpo[i] !== '"') continue;
    if (cuerpo[i + 1] === '"') { i += 1; continue; }
    sueltas.push(i);
  }

  const partes = [];
  let prev = 0;
  for (let k = 0; k + 1 < sueltas.length; k += 2) {
    const [a, b] = [sueltas[k], sueltas[k + 1]];
    if (cuerpo.slice(a + 1, b).trim() !== "") continue;
    partes.push(cuerpo.slice(prev, a));
    prev = b + 1;
  }
  partes.push(cuerpo.slice(prev));

  return partes.join("").replace(/""/g, '"');
}

/** Texto → objeto. Devuelve `{ datos, error }`; no lanza. */
export function leerMigracion(texto = "") {
  try {
    const datos = JSON.parse(repararJsonDeExcel(texto));
    if (!datos || typeof datos !== "object") return { datos: null, error: "El archivo no contiene un objeto JSON." };
    if (!Array.isArray(datos.documentos)) return { datos: null, error: "Falta el arreglo `documentos`." };
    return { datos, error: null };
  } catch (e) {
    return { datos: null, error: `No se pudo leer el JSON: ${e.message}` };
  }
}

// ─── Catálogos ──────────────────────────────────────────────────────────────

// Los códigos del archivo contra los del catálogo de la app.
const RETENCIONES = {
  ICA: "ica_madrid",
  RTE_IVA_15: "rte_iva_15",
  RTE_FTE_4: "rte_fte_4",
  RTE_FTE_2_5: "rte_fte_25",
};

const TIPOS = {
  FACTURA: TIPO_FACTURA,
  NOTA_CREDITO: TIPO_NOTA_CREDITO,
  NOTA_DEBITO: TIPO_NOTA_DEBITO,
};

const texto = (v) => String(v ?? "").trim();
const abs = (v) => Math.abs(redondear(aNumero(v)));

// ─── Documentos ─────────────────────────────────────────────────────────────

/**
 * Un documento del archivo al modelo de la app.
 *
 * Todos los importes quedan positivos: el signo de una nota crédito lo pone el
 * tipo, no el número (ver `signoDocumento`). Si se guardara el neto negativo
 * *y* se aplicara el signo, la nota restaría dos veces.
 */
export function mapearDocumento(fila = {}, { periodo, plazoDias = PLAZO_POR_DEFECTO } = {}) {
  const cantidad = Math.abs(aNumero(fila.cantidad)) || 1;
  const subtotal = abs(fila.subtotal);
  const iva = abs(fila.iva_19);
  const fecha = texto(fila.fecha_emision);
  const avisos = [];

  // 50 documentos traen el subtotal digitado y el valor unitario vacío (alguien
  // borró la fórmula). Se deriva, para que la línea cuadre con su subtotal.
  let valorUnitario = abs(fila.valor_unitario);
  if (!valorUnitario && subtotal) {
    valorUnitario = redondear(subtotal / cantidad);
    avisos.push("Valor unitario derivado del subtotal: en el Excel estaba vacío.");
  } else if (valorUnitario && subtotal && Math.abs(cantidad * valorUnitario - subtotal) > 1) {
    valorUnitario = redondear(subtotal / cantidad);
    avisos.push("Cantidad × valor unitario no daba el subtotal; se ajustó el unitario y se conservó el neto.");
  }

  const producto = texto(fila.producto);
  if (!producto) avisos.push("Sin producto: quedó solo en la descripción.");
  if (!fecha) avisos.push("Sin fecha de emisión.");

  // Las retenciones entran con el valor digitado, no recalculadas: ese monto ya
  // se declaró a la DIAN y no cambia porque hoy la tarifa sea otra.
  const retenciones = (fila.retenciones || []).map((r) => ({
    codigo: RETENCIONES[r.codigo] || texto(r.codigo).toLowerCase(),
    nombre: texto(r.nombre),
    base: "manual",
    porcentaje: 0,
    valor: abs(r.valor),
  })).filter((r) => r.valor > 0);

  const anioFecha = Number(fecha.slice(0, 4)) || 0;
  if (periodo && anioFecha && anioFecha !== periodo) {
    avisos.push(`Fecha de ${anioFecha} dentro del libro de ${periodo}; se reporta en ${periodo}.`);
  }

  return {
    claveOrigen: texto(fila.id),
    tipo: TIPOS[fila.tipo] || TIPO_FACTURA,
    numero: texto(fila.numero),
    fecha,
    plazoDias,
    fechaVencimiento: fecha ? sumarDias(fecha, plazoDias) : "",
    // El año en el que el libro lo reporta, que no siempre es el de su fecha.
    periodoContable: periodo || anioFecha,
    clienteOrigenId: fila.cliente_id ?? null,
    clienteNombre: texto(fila.cliente),
    clienteNit: "",
    items: [{
      producto: producto || texto(fila.descripcion) || "Sin concepto",
      descripcion: producto ? texto(fila.descripcion) : "",
      cantidad,
      unidad: UNIDAD_POR_DEFECTO,
      valorUnitario,
    }],
    ivaPorcentaje: porcentajeIva(subtotal, iva),
    retenciones,
    neto: abs(fila.neto_a_pagar),
    docAfectadoClave: "",
    observaciones: texto(fila.descripcion),
    anulado: false,
    origen: "migracion",
    filaExcel: fila.fila_excel ?? null,
    avisos,
  };
}

/**
 * Enlaza cada nota crédito con la factura que corrige.
 *
 * El archivo no trae el vínculo —en el Excel nunca existió—, así que se busca
 * por cliente, neto idéntico y fecha anterior o igual. Solo se enlaza cuando la
 * coincidencia es única: colgar la nota de la factura equivocada es peor que
 * dejarla suelta, y una nota sin enlazar igual descuenta del saldo del cliente.
 */
export function enlazarNotasCredito(documentos = []) {
  const facturas = documentos.filter((d) => d.tipo !== TIPO_NOTA_CREDITO);
  const ambiguas = [];
  const sinEnlace = [];
  let enlazadas = 0;

  for (const nc of documentos) {
    if (nc.tipo !== TIPO_NOTA_CREDITO) continue;
    const candidatas = facturas.filter(
      (f) => f.clienteOrigenId === nc.clienteOrigenId &&
        Math.abs(f.neto - nc.neto) < 1 &&
        (!f.fecha || !nc.fecha || f.fecha <= nc.fecha)
    );
    if (candidatas.length === 1) {
      nc.docAfectadoClave = candidatas[0].claveOrigen;
      enlazadas += 1;
    } else if (candidatas.length > 1) {
      nc.avisos.push(`No se enlazó: ${candidatas.length} facturas del cliente tienen ese mismo valor.`);
      ambiguas.push({ nota: nc.claveOrigen, candidatas: candidatas.map((c) => c.claveOrigen) });
    } else {
      nc.avisos.push("No se enlazó: ninguna factura del cliente coincide con su valor.");
      sinEnlace.push(nc.claveOrigen);
    }
  }
  return { enlazadas, ambiguas, sinEnlace };
}

// ─── Saldos iniciales ───────────────────────────────────────────────────────

export function mapearSaldos(datos) {
  return (datos.saldos_iniciales_2025 || [])
    .map((s, i) => ({
      claveOrigen: `saldo:${s.fila_excel ?? i}`,
      clienteOrigenId: s.cliente_id ?? null,
      clienteNombre: texto(s.cliente),
      clienteNit: "",
      anio: aNumero(s.anio) || 0,
      valor: redondear(aNumero(s.valor_neto)),
      observaciones: [texto(s.observaciones), s.factura_referencia ? `Factura ${s.factura_referencia}` : ""]
        .filter(Boolean).join(" · "),
      filaExcel: s.fila_excel ?? null,
      origen: "migracion",
    }))
    // Dos arrastres vienen sin valor: no son saldo de nadie.
    .filter((s) => s.valor !== 0);
}

// ─── Pagos ──────────────────────────────────────────────────────────────────

/**
 * Abonos del archivo, reimputados por antigüedad sobre lo que cada cliente
 * debe. Se conserva `documentoOrigen` —la factura donde el Excel lo tenía
 * anotado— para poder auditar el cambio.
 */
export function mapearPagos(datos, documentos, saldos) {
  const notasPorFactura = new Map();
  for (const d of documentos) {
    if (d.tipo !== TIPO_NOTA_CREDITO || !d.docAfectadoClave) continue;
    if (!notasPorFactura.has(d.docAfectadoClave)) notasPorFactura.set(d.docAfectadoClave, []);
    notasPorFactura.get(d.docAfectadoClave).push(d);
  }

  const porCliente = new Map();
  const asegurar = (cid) => {
    if (!porCliente.has(cid)) porCliente.set(cid, { pagos: [], destinos: [] });
    return porCliente.get(cid);
  };

  // Un arrastre positivo es lo más viejo que el cliente debe; uno negativo es
  // plata a su favor y no se cobra.
  for (const s of saldos) {
    if (s.valor <= 0) continue;
    asegurar(s.clienteOrigenId).destinos.push({ tipo: DESTINO_SALDO, id: s.claveOrigen, fecha: "", capacidad: s.valor });
  }
  for (const d of documentos) {
    if (d.tipo === TIPO_NOTA_CREDITO) continue;
    const capacidad = capacidadDocumento(d, notasPorFactura.get(d.claveOrigen) || []);
    if (capacidad <= 0) continue;
    asegurar(d.clienteOrigenId).destinos.push({ tipo: DESTINO_DOCUMENTO, id: d.claveOrigen, fecha: d.fecha, capacidad });
  }

  for (const p of datos.pagos || []) {
    asegurar(p.cliente_id ?? null).pagos.push({
      id: `pago:${p.id}`,
      clienteOrigenId: p.cliente_id ?? null,
      fecha: texto(p.fecha),
      fechaOriginal: p.fecha_original == null ? "" : String(p.fecha_original),
      valor: abs(p.valor),
      bancoNombre: texto(p.banco),
      documentoOrigen: texto(p.documento_id),
      origen: "migracion",
    });
  }

  const { pagos, pendientes } = imputarTodos(porCliente);
  return { pagos, pendientes, resumen: resumirImputacion(pagos) };
}

// ─── Punto de entrada ───────────────────────────────────────────────────────

export function importarMigracion(texto, { plazoDias = PLAZO_POR_DEFECTO } = {}) {
  const { datos, error } = leerMigracion(texto);
  if (error) return { ok: false, error, documentos: [], saldos: [], pagos: [], resumen: null };

  const periodo = aNumero(datos.meta?.periodo_detallado) || 0;
  const documentos = (datos.documentos || []).map((f) => mapearDocumento(f, { periodo, plazoDias }));
  const enlaces = enlazarNotasCredito(documentos);
  const saldos = mapearSaldos(datos);
  const { pagos, resumen: imputacion } = mapearPagos(datos, documentos, saldos);

  const control = datos.totales_control || {};
  const sumaNeto = redondear(documentos.reduce(
    (a, d) => a + (d.tipo === TIPO_NOTA_CREDITO ? -d.neto : d.neto), 0));
  const sumaPagos = redondear(pagos.reduce((a, p) => a + p.valor, 0));
  const sumaSaldos = redondear(saldos.reduce((a, s) => a + s.valor, 0));

  return {
    ok: true,
    error: null,
    documentos,
    saldos,
    pagos,
    clientes: datos.catalogos?.clientes || [],
    resumen: {
      periodo,
      documentos: documentos.length,
      facturas: documentos.filter((d) => d.tipo === TIPO_FACTURA).length,
      notasCredito: documentos.filter((d) => d.tipo === TIPO_NOTA_CREDITO).length,
      notasDebito: documentos.filter((d) => d.tipo === TIPO_NOTA_DEBITO).length,
      saldos: saldos.length,
      pagos: pagos.length,
      clientes: (datos.catalogos?.clientes || []).length,
      avisos: documentos.reduce((a, d) => a + d.avisos.length, 0),
      enlaces,
      imputacion,
      sumaNeto,
      sumaPagos,
      sumaSaldos,
      // El cuadre contra los totales que el propio archivo declara. Si algo de
      // esto no da, no se importa: es la única prueba de que no se perdió nada.
      cuadre: {
        documentos: documentos.length === control.documentos,
        pagos: pagos.length === control.pagos,
        neto: Math.abs(sumaNeto - aNumero(control.suma_neto_a_pagar)) < 1,
        pagosValor: Math.abs(sumaPagos - aNumero(control.suma_pagos)) < 1,
        saldos: Math.abs(sumaSaldos - aNumero(control.suma_saldos_iniciales_2025)) < 1,
      },
      control,
    },
  };
}
