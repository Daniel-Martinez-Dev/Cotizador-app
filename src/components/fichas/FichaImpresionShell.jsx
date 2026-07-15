import React from "react";

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

  React.useEffect(() => {
    const onKeyDown = (e) => { if (e.key === "Escape") onClose?.(); };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  const handlePrint = () => {
    const win = window.open("", "_blank", `width=${windowSize.width},height=${windowSize.height}`);
    if (!win) return;
    win.document.write(`<!DOCTYPE html><html><head>
      <meta charset="utf-8"/>
      <title>Ficha ${productLabel} #${numero} — ${cliente || ""}</title>
      <style>
        * { box-sizing: border-box; }
        body { margin: 8mm; font-family: Arial, sans-serif; background: white; color: #111; }
        table { border-collapse: collapse; width: 100%; }
        td, th { border: 1px solid #999; padding: 4px 7px; font-size: 11px; vertical-align: middle; }
        @media print { body { margin: 5mm; } @page { size: A4 landscape; } }
      </style>
    </head><body>${printRef.current.innerHTML}</body></html>`);
    win.document.close();
    setTimeout(() => { win.focus(); win.print(); }, 300);
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 flex items-start justify-center overflow-auto py-6 px-4"
      role="dialog"
      aria-modal="true"
      aria-label={`Ficha ${productLabel} #${numero}`}
    >
      <div className={`bg-white w-full ${maxWidthClass} rounded-xl shadow-2xl overflow-hidden`}>

        {/* ── Barra de acciones (no se imprime) ── */}
        <div className="flex items-center justify-between px-5 py-3 bg-gray-50 border-b print:hidden">
          <span className="text-sm font-semibold text-gray-700">
            Ficha #{numero} — {productLabel}
          </span>
          <div className="flex gap-2">
            <button onClick={handlePrint}
              className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-sm rounded-lg font-medium">
              Imprimir / PDF
            </button>
            <button onClick={onClose} aria-label="Cerrar" title="Cerrar (Esc)"
              className="px-4 py-1.5 bg-gray-200 hover:bg-gray-300 text-gray-700 text-sm rounded-lg">
              Cerrar
            </button>
          </div>
        </div>

        {/* ── Contenido imprimible ── */}
        <div ref={printRef} style={{ fontFamily: "Arial, sans-serif", color: "#111", background: "white" }}>
          {children}
        </div>
      </div>
    </div>
  );
}
