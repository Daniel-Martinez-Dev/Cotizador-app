import React from "react";
import { createPortal } from "react-dom";
import { FaChevronDown } from "react-icons/fa";
import {
  ESTADOS_FICHA, ESTADO_LABEL, ESTADO_CLS, ESTADO_DOT, ESTADO_ICON, normalizarEstado,
} from "./estadoFicha";

const MENU_ANCHO = 190;

// Badge de estado. Sin `onChange` es solo una etiqueta; con `onChange` se
// vuelve un selector rápido: un clic sobre el badge de la fila y se salta a
// cualquier estado sin abrir el detalle.
export default function EstadoBadge({ estado, className = "", onChange, title }) {
  const key = normalizarEstado(estado);
  const cls = `inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium border ${ESTADO_CLS[key]} ${className}`;

  const contenido = (
    <>
      <span className={`h-1.5 w-1.5 rounded-full ${ESTADO_DOT[key]} ${key === "en_produccion" ? "animate-pulse" : ""}`} />
      {ESTADO_LABEL[key]}
    </>
  );

  if (!onChange) {
    return <span className={cls} title={title}>{contenido}</span>;
  }

  return <EstadoSelector estadoActual={key} cls={cls} contenido={contenido} onChange={onChange} />;
}

function EstadoSelector({ estadoActual, cls, contenido, onChange }) {
  const botonRef = React.useRef(null);
  const menuRef = React.useRef(null);
  const [pos, setPos] = React.useState(null);

  const cerrar = React.useCallback(() => setPos(null), []);

  const abrir = (e) => {
    e.stopPropagation();
    const r = botonRef.current?.getBoundingClientRect();
    if (!r) return;
    // Posición fija: el menú vive en <body>, así no lo recorta el
    // overflow-x-auto de la tabla. Se voltea hacia arriba si no cabe abajo.
    const abajo = window.innerHeight - r.bottom > 190;
    setPos({
      top: abajo ? r.bottom + 4 : undefined,
      bottom: abajo ? undefined : window.innerHeight - r.top + 4,
      left: Math.min(Math.max(8, r.left), window.innerWidth - MENU_ANCHO - 8),
    });
  };

  React.useEffect(() => {
    if (!pos) return undefined;
    const alClic = (ev) => {
      if (menuRef.current?.contains(ev.target) || botonRef.current?.contains(ev.target)) return;
      cerrar();
    };
    const alTeclear = (ev) => { if (ev.key === "Escape") cerrar(); };
    document.addEventListener("mousedown", alClic);
    document.addEventListener("keydown", alTeclear);
    // Reposicionar sería peor que cerrar: el menú quedaría lejos del badge.
    window.addEventListener("scroll", cerrar, true);
    window.addEventListener("resize", cerrar);
    return () => {
      document.removeEventListener("mousedown", alClic);
      document.removeEventListener("keydown", alTeclear);
      window.removeEventListener("scroll", cerrar, true);
      window.removeEventListener("resize", cerrar);
    };
  }, [pos, cerrar]);

  const elegir = (e, estado) => {
    e.stopPropagation();
    cerrar();
    if (estado !== estadoActual) onChange(estado);
  };

  return (
    <>
      <button
        ref={botonRef}
        type="button"
        onClick={abrir}
        title="Cambiar estado"
        className={`${cls} cursor-pointer hover:brightness-95 dark:hover:brightness-125 transition`}
      >
        {contenido}
        <FaChevronDown className="text-[8px] opacity-60" />
      </button>

      {pos && createPortal(
        <div
          ref={menuRef}
          style={{ position: "fixed", top: pos.top, bottom: pos.bottom, left: pos.left, width: MENU_ANCHO }}
          className="z-50 rounded-lg border border-gray-200 dark:border-gris-600 bg-white dark:bg-gris-800 shadow-lg py-1"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="px-3 py-1 text-[10px] font-semibold uppercase tracking-wide text-gray-400">
            Cambiar estado
          </div>
          {ESTADOS_FICHA.map((e) => {
            const Icon = ESTADO_ICON[e];
            const esActual = e === estadoActual;
            return (
              <button
                key={e}
                type="button"
                onClick={(ev) => elegir(ev, e)}
                disabled={esActual}
                className={`w-full flex items-center gap-2 px-3 py-1.5 text-xs text-left transition ${
                  esActual
                    ? "text-gray-400 cursor-default"
                    : "text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gris-700"
                }`}
              >
                <Icon className={`text-[11px] ${esActual ? "" : "opacity-70"}`} />
                {ESTADO_LABEL[e]}
                {esActual && <span className="ml-auto text-[10px]">actual</span>}
              </button>
            );
          })}
        </div>,
        document.body
      )}
    </>
  );
}
