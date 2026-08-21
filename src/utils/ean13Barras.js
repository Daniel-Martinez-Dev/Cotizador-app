// Dibujo del EAN-13. Devuelve geometría (rectángulos + textos), no SVG ya
// armado, porque el mismo cálculo alimenta dos salidas distintas: el componente
// de React que se ve en pantalla y la cadena SVG que se manda al papel de las
// etiquetas. Un solo sitio donde se decide dónde va cada barra.
//
// No usamos librería: un EAN-13 son tres tablas de 10 patrones y unas barras de
// guarda. Meter una dependencia de terceros para esto pesaría más que el código
// y habría que sincronizarla en Windows y en Android.

// Patrones de 7 módulos por dígito. L y G codifican la mitad izquierda (cuál de
// las dos se usa en cada posición lo dice la paridad del primer dígito, que por
// eso no se dibuja: viaja escondido en esa alternancia). R es la mitad derecha.
const L = ["0001101", "0011001", "0010011", "0111101", "0100011", "0110001", "0101111", "0111011", "0110111", "0001011"];
const G = ["0100111", "0110011", "0011011", "0100001", "0011101", "0111001", "0000101", "0010001", "0001001", "0010111"];
const R = ["1110010", "1100110", "1101100", "1000010", "1011100", "1001110", "1010000", "1000100", "1001000", "1110100"];

const PARIDAD = ["LLLLLL", "LLGLGG", "LLGGLG", "LLGGGL", "LGLLGG", "LGGLLG", "LGGGLL", "LGLGLG", "LGLGGL", "LGGLGL"];

const GUARDA_LATERAL = "101";
const GUARDA_CENTRAL = "01010";

// Módulos de silencio a cada lado. No son decorativos: sin ellos el lector no
// distingue dónde empieza el símbolo y la etiqueta se vuelve ilegible pegada al
// borde del adhesivo.
const SILENCIO_IZQ = 11;
const SILENCIO_DER = 7;

const esEan13 = (codigo) => /^\d{13}$/.test(String(codigo || "").trim());

// Cadena de 95 módulos ("1" = barra, "0" = espacio), sin zonas de silencio.
export function modulosEan13(codigo) {
  const s = String(codigo || "").trim();
  if (!esEan13(s)) return "";

  const paridad = PARIDAD[Number(s[0])];
  let out = GUARDA_LATERAL;
  for (let i = 0; i < 6; i += 1) {
    const d = Number(s[i + 1]);
    out += paridad[i] === "L" ? L[d] : G[d];
  }
  out += GUARDA_CENTRAL;
  for (let i = 0; i < 6; i += 1) {
    out += R[Number(s[i + 7])];
  }
  return out + GUARDA_LATERAL;
}

// Las barras de guarda bajan más que el resto para dejar sitio a los dígitos
// legibles, tal como se ve en cualquier producto de supermercado.
const esGuarda = (i) => (i >= 0 && i < 3) || (i >= 45 && i < 50) || (i >= 92 && i < 95);

/**
 * Geometría del símbolo en unidades de usuario (1 módulo = `modulo` px).
 * @returns {{ancho:number, alto:number, barras:Array, textos:Array, codigo:string}|null}
 */
export function geometriaEan13(codigo, { modulo = 2, altoBarras = 60, mostrarTexto = true } = {}) {
  const s = String(codigo || "").trim();
  const modulos = modulosEan13(s);
  if (!modulos) return null;

  const alturaTexto = mostrarTexto ? 10 * modulo : 0;
  const bajada = mostrarTexto ? 5 * modulo : 0; // cuánto sobresalen las guardas
  const ancho = (SILENCIO_IZQ + 95 + SILENCIO_DER) * modulo;
  const alto = altoBarras + bajada + alturaTexto;

  const barras = [];
  for (let i = 0; i < modulos.length; i += 1) {
    if (modulos[i] !== "1") continue;
    const anterior = barras[barras.length - 1];
    const x = (SILENCIO_IZQ + i) * modulo;
    const h = altoBarras + (esGuarda(i) ? bajada : 0);
    // Módulos contiguos de la misma altura se funden en un solo rectángulo: la
    // impresora rinde mejor una barra ancha que tres pegadas, que a veces deja
    // una hilera de pelos blancos entre ellas.
    if (anterior && anterior.x + anterior.ancho === x && anterior.alto === h) {
      anterior.ancho += modulo;
    } else {
      barras.push({ x, y: 0, ancho: modulo, alto: h });
    }
  }

  const textos = [];
  if (mostrarTexto) {
    const y = alto - 1.5 * modulo;
    const tamano = 9 * modulo;
    // Cada dígito se centra bajo sus 7 módulos, uno por uno, en vez de escribir
    // el bloque de seis con letter-spacing: así queda alineado con las barras
    // que representa aunque cambie la fuente del sistema.
    const digito = (texto, desdeModulo) => ({
      x: (SILENCIO_IZQ + desdeModulo + 3.5) * modulo,
      y,
      tamano,
      anclaje: "middle",
      texto,
    });

    // El primer dígito va fuera del símbolo, a la izquierda: dentro no hay
    // barras que le correspondan (viaja en la paridad de la mitad izquierda).
    textos.push({ x: (SILENCIO_IZQ - 2) * modulo, y, tamano, anclaje: "end", texto: s[0] });
    for (let i = 0; i < 6; i += 1) textos.push(digito(s[i + 1], 3 + i * 7));
    for (let i = 0; i < 6; i += 1) textos.push(digito(s[i + 7], 50 + i * 7));
  }

  return { ancho, alto, barras, textos, codigo: s };
}

const escaparXml = (s) => String(s || "")
  .replace(/&/g, "&amp;")
  .replace(/</g, "&lt;")
  .replace(/>/g, "&gt;");

/**
 * SVG listo para incrustar en el HTML de impresión de etiquetas.
 * Siempre negro sobre blanco: un lector láser necesita el contraste máximo, y
 * de paso es lo que menos tinta gasta.
 */
export function svgEan13(codigo, opciones = {}) {
  const g = geometriaEan13(codigo, opciones);
  if (!g) return "";

  const barras = g.barras
    .map((b) => `<rect x="${b.x}" y="${b.y}" width="${b.ancho}" height="${b.alto}" fill="#000"/>`)
    .join("");

  const textos = g.textos
    .map((t) => `<text x="${t.x}" y="${t.y}" font-family="monospace" font-size="${t.tamano}" text-anchor="${t.anclaje}" fill="#000">${escaparXml(t.texto)}</text>`)
    .join("");

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${g.ancho} ${g.alto}" width="${g.ancho}" height="${g.alto}" role="img" aria-label="Código de barras ${escaparXml(g.codigo)}"><rect width="${g.ancho}" height="${g.alto}" fill="#fff"/>${barras}${textos}</svg>`;
}
