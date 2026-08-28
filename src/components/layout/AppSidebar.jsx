import React from "react";
import { Link } from "react-router-dom";
import { FaAngleDoubleLeft, FaAngleDoubleRight } from "react-icons/fa";
import { gruposVisibles } from "./navSections";

// Anchos del lateral. También los usa AppShell para desplazar el contenido, así
// que si cambian hay que cambiarlos en un solo sitio: aquí.
export const SIDEBAR_ANCHO = { abierto: 240, colapsado: 64 };

// Un ítem del lateral. Colapsado se queda en el ícono, con el nombre en el
// tooltip; la marca de activo (barra amarilla a la izquierda) sobrevive a los
// dos estados, que es lo que responde "dónde estoy" de un vistazo.
export function ItemLateral({ seccion, active, colapsado, onClick }) {
  const Icon = seccion.icon;
  return (
    <Link
      to={seccion.to}
      onClick={onClick}
      aria-current={active ? "page" : undefined}
      title={colapsado ? seccion.label : seccion.desc}
      className={`relative flex items-center h-9 rounded-lg text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-inset focus:ring-trafico/60 ${
        colapsado ? "justify-center px-0" : "gap-3 pl-4 pr-3"
      } ${
        active
          ? "font-semibold bg-trafico/10 text-gray-900 dark:text-trafico"
          : "font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gris-800 hover:text-gray-900 dark:hover:text-white"
      }`}
    >
      {active && <span className="absolute left-0 inset-y-1 w-[3px] rounded-full bg-trafico" />}
      <Icon className={`text-[15px] shrink-0 ${active ? "" : "opacity-70"}`} />
      {!colapsado && <span className="truncate">{seccion.label}</span>}
    </Link>
  );
}

// Lista agrupada, compartida por el lateral de escritorio y el cajón móvil.
export function NavAgrupada({ grupos, activaTo, colapsado = false, onNavegar }) {
  const pintaGrupo = (g, i) => (
    <div key={g.titulo || `grupo-${i}`} className="grid gap-0.5">
      {g.titulo && (
        colapsado ? (
          <div className="mx-3 my-2 border-t border-gray-200 dark:border-gris-700" role="separator" />
        ) : (
          <div className="px-4 pt-4 pb-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-gray-400 dark:text-gray-500">
            {g.titulo}
          </div>
        )
      )}
      {g.secciones.map((s) => (
        <ItemLateral key={s.to} seccion={s} active={s.to === activaTo} colapsado={colapsado} onClick={onNavegar} />
      ))}
    </div>
  );

  return (
    <>
      {grupos.filter((g) => !g.alPie).map(pintaGrupo)}
      {/* Administración se va al pie: no es trabajo del día. */}
      <div className="flex-1 min-h-[16px]" />
      {grupos.filter((g) => g.alPie).map(pintaGrupo)}
    </>
  );
}

export default function AppSidebar({ permisos, activaTo, colapsado, onToggle }) {
  const grupos = React.useMemo(() => gruposVisibles(permisos), [permisos]);
  const ancho = colapsado ? SIDEBAR_ANCHO.colapsado : SIDEBAR_ANCHO.abierto;

  return (
    <aside
      style={{ width: ancho }}
      className="hidden md:flex fixed left-0 top-14 bottom-0 z-40 flex-col bg-white dark:bg-negro border-r border-gray-200 dark:border-gris-700 transition-[width] duration-150"
    >
      <nav className="flex-1 flex flex-col overflow-y-auto overflow-x-hidden py-2 px-2">
        <NavAgrupada grupos={grupos} activaTo={activaTo} colapsado={colapsado} />
      </nav>

      <div className="border-t border-gray-200 dark:border-gris-700 p-2">
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={!colapsado}
          title={colapsado ? "Expandir menú" : "Contraer menú"}
          className={`flex items-center h-9 w-full rounded-lg text-xs font-medium text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gris-800 hover:text-gray-900 dark:hover:text-white focus:outline-none focus:ring-2 focus:ring-trafico/60 ${
            colapsado ? "justify-center" : "gap-2.5 px-4"
          }`}
        >
          {colapsado ? <FaAngleDoubleRight className="text-sm" /> : <><FaAngleDoubleLeft className="text-sm" /> Contraer</>}
        </button>
      </div>
    </aside>
  );
}
