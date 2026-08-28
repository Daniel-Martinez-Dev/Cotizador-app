import { describe, it, expect } from "vitest";
import { PRODUCTOS, productoDe, tabDeTipo } from "./productosFicha";
import { FICHA_TIPOS } from "../../utils/firebaseFichas";
import { TABS } from "../../pages/ProduccionPage";

describe("productos de producción", () => {
  it("describe los seis tipos que existen, sin inventarse ninguno", () => {
    expect(PRODUCTOS.map((p) => p.tipo).sort()).toEqual(Object.keys(FICHA_TIPOS).sort());
  });

  it("da a cada producto ícono, etiqueta y pestaña", () => {
    PRODUCTOS.forEach((p) => {
      expect(p.icon, `${p.tipo} sin ícono`).toBeTruthy();
      expect(p.label, `${p.tipo} sin etiqueta`).toBeTruthy();
      expect(p.tab, `${p.tipo} sin pestaña`).toBeTruthy();
    });
  });

  it("apunta a pestañas que ProduccionPage realmente tiene", () => {
    // El tipo de ficha y la clave de pestaña no siempre coinciden — las fichas
    // básicas se guardan como "general" pero su pestaña se llama "fichas" — y
    // si esto se desalinea, "Nueva ficha" lleva a una pestaña que no existe y
    // la pantalla se queda en blanco.
    const claves = TABS.map((t) => t.key);
    PRODUCTOS.forEach((p) => {
      expect(claves, `la pestaña ${p.tab} de ${p.tipo} no existe`).toContain(p.tab);
    });
  });

  it("manda las fichas básicas a la pestaña «fichas»", () => {
    expect(tabDeTipo("general")).toBe("fichas");
    expect(tabDeTipo("division")).toBe("division");
  });

  it("no revienta con un tipo que no conoce", () => {
    expect(productoDe("inventado")).toBeNull();
    expect(tabDeTipo("inventado")).toBe("ordenes");
  });
});
