// Vista previa fiel del PDF de cotización.
//
// Renderiza EL MISMO documento que se descarga (construirDocumentoCotizacion),
// no una maqueta en HTML: lo que se ve aquí es lo que sale impreso, con sus
// márgenes, saltos de página, encabezado, pie paginado y bloque de firmas.
//
// Se pinta con pdf.js sobre <canvas> en vez de meter el blob en un <iframe>.
// El iframe solo funciona en Chromium: Safari no muestra PDFs embebidos (sale
// en blanco) y el WebView de Android tampoco. Con pdf.js el preview funciona
// igual en los tres sitios, que es lo que hace que sirva para maquetar.
//
// Tampoco se usa el hook `usePDF` de @react-pdf/renderer: crea un object URL en
// cada render y nunca revoca el anterior, y no deja mantener el PDF anterior a
// la vista mientras se calcula el siguiente. Con `pdf()` directo —la misma API
// que ya usa generarPDFReact— controlamos las dos cosas.
import React, { useEffect, useMemo, useRef, useState } from "react";
import { pdf } from "@react-pdf/renderer";
import { getDocument, GlobalWorkerOptions } from "pdfjs-dist";
import workerSrc from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import { construirDocumentoCotizacion } from "../../utils/pdfReact";

GlobalWorkerOptions.workerSrc = workerSrc;

const RETARDO_MS = 600;

// Con pdf.js el preview funciona en cualquier plataforma (Safari, Chromium y
// el WebView de Android). Se conserva la función porque PreviewPage decide con
// ella si monta el panel.
export function soportaVistaPreviaPDF() {
  return typeof document !== "undefined";
}

const OPCIONES_ZOOM = [
  { valor: "ancho", etiqueta: "Ajustar ancho" },
  { valor: "0.75", etiqueta: "75 %" },
  { valor: "1", etiqueta: "100 %" },
  { valor: "1.5", etiqueta: "150 %" },
];

export default function VistaPreviaPDF({
  cotizacion,
  numeroCotizacion,
  theme,
  onBlob,
  retardoMs = RETARDO_MS,
  alturaClase = "h-[70vh]",
  // Se incrementa desde fuera para forzar un refresco inmediato, sin esperar al
  // retardo: es el botón "Actualizar vista ahora" del panel de ajustes.
  tokenRefresco = 0,
  acciones = null,
}) {
  const [pantallaCompleta, setPantallaCompleta] = useState(false);
  // Refresco pedido desde la propia barra; se suma al que llega por props para
  // que ambos botones ("Actualizar" aquí y en el panel de ajustes) fuercen lo mismo.
  const [refrescoLocal, setRefrescoLocal] = useState(0);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);
  const [zoom, setZoom] = useState("ancho");
  // Documento pdf.js ya parseado, junto con su loading task. Se guarda en
  // estado para que cambiar el zoom solo repinte los lienzos: rehacer el PDF
  // entero para acercar la vista costaría el render de react-pdf otra vez.
  // Se conserva la `tarea` porque en pdf.js v6 el que libera worker y buffers
  // es el loading task; PDFDocumentProxy no tiene destroy().
  const [cargado, setCargado] = useState(null); // {doc, tarea}

  const contenedorRef = useRef(null);
  const generacionRef = useRef(0);
  const tareasRef = useRef([]);
  // Espejo de `cargado` para poder liberar el documento anterior sin meter un
  // efecto secundario dentro del updater de estado (en StrictMode corre dos
  // veces) ni recrear la limpieza de desmontaje en cada actualización.
  const cargadoRef = useRef(null);
  const ultimoTokenRef = useRef(null); // null = el primer render no espera
  const onBlobRef = useRef(onBlob);
  useEffect(() => { onBlobRef.current = onBlob; }, [onBlob]);

  const cancelarRenders = () => {
    tareasRef.current.forEach((t) => { try { t.cancel(); } catch {} });
    tareasRef.current = [];
  };

  // --- 1) Contenido -> documento pdf.js (con retardo) ---
  useEffect(() => {
    if (!cotizacion) return undefined;

    let cancelado = false;
    const generacion = ++generacionRef.current;
    setCargando(true);

    // Un refresco pedido a mano (o el primero) no debe esperar el retardo: ese
    // retardo está para no re-renderizar en cada tecla, no para hacer esperar a
    // quien acaba de pulsar "Actualizar".
    const token = `${tokenRefresco}:${refrescoLocal}`;
    const espera = token !== ultimoTokenRef.current ? 0 : retardoMs;
    ultimoTokenRef.current = token;

    const temporizador = setTimeout(async () => {
      try {
        const documento = await construirDocumentoCotizacion(cotizacion, numeroCotizacion, { theme });
        if (cancelado || generacion !== generacionRef.current) return;

        const instancia = pdf();
        instancia.updateContainer(documento);
        const blob = await instancia.toBlob();
        if (cancelado || generacion !== generacionRef.current) return;
        if (onBlobRef.current) onBlobRef.current(blob);

        const datos = new Uint8Array(await blob.arrayBuffer());
        const tarea = getDocument({ data: datos });
        const nuevoDoc = await tarea.promise;
        if (cancelado || generacion !== generacionRef.current) { tarea.destroy(); return; }

        if (cargadoRef.current) { try { cargadoRef.current.tarea.destroy(); } catch {} }
        cargadoRef.current = { doc: nuevoDoc, tarea };
        setError(null);
        setCargado(cargadoRef.current);
      } catch (e) {
        console.error("Error generando la vista previa del PDF:", e);
        if (!cancelado) { setError(e); setCargando(false); }
      }
    }, espera);

    return () => {
      cancelado = true;
      clearTimeout(temporizador);
    };
  }, [cotizacion, numeroCotizacion, theme, retardoMs, tokenRefresco, refrescoLocal]);

  // --- 2) Documento pdf.js -> lienzos (también al cambiar el zoom) ---
  useEffect(() => {
    const pdfDoc = cargado?.doc;
    if (!pdfDoc) return undefined;
    let cancelado = false;

    (async () => {
      try {
        cancelarRenders();
        const contenedor = contenedorRef.current;
        if (!contenedor) return;

        // Se conserva el desplazamiento: al ajustar, por ejemplo, el bloque de
        // firmas de la última página, volver arriba en cada tecleo sería
        // inutilizable.
        const desplazamiento = contenedor.scrollTop;
        const anchoDisponible = Math.max(contenedor.clientWidth - 24, 120);
        const dpr = Math.min(window.devicePixelRatio || 1, 2);

        const lienzos = [];
        for (let n = 1; n <= pdfDoc.numPages; n++) {
          const pagina = await pdfDoc.getPage(n);
          if (cancelado) return;

          const base = pagina.getViewport({ scale: 1 });
          const escala = zoom === "ancho" ? anchoDisponible / base.width : parseFloat(zoom);
          const viewport = pagina.getViewport({ scale: escala });

          const lienzo = document.createElement("canvas");
          lienzo.width = Math.floor(viewport.width * dpr);
          lienzo.height = Math.floor(viewport.height * dpr);
          lienzo.style.width = `${Math.floor(viewport.width)}px`;
          lienzo.style.height = `${Math.floor(viewport.height)}px`;
          lienzo.className = "block mx-auto mb-3 shadow-md bg-white";

          const contexto = lienzo.getContext("2d");
          contexto.scale(dpr, dpr);

          const render = pagina.render({ canvas: lienzo, canvasContext: contexto, viewport });
          tareasRef.current.push(render);
          await render.promise;
          if (cancelado) return;

          lienzos.push(lienzo);
        }

        // Se sustituyen todas las páginas de golpe, ya pintadas: si se fueran
        // añadiendo una a una, el panel parpadearía en cada actualización.
        contenedor.replaceChildren(...lienzos);
        contenedor.scrollTop = desplazamiento;
      } catch (e) {
        if (e?.name === "RenderingCancelledException") return;
        console.error("Error pintando la vista previa:", e);
        if (!cancelado) setError(e);
      } finally {
        if (!cancelado) setCargando(false);
      }
    })();

    return () => { cancelado = true; };
  }, [cargado, zoom]);

  // Solo al desmontar: al reemplazar el documento ya se libera el anterior
  // arriba, y una limpieza dependiente de `cargado` lo destruiría dos veces.
  useEffect(() => () => {
    cancelarRenders();
    if (cargadoRef.current) { try { cargadoRef.current.tarea.destroy(); } catch {} }
    cargadoRef.current = null;
  }, []);

  useEffect(() => {
    if (!pantallaCompleta) return undefined;
    const alPulsar = (e) => { if (e.key === "Escape") setPantallaCompleta(false); };
    window.addEventListener("keydown", alPulsar);
    // Sin esto la página de detrás sigue desplazándose con la rueda cuando el
    // puntero sale del visor, y al salir de pantalla completa apareces en otro sitio.
    const overflowPrevio = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", alPulsar);
      document.body.style.overflow = overflowPrevio;
    };
  }, [pantallaCompleta]);

  // Al cambiar de tamaño hay que repintar: con "Ajustar ancho" la escala se
  // calcula sobre el ancho del contenedor, que acaba de cambiar.
  useEffect(() => {
    if (!cargado) return;
    setCargado((c) => (c ? { ...c } : c));
  }, [pantallaCompleta]);

  const totalPaginas = cargado?.doc?.numPages ?? null;
  const hayContenido = totalPaginas != null;

  const claseContenedor = pantallaCompleta
    ? "fixed inset-0 z-50 flex flex-col bg-white dark:bg-gray-800"
    : "bg-white dark:bg-gray-800 rounded-2xl shadow-md border border-gray-200 dark:border-gray-700 overflow-hidden";

  const botonBarra = "px-2 py-1 text-xs rounded-lg border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed";

  return (
    <div className={claseContenedor}>
      <div className="flex items-center justify-between gap-2 px-3 py-2 border-b border-gray-200 dark:border-gray-700 shrink-0">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="text-sm font-semibold text-gray-700 dark:text-gray-200 truncate">PDF real</span>
          {cargando && (
            <span className="text-[11px] text-blue-600 dark:text-blue-300 whitespace-nowrap animate-pulse">
              actualizando…
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {hayContenido && (
            <span className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
              {totalPaginas} pág.
            </span>
          )}
          {acciones}
          <button
            type="button"
            onClick={() => setRefrescoLocal((n) => n + 1)}
            disabled={cargando}
            aria-label="Actualizar la vista"
            title="Actualizar la vista con los ajustes actuales"
            className={botonBarra}
          >🔄</button>
          <button
            type="button"
            onClick={() => setPantallaCompleta((v) => !v)}
            aria-label={pantallaCompleta ? "Salir de pantalla completa" : "Pantalla completa"}
            title={pantallaCompleta ? "Salir de pantalla completa (Esc)" : "Pantalla completa"}
            className={botonBarra}
          >{pantallaCompleta ? "🗙" : "⛶"}</button>
          <select
            value={zoom}
            onChange={(e) => setZoom(e.target.value)}
            aria-label="Zoom"
            className="px-1.5 py-1 text-xs border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
          >
            {OPCIONES_ZOOM.map((o) => (
              <option key={o.valor} value={o.valor}>{o.etiqueta}</option>
            ))}
          </select>
        </div>
      </div>

      <div className={`relative ${pantallaCompleta ? "flex-1 min-h-0 flex flex-col" : ""}`}>
        <div
          ref={contenedorRef}
          className={`${pantallaCompleta ? "flex-1 min-h-0" : alturaClase} overflow-auto bg-gray-100 dark:bg-gray-900 p-3`}
        />

        {!hayContenido && (
          <div className="absolute inset-0 flex items-center justify-center px-6 text-center pointer-events-none">
            {error ? (
              <p className="text-sm text-red-600 dark:text-red-400">
                No se pudo generar la vista previa. Revisa la consola; la descarga del PDF puede seguir funcionando.
              </p>
            ) : (
              <p className="text-sm text-gray-500 dark:text-gray-400 animate-pulse">Generando la vista previa…</p>
            )}
          </div>
        )}

        {/* Con páginas ya pintadas, el estado de carga es un velo tenue: si se
            vaciara el panel, cada tecleo lo dejaría en blanco. */}
        {cargando && hayContenido && (
          <div className="absolute inset-0 bg-white/35 dark:bg-black/35 pointer-events-none" />
        )}

        {error && hayContenido && (
          <div className="absolute bottom-2 left-2 right-2 rounded-lg bg-red-50 dark:bg-red-900/40 border border-red-200 dark:border-red-800 px-3 py-2">
            <p className="text-[11px] text-red-700 dark:text-red-300">
              La última actualización falló; se muestra la versión anterior.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
