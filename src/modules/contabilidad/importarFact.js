// Lectura del CSV de la hoja FACT del libro de Excel.
//
// Todo lo que aquí se hace es traducir 28 columnas planas al modelo de la app,
// arreglando de paso lo que el libro tenía torcido:
//
//   · Los tres bloques ANTICIPO/BANCO/FECHA se vuelven pagos sueltos, tantos
//     como haya (el Excel no admitía un cuarto abono).
//   · Las filas "E.C CORTE 2025" no son facturas: son el saldo que el cliente
//     traía del año anterior, y contarlas como venta del año inflaba el total.
//     Salen aparte, como saldos iniciales.
//   · Una nota crédito se marcaba pegándole " NOTA CREDITO" al nombre del
//     cliente y poniendo la cantidad en negativo — lo que duplicaba el cliente
//     en la base. Aquí se detecta, se limpia el nombre y se marca el tipo.
//
// El módulo es puro a propósito: recibe texto y devuelve objetos. Nada de
// Firestore, para poder mostrarle al usuario qué va a quedar guardado *antes*
// de escribir una sola línea.

import {
  IVA_POR_DEFECTO,
  PLAZO_POR_DEFECTO,
  RETENCIONES_POR_DEFECTO,
  TIPO_FACTURA,
  TIPO_NOTA_CREDITO,
  UNIDAD_POR_DEFECTO,
} from "./catalogos";
import { redondear, sumarDias } from "./calculos";

// ─── CSV ────────────────────────────────────────────────────────────────────

// Excel en español exporta con punto y coma (la coma ya es el separador
// decimal). Se mira la primera línea y gana el que más aparezca fuera de
// comillas, para no equivocarse con un nombre de cliente que traiga comas.
export function detectarSeparador(texto = "") {
  const linea = String(texto).split(/\r?\n/, 1)[0] || "";
  const conteo = { ";": 0, ",": 0, "\t": 0 };
  let enComillas = false;
  for (const ch of linea) {
    if (ch === '"') enComillas = !enComillas;
    else if (!enComillas && ch in conteo) conteo[ch] += 1;
  }
  const [mejor] = Object.entries(conteo).sort((a, b) => b[1] - a[1]);
  return mejor[1] > 0 ? mejor[0] : ";";
}

/** CSV a matriz de celdas. Respeta comillas, comillas dobladas y saltos dentro de una celda. */
export function parsearCSV(texto = "", separador = null) {
  const sep = separador || detectarSeparador(texto);
  const limpio = String(texto).replace(/^﻿/, "");
  const filas = [];
  let fila = [];
  let celda = "";
  let enComillas = false;

  for (let i = 0; i < limpio.length; i += 1) {
    const ch = limpio[i];
    if (enComillas) {
      if (ch === '"') {
        if (limpio[i + 1] === '"') { celda += '"'; i += 1; }
        else enComillas = false;
      } else celda += ch;
      continue;
    }
    if (ch === '"') { enComillas = true; continue; }
    if (ch === sep) { fila.push(celda); celda = ""; continue; }
    if (ch === "\n") { fila.push(celda); filas.push(fila); fila = []; celda = ""; continue; }
    if (ch === "\r") continue;
    celda += ch;
  }
  if (celda !== "" || fila.length) { fila.push(celda); filas.push(fila); }
  return filas;
}

// ─── Números ────────────────────────────────────────────────────────────────

const NO_NUMERO = /^(#|n\/?a\b|-+$)/i;

/**
 * Número escrito a la colombiana: "$ 1.234.567,89" → 1234567.89. Tolera el
 * formato inglés, los paréntesis contables como negativo, y devuelve 0 ante la
 * basura que dejó el Excel (#¡DIV/0! en G360:G369, o el texto " $ 6 ").
 */
export function parsearNumeroCO(valor) {
  if (typeof valor === "number") return Number.isFinite(valor) ? valor : 0;
  let s = String(valor ?? "").trim();
  if (!s || NO_NUMERO.test(s)) return 0;

  const negativoParentesis = /^\(.*\)$/.test(s);
  s = s.replace(/[()]/g, "");
  const negativo = negativoParentesis || s.includes("-");
  s = s.replace(/[^0-9.,]/g, "");
  if (!s) return 0;

  const tienePunto = s.includes(".");
  const tieneComa = s.includes(",");
  if (tienePunto && tieneComa) {
    // El separador decimal es el que aparece de último.
    const decimal = s.lastIndexOf(",") > s.lastIndexOf(".") ? "," : ".";
    const miles = decimal === "," ? "." : ",";
    s = s.split(miles).join("").replace(decimal, ".");
  } else if (tieneComa) {
    s = /^\d{1,3}(,\d{3})+$/.test(s) ? s.split(",").join("") : s.replace(",", ".");
  } else if (tienePunto) {
    if (/^\d{1,3}(\.\d{3})+$/.test(s)) s = s.split(".").join("");
  }

  const n = Number(s);
  if (!Number.isFinite(n)) return 0;
  return negativo ? -Math.abs(n) : n;
}

// ─── Fechas ─────────────────────────────────────────────────────────────────

const dosDigitos = (n) => String(n).padStart(2, "0");

// Excel guarda las fechas como días desde el 30/12/1899; un CSV mal exportado
// las trae así ("45678") en vez de como texto.
function desdeSerialExcel(n) {
  if (!Number.isFinite(n) || n < 1 || n > 80000) return "";
  const base = Date.UTC(1899, 11, 30);
  const d = new Date(base + Math.round(n) * 86400000);
  return `${d.getUTCFullYear()}-${dosDigitos(d.getUTCMonth() + 1)}-${dosDigitos(d.getUTCDate())}`;
}

/** Fecha a "YYYY-MM-DD". Día primero, como se escribe en Colombia. */
export function parsearFechaCO(valor) {
  const s = String(valor ?? "").trim();
  if (!s) return "";

  const iso = /^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/.exec(s);
  if (iso) return `${iso[1]}-${dosDigitos(iso[2])}-${dosDigitos(iso[3])}`;

  const dmy = /^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})/.exec(s);
  if (dmy) {
    const dia = Number(dmy[1]);
    const mes = Number(dmy[2]);
    let anio = Number(dmy[3]);
    if (anio < 100) anio += anio < 70 ? 2000 : 1900;
    if (mes < 1 || mes > 12 || dia < 1 || dia > 31) return "";
    return `${anio}-${dosDigitos(mes)}-${dosDigitos(dia)}`;
  }

  if (/^\d+([.,]\d+)?$/.test(s)) return desdeSerialExcel(parsearNumeroCO(s));
  return "";
}

// ─── Encabezados ────────────────────────────────────────────────────────────

export const normalizarEncabezado = (texto) =>
  String(texto ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

// Cada campo con los nombres que puede traer la columna. El primero que
// aparezca gana: la hoja tiene tres columnas más llamadas "FECHA" (las de los
// anticipos) y la de la factura es la primera.
const ALIAS = {
  fecha: ["fecha", "fecha factura", "fecha de factura"],
  cliente: ["cliente", "nombre cliente", "razon social"],
  numero: ["no fact", "no factura", "n fact", "num fact", "numero factura", "numero de factura", "factura", "no", "consecutivo"],
  cantidad: ["cant", "cantidad"],
  concepto: ["concepto del gasto", "concepto", "producto", "descripcion"],
  observaciones: ["observaciones", "observacion", "nota"],
  valorUnitario: ["valor unitario", "vr unitario", "valor unit", "precio unitario"],
  subtotal: ["subtotal", "sub total", "base"],
  ica: ["rte ica madrid", "rte ica", "reteica", "ica"],
  reteIva: ["rte iva 15", "rte iva", "reteiva"],
  reteFte4: ["rte fte 4", "retefuente 4", "rte fte 4 0"],
  reteFte25: ["rte fte 2 5", "rte fte 25", "retefuente 2 5"],
  iva: ["iva"],
  neto: ["neto a pagar", "neto", "total a pagar"],
  nit: ["nit", "documento", "identificacion"],
  plazo: ["plazo", "plazo dias", "dias plazo"],
  vencimiento: ["fecha vencimiento", "vencimiento", "fecha de vencimiento"],
};

// Las cuatro retenciones del libro, en el orden en que están sus columnas.
const COLUMNAS_RETENCION = [
  { campo: "ica", codigo: "ica_madrid" },
  { campo: "reteIva", codigo: "rte_iva_15" },
  { campo: "reteFte4", codigo: "rte_fte_4" },
  { campo: "reteFte25", codigo: "rte_fte_25" },
];

const nombreRetencion = (codigo) =>
  RETENCIONES_POR_DEFECTO.find((r) => r.codigo === codigo)?.nombre || codigo;

/**
 * Índice de cada campo dentro de la fila, y los bloques de pago.
 *
 * Los bloques no se buscan por nombre: hay tres columnas "BANCO" y tres
 * "FECHA" idénticas, así que se localiza cada "ANTICIPO n" y se toman las dos
 * columnas siguientes como su banco y su fecha, que es como está armada la
 * hoja.
 */
export function mapearColumnas(encabezados = []) {
  const normalizados = encabezados.map(normalizarEncabezado);
  const campos = {};
  for (const [campo, alias] of Object.entries(ALIAS)) {
    const idx = normalizados.findIndex((h) => h && alias.includes(h));
    if (idx >= 0) campos[campo] = idx;
  }

  const bloquesPago = normalizados
    .map((h, i) => ({ h, i }))
    .filter(({ h }) => /^anticipo(\s|$)|^abono(\s|$)|^pago(\s|$)/.test(h))
    .map(({ i }) => ({
      valor: i,
      banco: normalizados[i + 1] === "banco" ? i + 1 : -1,
      fecha: normalizados[i + 2] === "fecha" ? i + 2 : -1,
    }));

  return { campos, bloquesPago, encabezados: normalizados };
}

// ─── Filas ──────────────────────────────────────────────────────────────────

const sinTildes = (t) =>
  String(t ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase();

const RE_NOTA_CREDITO = /\bNOTAS?\s*(DE\s*)?CREDITO\b/;
const RE_SALDO_ANTERIOR = /\b(E\.?\s?C\.?\s*CORTE|SALDO\s+PENDIENTE\s+A[NÑ]O)\b/;
const RE_TOTALES = /^\s*(TOTAL(ES)?|GRAN\s+TOTAL|PENDIENTE\s+POR\s+PAGAR)\s*$/;

/** Nombre de cliente sin el sufijo con que el Excel marcaba las notas crédito. */
export function limpiarNombreCliente(nombre) {
  return String(nombre ?? "")
    .replace(/\s*[-–]?\s*NOTAS?\s*(DE\s*)?CR[EÉ]DITO\s*$/i, "")
    .replace(/\s+/g, " ")
    .trim();
}

const celda = (fila, idx) => (idx == null || idx < 0 ? "" : String(fila[idx] ?? "").trim());
const numero = (fila, idx) => parsearNumeroCO(celda(fila, idx));

// El año del arrastre: sale del texto ("E.C CORTE 2025") y si no viene, es el
// anterior al de la fecha de la fila.
function anioDelArrastre(textos, fechaISO) {
  const m = /(20\d{2})/.exec(textos.join(" "));
  if (m) return Number(m[1]);
  const anio = Number(String(fechaISO).slice(0, 4));
  return anio ? anio - 1 : 0;
}

/**
 * Interpreta las filas de datos ya mapeadas.
 *
 * `plazoDias` es el plazo con el que nacen las facturas importadas: el Excel
 * no tenía fecha de vencimiento y sin ella no hay cartera vencida posible.
 */
export function interpretarFilas(filas = [], mapa, { plazoDias = PLAZO_POR_DEFECTO, filaInicial = 2 } = {}) {
  const { campos, bloquesPago } = mapa;
  const documentos = [];
  const saldosIniciales = [];
  const errores = [];
  let filasIgnoradas = 0;

  filas.forEach((fila, i) => {
    const numeroFila = filaInicial + i;
    const vacia = fila.every((c) => String(c ?? "").trim() === "");
    if (vacia) return;

    const clienteCrudo = celda(fila, campos.cliente);
    const numeroDoc = celda(fila, campos.numero);
    const concepto = celda(fila, campos.concepto);
    const observaciones = celda(fila, campos.observaciones);
    const fecha = parsearFechaCO(celda(fila, campos.fecha));
    const neto = redondear(numero(fila, campos.neto));

    // La fila de totales del pie no es un documento: trae sumas, no un cliente.
    if (RE_TOTALES.test(sinTildes(clienteCrudo)) || RE_TOTALES.test(sinTildes(concepto))) {
      filasIgnoradas += 1;
      return;
    }

    // Saldo que el cliente traía del año anterior.
    const marcadores = [clienteCrudo, observaciones, celda(fila, 0)].map(sinTildes);
    if (marcadores.some((t) => RE_SALDO_ANTERIOR.test(t))) {
      if (!clienteCrudo) { filasIgnoradas += 1; return; }
      saldosIniciales.push({
        clienteNombre: limpiarNombreCliente(clienteCrudo),
        anio: anioDelArrastre(marcadores, fecha),
        valor: neto || redondear(numero(fila, campos.subtotal)),
        observaciones,
        _fila: numeroFila,
      });
      return;
    }

    if (!clienteCrudo && !numeroDoc) { filasIgnoradas += 1; return; }
    if (!clienteCrudo) {
      errores.push({ fila: numeroFila, mensaje: `La factura ${numeroDoc || "(sin número)"} no tiene cliente.` });
      return;
    }

    const cantidadCruda = numero(fila, campos.cantidad);
    const esNota = RE_NOTA_CREDITO.test(sinTildes(clienteCrudo)) || cantidadCruda < 0;
    const cantidad = Math.abs(cantidadCruda) || (concepto ? 1 : 0);
    const valorUnitario = Math.abs(numero(fila, campos.valorUnitario));
    const subtotalCsv = Math.abs(redondear(numero(fila, campos.subtotal)));
    const ivaCsv = Math.abs(redondear(numero(fila, campos.iva)));

    // Las retenciones se importan con el valor que quedó digitado, no
    // recalculadas: ese monto ya se declaró y no puede cambiar porque hoy la
    // tarifa sea otra. Las facturas nuevas sí usan el porcentaje del catálogo.
    const retenciones = COLUMNAS_RETENCION
      .map(({ campo, codigo }) => ({ codigo, valor: Math.abs(redondear(numero(fila, campos[campo]))) }))
      .filter((r) => r.valor > 0)
      .map((r) => ({ codigo: r.codigo, nombre: nombreRetencion(r.codigo), base: "manual", porcentaje: 0, valor: r.valor }));

    const pagos = bloquesPago
      .map((b, orden) => ({
        valor: redondear(numero(fila, b.valor)),
        bancoNombre: celda(fila, b.banco),
        fecha: parsearFechaCO(celda(fila, b.fecha)),
        orden: orden + 1,
      }))
      .filter((p) => Math.abs(p.valor) > 0)
      .map((p) => ({ ...p, valor: Math.abs(p.valor) }));

    const avisos = [];
    if (!fecha) avisos.push("Sin fecha: la factura queda sin vencimiento hasta que se corrija.");
    if (subtotalCsv > 0 && Math.abs(cantidad * valorUnitario - subtotalCsv) > 1) {
      avisos.push("Cantidad × valor unitario no da el subtotal de la hoja; se conserva el neto del Excel.");
    }
    if (!numeroDoc) avisos.push("Sin número de documento.");

    documentos.push({
      tipo: esNota ? TIPO_NOTA_CREDITO : TIPO_FACTURA,
      numero: numeroDoc,
      fecha,
      plazoDias,
      fechaVencimiento: celda(fila, campos.vencimiento)
        ? parsearFechaCO(celda(fila, campos.vencimiento))
        : (fecha ? sumarDias(fecha, plazoDias) : ""),
      clienteNombre: limpiarNombreCliente(clienteCrudo),
      clienteNit: celda(fila, campos.nit),
      items: [{
        producto: concepto,
        descripcion: "",
        cantidad,
        unidad: UNIDAD_POR_DEFECTO,
        valorUnitario: valorUnitario || (cantidad ? redondear(subtotalCsv / cantidad) : 0),
      }],
      ivaPorcentaje: porcentajeIva(subtotalCsv, ivaCsv),
      retenciones,
      neto: neto || redondear(subtotalCsv - retenciones.reduce((a, r) => a + r.valor, 0) + ivaCsv),
      observaciones,
      anulado: false,
      pagos,
      avisos,
      _fila: numeroFila,
    });
  });

  return { documentos, saldosIniciales, errores, filasIgnoradas, resumen: resumirImportacion({ documentos, saldosIniciales, errores, filasIgnoradas }) };
}

// El IVA de la hoja es un valor, no una tarifa. Se devuelve el 19 % cuando
// cuadra (que es el caso normal) y la tarifa efectiva cuando no, para no
// inventar un porcentaje que cambiaría el neto ya declarado.
export function porcentajeIva(subtotal, iva) {
  if (!subtotal || !iva) return iva ? IVA_POR_DEFECTO : 0;
  if (Math.abs(iva - subtotal * (IVA_POR_DEFECTO / 100)) <= 1) return IVA_POR_DEFECTO;
  return redondear((iva / subtotal) * 100);
}

export function resumirImportacion({ documentos = [], saldosIniciales = [], errores = [], filasIgnoradas = 0 } = {}) {
  const facturas = documentos.filter((d) => d.tipo === TIPO_FACTURA);
  const notas = documentos.filter((d) => d.tipo === TIPO_NOTA_CREDITO);
  const pagos = documentos.reduce((acc, d) => acc + d.pagos.length, 0);
  return {
    documentos: documentos.length,
    facturas: facturas.length,
    notasCredito: notas.length,
    saldosIniciales: saldosIniciales.length,
    pagos,
    // Más de tres pagos en una factura es exactamente lo que el Excel no podía
    // guardar; se cuenta para poder decirlo en la vista previa.
    conMasDeTresPagos: documentos.filter((d) => d.pagos.length > 3).length,
    totalNeto: redondear(facturas.reduce((a, d) => a + d.neto, 0) - notas.reduce((a, d) => a + d.neto, 0)),
    totalPagos: redondear(documentos.reduce((a, d) => a + d.pagos.reduce((s, p) => s + p.valor, 0), 0)),
    totalSaldosIniciales: redondear(saldosIniciales.reduce((a, s) => a + s.valor, 0)),
    avisos: documentos.reduce((acc, d) => acc + d.avisos.length, 0),
    errores: errores.length,
    filasIgnoradas,
  };
}

/** Punto de entrada: texto del CSV → todo lo que se va a guardar. */
export function importarFact(texto, opciones = {}) {
  const filas = parsearCSV(texto, opciones.separador);
  if (!filas.length) {
    const vacio = { documentos: [], saldosIniciales: [], errores: [{ fila: 0, mensaje: "El archivo está vacío." }], filasIgnoradas: 0 };
    return { ...vacio, mapa: null, resumen: resumirImportacion(vacio) };
  }

  // El encabezado no siempre es la primera línea: la hoja trae un título
  // arriba. Se toma la primera fila donde se reconozca CLIENTE y algo de plata.
  const idxEncabezado = filas.findIndex((f) => {
    const { campos } = mapearColumnas(f);
    return campos.cliente != null && (campos.neto != null || campos.subtotal != null);
  });
  if (idxEncabezado < 0) {
    const sinEncabezado = {
      documentos: [], saldosIniciales: [], filasIgnoradas: filas.length,
      errores: [{ fila: 1, mensaje: "No se reconocieron las columnas. Se esperan al menos CLIENTE y NETO A PAGAR (o SUBTOTAL)." }],
    };
    return { ...sinEncabezado, mapa: null, resumen: resumirImportacion(sinEncabezado) };
  }

  const mapa = mapearColumnas(filas[idxEncabezado]);
  return {
    ...interpretarFilas(filas.slice(idxEncabezado + 1), mapa, { ...opciones, filaInicial: idxEncabezado + 2 }),
    mapa,
  };
}
