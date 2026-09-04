import React from "react";
import { FaTimes, FaCheckCircle, FaTruck, FaLayerGroup } from "react-icons/fa";
import useFlujoLote from "./useFlujoLote";

// Barra de acciones del lote: aparece cuando hay órdenes seleccionadas y cierra
// todas de una vez con un solo formulario. La letra pequeña de ese cierre
// —firmar antes de entregar, no tocar lo ya entregado— vive en useFlujoLote,
// que comparte con el pedido completo de una orden de compra.
//
// `extras` son acciones que no puede hacer todo el mundo con lo marcado, así
// que la barra no las conoce: oficina mete ahí "Agrupar en OC" (ver
// produccion/AgruparEnOC.jsx), que en planta no aparece porque sus reglas de
// Firestore no la dejan tocar la orden de compra.
export default function BarraLoteFichas({ fichas, onAplicar, onLimpiar, extras = null, anclaje = "bottom-0" }) {
  const { paraTerminar, paraEntregar, terminar, entregar, enCurso, modales } =
    useFlujoLote(fichas, { onAplicar, onListo: onLimpiar });

  return (
    <>
      {fichas.length > 0 && !enCurso && (
        <div className={`fixed inset-x-0 ${anclaje} z-[60] px-3 pb-3 pointer-events-none`}>
          <div className="pointer-events-auto mx-auto max-w-3xl rounded-xl border border-gray-300 dark:border-gris-600 bg-white dark:bg-gris-800 shadow-2xl p-2.5 flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-2 text-xs font-semibold px-1.5">
              <FaLayerGroup className="text-gray-500 dark:text-gray-400" />
              {fichas.length} orden{fichas.length === 1 ? "" : "es"}
            </span>

            <button
              type="button"
              onClick={onLimpiar}
              aria-label="Quitar selección"
              className="h-8 w-8 inline-flex items-center justify-center rounded-lg border border-gray-300 dark:border-gris-600 text-gray-500 dark:text-gray-400"
            >
              <FaTimes className="text-xs" />
            </button>

            {extras}

            <div className="ml-auto flex flex-1 sm:flex-none gap-2">
              {paraTerminar.length > 0 && (
                <button
                  type="button"
                  onClick={terminar}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 min-h-[40px] px-3 rounded-lg bg-green-600 hover:bg-green-500 text-white text-xs font-semibold"
                >
                  <FaCheckCircle className="text-[11px]" /> Firmar y terminar ({paraTerminar.length})
                </button>
              )}
              {paraEntregar.length > 0 && (
                <button
                  type="button"
                  onClick={entregar}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 min-h-[40px] px-3 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold"
                >
                  <FaTruck className="text-[11px]" /> Firmar y entregar ({paraEntregar.length})
                </button>
              )}
            </div>

            {paraEntregar.length === 0 && (
              <span className="text-[11px] text-gray-500 dark:text-gray-400 w-full">
                Las órdenes ya entregadas se corrigen una por una desde su detalle.
              </span>
            )}
          </div>
        </div>
      )}
      {modales}
    </>
  );
}
