// Firma dibujada a mano alzada.
//
// La firma se dibuja con el dedo en el celular (es lo que tiene la planta a la
// mano) o con el mouse desde el escritorio, y termina impresa en el pie de la
// ficha, encima de la línea de cada firmante.
//
// El trazo NO se pinta directo sobre el canvas: se guarda como una lista de
// trazos (cada trazo, la lista de puntos por los que pasó el dedo). Eso permite
// tres cosas que un canvas pintado no permite: deshacer el último trazo,
// redibujar sin pérdida cuando el lienzo cambia de tamaño (girar el teléfono), y
// exportar recortado a la firma real en vez de a la hoja completa.
//
// El PNG final va con fondo transparente y en un campo del perfil del usuario
// (`firmaDataUrl`), no en Storage: la ficha impresa se rasteriza metiendo su
// HTML dentro de un <svg><foreignObject> (ver fichaImagen.js), y ahí dentro una
// imagen con URL externa no carga. Un data: URI sí, porque va incrustado.

// Alto al que se normaliza toda firma exportada. Todas salen del mismo alto
// para que el pie de la ficha se vea parejo, sin importar qué tan grande la
// haya dibujado cada quien sobre el lienzo.
export const FIRMA_ALTO_PNG = 200;
// Tope de ancho: una firma muy alargada se reduce en vez de deformarse.
export const FIRMA_ANCHO_MAX_PNG = 900;
// Aire alrededor de la firma en el PNG, en píxeles del PNG (no del lienzo): así
// el marco es el mismo para una firma chica y una grande.
const MARGEN_PNG = 8;
// Un toque sin desplazamiento no tiene tamaño: sin este tope, ampliarlo al alto
// del PNG daría una escala disparatada. Solo llega a aplicarse con garabatos
// diminutos; una firma normal se queda muy por debajo.
const AMPLIACION_MAXIMA = 5;

// Grosor del trazo en el lienzo donde se dibuja...
export const GROSOR_TRAZO = 2.6;
// ...y en el PNG exportado. Es fijo —no se escala con la firma— para que todas
// salgan impresas con el mismo peso de pluma: si se escalara, quien firma
// pequeño quedaría con un trazo más grueso que quien firma grande.
export const GROSOR_PNG = 5;
export const COLOR_TRAZO = "#111111";

// Tope del data URI guardado. Un trazo negro sobre transparente comprime a unos
// pocos KB; este límite es la red de seguridad para no acercarse al máximo de
// 1 MB por documento de Firestore, teniendo en cuenta que la firma además se
// copia dentro de cada ficha que la persona firma.
export const FIRMA_MAX_BYTES = 60 * 1024;

export function hayTrazos(trazos) {
  return (Array.isArray(trazos) ? trazos : []).some((t) => Array.isArray(t) && t.length > 0);
}

// Caja que ocupa lo dibujado. Es lo que permite recortar la hoja en blanco
// alrededor: quien firma en una esquina del recuadro queda igual de centrado
// que quien lo llena entero.
export function limitesTrazos(trazos) {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const trazo of Array.isArray(trazos) ? trazos : []) {
    for (const p of Array.isArray(trazo) ? trazo : []) {
      if (!Number.isFinite(p?.x) || !Number.isFinite(p?.y)) continue;
      if (p.x < x0) x0 = p.x;
      if (p.y < y0) y0 = p.y;
      if (p.x > x1) x1 = p.x;
      if (p.y > y1) y1 = p.y;
    }
  }
  if (x0 === Infinity) return null;
  return { x0, y0, x1, y1, ancho: x1 - x0, alto: y1 - y0 };
}

// Escala y desplazamiento para meter la caja de la firma dentro del lienzo de
// exportación, sin deformarla y con el mismo aire alrededor en todos los casos.
export function encuadreExport(limites, {
  alto = FIRMA_ALTO_PNG,
  anchoMax = FIRMA_ANCHO_MAX_PNG,
  grosor = GROSOR_TRAZO,
  margen = MARGEN_PNG,
} = {}) {
  if (!limites) return null;

  // La caja de los puntos no es la caja de la tinta: el trazo sobresale medio
  // grosor a cada lado. Contarlo evita además dividir por cero con una firma de
  // una sola raya horizontal, que tiene alto cero.
  const tinta = grosor / 2;
  const anchoCaja = limites.ancho + tinta * 2;
  const altoCaja = limites.alto + tinta * 2;

  const escala = Math.min(
    (alto - margen * 2) / altoCaja,
    (anchoMax - margen * 2) / anchoCaja,
    AMPLIACION_MAXIMA
  );

  return {
    escala,
    ancho: Math.max(1, Math.round(anchoCaja * escala + margen * 2)),
    alto: Math.max(1, Math.round(altoCaja * escala + margen * 2)),
    // Lo que se le resta a cada punto antes de escalarlo para que la firma
    // quede pegada al origen con su margen.
    offsetX: limites.x0 - tinta - margen / escala,
    offsetY: limites.y0 - tinta - margen / escala,
  };
}

// Pinta los trazos con curvas por los puntos medios: unir los puntos con rectas
// deja la firma con esquinas de sierra, sobre todo en el celular, que reporta
// pocos puntos por segundo cuando el dedo se mueve rápido.
// `grosor` es el ancho del trazo en píxeles del destino, no del origen: no se
// escala con la firma (ver GROSOR_PNG).
export function dibujarTrazos(ctx, trazos, {
  grosor = GROSOR_TRAZO,
  color = COLOR_TRAZO,
  escala = 1,
  offsetX = 0,
  offsetY = 0,
} = {}) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = grosor;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  const px = (p) => ({ x: (p.x - offsetX) * escala, y: (p.y - offsetY) * escala });

  for (const trazo of Array.isArray(trazos) ? trazos : []) {
    const puntos = (Array.isArray(trazo) ? trazo : []).map(px);
    if (puntos.length === 0) continue;

    // Un toque sin desplazamiento es un punto (la tilde de una firma, el punto
    // de una i): sin esto no dejaría marca.
    if (puntos.length === 1) {
      ctx.beginPath();
      ctx.arc(puntos[0].x, puntos[0].y, grosor / 2, 0, Math.PI * 2);
      ctx.fill();
      continue;
    }

    ctx.beginPath();
    ctx.moveTo(puntos[0].x, puntos[0].y);
    for (let i = 1; i < puntos.length - 1; i++) {
      const medio = {
        x: (puntos[i].x + puntos[i + 1].x) / 2,
        y: (puntos[i].y + puntos[i + 1].y) / 2,
      };
      ctx.quadraticCurveTo(puntos[i].x, puntos[i].y, medio.x, medio.y);
    }
    const ultimo = puntos[puntos.length - 1];
    ctx.lineTo(ultimo.x, ultimo.y);
    ctx.stroke();
  }
  ctx.restore();
}

// PNG recortado y con fondo transparente, listo para guardarse en el perfil.
// Devuelve "" si no se dibujó nada.
export function trazosAPng(trazos, opciones = {}) {
  const limites = limitesTrazos(trazos);
  const encuadre = encuadreExport(limites, opciones);
  if (!encuadre) return "";

  const canvas = document.createElement("canvas");
  canvas.width = encuadre.ancho;
  canvas.height = encuadre.alto;
  const ctx = canvas.getContext("2d");
  dibujarTrazos(ctx, trazos, {
    grosor: opciones.grosorPng ?? GROSOR_PNG,
    color: opciones.color ?? COLOR_TRAZO,
    escala: encuadre.escala,
    offsetX: encuadre.offsetX,
    offsetY: encuadre.offsetY,
  });
  return canvas.toDataURL("image/png");
}

// Peso aproximado de un data URI, para no guardar una firma que no cabe.
export function pesoDataUrl(dataUrl) {
  const base64 = String(dataUrl || "").split(",")[1] || "";
  return Math.floor((base64.length * 3) / 4);
}

export function esFirmaValida(dataUrl) {
  return typeof dataUrl === "string" && dataUrl.startsWith("data:image/");
}
