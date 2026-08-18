// Modo ahorro de tinta — se aplica SOLO a lo que sale por la impresora.
//
// En pantalla las fichas usan bandas de color con letras blancas: ahí ayudan a
// leer la orden de un vistazo y se conservan tal cual. En papel son el peor de
// los dos mundos: si la impresora no pinta fondos (Chrome trae "Gráficos de
// fondo" apagado por defecto) las letras blancas desaparecen, y si los pinta se
// va medio cartucho en cada orden de producción.
//
// Antes de mandar la ficha a imprimir se clona su árbol y al clon se le quitan
// los rellenos: fondo blanco, texto negro y un filete negro donde había una
// banda oscura, para no perder la jerarquía de las secciones. Los bordes de
// color se dejan —son líneas finas, casi no gastan— y con ellos la ficha
// impresa conserva su código de colores.
//
// Solo se tocan las cajas HTML (background / color). El plano técnico va en SVG
// y sus rellenos son el dibujo mismo (la lona, el portarrollo, el zócalo): ese
// no se toca nunca.

const NEGRO = "#000000";
const BLANCO = "#ffffff";
const FILETE = `1.5px solid ${NEGRO}`;

// Un fondo por debajo de este brillo era una banda de color con letras claras:
// al quitarlo hay que dejar un filete o la sección pierde su separación.
const BRILLO_BANDA_OSCURA = 0.72;
// Por encima de este brillo el texto sería ilegible sobre papel blanco.
const BRILLO_TEXTO_CLARO = 0.62;
// Un fondo prácticamente blanco (las tarjetas ya son blancas) se deja quieto.
const BRILLO_CASI_BLANCO = 0.98;

// Clona el nodo imprimible dejándolo listo para el papel. Los estilos se leen
// del original —que sí está pintado en pantalla, así que getComputedStyle
// resuelve los valores heredados— y se escriben en la copia, recorriendo los
// dos árboles en paralelo: el clon es profundo, así que el elemento i de uno
// es el elemento i del otro.
export function clonarParaImpresion(origen) {
  const clon = origen.cloneNode(true);
  const originales = [origen, ...origen.querySelectorAll("*")];
  const copias = [clon, ...clon.querySelectorAll("*")];
  originales.forEach((el, i) => ahorrarTinta(el, copias[i]));
  return clon;
}

// El HTML que se manda a la impresora (o al PDF que se comparte en Android).
export function htmlParaImprimir(origen) {
  return clonarParaImpresion(origen).innerHTML;
}

function ahorrarTinta(original, copia) {
  // Los nodos SVG del plano quedan intactos: sus fills son el dibujo.
  if (!copia || !(copia instanceof HTMLElement)) return;
  Object.assign(copia.style, estilosDeImpresion(window.getComputedStyle(original)));
}

// Qué hay que cambiarle a un elemento para imprimirlo. Recibe sus estilos ya
// calculados y devuelve solo las propiedades a sobrescribir (vacío si el
// elemento ya estaba listo para el papel). Separado del DOM para poder probarlo.
export function estilosDeImpresion(estilo) {
  return { ...quitarRelleno(estilo), ...oscurecerTextoClaro(estilo) };
}

function quitarRelleno(estilo) {
  const fondo = parsearColor(estilo.backgroundColor);
  const degradado = !!estilo.backgroundImage && estilo.backgroundImage !== "none";
  const pinta = degradado || (fondo && fondo.a > 0.02 && brillo(fondo) < BRILLO_CASI_BLANCO);
  if (!pinta) return null;

  // Los degradados de la ficha (membrete y banda de medida) son todos oscuros.
  const eraOscuro = degradado || brillo(fondo) < BRILLO_BANDA_OSCURA;

  return {
    background: BLANCO,
    backgroundImage: "none",
    boxShadow: "none",
    // La banda oscura deja un filete en su lugar; si la caja ya tenía borde
    // propio no hace falta, se vería doble.
    ...(eraOscuro && !tieneBordeVisible(estilo) ? { borderBottom: FILETE } : null),
  };
}

function oscurecerTextoClaro(estilo) {
  const color = parsearColor(estilo.color);
  if (!color) return null;
  // Texto claro (iba sobre una banda que ya no existe) o semitransparente
  // (queda lavado en papel): a negro. Los azules y vinotintos de la ficha son
  // oscuros y se respetan — es texto, no relleno, y ahí el color sí informa.
  const ilegible = brillo(color) > BRILLO_TEXTO_CLARO || color.a < 0.75;
  return ilegible ? { color: NEGRO } : null;
}

function tieneBordeVisible(estilo) {
  return ["Top", "Right", "Bottom", "Left"].some((lado) => {
    if (estilo[`border${lado}Style`] === "none") return false;
    if ((parseFloat(estilo[`border${lado}Width`]) || 0) <= 0) return false;
    const color = parsearColor(estilo[`border${lado}Color`]);
    return !!color && color.a > 0.05 && brillo(color) < 0.9;
  });
}

// getComputedStyle siempre devuelve los colores como rgb()/rgba().
function parsearColor(valor) {
  const m = /rgba?\(([^)]+)\)/.exec(valor || "");
  if (!m) return null;
  const p = m[1].split(/[\s,/]+/).filter(Boolean).map(Number);
  if (p.length < 3 || p.slice(0, 3).some((n) => Number.isNaN(n))) return null;
  const a = p.length > 3 && !Number.isNaN(p[3]) ? p[3] : 1;
  return { r: p[0], g: p[1], b: p[2], a };
}

// Brillo percibido (0 = negro, 1 = blanco) del color ya compuesto sobre el
// papel blanco, que es el único fondo que va a existir al imprimir.
function brillo({ r, g, b, a = 1 }) {
  const sobreBlanco = (c) => (c * a + 255 * (1 - a)) / 255;
  return 0.2126 * sobreBlanco(r) + 0.7152 * sobreBlanco(g) + 0.0722 * sobreBlanco(b);
}
