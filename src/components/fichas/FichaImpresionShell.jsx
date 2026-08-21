import React from "react";
import toast from "react-hot-toast";
import { Capacitor } from "@capacitor/core";
import {
  FaPrint, FaTimes, FaFileAlt, FaSearchPlus, FaSearchMinus, FaCompressArrowsAlt,
  FaRegCopy, FaCheck,
} from "react-icons/fa";
import { fichaAPngBlob, copiarImagenFicha } from "../../utils/fichaImagen";
import { htmlParaImprimir } from "../../utils/impresionAhorroTinta";
import { compartirFichaParaImprimir, esCancelacion } from "../../utils/fichaImpresionMovil";

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

const clampZoom = (v) => Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, v));
const separacion = (a, b) => Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);

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

  const aplicarZoom = (nuevo) => setZoom(clampZoom(nuevo));

  // ── Zoom con los dedos ───────────────────────────────────────────────────
  // El WebView de Android trae desactivado el pinch-to-zoom nativo (Capacitor
  // lo controla con android.zoomEnabled, que por defecto es false), así que en
  // el celular la ficha solo se podía acercar con los botones de la barra. El
  // visor atiende el gesto por su cuenta: se acerca únicamente la ficha —la
  // barra de acciones no se deforma— y funciona igual en Android, en el
  // navegador y en el escritorio (Ctrl/⌘ + rueda o pellizco en el trackpad).
  const scaleRef = React.useRef(1);
  const contentWidthRef = React.useRef(designWidth);
  const pendingScrollRef = React.useRef(null);
  const [mostrarPista, setMostrarPista] = React.useState(true);

  // El scroll se ajusta después de pintar: `scale` es estado, así que en el
  // momento del gesto el contenedor todavía tiene el tamaño anterior.
  React.useLayoutEffect(() => {
    const viewport = viewportRef.current;
    const pendiente = pendingScrollRef.current;
    if (viewport && pendiente) {
      pendingScrollRef.current = null;
      viewport.scrollLeft = pendiente.left;
      viewport.scrollTop = pendiente.top;
    }
    scaleRef.current = scale;
    contentWidthRef.current = contentSize.width;
  });

  React.useEffect(() => {
    if (!mostrarPista) return undefined;
    const t = setTimeout(() => setMostrarPista(false), 5000);
    return () => clearTimeout(t);
  }, [mostrarPista]);

  React.useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return undefined;

    // Cuando la ficha es más angosta que el visor queda centrada por el
    // `margin: 0 auto`; ese margen entra en la conversión pantalla ↔ contenido.
    const margenH = (escala) => Math.max(0, (viewport.clientWidth - contentWidthRef.current * escala) / 2);

    const relativoAlVisor = (x, y) => {
      const rect = viewport.getBoundingClientRect();
      return { x: x - rect.left, y: y - rect.top };
    };

    const puntoMedio = (t0, t1) => relativoAlVisor((t0.clientX + t1.clientX) / 2, (t0.clientY + t1.clientY) / 2);

    // Punto de la ficha (en sus propias coordenadas) que hay bajo un punto de la pantalla.
    const enContenido = (punto, escala) => ({
      x: (viewport.scrollLeft + punto.x - margenH(escala)) / escala,
      y: (viewport.scrollTop + punto.y) / escala,
    });

    // Deja quieto en pantalla el punto que el usuario tiene entre los dedos;
    // sin esto la ficha "se escapa" del encuadre al acercar.
    const anclar = (punto, escalaNueva, foco) => {
      pendingScrollRef.current = {
        left: foco.x * escalaNueva - punto.x + margenH(escalaNueva),
        top: foco.y * escalaNueva - punto.y,
      };
    };

    const zoomHacia = (punto, escalaNueva) => {
      const actual = scaleRef.current;
      if (Math.abs(escalaNueva - actual) < 0.0005) return;
      anclar(punto, escalaNueva, enContenido(punto, actual));
      setMostrarPista(false);
      setZoom(escalaNueva);
    };

    let pinch = null;
    let tapInicio = null;
    let tapPrevio = null;

    const onTouchStart = (e) => {
      if (e.touches.length === 2) {
        tapInicio = null;
        const punto = puntoMedio(e.touches[0], e.touches[1]);
        pinch = {
          dist: separacion(e.touches[0], e.touches[1]),
          escala: scaleRef.current,
          foco: enContenido(punto, scaleRef.current),
        };
        return;
      }
      pinch = null;
      tapInicio = e.touches.length === 1
        ? { x: e.touches[0].clientX, y: e.touches[0].clientY, t: Date.now() }
        : null;
    };

    const onTouchMove = (e) => {
      if (!pinch || e.touches.length !== 2) return;
      // Sin esto el WebView se queda con el gesto y lo trata como desplazamiento.
      e.preventDefault();
      const dist = separacion(e.touches[0], e.touches[1]);
      if (!pinch.dist || !dist) return;
      const escalaNueva = clampZoom(pinch.escala * (dist / pinch.dist));
      const punto = puntoMedio(e.touches[0], e.touches[1]);
      anclar(punto, escalaNueva, pinch.foco);
      setMostrarPista(false);
      setZoom(escalaNueva);
    };

    // Doble toque: alterna entre ajustar al ancho y tamaño real (1:1), que es
    // como se lee la letra pequeña de las medidas sin tener que pellizcar.
    const onTouchEnd = (e) => {
      if (e.touches.length < 2) pinch = null;
      if (e.touches.length > 0 || e.changedTouches.length !== 1) return;

      const t = e.changedTouches[0];
      const ahora = Date.now();
      const fueTap = tapInicio
        && ahora - tapInicio.t < 300
        && Math.hypot(t.clientX - tapInicio.x, t.clientY - tapInicio.y) < 14;
      tapInicio = null;
      if (!fueTap) { tapPrevio = null; return; }

      const esDoble = tapPrevio
        && ahora - tapPrevio.t < 320
        && Math.hypot(t.clientX - tapPrevio.x, t.clientY - tapPrevio.y) < 40;
      if (!esDoble) {
        tapPrevio = { x: t.clientX, y: t.clientY, t: ahora };
        return;
      }

      tapPrevio = null;
      e.preventDefault();
      setMostrarPista(false);
      if (scaleRef.current < 0.995) zoomHacia(relativoAlVisor(t.clientX, t.clientY), 1);
      else setZoom(null); // volver a ajustar al ancho
    };

    // Trackpad y rueda del mouse: el pellizco del trackpad llega como ctrl+wheel.
    const onWheel = (e) => {
      if (!e.ctrlKey && !e.metaKey) return;
      e.preventDefault();
      zoomHacia(relativoAlVisor(e.clientX, e.clientY), clampZoom(scaleRef.current * Math.exp(-e.deltaY / 220)));
    };

    viewport.addEventListener("touchstart", onTouchStart, { passive: false });
    viewport.addEventListener("touchmove", onTouchMove, { passive: false });
    viewport.addEventListener("touchend", onTouchEnd, { passive: false });
    viewport.addEventListener("touchcancel", onTouchEnd, { passive: false });
    viewport.addEventListener("wheel", onWheel, { passive: false });
    return () => {
      viewport.removeEventListener("touchstart", onTouchStart);
      viewport.removeEventListener("touchmove", onTouchMove);
      viewport.removeEventListener("touchend", onTouchEnd);
      viewport.removeEventListener("touchcancel", onTouchEnd);
      viewport.removeEventListener("wheel", onWheel);
    };
  }, []);

  // Nombre con el que sale esta ficha en cualquier archivo (imagen o PDF).
  const nombreBase = () => `Ficha_${String(numero || "").replace(/[^\w-]/g, "") || "produccion"}`;

  // ── Impresión ────────────────────────────────────────────────────────────
  // Lo que se manda al papel NO es lo mismo que se ve en pantalla: pasa por el
  // modo ahorro de tinta (utils/impresionAhorroTinta.js), que quita los fondos
  // de color y deja el texto en negro. En el visor la ficha conserva sus bandas.
  const buildHtml = () => `<!DOCTYPE html><html><head>
      <meta charset="utf-8"/>
      <title>Ficha ${productLabel} ${numero} — ${cliente || ""}</title>
      <style>
        * { box-sizing: border-box; }
        html, body { margin: 0; padding: 0; }
        body { margin: 8mm; font-family: Arial, sans-serif; background: white; color: #000; }
        table { border-collapse: collapse; width: 100%; }
        td, th { border: 1px solid #333; padding: 4px 7px; font-size: 12px; vertical-align: middle; }
        @media print { body { margin: 5mm; } @page { size: letter landscape; margin: 0; } }
      </style>
    </head><body><div id="print-content">${htmlParaImprimir(printRef.current)}</div></body></html>`;

  // Encoge el contenido (si hace falta) para que cualquier ficha, sin importar
  // cuántas filas/insumos tenga, entre siempre en una sola página carta (Letter)
  // horizontal — el tamaño real en el que se imprime. Si este cálculo usara
  // A4 (más ancho que carta) y el driver de impresión luego reescala a carta,
  // el contenido se encoge dos veces y el texto sale más pequeño de lo previsto.
  const ajustarAUnaPagina = (targetWin) => {
    const el = targetWin.document.getElementById("print-content");
    if (!el) return;
    const mmToPx = 96 / 25.4;
    const pageW = (279.4 - 10) * mmToPx; // Carta (Letter) horizontal menos márgenes de 5mm
    const pageH = (215.9 - 10) * mmToPx;
    const escala = Math.min(1, pageW / el.scrollWidth, pageH / el.scrollHeight);
    if (escala < 1) el.style.zoom = escala;
  };

  const cuandoCargue = (targetWin, accion) => {
    if (targetWin.document.readyState === "complete") {
      setTimeout(accion, 250);
    } else {
      targetWin.addEventListener("load", () => setTimeout(accion, 250));
    }
  };

  // Se imprime desde un iframe fuera de pantalla: así no se abre ninguna
  // ventana ni pestaña de "vista previa" que después haya que cerrar a mano
  // —el diálogo de impresión sale sobre la app misma— y de paso no depende del
  // bloqueador de ventanas emergentes.
  const imprimirConIframe = (html) => {
    const iframe = document.createElement("iframe");
    iframe.setAttribute("aria-hidden", "true");
    // Fuera de pantalla pero con tamaño real: el cálculo de escalado necesita
    // que el contenido tenga layout (un iframe de 0×0 mide 0).
    iframe.style.cssText = `position:fixed;left:-10000px;top:0;width:${designWidth}px;height:900px;border:0;`;
    document.body.appendChild(iframe);

    let retirado = false;
    const retirar = () => {
      if (retirado) return;
      retirado = true;
      iframe.remove();
    };

    try {
      const win = iframe.contentWindow;
      const doc = win.document;
      doc.open();
      doc.write(html);
      doc.close();
      cuandoCargue(win, () => {
        try {
          // El iframe se retira cuando el diálogo termina. Nunca antes: si se
          // quita el documento mientras el diálogo sigue abierto, el trabajo de
          // impresión se cancela solo.
          win.addEventListener("afterprint", retirar, { once: true });
          ajustarAUnaPagina(win);
          win.focus();
          win.print();
        } catch (e) {
          console.error("No se pudo imprimir la ficha", e);
          retirar();
          imprimirConVentana(html);
          return;
        } finally {
          setPrinting(false);
        }
        // Red de seguridad por si el navegador no avisa que terminó: el iframe
        // es invisible, así que sobra con retirarlo un rato después.
        setTimeout(retirar, 60000);
      });
    } catch (e) {
      console.error("No se pudo preparar la impresión", e);
      retirar();
      setPrinting(false);
      imprimirConVentana(html);
    }
  };

  // Plan B si el navegador no deja imprimir desde el iframe: ventana aparte,
  // que ahora se cierra sola en cuanto se cierra el diálogo de impresión
  // (antes quedaba abierta y tocaba cerrarla a mano).
  const imprimirConVentana = (html) => {
    let win = null;
    try {
      win = window.open("", "_blank", `width=${windowSize.width},height=${windowSize.height}`);
    } catch { win = null; }

    if (!win) {
      setPrinting(false);
      toast.error("El navegador bloqueó la impresión. Permite las ventanas emergentes o usa Ctrl/Cmd + P.");
      return;
    }

    const cerrar = () => { try { if (!win.closed) win.close(); } catch { /* noop */ } };

    try {
      win.document.write(html);
      win.document.close();
      cuandoCargue(win, () => {
        try {
          win.addEventListener("afterprint", cerrar, { once: true });
          ajustarAUnaPagina(win);
          win.focus();
          win.print();
          // En Chrome, Edge y Electron print() no devuelve el control hasta que
          // se cierra el diálogo: al llegar aquí ya se imprimió (o se canceló).
          cerrar();
        } catch (e) {
          console.error("No se pudo imprimir la ficha", e);
          cerrar();
        } finally {
          setPrinting(false);
        }
      });
    } catch (e) {
      console.error("No se pudo escribir la ventana de impresión", e);
      cerrar();
      setPrinting(false);
      toast.error("No se pudo abrir la impresión de la ficha. Intenta de nuevo o usa Ctrl/Cmd + P.");
    }
  };

  // En la app del celular no hay diálogo de impresión al que llamar (ver
  // utils/fichaImpresionMovil.js): la ficha se arma como PDF de una hoja y se
  // entrega al servicio de impresión / compartir de Android.
  const imprimirEnCelular = async () => {
    // Armar el PDF de la ficha toma un par de segundos en el teléfono: sin el
    // aviso parece que el botón no hizo nada.
    const aviso = toast.loading("Preparando la ficha para imprimir…");
    try {
      await compartirFichaParaImprimir(printRef.current, {
        anchoDiseno: designWidth,
        nombreArchivo: `${nombreBase()}.pdf`,
      });
    } catch (e) {
      if (!esCancelacion(e)) {
        console.error("No se pudo preparar la ficha para imprimir", e);
        toast.error("No se pudo preparar la ficha para imprimir");
      }
    } finally {
      toast.dismiss(aviso);
      setPrinting(false);
    }
  };

  const handlePrint = () => {
    if (!printRef.current || printing) return;
    setPrinting(true);
    if (Capacitor.isNativePlatform()) {
      imprimirEnCelular();
      return;
    }
    imprimirConIframe(buildHtml());
  };

  // ── Copiar la ficha como imagen ──────────────────────────────────────────
  // Se rasteriza siempre al ancho de diseño (no al de la pantalla), así la
  // imagen sale igual de grande desde un celular que desde un PC.
  const [copiando, setCopiando] = React.useState(false);
  const [copiado, setCopiado] = React.useState(false);

  const handleCopiarImagen = async () => {
    if (!printRef.current || copiando) return;
    setCopiando(true);
    const nombreArchivo = `${nombreBase()}.png`;
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
      className="fixed inset-0 z-[1000] bg-black/70 backdrop-blur-sm flex justify-center sm:items-start sm:overflow-auto sm:py-6 sm:px-4 animate-fade-in"
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
          <div
            ref={viewportRef}
            className="flex-1 min-h-0 overflow-auto bg-gray-100 sm:bg-white"
            style={{ touchAction: "pan-x pan-y" }}
          >
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

        {/* El gesto no se ve: sin este aviso los operarios daban por hecho que
            la ficha del celular no se podía acercar. */}
        {necesitaZoom && mostrarPista && (
          <div className="pointer-events-none absolute inset-x-0 bottom-4 flex justify-center px-4 print:hidden">
            <span className="rounded-full bg-black/75 text-white text-[11px] font-medium px-3 py-1.5 shadow-lg animate-fade-in">
              Pellizca para acercar · doble toque para verla 1:1
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
