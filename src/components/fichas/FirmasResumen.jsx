import React from "react";
import { FaSignature, FaLock, FaRegClock, FaPen } from "react-icons/fa";
import { ETAPAS, ETAPAS_FIRMA, fechaFirmaTexto, firmasDeFicha } from "../../utils/firmasFicha";

// Las firmas ya guardadas de la ficha, tal como van a salir impresas: quién
// alistó y empacó, quién revisó y aprobó, con su fecha. Debajo, el registro
// fotográfico de respaldo (las miniaturas abren la foto original: es evidencia,
// tiene que poder verse completa).
//
// Lo que todavía no se ha firmado aparece como pendiente, porque es lo que
// bloquea el siguiente cambio de estado.
//
// `onEditarFirma` solo llega desde el escritorio y solo a producción/admin: es
// la única vía para corregir una firma equivocada. Sin ella el bloque es de
// solo lectura, que es como lo ve la planta.
export default function FirmasResumen({ ficha, onEditarFirma }) {
  const firmas = firmasDeFicha(ficha);
  if (!firmas.alistado && !firmas.revisado) return null;

  return (
    <div className="rounded-xl border border-gray-200 dark:border-gris-700 bg-white dark:bg-gris-800 p-3">
      <div className="flex items-center justify-between gap-2 mb-2">
        <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
          <FaSignature className="text-[10px] opacity-70" /> Firmas de la ficha
        </span>
        {!onEditarFirma && (
          <span className="inline-flex items-center gap-1 text-[10px] text-gray-400">
            <FaLock className="text-[8px]" /> No editable desde planta
          </span>
        )}
      </div>

      <div className="space-y-2.5">
        {ETAPAS.map((etapa) => (
          <BloqueFirma
            key={etapa}
            etapa={etapa}
            firma={firmas[etapa]}
            onEditar={onEditarFirma && firmas[etapa] ? () => onEditarFirma(etapa) : null}
          />
        ))}
      </div>
    </div>
  );
}

function BloqueFirma({ etapa, firma, onEditar }) {
  const cfg = ETAPAS_FIRMA[etapa];

  if (!firma) {
    return (
      <div className="flex items-center gap-2 text-xs text-gray-400">
        <FaRegClock className="text-[10px]" />
        <span>{cfg.titulo}: <span className="italic">pendiente</span></span>
      </div>
    );
  }

  const fecha = fechaFirmaTexto(firma.fecha);

  return (
    <div className="rounded-lg border border-gray-200 dark:border-gris-600 bg-gray-50 dark:bg-gris-700/40 p-2.5">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-[10px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
          {cfg.titulo}
        </span>
        <span className="flex items-center gap-2 shrink-0">
          {fecha && <span className="text-[10px] text-gray-500 dark:text-gray-400">{fecha}</span>}
          {onEditar && (
            <button type="button" onClick={onEditar}
              className="inline-flex items-center gap-1 text-[11px] text-blue-600 dark:text-blue-400 hover:underline">
              <FaPen className="text-[9px]" /> Editar
            </button>
          )}
        </span>
      </div>

      <div className="flex flex-wrap gap-1.5 mt-1.5">
        {firma.personas.map((p) => (
          <span key={p.uid || p.nombre}
            className="px-2 py-0.5 rounded-full bg-white dark:bg-gris-800 border border-gray-200 dark:border-gris-600 text-xs font-medium text-gray-800 dark:text-gray-100">
            {p.nombre}
          </span>
        ))}
      </div>

      {firma.fotos.length > 0 && (
        <div className="grid grid-cols-6 sm:grid-cols-8 gap-1.5 mt-2">
          {firma.fotos.map((f) => (
            <a key={f.path} href={f.url} target="_blank" rel="noreferrer"
              className="block aspect-square rounded-md overflow-hidden border border-gray-200 dark:border-gris-600"
              title={f.nombre || "Evidencia del alistado"}>
              <img src={f.url} alt="" loading="lazy" className="h-full w-full object-cover" />
            </a>
          ))}
        </div>
      )}

      {firma.registradoPor.nombre && (
        <div className="text-[10px] text-gray-400 mt-1.5">Registrada por {firma.registradoPor.nombre}</div>
      )}
    </div>
  );
}
