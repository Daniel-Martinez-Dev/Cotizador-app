import { describe, it, expect } from "vitest";
import { medidasFicha, medidasFichaTexto, coincideMedida } from "./medidasFicha";

describe("medidasFicha", () => {
  it("lee el vano en sellos y puertas", () => {
    expect(medidasFicha({ tipo: "sello", anchoVano: 2400, altoVano: 3100 }))
      .toEqual({ ancho: 2400, alto: 3100, label: "Vano" });
    expect(medidasFicha({ tipo: "puertarapida", anchoVano: 3000, altoVano: 3500 }).label).toBe("Vano");
    expect(medidasFicha({ tipo: "puertaseccional", anchoVano: 3000, altoVano: 3500 }).ancho).toBe(3000);
  });

  it("lee el vehículo en división térmica y el ancho/alto en abrigo", () => {
    expect(medidasFicha({ tipo: "division", anchoVehiculo: 2300, altoVehiculo: 2600 }))
      .toEqual({ ancho: 2300, alto: 2600, label: "Vehículo" });
    expect(medidasFicha({ tipo: "abrigoretractil", ancho: 3400, alto: 3400 }))
      .toEqual({ ancho: 3400, alto: 3400, label: "Abrigo" });
  });

  it("la ficha básica no tiene medidas", () => {
    expect(medidasFicha({ tipo: "general", cantidad: 4 })).toBeNull();
  });

  it("devuelve null cuando falta una de las dos medidas o no son válidas", () => {
    expect(medidasFicha({ tipo: "sello", anchoVano: 2400 })).toBeNull();
    expect(medidasFicha({ tipo: "sello", anchoVano: 2400, altoVano: 0 })).toBeNull();
    expect(medidasFicha({ tipo: "sello", anchoVano: "abc", altoVano: 3100 })).toBeNull();
    expect(medidasFicha(null)).toBeNull();
  });

  it("acepta medidas guardadas como texto", () => {
    expect(medidasFicha({ tipo: "sello", anchoVano: "2400", altoVano: "3100" }).ancho).toBe(2400);
  });

  it("sin `tipo` cae al primer par de campos que exista", () => {
    expect(medidasFicha({ anchoVano: 2400, altoVano: 3100 }).ancho).toBe(2400);
    expect(medidasFicha({ anchoVehiculo: 2300, altoVehiculo: 2600 }).label).toBe("Vehículo");
    expect(medidasFicha({ ancho: 1000, alto: 2000 })).toEqual({ ancho: 1000, alto: 2000, label: "" });
    expect(medidasFicha({ cliente: "ACME" })).toBeNull();
  });

  it("formatea el texto y redondea", () => {
    expect(medidasFichaTexto({ tipo: "sello", anchoVano: 2400.4, altoVano: 3100.6 })).toBe("2400 × 3101");
    expect(medidasFichaTexto({ tipo: "sello", anchoVano: 2400, altoVano: 3100 }, { conUnidad: true }))
      .toBe("2400 × 3100 mm");
    expect(medidasFichaTexto({ tipo: "general" })).toBe("");
  });

  it("busca por medida sin importar espacios ni el signo usado", () => {
    const ficha = { tipo: "sello", anchoVano: 2400, altoVano: 3100 };
    expect(coincideMedida(ficha, "2400x3100")).toBe(true);
    expect(coincideMedida(ficha, "2400 × 3100")).toBe(true);
    expect(coincideMedida(ficha, "2400 X 3100")).toBe(true);
    expect(coincideMedida(ficha, "3100")).toBe(true);
    expect(coincideMedida(ficha, "240")).toBe(true);
    expect(coincideMedida(ficha, "9999")).toBe(false);
    expect(coincideMedida(ficha, "")).toBe(false);
    expect(coincideMedida({ tipo: "general" }, "2400")).toBe(false);
  });
});
