import { Capacitor } from "@capacitor/core";
import { Filesystem, Directory } from "@capacitor/filesystem";
import { Share } from "@capacitor/share";

// Captura de la ficha como imagen para pegarla en un chat/correo.
//
// La imagen NO se reconstruye elemento por elemento con una librería (ese era el
// enfoque anterior, con html2canvas, que reimplementa el motor de render y se
// equivocaba con los planos SVG y con la posición del texto). Aquí la ficha se
// mete tal cual dentro de un <svg><foreignObject> y se pinta en un canvas: quien
// dibuja es el navegador, con su mismo motor de siempre. Es, en la práctica, una
// captura de pantalla de la ficha completa.
//
// Como se renderiza fuera de pantalla a su ancho de diseño (el mismo que se
// imprime), la imagen sale idéntica desde un celular o desde un PC, sin depender
// del tamaño de la pantalla ni del zoom del visor.

export const ESCALA_HD = 2; // 1220 px de diseño → 2440 px de ancho real

export async function fichaAPngBlob(origen, { anchoDiseno = 1220, escala = ESCALA_HD } = {}) {
  // La tipografía heredada se copia del elemento real: dentro del foreignObject
  // no llegan las hojas de estilo de la página (Tailwind fija line-height 1.5 en
  // el documento) y, sin esto, la ficha se dibujaba ~11% más comprimida que en
  // pantalla, con un sobrante en blanco al final.
  const heredado = window.getComputedStyle(origen);
  const tipografia =
    `font-family:${heredado.fontFamily};font-size:${heredado.fontSize};` +
    `line-height:${proporcionDeInterlineado(heredado)};color:${heredado.color};`;

  const contenedor = document.createElement("div");
  contenedor.setAttribute("aria-hidden", "true");
  contenedor.style.cssText =
    `position:absolute;left:-100000px;top:0;width:${anchoDiseno}px;background:#ffffff;${tipografia}`;
  contenedor.innerHTML = origen.innerHTML;
  document.body.appendChild(contenedor);

  try {
    // Dentro del foreignObject no se pueden resolver URLs externas: el logo y los
    // planos en PNG deben viajar incrustados en la propia imagen.
    await incrustarImagenes(contenedor);
    const alto = Math.ceil(contenedor.getBoundingClientRect().height);

    const svg = envolverEnSvg(contenedor, anchoDiseno, alto, tipografia);
    const imagen = await cargarImagen(`data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`);
    await decodificar(imagen);

    const canvas = document.createElement("canvas");
    canvas.width = Math.round(anchoDiseno * escala);
    canvas.height = Math.round(alto * escala);
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    // El destino es el doble del diseño y el origen es vectorial, así que el
    // navegador rasteriza a esa resolución: el texto sale nítido, no ampliado.
    ctx.drawImage(imagen, 0, 0, canvas.width, canvas.height);

    return await canvasABlob(canvas);
  } finally {
    contenedor.remove();
  }
}

// El interlineado se hereda como proporción (1.5), no como el valor absoluto que
// devuelve el navegador (24px): heredar 24px se lo aplicaría igual a los textos
// de 9 px de las tarjetas, inflando la ficha entera.
function proporcionDeInterlineado(estilo) {
  const alto = parseFloat(estilo.lineHeight);
  const tamano = parseFloat(estilo.fontSize);
  if (!alto || !tamano) return "normal";
  return (alto / tamano).toFixed(4);
}

// El contenido va como XHTML (el foreignObject exige XML bien formado) y sin la
// posición fuera de pantalla del contenedor, que dentro de la imagen dejaría la
// ficha fuera del lienzo.
function envolverEnSvg(contenedor, ancho, alto, tipografia) {
  const clon = contenedor.cloneNode(true);
  clon.removeAttribute("aria-hidden");
  clon.style.cssText = `width:${ancho}px;background:#ffffff;${tipografia}`;

  let xhtml = new XMLSerializer().serializeToString(clon);
  if (!xhtml.includes("xmlns=")) {
    xhtml = xhtml.replace("<div", '<div xmlns="http://www.w3.org/1999/xhtml"');
  }

  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${ancho}" height="${alto}" viewBox="0 0 ${ancho} ${alto}">` +
    `<foreignObject x="0" y="0" width="${ancho}" height="${alto}">${xhtml}</foreignObject>` +
    `</svg>`
  );
}

async function incrustarImagenes(raiz) {
  const imgs = Array.from(raiz.querySelectorAll("img"));
  await Promise.all(
    imgs.map(async (img) => {
      const src = img.getAttribute("src");
      if (!src || src.startsWith("data:")) return;
      try {
        const resp = await fetch(src);
        const blob = await resp.blob();
        img.setAttribute("src", await blobABase64Url(blob));
        // Hay que esperar a que quede decodificada: al rasterizar el SVG, el
        // navegador no descarga ni decodifica nada nuevo, así que una imagen
        // aún sin decodificar sale en blanco (era lo que pasaba con los planos
        // de Sello y Abrigo, los archivos más pesados).
        await decodificar(img);
      } catch (e) {
        console.error("No se pudo incrustar una imagen de la ficha", src, e);
      }
    })
  );
}

function cargarImagen(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.addEventListener("load", () => resolve(img), { once: true });
    img.addEventListener("error", () => reject(new Error("No se pudo dibujar la ficha")), { once: true });
    img.src = src;
  });
}

// decode() espera a que la imagen esté lista para pintarse, no solo descargada.
// Si el navegador no lo soporta, se cae a esperar el evento load.
function decodificar(img) {
  if (typeof img.decode === "function") {
    return img.decode().catch(() => esperarCarga(img));
  }
  return esperarCarga(img);
}

function esperarCarga(img) {
  if (img.complete && img.naturalWidth > 0) return Promise.resolve();
  return new Promise((resolve) => {
    img.addEventListener("load", resolve, { once: true });
    img.addEventListener("error", resolve, { once: true });
  });
}

function canvasABlob(canvas) {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("No se pudo generar la imagen"))),
      "image/png"
    );
  });
}

// Deja la imagen donde el usuario la pueda pegar. Devuelve qué se pudo hacer,
// para avisarlo en pantalla:
//   "copiado"     — quedó en el portapapeles (web/escritorio)
//   "compartido"  — Android: se abrió el menú de compartir
//   "descargado"  — el navegador no permite copiar imágenes: se descargó
export async function copiarImagenFicha(blobPromise, nombreArchivo) {
  if (Capacitor.isNativePlatform()) {
    await compartirEnAndroid(await blobPromise, nombreArchivo);
    return "compartido";
  }

  // El ClipboardItem se construye con la promesa (no con el blob ya resuelto)
  // porque Safari exige que la escritura al portapapeles salga del mismo gesto
  // del usuario que abrió la acción; si se espera antes, la rechaza.
  if (navigator.clipboard?.write && typeof window.ClipboardItem === "function") {
    try {
      await navigator.clipboard.write([new window.ClipboardItem({ "image/png": blobPromise })]);
      return "copiado";
    } catch (e) {
      console.error("No se pudo copiar al portapapeles, se descarga la imagen", e);
    }
  }

  descargar(await blobPromise, nombreArchivo);
  return "descargado";
}

function descargar(blob, nombreArchivo) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = nombreArchivo;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

async function compartirEnAndroid(blob, nombreArchivo) {
  const base64 = await blobABase64(blob);
  await Filesystem.writeFile({ path: nombreArchivo, data: base64, directory: Directory.Cache });
  const { uri } = await Filesystem.getUri({ path: nombreArchivo, directory: Directory.Cache });
  await Share.share({ title: nombreArchivo, url: uri, dialogTitle: "Compartir ficha" });
}

function blobABase64Url(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(String(reader.result));
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

async function blobABase64(blob) {
  return String(await blobABase64Url(blob)).split(",")[1];
}
