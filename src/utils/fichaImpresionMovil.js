import { Filesystem, Directory } from "@capacitor/filesystem";
import { Share } from "@capacitor/share";
import { fichaAPngBlob } from "./fichaImagen";

// Imprimir la ficha desde el celular (app Android).
//
// El WebView de Android no implementa window.print(): no hay diálogo de
// impresión al que llamar. Y window.open() dentro de la app le pasa el enlace
// al navegador del sistema, que con una ventana en blanco responde "el enlace
// no es válido" — que es exactamente el error que aparecía al darle Imprimir.
//
// Lo que sí existe en el teléfono es el servicio de impresión de Android. Así
// que la ficha se arma como un PDF de una sola página (carta horizontal, la
// misma hoja que sale del PC) y se entrega por el menú de compartir: desde ahí
// se elige la app de la impresora, "Guardar en Drive" o "Archivos".
//
// jsPDF se carga bajo demanda (import dinámico) para no engordar el arranque
// de la app: solo hace falta cuando alguien imprime desde el celular.

const CARTA_HORIZONTAL_MM = { ancho: 279.4, alto: 215.9 };
const MARGEN_MM = 5;

export async function fichaAPdfBlob(nodo, { anchoDiseno = 1220 } = {}) {
  // Se rasteriza en modo ahorro de tinta: lo que se comparte es para imprimir.
  const png = await fichaAPngBlob(nodo, { anchoDiseno, ahorroTinta: true });
  const dataUrl = await blobADataUrl(png);
  const { width, height } = await medirImagen(dataUrl);

  const { jsPDF } = await import("jspdf");
  const pdf = new jsPDF({ orientation: "landscape", unit: "mm", format: "letter" });

  // La ficha entra completa en la hoja conservando su proporción y centrada,
  // igual que el ajuste a una página de la impresión de escritorio.
  const dispW = CARTA_HORIZONTAL_MM.ancho - MARGEN_MM * 2;
  const dispH = CARTA_HORIZONTAL_MM.alto - MARGEN_MM * 2;
  const escala = Math.min(dispW / width, dispH / height);
  const w = width * escala;
  const h = height * escala;
  pdf.addImage(dataUrl, "PNG", (CARTA_HORIZONTAL_MM.ancho - w) / 2, (CARTA_HORIZONTAL_MM.alto - h) / 2, w, h);

  return pdf.output("blob");
}

export async function compartirFichaParaImprimir(nodo, { anchoDiseno = 1220, nombreArchivo = "Ficha.pdf" } = {}) {
  const pdf = await fichaAPdfBlob(nodo, { anchoDiseno });
  const base64 = await blobABase64(pdf);

  await Filesystem.writeFile({ path: nombreArchivo, data: base64, directory: Directory.Cache });
  const { uri } = await Filesystem.getUri({ path: nombreArchivo, directory: Directory.Cache });

  const opciones = { title: nombreArchivo, dialogTitle: "Imprimir o compartir la ficha" };
  try {
    await Share.share({ ...opciones, files: [uri] });
  } catch (e) {
    if (esCancelacion(e)) throw e;
    // Versiones viejas del plugin solo entienden `url` para adjuntar archivos.
    console.warn("Compartir con files falló, se reintenta con url", e);
    await Share.share({ ...opciones, url: uri });
  }
}

// El usuario cerró el menú de compartir sin elegir nada: no es un fallo, pero
// tampoco hay que reintentar con otra forma de compartir.
export function esCancelacion(e) {
  return /cancel/i.test(String(e?.message || e || ""));
}

function medirImagen(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
    img.onerror = () => reject(new Error("No se pudo medir la imagen de la ficha"));
    img.src = src;
  });
}

function blobADataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(String(reader.result));
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

async function blobABase64(blob) {
  return String(await blobADataUrl(blob)).split(",")[1];
}
