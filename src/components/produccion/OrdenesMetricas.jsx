import React from "react";
import { FaCheckCircle, FaExclamationTriangle, FaIndustry, FaRegClock } from "react-icons/fa";

// El tablero ya muestra cuántas hay en cada estado en la cabecera de su
// columna, así que estas tarjetas no repiten eso: cuentan lo que ninguna otra
// parte de la pantalla dice, que es qué se está saliendo de fecha.
//
// Cada una filtra al pulsarla, y volver a pulsarla quita el filtro.
export default function OrdenesMetricas({ metricas, filtros, onFiltrar }) {
  const soloAlerta = filtros.soloAlerta;
  const estado = filtros.estado;

  const tarjetas = [
    {
      key: "vencidas",
      label: "Vencidas",
      valor: metricas.vencidas,
      icon: FaExclamationTriangle,
      activa: soloAlerta,
      onClick: () => onFiltrar({ soloAlerta: !soloAlerta, estado: "todos" }),
      tono: metricas.vencidas > 0
        ? "text-red-700 dark:text-red-300 border-red-200 dark:border-red-800 bg-red-50/70 dark:bg-red-900/20"
        : "text-gray-500 dark:text-gray-400 border-gray-200 dark:border-gris-700 bg-white dark:bg-gris-800",
    },
    {
      key: "hoy",
      label: "Entrega hoy",
      valor: metricas.paraHoy,
      icon: FaRegClock,
      tono: "text-orange-700 dark:text-orange-300 border-orange-200 dark:border-orange-800 bg-orange-50/60 dark:bg-orange-900/20",
    },
    {
      key: "en_produccion",
      label: "En producción",
      valor: metricas.porEstado.en_produccion,
      icon: FaIndustry,
      activa: estado === "en_produccion",
      onClick: () => onFiltrar({ estado: estado === "en_produccion" ? "todos" : "en_produccion", soloAlerta: false }),
      tono: "text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800 bg-blue-50/60 dark:bg-blue-900/20",
    },
    {
      key: "terminado",
      label: "Terminadas sin entregar",
      valor: metricas.porEstado.terminado,
      icon: FaCheckCircle,
      activa: estado === "terminado",
      onClick: () => onFiltrar({ estado: estado === "terminado" ? "todos" : "terminado", soloAlerta: false }),
      tono: "text-green-700 dark:text-green-300 border-green-200 dark:border-green-800 bg-green-50/60 dark:bg-green-900/20",
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
      {tarjetas.map(({ key, label, valor, icon: Icon, tono, activa, onClick }) => {
        const Etiqueta = onClick ? "button" : "div";
        return (
          <Etiqueta
            key={key}
            {...(onClick ? { type: "button", onClick } : {})}
            className={`text-left min-w-0 rounded-xl border px-3.5 py-3 transition ${tono} ${
              onClick ? "hover:brightness-[0.97] dark:hover:brightness-125 focus:outline-none focus:ring-2 focus:ring-trafico/60" : ""
            } ${activa ? "ring-2 ring-offset-1 ring-gray-900 dark:ring-white dark:ring-offset-gris-900" : ""}`}
          >
            <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide">
              <Icon className="text-[10px] shrink-0" /> <span className="min-w-0">{label}</span>
            </div>
            <div className="text-2xl font-bold font-mono tabular-nums mt-0.5 leading-none">{valor}</div>
          </Etiqueta>
        );
      })}
    </div>
  );
}
