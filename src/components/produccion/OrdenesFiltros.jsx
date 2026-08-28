import React from "react";
import { FaSearch, FaSlidersH, FaSyncAlt, FaTimes } from "react-icons/fa";
import { ESTADOS_FICHA, ESTADO_LABEL, ESTADO_DOT } from "../fichas/estadoFicha";
import { PRODUCTOS } from "./productosFicha";
import { CAMPOS_FECHA, ORDENAMIENTOS, hayFiltrosActivos } from "./ordenesFiltrar";

const selectCls = "px-2.5 py-2 rounded border border-gray-300 dark:border-gris-600 bg-white dark:bg-gris-700 text-sm";
const labelCls = "text-[11px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide";

const chipCls = (activo) =>
  `shrink-0 inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border font-medium transition ${
    activo
      ? "bg-gray-900 text-white border-gray-900 dark:bg-white dark:text-gray-900 dark:border-white"
      : "border-gray-300 dark:border-gris-600 bg-white dark:bg-gris-800 text-gray-600 dark:text-gray-300 hover:border-gray-400"
  }`;

// Búsqueda y estado siempre a la vista, que son los dos filtros de todos los
// días; el resto vive detrás de "Más filtros". Antes eran catorce controles
// desplegados a la vez y la pantalla empezaba por el formulario de filtrado en
// lugar de por las órdenes.
export default function OrdenesFiltros({
  filtros, onCambiar, onLimpiar, clientes, conteoPorEstado, total, mostrados, loading, onRecargar,
}) {
  const [abierto, setAbierto] = React.useState(false);
  const set = (campo) => (e) => onCambiar({ [campo]: e.target.value });
  const activos = hayFiltrosActivos(filtros);

  return (
    <section className="bg-white dark:bg-gris-800 border border-gray-200 dark:border-gris-700 rounded-xl p-3 space-y-3">
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1 min-w-0">
          <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs" />
          <input
            value={filtros.texto}
            onChange={set("texto")}
            placeholder="Buscar por n.° de ficha, cliente, orden de compra, ítem…"
            className="w-full pl-8 pr-3 py-2 rounded-lg border border-gray-300 dark:border-gris-600 bg-white dark:bg-gris-700 text-sm"
          />
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setAbierto((v) => !v)}
            aria-expanded={abierto}
            className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border text-sm transition ${
              abierto || activos
                ? "border-gray-400 dark:border-gris-500 bg-gray-50 dark:bg-gris-700 text-gray-800 dark:text-gray-100"
                : "border-gray-300 dark:border-gris-600 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gris-700"
            }`}
          >
            <FaSlidersH className="text-[11px]" /> Más filtros
          </button>
          <button
            type="button"
            onClick={onRecargar}
            disabled={loading}
            title="Volver a cargar las órdenes"
            className="inline-flex items-center justify-center h-9 w-9 rounded-lg border border-gray-300 dark:border-gris-600 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gris-700 disabled:opacity-50"
          >
            <FaSyncAlt className={`text-xs ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-0.5">
        <button type="button" onClick={() => onCambiar({ estado: "todos", soloAlerta: false })}
          className={chipCls(filtros.estado === "todos" && !filtros.soloAlerta)}>
          Todas <span className="opacity-60 tabular-nums">{total}</span>
        </button>
        {ESTADOS_FICHA.map((e) => (
          <button key={e} type="button" onClick={() => onCambiar({ estado: e, soloAlerta: false })}
            className={chipCls(filtros.estado === e)}>
            <span className={`h-1.5 w-1.5 rounded-full ${ESTADO_DOT[e]}`} />
            {ESTADO_LABEL[e]}
            <span className="opacity-60 tabular-nums">{conteoPorEstado[e] || 0}</span>
          </button>
        ))}
      </div>

      {abierto && (
        <div className="pt-1 space-y-3 border-t border-gray-100 dark:border-gris-700 animate-fade-in">
          <div className="flex gap-2 overflow-x-auto pb-0.5 pt-2">
            <button type="button" onClick={() => onCambiar({ tipo: "todos" })}
              className={chipCls(filtros.tipo === "todos")}>
              Todos los productos
            </button>
            {PRODUCTOS.map(({ tipo, label, icon: Icon, tono }) => (
              <button key={tipo} type="button" onClick={() => onCambiar({ tipo })}
                className={chipCls(filtros.tipo === tipo)}>
                <Icon className={`text-[11px] ${filtros.tipo === tipo ? "" : tono}`} />
                {label}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3">
            <div className="col-span-2 md:col-span-1">
              <label className={labelCls}>Cliente</label>
              <select value={filtros.cliente} onChange={set("cliente")} className={`${selectCls} mt-1 w-full`}>
                <option value="todos">Todos ({clientes.length})</option>
                {clientes.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>Filtrar por</label>
              <select value={filtros.campoFecha} onChange={set("campoFecha")} className={`${selectCls} mt-1 w-full`}>
                {CAMPOS_FECHA.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>Desde</label>
              <input type="date" value={filtros.desde} onChange={set("desde")} className={`${selectCls} mt-1 w-full`} />
            </div>
            <div>
              <label className={labelCls}>Hasta</label>
              <input type="date" value={filtros.hasta} onChange={set("hasta")} className={`${selectCls} mt-1 w-full`} />
            </div>
            <div>
              <label className={labelCls}>Ordenar por</label>
              <select value={filtros.ordenamiento} onChange={set("ordenamiento")} className={`${selectCls} mt-1 w-full`}>
                {ORDENAMIENTOS.map((o) => <option key={o.key} value={o.key}>{o.label}</option>)}
              </select>
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between gap-3 text-xs text-gray-500 dark:text-gray-400">
        <span>{loading ? "Cargando…" : `${mostrados} de ${total} órdenes`}</span>
        {activos && (
          <button
            type="button"
            onClick={onLimpiar}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded border border-gray-300 dark:border-gris-600 hover:bg-gray-50 dark:hover:bg-gris-700"
          >
            <FaTimes className="text-[10px]" /> Limpiar filtros
          </button>
        )}
      </div>
    </section>
  );
}
