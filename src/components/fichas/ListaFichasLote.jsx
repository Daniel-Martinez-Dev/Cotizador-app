import React from "react";
import { codigoFichaOFallback } from "../../utils/codigoFicha";

// Las órdenes sobre las que va a caer la firma, para que quien la registra vea
// exactamente qué está cerrando antes de confirmar. Con más de cuatro se
// resume: el número es el dato, no la lista completa.
const VISIBLES = 4;

export default function ListaFichasLote({ fichas, max = VISIBLES }) {
  if (!fichas?.length) return null;
  const visibles = fichas.slice(0, max);
  const resto = fichas.length - visibles.length;

  return (
    <ul className="rounded-lg border border-gray-200 dark:border-gris-600 divide-y divide-gray-100 dark:divide-gris-700 text-xs overflow-hidden">
      {visibles.map((f) => (
        <li key={`${f.tipo}-${f.id}`} className="flex items-center gap-2 px-2.5 py-1.5 min-w-0">
          <span className="font-mono text-[11px] text-gray-500 dark:text-gray-400 shrink-0">
            {codigoFichaOFallback(f, f.tipo)}
          </span>
          <span className="truncate min-w-0 text-gray-700 dark:text-gray-200">{f.cliente || "Sin cliente"}</span>
          <span className="ml-auto shrink-0 text-[10px] text-gray-400 truncate max-w-[38%]">{f.tipoLabel}</span>
        </li>
      ))}
      {resto > 0 && (
        <li className="px-2.5 py-1.5 text-[11px] text-gray-500 dark:text-gray-400">y {resto} orden(es) más</li>
      )}
    </ul>
  );
}
