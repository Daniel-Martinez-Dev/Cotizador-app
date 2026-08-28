import React from "react";
import { FaTimes } from "react-icons/fa";
import { getDetalleComponent } from "../fichas/detallePorTipo";
import { productoDe } from "./productosFicha";

// Panel lateral con el detalle completo de una orden. Reusa el detalle que ya
// tenía cada línea de producto — medidas de corte, consumo, opciones y el
// control de estado con notas, firmas y entrega — así que desde aquí se hace
// todo lo que antes solo se podía hacer entrando a la pestaña del producto.
export default function OrdenDetallePanel({ ficha, onCerrar, ...acciones }) {
  const Detalle = ficha ? getDetalleComponent(ficha.tipo) : null;
  const producto = ficha ? productoDe(ficha.tipo) : null;
  const Icon = producto?.icon;

  React.useEffect(() => {
    if (!ficha) return undefined;
    const esc = (e) => { if (e.key === "Escape") onCerrar(); };
    document.addEventListener("keydown", esc);
    return () => document.removeEventListener("keydown", esc);
  }, [ficha, onCerrar]);

  if (!ficha) return null;

  return (
    <div className="fixed inset-0 z-[900] flex">
      <button type="button" className="absolute inset-0 bg-black/40" onClick={onCerrar} aria-label="Cerrar detalle" />
      <div className="relative ml-auto w-full max-w-5xl h-full bg-white dark:bg-gris-900 shadow-2xl flex flex-col animate-fade-in">
        <header className="flex items-center gap-3 px-4 py-3 border-b border-gray-200 dark:border-gris-700 shrink-0">
          {Icon && <Icon className={`text-base shrink-0 ${producto.tono}`} />}
          {/* El detalle ya abre con cliente, código y orden de compra; aquí
              basta con decir de qué producto es, que es lo que no repite. */}
          <div className="min-w-0">
            <div className="font-semibold text-sm text-gray-900 dark:text-white truncate">
              {ficha.tipoLabel}
            </div>
            <div className="text-[11px] text-gray-500 dark:text-gray-400 truncate">
              {ficha.cliente || "Sin cliente"}
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

        <div className="flex-1 overflow-y-auto overflow-x-hidden p-4 min-w-0">
          {Detalle ? (
            <Detalle ficha={ficha} numero={ficha.ordenProduccion} {...acciones} />
          ) : (
            <p className="text-sm text-gray-500 dark:text-gray-400 py-8 text-center">
              Este producto todavía no tiene una vista de detalle.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
