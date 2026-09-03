import { describe, it, expect } from "vitest";
import { valorNumerico, numeroODefecto, conDefectosNumericos } from "./campoNumero";

// El caso que motiva todo esto: `Number("")` es 0, así que el patrón
// `onChange={e => set(campo, Number(e.target.value))}` hacía reaparecer un 0
// en cuanto se borraba el campo para reescribirlo.
describe("valorNumerico", () => {
  it("un campo borrado se queda vacío, no en 0", () => {
    expect(valorNumerico("")).toBe("");
    expect(Number("")).toBe(0); // el comportamiento que se está evitando
  });

  it("lo escrito llega como número", () => {
    expect(valorNumerico("250")).toBe(250);
    expect(valorNumerico("2.5")).toBe(2.5);
  });

  it("un 0 escrito a propósito sí es 0", () => {
    expect(valorNumerico("0")).toBe(0);
  });

  it("lo que no es número se trata como campo vacío", () => {
    expect(valorNumerico("abc")).toBe("");
    expect(valorNumerico(null)).toBe("");
    expect(valorNumerico(undefined)).toBe("");
  });
});

describe("numeroODefecto", () => {
  it("el campo en blanco vale su defecto", () => {
    expect(numeroODefecto("", 250)).toBe(250);
    expect(numeroODefecto(null, 1)).toBe(1);
  });

  it("un 0 escrito no se reemplaza por el defecto", () => {
    expect(numeroODefecto(0, 250)).toBe(0);
  });

  it("sin defecto declarado, el blanco vale 0", () => {
    expect(numeroODefecto("")).toBe(0);
  });
});

describe("conDefectosNumericos", () => {
  it("rellena solo los campos numéricos en blanco", () => {
    const form = { cliente: "ACME", cantidad: "", espesorSello: 300, anchoVano: "" };
    expect(conDefectosNumericos(form, { cantidad: 1, espesorSello: 250 })).toEqual({
      cliente: "ACME",
      cantidad: 1,
      espesorSello: 300,
      // No está en la tabla de defectos: se deja como estaba.
      anchoVano: "",
    });
  });
});
