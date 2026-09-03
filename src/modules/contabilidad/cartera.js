// Estado de cuenta y cartera por cliente.
//
// En el Excel esta era una hoja de valores pegados —una tabla dinámica
// congelada— que se desactualizaba sola: mostraba saldos que ya no existían
// porque el pago se había registrado en FACT y nadie refrescó la dinámica.
// Aquí no se guarda nada: la cartera se calcula cada vez a partir de los
// documentos y sus pagos.

import { normalizarNombreCliente } from "../../utils/clienteVinculo";
import {
  DESTINO_DOCUMENTO,
  DESTINO_SALDO,
  ESTADO_ANULADA,
  TIPO_NOTA_CREDITO,
  esNotaCredito,
  rangoDeMora,
  signoDocumento,
} from "./catalogos";
import { anioDe, aNumero, aplicacionesDe, estaSaldado, hoyISO, redondear, resumenDocumento, sinAplicar } from "./calculos";

// Con qué llave se agrupan las facturas de un mismo cliente. El id de la
// empresa manda —es la única base de clientes de la app—; el nombre
// normalizado solo hace de respaldo para lo que se importó del Excel y todavía
// no quedó amarrado a una empresa.
export function claveCliente(doc = {}) {
  if (doc.empresaId) return `id:${doc.empresaId}`;
  const nombre = normalizarNombreCliente(doc.clienteNombre);
  return nombre ? `nombre:${nombre}` : "sin-cliente";
}

export const claveDestino = (tipo, id) => `${tipo}:${id}`;

/**
 * Lo que cada factura (o cada arrastre de 2025) tiene abonado.
 *
 * Un abono es del cliente y puede repartirse entre varias facturas, así que no
 * basta con agrupar por `documentoId`: hay que abrir sus aplicaciones. Es lo
 * que el Excel no podía hacer, y por eso anotaba el pago consolidado sobre una
 * sola fila.
 */
export function aplicacionesPorDestino(pagos = []) {
  const mapa = new Map();
  for (const pago of pagos || []) {
    for (const ap of aplicacionesDe(pago)) {
      if (!ap?.id) continue;
      const clave = claveDestino(ap.tipo || DESTINO_DOCUMENTO, ap.id);
      if (!mapa.has(clave)) mapa.set(clave, []);
      mapa.get(clave).push({ valor: aNumero(ap.valor), pagoId: pago.id, fecha: pago.fecha, bancoNombre: pago.bancoNombre });
    }
  }
  return mapa;
}

/**
 * Abonos que todavía no se imputaron a nada: plata del cliente a su favor.
 *
 * `noCobrables` son los ids de las notas crédito. Un abono aplicado a una nota
 * no paga nada —la nota no se cobra— pero la plata sí entró al banco, así que
 * no puede desaparecer de la cartera: vuelve a ser anticipo del cliente hasta
 * que alguien lo impute a una factura de verdad.
 */
export function anticiposPorCliente(pagos = [], noCobrables = new Set()) {
  const mapa = new Map();
  for (const pago of pagos || []) {
    const malAplicado = aplicacionesDe(pago)
      .filter((ap) => (ap?.tipo || DESTINO_DOCUMENTO) === DESTINO_DOCUMENTO && noCobrables.has(ap?.id))
      .reduce((acc, ap) => acc + aNumero(ap.valor), 0);
    const sobra = redondear(sinAplicar(pago) + malAplicado);
    if (sobra <= 0) continue;
    const clave = claveCliente(pago);
    mapa.set(clave, redondear((mapa.get(clave) || 0) + sobra));
  }
  return mapa;
}

// Notas crédito que apuntan a una factura concreta. Las que no apuntan a
// ninguna (una nota general del cliente) no entran aquí: se tratan como un
// documento más de la cartera, con su neto en negativo.
export function agruparNotasCredito(documentos = []) {
  const mapa = new Map();
  for (const doc of documentos || []) {
    if (doc?.tipo !== TIPO_NOTA_CREDITO || !doc.docAfectadoId || doc.anulado) continue;
    if (!mapa.has(doc.docAfectadoId)) mapa.set(doc.docAfectadoId, []);
    mapa.get(doc.docAfectadoId).push(doc);
  }
  return mapa;
}

/**
 * Liquida cada documento con sus pagos y sus notas crédito aplicadas.
 * Devuelve la misma lista con un campo `resumen` (ver resumenDocumento).
 */
export function liquidarDocumentos(documentos = [], pagos = [], hoy = hoyISO()) {
  const porDestino = aplicacionesPorDestino(pagos);
  const notasPorFactura = agruparNotasCredito(documentos);
  return (documentos || []).map((doc) => ({
    ...doc,
    resumen: resumenDocumento(
      doc,
      porDestino.get(claveDestino(DESTINO_DOCUMENTO, doc.id)) || [],
      notasPorFactura.get(doc.id) || [],
      hoy
    ),
  }));
}

/**
 * Arrastres del año anterior con lo que ya se les abonó. Un saldo negativo es
 * plata a favor del cliente: no se cobra, así que tampoco recibe abonos.
 */
export function liquidarSaldos(saldosIniciales = [], pagos = [], porDestino = null) {
  const mapa = porDestino || aplicacionesPorDestino(pagos);
  return (saldosIniciales || []).map((saldo) => {
    const valor = redondear(aNumero(saldo.valor));
    const abonado = redondear((mapa.get(claveDestino(DESTINO_SALDO, saldo.id)) || [])
      .reduce((a, x) => a + aNumero(x.valor), 0));
    return { ...saldo, valor, abonado, pendiente: valor > 0 ? redondear(valor - abonado) : valor };
  });
}

/**
 * Cartera por cliente. `saldosIniciales` son los arrastres de años anteriores,
 * que en el Excel vivían como cuatro filas falsas dentro de la tabla de
 * facturas ("E.C CORTE 2025") y ensuciaban cualquier total de ventas del año.
 *
 * `hoy` es parámetro para que la mora sea reproducible en las pruebas.
 */
export function construirCartera(documentos = [], pagos = [], { saldosIniciales = [], hoy = hoyISO() } = {}) {
  const porDestino = aplicacionesPorDestino(pagos);
  const liquidados = liquidarDocumentos(documentos, pagos, hoy);
  const saldosLiquidados = liquidarSaldos(saldosIniciales, pagos, porDestino);
  const notas = new Set((documentos || []).filter(esNotaCredito).map((d) => d.id));
  const anticipos = anticiposPorCliente(pagos, notas);
  const clientes = new Map();

  const asegurar = (clave, datos) => {
    if (!clientes.has(clave)) {
      clientes.set(clave, {
        clave,
        empresaId: datos.empresaId || "",
        nombre: datos.clienteNombre || "Sin cliente",
        nit: datos.clienteNit || "",
        neto: 0,
        abonado: 0,
        saldoInicial: 0,
        // Abonos que todavía no se imputaron a ninguna factura: plata del
        // cliente a su favor, que resta de lo que debe.
        anticipos: 0,
        saldo: 0,
        vencido: 0,
        documentos: [],
        porRango: {},
      });
    }
    const cliente = clientes.get(clave);
    // El primer documento sin empresaId puede ser seguido de otro que sí la
    // tenga (se vinculó después): se completa en vez de quedarse con el vacío.
    if (!cliente.empresaId && datos.empresaId) cliente.empresaId = datos.empresaId;
    if (!cliente.nit && datos.clienteNit) cliente.nit = datos.clienteNit;
    return cliente;
  };

  // Del arrastre queda lo que no se haya abonado. Uno negativo es saldo a
  // favor y entra tal cual.
  for (const saldo of saldosLiquidados) {
    if (!saldo.pendiente) continue;
    const cliente = asegurar(claveCliente(saldo), saldo);
    cliente.saldoInicial = redondear(cliente.saldoInicial + saldo.pendiente);
    cliente.abonado = redondear(cliente.abonado + saldo.abonado);
  }

  for (const doc of liquidados) {
    if (doc.resumen.estado === ESTADO_ANULADA) continue;
    const cliente = asegurar(claveCliente(doc), doc);
    cliente.documentos.push(doc);

    // Lo facturado sí lleva signo: la nota crédito cancela el valor de la
    // factura que anula, que es exactamente para lo que se emite.
    cliente.neto = redondear(cliente.neto + signoDocumento(doc.tipo) * doc.resumen.neto);
    // Una nota crédito no recibe abonos. Si trae alguno mal aplicado, ya se
    // contó como anticipo del cliente y sumarlo aquí lo contaría dos veces.
    if (!esNotaCredito(doc)) cliente.abonado = redondear(cliente.abonado + doc.resumen.abonado);

    // `aporteSaldo` ya sabe que una nota enlazada no aporta nada (bajó el
    // saldo de su factura) y que una nota suelta descuenta en negativo.
    cliente.saldo = redondear(cliente.saldo + doc.resumen.aporteSaldo);
    if (doc.resumen.vencida) cliente.vencido = redondear(cliente.vencido + doc.resumen.saldo);

    const rango = rangoDeMora(doc.resumen.diasMora).clave;
    cliente.porRango[rango] = redondear((cliente.porRango[rango] || 0) + doc.resumen.aporteSaldo);
  }

  // Un anticipo sin aplicar puede ser de un cliente que no tiene ni facturas ni
  // arrastre en el año que se está mirando; hay que crearle la fila igual.
  for (const [clave, valor] of anticipos) {
    const cliente = clientes.get(clave) || asegurar(clave, {});
    cliente.anticipos = redondear(cliente.anticipos + valor);
  }

  const lista = [...clientes.values()]
    .map((c) => ({ ...c, saldo: redondear(c.saldo + c.saldoInicial - c.anticipos), saldado: false }))
    .map((c) => ({ ...c, saldado: estaSaldado(c.saldo) }))
    .sort((a, b) => b.saldo - a.saldo || a.nombre.localeCompare(b.nombre));

  return { clientes: lista, totales: totalesCartera(lista) };
}

export function totalesCartera(clientes = []) {
  const totales = {
    neto: 0,
    abonado: 0,
    saldoInicial: 0,
    anticipos: 0,
    saldo: 0,
    vencido: 0,
    clientesConSaldo: 0,
    porRango: {},
  };
  for (const c of clientes) {
    totales.neto = redondear(totales.neto + c.neto);
    totales.abonado = redondear(totales.abonado + c.abonado);
    totales.saldoInicial = redondear(totales.saldoInicial + c.saldoInicial);
    totales.anticipos = redondear(totales.anticipos + (c.anticipos || 0));
    totales.saldo = redondear(totales.saldo + c.saldo);
    totales.vencido = redondear(totales.vencido + c.vencido);
    if (!c.saldado) totales.clientesConSaldo += 1;
    for (const [rango, valor] of Object.entries(c.porRango)) {
      totales.porRango[rango] = redondear((totales.porRango[rango] || 0) + valor);
    }
  }
  return totales;
}

/**
 * Totales de un listado de documentos ya liquidados. Es la fila de totales de
 * la hoja FACT, pero respetando el filtro que tenga puesta la tabla —igual que
 * el SUBTOTAL(109;…) que usaba el Excel.
 */
export function totalesDocumentos(liquidados = []) {
  const totales = { subtotal: 0, iva: 0, retenciones: 0, neto: 0, abonado: 0, saldo: 0, cantidad: 0, vencido: 0 };
  for (const doc of liquidados) {
    if (!doc?.resumen || doc.resumen.estado === ESTADO_ANULADA) continue;
    const signo = signoDocumento(doc.tipo);
    totales.cantidad += 1;
    totales.subtotal = redondear(totales.subtotal + signo * doc.resumen.subtotal);
    totales.iva = redondear(totales.iva + signo * doc.resumen.iva);
    totales.retenciones = redondear(totales.retenciones + signo * doc.resumen.totalRetenciones);
    totales.neto = redondear(totales.neto + signo * doc.resumen.neto);
    // Igual que en la cartera: la nota crédito no aporta abonos ni saldo por
    // cobrar. Restarle su neto al "por cobrar" —lo que se hacía antes— dejaba
    // el total en negativo cuando la nota ya había anulado su factura.
    if (!esNotaCredito(doc)) totales.abonado = redondear(totales.abonado + doc.resumen.abonado);
    totales.saldo = redondear(totales.saldo + doc.resumen.aporteSaldo);
    if (doc.resumen.vencida) totales.vencido = redondear(totales.vencido + doc.resumen.saldo);
  }
  return totales;
}

// ─── Filtros del listado ────────────────────────────────────────────────────

// Sin tildes y en minúscula: nadie escribe "rápidas" con tilde en un buscador,
// y sin esto la factura de una Puerta Rápida no aparecía.
const texto = (v) =>
  String(v ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

// Búsqueda por palabras sueltas: "axionlog puerta" encuentra la factura de ese
// cliente por ese producto sin importar el orden en que se escriban.
export function coincideBusqueda(doc, consulta) {
  const terminos = texto(consulta).split(/\s+/).filter(Boolean);
  if (!terminos.length) return true;
  const heno = [
    doc.numero,
    doc.clienteNombre,
    doc.clienteNit,
    doc.observaciones,
    ...(doc.items || []).map((i) => `${i.producto} ${i.descripcion || ""}`),
  ].map(texto).join(" ");
  return terminos.every((t) => heno.includes(t));
}

export function filtrarDocumentos(liquidados = [], filtros = {}) {
  const {
    busqueda = "", estado = "", tipo = "", anio = "", empresaId = "",
    desde = "", hasta = "", soloVencidas = false, soloSinVincular = false,
  } = filtros;
  return liquidados.filter((doc) => {
    if (estado && doc.resumen?.estado !== estado) return false;
    if (tipo && doc.tipo !== tipo) return false;
    if (empresaId && doc.empresaId !== empresaId) return false;
    // Sin cliente de la base: su saldo se cuenta aparte del de ese mismo
    // cliente, así que hay que poder aislarlas para arreglarlas.
    if (soloSinVincular && doc.empresaId) return false;
    if (anio && anioDe(doc.fecha) !== Number(anio)) return false;
    if (desde && String(doc.fecha) < desde) return false;
    if (hasta && String(doc.fecha) > hasta) return false;
    if (soloVencidas && !doc.resumen?.vencida) return false;
    return coincideBusqueda(doc, busqueda);
  });
}

// Años con movimiento, del más reciente al más viejo. Alimenta el selector de
// año del listado sin tener que mantener una lista a mano.
export function aniosConMovimiento(documentos = []) {
  const anios = new Set();
  for (const doc of documentos || []) {
    const a = anioDe(doc?.fecha);
    if (a) anios.add(a);
  }
  return [...anios].sort((a, b) => b - a);
}
