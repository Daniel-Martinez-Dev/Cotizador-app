import React from "react";
import { ESTADO_LABEL, ESTADO_DOT, normalizarEstado } from "./estadoFicha";
import { fmtFechaNota, esNotaDeEstado } from "./notasFicha";

// Una entrada del historial de la ficha. El mismo arreglo `notas` guarda las
// notas escritas a mano y los cambios de estado, así que el ítem tiene que
// saber pintar ambos: los de estado llevan el titular "A → B" y la nota (si
// quien lo cambió escribió alguna) debajo.
export default function NotaItem({ nota }) {
  const deEstado = esNotaDeEstado(nota);
  const destino = normalizarEstado(nota.estadoNuevo);
  const origen = normalizarEstado(nota.estadoAnterior);
  const fecha = fmtFechaNota(nota.fecha);

  return (
    <li className="flex gap-2">
      <span className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${deEstado ? ESTADO_DOT[destino] : "bg-gray-300 dark:bg-gris-500"}`} />
      <div className="min-w-0 flex-1">
        {deEstado && (
          <div className="font-medium text-gray-700 dark:text-gray-200">
            {ESTADO_LABEL[origen]} <span className="text-gray-400">→</span> {ESTADO_LABEL[destino]}
          </div>
        )}
        {nota.texto && (
          <div className="text-gray-600 dark:text-gray-300 whitespace-pre-line break-words">{nota.texto}</div>
        )}
        <div className="text-[10px] text-gray-400 mt-0.5">
          {nota.autorNombre || "—"}{fecha && ` · ${fecha}`}
        </div>
      </div>
    </li>
  );
}
