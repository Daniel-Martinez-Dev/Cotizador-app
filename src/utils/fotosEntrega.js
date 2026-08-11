import { storage, waitForAuth } from "../firebase";
import { ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";

// Registro fotográfico de la entrega de una ficha.
//
// Las fotos las toma la planta con el celular (10–15 MP, 4–8 MB cada una). Subir
// eso tal cual es inviable con datos móviles y no aporta nada: la foto es
// evidencia de que se entregó, no un plano. Por eso todo pasa primero por
// `comprimirImagen`, que las deja en ~200–400 KB.

const LADO_MAXIMO = 1600;   // px del lado mayor
const CALIDAD_JPEG = 0.75;
export const MAX_FOTOS = 8;
export const TAMANO_MAXIMO_BYTES = 8 * 1024 * 1024; // tope que aceptan las reglas de Storage

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

// Sube las fotos y devuelve lo que se guarda en la ficha: la URL para mostrarla
// y la ruta en Storage, necesaria para poder borrarla después.
export async function subirFotosEntrega(coleccion, fichaId, archivos, onProgreso) {
  const lista = Array.from(archivos || []);
  if (lista.length === 0) return [];
  await waitForAuth();

  const subidas = [];
  for (const [i, archivo] of lista.entries()) {
    onProgreso?.({ actual: i + 1, total: lista.length });
    const comprimida = await comprimirImagen(archivo);
    if (comprimida.size > TAMANO_MAXIMO_BYTES) {
      throw new Error(`La foto "${archivo.name}" es demasiado grande`);
    }
    const path = `fichas/${coleccion}/${fichaId}/entrega/${Date.now()}-${i}.jpg`;
    const destino = ref(storage, path);
    await uploadBytes(destino, comprimida, { contentType: "image/jpeg" });
    subidas.push({ url: await getDownloadURL(destino), path, nombre: archivo.name });
  }
  return subidas;
}

// Best-effort: si la foto ya no está en Storage no tiene sentido bloquear al
// usuario, lo que importa es que salga de la ficha.
export async function borrarFotoEntrega(path) {
  if (!path) return;
  try {
    await waitForAuth();
    await deleteObject(ref(storage, path));
  } catch (e) {
    console.error("No se pudo borrar la foto de Storage:", e);
  }
}
