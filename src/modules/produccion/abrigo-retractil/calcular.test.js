import { describe, it, expect } from "vitest";
import { calcularAbrigoRetractil } from "./calcular.js";

const INPUT_ACL = {
  cliente:     "ACL OC 770",
  cantidad:    10,
  ancho:       3400,
  alto:        3400,
  travesanos:  910,
  color:       "NEGRO",
  acabado:     "PINTADO",
  llevaBanda:  true,
  fechaOrden:  "2026-07-19",
};

describe("calcularAbrigoRetractil — ficha real OP001222 (ACL OC 770, ancho=alto=3400, cantidad=10)", () => {
  const result = calcularAbrigoRetractil(INPUT_ACL);

  it("no devuelve null con input válido", () => {
    expect(result).not.toBeNull();
  });

  describe("medidas (mm)", () => {
    it("loneaPerimetro = 10240", () =>
      expect(result.medidas.loneaPerimetro).toBe(10240));

    it("bandaLateralLargo = 3320", () =>
      expect(result.medidas.bandaLateralLargo).toBe(3320));

    it("bandaLateralAncho = 600", () =>
      expect(result.medidas.bandaLateralAncho).toBe(600));

    it("bandaSuperiorLargo = 3400", () =>
      expect(result.medidas.bandaSuperiorLargo).toBe(3400));

    it("bandaSuperiorAncho = 1000", () =>
      expect(result.medidas.bandaSuperiorAncho).toBe(1000));

    it("largueroLargo = 3200 (alto - 200)", () =>
      expect(result.medidas.largueroLargo).toBe(3200));

    it("largueroCantidad = 4", () =>
      expect(result.medidas.largueroCantidad).toBe(4));

    it("travesanoLargo = 910 (= input travesanos)", () =>
      expect(result.medidas.travesanoLargo).toBe(910));

    it("travesanoCantidad = 4", () =>
      expect(result.medidas.travesanoCantidad).toBe(4));

    it("casitasLargo = 3400 (= ancho)", () =>
      expect(result.medidas.casitasLargo).toBe(3400));

    it("casitasCantidad = 2", () =>
      expect(result.medidas.casitasCantidad).toBe(2));

    it("manguerasCantidad = 4", () =>
      expect(result.medidas.manguerasCantidad).toBe(4));
  });

  describe("ancho luz (vano libre) — ancho total menos 2×banda lateral", () => {
    it("con ancho=3200, alto=3400 (banda lateral=600) → anchoLuz = 2000", () => {
      const r = calcularAbrigoRetractil({ ...INPUT_ACL, ancho: 3200, alto: 3400 });
      expect(r.medidas.anchoLuz).toBe(2000); // 3200 - 2×600
    });

    it("anchoLuz del caso ACL (ancho=3400) = 2200", () =>
      expect(result.medidas.anchoLuz).toBe(2200)); // 3400 - 2×600
  });

  describe("materia prima por abrigo", () => {
    it("lonaPerimetral_m2 = 7.168", () =>
      expect(result.materiaPrimaPorAbrigo.lonaPerimetral_m2).toBeCloseTo(7.168, 3));

    it("bandaPVC_m2 = 7.384  (M² BANDA: 7,38 en la ficha real, es por abrigo)", () =>
      expect(result.materiaPrimaPorAbrigo.bandaPVC_m2).toBeCloseTo(7.384, 3));

    it("tuberiaMarco_und = 4", () =>
      expect(result.materiaPrimaPorAbrigo.tuberiaMarco_und).toBe(4));

    it("tuberiaTravesanos_m = 3.64", () =>
      expect(result.materiaPrimaPorAbrigo.tuberiaTravesanos_m).toBeCloseTo(3.64, 2));

    it("mangueras_und = 4", () =>
      expect(result.materiaPrimaPorAbrigo.mangueras_und).toBe(4));

    it("tuercasArandelas_und = 20.2  (20 base + 2 extra / 10 abrigos)", () =>
      expect(result.materiaPrimaPorAbrigo.tuercasArandelas_und).toBeCloseTo(20.2, 2));
  });

  describe("total pedido (cantidad = 10) — verificado contra la ficha real", () => {
    it("bandaPVC_m2 total = 73.84  (= 7.384 por abrigo × 10)", () =>
      expect(result.materiaPrimaTotal.bandaPVC_m2).toBeCloseTo(73.84, 2));

    it("tuberiaMarco_und total = 40", () =>
      expect(result.materiaPrimaTotal.tuberiaMarco_und).toBe(40));

    it("tuercasArandelas_und total = 202  (20×10 + 2)", () =>
      expect(result.materiaPrimaTotal.tuercasArandelas_und).toBe(202));
  });

  describe("control de despacho", () => {
    it("pesoTotalKg = 901 kg  (PESO TOTAL en la ficha real)", () =>
      expect(result.despacho.pesoTotalKg).toBeCloseTo(901, 1));

    it("5 items en la tabla de despacho", () =>
      expect(result.despacho.items).toHaveLength(5));

    it('"Paquete Largueros" usa largueroLargo (3200), no travesanoLargo', () => {
      const item = result.despacho.items.find((i) => i.descripcion === "Paquete Largueros");
      expect(item.medidas).toContain("3200");
    });
  });

  describe("validaciones de input inválido", () => {
    it("devuelve null si ancho = 0", () =>
      expect(calcularAbrigoRetractil({ ...INPUT_ACL, ancho: 0 })).toBeNull());

    it("devuelve null si alto = 0", () =>
      expect(calcularAbrigoRetractil({ ...INPUT_ACL, alto: 0 })).toBeNull());

    it("devuelve null si descuentoLarguero >= alto", () =>
      expect(
        calcularAbrigoRetractil({ ...INPUT_ACL, alto: 150 })
      ).toBeNull());
  });

  describe("llevaBanda = false", () => {
    it("bandaPVC_m2 = 0 cuando no lleva banda", () => {
      const r = calcularAbrigoRetractil({ ...INPUT_ACL, llevaBanda: false });
      expect(r.materiaPrimaPorAbrigo.bandaPVC_m2).toBe(0);
    });
  });
});
