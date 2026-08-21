// Lectura de códigos de barras. Hay dos aparatos distintos detrás y ninguno
// sirve para el otro caso:
//
//   Pistola USB/Bluetooth  → se comporta como un teclado: teclea el código de
//                            golpe y remata con Enter. Es lo que se usa en el
//                            PC de bodega (Windows) y funciona sin permisos.
//   Cámara del celular     → BarcodeDetector, el lector que ya trae el WebView
//                            de Android. Es lo que usa el operario en planta.
//
// Lo de la pistola se resuelve por la velocidad de tecleo: ninguna persona
// escribe 13 dígitos a menos de 60 ms por tecla, así que una ráfaga rápida
// terminada en Enter es un barrido y no alguien escribiendo en el buscador.

import { normalizarCodigoLeido } from "./codigoMaterial";

export const PAUSA_MAX_MS = 60;
export const LARGO_MINIMO = 4;

/**
 * Acumulador de teclas de una pistola lectora. Puro y sin DOM: recibe teclas ya
 * extraídas del evento, para poder probar el criterio de "ráfaga" sin navegador.
 *
 * @param {(codigo: string) => void} onCodigo  se llama con el código normalizado
 */
export function crearAcumuladorEscaner({ onCodigo, pausaMaxMs = PAUSA_MAX_MS, largoMinimo = LARGO_MINIMO } = {}) {
  let buffer = "";
  let ultimoTiempo = 0;

  const reiniciar = () => { buffer = ""; ultimoTiempo = 0; };

  const procesarTecla = ({ key, tiempo }) => {
    const t = Number(tiempo || 0);

    if (key === "Enter" || key === "Tab") {
      const codigo = normalizarCodigoLeido(buffer);
      reiniciar();
      // Un Enter suelto, o tras un buffer corto, es de una persona: se ignora
      // en vez de disparar una búsqueda vacía.
      if (codigo.length >= largoMinimo) {
        onCodigo?.(codigo);
        return true;
      }
      return false;
    }

    // Solo caracteres imprimibles sueltos; las teclas especiales llegan con
    // nombre largo ("Shift", "ArrowLeft") y no forman parte del código.
    if (!key || key.length !== 1) return false;

    // Pausa larga = alguien escribiendo. Se empieza a contar de cero desde esta
    // tecla, que puede ser ya el inicio de un barrido.
    if (ultimoTiempo && t - ultimoTiempo > pausaMaxMs) buffer = "";
    buffer += key;
    ultimoTiempo = t;
    return false;
  };

  return { procesarTecla, reiniciar, get buffer() { return buffer; } };
}

// ── Cámara ────────────────────────────────────────────────────────────────

export const FORMATOS = ["ean_13", "ean_8", "code_128", "code_39", "upc_a", "upc_e", "qr_code"];

export function soportaCamara() {
  return typeof navigator !== "undefined" && !!navigator.mediaDevices?.getUserMedia;
}

// BarcodeDetector viene en el WebView de Android (Chromium 83+) y en Chrome de
// Android, pero NO en Chrome/Electron de escritorio. Por eso en Windows el
// camino bueno es la pistola, y la UI lo dice en vez de dejar la cámara colgada.
export function soportaDetectorNativo() {
  return typeof window !== "undefined" && typeof window.BarcodeDetector !== "undefined";
}

export async function formatosSoportados() {
  if (!soportaDetectorNativo()) return [];
  try {
    const disponibles = await window.BarcodeDetector.getSupportedFormats();
    return FORMATOS.filter((f) => disponibles.includes(f));
  } catch {
    return [];
  }
}

/**
 * Enciende la cámara trasera y avisa cada vez que reconoce un código.
 * Devuelve una función para apagarla; llamarla siempre al cerrar, porque si no
 * el led de la cámara se queda encendido y el celular se calienta.
 *
 * @returns {Promise<() => void>} detener()
 */
export async function iniciarEscaneoCamara({ video, onCodigo, onError, intervaloMs = 250 } = {}) {
  if (!video) throw new Error("Falta el elemento de video");
  if (!soportaCamara()) throw new Error("Este dispositivo no expone la cámara al navegador");
  if (!soportaDetectorNativo()) throw new Error("Este dispositivo no puede leer códigos con la cámara");

  const formatos = await formatosSoportados();
  if (formatos.length === 0) throw new Error("La cámara no reconoce formatos de código de barras");

  const detector = new window.BarcodeDetector({ formats: formatos });
  // `environment` es la cámara trasera: la frontal enfocaría la cara del
  // operario, no la etiqueta.
  const stream = await navigator.mediaDevices.getUserMedia({
    video: { facingMode: { ideal: "environment" } },
    audio: false,
  });

  let detenido = false;
  let timer = 0;

  const detener = () => {
    if (detenido) return;
    detenido = true;
    clearTimeout(timer);
    for (const track of stream.getTracks()) track.stop();
    try { video.srcObject = null; } catch { /* el nodo ya se desmontó */ }
  };

  video.srcObject = stream;
  video.setAttribute("playsinline", "true"); // iOS/WebView: si no, abre a pantalla completa
  video.muted = true;
  try {
    await video.play();
  } catch (e) {
    detener();
    throw e;
  }

  const ciclo = async () => {
    if (detenido) return;
    try {
      const codigos = await detector.detect(video);
      const valor = codigos?.[0]?.rawValue;
      if (valor) {
        const codigo = normalizarCodigoLeido(valor);
        if (codigo) onCodigo?.(codigo);
      }
    } catch (e) {
      // Un fallo suelto de detección no debe apagar la cámara: pasa cuando el
      // frame llega a medio pintar. Solo se reporta.
      onError?.(e);
    }
    if (!detenido) timer = setTimeout(ciclo, intervaloMs);
  };

  timer = setTimeout(ciclo, intervaloMs);
  return detener;
}

// Confirmación física del barrido: en planta hay ruido y el operario no está
// mirando la pantalla mientras apunta.
export function vibrarConfirmacion(ms = 60) {
  try {
    navigator?.vibrate?.(ms);
  } catch { /* el navegador no soporta vibración */ }
}
