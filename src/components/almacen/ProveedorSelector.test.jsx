import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import ProveedorSelector from "./ProveedorSelector.jsx";

// Prueba de humo: que el selector se pinte como un campo de texto con lista
// propia y no como el <select> nativo que traía. En la tablet Android ese
// desplegable se dibuja fuera del modal y no deja escribir para filtrar.

const PROVEEDORES = [
  { id: "p1", razonSocial: "Aceros del Norte S.A.S.", nit: "900123456" },
  { id: "p2", nombre: "Lonas Andinas", nit: "800999111" },
];

const pintar = (props) =>
  renderToStaticMarkup(<ProveedorSelector proveedores={PROVEEDORES} {...props} />);

describe("ProveedorSelector", () => {
  it("es un combobox de texto, no un <select> nativo", () => {
    const html = pintar({ value: "" });
    expect(html).toContain('role="combobox"');
    expect(html).not.toContain("<select");
  });

  it("sin proveedor elegido invita a escribir", () => {
    expect(pintar({ value: "" })).toContain("Escribe para buscar el proveedor");
  });

  it("muestra el proveedor elegido y su NIT", () => {
    const html = pintar({ value: "p1" });
    expect(html).toContain("Aceros del Norte S.A.S.");
    expect(html).toContain("900123456");
  });

  it("acepta al proveedor guardado con `nombre` en vez de `razonSocial`", () => {
    expect(pintar({ value: "p2" })).toContain("Lonas Andinas");
  });

  it("avisa cuando todavía no hay proveedores cargados", () => {
    const html = renderToStaticMarkup(<ProveedorSelector proveedores={[]} value="" />);
    expect(html).toContain("Todavía no hay proveedores");
  });
});
