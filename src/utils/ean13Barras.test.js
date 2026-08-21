import { describe, it, expect } from "vitest";
import { modulosEan13, geometriaEan13, svgEan13 } from "./ean13Barras";
import { formatearCodigoBarras } from "./codigoMaterial";

// Si el patrón de módulos está mal, la etiqueta se imprime igual de bonita pero
// el lector no la reconoce, y eso solo se descubre con la pistola en la mano
// frente a un rollo de adhesivos ya impreso.

const CODIGO = formatearCodigoBarras(42); // 2000000000428

// Código real de referencia (una barra de chocolate alemana): sirve para
// comprobar las tablas contra algo que ya existe impreso en el mundo.
const REAL = "4006381333931";

describe("patrón de módulos", () => {
  it("son 95 módulos", () => {
    expect(modulosEan13(CODIGO)).toHaveLength(95);
  });

  it("lleva las tres barras de guarda en su sitio", () => {
    const m = modulosEan13(CODIGO);
    expect(m.slice(0, 3)).toBe("101");
    expect(m.slice(45, 50)).toBe("01010");
    expect(m.slice(92, 95)).toBe("101");
  });

  it("codifica la mitad derecha con el patrón R", () => {
    // Último dígito de 4006381333931 es 1 → patrón R del 1 es 1100110.
    expect(modulosEan13(REAL).slice(85, 92)).toBe("1100110");
  });

  it("usa la paridad del primer dígito en la mitad izquierda", () => {
    // Primer dígito 4 → paridad LGLLGG; el segundo (0) va con L: 0001101.
    expect(modulosEan13(REAL).slice(3, 10)).toBe("0001101");
  });

  it("cambia el patrón del mismo dígito según la paridad", () => {
    // En 4006381333931 el 0 sale dos veces seguidas y la paridad LGLLGG le da
    // L a la primera y G a la segunda. Que los dos ceros se dibujen distinto es
    // justo lo que le permite al lector recuperar el primer dígito (el 4), que
    // no tiene barras propias.
    const m = modulosEan13(REAL);
    expect(m.slice(3, 10)).toBe("0001101");  // 0 con L
    expect(m.slice(10, 17)).toBe("0100111"); // 0 con G
  });

  it("no dibuja nada con un código inválido", () => {
    expect(modulosEan13("123")).toBe("");
    expect(modulosEan13("")).toBe("");
    expect(modulosEan13(null)).toBe("");
  });
});

describe("geometría", () => {
  it("las guardas bajan más que las barras de datos", () => {
    const g = geometriaEan13(CODIGO, { modulo: 2, altoBarras: 60 });
    const alturaMaxima = Math.max(...g.barras.map((b) => b.alto));
    const alturaDatos = Math.min(...g.barras.map((b) => b.alto));
    expect(alturaMaxima).toBeGreaterThan(alturaDatos);
  });

  it("imprime los 13 dígitos legibles", () => {
    const g = geometriaEan13(CODIGO);
    expect(g.textos.map((t) => t.texto).join("")).toBe(CODIGO);
  });

  it("puede omitir el texto", () => {
    expect(geometriaEan13(CODIGO, { mostrarTexto: false }).textos).toEqual([]);
  });

  it("respeta las zonas de silencio a lado y lado", () => {
    const modulo = 2;
    const g = geometriaEan13(CODIGO, { modulo });
    const primera = Math.min(...g.barras.map((b) => b.x));
    const ultima = Math.max(...g.barras.map((b) => b.x + b.ancho));
    expect(primera).toBe(11 * modulo);
    expect(g.ancho - ultima).toBe(7 * modulo);
  });

  it("devuelve null con un código inválido", () => {
    expect(geometriaEan13("no-es-un-ean")).toBeNull();
  });
});

describe("SVG de impresión", () => {
  it("sale en blanco y negro puro", () => {
    const svg = svgEan13(CODIGO);
    expect(svg).toContain('fill="#000"');
    expect(svg).toContain('fill="#fff"');
    expect(svg).not.toMatch(/fill="#(?!000|fff)/);
  });

  it("es una cadena SVG completa y accesible", () => {
    const svg = svgEan13(CODIGO);
    expect(svg.startsWith("<svg")).toBe(true);
    expect(svg.endsWith("</svg>")).toBe(true);
    expect(svg).toContain(`aria-label="Código de barras ${CODIGO}"`);
  });

  it("devuelve cadena vacía con un código inválido en vez de un SVG roto", () => {
    expect(svgEan13("123")).toBe("");
  });
});
