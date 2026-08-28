import { describe, it, expect } from "vitest";
import { calcularTotales, calcularSubtotalBruto, getExtrasDetalle, IVA_PORCENTAJE } from "./totales";
import { getPrecioProducto } from "../data/catalogoProductos";
import { getPasoRedondeo } from "../data/precios";

// El redondeo a 10.000 (5.000 en Puertas Rápidas) es una regla del PRECIO
// UNITARIO de cada producto y de nada más. Los extras se cobran a su precio
// exacto, y bruto / descuento / subtotal / IVA / total salen al peso: el IVA es
// 19% clavado del subtotal, no un 19% "acomodado" a un múltiplo bonito.
//
// Redondear cualquiera de esos otros valores rompería la cuadratura de la tabla
// impresa —el subtotal dejaría de ser la suma de sus propias líneas— y además
// declararía un IVA que no corresponde al subtotal facturado.

const extrasOverride = {
  "Puertas Rápidas": [
    { nombre: "Radar adicional", precio: 250000 },
    { nombre: "Sensor No Touch", precio: 100000 },
  ],
};

// Cotización deliberadamente "sucia": precios de dos productos con pasos de
// redondeo distintos, extras que no son múltiplo de nada y un descuento del 7%.
const cotizacion = () => {
  const seccional = { tipo: "Puertas Seccionales", cliente: "Cliente Final Contado", ancho: 3000, alto: 3000, cantidad: 2 };
  const rapida = { tipo: "Puertas Rápidas", cliente: "Distribuidor", ancho: 2000, alto: 2000, cantidad: 1,
    extras: ["Radar adicional", "Sensor No Touch"], extrasCantidades: { "Radar adicional": 3 } };

  return [seccional, rapida].map(p => ({ ...p, precioCalculado: getPrecioProducto(p).ajustado }));
};

describe("el redondeo de precios no toca sumas, IVA ni totales", () => {
  it("redondea el precio unitario de cada producto, cada uno con su paso", () => {
    const [seccional, rapida] = cotizacion();
    expect(seccional.precioCalculado % 10000).toBe(0);
    expect(rapida.precioCalculado % 5000).toBe(0);
    // Y la rápida cae justo donde los dos pasos difieren.
    expect(rapida.precioCalculado % 10000).not.toBe(0);
  });

  it("cobra los extras a su precio exacto, sin redondear", () => {
    const [, rapida] = cotizacion();
    const detalle = getExtrasDetalle(rapida, extrasOverride);
    expect(detalle.map(e => e.total)).toEqual([750000, 100000]); // 250.000 × 3, 100.000 × 1
  });

  it("no redondea bruto, subtotal, IVA ni total al paso del producto", () => {
    const productos = cotizacion();
    const t = calcularTotales(productos, { tipo: "Descuento", porcentaje: 7 }, { extrasOverride });

    // El IVA es exactamente el 19% del subtotal, al peso.
    expect(t.iva).toBe(Math.round(t.subtotal * IVA_PORCENTAJE));
    expect(t.total).toBe(t.subtotal + t.iva);

    // Un 7% de descuento sobre esta base no cae en un múltiplo de 10.000; si
    // alguien metiera redondearPrecio en calcularTotales, esto se rompería.
    expect(t.subtotal % 10000).not.toBe(0);
    expect(t.iva % 10000).not.toBe(0);
    expect(t.total % 10000).not.toBe(0);
  });

  it("el subtotal sigue siendo la suma exacta de las líneas que se imprimen", () => {
    const productos = cotizacion();
    const bruto = calcularSubtotalBruto(productos, { extrasOverride });

    const suma = productos.reduce((s, p) => {
      const lineas = getExtrasDetalle(p, extrasOverride).reduce((a, e) => a + e.total, 0);
      return s + p.precioCalculado * p.cantidad + lineas;
    }, 0);

    expect(bruto).toBe(suma);

    // Sin ajuste general, el subtotal es el bruto tal cual: ningún redondeo
    // extra se cuela entre la última línea de la tabla y el subtotal.
    const t = calcularTotales(productos, {}, { extrasOverride });
    expect(t.subtotal).toBe(Math.round(bruto));
    expect(t.descuento).toBe(0);
  });
});
