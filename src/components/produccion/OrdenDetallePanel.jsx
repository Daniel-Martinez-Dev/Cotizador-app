import React from "react";
import { FaTimes, FaTag } from "react-icons/fa";
import { getDetalleComponent } from "../fichas/detallePorTipo";
import { CotizacionBadge } from "../fichas/CotizacionSelector";
import { productoDe } from "./productosFicha";

// Panel lateral con el detalle completo de una orden. Reusa el detalle que ya
// tenía cada línea de producto — medidas de corte, consumo, opciones y el
// control de estado con notas, firmas y entrega — así que desde aquí se hace
// todo lo que antes solo se podía hacer entrando a la pestaña del producto.
export default function OrdenDetallePanel({ ficha, onCerrar, onVerCotizacion, ...acciones }) {
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
              basta con decir de qué producto es, que es lo que no repite. El
              detalle libre de la ficha sí va aquí: es lo que dice cuál de las
              seis órdenes iguales del pedido se tiene abierta. */}
          <div className="min-w-0">
            <div className="font-semibold text-sm text-gray-900 dark:text-white truncate">
              {ficha.tipoLabel}
            </div>
            <div className="text-[11px] text-gray-500 dark:text-gray-400 truncate">
              {ficha.cliente || "Sin cliente"}
            </div>
          </div>
          {ficha.nombreFicha && (
            <span
              title={ficha.nombreFicha}
              className="min-w-0 shrink inline-flex items-center gap-1.5 rounded-md bg-gray-900 dark:bg-white px-2.5 py-1 text-xs font-bold uppercase tracking-wide text-white dark:text-gray-900"
            >
              <FaTag className="text-[10px] shrink-0 opacity-70" />
              <span className="truncate min-w-0">{ficha.nombreFicha}</span>
            </span>
          )}
          {/* De qué cotización salió, cuando se vinculó. Este panel es de la
              oficina —planta tiene el suyo en pages/empleado, que no la
              monta—, así que aquí sí se dice. */}
          <CotizacionBadge ficha={ficha} onAbrir={onVerCotizacion ? () => onVerCotizacion(ficha) : null} />
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
