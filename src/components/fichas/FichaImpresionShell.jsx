import React from "react";
import toast from "react-hot-toast";
import {
  FaPrint, FaTimes, FaFileAlt, FaSearchPlus, FaSearchMinus, FaCompressArrowsAlt,
  FaRegCopy, FaCheck,
} from "react-icons/fa";
import { fichaAPngBlob, copiarImagenFicha } from "../../utils/fichaImagen";

// Modal + lógica de impresión compartida por las fichas de impresión
// (Abrigo, Sello, División Térmica, Puerta Rápida). El contenido imprimible
// propio de cada producto (encabezado, planos, tablas, pie) se pasa como children.
//
// Las fichas están diseñadas para una hoja carta horizontal (~1220 px de ancho):
// sus rejillas y tamaños de letra están en px fijos para que lo que se ve en
// pantalla sea idéntico a lo que sale impreso. Por eso el contenido NUNCA se
// re-fluye para pantallas angostas —en un celular las columnas quedaban
// aplastadas e ilegibles—: se renderiza siempre a su ancho de diseño y se
// escala con transform, como un visor de PDF, con zoom y desplazamiento.
const ZOOM_MIN = 0.2;
const ZOOM_MAX = 3;
const ZOOM_STEP = 1.5;

export default function FichaImpresionShell({
  productLabel,
  numero,
  cliente,
  onClose,
  maxWidthClass = "max-w-5xl",
  designWidth = 1220,
  windowSize = { width: 1120, height: 980 },
  children,
}) {
  const printRef = React.useRef(null);
  const viewportRef = React.useRef(null);
  const [printing, setPrinting] = React.useState(false);

  // Medidas para el escalado: ancho disponible del visor y alto natural del
  // contenido (transform no altera la caja de layout, así que offsetHeight
  // sigue siendo el alto sin escalar).
  const [viewportWidth, setViewportWidth] = React.useState(0);
  const [contentSize, setContentSize] = React.useState({ width: designWidth, height: 0 });
  const [zoom, setZoom] = React.useState(null); // null = ajustar al ancho

  React.useEffect(() => {
    const onKeyDown = (e) => { if (e.key === "Escape") onClose?.(); };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  React.useLayoutEffect(() => {
    const viewport = viewportRef.current;
    const content = printRef.current;
    if (!viewport || !content) return;

    const medir = () => {
      setViewportWidth(viewport.clientWidth);
      // scrollWidth por si alguna ficha desborda su ancho de diseño (una tabla
      // con mínimos, por ejemplo): así se escala y se muestra completa en vez
      // de quedar recortada.
      setContentSize({
        width: Math.max(designWidth, content.scrollWidth),
        height: content.offsetHeight,
      });
    };
    medir();

    const ro = new ResizeObserver(medir);
    ro.observe(viewport);
    ro.observe(content);
    window.addEventListener("resize", medir);
    return () => { ro.disconnect(); window.removeEventListener("resize", medir); };
  }, [designWidth]);

  const fitScale = viewportWidth > 0 ? Math.min(1, viewportWidth / contentSize.width) : 1;
  const scale = zoom ?? fitScale;
  const necesitaZoom = fitScale < 0.995; // pantalla más angosta que la ficha

  const aplicarZoom = (nuevo) => setZoom(Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, nuevo)));

  // ── Impresión ────────────────────────────────────────────────────────────
  const buildHtml = () => `<!DOCTYPE html><html><head>
      <meta charset="utf-8"/>
      <title>Ficha ${productLabel} ${numero} — ${cliente || ""}</title>
      <style>
        * { box-sizing: border-box; }
        html, body { margin: 0; padding: 0; }
        body { margin: 8mm; font-family: Arial, sans-serif; background: white; color: #111; }
        table { border-collapse: collapse; width: 100%; }
        td, th { border: 1px solid #999; padding: 4px 7px; font-size: 12px; vertical-align: middle; }
        @media print { body { margin: 5mm; } @page { size: letter landscape; margin: 0; } }
      </style>
    </head><body><div id="print-content">${printRef.current.innerHTML}</div></body></html>`;

  // Encoge el contenido (si hace falta) para que cualquier ficha, sin importar
  // cuántas filas/insumos tenga, entre siempre en una sola página carta (Letter)
  // horizontal — el tamaño real en el que se imprime. Si este cálculo usara
  // A4 (más ancho que carta) y el driver de impresión luego reescala a carta,
  // el contenido se encoge dos veces y el texto sale más pequeño de lo previsto.
  const fitToOnePageAndPrint = (targetWin) => {
    try {
      const el = targetWin.document.getElementById("print-content");
      if (el) {
        const mmToPx = 96 / 25.4;
        const pageW = (279.4 - 10) * mmToPx; // Carta (Letter) horizontal menos márgenes de 5mm
        const pageH = (215.9 - 10) * mmToPx;
        const escala = Math.min(1, pageW / el.scrollWidth, pageH / el.scrollHeight);
        if (escala < 1) el.style.zoom = escala;
      }
      targetWin.focus();
      targetWin.print();
    } catch (e) {
      console.error("No se pudo imprimir la ficha", e);
    } finally {
      setPrinting(false);
    }
  };

  const cuandoCargue = (targetWin, accion) => {
    if (targetWin.document.readyState === "complete") {
      setTimeout(accion, 250);
    } else {
      targetWin.addEventListener("load", () => setTimeout(accion, 250));
    }
  };

  // Plan B cuando no hay ventana emergente disponible (bloqueador del
  // navegador, WebView del celular, o un handler de Electron que la deniega):
  // se imprime desde un iframe fuera de pantalla — mismo HTML, mismo escalado.
  const imprimirConIframe = (html) => {
    const iframe = document.createElement("iframe");
    iframe.setAttribute("aria-hidden", "true");
    // Fuera de pantalla pero con tamaño real: el cálculo de escalado necesita
    // que el contenido tenga layout (un iframe de 0×0 mide 0).
    iframe.style.cssText = `position:fixed;left:-10000px;top:0;width:${designWidth}px;height:900px;border:0;`;
    document.body.appendChild(iframe);

    const limpiar = () => setTimeout(() => iframe.remove(), 2000);
    try {
      const doc = iframe.contentWindow.document;
      doc.open();
      doc.write(html);
      doc.close();
      cuandoCargue(iframe.contentWindow, () => {
        fitToOnePageAndPrint(iframe.contentWindow);
        limpiar();
      });
    } catch (e) {
      console.error("No se pudo preparar la impresión", e);
      iframe.remove();
      setPrinting(false);
      alert("No se pudo abrir la impresión de la ficha. Intenta de nuevo o usa Ctrl/Cmd + P.");
    }
  };

  const handlePrint = () => {
    if (!printRef.current) return;
    setPrinting(true);
    const html = buildHtml();

    let win = null;
    try {
      win = window.open("", "_blank", `width=${windowSize.width},height=${windowSize.height}`);
    } catch { win = null; }

    if (!win) {
      imprimirConIframe(html);
      return;
    }

    try {
      win.document.write(html);
      win.document.close();
      cuandoCargue(win, () => fitToOnePageAndPrint(win));
    } catch (e) {
      console.error("No se pudo escribir la ventana de impresión", e);
      try { win.close(); } catch { /* noop */ }
      imprimirConIframe(html);
    }
  };

  // ── Copiar la ficha como imagen ──────────────────────────────────────────
  // Se rasteriza siempre al ancho de diseño (no al de la pantalla), así la
  // imagen sale igual de grande desde un celular que desde un PC.
  const [copiando, setCopiando] = React.useState(false);
  const [copiado, setCopiado] = React.useState(false);

  const handleCopiarImagen = async () => {
    if (!printRef.current || copiando) return;
    setCopiando(true);
    const nombreArchivo = `Ficha_${String(numero || "").replace(/[^\w-]/g, "") || "produccion"}.png`;
    try {
      const blobPromise = fichaAPngBlob(printRef.current, { anchoDiseno: designWidth });
      const resultado = await copiarImagenFicha(blobPromise, nombreArchivo);
      if (resultado === "copiado") {
        setCopiado(true);
        setTimeout(() => setCopiado(false), 2500);
        toast.success("Ficha copiada — pégala donde la necesites");
      } else if (resultado === "descargado") {
        toast.success("Tu navegador no permite copiar imágenes: se descargó la ficha");
      }
    } catch (e) {
      console.error("No se pudo generar la imagen de la ficha", e);
      toast.error("No se pudo generar la imagen de la ficha");
    } finally {
      setCopiando(false);
    }
  };

  const onBackdropClick = (e) => { if (e.target === e.currentTarget) onClose?.(); };

  const botonZoom = "inline-flex items-center justify-center h-8 w-8 rounded-lg border border-gray-300 bg-white text-gray-600 hover:bg-gray-100 disabled:opacity-40 transition";

  return (
    <div
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex justify-center sm:items-start sm:overflow-auto sm:py-6 sm:px-4 animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-label={`Ficha ${productLabel} ${numero}`}
      onMouseDown={onBackdropClick}
    >
      <div className={`relative w-full ${maxWidthClass} h-full sm:h-auto flex flex-col`}>
        {/* Hojas apiladas detrás, para dar sensación de documento físico */}
        <div className="hidden sm:block absolute inset-x-3 -bottom-2 h-full bg-white/40 rounded-xl -z-10" aria-hidden="true" />
        <div className="hidden sm:block absolute inset-x-1.5 -bottom-1 h-full bg-white/70 rounded-xl -z-10" aria-hidden="true" />

        <div className="bg-white w-full flex-1 min-h-0 flex flex-col sm:block rounded-none sm:rounded-xl shadow-2xl overflow-hidden ring-1 ring-black/5">

          {/* ── Barra de acciones (no se imprime) ── */}
          <div className="shrink-0 flex items-center justify-between gap-2 px-3 sm:px-5 py-2.5 sm:py-3 bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200 print:hidden">
            <span className="flex items-center gap-2 text-sm font-semibold text-gray-700 min-w-0">
              <span className="hidden sm:flex items-center justify-center h-7 w-7 rounded-lg bg-blue-600/10 text-blue-700 shrink-0">
                <FaFileAlt className="text-xs" />
              </span>
              <span className="truncate">
                <span className="font-mono">{numero}</span>
                <span className="hidden sm:inline text-gray-400 font-normal"> — {productLabel}</span>
              </span>
            </span>

            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
              {necesitaZoom && (
                <div className="flex items-center gap-1 mr-0.5">
                  <button onClick={() => aplicarZoom(scale / ZOOM_STEP)} disabled={scale <= ZOOM_MIN + 0.001}
                    className={botonZoom} aria-label="Alejar" title="Alejar">
                    <FaSearchMinus className="text-xs" />
                  </button>
                  <button onClick={() => setZoom(null)} className={botonZoom} aria-label="Ajustar al ancho" title="Ajustar al ancho">
                    <FaCompressArrowsAlt className="text-xs" />
                  </button>
                  <button onClick={() => aplicarZoom(scale * ZOOM_STEP)} disabled={scale >= ZOOM_MAX - 0.001}
                    className={botonZoom} aria-label="Acercar" title="Acercar">
                    <FaSearchPlus className="text-xs" />
                  </button>
                </div>
              )}
              <button onClick={handleCopiarImagen} disabled={copiando}
                title="Copiar la ficha como imagen en alta resolución"
                className="inline-flex items-center gap-2 px-3 sm:px-4 py-1.5 h-8 bg-white hover:bg-gray-100 disabled:opacity-60 active:scale-95 text-gray-700 text-sm rounded-lg border border-gray-300 font-medium transition">
                {copiado ? <FaCheck className="text-green-600" /> : <FaRegCopy className={copiando ? "animate-pulse" : ""} />}
                <span className="hidden sm:inline">
                  {copiando ? "Generando…" : copiado ? "¡Copiada!" : "Copiar imagen"}
                </span>
              </button>
              <button onClick={handlePrint} disabled={printing}
                className="inline-flex items-center gap-2 px-3 sm:px-4 py-1.5 h-8 bg-blue-600 hover:bg-blue-500 disabled:opacity-60 active:scale-95 text-white text-sm rounded-lg font-medium shadow-sm transition">
                <FaPrint className={printing ? "animate-pulse" : ""} />
                <span className="hidden sm:inline">{printing ? "Preparando…" : "Imprimir / PDF"}</span>
              </button>
              <button onClick={onClose} aria-label="Cerrar" title="Cerrar (Esc)"
                className="inline-flex items-center gap-2 px-3 sm:px-4 py-1.5 h-8 bg-white hover:bg-gray-100 text-gray-700 text-sm rounded-lg border border-gray-300 transition">
                <FaTimes /> <span className="hidden sm:inline">Cerrar</span>
              </button>
            </div>
          </div>

          {/* ── Visor: contenido a tamaño de diseño, escalado al espacio disponible ── */}
          <div ref={viewportRef} className="flex-1 min-h-0 overflow-auto bg-gray-100 sm:bg-white">
            <div
              style={{
                width: contentSize.width * scale,
                height: contentSize.height ? contentSize.height * scale : undefined,
                margin: "0 auto",
                // El hijo conserva su caja de layout sin escalar (transform no la
                // altera), así que se recorta: lo que se pinta —ya escalado— ocupa
                // exactamente esta caja, y el scroll no gana espacio fantasma.
                overflow: "hidden",
              }}
            >
              {/* Contenido imprimible — su innerHTML es lo que se manda a la impresora */}
              <div
                ref={printRef}
                style={{
                  width: designWidth,
                  transform: `scale(${scale})`,
                  transformOrigin: "top left",
                  fontFamily: "Arial, sans-serif",
                  color: "#111",
                  background: "white",
                }}
              >
                {children}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
