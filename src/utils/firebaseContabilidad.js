// Acceso a datos de la sección contable.
//
// Tres colecciones y una de configuración:
//   contabilidad_documentos        facturas y notas crédito
//   contabilidad_pagos             un documento por abono (el Excel solo admitía 3)
//   contabilidad_saldos_iniciales  arrastres de años anteriores, fuera de las ventas
//   contabilidad_config/{retenciones|bancos}
//
// Los pagos viven en una colección propia y no en una subcolección de la
// factura: la cartera necesita todos los abonos del año de una sola lectura, y
// con subcolecciones habría que consultar factura por factura.
//
// Nada de saldos, estados ni totales guardados: todo eso se calcula (ver
// modules/contabilidad/calculos.js). Guardar un saldo es exactamente lo que
// hacía la hoja ESTADO DE CUENTA, y por eso se desactualizaba sola.

import { auth, db, waitForAuth } from "../firebase";
import { camposCotizacionFicha, normalizarFichasFactura } from "./documentoVinculo";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from "firebase/firestore";
import {
  BANCOS_POR_DEFECTO,
  DESTINO_DOCUMENTO,
  DESTINO_SALDO,
  IVA_POR_DEFECTO,
  PLAZO_POR_DEFECTO,
  RETENCIONES_POR_DEFECTO,
  TIPO_FACTURA,
  TIPO_NOTA_CREDITO,
  TIPO_NOTA_DEBITO,
  UNIDAD_POR_DEFECTO,
} from "../modules/contabilidad/catalogos";
import { aNumero, anioDe, calcularDocumento, redondear, sumarDias } from "../modules/contabilidad/calculos";

const TIPOS_VALIDOS = new Set([TIPO_FACTURA, TIPO_NOTA_CREDITO, TIPO_NOTA_DEBITO]);

const DOCS_COL = "contabilidad_documentos";
const PAGOS_COL = "contabilidad_pagos";
const SALDOS_COL = "contabilidad_saldos_iniciales";
const CONFIG_COL = "contabilidad_config";

// Tope de un listado. Con ~340 facturas al año caben varios años completos; al
// llegar aquí la pantalla avisa, igual que hace Inventario.
export const LIMITE_LISTADO = 3000;

// Firestore rechaza el documento entero si un campo llega `undefined`, y un
// formulario a medio llenar los produce a montones.
const limpiar = (obj) => {
  const salida = {};
  for (const [k, v] of Object.entries(obj)) if (v !== undefined) salida[k] = v;
  return salida;
};

// Igual que en inventario: fuera caracteres de control (los trae el pegado
// desde Excel) y espacios repetidos.
const texto = (v) =>
  String(v ?? "")
    .replace(/[\u0000-\u001F\u007F]/g, "")
    .replace(/\s+/g, " ")
    .trim();

const fechaISO = (v) => String(v ?? "").slice(0, 10);
const uidActual = () => auth.currentUser?.uid || "";

const normalizarItem = (item = {}) => ({
  producto: texto(item.producto),
  descripcion: texto(item.descripcion),
  cantidad: aNumero(item.cantidad),
  unidad: texto(item.unidad) || UNIDAD_POR_DEFECTO,
  valorUnitario: redondear(item.valorUnitario),
});

const normalizarRetencion = (ret = {}) => ({
  codigo: texto(ret.codigo),
  nombre: texto(ret.nombre),
  base: ["subtotal", "iva", "manual"].includes(ret.base) ? ret.base : "subtotal",
  porcentaje: aNumero(ret.porcentaje),
  valor: redondear(ret.valor),
});

/**
 * Documento listo para guardar. El neto, el subtotal y el IVA se recalculan
 * aquí y no se aceptan del formulario: son la única cifra que no puede
 * depender de lo que quedó en un input.
 *
 * Excepción: `netoImportado`, que respeta el neto exacto que traía el Excel
 * para las filas migradas — ese número ya se declaró y no se toca.
 */
export function construirDocumento(data = {}, { netoImportado = false } = {}) {
  const items = (data.items || []).map(normalizarItem).filter((i) => i.producto || i.cantidad || i.valorUnitario);
  const retenciones = (data.retenciones || []).map(normalizarRetencion);
  const fecha = fechaISO(data.fecha);
  const plazoDias = data.plazoDias == null ? PLAZO_POR_DEFECTO : Math.trunc(aNumero(data.plazoDias));
  const liquidacion = calcularDocumento({ items, retenciones, ivaPorcentaje: data.ivaPorcentaje });

  return limpiar({
    // Se acepta cualquiera de los tres tipos del catálogo. Antes aquí decía
    // "nota crédito o factura", y editar una nota débito la convertía en
    // factura sin avisar: el libro trae notas débito y se perdían al tocarlas.
    tipo: TIPOS_VALIDOS.has(data.tipo) ? data.tipo : TIPO_FACTURA,
    numero: texto(data.numero),
    fecha,
    plazoDias,
    fechaVencimiento: fechaISO(data.fechaVencimiento) || (fecha ? sumarDias(fecha, plazoDias) : ""),
    // Año en el que se reporta, que no siempre es el de la fecha: el libro de
    // 2026 trae tres facturas fechadas en 2025 y las cuenta dentro de 2026.
    // Es también el campo por el que se consulta el listado.
    periodoContable: Math.trunc(aNumero(data.periodoContable)) || anioDe(fecha),
    empresaId: texto(data.empresaId),
    clienteNombre: texto(data.clienteNombre),
    clienteNit: texto(data.clienteNit),
    items,
    ivaPorcentaje: data.ivaPorcentaje == null ? IVA_POR_DEFECTO : aNumero(data.ivaPorcentaje),
    retenciones: liquidacion.retenciones.map(normalizarRetencion),
    subtotal: liquidacion.subtotal,
    iva: liquidacion.iva,
    totalRetenciones: liquidacion.totalRetenciones,
    neto: netoImportado && data.neto != null ? redondear(data.neto) : liquidacion.neto,
    // Solo en notas crédito: la factura que corrigen.
    docAfectadoId: texto(data.docAfectadoId),
    observaciones: texto(data.observaciones),
    anulado: Boolean(data.anulado),
    motivoAnulacion: texto(data.motivoAnulacion),
    // Rastro hacia el cotizador cuando la factura nació de una cotización, o
    // cuando se vinculó a mano después (ver utils/documentoVinculo.js).
    ...camposCotizacionFicha(data),
    // Las fichas de fabricación que cubre esta factura. Van del lado de la
    // factura y no de la ficha porque una factura cobra varias fichas —las de
    // un mismo pedido— y la ficha no debe saber de dinero: planta la lee.
    // Es una copia congelada de lo que las nombra, no un puntero a resolver.
    fichas: normalizarFichasFactura(data.fichas),
    origen: texto(data.origen) || "manual",
  });
}

// ─── Documentos ─────────────────────────────────────────────────────────────

export async function listarDocumentos({ anio = null, limite = LIMITE_LISTADO } = {}) {
  await waitForAuth();
  // Por periodo contable y no por rango de fechas: así las facturas que el
  // libro reporta en un año distinto al de su fecha salen donde corresponde.
  //
  // Sin `orderBy` a propósito: filtrar por un campo y ordenar por otro obliga a
  // Firestore a un índice compuesto, y con ~340 documentos al año ordenar aquí
  // no cuesta nada. Un índice de más es una cosa más que desplegar para que la
  // pantalla arranque.
  const filtros = anio ? [where("periodoContable", "==", Number(anio))] : [];
  const q = query(collection(db, DOCS_COL), ...filtros, limit(limite));
  const snap = await getDocs(q);
  return snap.docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .sort((a, b) => String(b.fecha || "").localeCompare(String(a.fecha || "")));
}

export async function obtenerDocumento(id) {
  if (!id) return null;
  await waitForAuth();
  const snap = await getDoc(doc(db, DOCS_COL, id));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

export async function crearDocumento(data) {
  await waitForAuth();
  const ref = await addDoc(collection(db, DOCS_COL), {
    ...construirDocumento(data),
    uid: uidActual(),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

/**
 * `netoImportado` conserva el neto exacto que declaró el Excel. Se usa cuando
 * se corrige un dato de cabecera de una factura migrada —el cliente, la fecha,
 * el número— sin tocar los conceptos: en esas filas el valor unitario se
 * dedujo dividiendo el subtotal entre la cantidad, así que recalcular movería
 * el neto unos centavos y descuadraría el año contra el libro.
 */
export async function actualizarDocumento(id, data, { netoImportado = false } = {}) {
  await waitForAuth();
  await updateDoc(doc(db, DOCS_COL, id), {
    ...construirDocumento(data, { netoImportado }),
    updatedAt: serverTimestamp(),
  });
}

/**
 * Cuelga varios documentos del mismo cliente de una empresa de la base.
 *
 * Es la operación de la pestaña Clientes: las facturas migradas traen el
 * nombre que tenía la fila del Excel y muchas quedaron sin `empresaId`, así que
 * su cartera se cuenta aparte de la del mismo cliente. Se escribe también el
 * nombre y el NIT de la empresa para que el listado deje de mostrar las tres
 * variantes con que se escribía en la hoja.
 */
export async function vincularDocumentos(ids = [], empresa = {}) {
  if (!empresa?.id || !ids.length) return 0;
  await waitForAuth();
  let escritos = 0;
  for (let i = 0; i < ids.length; i += OPS_POR_LOTE) {
    const lote = writeBatch(db);
    for (const id of ids.slice(i, i + OPS_POR_LOTE)) {
      lote.update(doc(db, DOCS_COL, id), limpiar({
        empresaId: empresa.id,
        clienteNombre: texto(empresa.nombre),
        // Solo si la empresa trae NIT. Hay clientes dados de alta sin él, y
        // escribirlo vacío borraría el que la factura sí traía del Excel.
        clienteNit: texto(empresa.nit) || undefined,
        updatedAt: serverTimestamp(),
      }));
      escritos += 1;
    }
    await lote.commit();
  }
  return escritos;
}

/**
 * Anular es lo que se hace con una factura equivocada: se marca, no se borra.
 * Un documento fiscal ya numerado tiene que seguir existiendo aunque no valga,
 * y además borrarlo dejaría sus pagos apuntando al vacío.
 */
export async function anularDocumento(id, motivo = "") {
  await waitForAuth();
  await updateDoc(doc(db, DOCS_COL, id), {
    anulado: true,
    motivoAnulacion: texto(motivo),
    updatedAt: serverTimestamp(),
  });
}

export async function reactivarDocumento(id) {
  await waitForAuth();
  await updateDoc(doc(db, DOCS_COL, id), { anulado: false, motivoAnulacion: "", updatedAt: serverTimestamp() });
}

/**
 * Borrado real. Solo para deshacer una importación mal hecha.
 *
 * A los abonos que lo tocaban se les quita la aplicación, no se borran: el
 * mismo abono puede estar cubriendo otras facturas, y borrarlo se llevaría por
 * delante plata que sí entró. Lo que quede sin aplicar pasa a ser anticipo.
 */
export async function eliminarDocumento(id) {
  await waitForAuth();
  const pagos = await listarPagosDeDocumento(id);
  for (const pago of pagos) {
    try {
      const aplicaciones = (pago.aplicaciones || []).filter(
        (a) => !(a.id === id && (a.tipo || DESTINO_DOCUMENTO) === DESTINO_DOCUMENTO)
      );
      await updateDoc(doc(db, PAGOS_COL, pago.id), {
        aplicaciones,
        destinos: aplicaciones.map((a) => `${a.tipo || DESTINO_DOCUMENTO}:${a.id}`),
        updatedAt: serverTimestamp(),
      });
    } catch (e) { console.error("No se pudo desaplicar el abono", pago.id, e); }
  }
  await deleteDoc(doc(db, DOCS_COL, id));
}

/**
 * Documentos que ya usan ese número. La numeración la asigna la DIAN, no la
 * app, así que no se genera: solo se avisa si se repite, que casi siempre es
 * haber digitado dos veces la misma factura.
 */
export async function buscarPorNumero(numero, tipo = TIPO_FACTURA) {
  const n = texto(numero);
  if (!n) return [];
  await waitForAuth();
  const q = query(collection(db, DOCS_COL), where("numero", "==", n), where("tipo", "==", tipo), limit(5));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

// ─── Pagos ──────────────────────────────────────────────────────────────────
//
// Un abono es del CLIENTE, no de una factura: la transferencia que llega puede
// cubrir varias a la vez. `aplicaciones` reparte el valor entre sus destinos
// —una factura o un arrastre del año anterior— y lo que sobra queda como
// anticipo a favor del cliente.
//
// `destinos` repite las claves de las aplicaciones como texto plano porque
// Firestore no sabe consultar dentro de un arreglo de objetos: es lo que
// permite preguntar "qué abonos tocaron esta factura" con array-contains.

const normalizarAplicacion = (ap = {}) => ({
  tipo: ap.tipo === DESTINO_SALDO ? DESTINO_SALDO : DESTINO_DOCUMENTO,
  id: texto(ap.id),
  valor: redondear(Math.abs(aNumero(ap.valor))),
});

const construirPago = (data = {}) => {
  const aplicaciones = (data.aplicaciones || [])
    .map(normalizarAplicacion)
    .filter((a) => a.id && a.valor > 0);
  return limpiar({
    empresaId: texto(data.empresaId),
    clienteNombre: texto(data.clienteNombre),
    fecha: fechaISO(data.fecha),
    valor: redondear(Math.abs(aNumero(data.valor))),
    bancoCodigo: texto(data.bancoCodigo),
    bancoNombre: texto(data.bancoNombre),
    referencia: texto(data.referencia),
    observaciones: texto(data.observaciones),
    aplicaciones,
    destinos: aplicaciones.map((a) => `${a.tipo}:${a.id}`),
    // El periodo del libro al que pertenece, no el año en que se pagó: un
    // abono de enero de 2027 contra una factura de 2026 se lee con 2026.
    periodoContable: Math.trunc(aNumero(data.periodoContable)) || anioDe(data.fecha),
    // De dónde salía en el Excel, para poder auditar la reimputación.
    documentoOrigen: texto(data.documentoOrigen),
    origen: texto(data.origen) || "manual",
  });
};

export async function listarPagos({ anio = null, limite = LIMITE_LISTADO * 3 } = {}) {
  await waitForAuth();
  const filtros = anio ? [where("periodoContable", "==", Number(anio))] : [];
  const q = query(collection(db, PAGOS_COL), ...filtros, limit(limite));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

/** Abonos que tocaron un destino (una factura o un arrastre). */
export async function listarPagosDeDestino(id, tipo = DESTINO_DOCUMENTO) {
  if (!id) return [];
  await waitForAuth();
  const q = query(collection(db, PAGOS_COL), where("destinos", "array-contains", `${tipo}:${id}`));
  const snap = await getDocs(q);
  return snap.docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .sort((a, b) => String(a.fecha).localeCompare(String(b.fecha)));
}

export const listarPagosDeDocumento = (documentoId) => listarPagosDeDestino(documentoId, DESTINO_DOCUMENTO);

/**
 * Registra un abono. Si se llama desde una factura llega con esa única
 * aplicación; desde tesorería puede llegar repartido entre varias.
 *
 * Una nota crédito no se cobra: anula una factura. Aceptarle abonos era lo que
 * dejaba clientes debiendo notas crédito, así que se rechaza aquí y no solo en
 * el formulario.
 */
export async function registrarPago(data, documento = null) {
  if (documento?.tipo === TIPO_NOTA_CREDITO) {
    throw new Error("Una nota crédito no recibe abonos: descuenta de la factura que anula.");
  }
  await waitForAuth();
  const ref = await addDoc(collection(db, PAGOS_COL), {
    ...construirPago({
      ...data,
      empresaId: data.empresaId || documento?.empresaId,
      clienteNombre: data.clienteNombre || documento?.clienteNombre,
      periodoContable: data.periodoContable || documento?.periodoContable,
    }),
    uid: uidActual(),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

export async function actualizarPago(pagoId, data) {
  await waitForAuth();
  await updateDoc(doc(db, PAGOS_COL, pagoId), { ...construirPago(data), updatedAt: serverTimestamp() });
}

export async function eliminarPago(pagoId) {
  await waitForAuth();
  await deleteDoc(doc(db, PAGOS_COL, pagoId));
}

// ─── Saldos iniciales ───────────────────────────────────────────────────────

export async function listarSaldosIniciales() {
  await waitForAuth();
  const snap = await getDocs(query(collection(db, SALDOS_COL), limit(LIMITE_LISTADO)));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

const construirSaldo = (data = {}) => limpiar({
  empresaId: texto(data.empresaId),
  clienteNombre: texto(data.clienteNombre),
  clienteNit: texto(data.clienteNit),
  anio: Math.trunc(aNumero(data.anio)) || 0,
  valor: redondear(data.valor),
  observaciones: texto(data.observaciones),
});

export async function guardarSaldoInicial(data, id = null) {
  await waitForAuth();
  if (id) {
    await updateDoc(doc(db, SALDOS_COL, id), { ...construirSaldo(data), updatedAt: serverTimestamp() });
    return id;
  }
  const ref = await addDoc(collection(db, SALDOS_COL), {
    ...construirSaldo(data),
    uid: uidActual(),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

export async function eliminarSaldoInicial(id) {
  await waitForAuth();
  await deleteDoc(doc(db, SALDOS_COL, id));
}

// ─── Configuración ──────────────────────────────────────────────────────────

export async function obtenerConfiguracion() {
  await waitForAuth();
  const [ret, ban] = await Promise.all([
    getDoc(doc(db, CONFIG_COL, "retenciones")),
    getDoc(doc(db, CONFIG_COL, "bancos")),
  ]);
  return {
    // Sin configuración guardada valen las tarifas del libro de Excel, para que
    // la sección sirva desde el primer día sin pasar por Configuración.
    retenciones: ret.exists() ? (ret.data().lista || []) : RETENCIONES_POR_DEFECTO,
    bancos: ban.exists() ? (ban.data().lista || []) : BANCOS_POR_DEFECTO,
    ivaPorDefecto: ret.exists() ? (ret.data().ivaPorDefecto ?? IVA_POR_DEFECTO) : IVA_POR_DEFECTO,
    plazoPorDefecto: ret.exists() ? (ret.data().plazoPorDefecto ?? PLAZO_POR_DEFECTO) : PLAZO_POR_DEFECTO,
  };
}

export async function guardarRetenciones(lista, { ivaPorDefecto, plazoPorDefecto } = {}) {
  await waitForAuth();
  await setDoc(doc(db, CONFIG_COL, "retenciones"), limpiar({
    lista: (lista || []).map((r) => ({ ...normalizarRetencion(r), activa: r.activa !== false })),
    ivaPorDefecto: ivaPorDefecto == null ? undefined : aNumero(ivaPorDefecto),
    plazoPorDefecto: plazoPorDefecto == null ? undefined : Math.trunc(aNumero(plazoPorDefecto)),
    updatedAt: serverTimestamp(),
  }), { merge: true });
}

export async function guardarBancos(lista) {
  await waitForAuth();
  await setDoc(doc(db, CONFIG_COL, "bancos"), {
    lista: (lista || []).map((b) => ({
      codigo: texto(b.codigo) || texto(b.nombre).toLowerCase().replace(/\s+/g, "_"),
      nombre: texto(b.nombre),
      activo: b.activo !== false,
    })).filter((b) => b.nombre),
    updatedAt: serverTimestamp(),
  }, { merge: true });
}

// ─── Importación por lotes ──────────────────────────────────────────────────

// Firestore admite 500 operaciones por lote. Una factura con sus abonos son
// varias operaciones, así que se cuenta de a una y no de a documento.
const OPS_POR_LOTE = 450;

/**
 * Guarda de una vez lo que devolvió el importador. Cada factura entra con sus
 * pagos, y el neto que traía el Excel se respeta tal cual.
 *
 * Todo lo del mismo archivo queda marcado con un `loteImportacion` común: es
 * lo que permite deshacer una carga equivocada sin llevarse por delante lo que
 * ya estaba bien (ver `eliminarLoteImportacion`). Cargar 338 facturas sin
 * manera de devolverse sería peor que seguir en el Excel.
 *
 * `onProgreso(guardados, total)` deja mover una barra: son cientos de
 * documentos y sin ella la pantalla parece colgada.
 */
export async function importarLote({ documentos = [], saldosIniciales = [] }, { onProgreso } = {}) {
  await waitForAuth();
  const uid = uidActual();
  const loteImportacion = `imp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const total = documentos.length + saldosIniciales.length;
  let guardados = 0;
  let lote = writeBatch(db);
  let ops = 0;

  const cerrarLote = async () => {
    if (!ops) return;
    await lote.commit();
    lote = writeBatch(db);
    ops = 0;
  };

  for (const entrada of documentos) {
    const { pagos = [], avisos, _fila, ...datos } = entrada;
    const refDoc = doc(collection(db, DOCS_COL));
    lote.set(refDoc, {
      ...construirDocumento(datos, { netoImportado: true }),
      origen: "importacion",
      loteImportacion,
      uid,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    ops += 1;

    for (const pago of pagos) {
      lote.set(doc(collection(db, PAGOS_COL)), {
        ...construirPago({
          ...pago,
          empresaId: datos.empresaId,
          clienteNombre: datos.clienteNombre,
          periodoContable: datos.periodoContable || anioDe(datos.fecha),
          // El CSV de FACT trae el abono pegado a una sola factura.
          aplicaciones: [{ tipo: DESTINO_DOCUMENTO, id: refDoc.id, valor: pago.valor }],
        }),
        origen: "importacion",
        loteImportacion,
        uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      ops += 1;
    }

    guardados += 1;
    onProgreso?.(guardados, total);
    if (ops >= OPS_POR_LOTE) await cerrarLote();
  }

  for (const saldo of saldosIniciales) {
    const { _fila, ...datos } = saldo;
    lote.set(doc(collection(db, SALDOS_COL)), {
      ...construirSaldo(datos),
      origen: "importacion",
      loteImportacion,
      uid,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    ops += 1;
    guardados += 1;
    onProgreso?.(guardados, total);
    if (ops >= OPS_POR_LOTE) await cerrarLote();
  }

  await cerrarLote();
  return { documentos: documentos.length, saldosIniciales: saldosIniciales.length, loteImportacion };
}

/**
 * Deshace una importación completa: borra los documentos, los abonos y los
 * saldos iniciales que entraron con ese lote, y nada más.
 *
 * Solo alcanza a lo importado —las reglas de Firestore no dejan borrar una
 * factura digitada en la app, que se anula—, así que es seguro correrlo cuando
 * el archivo venía con las columnas corridas o con el año equivocado.
 */
export async function eliminarLoteImportacion(loteImportacion, { onProgreso } = {}) {
  if (!loteImportacion) return { borrados: 0 };
  await waitForAuth();

  const refs = [];
  for (const coleccion of [DOCS_COL, PAGOS_COL, SALDOS_COL]) {
    const snap = await getDocs(query(collection(db, coleccion), where("loteImportacion", "==", loteImportacion)));
    for (const d of snap.docs) refs.push(doc(db, coleccion, d.id));
  }

  let lote = writeBatch(db);
  let ops = 0;
  let borrados = 0;
  for (const ref of refs) {
    lote.delete(ref);
    ops += 1;
    borrados += 1;
    onProgreso?.(borrados, refs.length);
    if (ops >= OPS_POR_LOTE) {
      await lote.commit();
      lote = writeBatch(db);
      ops = 0;
    }
  }
  if (ops) await lote.commit();
  return { borrados };
}

/**
 * Guarda el lote de la migración del libro de Excel.
 *
 * Las tres colecciones se referencian entre sí —una nota crédito apunta a su
 * factura, un abono apunta a facturas y arrastres—, y esas referencias vienen
 * con las claves del archivo ("2817", "J1592", "saldo:3"). Aquí se reservan
 * primero todos los ids de Firestore y después se escribe, ya traducido: si se
 * hiciera al revés quedarían apuntando al vacío.
 *
 * `empresaPorCliente` traduce el id de cliente del archivo al id de la empresa
 * en la app; lo arma la pantalla, que es la que sabe cuáles ya existían.
 */
export async function importarMigracionLote(
  { documentos = [], saldos = [], pagos = [] },
  { empresaPorCliente = new Map(), onProgreso } = {}
) {
  await waitForAuth();
  const uid = uidActual();
  const loteImportacion = `mig_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

  // 1) Ids reservados, sin escribir todavía.
  const idDoc = new Map();
  for (const d of documentos) idDoc.set(d.claveOrigen, doc(collection(db, DOCS_COL)));
  const idSaldo = new Map();
  for (const sal of saldos) idSaldo.set(sal.claveOrigen, doc(collection(db, SALDOS_COL)));

  const empresaDe = (clienteOrigenId) => empresaPorCliente.get(clienteOrigenId) || "";
  const total = documentos.length + saldos.length + pagos.length;
  let hechos = 0;
  let lote = writeBatch(db);
  let ops = 0;
  const cerrar = async () => {
    if (!ops) return;
    await lote.commit();
    lote = writeBatch(db);
    ops = 0;
  };
  const avanzar = async () => {
    hechos += 1;
    onProgreso?.(hechos, total);
    if (ops >= OPS_POR_LOTE) await cerrar();
  };

  // 2) Documentos, con la nota crédito ya apuntando a su factura.
  for (const d of documentos) {
    const { claveOrigen, docAfectadoClave, clienteOrigenId, avisos, filaExcel, ...datos } = d;
    lote.set(idDoc.get(claveOrigen), {
      ...construirDocumento({
        ...datos,
        empresaId: empresaDe(clienteOrigenId),
        docAfectadoId: docAfectadoClave ? (idDoc.get(docAfectadoClave)?.id || "") : "",
      }, { netoImportado: true }),
      origen: "migracion",
      loteImportacion,
      claveOrigen,
      filaExcel: filaExcel ?? null,
      uid,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    ops += 1;
    await avanzar();
  }

  // 3) Arrastres del año anterior.
  for (const sal of saldos) {
    const { claveOrigen, clienteOrigenId, filaExcel, ...datos } = sal;
    lote.set(idSaldo.get(claveOrigen), {
      ...construirSaldo({ ...datos, empresaId: empresaDe(clienteOrigenId) }),
      origen: "migracion",
      loteImportacion,
      claveOrigen,
      filaExcel: filaExcel ?? null,
      uid,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    ops += 1;
    await avanzar();
  }

  // 4) Abonos, con sus aplicaciones traducidas a ids reales.
  const sinDestino = [];
  for (const pago of pagos) {
    const { clienteOrigenId, aplicaciones = [], fechaOriginal, id: _clave, ...datos } = pago;
    const resueltas = [];
    for (const ap of aplicaciones) {
      const ref = ap.tipo === DESTINO_SALDO ? idSaldo.get(ap.id) : idDoc.get(ap.id);
      if (!ref) { sinDestino.push({ pago: _clave, destino: `${ap.tipo}:${ap.id}` }); continue; }
      resueltas.push({ tipo: ap.tipo, id: ref.id, valor: ap.valor });
    }
    lote.set(doc(collection(db, PAGOS_COL)), {
      ...construirPago({
        ...datos,
        empresaId: empresaDe(clienteOrigenId),
        aplicaciones: resueltas,
      }),
      origen: "migracion",
      loteImportacion,
      // La fecha tal como estaba en el Excel, para las que quedaron sin leer
      // (02/06//2026, 0417/2026 y compañía).
      fechaOriginal: texto(fechaOriginal),
      uid,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    ops += 1;
    await avanzar();
  }

  await cerrar();
  return {
    loteImportacion,
    documentos: documentos.length,
    saldos: saldos.length,
    pagos: pagos.length,
    sinDestino,
  };
}

/** Deshace un lote de migración: borra sus documentos, arrastres y abonos. */
export async function eliminarLoteMigracion(loteImportacion, opciones = {}) {
  return eliminarLoteImportacion(loteImportacion, opciones);
}
