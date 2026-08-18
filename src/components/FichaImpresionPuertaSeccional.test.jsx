import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import FichaImpresionPuertaSeccional from "./FichaImpresionPuertaSeccional.jsx";
import { calcularPuertaSeccional, CASOS_PRUEBA_PUERTA_SECCIONAL } from "../modules/produccion/puertas-seccionales/calcular.js";

// El plano se dibuja con SVG calculado, así que un rótulo mal armado o un color
// que vuelva a quedar claro no se nota hasta que alguien imprime la ficha en
// planta. Estas pruebas fijan lo que tiene que verse.
const [CASO_MHT] = CASOS_PRUEBA_PUERTA_SECCIONAL;

const fichaDe = (extra = {}) => {
  const input = { ...CASO_MHT, ...extra };
  const { medidas, despacho, empaque } = calcularPuertaSeccional(input);
  return { ...input, medidas, despacho, empaque };
};

const render = (extra) =>
  renderToStaticMarkup(
    <FichaImpresionPuertaSeccional ficha={fichaDe(extra)} numero={9} onClose={() => {}} />
  );

const html = render();

// Devuelve la geometría del plano llevada a mm reales desde el piso.
function medir(svg, altoVano = CASO_MHT.altoVano) {
  const cortina = svg.match(/<rect x="[\d.]+" y="([\d.]+)" width="[\d.]+" height="([\d.]+)" fill="url\(#panelPS\)"/);
  const [dintelY, vanoH] = [Number(cortina[1]), Number(cortina[2])];
  const floorY = dintelY + vanoH;
  const aMm = (y) => Math.round(((floorY - y) * altoVano) / vanoH);
  const ventana = svg.match(/<rect x="[\d.]+" y="([\d.]+)" width="[\d.]+" height="([\d.]+)" fill="url\(#vidrioPS\)"/);
  return {
    ventanaPie:   ventana && aMm(Number(ventana[1]) + Number(ventana[2])),
    ventanaTope:  ventana && aMm(Number(ventana[1])),
  };
}

describe("plano de la puerta seccional", () => {
  it("saca arriba la cota del eje superior con la medida real de la ficha", () => {
    expect(html).toContain("EJE SUPERIOR: 2950 mm");
  });

  it("cota el vano por sus dos lados", () => {
    expect(html).toContain("ANCHO VANO: 2350 mm");
    expect(html).toContain("ALTO VANO / GUÍA VERTICAL: 2450 mm");
  });

  it("rotula los paneles reales, no una división pareja del vano", () => {
    // 2450 mm no es múltiplo de 500: van 5 paneles y el de arriba se recorta.
    expect(html).toContain("5 PANELES DE 500 mm");
  });

  it("dibuja las juntas cada 500 mm desde el piso, sin junta pegada al dintel", () => {
    const cortina = html.match(/<rect x="[\d.]+" y="([\d.]+)" width="[\d.]+" height="([\d.]+)" fill="url\(#panelPS\)"/);
    const [dintelY, vanoH] = [Number(cortina[1]), Number(cortina[2])];
    const escala = vanoH / CASO_MHT.altoVano;
    // 4 juntas para 5 paneles: 500, 1000, 1500 y 2000 mm sobre el piso.
    const juntas = [...html.matchAll(/<line x1="[\d.]+" y1="([\d.]+)" x2="[\d.]+" y2="\1" stroke="#000000" stroke-width="1\.1"/g)]
      .map((m) => Math.round((dintelY + vanoH - Number(m[1])) / escala));
    expect(juntas).toEqual([500, 1000, 1500, 2000]);
  });

  it("nombra el tipo de puerta en el título de la vista lateral", () => {
    expect(html).toContain("VISTA LATERAL — RECORRIDO CURVA");
    expect(render({ tipo: "VERTICAL" })).toContain("VISTA LATERAL — RECORRIDO VERTICAL");
  });

  it("no deja texto ni cotas en gris claro", () => {
    expect(html.match(/fill="#(64748b|475569|94a3b8|334155|1e293b|333|555)"/g)).toBeNull();
  });
});

describe("ventana", () => {
  it("va centrada en el 3.er panel contado desde el piso", () => {
    // El 3.er panel va de 1000 a 1500 mm sobre el piso: a la altura de la vista.
    const { ventanaPie, ventanaTope } = medir(html);
    expect(ventanaPie).toBeGreaterThanOrEqual(1000);
    expect(ventanaTope).toBeLessThanOrEqual(1500);
    expect((ventanaPie + ventanaTope) / 2).toBeCloseTo(1250, 0);
  });

  it("rotula el centro horizontal, que es lo que se marca al perforar el panel", () => {
    expect(html).toContain("CENTRO 1175 mm");
  });

  it("no dibuja ventana cuando la puerta no lleva", () => {
    const svg = render({ ventanas: 0 });
    expect(svg).not.toContain("url(#vidrioPS)");
    expect(medir(svg).ventanaPie).toBeNull();
  });
});

describe("vista lateral del recorrido", () => {
  it("la CURVA cota las guías horizontales y muestra el codo del riel", () => {
    expect(html).toContain("GUÍAS HORIZ.: 2150 mm");
    expect(html).toContain("RIEL CURVO");
  });

  it("la VERTICAL sube derecho al doble del alto del vano, sin riel curvo", () => {
    const svg = render({ tipo: "VERTICAL" });
    expect(svg).toContain("RECORRIDO: 4900 mm");
    expect(svg).not.toContain("RIEL CURVO");
  });
});

describe("listado de empaque y despacho", () => {
  // Es la única lista de la ficha: absorbió el bloque "Control de despacho" del
  // Excel, así que tiene que traer también las piezas que solo salían allí.
  it("no deja por fuera ninguna pieza del control de despacho", () => {
    const listado = html.slice(html.indexOf("Listado de Empaque"));
    for (const item of [
      "MOTOR Y CAJA DE CONTROL", "CHUMACERA PORTA EJE", "PANELES", "ANGULOS PERFORADOS",
      "RIELES RECTOS", "RIELES CURVOS", "TAMBORES", "RODAMIENTOS PEQUEÑOS",
      "RODAMIENTOS GRANDES", "SOPORTE SUPERIOR", "BISAGRAS LATERALES", "BISAGRAS CENTRALES",
      "RESORTE", "GUAYAS", "MENSULAS PARA CAIDAS", "CAUCHO LATERAL",
    ]) {
      expect(listado).toContain(item);
    }
  });

  it("da una casilla por ítem para marcar mientras se empaca", () => {
    const listado = html.slice(html.indexOf("Listado de Empaque"));
    const casillas = listado.match(/border:1\.5px solid #000000/g) || [];
    expect(casillas).toHaveLength(fichaDe().empaque.length);
  });

  it("muestra el largo de las piezas que se cortan a medida", () => {
    expect(html).toContain("largo 2950 mm"); // eje
    expect(html).toContain("largo 3450 mm"); // guaya
  });
});

describe("pendientes de la ficha", () => {
  it("avisa cuando el vano se sale del catálogo de tambores", () => {
    expect(render({ tipo: "VERTICAL", altoVano: 5400, tambor: "" })).toContain("REVISAR TAMBOR");
  });

  it("saca el calibre y el largo del resorte digitados en la ficha", () => {
    expect(render({ resorteCalibre: "5,5 mm", resorteLargo: "1200 mm" }))
      .toContain("1 · 5,5 mm · 1200 mm");
  });
});
