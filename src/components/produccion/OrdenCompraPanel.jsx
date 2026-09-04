import React from "react";
import { FaTimes, FaLayerGroup, FaFileAlt, FaChevronRight, FaCheckCircle, FaTruck, FaTag } from "react-icons/fa";
import EstadoBadge from "../fichas/EstadoBadge";
import useFlujoLote from "../fichas/useFlujoLote";
import { resumenCorto } from "../fichas/detallePorTipo";
import { ESTADOS_FICHA, ESTADO_DOT, ESTADO_LABEL } from "../fichas/estadoFicha";
import { productoDe } from "./productosFicha";
import { codigoFichaOFallback } from "../../utils/codigoFicha";
import { fmtDate } from "../../utils/fichaFormat";
import NuevaFichaMenu from "./NuevaFichaMenu";

// El pedido abierto: todas las fichas de una misma orden de compra, en una sola
// pantalla. Es lo que se mira antes de despachar — si están las tres líneas,
// cuáles faltan por terminar y con qué medidas salió cada una— y desde donde se
// entra a cada ficha sin tener que buscarla otra vez en el tablero.
//
// Las acciones de cierre son las del lote de siempre (useFlujoLote): un solo
// formulario de firma y un solo despacho para el pedido entero, que es el
// motivo por el que estas órdenes están juntas.
export default function OrdenCompraPanel({
  grupo, tapado = false, onCerrar, onAbrirFicha, onVerFicha, onCambiarEstado, onAgregarFicha, onAplicarLote,
}) {
  const { paraTerminar, paraEntregar, terminar, entregar, modales } =
    useFlujoLote(grupo?.fichas || [], { onAplicar: onAplicarLote });

  // `tapado`: hay una ficha o su impresión abierta encima. Sin esto un Escape
  // cerraría las dos capas de un golpe y sacaría del pedido a quien solo quería
  // salir de la ficha.
  React.useEffect(() => {
    if (!grupo || tapado) return undefined;
    const esc = (e) => { if (e.key === "Escape") onCerrar(); };
    document.addEventListener("keydown", esc);
    return () => document.removeEventListener("keydown", esc);
  }, [grupo, tapado, onCerrar]);

  if (!grupo) return null;

  const estados = ESTADOS_FICHA.filter((e) => grupo.porEstado[e] > 0);

  return (
    <>
      <div className="fixed inset-0 z-[900] flex">
        <button type="button" className="absolute inset-0 bg-black/40" onClick={onCerrar} aria-label="Cerrar pedido" />
        <div className="relative ml-auto w-full max-w-3xl h-full bg-white dark:bg-gris-900 shadow-2xl flex flex-col animate-fade-in">
          <header className="flex items-center gap-3 px-4 py-3 border-b border-gray-200 dark:border-gris-700 shrink-0">
            <FaLayerGroup className="text-base shrink-0 text-gray-500 dark:text-gray-400" />
            <div className="min-w-0">
              <div className="font-semibold text-sm text-gray-900 dark:text-white truncate">
                Orden de compra <span className="font-mono">{grupo.numeroOrdenCompra}</span>
              </div>
              <div className="text-[11px] text-gray-500 dark:text-gray-400 truncate">
                {grupo.cliente || "Sin cliente"}
              </div>
            </div>
            <button
              type="button"
              onClick={onCerrar}
              aria-label="Cerrar"
              className="ml-auto shrink-0 h-8 w-8 inline-flex items-center justify-center rounded-lg border border-gray-300 dark:border-gris-600 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gris-800"
            >
              <FaTimes className="text-xs" />
            </button>
          </header>

          {/* Cabecera del pedido: de un vistazo, cuánto es y qué falta. */}
          <div className="px-4 py-2.5 border-b border-gray-200 dark:border-gris-700 shrink-0 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11px] text-gray-600 dark:text-gray-300">
            <span className="font-medium">
              {grupo.fichas.length} fichas · {grupo.unidades} unidad{grupo.unidades === 1 ? "" : "es"}
            </span>
            {estados.map((estado) => (
              <span key={estado} className="inline-flex items-center gap-1 whitespace-nowrap">
                <span className={`h-1.5 w-1.5 rounded-full ${ESTADO_DOT[estado]}`} />
                {grupo.porEstado[estado]} {ESTADO_LABEL[estado]}
              </span>
            ))}
            {grupo.fechaEntrega && (
              <span className="ml-auto whitespace-nowrap">
                Entrega <span className="font-medium text-gray-800 dark:text-gray-100">{fmtDate(grupo.fechaEntrega)}</span>
              </span>
            )}
          </div>

          <div className="flex-1 overflow-y-auto overflow-x-hidden p-3 space-y-2 min-w-0">
            {grupo.fichas.map((f) => {
              const producto = productoDe(f.tipo);
              const Icon = producto?.icon;
              const medidas = resumenCorto(f);
              return (
                <article
                  key={`${f.tipo}-${f.id}`}
                  onClick={() => onAbrirFicha(f)}
                  onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onAbrirFicha(f); } }}
                  role="button"
                  tabIndex={0}
                  className="group w-full min-w-0 rounded-xl border border-gray-200 dark:border-gris-700 bg-white dark:bg-gris-800 p-3 hover:border-gray-300 dark:hover:border-gris-500 hover:shadow-sm focus:outline-none focus:ring-2 focus:ring-trafico/60 transition cursor-pointer"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="font-mono text-[11px] text-gray-500 dark:text-gray-400 shrink-0">
                      {codigoFichaOFallback(f, f.tipo)}
                    </span>
                    {Icon && <Icon className={`shrink-0 ${producto.tono}`} />}
                    <span className="text-sm font-medium text-gray-900 dark:text-white truncate min-w-0">
                      {f.tipoLabel}
                    </span>
                    <FaChevronRight className="ml-auto shrink-0 text-[10px] text-gray-400 group-hover:translate-x-0.5 transition-transform" />
                  </div>

                  {/* Dentro de un pedido, dos líneas del mismo producto solo se
                      distinguen por su detalle: va antes que las medidas. */}
                  {f.nombreFicha && (
                    <div className="mt-1.5 inline-flex max-w-full items-center gap-1.5 rounded-md bg-gray-900 dark:bg-white px-2 py-1 text-[11px] font-bold uppercase tracking-wide text-white dark:text-gray-900">
                      <FaTag className="text-[9px] shrink-0 opacity-70" />
                      <span className="truncate min-w-0">{f.nombreFicha}</span>
                    </div>
                  )}

                  <div className="mt-1 flex items-center gap-2 text-[11px] text-gray-500 dark:text-gray-400 min-w-0">
                    {medidas && <span className="font-mono">{medidas}</span>}
                    {f.cantidad > 1 && <span>×{f.cantidad}</span>}
                    {f.fechaEntrega && <span className="truncate">Entrega {fmtDate(f.fechaEntrega)}</span>}
                  </div>

                  <div
                    className="mt-2 pt-2 border-t border-gray-100 dark:border-gris-700 flex items-center justify-between gap-2"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <EstadoBadge estado={f.estado} onChange={(estado) => onCambiarEstado(f.id, estado)} />
                    <button
                      type="button"
                      onClick={() => onVerFicha(f)}
                      className="shrink-0 inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] rounded-lg border border-gray-300 dark:border-gris-600 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gris-700"
                    >
                      <FaFileAlt className="text-[10px]" /> Ver ficha
                    </button>
                  </div>
                </article>
              );
            })}
          </div>

          {/* El pedido se cierra completo: una firma de alistado y un despacho
              para las tres líneas, que es justo lo que se hace en la puerta del
              camión. */}
          <footer className="shrink-0 border-t border-gray-200 dark:border-gris-700 p-3 flex flex-wrap items-center gap-2">
            {onAgregarFicha && (
              <NuevaFichaMenu onElegir={onAgregarFicha} label="Agregar al pedido" arriba />
            )}
            <div className="ml-auto flex gap-2">
              {paraTerminar.length > 0 && (
                <button
                  type="button"
                  onClick={terminar}
                  className="inline-flex items-center justify-center gap-1.5 h-9 px-3 rounded-lg bg-green-600 hover:bg-green-500 text-white text-xs font-semibold"
                >
                  <FaCheckCircle className="text-[11px]" /> Firmar y terminar ({paraTerminar.length})
                </button>
              )}
              {paraEntregar.length > 0 && (
                <button
                  type="button"
                  onClick={entregar}
                  className="inline-flex items-center justify-center gap-1.5 h-9 px-3 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold"
                >
                  <FaTruck className="text-[11px]" /> Firmar y entregar ({paraEntregar.length})
                </button>
              )}
              {paraEntregar.length === 0 && (
                <span className="text-[11px] text-gray-500 dark:text-gray-400">
                  Pedido entregado. Las correcciones se hacen ficha por ficha.
                </span>
              )}
            </div>
          </footer>
        </div>
      </div>
      {modales}
    </>
  );
}
