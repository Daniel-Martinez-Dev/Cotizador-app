import { describe, it, expect } from "vitest";
import { construirDocumento } from "./firebaseContabilidad";

// `construirDocumento` es la única puerta por la que un documento entra a
// Firestore, así que es donde se decide qué se guarda y qué se recalcula.
// Puro y sin red: se prueba directo.

const base = {
  numero: "J-1001",
  fecha: "2026-03-04",
  clienteNombre: "AXIONLOG",
  items: [{ producto: "Puerta rápida", cantidad: 2, unidad: "und", valorUnitario: 500_000 }],
  ivaPorcentaje: 19,
};

describe("construirDocumento", () => {
  it("conserva el tipo nota débito en vez de degradarlo a factura", () => {
    expect(construirDocumento({ ...base, tipo: "nota_debito" }).tipo).toBe("nota_debito");
    expect(construirDocumento({ ...base, tipo: "nota_credito" }).tipo).toBe("nota_credito");
    expect(construirDocumento({ ...base, tipo: "factura" }).tipo).toBe("factura");
  });

  it("cae a factura si el tipo llega vacío o inventado", () => {
    expect(construirDocumento({ ...base, tipo: "" }).tipo).toBe("factura");
    expect(construirDocumento({ ...base, tipo: "recibo" }).tipo).toBe("factura");
  });

  it("recalcula el neto y no acepta el que venga del formulario", () => {
    const doc = construirDocumento({ ...base, subtotal: 1, iva: 1, neto: 1 });
    expect(doc.subtotal).toBe(1_000_000);
    expect(doc.iva).toBe(190_000);
    expect(doc.neto).toBe(1_190_000);
  });

  it("respeta el neto declarado cuando se pide netoImportado", () => {
    const doc = construirDocumento({ ...base, neto: 1_190_000.02 }, { netoImportado: true });
    expect(doc.neto).toBe(1_190_000.02);
    // El subtotal y el IVA sí se recalculan: lo que se conserva es la cifra
    // que el libro ya declaró como neto a pagar.
    expect(doc.subtotal).toBe(1_000_000);
  });

  it("el periodo contable sigue a la fecha salvo que se declare otro", () => {
    expect(construirDocumento(base).periodoContable).toBe(2026);
    expect(construirDocumento({ ...base, fecha: "2025-12-20", periodoContable: 2026 }).periodoContable).toBe(2026);
  });

  it("calcula el vencimiento con el plazo cuando no viene dado", () => {
    expect(construirDocumento({ ...base, plazoDias: 30 }).fechaVencimiento).toBe("2026-04-03");
    expect(construirDocumento({ ...base, plazoDias: 30, fechaVencimiento: "2026-05-01" }).fechaVencimiento)
      .toBe("2026-05-01");
  });

  it("guarda el vínculo con la empresa tal cual llega", () => {
    const doc = construirDocumento({ ...base, empresaId: "e1", clienteNit: "900.123.456-7" });
    expect(doc.empresaId).toBe("e1");
    expect(doc.clienteNit).toBe("900.123.456-7");
  });
});
