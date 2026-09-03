import React from "react";

// Barra de pestañas accesible (role=tablist/tab, aria-selected, navegación con flechas).
// variant="underline" → estilo subrayado (ver Usuarios).
// variant="boxed" → estilo de pestaña de carpeta (ver Producción).
//
// `deslizable` cambia el reparto en pantalla angosta: en vez de repartirse en
// varias líneas —cinco pestañas ocupaban tres renglones y empujaban la tabla
// fuera de la vista— quedan en una sola que se corre con el dedo, como los
// filtros del panel de planta.
export default function Tabs({ items, active, onChange, variant = "underline", deslizable = false }) {
  const refs = React.useRef([]);

  const focusTab = (idx) => {
    const el = refs.current[idx];
    if (el) el.focus();
  };

  const handleKeyDown = (e, idx) => {
    if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
      e.preventDefault();
      const dir = e.key === "ArrowRight" ? 1 : -1;
      const next = (idx + dir + items.length) % items.length;
      onChange(items[next].key);
      focusTab(next);
    } else if (e.key === "Home") {
      e.preventDefault();
      onChange(items[0].key);
      focusTab(0);
    } else if (e.key === "End") {
      e.preventDefault();
      const last = items.length - 1;
      onChange(items[last].key);
      focusTab(last);
    }
  };

  const reparto = deslizable
    ? "flex-nowrap overflow-x-auto no-scrollbar [&>button]:shrink-0"
    : "flex-wrap";
  const wrapCls = variant === "boxed"
    ? `flex ${reparto} items-center gap-0.5 border-b border-gray-200 dark:border-gris-700`
    : `flex ${deslizable ? reparto : ""} gap-1 border-b border-gray-200 dark:border-gris-700`;

  return (
    <div className={wrapCls} role="tablist">
      {items.map((t, idx) => {
        const isActive = active === t.key;
        const showDivider = variant === "boxed" && t.legacy && !items[idx - 1]?.legacy;
        const tabCls = variant === "boxed"
          ? `px-4 py-2.5 sm:py-2 text-sm font-medium rounded-t-md transition-colors border border-b-0 inline-flex items-center gap-1.5 ${
              isActive
                ? "bg-white dark:bg-gris-800 border-gray-200 dark:border-gris-700 text-blue-600 dark:text-blue-400 -mb-px"
                : "bg-transparent border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
            }`
          : `px-4 py-2.5 sm:py-2 text-sm font-medium rounded-t-lg border-b-2 transition-colors ${
              isActive
                ? "border-trafico text-gray-900 dark:text-white"
                : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
            }`;
        return (
          <React.Fragment key={t.key}>
            {showDivider && <span className="mx-2 h-5 w-px bg-gray-300 dark:bg-gris-600" aria-hidden="true" />}
            <button
              ref={(el) => (refs.current[idx] = el)}
              type="button"
              role="tab"
              aria-selected={isActive}
              tabIndex={isActive ? 0 : -1}
              onClick={() => onChange(t.key)}
              onKeyDown={(e) => handleKeyDown(e, idx)}
              className={tabCls}
            >
              {t.label}
              {t.legacy && (
                <span className="text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded bg-gray-200 dark:bg-gris-700 text-gray-500 dark:text-gray-400">
                  Legado
                </span>
              )}
              {typeof t.badge === "number" && t.badge > 0 && (
                <span className={`ml-1.5 text-[11px] px-1.5 py-0.5 rounded-full font-semibold ${
                  t.badgeTone === "warning" ? "bg-amber-500 text-white" : "bg-gray-200 dark:bg-gris-600 text-gray-700 dark:text-gray-300"
                }`}>
                  {t.badge}
                </span>
              )}
            </button>
          </React.Fragment>
        );
      })}
    </div>
  );
}
