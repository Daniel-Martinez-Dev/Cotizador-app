import { describe, it, expect } from "vitest";
import {
  aplicarAjuste,
  calcularSubtotalExtras,
  calcularTotales,
  getExtrasDetalle,
  precioExtraUnitario,
} from "./totales";

// Extras tal como los tiene configurados la empresa para Puertas Rápidas.
const extrasOverride = {
  "Puertas Rápidas": [
    { nombre: "Transformador 1KVA con caja", precio: 620000 },
    { nombre: "Biométrico", precio: 380000 },
    { nombre: "Sin botonera", precio: -50000 },
    { nombre: "Cortavientos cada 50cm", precio: 609000 },
    { nombre: "Cortavientos 682", precio: 682000 },
    { nombre: "Cortavientos 580", precio: 580000 },
  ],
};

const puerta = (precio, cortavientos) => ({
  tipo: "Puertas Rápidas",
  cliente: "Cliente Final Contado",
  cantidad: 1,
  precioCalculado: precio,
  extras: ["Transformador 1KVA con caja", "Biométrico", "Sin botonera", cortavientos],
});

// Caso reportado: la suma de las líneas impresas daba 52.216.000 y la
// cotización mostraba 52.215.000, porque los extras de cada producto se
// redondeaban al múltiplo de 5.000 más cercano antes de sumarse.
const cotizacionReportada = [
  puerta(15485000, "Cortavientos cada 50cm"),
  puerta(16525000, "Cortavientos 682"),
  puerta(15485000, "Cortavientos 580"),
];

describe("calcularSubtotalExtras", () => {
  it("suma los extras exactos, sin redondear a múltiplos de 5.000", () => {
    // 620.000 + 380.000 - 50.000 + 609.000
    expect(calcularSubtotalExtras(cotizacionReportada[0], extrasOverride)).toBe(1559000);
    expect(calcularSubtotalExtras(cotizacionReportada[1], extrasOverride)).toBe(1632000);
  });

  it("multiplica por la cantidad de cada extra", () => {
    const p = { ...cotizacionReportada[0], extrasCantidades: { "Biométrico": 3 } };
    expect(calcularSubtotalExtras(p, extrasOverride)).toBe(1559000 + 380000 * 2);
  });

  it("incluye los extras personalizados", () => {
    const p = {
      ...cotizacionReportada[0],
      extrasPersonalizados: [{ nombre: "Transporte", precio: 350000 }],
      extrasPersonalizadosCant: { 0: 2 },
    };
    expect(calcularSubtotalExtras(p, extrasOverride)).toBe(1559000 + 700000);
  });
});

describe("calcularTotales", () => {
  it("el subtotal es exactamente la suma de las líneas impresas", () => {
    const { bruto, subtotal, iva, total } = calcularTotales(cotizacionReportada, {}, { extrasOverride });
    expect(bruto).toBe(52216000);
    expect(subtotal).toBe(52216000);
    expect(iva).toBe(9921040);
    expect(total).toBe(62137040);
  });

  it("no desplaza el total al múltiplo de 5.000 más cercano", () => {
    const [p] = cotizacionReportada;
    const { subtotal } = calcularTotales([{ ...p, extras: [] }], {}, { extrasOverride });
    expect(subtotal).toBe(15485000);
    const { subtotal: conExtra } = calcularTotales(
      [{ ...p, extras: ["Cortavientos cada 50cm"] }], {}, { extrasOverride }
    );
    expect(conExtra).toBe(15485000 + 609000);
  });

  it("el descuento general se aplica sobre productos y extras", () => {
    const totales = calcularTotales(cotizacionReportada, { tipo: "Descuento", porcentaje: 10 }, { extrasOverride });
    expect(totales.subtotal).toBe(Math.round(52216000 * 0.9));
    expect(totales.bruto - totales.descuento).toBe(totales.subtotal);
  });

  it("usa el precio en vivo cuando el llamador lo pasa", () => {
    const { subtotal } = calcularTotales([{ tipo: "Puertas Rápidas", cantidad: 2 }], {}, {
      extrasOverride,
      precioUnitario: () => 1000000,
    });
    expect(subtotal).toBe(2000000);
  });
});

describe("precioExtraUnitario", () => {
  it("distingue precio de distribuidor y de cliente", () => {
    const extra = { precioDistribuidor: 480000, precioCliente: 520000 };
    expect(precioExtraUnitario(extra, "Distribuidor")).toBe(480000);
    expect(precioExtraUnitario(extra, "Cliente Final Contado")).toBe(520000);
  });

  it("acepta precios negativos y sin precio", () => {
    expect(precioExtraUnitario({ precio: -50000 })).toBe(-50000);
    expect(precioExtraUnitario({ nombre: "sin precio" })).toBe(0);
  });
});

describe("Cortina Thermofilm", () => {
  const cortina = { tipo: "Cortina Thermofilm", cantidad: 1, ancho: 3000, alto: 2500, precioCalculado: 1500000 };

  it("cobra los MAX BULLET que el PDF ya imprimía", () => {
    const detalle = getExtrasDetalle(cortina);
    expect(detalle).toHaveLength(1);
    expect(detalle[0].nombre).toMatch(/MAX BULLET/);
    expect(detalle[0].cantidad).toBeCloseTo((3.0 + 0.1) / 0.6, 6);
    expect(calcularSubtotalExtras(cortina)).toBeCloseTo(35000 * ((3.0 + 0.1) / 0.6), 6);
  });

  it("no agrega bullets si no hay ancho", () => {
    expect(calcularSubtotalExtras({ ...cortina, ancho: "" })).toBe(0);
  });
});

describe("aplicarAjuste", () => {
  it("devuelve el valor redondeado cuando no hay porcentaje", () => {
    expect(aplicarAjuste(1000.4, "Descuento", 0)).toBe(1000);
    expect(aplicarAjuste(1000.6, undefined, undefined)).toBe(1001);
  });

  it("aplica descuento e incremento", () => {
    expect(aplicarAjuste(1000000, "Descuento", 10)).toBe(900000);
    expect(aplicarAjuste(1000000, "Incremento", 10)).toBe(1100000);
  });
});
