import { describe, it, expect } from "vitest";
import { tamanoEnHoja, HOJA_CARTA_MM } from "./hojaImpresion";

// Si esta cuenta se pasa aunque sea un milímetro, la ficha se parte en dos
// hojas: es justo lo que pasaba cuando el papel re-maquetaba el HTML.
const cabe = ({ anchoMm, altoMm }) =>
  anchoMm <= HOJA_CARTA_MM.ancho + 1e-9 && altoMm <= HOJA_CARTA_MM.alto + 1e-9;

describe("ajuste de la ficha a la hoja", () => {
  it("la ficha de abrigo la limita el alto, no el ancho", () => {
    // 1220 × ~1015 px de diseño (rasterizados a 3×) son más "cuadrados" que la
    // carta horizontal: por eso bajar el alto de la ficha es lo que la agranda
    // en el papel, y ensancharla no sirve de nada.
    const t = tamanoEnHoja({ width: 3660, height: 3045 });
    expect(t.altoMm).toBeCloseTo(HOJA_CARTA_MM.alto, 6);
    expect(t.anchoMm).toBeLessThan(HOJA_CARTA_MM.ancho);
    expect(cabe(t)).toBe(true);
  });

  it("una ficha bien apaisada sí la limita el ancho", () => {
    const t = tamanoEnHoja({ width: 3660, height: 2000 });
    expect(t.anchoMm).toBeCloseTo(HOJA_CARTA_MM.ancho, 6);
    expect(cabe(t)).toBe(true);
  });

  it("nunca se sale de la hoja, sea cual sea la proporción", () => {
    for (const [width, height] of [[1220, 400], [1220, 1015], [1220, 1600], [1220, 4000], [500, 500]]) {
      expect(cabe(tamanoEnHoja({ width, height }))).toBe(true);
    }
  });

  it("conserva la proporción de la ficha", () => {
    const { anchoMm, altoMm } = tamanoEnHoja({ width: 3660, height: 3045 });
    expect(anchoMm / altoMm).toBeCloseTo(3660 / 3045, 6);
  });

  it("se adapta a otra hoja (A4 horizontal, por ejemplo)", () => {
    const a4 = { ancho: 297 - 10, alto: 210 - 10 };
    const t = tamanoEnHoja({ width: 3660, height: 3045 }, a4);
    expect(t.altoMm).toBeCloseTo(a4.alto, 6);
    expect(t.anchoMm).toBeLessThanOrEqual(a4.ancho);
  });

  it("no se cae con una imagen sin medidas", () => {
    expect(cabe(tamanoEnHoja({ width: 0, height: 0 }))).toBe(true);
  });
});
