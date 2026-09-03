// De una cotización aprobada a un borrador de factura.
//
// Se factura exactamente lo que se cotizó: cada línea que imprimió la tabla de
// precios —el producto y cada uno de sus extras— es una línea de la factura, y
// el descuento general entra como su propia línea. Así el subtotal de la
// factura da idéntico al de la cotización, en vez de "parecido".
//
// No guarda nada: devuelve el objeto que el formulario abre ya diligenciado,
// para que quien factura revise, ponga el número de la DIAN y confirme.

import {
  IVA_PORCENTAJE,
  cantidadProducto,
  calcularTotales,
  getExtrasDetalle,
  precioUnitarioProducto,
} from "../../utils/totales";
import { PLAZO_POR_DEFECTO, TIPO_FACTURA, UNIDAD_POR_DEFECTO } from "./catalogos";
import { hoyISO, redondear, sumarDias } from "./calculos";

const nombreProducto = (p) => String(p?.nombrePersonalizado || p?.tipo || "Producto").trim();

/** Las líneas de la tabla de precios, en el mismo orden en que se imprimieron. */
export function itemsDeCotizacion(cotizacion = {}, { extrasOverride } = {}) {
  const productos = cotizacion.productos || [];
  const tipoClienteFallback = cotizacion.tipoCliente || "";
  const items = [];

  for (const producto of productos) {
    items.push({
      producto: nombreProducto(producto),
      descripcion: "",
      cantidad: cantidadProducto(producto),
      unidad: UNIDAD_POR_DEFECTO,
      valorUnitario: redondear(precioUnitarioProducto(producto)),
    });

    for (const extra of getExtrasDetalle(producto, extrasOverride, tipoClienteFallback)) {
      items.push({
        producto: extra.nombre,
        // El extra se cobra aparte pero pertenece a un producto; sin esta nota
        // la factura queda con líneas sueltas que nadie sabe de dónde salen.
        descripcion: `Accesorio de ${nombreProducto(producto)}`,
        cantidad: redondear(extra.cantidad, 4),
        unidad: UNIDAD_POR_DEFECTO,
        valorUnitario: redondear(extra.precioUnit),
      });
    }
  }

  return items;
}

/**
 * Borrador de factura a partir de una cotización guardada.
 *
 * El número se deja en blanco a propósito: lo asigna la resolución de la DIAN,
 * no el consecutivo interno de la cotización.
 */
export function facturaDesdeCotizacion(cotizacion = {}, { plazoDias = PLAZO_POR_DEFECTO, extrasOverride, hoy = hoyISO() } = {}) {
  const items = itemsDeCotizacion(cotizacion, { extrasOverride });
  const totales = calcularTotales(cotizacion.productos || [], cotizacion.ajusteGeneral || {}, { extrasOverride });

  // El descuento general de la cotización no cuelga de ningún producto, así que
  // va como una línea propia; sin ella el subtotal de la factura sería el bruto
  // y quedaría por encima de lo que el cliente aprobó.
  if (totales.descuento) {
    items.push({
      producto: cotizacion.ajusteGeneral?.tipo === "Incremento" ? "Incremento general" : "Descuento general",
      descripcion: cotizacion.ajusteGeneral?.porcentaje ? `${cotizacion.ajusteGeneral.porcentaje} %` : "",
      cantidad: 1,
      unidad: UNIDAD_POR_DEFECTO,
      valorUnitario: redondear(-totales.descuento),
    });
  }

  return {
    tipo: TIPO_FACTURA,
    numero: "",
    fecha: hoy,
    plazoDias,
    fechaVencimiento: sumarDias(hoy, plazoDias),
    empresaId: cotizacion.empresaId || "",
    clienteNombre: cotizacion.nombreCliente || cotizacion.cliente || "",
    clienteNit: cotizacion.empresaNIT || cotizacion.clienteNIT || "",
    items,
    ivaPorcentaje: IVA_PORCENTAJE * 100,
    retenciones: [],
    observaciones: cotizacion.numero ? `Cotización N.º ${cotizacion.numero}` : "",
    cotizacionId: cotizacion.id || "",
    cotizacionNumero: cotizacion.numero ? String(cotizacion.numero) : "",
    origen: "cotizacion",
  };
}
