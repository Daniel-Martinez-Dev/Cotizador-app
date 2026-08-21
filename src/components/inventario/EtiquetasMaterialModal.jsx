import React from "react";
import { FaTimes, FaPrint, FaTags } from "react-icons/fa";
import { svgEan13 } from "../../utils/ean13Barras";
import { esEan13Valido } from "../../utils/codigoMaterial";
import CodigoBarrasMaterial from "./CodigoBarrasMaterial";

// Hoja de etiquetas para pegar en la estantería. Sale en blanco y negro puro:
// además de gastar menos tinta, un lector láser necesita el contraste máximo y
// cualquier fondo de color le baja la tasa de lectura.
//
// Se imprime desde un iframe fuera de pantalla, igual que las fichas de
// producción (ver FichaImpresionShell): así el diálogo de impresión sale sobre
// la app, sin abrir pestañas que después haya que cerrar a mano ni chocar con
// el bloqueador de ventanas emergentes.

const ETIQUETAS_POR_HOJA = 24; // 3 columnas × 8 filas en carta

const escapar = (s) => String(s || "")
  .replace(/&/g, "&amp;")
  .replace(/</g, "&lt;")
  .replace(/>/g, "&gt;");

export function construirHtmlEtiquetas(items) {
  const etiquetas = (Array.isArray(items) ? items : [])
    .filter((it) => esEan13Valido(it?.codigoBarras))
    .map((it) => `
      <div class="etiqueta">
        <div class="nombre">${escapar(it.nombre || "Material")}</div>
        <div class="meta">${escapar(it.sku || "")}${it.ubicacion ? ` · ${escapar(it.ubicacion)}` : ""}</div>
        <div class="barras">${svgEan13(it.codigoBarras, { modulo: 2, altoBarras: 46 })}</div>
      </div>`)
    .join("");

  return `<!DOCTYPE html><html lang="es"><head>
    <meta charset="utf-8"/>
    <title>Etiquetas de materia prima</title>
    <style>
      * { box-sizing: border-box; }
      html, body { margin: 0; padding: 0; background: #fff; color: #000; }
      body { font-family: Arial, Helvetica, sans-serif; padding: 6mm; }
      .hoja {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 3mm;
      }
      .etiqueta {
        border: 1px solid #000;
        border-radius: 2mm;
        padding: 2.5mm;
        height: 32mm;
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        overflow: hidden;
        /* Que una etiqueta no se parta entre dos hojas: media etiqueta pegada
           en la estantería no se puede leer. */
        break-inside: avoid;
        page-break-inside: avoid;
      }
      /* El nombre y el SKU no se encogen; lo que cede es el hueco del código,
         que tiene altura propia. Al revés —dejando que el SVG creciera a lo
         ancho de la etiqueta— el nombre quedaba aplastado y cortado. */
      .nombre {
        flex: 0 0 auto;
        font-size: 9pt;
        font-weight: 700;
        line-height: 1.25;
        max-height: 2.5em;
        overflow: hidden;
      }
      .meta { flex: 0 0 auto; font-size: 7pt; font-family: monospace; }
      .barras {
        flex: 1 1 auto;
        min-height: 0;
        display: flex;
        align-items: flex-end;
        justify-content: center;
      }
      /* Altura fija y ancho proporcional: así el símbolo sale a un tamaño
         estable (~45 mm de ancho, por encima del nominal de 37 mm del EAN-13)
         y el lector lo toma sin tener que acercarse. */
      .barras svg { height: 15mm; width: auto; max-width: 100%; }
      @page { size: letter portrait; margin: 8mm; }
      @media print { body { padding: 0; } }
    </style>
  </head><body><div class="hoja">${etiquetas}</div></body></html>`;
}

export default function EtiquetasMaterialModal({ items, onClose }) {
  const imprimibles = React.useMemo(
    () => (Array.isArray(items) ? items : []).filter((it) => esEan13Valido(it?.codigoBarras)),
    [items]
  );
  const sinCodigo = (Array.isArray(items) ? items.length : 0) - imprimibles.length;

  const imprimir = () => {
    const iframe = document.createElement("iframe");
    iframe.setAttribute("aria-hidden", "true");
    iframe.style.cssText = "position:fixed;left:-10000px;top:0;width:816px;height:1056px;border:0;";
    document.body.appendChild(iframe);

    const retirar = () => { iframe.remove(); };

    const doc = iframe.contentDocument;
    doc.open();
    doc.write(construirHtmlEtiquetas(imprimibles));
    doc.close();

    const lanzar = () => {
      try {
        iframe.contentWindow.focus();
        iframe.contentWindow.print();
      } finally {
        // Margen para que el diálogo alcance a tomar el contenido antes de
        // retirar el iframe.
        setTimeout(retirar, 1000);
      }
    };

    if (doc.readyState === "complete") setTimeout(lanzar, 250);
    else iframe.contentWindow.addEventListener("load", () => setTimeout(lanzar, 250));
  };

  return (
    <div className="fixed inset-0 z-[1200]">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="absolute inset-0 p-4 flex items-start justify-center">
        <div
          role="dialog"
          aria-modal="true"
          className="w-full max-w-2xl rounded-xl border border-gray-200 dark:border-gris-700 bg-white dark:bg-gris-800 shadow-lg max-h-[calc(100vh-2rem)] flex flex-col"
        >
          <div className="p-4 border-b border-gray-200 dark:border-gris-700 flex items-start justify-between gap-3">
            <div>
              <div className="text-sm font-semibold inline-flex items-center gap-2">
                <FaTags className="text-gray-500" /> Etiquetas de materia prima
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                {imprimibles.length} etiqueta{imprimibles.length === 1 ? "" : "s"}
                {" · "}
                {Math.max(1, Math.ceil(imprimibles.length / ETIQUETAS_POR_HOJA))} hoja(s) carta
                {sinCodigo > 0 && ` · ${sinCodigo} sin código de barras`}
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Cerrar"
              className="h-8 w-8 shrink-0 rounded border border-gray-300 dark:border-gris-600 bg-gray-50 dark:bg-gris-700 flex items-center justify-center"
            >
              <FaTimes className="text-sm" />
            </button>
          </div>

          <div className="p-4 overflow-y-auto flex-1">
            {imprimibles.length === 0 ? (
              <div className="text-sm text-gray-600 dark:text-gray-300">
                Ningún material tiene código de barras todavía. Genera los códigos
                antes de imprimir las etiquetas.
              </div>
            ) : (
              <>
                {sinCodigo > 0 && (
                  <div className="mb-3 rounded-lg border border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/40 px-3 py-2 text-xs text-amber-900 dark:text-amber-300">
                    {sinCodigo} material(es) quedan fuera de la hoja por no tener
                    código de barras asignado.
                  </div>
                )}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {imprimibles.map((it) => (
                    <div
                      key={it.id}
                      className="border border-gray-300 rounded p-2 bg-white text-black flex flex-col justify-between gap-1"
                    >
                      <div className="text-[11px] font-bold leading-tight line-clamp-2">{it.nombre || "Material"}</div>
                      <div className="text-[9px] font-mono">{it.sku}{it.ubicacion ? ` · ${it.ubicacion}` : ""}</div>
                      <CodigoBarrasMaterial codigo={it.codigoBarras} modulo={2} altoBarras={40} />
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>

          <div className="p-4 border-t border-gray-200 dark:border-gris-700 flex flex-col sm:flex-row gap-2 sm:justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded border border-gray-300 dark:border-gris-600 bg-gray-50 dark:bg-gris-700 text-sm"
            >
              Cerrar
            </button>
            <button
              type="button"
              onClick={imprimir}
              disabled={imprimibles.length === 0}
              className="px-4 py-2 rounded bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold inline-flex items-center justify-center gap-2 disabled:opacity-40"
            >
              <FaPrint /> Imprimir etiquetas
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
