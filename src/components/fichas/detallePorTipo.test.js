import { describe, it, expect } from "vitest";
import { getDetalleComponent, resumenCorto } from "./detallePorTipo";
import { FICHA_TIPOS } from "../../utils/firebaseFichas";

describe("detalle por tipo", () => {
  it("cubre los seis tipos de ficha que existen", () => {
    // Si alguien agrega una línea de producto y olvida el detalle, la fila
    // expandida del listado de órdenes se quedaría vacía sin avisar.
    Object.keys(FICHA_TIPOS).forEach((tipo) => {
      expect(getDetalleComponent(tipo), `sin detalle para ${tipo}`).toBeTruthy();
    });
  });

  it("no revienta con un tipo desconocido", () => {
    expect(getDetalleComponent("inventado")).toBeNull();
    expect(resumenCorto(null)).toBe("");
    expect(resumenCorto({ tipo: "inventado" })).toBe("");
  });

  it("resume cada producto con el campo de medidas que ese producto usa", () => {
    expect(resumenCorto({ tipo: "division", anchoVehiculo: 2600, altoVehiculo: 2800 })).toBe("2600×2800");
    expect(resumenCorto({ tipo: "sello", anchoVano: 3000, altoVano: 3500 })).toBe("3000×3500");
    expect(resumenCorto({ tipo: "abrigoretractil", ancho: 3200, alto: 3600 })).toBe("3200×3600");
    expect(resumenCorto({ tipo: "puertarapida", anchoVano: 3500, altoVano: 3250 })).toBe("3500×3250");
    expect(resumenCorto({ tipo: "general", items: [{}, {}] })).toBe("2 ítem(s)");
  });

  it("calla cuando la ficha no tiene medidas todavía", () => {
    expect(resumenCorto({ tipo: "division" })).toBe("");
    expect(resumenCorto({ tipo: "general", items: [] })).toBe("");
  });
});
