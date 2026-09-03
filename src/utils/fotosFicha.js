import { subirImagenCloudinary } from "./cloudinary";

// Registro fotográfico de la entrega de una ficha.
//
// Las fotos las toma la planta con el celular (10–15 MP, 4–8 MB cada una). Subir
// eso tal cual es inviable con datos móviles y no aporta nada: la foto es
// evidencia de que se entregó, no un plano. Por eso todo pasa primero por
// `comprimirImagen`, que las deja en ~200–400 KB.
//
// Van a Cloudinary, no a Firebase Storage (ver cloudinary.js): activar Storage
// exigía pasar el proyecto a plan Blaze. La diferencia práctica es que una foto
// ya subida no se puede borrar desde la app — quitarla la saca de la ficha,
// pero el archivo permanece en Cloudinary.

const LADO_MAXIMO = 1600;   // px del lado mayor
const CALIDAD_JPEG = 0.75;
export const MAX_FOTOS = 8;
export const TAMANO_MAXIMO_BYTES = 8 * 1024 * 1024; // tope de una foto ya comprimida

// Redimensiona y recomprime a JPEG. Se usa <img> en vez de createImageBitmap
// porque el navegador ya aplica la orientación EXIF al pintarlo: con las fotos
// verticales del celular, la otra vía las deja acostadas.
export function comprimirImagen(file, { maxLado = LADO_MAXIMO, calidad = CALIDAD_JPEG } = {}) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      const escala = Math.min(1, maxLado / Math.max(img.width, img.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(img.width * escala);
      canvas.height = Math.round(img.height * escala);
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error("No se pudo procesar la imagen"))),
        "image/jpeg",
        calidad
      );
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error(`No se pudo leer la imagen "${file.name}"`));
    };
    img.src = url;
  });
}

// Sube las fotos a una ruta de Cloudinary y devuelve lo que se guarda en la
// ficha: la URL para mostrarla y el identificador del archivo.
async function subirFotos(ruta, archivos, onProgreso) {
  const lista = Array.from(archivos || []);
  if (lista.length === 0) return [];

  const subidas = [];
  for (const [i, archivo] of lista.entries()) {
    onProgreso?.({ actual: i + 1, total: lista.length });
    const comprimida = await comprimirImagen(archivo);
    if (comprimida.size > TAMANO_MAXIMO_BYTES) {
      throw new Error(`La foto "${archivo.name}" es demasiado grande`);
    }
    const { url, publicId } = await subirImagenCloudinary(comprimida, {
      carpeta: ruta,
      nombre: `${Date.now()}-${i}.jpg`,
    });
    subidas.push({ url, publicId, nombre: archivo.name });
  }
  return subidas;
}

export async function subirFotosFicha(coleccion, fichaId, carpeta, archivos, onProgreso) {
  return subirFotos(`fichas/${coleccion}/${fichaId}/${carpeta}`, archivos, onProgreso);
}

// Fotos de un lote de fichas (un pedido que se firma o se entrega de una vez).
// Se suben UNA sola vez y la misma URL queda guardada en todas las fichas del
// lote: son literalmente la misma foto, y repetir la subida por ficha
// multiplicaría el tiempo y los datos móviles de planta sin cambiar nada de lo
// que se ve después. Por eso no cuelgan de una ficha concreta.
export async function subirFotosLote(carpeta, archivos, onProgreso) {
  return subirFotos(`fichas/lotes/${carpeta}/${Date.now()}`, archivos, onProgreso);
}
