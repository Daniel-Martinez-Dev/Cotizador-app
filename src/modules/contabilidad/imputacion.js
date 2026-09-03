// Imputación de abonos por antigüedad.
//
// En el libro de Excel un abono se anotaba sobre la fila que el digitador
// tuviera a mano, así que la transferencia consolidada de un cliente terminaba
// encima de una sola factura: 53 documentos quedaron con más plata de la que
// valían —$366.622.893 de más— mientras sus facturas hermanas figuraban en
// mora sin estarlo.
//
// Lo que sí quedó bien es el total por cliente: la cartera agregada del libro
// da $211.549.855,60 contra los $211.549.856 que declara FACT!O342. Sobre esa
// base se puede reconstruir el reparto: se toman los abonos del cliente y se
// aplican a lo que debe, de lo más viejo a lo más nuevo. El saldo por cliente
// no se mueve ni un peso y el reparto por factura pasa a ser defendible.
//
// Es la regla contable corriente de imputación de pagos, y es exactamente lo
// que hace un cajero cuando recibe un abono sin instrucción de a qué factura va.

import { DESTINO_DOCUMENTO, DESTINO_SALDO } from "./catalogos";
import { aNumero, redondear } from "./calculos";

// Por debajo de un peso un destino ya está cubierto: son residuos de dividir
// totales entre cantidades con decimales, no plata que alguien deba.
const TOLERANCIA = 1;

export const claveDestino = (destino = {}) => `${destino.tipo || DESTINO_DOCUMENTO}:${destino.id}`;

/**
 * Orden en que se cubre la deuda de un cliente: primero lo que traía del año
 * anterior —es lo más viejo que hay— y después los documentos por fecha. A
 * igual fecha manda el número, para que dos facturas del mismo día se imputen
 * siempre igual y el resultado sea reproducible.
 */
export function ordenarDestinos(destinos = []) {
  const peso = (d) => (d.tipo === DESTINO_SALDO ? 0 : 1);
  return [...destinos].sort((a, b) => {
    if (peso(a) !== peso(b)) return peso(a) - peso(b);
    const fa = String(a.fecha || "");
    const fb = String(b.fecha || "");
    if (fa !== fb) {
      // Un destino sin fecha no puede colarse de primero solo por estar vacío.
      if (!fa) return 1;
      if (!fb) return -1;
      return fa < fb ? -1 : 1;
    }
    return String(a.id).localeCompare(String(b.id), "es", { numeric: true });
  });
}

/**
 * Reparte los abonos de un cliente entre sus destinos.
 *
 * `destinos` son los cobrables con su `capacidad` —el neto menos lo que ya le
 * descontó una nota crédito enlazada—. `pagos` son los abonos del cliente, que
 * se aplican en orden de fecha: un abono viejo no puede pagar una factura que
 * todavía no existía... salvo que sea un anticipo, y de esos hay 116 en el
 * libro, así que no se descarta ninguno por fecha.
 *
 * Devuelve los pagos con su arreglo `aplicaciones`; lo que no alcanzó destino
 * queda dentro del pago como saldo sin aplicar (ver `sinAplicar`).
 */
export function imputarCliente(pagos = [], destinos = []) {
  const cola = ordenarDestinos(destinos).map((d) => ({
    tipo: d.tipo || DESTINO_DOCUMENTO,
    id: d.id,
    resta: Math.max(0, redondear(aNumero(d.capacidad))),
  }));

  const ordenados = [...pagos].sort((a, b) => {
    const fa = String(a.fecha || "");
    const fb = String(b.fecha || "");
    if (fa !== fb) return fa < fb ? -1 : 1;
    return String(a.id ?? "").localeCompare(String(b.id ?? ""), "es", { numeric: true });
  });

  let i = 0;
  const resultado = ordenados.map((pago) => {
    let disponible = redondear(Math.abs(aNumero(pago.valor)));
    const aplicaciones = [];

    while (disponible > TOLERANCIA && i < cola.length) {
      const destino = cola[i];
      if (destino.resta <= TOLERANCIA) { i += 1; continue; }
      const valor = redondear(Math.min(disponible, destino.resta));
      aplicaciones.push({ tipo: destino.tipo, id: destino.id, valor });
      destino.resta = redondear(destino.resta - valor);
      disponible = redondear(disponible - valor);
      if (destino.resta <= TOLERANCIA) i += 1;
    }

    return { ...pago, aplicaciones };
  });

  return {
    pagos: resultado,
    // Lo que quedó por cobrar después de repartir todo, por destino.
    pendientes: cola.filter((d) => d.resta > TOLERANCIA).map((d) => ({ ...d })),
  };
}

/**
 * Lo mismo, para todos los clientes de una vez.
 *
 * `porCliente` es un mapa clave-de-cliente → { pagos, destinos }. La clave la
 * decide quien llama (el id de la empresa, o el del cliente del archivo que se
 * está importando).
 */
export function imputarTodos(porCliente = new Map()) {
  const pagos = [];
  const pendientes = new Map();
  for (const [clave, { pagos: p = [], destinos = [] }] of porCliente) {
    const r = imputarCliente(p, destinos);
    pagos.push(...r.pagos);
    pendientes.set(clave, r.pendientes);
  }
  return { pagos, pendientes };
}

/**
 * Capacidad de cobro de un documento: su neto menos lo que ya le descontaron
 * las notas crédito que lo señalan. Una nota crédito no se cobra, así que no
 * es destino de ningún abono.
 */
export function capacidadDocumento(doc = {}, notasEnlazadas = []) {
  const neto = redondear(Math.abs(aNumero(doc.neto)));
  const credito = (notasEnlazadas || []).reduce((acc, nc) => acc + Math.abs(aNumero(nc.neto)), 0);
  return Math.max(0, redondear(neto - credito));
}

/** Resumen para poder mostrar qué hizo la imputación antes de guardar nada. */
export function resumirImputacion(pagos = []) {
  let repartido = 0;
  let sobrante = 0;
  let conVarios = 0;
  for (const pago of pagos) {
    const aplicado = (pago.aplicaciones || []).reduce((a, x) => a + aNumero(x.valor), 0);
    repartido += aplicado;
    sobrante += Math.max(0, aNumero(pago.valor) - aplicado);
    if ((pago.aplicaciones || []).length > 1) conVarios += 1;
  }
  return {
    pagos: pagos.length,
    repartido: redondear(repartido),
    sobrante: redondear(sobrante),
    // Abonos que cubrieron más de una factura: son los que el Excel no podía
    // representar y que ahora quedan repartidos.
    conVariasFacturas: conVarios,
  };
}
