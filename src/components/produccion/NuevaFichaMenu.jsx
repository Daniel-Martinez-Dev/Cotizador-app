import React from "react";
import { FaPlus, FaChevronDown } from "react-icons/fa";
import { PRODUCTOS } from "./productosFicha";

// "Nueva ficha" no puede ser un botón a secas: cada producto tiene su propio
// formulario, así que primero hay que elegir cuál. El menú los lista con su
// ícono para reconocerlos sin leer.
export default function NuevaFichaMenu({ onElegir }) {
  const [abierto, setAbierto] = React.useState(false);
  const ref = React.useRef(null);

  React.useEffect(() => {
    if (!abierto) return undefined;
    const fuera = (e) => { if (ref.current && !ref.current.contains(e.target)) setAbierto(false); };
    const esc = (e) => { if (e.key === "Escape") setAbierto(false); };
    document.addEventListener("mousedown", fuera);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("mousedown", fuera);
      document.removeEventListener("keydown", esc);
    };
  }, [abierto]);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setAbierto((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={abierto}
        className="inline-flex items-center gap-2 h-9 px-3.5 rounded-lg text-sm font-semibold bg-green-600 hover:bg-green-500 text-white shadow-sm focus:outline-none focus:ring-2 focus:ring-trafico/60"
      >
        <FaPlus className="text-xs" />
        Nueva ficha
        <FaChevronDown className={`text-[9px] opacity-80 transition-transform ${abierto ? "rotate-180" : ""}`} />
      </button>

      {abierto && (
        <div
          role="menu"
          className="absolute right-0 z-40 mt-2 w-64 rounded-xl border border-gray-200 dark:border-gris-600 bg-white dark:bg-gris-800 shadow-xl overflow-hidden animate-fade-in"
        >
          <div className="px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-gray-400 border-b border-gray-100 dark:border-gris-700">
            ¿De qué producto?
          </div>
          {PRODUCTOS.map(({ tipo, label, icon: Icon, tono }) => (
            <button
              key={tipo}
              type="button"
              role="menuitem"
              onClick={() => { setAbierto(false); onElegir(tipo); }}
              className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm text-left text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gris-700 focus:outline-none focus:bg-gray-50 dark:focus:bg-gris-700"
            >
              <Icon className={`text-sm shrink-0 ${tono}`} />
              {label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
