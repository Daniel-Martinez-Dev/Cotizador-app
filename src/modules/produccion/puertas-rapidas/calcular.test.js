import { describe, it, expect } from "vitest";
import { calcularPuertaRapida, calcularFechaEntrega, CASOS_PRUEBA_PUERTA_RAPIDA } from "./calcular.js";

const [CASO_ANDACO] = CASOS_PRUEBA_PUERTA_RAPIDA;

describe("calcularPuertaRapida — ficha real OP001234 (ANDACO, ancho=3500 alto=3050 mm, cantidad=1)", () => {
  const result = calcularPuertaRapida(CASO_ANDACO);

  it("no devuelve null con input válido", () => {
    expect(result).not.toBeNull();
  });

  it("devuelve null sin ancho/alto", () => {
    expect(calcularPuertaRapida({ cliente: "X" })).toBeNull();
    expect(calcularPuertaRapida({ anchoVano: 0, altoVano: 3000 })).toBeNull();
  });

  describe("medidas (mm)", () => {
    it("vinilo = 3630", () =>
      expect(result.medidas.vinilo).toBe(CASO_ANDACO.vinilo));

    it("largoCortina = 3650", () =>
      expect(result.medidas.largoCortina).toBe(CASO_ANDACO.largoCortina));

    it("cubreRollo = 3710", () =>
      expect(result.medidas.cubreRollo).toBe(CASO_ANDACO.cubreRollo));

    it("alturaParales = 3250", () =>
      expect(result.medidas.alturaParales).toBe(CASO_ANDACO.alturaParales));

    it("ejeZocalo (eje/zócalo/caucho/cortavientos y lona) = 3610", () =>
      expect(result.medidas.ejeZocalo).toBe(CASO_ANDACO.ejeZocalo));

    it("tuboEstructura = 3630", () =>
      expect(result.medidas.tuboEstructura).toBe(CASO_ANDACO.tuboEstructura));

    it("anchoTotalPuerta = 3940", () =>
      expect(result.medidas.anchoTotalPuerta).toBe(CASO_ANDACO.anchoTotalPuerta));

    it("altoTotalPuerta = 3530", () =>
      expect(result.medidas.altoTotalPuerta).toBe(CASO_ANDACO.altoTotalPuerta));

    it("altoCubrerrollo = 280 (base PEQUEÑA)", () =>
      expect(result.medidas.altoCubrerrollo).toBe(CASO_ANDACO.altoCubrerrollo));

    it("m2Cortina ≈ 13,18", () =>
      expect(Number(result.medidas.m2Cortina.toFixed(2))).toBe(CASO_ANDACO.m2Cortina));

    it("base = PEQUEÑA (altoVano < 3500)", () =>
      expect(result.medidas.base).toBe(CASO_ANDACO.base));

    it("ejeMotor = PEQUEÑO", () =>
      expect(result.medidas.ejeMotor).toBe(CASO_ANDACO.ejeMotor));

    it("motorKw = 0,75Kw (m2Cortina <= 16)", () =>
      expect(result.medidas.motorKw).toBe(CASO_ANDACO.motorKw));

    it("anadidoCubreRollo = 662 (cubreRollo > 3050)", () =>
      expect(result.medidas.anadidoCubreRollo).toBe(CASO_ANDACO.anadidoCubreRollo));

    it("anadidoPorParal = 210 (alturaParales >= 3100)", () =>
      expect(result.medidas.anadidoPorParal).toBe(CASO_ANDACO.anadidoPorParal));

    it("cantidadCortavientos = 5", () =>
      expect(result.medidas.cantidadCortavientos).toBe(CASO_ANDACO.cantidadCortavientos));
  });

  describe("lista de empaque por puerta", () => {
    const porInsumo = Object.fromEntries(result.empaque.map((e) => [e.insumo, e]));

    it("PARALES = 2 und (fijo)", () => expect(porInsumo["PARALES"].cantidad).toBe(2));
    it("ESTRUCTURA LONA = cantidad (escala con el número de puertas, no fijo)", () =>
      expect(porInsumo["ESTRUCTURA LONA"].cantidad).toBe(1));
    it("CORTINA OPTICA = cantidad", () => expect(porInsumo["CORTINA OPTICA"].cantidad).toBe(1));
    it("TUBO GALVANIZADO = alturaParales - 1000 = 2250", () =>
      expect(porInsumo["TUBO GALVANIZADO"].cantidad).toBe(2250));
    it("CABLE 2 HILOS NEGRO Y BLANCO = alturaParales = 3250", () =>
      expect(porInsumo["CABLE 2 HILOS NEGRO Y BLANCO"].cantidad).toBe(3250));
    it("CANALETA PLASTICA = 2×(alturaParales-2000) = 2500", () =>
      expect(porInsumo["CANALETA PLASTICA"].cantidad).toBe(2500));
    it("CORAZA + TERMINALES 1/2\" Y 1\" está en la lista", () =>
      expect(porInsumo["CORAZA + TERMINALES 1/2\" Y 1\""]).toBeDefined());
    it("LOOP MAGNETICO está en la lista", () =>
      expect(porInsumo["LOOP MAGNETICO"]).toBeDefined());
    it("TRANSFORMADOR / UPS trae las 5 opciones de validación", () =>
      expect(porInsumo["TRANSFORMADOR / UPS"].opciones).toEqual(
        ["1KVA + CAJA", "2KVA + CAJA", "3KVA + CAJA", "UPS", "NO"]
      ));
  });
});

describe("calcularFechaEntrega", () => {
  it("suma cantidad × 4 días hábiles (31/07/2026 viernes + 4 → 06/08/2026 jueves)", () => {
    expect(calcularFechaEntrega("2026-07-31", 1)).toBe("2026-08-06");
  });

  it("escala con la cantidad (3 puertas → 12 días hábiles)", () => {
    expect(calcularFechaEntrega("2026-07-30", 3)).toBe("2026-08-17");
  });

  it("devuelve cadena vacía sin fecha de orden", () => {
    expect(calcularFechaEntrega("", 1)).toBe("");
  });
});
