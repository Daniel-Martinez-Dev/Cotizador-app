import { describe, it, expect } from "vitest";
import { estilosDeImpresion } from "./impresionAhorroTinta";

// Nadie se da cuenta de que una regla quedó mal hasta que la orden sale de la
// impresora en blanco (letras claras sobre fondo que ya no está) o con la banda
// de color entera pintada. Estas pruebas fijan las decisiones.
//
// getComputedStyle entrega los colores en rgb()/rgba() y el borde lado por
// lado; aquí se arma ese mismo objeto a mano para probar sin navegador.
function estilo({ fondo = "rgba(0, 0, 0, 0)", degradado = "none", texto = "rgb(0, 0, 0)", borde = null } = {}) {
  const calculado = { backgroundColor: fondo, backgroundImage: degradado, color: texto };
  for (const lado of ["Top", "Right", "Bottom", "Left"]) {
    calculado[`border${lado}Width`] = borde ? borde.ancho : "0px";
    calculado[`border${lado}Style`] = borde ? "solid" : "none";
    calculado[`border${lado}Color`] = borde ? borde.color : "rgb(0, 0, 0)";
  }
  return calculado;
}

const AZUL_FICHA = "rgb(26, 63, 143)";     // #1a3f8f — cabecera de las tarjetas
const GRIS_PANEL = "rgb(248, 250, 252)";   // #f8fafc — paneles de sección
const BLANCO = "rgb(255, 255, 255)";

describe("bandas de color", () => {
  it("quita el relleno de la cabecera azul y pasa la letra blanca a negro", () => {
    expect(estilosDeImpresion(estilo({ fondo: AZUL_FICHA, texto: BLANCO }))).toMatchObject({
      background: "#ffffff",
      backgroundImage: "none",
      color: "#000000",
    });
  });

  it("deja un filete donde estaba la banda, para no perder la separación", () => {
    const r = estilosDeImpresion(estilo({ fondo: AZUL_FICHA, texto: BLANCO }));
    expect(r.borderBottom).toBe("1.5px solid #000000");
  });

  it("no dobla el filete si la caja ya traía borde propio", () => {
    const r = estilosDeImpresion(estilo({
      fondo: AZUL_FICHA, texto: BLANCO,
      borde: { ancho: "2px", color: AZUL_FICHA },
    }));
    expect(r.borderBottom).toBeUndefined();
  });

  it("trata el degradado del membrete como banda oscura", () => {
    const r = estilosDeImpresion(estilo({
      degradado: "linear-gradient(135deg, rgb(15, 23, 42) 0%, rgb(30, 58, 95) 100%)",
      texto: BLANCO,
    }));
    expect(r.backgroundImage).toBe("none");
    expect(r.borderBottom).toBe("1.5px solid #000000");
  });
});

describe("paneles y tarjetas", () => {
  it("quita también los fondos grises de sección, pero sin filete", () => {
    const r = estilosDeImpresion(estilo({ fondo: GRIS_PANEL }));
    expect(r.background).toBe("#ffffff");
    expect(r.borderBottom).toBeUndefined();
  });

  it("no toca lo que ya era blanco sobre blanco", () => {
    expect(estilosDeImpresion(estilo({ fondo: BLANCO }))).toEqual({});
  });

  it("no toca un elemento sin fondo ni color propio", () => {
    expect(estilosDeImpresion(estilo())).toEqual({});
  });
});

describe("texto", () => {
  it("respeta el azul de las medidas: es texto, no relleno", () => {
    expect(estilosDeImpresion(estilo({ texto: AZUL_FICHA })).color).toBeUndefined();
  });

  it("pasa a negro el texto blanco translúcido de las bandas", () => {
    expect(estilosDeImpresion(estilo({ texto: "rgba(255, 255, 255, 0.8)" })).color).toBe("#000000");
  });

  it("pasa a negro el gris translúcido, que en papel queda lavado", () => {
    expect(estilosDeImpresion(estilo({ texto: "rgba(0, 0, 0, 0.55)" })).color).toBe("#000000");
  });
});
