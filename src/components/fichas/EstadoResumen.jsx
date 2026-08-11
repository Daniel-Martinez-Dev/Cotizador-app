import React from "react";
import { FaLayerGroup } from "react-icons/fa";
import { ESTADOS_FICHA, ESTADO_ICON, ESTADO_RESUMEN, normalizarEstado } from "./estadoFicha";

// Tarjetas de conteo por estado que además filtran el listado. Las cinco líneas
// de producto tenían este mismo bloque copiado; aquí vive una sola vez y así
// agregar un estado no obliga a tocar cinco archivos.
const TARJETA_TOTAL = {
  key: "todos",
  label: "Total",
  icon: FaLayerGroup,
  tone: "text-gray-600 dark:text-gray-300",
  ring: "border-gray-200 dark:border-gris-600",
};

export default function EstadoResumen({ fichas, filtro, onFiltrar }) {
  const conteo = React.useMemo(() => {
    const acc = Object.fromEntries(ESTADOS_FICHA.map((e) => [e, 0]));
    for (const f of fichas) acc[normalizarEstado(f.estado)] += 1;
    return acc;
  }, [fichas]);

  const tarjetas = [
    { ...TARJETA_TOTAL, value: fichas.length },
    ...ESTADOS_FICHA.map((e) => ({
      key: e,
      icon: ESTADO_ICON[e],
      value: conteo[e],
      ...ESTADO_RESUMEN[e],
    })),
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 mb-4">
      {tarjetas.map(({ key, label, value, icon: Icon, tone, ring }) => (
        <button
          key={key}
          type="button"
          // Volver a pulsar el filtro activo lo quita: es el atajo para ver todo.
          onClick={() => onFiltrar(filtro === key ? "todos" : key)}
          className={`text-left rounded-lg border px-3 py-2 transition-colors ${ring} ${
            filtro === key
              ? "bg-gray-50 dark:bg-gris-700 ring-2 ring-offset-1 ring-blue-500 dark:ring-offset-gris-800"
              : "bg-white dark:bg-gris-800 hover:bg-gray-50 dark:hover:bg-gris-700/60"
          }`}
        >
          <div className={`flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide ${tone}`}>
            <Icon className="text-[10px]" /> {label}
          </div>
          <div className={`text-xl font-bold font-mono mt-0.5 ${tone}`}>{value}</div>
        </button>
      ))}
    </div>
  );
}
