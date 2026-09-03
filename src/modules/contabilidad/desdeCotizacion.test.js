import { describe, it, expect } from "vitest";
import { facturaDesdeCotizacion, itemsDeCotizacion } from "./desdeCotizacion";
import { calcularDocumento } from "./calculos";
import { calcularTotales } from "../../utils/totales";

const HOY = "2026-09-01";

const cotizacion = (extra = {}) => ({
  id: "cot1",
  numero: 4821,
  nombreCliente: "Axionlog Colombia S.A.S.",
  empresaId: "emp1",
  empresaNIT: "900123456-7",
  productos: [
    { tipo: "Puertas Rápidas", cantidad: 2, precioUnitario: 12_000_000 },
    { tipo: "Sello de Andén", nombrePersonalizado: "Sello reforzado", cantidad: 1, precioUnitario: 4_500_000 },
  ],
  ajusteGeneral: {},
  ...extra,
});

describe("itemsDeCotizacion", () => {
  it("una línea por producto, con su cantidad y su precio unitario", () => {
    const items = itemsDeCotizacion(cotizacion());
    expect(items).toEqual([
      { producto: "Puertas Rápidas", descripcion: "", cantidad: 2, unidad: "und", valorUnitario: 12_000_000 },
      { producto: "Sello reforzado", descripcion: "", cantidad: 1, unidad: "und", valorUnitario: 4_500_000 },
    ]);
  });

  it("usa el nombre personalizado cuando lo hay", () => {
    const items = itemsDeCotizacion(cotizacion());
    expect(items[1].producto).toBe("Sello reforzado");
  });

  it("cada extra personalizado es su propia línea, atada a su producto", () => {
    const items = itemsDeCotizacion(cotizacion({
      productos: [{
        tipo: "Puertas Rápidas",
        cantidad: 1,
        precioUnitario: 12_000_000,
        extrasPersonalizados: [{ nombre: "Cortina adicional", precio: 800_000 }],
        extrasPersonalizadosCant: [3],
      }],
    }));
    expect(items).toHaveLength(2);
    expect(items[1]).toMatchObject({
      producto: "Cortina adicional",
      descripcion: "Accesorio de Puertas Rápidas",
      cantidad: 3,
      valorUnitario: 800_000,
    });
  });
});

describe("facturaDesdeCotizacion", () => {
  it("el subtotal de la factura es idéntico al de la cotización", () => {
    const cot = cotizacion();
    const factura = facturaDesdeCotizacion(cot, { hoy: HOY });
    const totalesCot = calcularTotales(cot.productos, cot.ajusteGeneral);
    expect(calcularDocumento(factura).subtotal).toBe(totalesCot.subtotal);
    expect(calcularDocumento(factura).iva).toBe(totalesCot.iva);
    expect(calcularDocumento(factura).neto).toBe(totalesCot.total);
  });

  it("el descuento general baja como una línea propia y el subtotal sigue cuadrando", () => {
    const cot = cotizacion({ ajusteGeneral: { tipo: "Descuento", porcentaje: 10 } });
    const factura = facturaDesdeCotizacion(cot, { hoy: HOY });
    const linea = factura.items.at(-1);
    expect(linea.producto).toBe("Descuento general");
    expect(linea.valorUnitario).toBeLessThan(0);
    expect(calcularDocumento(factura).subtotal).toBe(calcularTotales(cot.productos, cot.ajusteGeneral).subtotal);
  });

  it("un incremento general también queda como línea, con su nombre", () => {
    const cot = cotizacion({ ajusteGeneral: { tipo: "Incremento", porcentaje: 5 } });
    const factura = facturaDesdeCotizacion(cot, { hoy: HOY });
    const linea = factura.items.at(-1);
    expect(linea.producto).toBe("Incremento general");
    expect(linea.valorUnitario).toBeGreaterThan(0);
    expect(calcularDocumento(factura).subtotal).toBe(calcularTotales(cot.productos, cot.ajusteGeneral).subtotal);
  });

  it("sin ajuste no agrega ninguna línea de descuento", () => {
    const factura = facturaDesdeCotizacion(cotizacion(), { hoy: HOY });
    expect(factura.items.some((i) => /general/.test(i.producto))).toBe(false);
  });

  it("arrastra el cliente y deja el rastro de la cotización", () => {
    const factura = facturaDesdeCotizacion(cotizacion(), { hoy: HOY });
    expect(factura).toMatchObject({
      empresaId: "emp1",
      clienteNombre: "Axionlog Colombia S.A.S.",
      clienteNit: "900123456-7",
      cotizacionId: "cot1",
      cotizacionNumero: "4821",
      observaciones: "Cotización N.º 4821",
      origen: "cotizacion",
    });
  });

  it("deja el número en blanco: lo asigna la resolución DIAN, no la cotización", () => {
    expect(facturaDesdeCotizacion(cotizacion(), { hoy: HOY }).numero).toBe("");
  });

  it("calcula el vencimiento desde el plazo pedido", () => {
    const factura = facturaDesdeCotizacion(cotizacion(), { hoy: HOY, plazoDias: 45 });
    expect(factura.fecha).toBe(HOY);
    expect(factura.fechaVencimiento).toBe("2026-10-16");
  });

  it("no se cae con una cotización sin productos", () => {
    const factura = facturaDesdeCotizacion({ numero: 1 }, { hoy: HOY });
    expect(factura.items).toEqual([]);
    expect(calcularDocumento(factura).neto).toBe(0);
  });
});
