import { describe, it, expect } from "vitest";
import {
  fechaLarga,
  textoVigenciaDesdeISO,
  resolverVigencia,
  fraseOfertaValida,
  reemplazarVigenciaEnHTML,
  isoHoyMasDias,
} from "./vigencia";

describe("fechaLarga", () => {
  it("formatea la fecha sin correrse por zona horaria", () => {
    expect(fechaLarga("2026-06-30")).toBe("30 de junio del 2026");
    expect(fechaLarga("2026-01-01")).toBe("1 de enero del 2026");
  });

  it("devuelve cadena vacía con entradas inválidas", () => {
    expect(fechaLarga("")).toBe("");
    expect(fechaLarga("30/06/2026")).toBe("");
    expect(fechaLarga("2026-13-01")).toBe("");
  });
});

describe("resolverVigencia", () => {
  it("prioriza el texto libre y le quita el punto final", () => {
    expect(resolverVigencia({ vigencia: "30 días calendario.", vigenciaFecha: "2026-06-30" }))
      .toBe("30 días calendario");
  });

  it("usa la fecha guardada cuando no hay texto libre", () => {
    expect(resolverVigencia({ vigenciaFecha: "2026-09-15" })).toBe("Hasta el 15 de septiembre del 2026");
  });

  it("cae en hoy + 30 días cuando la cotización no trae vigencia", () => {
    expect(resolverVigencia({})).toBe(textoVigenciaDesdeISO(isoHoyMasDias(30)));
  });
});

describe("fraseOfertaValida", () => {
  it("encadena la frase cuando el texto empieza por 'Hasta'", () => {
    expect(fraseOfertaValida("Hasta el 30 de junio del 2026"))
      .toBe("Oferta válida hasta el 30 de junio del 2026.");
  });

  it("usa dos puntos con textos libres", () => {
    expect(fraseOfertaValida("30 días calendario")).toBe("Oferta válida: 30 días calendario.");
  });
});

describe("reemplazarVigenciaEnHTML", () => {
  it("reescribe solo la línea de vigencia", () => {
    const html = "<p><strong>Forma de pago:</strong> 50%.</p><p><strong>Vigencia de la oferta:</strong> Hasta el 30 de junio del 2026.</p>";
    expect(reemplazarVigenciaEnHTML(html, "Hasta el 15 de septiembre del 2026")).toBe(
      "<p><strong>Forma de pago:</strong> 50%.</p><p><strong>Vigencia de la oferta:</strong> Hasta el 15 de septiembre del 2026.</p>"
    );
  });

  it("deja intacto un bloque sin línea de vigencia", () => {
    const html = "<p><strong>Garantía:</strong> 12 meses.</p>";
    expect(reemplazarVigenciaEnHTML(html, "Hasta el 15 de septiembre del 2026")).toBe(html);
  });
});
