import { describe, it, expect } from "vitest";
import {
  FIRMA_ALTO_PNG,
  GROSOR_PNG,
  dibujarTrazos,
  encuadreExport,
  esFirmaValida,
  hayTrazos,
  limitesTrazos,
  pesoDataUrl,
} from "./firmaDibujo";

// El recorte es lo que hace que la firma salga igual en la ficha sin importar
// en qué parte del recuadro la haya dibujado cada quien.

describe("hayTrazos", () => {
  it("distingue un lienzo en blanco de uno firmado", () => {
    expect(hayTrazos([])).toBe(false);
    expect(hayTrazos([[]])).toBe(false);
    expect(hayTrazos(null)).toBe(false);
    expect(hayTrazos([[{ x: 1, y: 1 }]])).toBe(true);
  });
});

describe("limitesTrazos", () => {
  it("encierra todos los trazos, no solo el último", () => {
    expect(limitesTrazos([
      [{ x: 10, y: 20 }, { x: 30, y: 40 }],
      [{ x: 5, y: 60 }],
    ])).toEqual({ x0: 5, y0: 20, x1: 30, y1: 60, ancho: 25, alto: 40 });
  });

  it("no devuelve caja cuando no se dibujó nada", () => {
    expect(limitesTrazos([])).toBeNull();
    expect(limitesTrazos([[]])).toBeNull();
  });

  it("ignora puntos con coordenadas inválidas", () => {
    expect(limitesTrazos([[{ x: 0, y: 0 }, { x: NaN, y: 5 }, { x: 4, y: 4 }]]))
      .toMatchObject({ x1: 4, y1: 4 });
  });
});

describe("encuadreExport", () => {
  const encuadreDe = (ancho, alto) =>
    encuadreExport(limitesTrazos([[{ x: 0, y: 0 }, { x: ancho, y: alto }]]));

  it("normaliza la firma al alto fijo del PNG", () => {
    expect(encuadreDe(400, 200).alto).toBe(FIRMA_ALTO_PNG);
  });

  // Firmar en grande o en pequeño no puede cambiar cómo sale impresa: es la
  // razón de exportar recortado y reescalado en vez de mandar el lienzo entero.
  it("deja del mismo tamaño la misma firma dibujada chica y grande", () => {
    const chica = encuadreDe(200, 100);
    const grande = encuadreDe(400, 200);
    expect(chica.alto).toBe(FIRMA_ALTO_PNG);
    expect(grande.alto).toBe(FIRMA_ALTO_PNG);
    // El grosor del trazo abulta un poco más en la chica; el marco es el mismo.
    expect(Math.abs(chica.ancho - grande.ancho)).toBeLessThanOrEqual(5);
  });

  it("respeta la proporción: una firma alargada se limita por el ancho", () => {
    const encuadre = encuadreDe(2000, 100);
    expect(encuadre.ancho).toBeLessThanOrEqual(900);
    expect(encuadre.alto).toBeLessThan(FIRMA_ALTO_PNG);
  });

  // Un garabato minúsculo se amplía hasta cierto punto y ahí se queda: llevarlo
  // al alto completo del PNG dejaría un trazo desproporcionado.
  it("no amplía sin límite un garabato diminuto", () => {
    expect(encuadreDe(6, 3).alto).toBeLessThan(FIRMA_ALTO_PNG);
  });

  // Una raya recta tiene alto cero: sin contar el grosor del trazo la escala
  // sería infinita y el PNG saldría vacío.
  it("aguanta un trazo sin alto o sin ancho", () => {
    const raya = encuadreDe(300, 0);
    expect(Number.isFinite(raya.escala)).toBe(true);
    expect(raya.alto).toBeGreaterThan(0);
    const punto = encuadreExport(limitesTrazos([[{ x: 7, y: 7 }]]));
    expect(Number.isFinite(punto.escala)).toBe(true);
    expect(punto.ancho).toBeGreaterThan(0);
  });

  it("no devuelve encuadre sin trazos", () => {
    expect(encuadreExport(null)).toBeNull();
  });

  it("desplaza la caja al origen para recortar el espacio en blanco", () => {
    const encuadre = encuadreExport(limitesTrazos([[{ x: 500, y: 300 }, { x: 600, y: 350 }]]));
    expect(encuadre.offsetX).toBeLessThan(500);
    expect(encuadre.offsetY).toBeLessThan(300);
  });
});

describe("pesoDataUrl / esFirmaValida", () => {
  it("mide el peso real del base64, no el largo del texto", () => {
    // "AAAA" en base64 son 3 bytes.
    expect(pesoDataUrl("data:image/png;base64,AAAA")).toBe(3);
    expect(pesoDataUrl("")).toBe(0);
    expect(pesoDataUrl(null)).toBe(0);
  });

  it("solo da por buena una imagen incrustada", () => {
    expect(esFirmaValida("data:image/png;base64,AAAA")).toBe(true);
    expect(esFirmaValida("https://ejemplo/firma.png")).toBe(false);
    expect(esFirmaValida("")).toBe(false);
    expect(esFirmaValida(null)).toBe(false);
  });
});

// Un error de signo en el desplazamiento dejaría la firma fuera del lienzo y el
// PNG saldría en blanco, sin que nada fallara. Se comprueba con un contexto de
// canvas simulado: interesa a qué coordenadas se dibuja, no el resultado.
function ctxFalso() {
  const puntos = [];
  const registrar = (x, y) => puntos.push({ x, y });
  return {
    puntos,
    lineWidth: 0,
    save() {}, restore() {}, beginPath() {}, stroke() {}, fill() {},
    moveTo: registrar,
    lineTo: registrar,
    quadraticCurveTo: (cx, cy, x, y) => { registrar(cx, cy); registrar(x, y); },
    arc: (x, y) => registrar(x, y),
  };
}

describe("dibujarTrazos", () => {
  const trazos = [[{ x: 300, y: 500 }, { x: 400, y: 560 }, { x: 500, y: 520 }]];

  it("mete la firma completa dentro del lienzo exportado", () => {
    const encuadre = encuadreExport(limitesTrazos(trazos));
    const ctx = ctxFalso();
    dibujarTrazos(ctx, trazos, { grosor: GROSOR_PNG, ...encuadre });

    expect(ctx.puntos.length).toBeGreaterThan(0);
    for (const p of ctx.puntos) {
      expect(p.x).toBeGreaterThanOrEqual(0);
      expect(p.y).toBeGreaterThanOrEqual(0);
      expect(p.x).toBeLessThanOrEqual(encuadre.ancho);
      expect(p.y).toBeLessThanOrEqual(encuadre.alto);
    }
  });

  it("aprovecha el lienzo: la firma llega hasta los márgenes", () => {
    const encuadre = encuadreExport(limitesTrazos(trazos));
    const ctx = ctxFalso();
    dibujarTrazos(ctx, trazos, { grosor: GROSOR_PNG, ...encuadre });

    // Sin recorte, una firma dibujada en el centro del lienzo quedaría metida
    // en una esquina o perdida en el medio.
    const xs = ctx.puntos.map((p) => p.x);
    expect(Math.min(...xs)).toBeLessThan(encuadre.ancho * 0.15);
    expect(Math.max(...xs)).toBeGreaterThan(encuadre.ancho * 0.85);
  });

  // El grosor es el ancho final del trazo, no se multiplica por la escala: es
  // lo que hace que todas las firmas se impriman con el mismo peso de pluma.
  it("no escala el grosor del trazo con el tamaño de la firma", () => {
    const encuadre = encuadreExport(limitesTrazos(trazos));
    const ctx = ctxFalso();
    dibujarTrazos(ctx, trazos, { grosor: GROSOR_PNG, ...encuadre });
    expect(ctx.lineWidth).toBe(GROSOR_PNG);
  });

  it("marca un toque suelto como punto en vez de no dibujar nada", () => {
    const ctx = ctxFalso();
    dibujarTrazos(ctx, [[{ x: 5, y: 5 }]]);
    expect(ctx.puntos).toEqual([{ x: 5, y: 5 }]);
  });

  it("aguanta trazos vacíos o mal formados sin romperse", () => {
    const ctx = ctxFalso();
    expect(() => dibujarTrazos(ctx, [[], null, undefined])).not.toThrow();
    expect(ctx.puntos).toEqual([]);
  });
});
