import { describe, it, expect } from "vitest";
import { conPrefillOrden } from "./prefillOrden";

const INICIAL = {
  numeroOrdenCompra: "",
  cliente: "",
  clienteId: null,
  clienteAlias: "",
  usarAlias: false,
  cantidad: 1,
  fechaOrden: "2026-09-04",
  anchoVano: "",
};

describe("ficha nueva dentro de un pedido", () => {
  it("hereda la orden de compra y el cliente del pedido", () => {
    const form = conPrefillOrden(INICIAL, {
      numeroOrdenCompra: "4500123456",
      cliente: "Rojas Hermanos",
      clienteId: "emp1",
      clienteAlias: "ROJAS",
      usarAlias: true,
      fechaOrden: "2026-08-30",
    });
    expect(form.numeroOrdenCompra).toBe("4500123456");
    expect(form.cliente).toBe("Rojas Hermanos");
    expect(form.clienteId).toBe("emp1");
    expect(form.usarAlias).toBe(true);
    expect(form.fechaOrden).toBe("2026-08-30");
  });

  it("no inventa campos que el formulario de ese producto no tiene", () => {
    // La puerta rápida no maneja fecha de entrega en su formulario.
    const form = conPrefillOrden(INICIAL, { fechaEntrega: "2026-09-20" });
    expect("fechaEntrega" in form).toBe(false);
  });

  it("deja el valor de fábrica donde el pedido no aporta nada", () => {
    const form = conPrefillOrden(INICIAL, { cliente: "", clienteId: null });
    expect(form).toEqual(INICIAL);
  });

  it("sin pedido detrás devuelve el formulario en blanco, tal cual", () => {
    expect(conPrefillOrden(INICIAL, null)).toBe(INICIAL);
  });

  it("no toca el formulario en blanco: se reusa en cada ficha nueva", () => {
    conPrefillOrden(INICIAL, { numeroOrdenCompra: "OC-1", cliente: "Rojas Hermanos" });
    expect(INICIAL.numeroOrdenCompra).toBe("");
    expect(INICIAL.cliente).toBe("");
  });
});
