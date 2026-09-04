import React from "react";
import { FaExclamationTriangle, FaRegClock, FaLayerGroup, FaChevronRight, FaTag } from "react-icons/fa";
import { productoDe } from "./productosFicha";
import { alertaGrupo } from "./ordenesAgrupar";
import { ESTADOS_FICHA, ESTADO_DOT, ESTADO_LABEL_CORTO } from "../fichas/estadoFicha";
import { fmtDate } from "../../utils/fichaFormat";

// Tarjeta de una orden de compra completa en el tablero: un pedido, una
// tarjeta, aunque por dentro sean tres fichas de tres productos distintos.
//
// Lo que muestra es lo que se necesita para decidir sin abrirla — de quién es,
// qué trae, cuánto falta y para cuándo—; el detalle de cada ficha está a un
// clic, dentro.
//
// La casilla marca el pedido entero. Es la razón de ser de la agrupación: la
// orden de compra se alista y se despacha junta, y marcarla completa evita que
// salgan los sellos y se queden los topes (ver BarraLoteFichas).

const ALERTA = {
  vencida:  { cls: "text-red-700 bg-red-50 border-red-200 dark:text-red-300 dark:bg-red-900/30 dark:border-red-800",                icon: FaExclamationTriangle, texto: "Vencida" },
  hoy:      { cls: "text-orange-700 bg-orange-50 border-orange-200 dark:text-orange-300 dark:bg-orange-900/30 dark:border-orange-800", icon: FaRegClock,            texto: "Entrega hoy" },
  proxima:  { cls: "text-amber-700 bg-amber-50 border-amber-200 dark:text-amber-300 dark:bg-amber-900/30 dark:border-amber-800",       icon: FaRegClock,            texto: "Próxima" },
};

// Más de tres líneas de producto y la tarjeta deja de caber en la columna; el
// resto se cuenta y se ve al abrir el pedido.
const MAX_PRODUCTOS = 3;

export default function OrdenCompraCard({ grupo, hoy, onAbrir, seleccionada, onSeleccionar }) {
  const alerta = alertaGrupo(grupo.fichas, hoy);
  const meta = alerta ? ALERTA[alerta] : null;
  const AlertaIcon = meta?.icon;

  const visibles = grupo.productos.slice(0, MAX_PRODUCTOS);
  const ocultos = grupo.productos.length - visibles.length;

  // Solo los estados que de verdad tiene el pedido: pintar los cuatro siempre
  // llenaría la tarjeta de ceros.
  const estados = ESTADOS_FICHA.filter((e) => grupo.porEstado[e] > 0);

  return (
    <div className="relative">
      {/* Las hojas de debajo: dicen que la tarjeta es un pedido con varias
          fichas antes de leer nada. */}
      <div
        aria-hidden
        className="absolute inset-x-2 -bottom-1 h-2 rounded-b-xl border border-t-0 border-gray-200 dark:border-gris-600 bg-gray-100 dark:bg-gris-700/60"
      />
      <article
        onClick={() => onAbrir(grupo)}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onAbrir(grupo); } }}
        role="button"
        tabIndex={0}
        className={`group relative text-left w-full min-w-0 overflow-hidden rounded-xl border p-3 shadow-sm hover:shadow-md focus:outline-none focus:ring-2 focus:ring-trafico/60 transition cursor-pointer ${
          seleccionada
            ? "border-green-500 dark:border-green-500 bg-green-50/70 dark:bg-green-900/20"
            : "border-gray-300 dark:border-gris-600 bg-white dark:bg-gris-800 hover:border-gray-400 dark:hover:border-gris-500"
        }`}
      >
        <div className="flex items-start justify-between gap-2">
          {onSeleccionar && (
            <input
              type="checkbox"
              checked={!!seleccionada}
              onChange={() => onSeleccionar(grupo)}
              onClick={(e) => e.stopPropagation()}
              aria-label={`Seleccionar las ${grupo.fichas.length} fichas de la orden de compra ${grupo.numeroOrdenCompra}`}
              className="mt-0.5 h-4 w-4 shrink-0 accent-green-600 cursor-pointer"
            />
          )}
          {/* La OC manda en esta tarjeta: es el número con el que el cliente
              pregunta y con el que se arma el despacho, así que va en pleno y
              no como la etiqueta discreta de la ficha suelta. */}
          <span
            title={`Orden de compra ${grupo.numeroOrdenCompra}`}
            className="min-w-0 truncate inline-flex items-center gap-1.5 font-mono text-[11px] font-bold px-2 py-0.5 rounded-md bg-gray-900 text-white dark:bg-white dark:text-gray-900"
          >
            <FaLayerGroup className="text-[9px] shrink-0 opacity-80" />
            OC {grupo.numeroOrdenCompra}
          </span>
          {meta && (
            <span className={`shrink-0 whitespace-nowrap inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded border ${meta.cls}`}>
              <AlertaIcon className="text-[9px]" /> {meta.texto}
            </span>
          )}
        </div>

        <div className="mt-1.5 font-semibold text-sm text-gray-900 dark:text-white truncate" title={grupo.cliente || ""}>
          {grupo.cliente || "Sin cliente"}
        </div>

        <div className="mt-0.5 text-[11px] text-gray-500 dark:text-gray-400">
          {grupo.fichas.length} fichas · {grupo.unidades} unidad{grupo.unidades === 1 ? "" : "es"}
        </div>

        <ul className="mt-2 space-y-1">
          {visibles.map(({ tipo, label, fichas }) => {
            const producto = productoDe(tipo);
            const Icon = producto?.icon;
            return (
              <li key={tipo} className="flex items-center gap-1.5 text-[11px] text-gray-600 dark:text-gray-300 min-w-0">
                {Icon && <Icon className={`shrink-0 ${producto.tono}`} />}
                <span className="truncate min-w-0">{label}</span>
                {fichas > 1 && <span className="shrink-0 font-mono text-gray-400">×{fichas}</span>}
              </li>
            );
          })}
          {ocultos > 0 && (
            <li className="text-[11px] text-gray-400 dark:text-gray-500">+{ocultos} producto{ocultos === 1 ? "" : "s"} más</li>
          )}
        </ul>

        {/* Los detalles de las líneas, en un renglón: es lo que dice que el
            pedido son el muelle 5, el 6 y el 7 y no tres sellos sueltos. Solo
            el titular — cada uno con su ficha está al abrir el pedido. */}
        {grupo.detalles.length > 0 && (
          <div
            title={grupo.detalles.join(" · ")}
            className="mt-2 flex items-center gap-1.5 text-[11px] font-semibold text-gray-700 dark:text-gray-200 min-w-0"
          >
            <FaTag className="shrink-0 text-[9px] text-gray-400" />
            <span className="truncate min-w-0 uppercase tracking-wide">{grupo.detalles.join(" · ")}</span>
          </div>
        )}

        <div className="mt-2.5 pt-2.5 border-t border-gray-100 dark:border-gris-700 flex items-center justify-between gap-2 min-w-0">
          {/* El avance del pedido: cuántas fichas van en cada estado. El estado
              de la tarjeta es el de la más atrasada, así que esto es lo que
              cuenta qué falta para poder despachar. */}
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 min-w-0">
            {estados.map((estado) => (
              <span key={estado} className="inline-flex items-center gap-1 text-[10px] text-gray-500 dark:text-gray-400 whitespace-nowrap">
                <span className={`h-1.5 w-1.5 rounded-full ${ESTADO_DOT[estado]}`} />
                {grupo.porEstado[estado]} {ESTADO_LABEL_CORTO[estado]}
              </span>
            ))}
          </div>
          <span className="shrink-0 inline-flex items-center gap-1 text-[11px] text-gray-500 dark:text-gray-400">
            {grupo.fechaEntrega && <>{fmtDate(grupo.fechaEntrega)}</>}
            <FaChevronRight className="text-[9px] opacity-60 group-hover:translate-x-0.5 transition-transform" />
          </span>
        </div>
      </article>
    </div>
  );
}
