import { subirImagenCloudinary } from "./cloudinary";
import { comprimirImagen } from "./fotosFicha";

// Foto del perfil de un usuario.
//
// A diferencia de la firma —que va incrustada en el perfil como data URI porque
// termina dentro de la ficha impresa (ver firmaDibujo.js)—, la foto solo se ve
// en la app, así que se sube a Cloudinary (ver cloudinary.js) y en el perfil
// queda su URL: es una imagen de verdad y no tiene por qué pesar en el
// documento del usuario, que se lee entero cada vez que se lista el directorio
// para el selector de firmantes.

const LADO_MAXIMO = 480; // basta para un avatar; la foto viene de la cámara

// Cambiar la foto no borra la anterior: Cloudinary no permite borrar sin firma
// y el API secret no puede vivir en la app. La foto vieja se queda ahí ocupando
// cuota, huérfana — se limpia desde la consola de Cloudinary si algún día
// estorba. A cambio, el perfil siempre apunta a una imagen que existe.
export async function subirFotoPerfil(uid, archivo) {
  if (!uid) throw new Error("UID requerido");
  const comprimida = await comprimirImagen(archivo, { maxLado: LADO_MAXIMO, calidad: 0.8 });
  const { url, publicId } = await subirImagenCloudinary(comprimida, {
    carpeta: `usuarios/${uid}`,
    nombre: `foto-${Date.now()}.jpg`,
  });
  return { url, publicId };
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
