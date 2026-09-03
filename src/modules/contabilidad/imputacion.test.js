import { describe, it, expect } from "vitest";
import {
  capacidadDocumento,
  imputarCliente,
  imputarTodos,
  ordenarDestinos,
  resumirImputacion,
} from "./imputacion";
import { sinAplicar, totalAplicado } from "./calculos";

const doc = (id, fecha, capacidad) => ({ tipo: "documento", id, fecha, capacidad });
const saldo = (id, capacidad) => ({ tipo: "saldo", id, capacidad });
const pago = (id, fecha, valor) => ({ id, fecha, valor });

describe("ordenarDestinos", () => {
  it("el arrastre del año anterior se cubre primero: es lo más viejo que hay", () => {
    const orden = ordenarDestinos([doc("f1", "2026-01-10", 100), saldo("s1", 50)]);
    expect(orden.map((d) => d.id)).toEqual(["s1", "f1"]);
  });

  it("después va por fecha, de la más vieja a la más nueva", () => {
    const orden = ordenarDestinos([
      doc("f3", "2026-03-01", 1), doc("f1", "2026-01-01", 1), doc("f2", "2026-02-01", 1),
    ]);
    expect(orden.map((d) => d.id)).toEqual(["f1", "f2", "f3"]);
  });

  it("a igual fecha desempata el número, para que el reparto sea reproducible", () => {
    const a = ordenarDestinos([doc("2810", "2026-01-01", 1), doc("2809", "2026-01-01", 1)]);
    const b = ordenarDestinos([doc("2809", "2026-01-01", 1), doc("2810", "2026-01-01", 1)]);
    expect(a.map((d) => d.id)).toEqual(["2809", "2810"]);
    expect(b.map((d) => d.id)).toEqual(a.map((d) => d.id));
  });

  it("un documento sin fecha no se cuela de primero por estar vacío", () => {
    const orden = ordenarDestinos([doc("sf", "", 1), doc("f1", "2026-05-01", 1)]);
    expect(orden.map((d) => d.id)).toEqual(["f1", "sf"]);
  });
});

describe("imputarCliente", () => {
  it("un abono que cubre varias facturas se reparte entre ellas", () => {
    const { pagos } = imputarCliente(
      [pago("p1", "2026-03-02", 35_930_987)],
      [doc("2801", "2026-01-23", 3_844_500), doc("2807", "2026-01-30", 1_840_700), doc("2842", "2026-03-02", 179_899_300)]
    );
    expect(pagos[0].aplicaciones).toEqual([
      { tipo: "documento", id: "2801", valor: 3_844_500 },
      { tipo: "documento", id: "2807", valor: 1_840_700 },
      { tipo: "documento", id: "2842", valor: 30_245_787 },
    ]);
    expect(totalAplicado(pagos[0])).toBe(35_930_987);
    expect(sinAplicar(pagos[0])).toBe(0);
  });

  it("ninguna factura recibe más de lo que vale", () => {
    const { pagos } = imputarCliente([pago("p1", "2026-02-01", 20_000_000)], [doc("f1", "2026-01-01", 1_281_500)]);
    expect(pagos[0].aplicaciones).toEqual([{ tipo: "documento", id: "f1", valor: 1_281_500 }]);
    expect(sinAplicar(pagos[0])).toBe(18_718_500);
  });

  it("lo que sobra queda como anticipo del cliente, no se pierde", () => {
    const { pagos } = imputarCliente([pago("p1", "2026-01-01", 500)], [doc("f1", "2026-01-01", 200)]);
    expect(sinAplicar(pagos[0])).toBe(300);
  });

  it("cubre primero el saldo de 2025 y después las facturas del año", () => {
    const { pagos } = imputarCliente(
      [pago("p1", "2026-02-23", 1_000_000)],
      [doc("f1", "2026-01-15", 900_000), saldo("s1", 202_300)]
    );
    expect(pagos[0].aplicaciones).toEqual([
      { tipo: "saldo", id: "s1", valor: 202_300 },
      { tipo: "documento", id: "f1", valor: 797_700 },
    ]);
  });

  it("varios abonos se aplican en orden de fecha", () => {
    const { pagos } = imputarCliente(
      [pago("p2", "2026-05-01", 600), pago("p1", "2026-02-01", 500)],
      [doc("f1", "2026-01-01", 800), doc("f2", "2026-04-01", 300)]
    );
    const porId = Object.fromEntries(pagos.map((p) => [p.id, p.aplicaciones]));
    expect(porId.p1).toEqual([{ tipo: "documento", id: "f1", valor: 500 }]);
    expect(porId.p2).toEqual([
      { tipo: "documento", id: "f1", valor: 300 },
      { tipo: "documento", id: "f2", valor: 300 },
    ]);
  });

  it("un anticipo anterior a la factura sí se aplica: en el libro hay 116", () => {
    const { pagos } = imputarCliente([pago("p1", "2025-12-16", 4_256_000)], [doc("f1", "2026-01-20", 4_256_000)]);
    expect(pagos[0].aplicaciones).toHaveLength(1);
    expect(sinAplicar(pagos[0])).toBe(0);
  });

  it("no deja residuos de centavos abiertos", () => {
    const { pagos, pendientes } = imputarCliente(
      [pago("p1", "2026-01-01", 33_543_797)],
      [doc("f1", "2026-01-01", 33_543_797.5)]
    );
    expect(pagos[0].aplicaciones[0].valor).toBe(33_543_797);
    expect(pendientes).toEqual([]);
  });

  it("reporta lo que quedó pendiente por cobrar", () => {
    const { pendientes } = imputarCliente([pago("p1", "2026-01-01", 100)], [doc("f1", "2026-01-01", 500)]);
    expect(pendientes).toEqual([{ tipo: "documento", id: "f1", resta: 400 }]);
  });

  it("sin abonos no aplica nada y deja todo pendiente", () => {
    const { pagos, pendientes } = imputarCliente([], [doc("f1", "2026-01-01", 500)]);
    expect(pagos).toEqual([]);
    expect(pendientes).toHaveLength(1);
  });

  it("sin destinos, todo el abono queda sin aplicar", () => {
    const { pagos } = imputarCliente([pago("p1", "2026-01-01", 700)], []);
    expect(pagos[0].aplicaciones).toEqual([]);
    expect(sinAplicar(pagos[0])).toBe(700);
  });
});

describe("capacidadDocumento", () => {
  it("descuenta la nota crédito que señala a la factura", () => {
    expect(capacidadDocumento({ neto: 1_000_000 }, [{ neto: -300_000 }])).toBe(700_000);
  });

  it("una factura anulada por completo no admite abonos", () => {
    expect(capacidadDocumento({ neto: 7_456_000 }, [{ neto: -7_456_000 }])).toBe(0);
  });

  it("sin notas crédito la capacidad es el neto", () => {
    expect(capacidadDocumento({ neto: 1_933_900 })).toBe(1_933_900);
  });
});

describe("imputarTodos", () => {
  it("no mezcla los abonos de un cliente con las facturas de otro", () => {
    const porCliente = new Map([
      ["c1", { pagos: [pago("p1", "2026-01-01", 1000)], destinos: [doc("f1", "2026-01-01", 400)] }],
      ["c2", { pagos: [pago("p2", "2026-01-01", 100)], destinos: [doc("f2", "2026-01-01", 900)] }],
    ]);
    const { pagos, pendientes } = imputarTodos(porCliente);
    const porId = Object.fromEntries(pagos.map((p) => [p.id, p.aplicaciones]));
    expect(porId.p1).toEqual([{ tipo: "documento", id: "f1", valor: 400 }]);
    expect(porId.p2).toEqual([{ tipo: "documento", id: "f2", valor: 100 }]);
    expect(pendientes.get("c2")[0].resta).toBe(800);
  });
});

describe("resumirImputacion", () => {
  it("cuenta lo repartido, lo sobrante y los abonos que cubrieron varias facturas", () => {
    const { pagos } = imputarCliente(
      [pago("p1", "2026-01-01", 1000)],
      [doc("f1", "2026-01-01", 400), doc("f2", "2026-02-01", 300)]
    );
    expect(resumirImputacion(pagos)).toEqual({
      pagos: 1,
      repartido: 700,
      sobrante: 300,
      conVariasFacturas: 1,
    });
  });
});
