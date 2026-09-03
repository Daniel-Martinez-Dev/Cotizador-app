import { describe, it, expect } from "vitest";
import {
  TOLERANCIA_SALDO,
  aISO,
  calcularDocumento,
  diasEntre,
  diasMora,
  estaSaldado,
  estadoDocumento,
  fechaVencimiento,
  netoConSigno,
  netoDocumento,
  redondear,
  resumenDocumento,
  saldoDocumento,
  subtotalDocumento,
  sumarDias,
  totalPagos,
  valorIva,
  valorRetencion,
} from "./calculos";
import { RETENCIONES_POR_DEFECTO } from "./catalogos";

const factura = (extra = {}) => ({
  tipo: "factura",
  numero: "1001",
  fecha: "2026-03-10",
  plazoDias: 30,
  items: [{ producto: "Puerta Rápida", cantidad: 2, valorUnitario: 5_000_000 }],
  ivaPorcentaje: 19,
  retenciones: [],
  ...extra,
});

describe("redondear", () => {
  it("deja dos decimales", () => {
    expect(redondear(1234.5678)).toBe(1234.57);
  });

  it("no devuelve -0 (se vería como '$ -0' en la tabla)", () => {
    expect(Object.is(redondear(-0.001), 0)).toBe(true);
  });

  it("convierte texto y cae a 0 con lo que no es número", () => {
    expect(redondear("1500")).toBe(1500);
    expect(redondear("$ 6 ")).toBe(0);
  });
});

describe("subtotal", () => {
  it("suma cantidad x valor unitario de cada item", () => {
    expect(subtotalDocumento([
      { cantidad: 2, valorUnitario: 100 },
      { cantidad: 3, valorUnitario: 50 },
    ])).toBe(350);
  });

  it("acepta cantidades con decimales (metros de lona)", () => {
    expect(subtotalDocumento([{ cantidad: 16.2, valorUnitario: 38_000 }])).toBe(615_600);
  });

  it("no se cae con la lista vacía ni con lo que no es arreglo", () => {
    expect(subtotalDocumento([])).toBe(0);
    expect(subtotalDocumento(undefined)).toBe(0);
  });
});

describe("retenciones", () => {
  const bases = { subtotal: 10_000_000, iva: 1_900_000 };

  it("calcula la retefuente sobre el subtotal", () => {
    expect(valorRetencion({ base: "subtotal", porcentaje: 2.5 }, bases)).toBe(250_000);
  });

  it("calcula la reteIVA sobre el IVA, no sobre el subtotal", () => {
    expect(valorRetencion({ base: "iva", porcentaje: 15 }, bases)).toBe(285_000);
  });

  it("respeta el valor digitado de una retención manual (ICA de Madrid)", () => {
    expect(valorRetencion({ base: "manual", valor: 96_600, porcentaje: 0 }, bases)).toBe(96_600);
  });

  it("siempre devuelve un valor positivo: el signo lo pone la fórmula del neto", () => {
    expect(valorRetencion({ base: "manual", valor: -96_600 }, bases)).toBe(96_600);
  });
});

describe("calcularDocumento", () => {
  it("aplica NETO = subtotal - retenciones + IVA", () => {
    const r = calcularDocumento(factura({
      retenciones: [
        { codigo: "rte_fte_25", base: "subtotal", porcentaje: 2.5 },
        { codigo: "rte_iva_15", base: "iva", porcentaje: 15 },
      ],
    }));
    expect(r.subtotal).toBe(10_000_000);
    expect(r.iva).toBe(1_900_000);
    expect(r.totalRetenciones).toBe(250_000 + 285_000);
    expect(r.neto).toBe(10_000_000 - 535_000 + 1_900_000);
  });

  it("usa 19 % cuando no se indica el IVA, y respeta el 0 de un exento", () => {
    expect(calcularDocumento({ items: [{ cantidad: 1, valorUnitario: 1000 }] }).iva).toBe(190);
    expect(calcularDocumento({ items: [{ cantidad: 1, valorUnitario: 1000 }], ivaPorcentaje: 0 }).iva).toBe(0);
  });

  it("las tarifas salen del catálogo, no de la fórmula", () => {
    const conIva19 = valorIva(1000, 19);
    const conIva5 = valorIva(1000, 5);
    expect(conIva19).toBe(190);
    expect(conIva5).toBe(50);
    expect(RETENCIONES_POR_DEFECTO.find((r) => r.codigo === "rte_fte_25").porcentaje).toBe(2.5);
  });
});

describe("fechas", () => {
  it("no corre la fecha un día por el huso horario", () => {
    expect(aISO(new Date(2026, 2, 10, 12))).toBe("2026-03-10");
    expect(sumarDias("2026-03-10", 30)).toBe("2026-04-09");
  });

  it("cuenta los días en el sentido correcto (el Excel los restaba al revés)", () => {
    expect(diasEntre("2026-03-10", "2026-04-09")).toBe(30);
    expect(diasEntre("2026-04-09", "2026-03-10")).toBe(-30);
  });

  it("deriva el vencimiento del plazo cuando no viene guardado", () => {
    expect(fechaVencimiento({ fecha: "2026-03-10", plazoDias: 45 })).toBe("2026-04-24");
    expect(fechaVencimiento({ fecha: "2026-03-10" })).toBe("2026-04-09");
  });

  it("prefiere la fecha de vencimiento guardada (plazo negociado)", () => {
    expect(fechaVencimiento({ fecha: "2026-03-10", plazoDias: 30, fechaVencimiento: "2026-06-30" })).toBe("2026-06-30");
  });

  it("la mora es positiva y solo después del vencimiento", () => {
    const f = { fecha: "2026-03-10", plazoDias: 30 };
    expect(diasMora(f, "2026-05-09")).toBe(30);
    expect(diasMora(f, "2026-03-15")).toBe(0);
  });

  it("una factura sin fecha no aparece como la más vencida de todas", () => {
    expect(diasMora({ fecha: "" }, "2026-05-09")).toBe(0);
  });
});

describe("saldo y estado", () => {
  it("acepta más de tres pagos: el Excel solo tenía ANTICIPO 1/2/3", () => {
    const pagos = [{ valor: 1000 }, { valor: 1000 }, { valor: 1000 }, { valor: 1000 }, { valor: 1000 }];
    expect(totalPagos(pagos)).toBe(5000);
  });

  it("da por pagada una factura con residuo de centavos", () => {
    const f = factura({ neto: 11_900_000 });
    const pagos = [{ valor: 11_899_999.5 }];
    expect(saldoDocumento(f, pagos)).toBe(0.5);
    expect(estaSaldado(saldoDocumento(f, pagos))).toBe(true);
    expect(estadoDocumento(f, pagos)).toBe("pagada");
  });

  it("también da por saldado un sobrepago dentro de la tolerancia", () => {
    const f = factura({ neto: 100_000 });
    expect(estadoDocumento(f, [{ valor: 100_000.75 }])).toBe("pagada");
    expect(TOLERANCIA_SALDO).toBe(1);
  });

  it("distingue pendiente de abonada", () => {
    const f = factura({ neto: 1_000_000 });
    expect(estadoDocumento(f, [])).toBe("pendiente");
    expect(estadoDocumento(f, [{ valor: 400_000 }])).toBe("abonada");
    expect(estadoDocumento(f, [{ valor: 1_000_000 }])).toBe("pagada");
  });

  it("una nota crédito aplicada baja el saldo de la factura", () => {
    const f = factura({ neto: 1_000_000 });
    const nc = { tipo: "nota_credito", neto: 300_000, docAfectadoId: "f1" };
    expect(saldoDocumento(f, [{ valor: 200_000 }], [nc])).toBe(500_000);
  });

  it("una factura anulada no deja saldo ni mora", () => {
    const f = factura({ neto: 1_000_000, anulado: true, fecha: "2020-01-01" });
    expect(saldoDocumento(f, [])).toBe(0);
    expect(estadoDocumento(f, [])).toBe("anulada");
    expect(resumenDocumento(f, [], [], "2026-09-01").diasMora).toBe(0);
  });
});

describe("netoConSigno", () => {
  it("la nota crédito resta en la cartera del cliente", () => {
    expect(netoConSigno({ tipo: "factura", neto: 500 })).toBe(500);
    expect(netoConSigno({ tipo: "nota_credito", neto: 500 })).toBe(-500);
  });

  it("un documento anulado no suma ni resta", () => {
    expect(netoConSigno({ tipo: "factura", neto: 500, anulado: true })).toBe(0);
  });
});

describe("resumenDocumento", () => {
  it("reúne liquidación, abonos, saldo, estado y mora de una pasada", () => {
    const f = factura({ fecha: "2026-01-10", plazoDias: 30, neto: 11_900_000 });
    const r = resumenDocumento(f, [{ valor: 5_000_000 }], [], "2026-03-11");
    expect(r).toMatchObject({
      neto: 11_900_000,
      abonado: 5_000_000,
      saldo: 6_900_000,
      estado: "abonada",
      vencimiento: "2026-02-09",
      diasMora: 30,
      vencida: true,
    });
  });

  it("prefiere el neto guardado sobre el recalculado (facturas importadas)", () => {
    expect(netoDocumento(factura({ neto: 7 }))).toBe(7);
    expect(netoDocumento(factura())).toBe(11_900_000);
  });
});
