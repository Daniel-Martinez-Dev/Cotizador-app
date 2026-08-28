import React from "react";
import { FaExclamationTriangle, FaRegClock, FaFileAlt } from "react-icons/fa";
import EstadoBadge from "../fichas/EstadoBadge";
import { resumenCorto } from "../fichas/detallePorTipo";
import { productoDe } from "./productosFicha";
import { alertaEntrega } from "./ordenesFiltrar";
import { codigoFichaOFallback } from "../../utils/codigoFicha";
import { fmtDate } from "../../utils/fichaFormat";

// El semáforo de entrega es lo único de la tarjeta que grita: si nada está
// vencido, el tablero se ve tranquilo, y eso también es información.
const ALERTA = {
  vencida:  { cls: "text-red-700 bg-red-50 border-red-200 dark:text-red-300 dark:bg-red-900/30 dark:border-red-800",       icon: FaExclamationTriangle, texto: "Vencida" },
  hoy:      { cls: "text-orange-700 bg-orange-50 border-orange-200 dark:text-orange-300 dark:bg-orange-900/30 dark:border-orange-800", icon: FaRegClock, texto: "Entrega hoy" },
  proxima:  { cls: "text-amber-700 bg-amber-50 border-amber-200 dark:text-amber-300 dark:bg-amber-900/30 dark:border-amber-800",  icon: FaRegClock, texto: "Próxima" },
};

export default function OrdenCard({ ficha: f, hoy, onAbrir, onCambiarEstado, onVerFicha }) {
  const producto = productoDe(f.tipo);
  const Icon = producto?.icon;
  const alerta = alertaEntrega(f, hoy);
  const meta = alerta ? ALERTA[alerta] : null;
  const AlertaIcon = meta?.icon;
  const medidas = resumenCorto(f);

  return (
    <article
      onClick={() => onAbrir(f)}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onAbrir(f); } }}
      role="button"
      tabIndex={0}
      className="group text-left w-full min-w-0 overflow-hidden rounded-xl border border-gray-200 dark:border-gris-600 bg-white dark:bg-gris-800 p-3 shadow-sm hover:shadow-md hover:border-gray-300 dark:hover:border-gris-500 focus:outline-none focus:ring-2 focus:ring-trafico/60 transition cursor-pointer"
    >
      <div className="flex items-start justify-between gap-2">
        <span className="font-mono text-[11px] text-gray-500 dark:text-gray-400 truncate min-w-0">
          {codigoFichaOFallback(f, f.tipo)}
        </span>
        {meta && (
          <span className={`shrink-0 whitespace-nowrap inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded border ${meta.cls}`}>
            <AlertaIcon className="text-[9px]" /> {meta.texto}
          </span>
        )}
      </div>

      <div className="mt-1 font-semibold text-sm text-gray-900 dark:text-white truncate" title={f.cliente || ""}>
        {f.cliente || "Sin cliente"}
      </div>

      <div className="mt-0.5 flex items-center gap-1.5 text-[11px] text-gray-500 dark:text-gray-400 min-w-0">
        {Icon && <Icon className={`shrink-0 ${producto.tono}`} />}
        <span className="truncate min-w-0">{f.tipoLabel}</span>
        {medidas && <span className="font-mono shrink-0">· {medidas}</span>}
        {f.cantidad > 1 && <span className="shrink-0">· ×{f.cantidad}</span>}
      </div>

      {f.fechaEntrega && (
        <div className="mt-1.5 text-[11px] text-gray-500 dark:text-gray-400 truncate">
          Entrega <span className="font-medium text-gray-700 dark:text-gray-300">{fmtDate(f.fechaEntrega)}</span>
        </div>
      )}

      <div
        className="mt-2.5 pt-2.5 border-t border-gray-100 dark:border-gris-700 flex items-center justify-between gap-2"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="min-w-0">
          <EstadoBadge estado={f.estado} onChange={(estado) => onCambiarEstado(f.id, estado)} />
        </div>
        <button
          type="button"
          onClick={() => onVerFicha(f)}
          title="Ver ficha imprimible"
          className="shrink-0 inline-flex items-center justify-center h-7 w-7 rounded-lg border border-gray-200 dark:border-gris-600 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gris-700 hover:text-gray-800 dark:hover:text-gray-200 focus:outline-none focus:ring-2 focus:ring-trafico/60"
        >
          <FaFileAlt className="text-[11px]" />
        </button>
      </div>
    </article>
  );
}
