import { describe, it, expect } from "vitest";
import { getPasoRedondeo, redondearPrecio } from "./precios";
import { getPrecioProducto } from "./catalogoProductos";
import { PRODUCTOS_ACTIVOS } from "./catalogoProductos";

// Los precios de venta salen a múltiplos de 10.000, con una sola excepción:
// las Puertas Rápidas se cotizan al múltiplo de 5.000.

describe("redondeo de precios", () => {
  it("usa 10.000 para todo salvo Puertas Rápidas", () => {
    expect(getPasoRedondeo("Puertas Rápidas")).toBe(5000);
    for (const tipo of PRODUCTOS_ACTIVOS.filter(t => t !== "Puertas Rápidas")) {
      expect(getPasoRedondeo(tipo), tipo).toBe(10000);
    }
    // Un tipo desconocido (productos personalizados, repuestos) cae al defecto.
    expect(getPasoRedondeo("Repuestos")).toBe(10000);
    expect(getPasoRedondeo(undefined)).toBe(10000);
  });

  it("redondea al múltiplo más cercano, hacia arriba y hacia abajo", () => {
    expect(redondearPrecio(2_844_000, "Divisiones Térmicas")).toBe(2_840_000);
    expect(redondearPrecio(2_846_000, "Divisiones Térmicas")).toBe(2_850_000);
    expect(redondearPrecio(2_844_000, "Puertas Rápidas")).toBe(2_845_000);
  });

  it("deja todo precio cotizado en el múltiplo de su producto", () => {
    const medidas = { ancho: 2500, alto: 2500 };
    const casos = [
      { tipo: "Divisiones Térmicas", ...medidas },
      { tipo: "Puertas Seccionales", ...medidas },
      { tipo: "Puertas Rápidas", ...medidas },
      { tipo: "Sello de Andén", ...medidas, componentes: ["sello completo", "travesaño"] },
      { tipo: "Abrigo Retráctil Estándar", ancho: 3300, alto: 3500 },
      { tipo: "Abrigo Retráctil Inflable", ancho: 3300, alto: 3500 },
    ];

    for (const base of casos) {
      for (const cliente of ["Distribuidor", "Cliente Final Contado", "Cliente Final Crédito", "Pequeño Distribuidor"]) {
        // Un ajuste con decimales sucios es el caso que más fácil se escapa.
        const p = { ...base, cliente, ajusteTipo: "Descuento", ajusteValor: 7 };
        const r = getPrecioProducto(p);
        const paso = getPasoRedondeo(base.tipo);
        expect(r.base % paso, `${base.tipo} base / ${cliente}`).toBe(0);
        expect(r.ajustado % paso, `${base.tipo} ajustado / ${cliente}`).toBe(0);
      }
    }
  });

  it("la excepción de Puertas Rápidas cambia precios reales, no es decorativa", () => {
    // Más de la mitad de la matriz de Puertas Rápidas cae en múltiplos de 5.000
    // que no lo son de 10.000: meterlas en el paso general movería esos precios.
    const r = getPrecioProducto({
      tipo: "Puertas Rápidas",
      cliente: "Distribuidor",
      ancho: 2000,
      alto: 2000,
    });
    expect(r.ajustado).toBe(14_025_000);
    expect(r.ajustado % 10000).not.toBe(0);
  });
});
