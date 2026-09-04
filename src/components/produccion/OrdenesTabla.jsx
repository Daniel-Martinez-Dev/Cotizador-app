import React from "react";
import {
  FaExclamationTriangle, FaFileAlt, FaRegClock, FaLayerGroup, FaChevronRight, FaChevronDown,
} from "react-icons/fa";
import EstadoBadge from "../fichas/EstadoBadge";
import { productoDe } from "./productosFicha";
import { alertaEntrega } from "./ordenesFiltrar";
import { alertaGrupo, claveEntrada } from "./ordenesAgrupar";
import { codigoFichaOFallback } from "../../utils/codigoFicha";
import { fmtDate } from "../../utils/fichaFormat";

// La tabla es para lo que el tablero hace mal: buscar una orden concreta entre
// cientos y comparar fechas alineadas en columna.
//
// Los pedidos agrupados (una orden de compra con varias fichas) entran como una
// fila que se despliega: cerrada ocupa un renglón y dice de qué es el pedido;
// abierta muestra sus fichas debajo, sangradas, con las mismas columnas.
const TONO_ALERTA = {
  vencida: "text-red-600 dark:text-red-400 font-semibold",
  hoy:     "text-orange-600 dark:text-orange-400 font-semibold",
  proxima: "text-amber-600 dark:text-amber-400 font-medium",
};

function FilaFicha({ ficha: f, hoy, onAbrir, onCambiarEstado, onVerFicha, estaSeleccionada, onSeleccionar, sangrada }) {
  const producto = productoDe(f.tipo);
  const Icon = producto?.icon;
  const alerta = alertaEntrega(f, hoy);
  const AlertaIcon = alerta === "vencida" ? FaExclamationTriangle : FaRegClock;
  const marcada = !!estaSeleccionada?.(f);

  return (
    <tr
      onClick={() => onAbrir(f)}
      className={`border-b border-gray-100 dark:border-gris-700/50 transition-colors cursor-pointer ${
        marcada
          ? "bg-green-50 dark:bg-green-900/20"
          : sangrada
            ? "bg-gray-50/60 dark:bg-gris-900/40 hover:bg-gray-100 dark:hover:bg-gris-700/40"
            : "hover:bg-gray-50 dark:hover:bg-gris-700/40"
      }`}
    >
      {onSeleccionar && (
        <td className="py-2 pr-2" onClick={(e) => e.stopPropagation()}>
          <input
            type="checkbox"
            checked={marcada}
            onChange={() => onSeleccionar(f)}
            aria-label={`Seleccionar orden de ${f.cliente || "este cliente"}`}
            className="h-4 w-4 accent-green-600 cursor-pointer"
          />
        </td>
      )}
      <td className={`py-2 font-mono text-gray-500 whitespace-nowrap ${sangrada ? "pl-5" : ""}`}>
        {codigoFichaOFallback(f, f.tipo)}
      </td>
      <td className="py-2 text-gray-600 dark:text-gray-300 whitespace-nowrap">
        <span className="inline-flex items-center gap-1.5">
          {Icon && <Icon className={`text-[11px] ${producto.tono}`} />}
          {f.tipoLabel}
        </span>
      </td>
      {/* En la fila sangrada de un pedido el cliente ya lo dijo la fila del
          grupo; esa celda queda para el detalle, que es lo que diferencia esta
          línea de la de al lado. */}
      <td className="py-2 font-medium">
        {!sangrada && (f.cliente || "—")}
        {f.nombreFicha && (
          <span className={`inline-block max-w-[180px] truncate align-middle rounded bg-gray-900 dark:bg-white px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white dark:text-gray-900 ${sangrada ? "" : "ml-1.5"}`}>
            {f.nombreFicha}
          </span>
        )}
      </td>
      <td className="py-2 text-gray-500">{sangrada ? "" : f.numeroOrdenCompra || "—"}</td>
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
}

function FilaGrupo({ grupo, hoy, abierto, onDesplegar, onAbrir, estaSeleccionada, onSeleccionar }) {
  const alerta = alertaGrupo(grupo.fichas, hoy);
  const AlertaIcon = alerta === "vencida" ? FaExclamationTriangle : FaRegClock;
  const marcada = !!estaSeleccionada?.(grupo);
  const Desplegar = abierto ? FaChevronDown : FaChevronRight;

  return (
    <tr
      onClick={() => onAbrir(grupo)}
      className={`border-b border-gray-200 dark:border-gris-700 transition-colors cursor-pointer font-medium ${
        marcada ? "bg-green-50 dark:bg-green-900/20" : "bg-gray-50 dark:bg-gris-800/80 hover:bg-gray-100 dark:hover:bg-gris-700/60"
      }`}
    >
      {onSeleccionar && (
        <td className="py-2 pr-2" onClick={(e) => e.stopPropagation()}>
          <input
            type="checkbox"
            checked={marcada}
            onChange={() => onSeleccionar(grupo)}
            aria-label={`Seleccionar las ${grupo.fichas.length} fichas de la orden de compra ${grupo.numeroOrdenCompra}`}
            className="h-4 w-4 accent-green-600 cursor-pointer"
          />
        </td>
      )}
      <td className="py-2 whitespace-nowrap">
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onDesplegar(grupo); }}
          aria-expanded={abierto}
          aria-label={abierto ? "Contraer el pedido" : "Ver las fichas del pedido"}
          className="inline-flex items-center gap-1.5 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
        >
          <Desplegar className="text-[9px]" />
          <FaLayerGroup className="text-[11px]" />
          <span className="tabular-nums">{grupo.fichas.length} fichas</span>
        </button>
      </td>
      <td className="py-2 text-gray-600 dark:text-gray-300 whitespace-nowrap">
        <span className="inline-flex items-center gap-1.5">
          {grupo.productos.map(({ tipo }) => {
            const producto = productoDe(tipo);
            const Icon = producto?.icon;
            return Icon ? <Icon key={tipo} className={`text-[11px] ${producto.tono}`} title={producto.label} /> : null;
          })}
          <span className="text-gray-500">{grupo.productos.length} producto{grupo.productos.length === 1 ? "" : "s"}</span>
        </span>
      </td>
      <td className="py-2">{grupo.cliente || "—"}</td>
      <td className="py-2 font-mono font-semibold text-gray-800 dark:text-gray-100">{grupo.numeroOrdenCompra}</td>
      <td className="py-2 text-center tabular-nums">{grupo.unidades}</td>
      <td className="py-2 text-gray-500 whitespace-nowrap tabular-nums">{fmtDate(grupo.fechaOrden)}</td>
      <td className={`py-2 whitespace-nowrap tabular-nums ${alerta ? TONO_ALERTA[alerta] : "text-gray-500"}`}>
        <span className="inline-flex items-center gap-1">
          {alerta && <AlertaIcon className="text-[10px]" />}
          {fmtDate(grupo.fechaEntrega)}
        </span>
      </td>
      {/* El estado del pedido es el de su ficha más atrasada y no se cambia de
          un tirón: cada línea se termina y se firma por separado. */}
      <td className="py-2 text-center">
        <EstadoBadge estado={grupo.estado} title="Estado de la ficha más atrasada del pedido" />
      </td>
      <td className="py-2 pl-2" onClick={(e) => e.stopPropagation()}>
        <button
          type="button"
          onClick={() => onAbrir(grupo)}
          className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs rounded bg-gray-100 hover:bg-gray-200 dark:bg-gris-700 dark:hover:bg-gris-600 border border-gray-300 dark:border-gris-600 whitespace-nowrap"
        >
          Ver pedido
        </button>
      </td>
    </tr>
  );
}

export default function OrdenesTabla({
  ordenes, hoy, onAbrir, onCambiarEstado, onVerFicha,
  estaSeleccionada, onSeleccionar, onSeleccionarTodas,
}) {
  const [desplegados, setDesplegados] = React.useState(() => new Set());

  const desplegar = (grupo) => setDesplegados((prev) => {
    const siguiente = new Set(prev);
    if (siguiente.has(grupo.clave)) siguiente.delete(grupo.clave);
    else siguiente.add(grupo.clave);
    return siguiente;
  });

  // "Todas" marca las fichas, no las entradas: un pedido cuenta por las suyas.
  const fichasVisibles = React.useMemo(
    () => ordenes.flatMap((e) => (e.esGrupo ? e.fichas : [e])),
    [ordenes]
  );
  const seleccionables = onSeleccionar ? fichasVisibles : [];
  const todasMarcadas = seleccionables.length > 0 && seleccionables.every((f) => estaSeleccionada?.(f));

  const propsFicha = { hoy, onAbrir, onCambiarEstado, onVerFicha, estaSeleccionada, onSeleccionar };

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-gray-200 dark:border-gris-700 text-gray-500">
            {onSeleccionar && (
              <th className="py-2 pr-2 w-8">
                <input
                  type="checkbox"
                  checked={todasMarcadas}
                  onChange={() => onSeleccionarTodas?.(!todasMarcadas)}
                  aria-label="Seleccionar todas las órdenes de la lista"
                  className="h-4 w-4 accent-green-600 cursor-pointer"
                />
              </th>
            )}
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
        {ordenes.map((entrada) => (
          <tbody key={claveEntrada(entrada)}>
            {entrada.esGrupo ? (
              <>
                <FilaGrupo
                  grupo={entrada}
                  hoy={hoy}
                  abierto={desplegados.has(entrada.clave)}
                  onDesplegar={desplegar}
                  onAbrir={onAbrir}
                  estaSeleccionada={estaSeleccionada}
                  onSeleccionar={onSeleccionar}
                />
                {desplegados.has(entrada.clave) && entrada.fichas.map((f) => (
                  <FilaFicha key={claveEntrada(f)} ficha={f} sangrada {...propsFicha} />
                ))}
              </>
            ) : (
              <FilaFicha ficha={entrada} {...propsFicha} />
            )}
          </tbody>
        ))}
      </table>
    </div>
  );
}
