import { storage, waitForAuth } from "../firebase";
import { ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import { comprimirImagen } from "./fotosFicha";

// Foto del perfil de un usuario.
//
// A diferencia de la firma —que va incrustada en el perfil como data URI porque
// termina dentro de la ficha impresa (ver firmaDibujo.js)—, la foto solo se ve
// en la app, así que va a Storage: es una imagen de verdad y no tiene por qué
// pesar en el documento del usuario, que se lee entero cada vez que se lista el
// directorio para el selector de firmantes.

const LADO_MAXIMO = 480; // basta para un avatar; la foto viene de la cámara

// Cada foto se guarda con un nombre nuevo en vez de pisar la anterior: la URL
// de descarga de Storage es la misma para una ruta dada, y el navegador seguiría
// mostrando la foto vieja desde su caché.
export async function subirFotoPerfil(uid, archivo) {
  if (!uid) throw new Error("UID requerido");
  await waitForAuth();
  const comprimida = await comprimirImagen(archivo, { maxLado: LADO_MAXIMO, calidad: 0.8 });
  const path = `usuarios/${uid}/foto-${Date.now()}.jpg`;
  const destino = ref(storage, path);
  await uploadBytes(destino, comprimida, { contentType: "image/jpeg" });
  return { url: await getDownloadURL(destino), path };
}

// Best-effort, igual que con las fotos de ficha: si la anterior ya no está en
// Storage no hay por qué frenar el cambio de foto.
export async function borrarFotoPerfil(path) {
  if (!path) return;
  try {
    await waitForAuth();
    await deleteObject(ref(storage, path));
  } catch (e) {
    console.error("No se pudo borrar la foto de perfil:", e);
  }
}

// Iniciales para el avatar de quien todavía no subió foto.
export function inicialesDe(nombre, email) {
  const limpio = (nombre || "").trim();
  if (limpio) {
    const partes = limpio.split(/\s+/).filter(Boolean);
    return (partes[0][0] + (partes[1]?.[0] || "")).toUpperCase();
  }
  return (email || "?").trim().charAt(0).toUpperCase() || "?";
}
