import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import FichaImpresionAbrigoRetractil from "./FichaImpresionAbrigoRetractil.jsx";
import { calcularAbrigoRetractil, CASOS_PRUEBA_ABRIGO_RETRACTIL } from "../modules/produccion/abrigo-retractil/calcular.js";

// La ficha se imprime en UNA hoja carta horizontal: si vuelve a crecer a lo
// alto, el visor la encoge para que quepa y en planta las medidas salen
// ilegibles. Estas pruebas fijan lo que hace que quepa —las tarjetas en una
// sola fila, la tabla de insumos partida en dos— y lo que quedó fuera (los kg).
const [CASO] = CASOS_PRUEBA_ABRIGO_RETRACTIL;

const fichaDe = (extra = {}) => {
  const input = { ...CASO.input, ...extra };
  return { ...input, ...calcularAbrigoRetractil(input) };
};

const render = (extra) =>
  renderToStaticMarkup(
    <FichaImpresionAbrigoRetractil ficha={fichaDe(extra)} numero={1222} onClose={() => {}} />
  );

const html = render();

describe("cortes y material a alistar", () => {
  it("saca los cuatro cortes en una sola fila, no en una rejilla de 2×2", () => {
    const cortes = html.slice(html.indexOf("Cortes (por abrigo)"), html.indexOf("Material a Alistar"));
    expect(cortes).toContain("repeat(4, 1fr)");
    expect(cortes).toContain("Largueros ×4");
    expect(cortes).toContain("Travesaños ×4");
    expect(cortes).toContain("Casitas ×2");
    expect(cortes).toContain("Mangueras rollos de 6000 mm");
  });

  it("conserva las medidas de corte del pedido real OP001222", () => {
    const { medidas } = CASO;
    for (const val of [medidas.largueroLargo, medidas.travesanoLargo, medidas.casitasLargo]) {
      expect(html).toContain(String(val));
    }
  });

  it("mantiene las cuatro cantidades a alistar del pedido completo", () => {
    const alistar = html.slice(html.indexOf("Material a Alistar"));
    expect(alistar).toContain("×20");  // mangueras largo = ancho (2 × 10 abrigos)
    expect(alistar).toContain("×40");  // mangueras largo = alto  (4 × 10 abrigos)
    expect(alistar).toContain("×80");  // tornillos 3/8"
    expect(alistar).toContain("×220"); // autorroscantes
  });
});

describe("control de despacho", () => {
  it("no imprime pesos: en planta no se pesa nada", () => {
    expect(html).not.toContain("Peso total");
    expect(html).not.toMatch(/\d\s*kg/);
  });

  it("lista los bultos con sus medidas y una casilla para marcar", () => {
    const despacho = html.slice(html.indexOf("Control de Despacho"), html.indexOf("Consumo de Materia Prima"));
    for (const bulto of [
      "Banda Superior", "Juego Banda Laterales", "Paquete Largueros",
      "Paquete Cumbreras", "Paq Lona/Manguera/Tornillería",
    ]) {
      expect(despacho).toContain(bulto);
    }
    expect(despacho).toContain("1000 × 3400 mm");
    expect((despacho.match(/border:1\.5px solid #000000/g) || [])).toHaveLength(5);
  });
});

describe("consumo de materia prima", () => {
  it("va partido en dos medias tablas, una al lado de la otra", () => {
    const consumo = html.slice(html.indexOf("Consumo de Materia Prima"));
    expect((consumo.match(/<table/g) || [])).toHaveLength(2);
  });

  it("no pierde ningún insumo al partir la tabla", () => {
    const consumo = html.slice(html.indexOf("Consumo de Materia Prima"));
    for (const insumo of [
      "Lona perimetral", "Banda PVC (laterales + superior)", "Tubería marco",
      "Tubería travesaños", "Mangueras (rollos 6 m)", "U doble 5×5",
      "Refuerzos platina", "Tubos ½", "Tuercas y arandelas",
    ]) {
      expect(consumo).toContain(insumo);
    }
  });

  it("deja fuera la banda PVC cuando el abrigo no la lleva", () => {
    const sinBanda = render({ llevaBanda: false });
    expect(sinBanda).not.toContain("Banda PVC (laterales + superior)");
    expect(sinBanda).toContain("Lona perimetral");
  });
});

describe("legibilidad en papel", () => {
  it("no deja rótulos ni medidas en gris claro", () => {
    // Los fondos claros de las tarjetas sí valen (en papel se quitan solos);
    // lo que no puede aparecer es un gris de Tailwind 400/500 como color de texto.
    expect(html).not.toMatch(/color:#(64748b|94a3b8|cbd5e1|9ca3af|6b7280)\b/);
  });
});

// El alias es lo que planta reconoce: los nombres legales largos no caben en el
// bloque del cliente y nadie los usa en la mesa. La orden sale con el alias solo
// cuando la ficha lo pidió — ver utils/clienteVinculo.js.
describe("nombre del cliente impreso", () => {
  const nombreLargo = "Comercializadora Internacional Andina S.A.S.";

  it("imprime el alias cuando la ficha lo pidió", () => {
    const salida = render({ cliente: nombreLargo, clienteAlias: "CI ANDINA", usarAlias: true });
    expect(salida).toContain("CI ANDINA");
    expect(salida).not.toContain(nombreLargo);
  });

  it("imprime el nombre completo cuando la ficha no lo pidió", () => {
    const salida = render({ cliente: nombreLargo, clienteAlias: "CI ANDINA", usarAlias: false });
    expect(salida).toContain(nombreLargo);
  });

  it("las fichas anteriores al alias siguen saliendo con su nombre", () => {
    expect(render({ cliente: nombreLargo })).toContain(nombreLargo);
  });
});
