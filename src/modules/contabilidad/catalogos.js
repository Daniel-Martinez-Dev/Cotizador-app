// Catálogos de la sección contable: lo que en el Excel estaba clavado dentro de
// las fórmulas (el 19 % del IVA, el 2,5 % de la retención en la fuente) aquí es
// dato configurable. Si la DIAN cambia una tarifa se toca la configuración, no
// el código ni 338 fórmulas.

export const TIPO_FACTURA = "factura";
export const TIPO_NOTA_CREDITO = "nota_credito";
export const TIPO_NOTA_DEBITO = "nota_debito";

export const TIPOS_DOCUMENTO = [
  { valor: TIPO_FACTURA, label: "Factura de venta", abrev: "FV" },
  { valor: TIPO_NOTA_CREDITO, label: "Nota crédito", abrev: "NC" },
  // La nota débito cobra de más sobre una factura ya emitida (un reajuste, un
  // flete que faltó). Suma como una factura; existe porque el libro trae una.
  { valor: TIPO_NOTA_DEBITO, label: "Nota débito", abrev: "ND" },
];

// El Excel marcaba las notas crédito pegándole " NOTA CREDITO" al nombre del
// cliente y poniendo la cantidad en negativo. Eso ensuciaba la base de clientes
// (el mismo cliente aparecía dos veces) y hacía que cualquier suma por cliente
// diera mal. Aquí el tipo es un campo y el signo lo pone esta función.
export const signoDocumento = (tipo) => (tipo === TIPO_NOTA_CREDITO ? -1 : 1);

export const esNotaCredito = (doc) => doc?.tipo === TIPO_NOTA_CREDITO;
export const esNotaDebito = (doc) => doc?.tipo === TIPO_NOTA_DEBITO;

// Un documento cobrable es el que puede recibir abonos: la factura y la nota
// débito. La nota crédito no se cobra, se descuenta.
export const esCobrable = (doc) => doc?.tipo !== TIPO_NOTA_CREDITO;

// ─── Retenciones ────────────────────────────────────────────────────────────
// `base` dice sobre qué se calcula:
//   subtotal → porcentaje sobre la base gravable (retefuente, ICA).
//   iva      → porcentaje sobre el IVA facturado (reteIVA: el 15 % del IVA).
//   manual   → no se calcula, se digita. El ICA de Madrid entraba así en el
//              Excel y sigue habiendo municipios con tarifas que no vale la
//              pena modelar.
export const BASES_RETENCION = [
  { valor: "subtotal", label: "Sobre el subtotal" },
  { valor: "iva", label: "Sobre el IVA" },
  { valor: "manual", label: "Valor digitado" },
];

// Las cuatro que traía el Excel, con las tarifas que usaba. Son el punto de
// partida: la pestaña de Configuración las edita y agrega las que falten.
export const RETENCIONES_POR_DEFECTO = [
  { codigo: "ica_madrid", nombre: "Rte ICA (Madrid)", base: "manual", porcentaje: 0, activa: true },
  { codigo: "rte_iva_15", nombre: "Rte IVA 15 %", base: "iva", porcentaje: 15, activa: true },
  { codigo: "rte_fte_4", nombre: "Rte Fte 4 %", base: "subtotal", porcentaje: 4, activa: true },
  { codigo: "rte_fte_25", nombre: "Rte Fte 2,5 %", base: "subtotal", porcentaje: 2.5, activa: true },
];

export const IVA_POR_DEFECTO = 19;

// Plazo de pago por defecto, en días. El Excel no tenía fecha de vencimiento
// —por eso su columna RETRASO no significaba nada— y sin ella no hay cartera
// vencida que valga.
export const PLAZO_POR_DEFECTO = 30;

export const BANCOS_POR_DEFECTO = [
  { codigo: "davivienda", nombre: "Davivienda", activo: true },
  { codigo: "caja_social", nombre: "Caja Social", activo: true },
];

// El Excel mezclaba metros de lona (3,2 / 16,2) con unidades en la misma
// columna CANT, así que "cantidad" no se podía sumar ni promediar entre
// productos distintos. La unidad va aparte.
export const UNIDADES = [
  { valor: "und", label: "Unidad" },
  { valor: "m", label: "Metro" },
  { valor: "m2", label: "Metro²" },
  { valor: "kg", label: "Kilogramo" },
  { valor: "gl", label: "Global" },
  { valor: "hr", label: "Hora" },
];

export const UNIDAD_POR_DEFECTO = "und";

// ─── Destino de un abono ────────────────────────────────────────────────────
// Un abono se aplica a un documento o al saldo que el cliente traía del año
// anterior. Lo segundo hacía falta: el libro trae ocho pagos contra los
// arrastres de 2025 y sin esto quedarían sin registrar.
export const DESTINO_DOCUMENTO = "documento";
export const DESTINO_SALDO = "saldo";

// ─── Estados de pago ────────────────────────────────────────────────────────
// El Excel solo tenía OK/DEBE. "Abonada" existe porque la mayoría de las
// facturas viven ahí (anticipo y saldo contra entrega) y contarlas junto a las
// que no han pagado un peso no dice nada de la cartera.
export const ESTADO_PAGADA = "pagada";
export const ESTADO_ABONADA = "abonada";
export const ESTADO_PENDIENTE = "pendiente";
export const ESTADO_ANULADA = "anulada";

export const ESTADOS_PAGO = [
  { valor: ESTADO_PAGADA, label: "Pagada", tono: "success" },
  { valor: ESTADO_ABONADA, label: "Abonada", tono: "info" },
  { valor: ESTADO_PENDIENTE, label: "Pendiente", tono: "warning" },
  { valor: ESTADO_ANULADA, label: "Anulada", tono: "neutral" },
];

export const etiquetaEstado = (estado) =>
  ESTADOS_PAGO.find((e) => e.valor === estado)?.label || estado || "";

export const tonoEstado = (estado) =>
  ESTADOS_PAGO.find((e) => e.valor === estado)?.tono || "neutral";

// Edades de cartera. `hasta: null` es el último tramo (todo lo más viejo).
export const RANGOS_MORA = [
  { clave: "corriente", label: "Sin vencer", desde: -Infinity, hasta: 0 },
  { clave: "d1_30", label: "1 a 30 días", desde: 1, hasta: 30 },
  { clave: "d31_60", label: "31 a 60 días", desde: 31, hasta: 60 },
  { clave: "d61_90", label: "61 a 90 días", desde: 61, hasta: 90 },
  { clave: "d90", label: "Más de 90 días", desde: 91, hasta: null },
];

export function rangoDeMora(dias) {
  const d = Number(dias) || 0;
  return RANGOS_MORA.find((r) => d >= r.desde && (r.hasta === null || d <= r.hasta)) || RANGOS_MORA[0];
}
