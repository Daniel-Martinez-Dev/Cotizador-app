import { describe, it, expect } from "vitest";
import {
  calcularPuertaSeccional,
  calcularFechaEntrega,
  tamborSugerido,
  CASOS_PRUEBA_PUERTA_SECCIONAL,
} from "./calcular.js";

const [CASO_MHT] = CASOS_PRUEBA_PUERTA_SECCIONAL;

describe("calcularPuertaSeccional — ficha real OP001248 (MHT, ancho=2350 alto=2450 mm, CURVA, cantidad=1)", () => {
  const result = calcularPuertaSeccional(CASO_MHT);

  it("no devuelve null con input válido", () => {
    expect(result).not.toBeNull();
  });

  it("devuelve null sin ancho/alto", () => {
    expect(calcularPuertaSeccional({ cliente: "X" })).toBeNull();
    expect(calcularPuertaSeccional({ anchoVano: 0, altoVano: 2450 })).toBeNull();
  });

  describe("medidas (mm)", () => {
    it("anchoPanel (panel, zócalo y caucho) = 2400", () =>
      expect(result.medidas.anchoPanel).toBe(CASO_MHT.anchoPanel));

    it("cantidadPaneles = 5 (techo de 2450/500)", () =>
      expect(result.medidas.cantidadPaneles).toBe(CASO_MHT.cantidadPaneles));

    it("centroVentana 3.er panel = 1175 (anchoVano/2)", () =>
      expect(result.medidas.centroVentana).toBe(CASO_MHT.centroVentana));

    it("m2Panel = 12,00 (paneles × ancho de panel)", () =>
      expect(result.medidas.m2Panel).toBe(CASO_MHT.m2Panel));

    it("ejeSuperior = 2950", () =>
      expect(result.medidas.ejeSuperior).toBe(CASO_MHT.ejeSuperior));

    it("vueltasResorte = 7 (techo de 2450/390)", () =>
      expect(result.medidas.vueltasResorte).toBe(CASO_MHT.vueltasResorte));

    it("guiasVerticales = 2450 (alto del vano)", () =>
      expect(result.medidas.guiasVerticales).toBe(CASO_MHT.guiasVerticales));

    it("guiasHorizontales = 2150 (alto del vano − 300)", () =>
      expect(result.medidas.guiasHorizontales).toBe(CASO_MHT.guiasHorizontales));

    it("medidaGuaya = 3450 (CURVA: alto del vano + 1000)", () =>
      expect(result.medidas.medidaGuaya).toBe(CASO_MHT.medidaGuaya));

    it("tambor = 12 CIL", () =>
      expect(result.medidas.tambor).toBe(CASO_MHT.tambor));
  });

  describe("listado de empaque", () => {
    const porInsumo = Object.fromEntries(result.empaque.map((e) => [e.insumo, e]));

    it("trae todas las cantidades de la ficha de referencia, sin ítems de más ni de menos", () => {
      const cantidades = Object.fromEntries(result.empaque.map((e) => [e.insumo, e.cantidad]));
      expect(cantidades).toEqual(CASO_MHT.empaque);
    });

    it("las 4 piezas de caucho del control de despacho salen abiertas por largo", () => {
      const caucho = result.empaque.filter((e) => e.insumo.startsWith("CAUCHO"));
      expect(caucho.reduce((t, e) => t + e.cantidad, 0)).toBe(4);
      expect(caucho.map((e) => e.detalle)).toEqual(["largo 2450 mm", "largo 2400 mm", "largo 2400 mm"]);
    });

    it("EJE = 1, con el largo del eje superior", () => {
      expect(porInsumo["EJE"].detalle).toBe("largo 2950 mm");
    });

    it("GUAYAS = 2, con la medida de guaya", () =>
      expect(porInsumo["GUAYAS"].detalle).toBe("largo 3450 mm"));

    it("TAMBORES lleva el tipo de tambor", () =>
      expect(porInsumo["TAMBORES"].detalle).toBe("tipo 12 CIL"));

    it("los rieles van del alto del vano, rectos y curvos", () => {
      expect(porInsumo["RIELES RECTOS"].detalle).toBe("largo 2450 mm");
      expect(porInsumo["RIELES CURVOS"].detalle).toBe("largo 2450 mm");
    });
  });
});

describe("variantes de tipo y tamaño", () => {
  const base = { anchoVano: 2350, altoVano: 2450, cantidad: 1, resortes: 1 };

  const cantidadDe = (input, insumo) =>
    calcularPuertaSeccional(input).empaque.find((e) => e.insumo === insumo).cantidad;

  it("VERTICAL: la guaya sale al doble del alto del vano", () => {
    const { medidas } = calcularPuertaSeccional({ ...base, tipo: "VERTICAL" });
    expect(medidas.recorrido).toBe(4900);
    expect(medidas.medidaGuaya).toBe(5900);
  });

  it("VERTICAL: 4 rieles rectos del alto del vano — dos empatados por lado", () => {
    const { empaque } = calcularPuertaSeccional({ ...base, tipo: "VERTICAL" });
    const rectos = empaque.find((e) => e.insumo === "RIELES RECTOS");
    expect(rectos.cantidad).toBe(4);
    expect(rectos.detalle).toBe("largo 2450 mm");
  });

  it("VERTICAL: no lleva rieles curvos", () => {
    const { empaque } = calcularPuertaSeccional({ ...base, tipo: "VERTICAL" });
    expect(empaque.find((e) => e.insumo === "RIELES CURVOS").texto).toBe("NO LLEVA");
  });

  it("vano ancho (> 3 m) duplica las bisagras centrales", () => {
    expect(cantidadDe({ ...base, anchoVano: 3000 }, "BISAGRAS CENTRALES")).toBe(4);
    expect(cantidadDe({ ...base, anchoVano: 3100 }, "BISAGRAS CENTRALES")).toBe(8);
  });

  it("sin motor no se empaca motor ni caja de control", () => {
    expect(cantidadDe({ ...base, tipo: "CURVA", motor: "NO" }, "MOTOR Y CAJA DE CONTROL")).toBe(0);
  });

  it("2 resortes suben chumaceras y cuñas a 4", () => {
    expect(cantidadDe({ ...base, resortes: 2 }, "CHUMACERA PORTA EJE")).toBe(4);
    expect(cantidadDe({ ...base, resortes: 2 }, "CUÑAS")).toBe(4);
  });

  it("las cantidades escalan con el número de puertas", () => {
    expect(cantidadDe({ ...base, cantidad: 3 }, "PANELES")).toBe(15);
    expect(cantidadDe({ ...base, cantidad: 3 }, "CHUMACERA PORTA EJE")).toBe(9);
    expect(cantidadDe({ ...base, cantidad: 3 }, "BISAGRAS LATERALES")).toBe(24);
  });
});

describe("tamborSugerido", () => {
  it("CURVA: 12 CIL hasta 3,5 m y 18 CONO hasta 5,3 m", () => {
    expect(tamborSugerido("CURVA", 2450)).toBe("12 CIL");
    expect(tamborSugerido("CURVA", 3500)).toBe("12 CIL");
    expect(tamborSugerido("CURVA", 3501)).toBe("18 CONO");
    expect(tamborSugerido("CURVA", 5300)).toBe("18 CONO");
  });

  it("VERTICAL: 11 CONO hasta 3,2 m y 18 CONO hasta 5,3 m", () => {
    expect(tamborSugerido("VERTICAL", 3200)).toBe("11 CONO");
    expect(tamborSugerido("VERTICAL", 3201)).toBe("18 CONO");
    expect(tamborSugerido("VERTICAL", 5300)).toBe("18 CONO");
  });

  it("por encima de 5,3 m no hay tambor de catálogo: lo define ingeniería", () => {
    expect(tamborSugerido("CURVA", 5301)).toBe("REVISAR TAMBOR");
    expect(tamborSugerido("VERTICAL", 5301)).toBe("REVISAR TAMBOR");
  });

  it("el tambor digitado en la ficha manda sobre el sugerido", () =>
    expect(calcularPuertaSeccional({
      anchoVano: 2350, altoVano: 2450, tipo: "CURVA", tambor: "18 CONO",
    }).medidas.tambor).toBe("18 CONO"));
});

describe("calcularFechaEntrega", () => {
  it("suma cantidad × 4 días hábiles (14/08/2026 viernes + 4 → 20/08/2026 jueves)", () => {
    expect(calcularFechaEntrega("2026-08-14", 1)).toBe("2026-08-20");
  });

  it("escala con la cantidad (2 puertas → 8 días hábiles)", () => {
    expect(calcularFechaEntrega("2026-08-14", 2)).toBe("2026-08-26");
  });

  it("devuelve cadena vacía sin fecha de orden", () => {
    expect(calcularFechaEntrega("", 1)).toBe("");
  });
});
