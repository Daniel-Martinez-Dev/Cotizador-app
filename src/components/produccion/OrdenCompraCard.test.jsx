import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import OrdenesTablero from "./OrdenesTablero";
import { agruparPorOrdenCompra } from "./ordenesAgrupar";

const HOY = "2026-08-28";

const ETIQUETA = {
  sello: "Sello de Andén",
  puertaseccional: "Puertas Seccionales",
  general: "Ficha Básica",
};

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
    anchoVano: 2600,
    altoVano: 2800,
    ...extra,
  };
};

// El tablero es quien decide si pinta una tarjeta de pedido o una de ficha, así
// que se prueba de punta a punta: se le pasa lo mismo que le pasa la pantalla.
const pintar = (ordenes) => renderToStaticMarkup(
  <OrdenesTablero
    ordenes={agruparPorOrdenCompra(ordenes)}
    hoy={HOY}
    onAbrir={() => {}}
    onCambiarEstado={() => {}}
    onVerFicha={() => {}}
  />
);

const PEDIDO = [
  orden({ tipo: "sello" }),
  orden({ tipo: "puertaseccional" }),
  orden({ tipo: "general" }),
];

describe("tarjeta de orden de compra en el tablero", () => {
  it("resume el pedido entero en una sola tarjeta", () => {
    const html = pintar(PEDIDO);
    expect(html).toContain("OC 4500123456");
    expect(html).toContain("Rojas Hermanos");
    expect(html).toContain("3 fichas");
    expect(html).toContain("18 unidades");
    // Y las tres líneas de producto, para saber de qué es el pedido sin abrirlo.
    ["Sello de Andén", "Puertas Seccionales", "Ficha Básica"].forEach((label) => {
      expect(html, `falta ${label}`).toContain(label);
    });
  });

  it("deja el pedido en la columna de su ficha más atrasada", () => {
    const html = pintar([
      orden({ tipo: "sello", estado: "terminado" }),
      orden({ tipo: "general", estado: "terminado" }),
      orden({ tipo: "puertaseccional", estado: "en_produccion" }),
    ]);
    // Tres columnas vacías: el pedido está entero en una sola, la de la más
    // atrasada. Si se hubiera partido, habría dos columnas ocupadas.
    expect(html.match(/Nada aquí/g)).toHaveLength(3);
    expect(html).toContain("2 Terminada");
    expect(html).toContain("1 Producción");
  });

  it("hereda la peor alerta de sus fichas", () => {
    const html = pintar([
      orden({ tipo: "sello", fechaEntrega: "2026-12-01" }),
      orden({ tipo: "general", fechaEntrega: "2026-08-01" }),
    ]);
    expect(html).toContain("Vencida");
  });

  it("sigue pintando la ficha suelta como siempre", () => {
    const html = pintar([orden({ numeroOrdenCompra: "", cliente: "Alpina" })]);
    expect(html).toContain("Alpina");
    expect(html).toContain("2600×2800");
    expect(html).not.toContain("fichas");
  });

  it("no agrupa dos clientes distintos que numeran igual su orden de compra", () => {
    const html = pintar([
      orden({ cliente: "Rojas Hermanos", numeroOrdenCompra: "001" }),
      orden({ cliente: "Alpina", numeroOrdenCompra: "001" }),
    ]);
    expect(html).not.toContain("2 fichas");
    expect(html).toContain("Rojas Hermanos");
    expect(html).toContain("Alpina");
  });
});

describe("detalle de las líneas del pedido", () => {
  it("titula en la tarjeta de qué van las fichas del pedido", () => {
    const html = pintar([
      orden({ tipo: "sello", nombreFicha: "Muelle 5" }),
      orden({ tipo: "sello", nombreFicha: "Muelle 6" }),
    ]);
    expect(html).toContain("Muelle 5 · Muelle 6");
  });

  it("solo nombra las líneas que llevan detalle", () => {
    const html = pintar([
      orden({ tipo: "sello", nombreFicha: "Muelle 5" }),
      orden({ tipo: "general" }),
    ]);
    expect(html).toContain('title="Muelle 5"');
    expect(html).toContain("2 fichas");
  });
});
