// Fuente única de verdad de los totales de una cotización.
//
// La tabla de precios imprime una línea por producto y una por cada extra, y el
// subtotal tiene que ser exactamente la suma de esas líneas. Antes cada
// consumidor (CotizadorApp, PreviewPage y htmlSections) repetía el cálculo con
// reglas distintas: los extras se redondeaban a múltiplos de 5.000 solo al
// sumarlos, el tipo de cliente se leía de campos diferentes y el extra
// automático de Thermofilm únicamente existía en el PDF. Resultado: el total
// impreso no cuadraba con la suma de sus propias líneas.
import { getExtrasPorTipo } from "../data/catalogoProductos";
import { EXTRAS_POR_DEFECTO } from "../data/precios";

export const IVA_PORCENTAJE = 0.19;

export const MAX_BULLET = {
  nombre: "MAX BULLET PLÁSTICO PARA MONTAJE (60cm de largo)",
  precio: 35000,
};

const num = (v) => {
  const n = parseFloat(v);
  return isNaN(n) ? 0 : n;
};

/** Precio unitario de un extra del catálogo según el tipo de cliente. */
export function precioExtraUnitario(extra, tipoCliente) {
  if (!extra) return 0;
  if (extra.precioDistribuidor != null || extra.precioCliente != null) {
    return num(tipoCliente === "Distribuidor" ? extra.precioDistribuidor : extra.precioCliente);
  }
  return num(extra.precio);
}

/** Precio unitario del producto, en el mismo orden de prioridad que la tabla. */
export function precioUnitarioProducto(producto) {
  if (!producto) return 0;
  return num(
    producto.precioUnitario || producto.precioCalculado || producto.precioEditado || producto.precioManual || 0
  );
}

/** Cantidad del producto (la columna "Cantidad" de la tabla). */
export function cantidadProducto(producto) {
  return parseInt(producto?.cantidad) || 1;
}

/**
 * Extras de un producto tal como se imprimen: catálogo, personalizados y los
 * automáticos por tipo. Cada elemento es una línea de la tabla, y su `total` es
 * lo que se cobra por ella.
 */
export function getExtrasDetalle(producto, extrasOverride, tipoClienteFallback = "") {
  if (!producto) return [];
  const detalle = [];
  const tipoCliente = producto.cliente || tipoClienteFallback;
  const lista = getExtrasPorTipo(producto.tipo, extrasOverride) || EXTRAS_POR_DEFECTO[producto.tipo] || [];

  (producto.extras || []).forEach((nombre) => {
    const ex = lista.find((e) => e.nombre === nombre);
    if (!ex) return;
    const cantidad = parseInt(producto.extrasCantidades?.[nombre]) || 1;
    const precioUnit = precioExtraUnitario(ex, tipoCliente);
    detalle.push({ nombre, cantidad, precioUnit, total: precioUnit * cantidad });
  });

  // Extra automático de Cortina Thermofilm: el precio base solo cubre el film,
  // los bullets de montaje se cobran aparte según el ancho del vano.
  if (producto.tipo === "Cortina Thermofilm" && producto.ancho) {
    const anchoM = parseFloat(producto.ancho) / 1000;
    if (!isNaN(anchoM)) {
      const cantidad = (anchoM + 0.1) / 0.6; // valor decimal exacto
      detalle.push({
        nombre: MAX_BULLET.nombre,
        cantidad,
        precioUnit: MAX_BULLET.precio,
        total: MAX_BULLET.precio * cantidad,
        automatico: true,
      });
    }
  }

  (producto.extrasPersonalizados || []).forEach((ex, idx) => {
    if (!ex?.nombre) return;
    const cantidad = parseInt(producto.extrasPersonalizadosCant?.[idx]) || 1;
    const precioUnit = num(ex.precio);
    detalle.push({ nombre: ex.nombre, cantidad, precioUnit, total: precioUnit * cantidad });
  });

  return detalle;
}

/** Suma exacta de los extras de un producto (sin redondeos). */
export function calcularSubtotalExtras(producto, extrasOverride, tipoClienteFallback = "") {
  return getExtrasDetalle(producto, extrasOverride, tipoClienteFallback)
    .reduce((s, e) => s + e.total, 0);
}

/**
 * Suma de todas las líneas de la tabla, antes del ajuste general.
 * `precioUnitario` permite al cotizador pasar el precio que está calculando en
 * vivo; por defecto se lee del propio producto (cotizaciones ya guardadas).
 */
export function calcularSubtotalBruto(productos = [], opciones = {}) {
  const { extrasOverride, tipoClienteFallback = "", precioUnitario = precioUnitarioProducto } = opciones;
  return productos.reduce((s, p, i) => (
    s + precioUnitario(p, i) * cantidadProducto(p) + calcularSubtotalExtras(p, extrasOverride, tipoClienteFallback)
  ), 0);
}

/** Aplica un descuento/incremento porcentual sobre un valor. */
export function aplicarAjuste(valor, tipo, porcentaje) {
  const p = parseFloat(porcentaje);
  if (!p || isNaN(p)) return Math.round(valor);
  if (tipo === "Descuento") return Math.round(valor * (1 - p / 100));
  if (tipo === "Incremento") return Math.round(valor * (1 + p / 100));
  return Math.round(valor);
}

/**
 * Totales de la cotización. `descuento` es la diferencia exacta entre el bruto
 * y el subtotal, para que la fila impresa cuadre con la columna de arriba.
 */
export function calcularTotales(productos = [], ajusteGeneral = {}, opciones = {}) {
  const bruto = calcularSubtotalBruto(productos, opciones);
  const subtotal = aplicarAjuste(bruto, ajusteGeneral.tipo, ajusteGeneral.porcentaje);
  const iva = Math.round(subtotal * IVA_PORCENTAJE);
  return { bruto: Math.round(bruto), descuento: Math.round(bruto) - subtotal, subtotal, iva, total: subtotal + iva };
}
