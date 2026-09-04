import { describe, it, expect } from "vitest";
import {
  agruparMiles,
  cifrasTrasCursor,
  cursorTrasCifras,
  formatearDinero,
  limpiarDinero,
  numeroDeDinero,
  textoDeDinero,
} from "./dineroTexto";

describe("dinero mientras se teclea", () => {
  it("pone los puntos de miles a medida que se escribe", () => {
    expect(formatearDinero("1750000")).toBe("1.750.000");
    expect(formatearDinero("840336")).toBe("840.336");
    expect(formatearDinero("12")).toBe("12");
  });

  it("el punto que teclea el usuario es separador de miles, no decimal", () => {
    // Las dos formas se usan y tienen que dar la misma cifra.
    expect(numeroDeDinero("1.750.000")).toBe(1750000);
    expect(numeroDeDinero("1750000")).toBe(1750000);
  });

  it("la coma sí separa decimales, y solo admite dos", () => {
    expect(formatearDinero("1234567,891")).toBe("1.234.567,89");
    expect(numeroDeDinero("1234,5")).toBe(1234.5);
  });

  it("una cifra pegada del Excel o de otra pantalla se limpia sola", () => {
    expect(numeroDeDinero("$ 1.750.000")).toBe(1750000);
    expect(limpiarDinero("$ 1.750.000")).toBe("1750000");
  });

  // Los campos de valor unitario nacen en 0: al escribir encima, ese cero se
  // quedaba pegado delante y "0123" se agrupaba como "0.123".
  it("no arrastra el cero con el que nace el campo", () => {
    expect(formatearDinero("0123456")).toBe("123.456");
    expect(numeroDeDinero("0123456")).toBe(123456);
    // Pero un 0 que es toda la cifra sí es una cifra.
    expect(formatearDinero("0")).toBe("0");
    expect(formatearDinero("0,5")).toBe("0,5");
  });

  it("el campo vacío se queda vacío y no se vuelve cero", () => {
    expect(numeroDeDinero("")).toBe("");
    expect(numeroDeDinero("-")).toBe("");
    expect(textoDeDinero("")).toBe("");
    expect(textoDeDinero(null)).toBe("");
  });

  it("el número guardado se vuelve a leer con separadores", () => {
    expect(textoDeDinero(1750000)).toBe("1.750.000");
    expect(textoDeDinero(1234.5)).toBe("1.234,5");
    expect(textoDeDinero(0)).toBe("0");
  });

  it("conserva el signo de una cifra negativa", () => {
    expect(agruparMiles("-1234567")).toBe("-1.234.567");
    expect(numeroDeDinero("-1.234")).toBe(-1234);
  });

  // El cursor se repone contando cifras desde el final: la posición absoluta
  // se corre una casilla cada vez que el formato inserta un punto de miles, y
  // sin esto el campo terminaba escribiendo al revés.
  it("cuenta las cifras que quedan a la derecha del cursor", () => {
    expect(cifrasTrasCursor("1.750.000", 9)).toBe(0);
    expect(cifrasTrasCursor("1.750.000", 5)).toBe(3);
  });

  it("recoloca el cursor dejando esas mismas cifras a la derecha", () => {
    expect(cursorTrasCifras("17.500.000", 0)).toBe(10);
    // Tres cifras a la derecha: justo delante del último grupo.
    expect(cursorTrasCifras("17.500.000", 3)).toBe(7);
  });
});
