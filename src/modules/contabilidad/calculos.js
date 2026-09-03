// Cálculo de un documento de venta y de su saldo. Es el reemplazo de las
// fórmulas de la hoja FACT, con los tres defectos del Excel corregidos:
//
//   1. Cabían solo tres pagos por factura (ANTICIPO 1/2/3). Aquí `pagos` es una
//      lista sin tope.
//   2. El estado comparaba por igualdad exacta, así que un residuo de centavos
//      dejaba en "DEBE" una factura pagada (en el estado de cuenta se veían
//      saldos de 0,5 y de -1.691,15). Aquí se compara con tolerancia.
//   3. RETRASO restaba al revés y contra la fecha de la factura, no contra una
//      fecha de vencimiento —que no existía—. Aquí la mora sale del plazo.

import {
  ESTADO_ABONADA,
  ESTADO_ANULADA,
  ESTADO_PAGADA,
  ESTADO_PENDIENTE,
  IVA_POR_DEFECTO,
  PLAZO_POR_DEFECTO,
  signoDocumento,
} from "./catalogos";

// Un peso. Por debajo de esto un saldo es cero: son residuos de redondeo de
// dividir un total entre cantidades con decimales, no plata que alguien deba.
export const TOLERANCIA_SALDO = 1;

export function aNumero(valor) {
  if (typeof valor === "number") return Number.isFinite(valor) ? valor : 0;
  const n = Number(valor);
  return Number.isFinite(n) ? n : 0;
}

// Dos decimales, y sin el -0 que sale de redondear un residuo negativo (se
// vería como "$ -0" en la tabla).
export function redondear(valor, decimales = 2) {
  const factor = 10 ** decimales;
  const n = Math.round((aNumero(valor) + Number.EPSILON) * factor) / factor;
  return n === 0 ? 0 : n;
}

// ─── Fechas ─────────────────────────────────────────────────────────────────
// Las fechas se guardan como "YYYY-MM-DD" y no como Date ni Timestamp: a una
// factura le importa el día, no el instante, y construir un Date desde
// "2026-03-14" lo interpreta en UTC — en Colombia eso retrocede la fecha un día.
// Al mediodía local no hay huso ni cambio de hora que la mueva.

export function aFecha(iso) {
  const texto = String(iso ?? "").slice(0, 10);
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(texto);
  if (!m) return null;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 12, 0, 0, 0);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function aISO(fecha) {
  if (!(fecha instanceof Date) || Number.isNaN(fecha.getTime())) return "";
  const mes = String(fecha.getMonth() + 1).padStart(2, "0");
  const dia = String(fecha.getDate()).padStart(2, "0");
  return `${fecha.getFullYear()}-${mes}-${dia}`;
}

export function hoyISO() {
  return aISO(new Date());
}

export function diasEntre(desdeISO, hastaISO) {
  const a = aFecha(desdeISO);
  const b = aFecha(hastaISO);
  if (!a || !b) return 0;
  return Math.round((b.getTime() - a.getTime()) / 86400000);
}

export function sumarDias(iso, dias) {
  const f = aFecha(iso);
  if (!f) return "";
  f.setDate(f.getDate() + (Number(dias) || 0));
  return aISO(f);
}

// La fecha de vencimiento se guarda en el documento (se puede corregir a mano
// cuando el cliente negocia otro plazo), pero si falta se deriva del plazo.
export function fechaVencimiento(doc = {}) {
  if (doc.fechaVencimiento) return String(doc.fechaVencimiento).slice(0, 10);
  const plazo = doc.plazoDias == null ? PLAZO_POR_DEFECTO : Number(doc.plazoDias);
  return sumarDias(doc.fecha, plazo);
}

// Días de mora: positivo cuando ya se venció. Devuelve 0 si no hay con qué
// compararla, para que una factura sin fecha no aparezca como la más vencida
// de todas (que es justo lo que hacía la columna RETRASO del Excel).
export function diasMora(doc = {}, hasta = hoyISO()) {
  const vence = fechaVencimiento(doc);
  if (!vence) return 0;
  return Math.max(0, diasEntre(vence, hasta));
}

export const mesDe = (iso) => String(iso ?? "").slice(0, 7);
export const anioDe = (iso) => Number(String(iso ?? "").slice(0, 4)) || 0;

// Año en el que se reporta el documento, que no siempre es el de su fecha: el
// libro trae tres facturas con fecha de 2025 contadas dentro de 2026 (filas
// 53, 54 y 192). Se respeta la fecha de emisión —que es un dato fiscal— y el
// periodo se guarda aparte, que es lo que decide en qué año se lista.
export function periodoContable(doc = {}) {
  const declarado = Math.trunc(aNumero(doc.periodoContable));
  return declarado || anioDe(doc.fecha);
}

// ─── Items ──────────────────────────────────────────────────────────────────

export function subtotalItem(item = {}) {
  return redondear(aNumero(item.cantidad) * aNumero(item.valorUnitario));
}

export function subtotalDocumento(items = []) {
  return redondear((items || []).reduce((acc, it) => acc + subtotalItem(it), 0));
}

// ─── Retenciones e IVA ──────────────────────────────────────────────────────

export function valorIva(base, porcentaje = IVA_POR_DEFECTO) {
  return redondear(aNumero(base) * (aNumero(porcentaje) / 100));
}

// Una retención "manual" no se calcula: vale lo que se digitó. Las otras dos
// salen de su base. Nunca devuelve negativo: una retención resta del neto por
// la fórmula, no por el signo.
export function valorRetencion(retencion = {}, { subtotal = 0, iva = 0 } = {}) {
  if (retencion.base === "manual") return redondear(Math.abs(aNumero(retencion.valor)));
  const base = retencion.base === "iva" ? iva : subtotal;
  return redondear(Math.abs(aNumero(base) * (aNumero(retencion.porcentaje) / 100)));
}

/**
 * Liquida el documento completo. Devuelve siempre valores positivos: el signo
 * de una nota crédito lo pone `netoConSigno`, no esta función, para que la
 * factura y la nota se vean y se impriman igual.
 *
 * NETO = SUBTOTAL − retenciones + IVA — la misma fórmula de la columna O.
 */
export function calcularDocumento(doc = {}) {
  const subtotal = subtotalDocumento(doc.items);
  const ivaPorcentaje = doc.ivaPorcentaje == null ? IVA_POR_DEFECTO : aNumero(doc.ivaPorcentaje);
  const iva = valorIva(subtotal, ivaPorcentaje);

  const retenciones = (doc.retenciones || []).map((r) => ({
    ...r,
    base: r.base || "subtotal",
    valor: valorRetencion(r, { subtotal, iva }),
  }));
  const totalRetenciones = redondear(retenciones.reduce((acc, r) => acc + r.valor, 0));

  return {
    subtotal,
    ivaPorcentaje,
    iva,
    retenciones,
    totalRetenciones,
    neto: redondear(subtotal - totalRetenciones + iva),
  };
}

// Neto ya liquidado del documento. Usa el guardado si está —así una factura
// importada del Excel conserva su neto exacto aunque sus items se hayan
// reconstruido— y si no, lo calcula.
export function netoDocumento(doc = {}) {
  if (doc.neto != null && doc.neto !== "") return redondear(doc.neto);
  return calcularDocumento(doc).neto;
}

// Lo que el documento le suma a la cartera del cliente: una nota crédito resta.
export function netoConSigno(doc = {}) {
  if (doc.anulado) return 0;
  return redondear(signoDocumento(doc.tipo) * netoDocumento(doc));
}

// ─── Pagos y saldo ──────────────────────────────────────────────────────────

export function totalPagos(pagos = []) {
  return redondear((pagos || []).reduce((acc, p) => acc + aNumero(p?.valor), 0));
}

// ─── Abonos con aplicaciones ────────────────────────────────────────────────
// Un abono es del cliente, no de una factura: la transferencia que llega puede
// cubrir varias facturas a la vez, y eso es justo lo que el Excel no sabía
// representar (registraba el pago consolidado sobre la fila que tuviera a mano,
// dejando 53 facturas con más plata encima de la que valían).
//
// `aplicaciones` reparte el abono entre sus destinos; lo que sobra queda como
// anticipo sin aplicar, a favor del cliente.

export const aplicacionesDe = (pago = {}) => (Array.isArray(pago.aplicaciones) ? pago.aplicaciones : []);

export function totalAplicado(pago = {}) {
  return redondear(aplicacionesDe(pago).reduce((acc, a) => acc + aNumero(a?.valor), 0));
}

export function sinAplicar(pago = {}) {
  return redondear(aNumero(pago.valor) - totalAplicado(pago));
}

// Anticipos del cliente que todavía no se imputaron a ninguna factura.
export function totalSinAplicar(pagos = []) {
  return redondear((pagos || []).reduce((acc, p) => acc + Math.max(0, sinAplicar(p)), 0));
}

/**
 * Saldo de una factura: lo que falta por cobrar.
 *
 * `notasCredito` son las notas que apuntan a esta factura (docAfectadoId): una
 * devolución baja el saldo igual que un pago, y en el Excel eso quedaba como
 * una fila suelta que nadie cruzaba con la factura original.
 */
export function saldoDocumento(doc = {}, pagos = [], notasCredito = []) {
  if (doc.anulado) return 0;
  const neto = netoDocumento(doc);
  const acreditado = (notasCredito || []).reduce((acc, nc) => acc + netoDocumento(nc), 0);
  return redondear(neto - totalPagos(pagos) - acreditado);
}

// El saldo está saldado si cabe dentro de la tolerancia, en cualquier sentido:
// un sobrepago de 300 pesos tampoco es cartera.
export const estaSaldado = (saldo) => Math.abs(aNumero(saldo)) < TOLERANCIA_SALDO;

export function estadoDocumento(doc = {}, pagos = [], notasCredito = []) {
  if (doc.anulado) return ESTADO_ANULADA;
  const saldo = saldoDocumento(doc, pagos, notasCredito);
  if (estaSaldado(saldo)) return ESTADO_PAGADA;
  const abonado = totalPagos(pagos) + (notasCredito || []).reduce((a, nc) => a + netoDocumento(nc), 0);
  return abonado > 0 ? ESTADO_ABONADA : ESTADO_PENDIENTE;
}

/**
 * Todo lo derivado de un documento, de una sola pasada. Las pantallas piden
 * esto y no cada función suelta: recalcular el saldo tres veces por fila era lo
 * que hacía el Excel con sus columnas Y, Z y AA, y por eso podían contradecirse.
 */
export function resumenDocumento(doc = {}, pagos = [], notasCredito = [], hoy = hoyISO()) {
  const liquidacion = calcularDocumento(doc);
  const neto = netoDocumento(doc);
  const abonado = totalPagos(pagos);
  const acreditado = redondear((notasCredito || []).reduce((a, nc) => a + netoDocumento(nc), 0));
  const saldo = doc.anulado ? 0 : redondear(neto - abonado - acreditado);
  const estado = estadoDocumento(doc, pagos, notasCredito);
  const mora = estado === ESTADO_PAGADA || estado === ESTADO_ANULADA ? 0 : diasMora(doc, hoy);

  return {
    ...liquidacion,
    neto,
    netoConSigno: netoConSigno(doc),
    abonado,
    acreditado,
    saldo,
    estado,
    vencimiento: fechaVencimiento(doc),
    diasMora: mora,
    vencida: mora > 0,
  };
}
