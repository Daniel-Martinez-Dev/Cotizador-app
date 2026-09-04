import React from "react";
import { FaLayerGroup, FaCheck } from "react-icons/fa";
import { nombreClienteImpreso } from "../../utils/clienteVinculo";

// Las órdenes de una misma orden de compra, envueltas en un solo bloque en el
// teléfono de planta.
//
// Aquí las fichas no se esconden detrás de una tarjeta resumen como en oficina:
// en la mesa hace falta ver la medida de cada una. Lo que aporta el bloque es
// que se vea que van juntas —y que se puedan marcar todas de un toque para
// firmarlas y despacharlas de una vez—, que es justo donde se pierde una línea
// del pedido: salen los sellos y se quedan los topes.
export default function PedidoPlantaGrupo({ grupo, seleccionable, marcada, onAlternar, children }) {
  const cliente = nombreClienteImpreso(grupo) || "Sin cliente";

  return (
    <section
      className={`rounded-xl border-2 overflow-hidden ${
        marcada
          ? "border-green-500 bg-green-50/60 dark:bg-green-900/10"
          : "border-gray-300 dark:border-gris-600 bg-gray-50 dark:bg-gris-900/40"
      }`}
    >
      <header className="px-3 py-2.5 flex items-center gap-2 border-b border-gray-200 dark:border-gris-700">
        <FaLayerGroup className="text-gray-500 dark:text-gray-400 shrink-0" aria-hidden="true" />
        <div className="min-w-0 flex-1">
          <div className="font-mono text-sm font-bold text-gray-900 dark:text-white truncate">
            OC {grupo.numeroOrdenCompra}
          </div>
          <div className="text-[11px] text-gray-600 dark:text-gray-300 truncate">
            {cliente} · {grupo.fichas.length} fichas · {grupo.unidades} unidad{grupo.unidades === 1 ? "" : "es"}
          </div>
        </div>
        {seleccionable && (
          <button
            type="button"
            onClick={() => onAlternar?.(grupo)}
            aria-pressed={marcada}
            className={`shrink-0 inline-flex items-center gap-1.5 min-h-[38px] px-3 rounded-lg border text-xs font-semibold ${
              marcada
                ? "border-green-600 bg-green-600 text-white"
                : "border-gray-300 dark:border-gris-600 bg-white dark:bg-gris-800 text-gray-700 dark:text-gray-200"
            }`}
          >
            {marcada && <FaCheck className="text-[10px]" aria-hidden="true" />}
            {marcada ? "Pedido marcado" : "Marcar pedido"}
          </button>
        )}
      </header>

      <div className="p-2 space-y-2">{children}</div>
    </section>
  );
}
