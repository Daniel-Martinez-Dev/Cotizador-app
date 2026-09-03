import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import MovimientoModal from "./MovimientoModal.jsx";

// Prueba de humo del movimiento de materia prima desde el almacén. Cubre las
// dos cosas que se pidieron: que el proveedor se elija con el combobox del
// resto de la app —no con el <select> nativo, ilegible en la tablet— y que la
// entrada no exija factura, porque el stock inicial no la tiene.

const ITEM = { id: "i1", nombre: "Lona PVC 900 g", stockActual: 12, unidad: "m2" };

const pintar = (tipo) =>
  renderToStaticMarkup(<MovimientoModal item={ITEM} tipo={tipo} onClose={() => {}} />);

describe("MovimientoModal", () => {
  it("la entrada solo pide la cantidad: los datos de compra van plegados y marcados como opcionales", () => {
    const html = pintar("ingreso");
    expect(html).toContain("Cantidad");
    expect(html).toContain("Datos de compra");
    expect(html).toContain("(opcional)");
    // Plegado: los campos de la factura no se pintan hasta que se abra.
    expect(html).not.toContain("N.° de factura");
    expect(html).toContain('aria-expanded="false"');
  });

  it("no queda ningún <select> nativo en el formulario", () => {
    expect(pintar("ingreso")).not.toContain("<select");
  });

  it("la salida no pide proveedor ni factura, pero sí la orden de producción", () => {
    const html = pintar("salida");
    expect(html).toContain("Orden de producción");
    expect(html).not.toContain("Datos de compra");
  });

  it("muestra el stock actual con su unidad", () => {
    expect(pintar("ingreso")).toContain("12 m2");
  });
});
