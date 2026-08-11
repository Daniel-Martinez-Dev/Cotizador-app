import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import FichaImpresionPuertaRapida from "./FichaImpresionPuertaRapida.jsx";

// El plano se dibuja con SVG calculado, así que un error de rótulo o un color
// que vuelva a quedar claro no se nota hasta que alguien imprime la ficha en
// planta. Estas pruebas fijan lo que tiene que verse.
const FICHA = {
  cliente: "ACME", cantidad: 1, anchoVano: 3500, altoVano: 3250,
  colorLona: "AZUL", ladoMotor: "IZQUIERDO",
  medidas: {
    altoCubrerrollo: 280, altoTotalPuerta: 3530, anchoTotalPuerta: 3940,
    distanciaCortavientos: 1000, cubreRollo: 3710, tuboEstructura: 3630,
  },
  empaque: [
    { insumo: "Motor", unidad: "und", cantidad: 1 },
    { insumo: "Guía lateral", unidad: "und", cantidad: 2 },
    { insumo: "Cuadro de control", unidad: "und", cantidad: 1 },
  ],
};

const html = renderToStaticMarkup(
  <FichaImpresionPuertaRapida ficha={FICHA} numero={7} onClose={() => {}} />
);

describe("plano de la puerta rápida", () => {
  it("rotula la caja superior como altura portarrollo", () => {
    expect(html).toContain("ALTURA PORTARROLLO: 280 mm");
    expect(html).not.toContain("CUBRERROLLO:");
  });

  it("saca arriba la cota de ancho portarrollo con la medida real de la ficha", () => {
    // cubreRollo (3710), no el ancho dibujado (vano + guías) ni anchoTotalPuerta
    // (3940), que suma la guarda del motor y se fabrica aparte.
    expect(html).toContain("ANCHO PORTARROLLO / GUARDA INOX: 3710 mm");
    expect(html).not.toContain("GUARDA INOX: 3940");
  });

  it("no deja texto ni cotas en gris claro", () => {
    expect(html.match(/fill="#(64748b|475569|94a3b8|334155|1e293b|333|555)"/g)).toBeNull();
  });
});

describe("medidas de fabricación", () => {
  it("usa la nomenclatura de planta", () => {
    for (const rotulo of [
      "Porta rollo / guarda inox",
      "Añadido guarda inox",
      "Alto base porta rollo",
      "Ancho total puerta",
      "Alto total puerta",
    ]) {
      expect(html).toContain(rotulo);
    }
  });

  it("no lista el tubo de estructura", () => {
    // Se sigue calculando (lo usan otras medidas), pero no va en el formato.
    expect(html).not.toContain("Tubo estructura");
  });
});

describe("visor", () => {
  // El vinilo transparente viene en rollo de 600 mm de alto y se instala
  // completo: el alto del visor es fijo y no sigue a la banda de cortavientos.
  const render = (distanciaCortavientos) =>
    renderToStaticMarkup(
      <FichaImpresionPuertaRapida
        ficha={{ ...FICHA, medidas: { ...FICHA.medidas, distanciaCortavientos } }}
        numero={7}
        onClose={() => {}}
      />
    );

  it("rotula siempre 600 mm de alto, cambie o no la distancia entre cortavientos", () => {
    for (const dist of [500, 750, 1000, 1500]) {
      expect(render(dist)).toContain("alto 600 mm (fijo)");
    }
  });

  it("dibuja la franja con el alto de 600 mm a escala, no con el de la banda", () => {
    // altoVano 3250 con cortavientos cada 1000 → bandas de ~1083 mm: si el
    // visor siguiera la banda, su alto dibujado sería ~1.8× el correcto.
    const svg = render(1000);
    const vano = Number(svg.match(/ALTO VANO: (\d+) mm/)[1]);
    const alturas = [...svg.matchAll(/height="([\d.]+)" fill="url\(#visorGradPR\)"/g)];
    expect(alturas).toHaveLength(1);
    const vanoH = Number(svg.match(/<rect x="[\d.]+" y="[\d.]+" width="[\d.]+" height="([\d.]+)" fill="url\(#lonaGradPR\)"/)[1]);
    expect(Number(alturas[0][1]) / vanoH).toBeCloseTo(600 / vano, 3);
  });
});

describe("lista de empaque", () => {
  it("da una casilla por ítem para marcar mientras se empaca", () => {
    const listaEmpaque = html.slice(html.indexOf("Lista de Empaque"));
    const casillas = listaEmpaque.match(/border:1\.5px solid #000000/g) || [];
    expect(casillas).toHaveLength(FICHA.empaque.length);
  });
});
