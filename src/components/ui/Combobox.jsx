import React from "react";

// Autocompletar con lista propia. Sustituye a <input list> + <datalist>, cuyo
// popup nativo en Android se dibuja semitransparente y roba el foco mientras
// se escribe. Aquí la lista es HTML normal: opaca, con scroll y sin quitar el
// foco del input (el mousedown se cancela), así se puede seguir escribiendo.
const normalizar = (texto) =>
  String(texto ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();

export default function Combobox({
  value = "",
  onChange,
  onSelect,
  options = [],
  placeholder = "",
  className = "",
  inputClassName = "",
  maxResultados = 20,
  emptyText = "Sin coincidencias",
  disabled = false,
}) {
  const [abierto, setAbierto] = React.useState(false);
  const [resaltado, setResaltado] = React.useState(-1);
  const contenedorRef = React.useRef(null);
  const listaId = React.useId();

  const resultados = React.useMemo(() => {
    const termino = normalizar(value);
    const coincide = (op) =>
      normalizar(op.label).includes(termino) || normalizar(op.sublabel).includes(termino);
    const base = termino ? options.filter(coincide) : options;
    return base.slice(0, maxResultados);
  }, [options, value, maxResultados]);

  // Cerrar al tocar fuera (en móvil el blur no siempre llega).
  React.useEffect(() => {
    if (!abierto) return;
    const alTocarFuera = (e) => {
      if (!contenedorRef.current?.contains(e.target)) setAbierto(false);
    };
    document.addEventListener("pointerdown", alTocarFuera);
    return () => document.removeEventListener("pointerdown", alTocarFuera);
  }, [abierto]);

  const elegir = (op) => {
    onChange?.(op.label);
    onSelect?.(op);
    setAbierto(false);
    setResaltado(-1);
  };

  const alTeclear = (e) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setAbierto(true);
      setResaltado((i) => Math.min(i + 1, resultados.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setResaltado((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      if (abierto && resultados[resaltado]) {
        e.preventDefault();
        elegir(resultados[resaltado]);
      }
    } else if (e.key === "Escape") {
      setAbierto(false);
      setResaltado(-1);
    }
  };

  return (
    <div ref={contenedorRef} className={`relative ${className}`}>
      <input
        type="text"
        value={value}
        disabled={disabled}
        onChange={(e) => { onChange?.(e.target.value); setAbierto(true); setResaltado(-1); }}
        onFocus={() => setAbierto(true)}
        onKeyDown={alTeclear}
        onBlur={(e) => { if (!contenedorRef.current?.contains(e.relatedTarget)) setAbierto(false); }}
        placeholder={placeholder}
        className={`w-full ${inputClassName}`}
        role="combobox"
        aria-expanded={abierto}
        aria-controls={listaId}
        aria-autocomplete="list"
        autoComplete="off"
      />
      {abierto && (
        <ul
          id={listaId}
          role="listbox"
          className="absolute left-0 right-0 top-full z-30 mt-1 max-h-56 overflow-y-auto overscroll-contain rounded-lg border border-gray-200 dark:border-gris-600 bg-white dark:bg-gris-800 shadow-xl text-sm"
        >
          {resultados.length === 0 ? (
            <li className="px-3 py-2.5 text-xs text-gray-500 dark:text-gray-400">{emptyText}</li>
          ) : (
            resultados.map((op, i) => (
              <li key={op.id ?? op.label} role="option" aria-selected={i === resaltado}>
                <button
                  type="button"
                  // Cancelar el mousedown evita que el input pierda el foco al
                  // tocar la opción; el click sigue llegando en móvil y escritorio.
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => elegir(op)}
                  onMouseEnter={() => setResaltado(i)}
                  className={`w-full text-left px-3 py-2.5 border-b border-gray-100 dark:border-gris-700 last:border-b-0 ${
                    i === resaltado ? "bg-indigo-50 dark:bg-gris-700" : "hover:bg-gray-50 dark:hover:bg-gris-700/60"
                  }`}
                >
                  <span className="block truncate">{op.label}</span>
                  {op.sublabel && (
                    <span className="block truncate text-[11px] text-gray-500 dark:text-gray-400">{op.sublabel}</span>
                  )}
                </button>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}
