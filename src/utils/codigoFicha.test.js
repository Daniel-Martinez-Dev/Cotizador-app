import { describe, it, expect } from "vitest";
import { formatearCodigoFicha, codigoFicha, codigoFichaOFallback } from "./codigoFicha";

describe("formatearCodigoFicha", () => {
  it("arma el código con prefijo, ddmmaa y consecutivo de 3 dígitos", () => {
    expect(formatearCodigoFicha({ tipo: "abrigoretractil", fecha: new Date(2026, 7, 10), consecutivo: 1 }))
      .toBe("AR100826001");
  });

  it("usa el prefijo de cada línea de producto", () => {
    const fecha = new Date(2026, 7, 10);
    expect(formatearCodigoFicha({ tipo: "sello",        fecha, consecutivo: 2 })).toBe("SA100826002");
    expect(formatearCodigoFicha({ tipo: "division",     fecha, consecutivo: 3 })).toBe("DT100826003");
    expect(formatearCodigoFicha({ tipo: "puertarapida", fecha, consecutivo: 4 })).toBe("PR100826004");
    expect(formatearCodigoFicha({ tipo: "puertaseccional", fecha, consecutivo: 5 })).toBe("PS100826005");
    expect(formatearCodigoFicha({ tipo: "general",      fecha, consecutivo: 6 })).toBe("OG100826006");
  });

  it("no recorta el consecutivo cuando pasa de 999", () => {
    expect(formatearCodigoFicha({ tipo: "sello", fecha: new Date(2026, 0, 5), consecutivo: 1234 }))
      .toBe("SA0501261234");
  });

  it("interpreta un string 'YYYY-MM-DD' como fecha local, sin correrse un día", () => {
    expect(formatearCodigoFicha({ tipo: "division", fecha: "2026-08-10", consecutivo: 7 }))
      .toBe("DT100826007");
  });

  it("acepta un Timestamp de Firestore", () => {
    const ts = { toDate: () => new Date(2026, 11, 31) };
    expect(formatearCodigoFicha({ tipo: "puertarapida", fecha: ts, consecutivo: 58 }))
      .toBe("PR311226058");
  });

  it("devuelve vacío si falta el tipo, la fecha o el consecutivo", () => {
    expect(formatearCodigoFicha({ tipo: "otro", fecha: new Date(), consecutivo: 1 })).toBe("");
    expect(formatearCodigoFicha({ tipo: "sello", fecha: null, consecutivo: 1 })).toBe("");
    expect(formatearCodigoFicha({ tipo: "sello", fecha: new Date(), consecutivo: 0 })).toBe("");
  });
});

describe("codigoFicha", () => {
  it("usa el código guardado en la ficha", () => {
    expect(codigoFicha({ codigoFicha: "AR100826001", ordenProduccion: 1 }, "abrigoretractil"))
      .toBe("AR100826001");
  });

  it("lo reconstruye para fichas antiguas a partir de createdAt", () => {
    const ficha = { createdAt: { seconds: Math.floor(new Date(2026, 6, 3, 10, 0).getTime() / 1000) }, ordenProduccion: 42 };
    expect(codigoFicha(ficha, "sello")).toBe("SA030726042");
  });

  it("cae al consecutivo suelto cuando no hay con qué reconstruirlo", () => {
    expect(codigoFichaOFallback({ ordenProduccion: 9 }, "sello")).toBe("#9");
    expect(codigoFichaOFallback({}, "sello")).toBe("—");
  });
});
