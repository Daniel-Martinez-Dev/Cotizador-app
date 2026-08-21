// Subida de imágenes a Cloudinary.
//
// Ninguna imagen de la app va a Firebase Storage: el proyecto está en plan
// Spark y activar Storage obliga a pasar a Blaze. Cloudinary cubre lo mismo en
// su capa gratuita y ya estaba en el proyecto para las fotos de producto, así
// que es el único sitio donde se suben imágenes: fotos de producto, foto de
// perfil y registro fotográfico de las fichas.
//
// La subida es "sin firmar" (unsigned): la app lleva el nombre de la nube y un
// preset, nunca el API secret. Dos consecuencias que hay que tener presentes:
//
//   · El preset es público — quien lea el bundle puede subir a la cuenta. Eso
//     se acota configurando el preset en Cloudinary (formatos permitidos, peso
//     máximo, carpeta), no desde aquí.
//   · No se puede borrar desde el cliente: borrar exige firma. Quitar una foto
//     en la app la saca del documento, pero el archivo se queda en Cloudinary.
//     Por eso en la app se habla de "quitar", no de "borrar".
//
// La firma dibujada del perfil no pasa por aquí: va incrustada en el documento
// del usuario porque termina dentro de la ficha impresa (ver firmaDibujo.js).

const CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
const UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

export function cloudinaryConfigurado() {
  return Boolean(CLOUD_NAME && UPLOAD_PRESET);
}

// Mensaje único para cuando faltan las credenciales. Sale tal cual en pantalla,
// así que dice qué hay que hacer, no solo qué falló.
const SIN_CREDENCIALES =
  "Falta configurar Cloudinary. Agrega VITE_CLOUDINARY_CLOUD_NAME y " +
  "VITE_CLOUDINARY_UPLOAD_PRESET al archivo .env y vuelve a compilar la app.";

// Sube una imagen y devuelve lo que se guarda en el documento: la URL para
// mostrarla y el identificador del archivo en Cloudinary, que sirve para
// encontrarlo desde la consola.
//
// `archivo` puede ser un File del selector o un Blob ya comprimido; se le pone
// nombre porque Cloudinary usa el del archivo para deducir el formato.
export async function subirImagenCloudinary(archivo, { carpeta, nombre = "imagen.jpg" } = {}) {
  if (!cloudinaryConfigurado()) throw new Error(SIN_CREDENCIALES);

  const form = new FormData();
  form.append("file", archivo, nombre);
  form.append("upload_preset", UPLOAD_PRESET);
  if (carpeta) form.append("folder", carpeta);

  let res;
  try {
    res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, {
      method: "POST",
      body: form,
    });
  } catch {
    // En planta se sube con datos móviles: caerse a mitad de subida es normal y
    // el mensaje del navegador ("Failed to fetch") no le dice nada a nadie.
    throw new Error("No se pudo conectar con el servidor de imágenes. Revisa la conexión.");
  }

  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(`El servidor de imágenes rechazó la foto: ${json?.error?.message || res.status}`);
  }
  return { url: json.secure_url, publicId: json.public_id || "" };
}
