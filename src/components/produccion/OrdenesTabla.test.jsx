import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import OrdenesTabla from "./OrdenesTabla";
import { agruparPorOrdenCompra } from "./ordenesAgrupar";

const HOY = "2026-08-28";

const ETIQUETA = { sello: "Sello de Andén", general: "Ficha Básica" };

let contador = 0;
const orden = (extra = {}) => {
  const tipo = extra.tipo || "sello";
  return {
    id: `f${++contador}`,
    tipo,
    tipoLabel: ETIQUETA[tipo] || tipo,
    cliente: "Rojas Hermanos",
    numeroOrdenCompra: "4500123456",
    cantidad: 6,
    estado: "en_produccion",
    ordenProduccion: 100,
    fechaEntrega: "2026-09-10",
    ...extra,
  };
};

const pintar = (ordenes) => renderToStaticMarkup(
  <OrdenesTabla
    ordenes={agruparPorOrdenCompra(ordenes)}
    hoy={HOY}
    onAbrir={() => {}}
    onCambiarEstado={() => {}}
    onVerFicha={() => {}}
  />
);

describe("tabla de órdenes", () => {
  it("resume el pedido en una fila y esconde sus fichas hasta desplegarlo", () => {
    const html = pintar([orden({ tipo: "sello" }), orden({ tipo: "general" })]);
    expect(html).toContain("2 fichas");
    expect(html).toContain("4500123456");
    // Las unidades del pedido completo, no las de una ficha.
    expect(html).toContain(">12<");
    // Cerrada la fila, las fichas del pedido no ocupan renglón todavía: los
    // iconos de producto adelantan de qué es, pero no hay filas de ficha.
    expect(html).not.toContain("Ver ficha");
    expect(html).toContain("Ver pedido");
  });

  it("mantiene la fila normal de la ficha que va sola", () => {
    const html = pintar([orden({ numeroOrdenCompra: "", cliente: "Alpina" })]);
    expect(html).toContain("Alpina");
    expect(html).toContain("Sello de Andén");
    expect(html).toContain("Ver ficha");
    expect(html).not.toContain("Ver pedido");
  });
});
