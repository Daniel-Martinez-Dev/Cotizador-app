import { describe, it, expect } from "vitest";
import { calcularAbrigo } from "./calcular.js";

const INPUT_BIMBO = {
  cliente:    "BIMBO",
  cantidad:   1,
  ancho:      3500,
  alto:       3600,
  casas:      910,
  color:      "NEGRO",
  acabado:    "PINTADO",
  llevaBanda: true,
  fechaOrden: "2026-01-06",
};

describe("calcularAbrigo — caso BIMBO (ancho=3500, alto=3600, cantidad=1)", () => {
  const result = calcularAbrigo(INPUT_BIMBO);

  it("no devuelve null con input válido", () => {
    expect(result).not.toBeNull();
  });

  describe("medidas (mm)", () => {
    it("loneaPerimetro = 10740", () =>
      expect(result.medidas.loneaPerimetro).toBe(10740));

    it("bandaLateralLargo = 3520", () =>
      expect(result.medidas.bandaLateralLargo).toBe(3520));

    it("bandaLateralAncho = 800", () =>
      expect(result.medidas.bandaLateralAncho).toBe(800));

    it("bandaSuperiorLargo = 3500", () =>
      expect(result.medidas.bandaSuperiorLargo).toBe(3500));

    it("bandaSuperiorAncho = 1600", () =>
      expect(result.medidas.bandaSuperiorAncho).toBe(1600));

    it("travesanoLargo = 3400", () =>
      expect(result.medidas.travesanoLargo).toBe(3400));

    it("travesanoCantidad = 4", () =>
      expect(result.medidas.travesanoCantidad).toBe(4));

    it("casitasLargo = 910", () =>
      expect(result.medidas.casitasLargo).toBe(910));

    it("casitasCantidad = 2", () =>
      expect(result.medidas.casitasCantidad).toBe(2));

    it("manguerasCantidad = 4", () =>
      expect(result.medidas.manguerasCantidad).toBe(4));
  });

  describe("materia prima por abrigo", () => {
    it("lonaPerimetral_m2 = 7.518", () =>
      expect(result.materiaPrimaPorAbrigo.lonaPerimetral_m2).toBeCloseTo(7.518, 3));

    it("bandaPVC_m2 = 11.232", () =>
      expect(result.materiaPrimaPorAbrigo.bandaPVC_m2).toBeCloseTo(11.232, 3));

    it("tuberiaMarco_und = 4", () =>
      expect(result.materiaPrimaPorAbrigo.tuberiaMarco_und).toBe(4));

    it("tuberiaTravesanos_m = 3.64", () =>
      expect(result.materiaPrimaPorAbrigo.tuberiaTravesanos_m).toBeCloseTo(3.64, 2));

    it("mangueras_und = 4", () =>
      expect(result.materiaPrimaPorAbrigo.mangueras_und).toBe(4));

    it("uDoble5x5_und = 8", () =>
      expect(result.materiaPrimaPorAbrigo.uDoble5x5_und).toBe(8));

    it("refuerzosPlatina_und = 8", () =>
      expect(result.materiaPrimaPorAbrigo.refuerzosPlatina_und).toBe(8));

    it("tubosMedia_und = 8", () =>
      expect(result.materiaPrimaPorAbrigo.tubosMedia_und).toBe(8));

    it("tuercasArandelas_und = 22  (20 base + 2 extra / 1 abrigo)", () =>
      expect(result.materiaPrimaPorAbrigo.tuercasArandelas_und).toBe(22));
  });

  describe("total pedido (cantidad = 1)", () => {
    it("tuercasArandelas_und total = 22  (20×1 + 2)", () =>
      expect(result.materiaPrimaTotal.tuercasArandelas_und).toBe(22));

    it("lonaPerimetral_m2 total = por abrigo × 1", () =>
      expect(result.materiaPrimaTotal.lonaPerimetral_m2).toBeCloseTo(7.518, 3));
  });

  describe("control de despacho", () => {
    it("pesoTotalKg = 90.1 kg", () =>
      expect(result.despacho.pesoTotalKg).toBeCloseTo(90.1, 1));

    it("5 items en la tabla de despacho", () =>
      expect(result.despacho.items).toHaveLength(5));
  });

  describe("validaciones de input inválido", () => {
    it("devuelve null si ancho = 0", () =>
      expect(calcularAbrigo({ ...INPUT_BIMBO, ancho: 0 })).toBeNull());

    it("devuelve null si alto = 0", () =>
      expect(calcularAbrigo({ ...INPUT_BIMBO, alto: 0 })).toBeNull());

    it("devuelve null si descuentoTravesano >= alto", () =>
      expect(
        calcularAbrigo({ ...INPUT_BIMBO, alto: 150 })
      ).toBeNull());
  });

  describe("llevaBanda = false", () => {
    it("bandaPVC_m2 = 0 cuando no lleva banda", () => {
      const r = calcularAbrigo({ ...INPUT_BIMBO, llevaBanda: false });
      expect(r.materiaPrimaPorAbrigo.bandaPVC_m2).toBe(0);
    });
  });
});
