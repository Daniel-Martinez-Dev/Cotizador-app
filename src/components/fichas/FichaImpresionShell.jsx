import React from "react";
import { FaPrint, FaTimes, FaFileAlt } from "react-icons/fa";

// Modal + lógica de impresión compartida por las fichas de impresión
// (Abrigo, Sello, División Térmica). El contenido imprimible propio de
// cada producto (encabezado, planos, tablas, pie) se pasa como children.
export default function FichaImpresionShell({
  productLabel,
  numero,
  cliente,
  onClose,
  maxWidthClass = "max-w-5xl",
  windowSize = { width: 1120, height: 980 },
  children,
}) {
  const printRef = React.useRef();
  const [printing, setPrinting] = React.useState(false);

  React.useEffect(() => {
    const onKeyDown = (e) => { if (e.key === "Escape") onClose?.(); };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  const handlePrint = () => {
    setPrinting(true);
    const win = window.open("", "_blank", `width=${windowSize.width},height=${windowSize.height}`);
    if (!win) { setPrinting(false); return; }
    win.document.write(`<!DOCTYPE html><html><head>
      <meta charset="utf-8"/>
      <title>Ficha ${productLabel} #${numero} — ${cliente || ""}</title>
      <style>
        * { box-sizing: border-box; }
        html, body { margin: 0; padding: 0; }
        body { margin: 8mm; font-family: Arial, sans-serif; background: white; color: #111; }
        table { border-collapse: collapse; width: 100%; }
        td, th { border: 1px solid #999; padding: 4px 7px; font-size: 11px; vertical-align: middle; }
        @media print { body { margin: 5mm; } @page { size: A4 landscape; margin: 0; } }
      </style>
    </head><body><div id="print-content">${printRef.current.innerHTML}</div></body></html>`);
    win.document.close();

    // Encoge el contenido (si hace falta) para que cualquier ficha, sin importar
    // cuántas filas/insumos tenga, entre siempre en una sola página A4 horizontal.
    const fitToOnePage = () => {
      const el = win.document.getElementById("print-content");
      if (el) {
        const mmToPx = 96 / 25.4;
        const pageW = (297 - 10) * mmToPx; // A4 horizontal menos márgenes de 5mm
        const pageH = (210 - 10) * mmToPx;
        const scale = Math.min(1, pageW / el.scrollWidth, pageH / el.scrollHeight);
        if (scale < 1) el.style.zoom = scale;
      }
      win.focus();
      win.print();
      setPrinting(false);
    };

    if (win.document.readyState === "complete") {
      setTimeout(fitToOnePage, 250);
    } else {
      win.addEventListener("load", () => setTimeout(fitToOnePage, 250));
    }
  };

  const onBackdropClick = (e) => { if (e.target === e.currentTarget) onClose?.(); };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-start justify-center overflow-auto py-6 px-4 animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-label={`Ficha ${productLabel} #${numero}`}
      onMouseDown={onBackdropClick}
    >
      <div className={`relative w-full ${maxWidthClass}`}>
        {/* Hojas apiladas detrás, para dar sensación de documento físico */}
        <div className="absolute inset-x-3 -bottom-2 h-full bg-white/40 rounded-xl -z-10" aria-hidden="true" />
        <div className="absolute inset-x-1.5 -bottom-1 h-full bg-white/70 rounded-xl -z-10" aria-hidden="true" />

        <div className="bg-white w-full rounded-xl shadow-2xl overflow-hidden ring-1 ring-black/5">

          {/* ── Barra de acciones (no se imprime) ── */}
          <div className="flex items-center justify-between gap-3 px-5 py-3 bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200 print:hidden">
            <span className="flex items-center gap-2 text-sm font-semibold text-gray-700 min-w-0">
              <span className="flex items-center justify-center h-7 w-7 rounded-lg bg-blue-600/10 text-blue-700 shrink-0">
                <FaFileAlt className="text-xs" />
              </span>
              <span className="truncate">
                Ficha #{numero} <span className="text-gray-400 font-normal">—</span> {productLabel}
              </span>
            </span>
            <div className="flex gap-2 shrink-0">
              <button onClick={handlePrint} disabled={printing}
                className="inline-flex items-center gap-2 px-4 py-1.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-60 active:scale-95 text-white text-sm rounded-lg font-medium shadow-sm transition">
                <FaPrint className={printing ? "animate-pulse" : ""} />
                {printing ? "Preparando…" : "Imprimir / PDF"}
              </button>
              <button onClick={onClose} aria-label="Cerrar" title="Cerrar (Esc)"
                className="inline-flex items-center gap-2 px-4 py-1.5 bg-white hover:bg-gray-100 text-gray-700 text-sm rounded-lg border border-gray-300 transition">
                <FaTimes /> Cerrar
              </button>
            </div>
          </div>

          {/* ── Contenido imprimible ── */}
          <div ref={printRef} style={{ fontFamily: "Arial, sans-serif", color: "#111", background: "white" }}>
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
