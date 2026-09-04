import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import OrdenCompraPanel from "./OrdenCompraPanel";
import { agruparPorOrdenCompra } from "./ordenesAgrupar";

const ETIQUETA = { sello: "Sello de Andén", general: "Ficha Básica" };

let contador = 0;
const ficha = (extra = {}) => {
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
    anchoVano: 2600,
    altoVano: 2800,
    ...extra,
  };
};

const pintar = (fichas, props = {}) => {
  const [grupo] = agruparPorOrdenCompra(fichas);
  return renderToStaticMarkup(
    <OrdenCompraPanel
      grupo={grupo}
      onCerrar={() => {}}
      onAbrirFicha={() => {}}
      onVerFicha={() => {}}
      onCambiarEstado={() => {}}
      onAplicarLote={() => {}}
      {...props}
    />
  );
};

describe("pedido abierto", () => {
  it("muestra todas las fichas de la orden de compra", () => {
    const html = pintar([ficha({ tipo: "sello" }), ficha({ tipo: "general" })]);
    expect(html).toContain("4500123456");
    expect(html).toContain("Rojas Hermanos");
    expect(html).toContain("2 fichas");
    expect(html).toContain("Sello de Andén");
    expect(html).toContain("Ficha Básica");
    expect(html).toContain("2600×2800");
    // Cada ficha entra a su propia impresión desde aquí.
    expect(html.match(/Ver ficha/g)).toHaveLength(2);
  });

  it("cierra el pedido completo con un solo formulario", () => {
    const html = pintar([ficha(), ficha({ tipo: "general" })]);
    expect(html).toContain("Firmar y terminar (2)");
    expect(html).toContain("Firmar y entregar (2)");
  });

  it("no ofrece cerrar lo que ya salió: eso se corrige ficha por ficha", () => {
    const html = pintar([
      ficha({ estado: "entregado" }),
      ficha({ tipo: "general", estado: "entregado" }),
    ]);
    expect(html).not.toContain("Firmar y entregar");
    expect(html).toContain("Pedido entregado");
  });

  it("sin pedido abierto no pinta nada", () => {
    expect(renderToStaticMarkup(<OrdenCompraPanel grupo={null} onCerrar={() => {}} />)).toBe("");
  });
});
