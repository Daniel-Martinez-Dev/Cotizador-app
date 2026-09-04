import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import OrdenesTablero from "./OrdenesTablero";

const HOY = "2026-08-28";

const orden = (extra) => ({
  id: extra.id || "x",
  tipo: "division",
  tipoLabel: "División Térmica",
  cliente: "Alpina",
  cantidad: 1,
  estado: "en_produccion",
  ordenProduccion: 100,
  anchoVehiculo: 2600,
  altoVehiculo: 2800,
  ...extra,
});

const pintar = (ordenes) => renderToStaticMarkup(
  <OrdenesTablero
    ordenes={ordenes}
    hoy={HOY}
    onAbrir={() => {}}
    onCambiarEstado={() => {}}
    onVerFicha={() => {}}
  />
);

describe("tablero de órdenes", () => {
  it("dibuja las cuatro columnas aunque la planta esté vacía", () => {
    const html = pintar([]);
    ["Borrador", "En producción", "Terminada", "Entregada"].forEach((label) => {
      expect(html, `falta la columna ${label}`).toContain(label);
    });
    // Una columna que desaparece esconde que no hay nada en ese estado.
    expect(html.match(/Nada aquí/g)).toHaveLength(4);
  });

  it("pone cada orden en la columna de su estado", () => {
    const html = pintar([
      orden({ id: "a", estado: "borrador", cliente: "Alpina" }),
      orden({ id: "b", estado: "terminado", cliente: "Nutresa" }),
    ]);
    expect(html.match(/Nada aquí/g)).toHaveLength(2);
    expect(html).toContain("Alpina");
    expect(html).toContain("Nutresa");
  });

  it("avisa de la entrega vencida y no de la que aún tiene plazo", () => {
    expect(pintar([orden({ fechaEntrega: "2026-08-20" })])).toContain("Vencida");
    expect(pintar([orden({ fechaEntrega: HOY })])).toContain("Entrega hoy");
    expect(pintar([orden({ fechaEntrega: "2026-12-01" })])).not.toContain("Vencida");
  });

  it("no alerta sobre lo que ya salió, aunque la fecha haya pasado", () => {
    const html = pintar([orden({ estado: "entregado", fechaEntrega: "2026-01-01" })]);
    expect(html).not.toContain("Vencida");
  });

  it("muestra las medidas del producto para distinguir dos órdenes del mismo cliente", () => {
    expect(pintar([orden({})])).toContain("2600×2800");
  });

  it("encierra el nombre largo en vez de estirar la columna", () => {
    // Una columna de rejilla hereda min-width:auto, así que su ancho mínimo lo
    // fija el texto que no puede partirse — y `truncate` pone white-space:nowrap.
    // Sin min-w-0 en toda la cadena, un cliente de nombre largo ensancha la
    // tarjeta y se sale de su columna.
    const html = pintar([orden({ cliente: "Comercializadora Internacional de Alimentos Refrigerados del Caribe" })]);
    const tarjeta = html.slice(html.indexOf("<article"), html.indexOf("</article>"));
    expect(tarjeta).toContain("min-w-0");
    expect(tarjeta).toContain("overflow-hidden");
    expect(tarjeta).toContain("truncate");
  });

  it("no deja la cabecera de columna pegada al borde del navegador", () => {
    // El contenedor que hace scroll es la página, no la columna: con `sticky`
    // la cabecera se despegaba de su tarjeta y se iba bajo la barra de la app.
    expect(pintar([orden({})])).not.toContain("sticky");
  });

  it("etiqueta la tarjeta con la orden de compra del cliente", () => {
    expect(pintar([orden({ numeroOrdenCompra: "4500123456" })])).toContain("OC 4500123456");
    expect(pintar([orden({})])).not.toContain("OC ");
  });

  it("aguanta una ficha sin cliente y sin medidas", () => {
    const html = pintar([orden({ cliente: "", anchoVehiculo: undefined, altoVehiculo: undefined })]);
    expect(html).toContain("Sin cliente");
  });
});

describe("detalle de la ficha en la tarjeta", () => {
  // Dos órdenes del mismo cliente con la misma medida solo se distinguen por
  // aquí; por eso el detalle va resaltado y no escondido en el detalle.
  it("resalta el detalle cuando la ficha lo lleva", () => {
    const html = pintar([orden({ nombreFicha: "Muelle 7" })]);
    expect(html).toContain("Muelle 7");
  });

  it("no deja hueco en la tarjeta de la ficha que no lo lleva", () => {
    const html = pintar([orden({ nombreFicha: "" })]);
    expect(html).toContain("Alpina");
    expect(html).not.toContain("bg-gray-900 dark:bg-white");
  });
});
