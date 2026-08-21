import React from "react";
import { FaTruck, FaPen } from "react-icons/fa";
import { fmtFechaNota } from "./notasFicha";
import { fmtDate } from "../../utils/fichaFormat";

// Constancia de la entrega dentro del detalle de la ficha: fecha, placas, quién
// recibió y el registro fotográfico. Las miniaturas abren la foto original en
// otra pestaña — es la evidencia, tiene que poder verse completa.
export default function EntregaResumen({ entrega, onEditar }) {
  const fotos = entrega?.fotos || [];
  const datos = [
    ["Fecha de entrega", fmtDate(entrega?.fecha)],
    ["Placas", entrega?.placas || "—"],
    ["Recibido por", entrega?.recibidoPor || "—"],
  ];

  return (
    <div className="rounded-lg border border-purple-200 dark:border-purple-800 bg-purple-50/60 dark:bg-purple-900/20 p-3">
      <div className="flex items-center justify-between gap-2 mb-2">
        <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-purple-700 dark:text-purple-300">
          <FaTruck className="text-[10px]" /> Entrega
        </span>
        {onEditar && (
          <button type="button" onClick={onEditar}
            className="inline-flex items-center gap-1 text-[11px] text-purple-700 dark:text-purple-300 hover:underline">
            <FaPen className="text-[9px]" /> Editar
          </button>
        )}
      </div>

      <div className="grid grid-cols-3 gap-2 text-xs">
        {datos.map(([label, valor]) => (
          <div key={label}>
            <div className="text-[10px] text-gray-500 dark:text-gray-400">{label}</div>
            <div className="font-medium text-gray-800 dark:text-gray-100 break-words">{valor}</div>
          </div>
        ))}
      </div>

      {fotos.length > 0 && (
        <div className="grid grid-cols-6 sm:grid-cols-8 gap-1.5 mt-2.5">
          {fotos.map((f) => (
            <a key={f.url} href={f.url} target="_blank" rel="noreferrer"
              className="block aspect-square rounded-md overflow-hidden border border-purple-200 dark:border-purple-800"
              title={f.nombre || "Foto de la entrega"}>
              <img src={f.url} alt="" loading="lazy" className="h-full w-full object-cover" />
            </a>
          ))}
        </div>
      )}

      {entrega?.registradoPor?.nombre && (
        <div className="text-[10px] text-gray-400 mt-2">
          Registrada por {entrega.registradoPor.nombre}
          {fmtFechaNota(entrega.registradoEn) && ` · ${fmtFechaNota(entrega.registradoEn)}`}
        </div>
      )}
    </div>
  );
}
