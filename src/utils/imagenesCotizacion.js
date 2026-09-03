// Imágenes de la cotización: las del catálogo y las que sube el usuario.
//
// El catálogo (imagenesPorProducto) se referencia por su nombre — "Divisiones
// Térmicas con puerta" — y esa clave es lo que se guarda en Firestore. Una foto
// propia no tiene nombre en el catálogo, así que se guarda su URL de Cloudinary
// en el mismo campo. De ahí que resolver una imagen sea "búscala en el catálogo
// y, si no está pero parece una URL, úsala tal cual": con eso una cotización
// guardada con foto propia vuelve a abrirse bien.
import imagenesPorProducto from "../data/imagenesPorProducto";
import { comprimirImagen } from "./fotosFicha";
import { subirImagenCloudinary } from "./cloudinary";

const CARPETA = "cotizaciones/imagenes";
export const TAMANO_MAXIMO_BYTES = 8 * 1024 * 1024;
const TIPOS_ACEPTADOS = ["image/jpeg", "image/png", "image/webp"];

/** ¿La clave es una imagen propia (URL o data URI) y no una del catálogo? */
export function esImagenPropia(clave) {
  return typeof clave === "string" && /^(https?:\/\/|data:image\/)/i.test(clave);
}

/** Fuente pintable de una imagen, venga del catálogo o sea propia. */
export function resolverImagenCotizacion(clave) {
  if (!clave) return null;
  return imagenesPorProducto[clave] || (esImagenPropia(clave) ? clave : null);
}

/** Nombre corto para mostrar debajo de la miniatura. */
export function etiquetaImagen(clave) {
  if (!clave) return "";
  if (!esImagenPropia(clave)) return clave;
  if (clave.startsWith("data:")) return "Imagen propia";
  try {
    const archivo = new URL(clave).pathname.split("/").pop() || "";
    return decodeURIComponent(archivo) || "Imagen propia";
  } catch {
    return "Imagen propia";
  }
}

/**
 * Comprime y sube una foto del usuario. Devuelve la URL, que es lo que se
 * guarda como clave de la imagen. Va a Cloudinary por lo mismo que el resto de
 * fotos de la app: Firebase Storage exigiría plan Blaze (ver cloudinary.js).
 */
export async function subirImagenCotizacion(archivo) {
  if (!archivo) throw new Error("No se recibió ninguna imagen");
  if (archivo.type && !TIPOS_ACEPTADOS.includes(archivo.type)) {
    throw new Error(`"${archivo.name || "El archivo"}" no es una imagen JPG, PNG o WebP`);
  }

  const comprimida = await comprimirImagen(archivo);
  if (comprimida.size > TAMANO_MAXIMO_BYTES) {
    throw new Error(`La imagen "${archivo.name || ""}" es demasiado grande`);
  }

  const { url } = await subirImagenCloudinary(comprimida, {
    carpeta: CARPETA,
    nombre: `${Date.now()}.jpg`,
  });
  return url;
}

/** Saca los archivos de imagen de un evento de arrastre o de un <input file>. */
export function archivosDeEvento(e) {
  const lista = e?.dataTransfer?.files || e?.target?.files;
  return Array.from(lista || []).filter((f) => f.type?.startsWith("image/"));
}
