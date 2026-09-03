// Ajustes de maquetación del PDF de cotización (config/pdfLayout).
//
// Mismo patrón que cargarTerminos/guardarTerminos de firebaseProductos.js: un
// único documento en la colección `config` compartido por toda la empresa. Se
// espeja en localStorage para que el preview abra ya con los valores buenos sin
// esperar a la red, y para que siga funcionando sin conexión.
import { db } from "../firebase";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { pdfTheme } from "./pdfTheme";

const CLAVE_LOCAL = "pdfLayoutAjustes";

// Campos que el panel puede mover, con su rango y etiqueta. La lista es la
// fuente de verdad: el panel se dibuja a partir de ella y el saneado descarta
// cualquier cosa que no esté aquí.
export const CAMPOS_AJUSTABLES = [
  { seccion: "Página", grupo: "page", clave: "marginHorizontal", etiqueta: "Margen lateral", min: 12, max: 60, paso: 1, unidad: "pt" },
  { seccion: "Página", grupo: "page", clave: "marginVertical", etiqueta: "Margen superior", min: 8, max: 48, paso: 1, unidad: "pt" },
  { seccion: "Página", grupo: "page", clave: "footerSpace", etiqueta: "Espacio del pie", min: 20, max: 70, paso: 1, unidad: "pt" },
  { seccion: "Página", grupo: "spacing", clave: "sectionGap", etiqueta: "Espacio entre secciones", min: 0, max: 40, paso: 1, unidad: "pt" },

  { seccion: "Texto", grupo: "font", clave: "base", etiqueta: "Tamaño de letra base", min: 7, max: 13, paso: 0.25, unidad: "pt" },
  { seccion: "Texto", grupo: "layout", clave: "escalaDescripcion", etiqueta: "Escala · descripción", min: 0.6, max: 1.3, paso: 0.01 },
  { seccion: "Texto", grupo: "layout", clave: "escalaEspecificaciones", etiqueta: "Escala · especificaciones", min: 0.6, max: 1.3, paso: 0.01 },
  { seccion: "Texto", grupo: "layout", clave: "escalaCondiciones", etiqueta: "Escala · condiciones", min: 0.6, max: 1.3, paso: 0.01 },
  { seccion: "Texto", grupo: "layout", clave: "escalaTerminos", etiqueta: "Escala · términos", min: 0.5, max: 1.2, paso: 0.01 },

  // El ancho depende de cuántas imágenes lleve el producto: react-pdf las
  // reparte en fila, así que cada caso tiene su propio porcentaje.
  { seccion: "Imágenes", grupo: "layout", clave: "imagenAltura", etiqueta: "Alto", min: 60, max: 380, paso: 5, unidad: "pt" },
  { seccion: "Imágenes", grupo: "layout", clave: "imagenAlturaPuertaRapida", etiqueta: "Alto · puerta rápida", min: 60, max: 380, paso: 5, unidad: "pt" },
  { seccion: "Imágenes", grupo: "layout", clave: "imagenAnchoUna", etiqueta: "Ancho · 1 imagen", min: 20, max: 100, paso: 1, unidad: "%" },
  { seccion: "Imágenes", grupo: "layout", clave: "imagenAnchoDos", etiqueta: "Ancho · 2 imágenes", min: 20, max: 50, paso: 1, unidad: "%" },
  { seccion: "Imágenes", grupo: "layout", clave: "imagenAnchoTres", etiqueta: "Ancho · 3 imágenes", min: 15, max: 33, paso: 1, unidad: "%" },

  { seccion: "Encabezado y firmas", grupo: "layout", clave: "logoHeight", etiqueta: "Alto del logo", min: 20, max: 80, paso: 1, unidad: "pt" },
  { seccion: "Encabezado y firmas", grupo: "layout", clave: "logoWidth", etiqueta: "Ancho del logo", min: 50, max: 200, paso: 1, unidad: "pt" },
  { seccion: "Encabezado y firmas", grupo: "layout", clave: "firmaCajaAltura", etiqueta: "Alto de casillas de firma", min: 20, max: 90, paso: 2, unidad: "pt" },
];

/** Secciones en el orden en que deben pintarse en el panel. */
export const SECCIONES_AJUSTES = [...new Set(CAMPOS_AJUSTABLES.map((c) => c.seccion))];

/** Valor que trae el tema base para un campo ajustable. */
export function valorPorDefecto({ grupo, clave }) {
  return pdfTheme[grupo]?.[clave];
}

/**
 * Deja solo campos conocidos y numéricos dentro de rango. Protege al PDF de un
 * documento de Firestore editado a mano o de un localStorage viejo.
 */
export function sanearAjustes(bruto) {
  if (!bruto || typeof bruto !== "object") return {};
  const limpio = {};
  CAMPOS_AJUSTABLES.forEach(({ grupo, clave, min, max }) => {
    const valor = bruto[grupo]?.[clave];
    if (typeof valor !== "number" || !isFinite(valor)) return;
    if (valor < min || valor > max) return;
    if (valor === pdfTheme[grupo]?.[clave]) return; // no guardar lo que ya es el default
    if (!limpio[grupo]) limpio[grupo] = {};
    limpio[grupo][clave] = valor;
  });
  return limpio;
}

/** ¿Hay al menos un valor distinto del tema base? */
export function hayAjustes(ajustes) {
  return Object.keys(sanearAjustes(ajustes)).length > 0;
}

function leerLocal() {
  try {
    const crudo = localStorage.getItem(CLAVE_LOCAL);
    return crudo ? sanearAjustes(JSON.parse(crudo)) : {};
  } catch {
    return {};
  }
}

function escribirLocal(ajustes) {
  try {
    localStorage.setItem(CLAVE_LOCAL, JSON.stringify(ajustes));
  } catch {
    // Cuota llena o almacenamiento bloqueado: el valor sigue en Firestore.
  }
}

/**
 * Ajustes guardados. Devuelve primero lo que haya en localStorage (inmediato) y
 * luego lo de Firestore vía `onRemoto`, para que el preview no espere a la red.
 */
export function cargarAjustesPDF({ onRemoto } = {}) {
  const local = leerLocal();

  getDoc(doc(db, "config", "pdfLayout"))
    .then((snap) => {
      if (!snap.exists()) return;
      const remoto = sanearAjustes(snap.data().ajustes);
      escribirLocal(remoto);
      if (onRemoto) onRemoto(remoto);
    })
    .catch((e) => console.error("Error cargando ajustes de maquetación:", e));

  return local;
}

/** Guarda los ajustes como predeterminados para toda la empresa. */
export async function guardarAjustesPDF(ajustes) {
  const limpio = sanearAjustes(ajustes);
  escribirLocal(limpio);
  await setDoc(
    doc(db, "config", "pdfLayout"),
    { ajustes: limpio, updatedAt: serverTimestamp() },
    { merge: true }
  );
  return limpio;
}
