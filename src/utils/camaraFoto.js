// Cámara para el registro fotográfico de las fichas (alistado y entrega).
//
// En Android la app corre dentro del WebView de Capacitor, y ahí un
// `<input type="file" accept="image/*">` NO ofrece la cámara: el selector que
// abre Capacitor es el de documentos, así que planta solo veía la galería y no
// tenía forma de tomar la foto en el momento. Poner `capture` en el input
// arregla eso pero rompe lo contrario —deja fuera la galería—, así que la
// cámara se abre aquí, dentro de la app, con getUserMedia: es el mismo camino
// que ya usa el lector de códigos de barras (ver escanerCodigo.js), el permiso
// de CAMERA ya está declarado en el manifiesto y viaja en una actualización
// web, sin plugin nativo ni APK nuevo.
//
// El `capture` del input queda como plan B en FotosFichaPicker, para el aparato
// donde el WebView no entregue la cámara por getUserMedia.

export const LADO_CAPTURA = 1920; // pedido a la cámara; al subir se reduce a 1600

export function soportaCamaraFoto() {
  return typeof navigator !== "undefined" && !!navigator.mediaDevices?.getUserMedia;
}

// Hay cámara conectada, sin pedir permiso todavía. Antes de conceder permiso el
// navegador oculta los nombres, pero sí dice cuántas entradas de vídeo hay, que
// es lo único que hace falta para decidir si se ofrece el botón.
export async function hayCamaraDisponible() {
  if (!soportaCamaraFoto() || !navigator.mediaDevices.enumerateDevices) return false;
  try {
    const dispositivos = await navigator.mediaDevices.enumerateDevices();
    return dispositivos.some((d) => d.kind === "videoinput");
  } catch {
    // Si no se puede consultar, se asume que sí: es peor esconder el botón en
    // el celular de planta que ofrecerlo y que falle con un mensaje claro.
    return true;
  }
}

/**
 * Enciende la cámara sobre un <video> y devuelve la función para apagarla.
 * Hay que llamarla siempre al cerrar: si no, el led se queda encendido y el
 * teléfono se calienta con la app abierta en otra pantalla.
 *
 * @returns {Promise<() => void>} detener()
 */
export async function abrirCamaraFoto({ video, camara = "environment" } = {}) {
  if (!video) throw new Error("Falta el elemento de video");
  if (!soportaCamaraFoto()) throw new Error("Este dispositivo no expone la cámara a la app");

  // `environment` es la trasera: la evidencia es del producto, no de quien la
  // toma. `ideal` y no `exact` para que un equipo con una sola cámara —una
  // tablet o el PC de oficina— siga abriendo la que tenga.
  const stream = await navigator.mediaDevices.getUserMedia({
    video: {
      facingMode: { ideal: camara },
      width: { ideal: LADO_CAPTURA },
      height: { ideal: LADO_CAPTURA },
    },
    audio: false,
  });

  let detenido = false;
  const detener = () => {
    if (detenido) return;
    detenido = true;
    for (const track of stream.getTracks()) track.stop();
    try { video.srcObject = null; } catch { /* el nodo ya se desmontó */ }
  };

  video.srcObject = stream;
  video.setAttribute("playsinline", "true"); // si no, el WebView abre a pantalla completa
  video.muted = true;
  try {
    await video.play();
  } catch (e) {
    detener();
    throw e;
  }
  return detener;
}

// Congela el frame actual en un JPEG. Sale a tamaño completo del sensor tal
// como lo entrega el vídeo; la reducción real la hace `comprimirImagen` al
// subir, que es donde vive el criterio de peso (ver fotosFicha.js).
export function capturarFoto(video, { nombre = `foto-${Date.now()}.jpg`, calidad = 0.92 } = {}) {
  return new Promise((resolve, reject) => {
    const ancho = video?.videoWidth || 0;
    const alto = video?.videoHeight || 0;
    if (!ancho || !alto) return reject(new Error("La cámara todavía no entrega imagen"));

    const canvas = document.createElement("canvas");
    canvas.width = ancho;
    canvas.height = alto;
    canvas.getContext("2d").drawImage(video, 0, 0, ancho, alto);
    canvas.toBlob(
      (blob) => {
        if (!blob) return reject(new Error("No se pudo tomar la foto"));
        resolve(new File([blob], nombre, { type: "image/jpeg", lastModified: Date.now() }));
      },
      "image/jpeg",
      calidad
    );
  });
}

// Mensaje de por qué no abrió, en los términos de quien está en planta con el
// celular en la mano.
export function mensajeErrorCamara(e) {
  if (e?.name === "NotAllowedError") {
    return "Permiso de cámara denegado. Actívalo en los ajustes de la app y vuelve a intentarlo.";
  }
  if (e?.name === "NotFoundError" || e?.name === "OverconstrainedError") {
    return "Este equipo no tiene cámara disponible.";
  }
  if (e?.name === "NotReadableError") {
    return "Otra aplicación está usando la cámara. Ciérrala y vuelve a intentarlo.";
  }
  return e?.message || "No se pudo abrir la cámara";
}
