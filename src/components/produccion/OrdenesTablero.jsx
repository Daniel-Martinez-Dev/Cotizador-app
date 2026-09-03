import React from "react";
import OrdenCard from "./OrdenCard";
import { agruparPorEstado } from "./ordenesFiltrar";
import { ESTADOS_FICHA, ESTADO_LABEL, ESTADO_DOT } from "../fichas/estadoFicha";

// Tablero por estado: cuatro columnas fijas, en el orden del flujo. Responde de
// un vistazo a "qué hay en producción" y "qué está terminado", que es para lo
// que se abre esta pantalla.
//
// Las columnas se dibujan siempre, incluso vacías: una columna que desaparece
// esconde que no hay nada en ese estado, que es justo lo que hay que ver.
export default function OrdenesTablero({ ordenes, hoy, onAbrir, onCambiarEstado, onVerFicha, estaSeleccionada, onSeleccionar }) {
  const grupos = React.useMemo(() => agruparPorEstado(ordenes), [ordenes]);

  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4 items-start">
      {ESTADOS_FICHA.map((estado) => {
        const fichas = grupos[estado];
        return (
          <section
            key={estado}
            className="min-w-0 rounded-xl border border-gray-200 dark:border-gris-700 bg-gray-50/70 dark:bg-gris-900/60 flex flex-col min-h-[140px]"
          >
            <header className="flex items-center gap-2 px-3 py-2.5 border-b border-gray-200 dark:border-gris-700 rounded-t-xl">
              <span className={`h-2 w-2 rounded-full ${ESTADO_DOT[estado]}`} />
              <h3 className="text-[11px] font-semibold uppercase tracking-wide text-gray-600 dark:text-gray-300 truncate min-w-0">
                {ESTADO_LABEL[estado]}
              </h3>
              <span className="ml-auto shrink-0 font-mono text-xs text-gray-500 dark:text-gray-400 tabular-nums">
                {fichas.length}
              </span>
            </header>

            <div className="p-2 grid grid-cols-1 gap-2 min-w-0">
              {fichas.length === 0 ? (
                <p className="text-[11px] text-gray-400 dark:text-gray-500 text-center py-6">
                  Nada aquí
                </p>
              ) : (
                fichas.map((f) => (
                  <OrdenCard
                    key={`${f.tipo}-${f.id}`}
                    ficha={f}
                    hoy={hoy}
                    onAbrir={onAbrir}
                    onCambiarEstado={onCambiarEstado}
                    onVerFicha={onVerFicha}
                    seleccionada={estaSeleccionada?.(f)}
                    onSeleccionar={onSeleccionar}
                  />
                ))
              )}
            </div>
          </section>
        );
      })}
    </div>
  );
}
