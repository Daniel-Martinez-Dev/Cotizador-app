import React from "react";
import { FaExclamationTriangle, FaFileAlt, FaRegClock } from "react-icons/fa";
import EstadoBadge from "../fichas/EstadoBadge";
import { productoDe } from "./productosFicha";
import { alertaEntrega } from "./ordenesFiltrar";
import { codigoFichaOFallback } from "../../utils/codigoFicha";
import { fmtDate } from "../../utils/fichaFormat";

// La tabla es para lo que el tablero hace mal: buscar una orden concreta entre
// cientos y comparar fechas alineadas en columna.
const TONO_ALERTA = {
  vencida: "text-red-600 dark:text-red-400 font-semibold",
  hoy:     "text-orange-600 dark:text-orange-400 font-semibold",
  proxima: "text-amber-600 dark:text-amber-400 font-medium",
};

export default function OrdenesTabla({ ordenes, hoy, onAbrir, onCambiarEstado, onVerFicha }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-gray-200 dark:border-gris-700 text-gray-500">
            <th className="text-left py-2 font-medium whitespace-nowrap">N.° ficha</th>
            <th className="text-left py-2 font-medium">Producto</th>
            <th className="text-left py-2 font-medium">Cliente</th>
            <th className="text-left py-2 font-medium whitespace-nowrap">Orden compra</th>
            <th className="text-center py-2 font-medium">Cant.</th>
            <th className="text-left py-2 font-medium whitespace-nowrap">F. orden</th>
            <th className="text-left py-2 font-medium whitespace-nowrap">F. entrega</th>
            <th className="text-center py-2 font-medium">Estado</th>
            <th className="py-2"></th>
          </tr>
        </thead>
        <tbody>
          {ordenes.map((f) => {
            const producto = productoDe(f.tipo);
            const Icon = producto?.icon;
            const alerta = alertaEntrega(f, hoy);
            const AlertaIcon = alerta === "vencida" ? FaExclamationTriangle : FaRegClock;
            return (
              <tr
                key={`${f.tipo}-${f.id}`}
                onClick={() => onAbrir(f)}
                className="border-b border-gray-100 dark:border-gris-700/50 hover:bg-gray-50 dark:hover:bg-gris-700/40 transition-colors cursor-pointer"
              >
                <td className="py-2 font-mono text-gray-500 whitespace-nowrap">{codigoFichaOFallback(f, f.tipo)}</td>
                <td className="py-2 text-gray-600 dark:text-gray-300 whitespace-nowrap">
                  <span className="inline-flex items-center gap-1.5">
                    {Icon && <Icon className={`text-[11px] ${producto.tono}`} />}
                    {f.tipoLabel}
                  </span>
                </td>
                <td className="py-2 font-medium">{f.cliente || "—"}</td>
                <td className="py-2 text-gray-500">{f.numeroOrdenCompra || "—"}</td>
                <td className="py-2 text-center tabular-nums">{f.cantidad ?? "—"}</td>
                <td className="py-2 text-gray-500 whitespace-nowrap tabular-nums">{fmtDate(f.fechaOrden)}</td>
                <td className={`py-2 whitespace-nowrap tabular-nums ${alerta ? TONO_ALERTA[alerta] : "text-gray-500"}`}>
                  <span className="inline-flex items-center gap-1">
                    {alerta && <AlertaIcon className="text-[10px]" />}
                    {fmtDate(f.fechaEntrega)}
                  </span>
                </td>
                <td className="py-2 text-center" onClick={(e) => e.stopPropagation()}>
                  <EstadoBadge estado={f.estado} onChange={(estado) => onCambiarEstado(f.id, estado)} />
                </td>
                <td className="py-2 pl-2" onClick={(e) => e.stopPropagation()}>
                  <button
                    type="button"
                    onClick={() => onVerFicha(f)}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs rounded bg-gray-100 hover:bg-gray-200 dark:bg-gris-700 dark:hover:bg-gris-600 border border-gray-300 dark:border-gris-600 whitespace-nowrap"
                  >
                    <FaFileAlt className="text-[10px]" /> Ver ficha
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
