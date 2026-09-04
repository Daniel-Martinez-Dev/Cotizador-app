import React from "react";
import { formatCOP } from "../inventario/inventarioUtils";
import {
  MILES,
  agruparMiles,
  cifrasTrasCursor,
  cursorTrasCifras,
  limpiarDinero,
  numeroDeDinero,
  textoDeDinero,
} from "../../utils/dineroTexto";

// Piezas de la sección contable.
//
// Antes cada pestaña reescribía sus propias clases de input, sus tarjetas de
// total y su cabecera de tabla, así que dos pantallas de la misma sección no
// se parecían entre sí: bordes distintos, alturas distintas, unas con foco
// visible y otras no. Aquí está una sola vez, con los criterios que pide una
// pantalla de contabilidad:
//
//   · el dinero se lee en columna → alineado a la derecha y con cifras de
//     ancho fijo (tabular-nums), para poder comparar de un vistazo;
//   · el cero no es un dato → se muestra como raya y no compite con las cifras;
//   · la tabla es larga → cabecera pegada arriba y fila resaltada al pasar;
//   · el foco se ve siempre → estas pantallas se llenan con el teclado.
//
// Y los que impone el teléfono, porque la sección también se usa en Android:
//
//   · el dedo no es un puntero → los controles miden 44 px hasta `sm`, que es
//     el mínimo con el que se acierta sin ampliar;
//   · una tabla de ocho columnas no cabe → cada listado tiene su versión en
//     tarjetas, no un scroll horizontal donde el saldo queda fuera de pantalla;
//   · ningún campo se queda sin etiqueta → las rejillas que en escritorio
//     rotulan con una cabecera de columnas repiten el rótulo en cada campo
//     cuando esa cabecera no está (md:sr-only).

// ─── Formulario ─────────────────────────────────────────────────────────────

// h-11 en el teléfono y h-9 desde `sm`: 44 px es el objetivo táctil mínimo, y
// text-base evita el zoom automático que hace el navegador al enfocar un campo
// de menos de 16 px.
export const claseControl =
  "w-full h-11 sm:h-9 px-3 text-base sm:text-sm rounded-md border border-gray-300 dark:border-gris-600 " +
  "bg-white dark:bg-gris-700 text-gray-900 dark:text-gray-100 " +
  "placeholder:text-gray-400 dark:placeholder:text-gray-500 " +
  "focus:outline-none focus:ring-2 focus:ring-trafico/50 focus:border-trafico " +
  "disabled:opacity-60 disabled:cursor-not-allowed transition-shadow";

export const Input = React.forwardRef(function Input({ className = "", ...props }, ref) {
  return <input ref={ref} className={`${claseControl} ${className}`} {...props} />;
});

// El desplegable nativo hereda del control el color del texto pero no siempre
// el fondo: en Android y en el Electron de Windows salía texto claro sobre
// fondo claro y las opciones no se leían. Se le fija el par a cada <option>.
const claseOpciones =
  "[&>option]:bg-white [&>option]:text-gray-900 dark:[&>option]:bg-gris-700 dark:[&>option]:text-gray-100 " +
  "[&>optgroup]:bg-white [&>optgroup]:text-gray-900 dark:[&>optgroup]:bg-gris-700 dark:[&>optgroup]:text-gray-100";

/**
 * Lista desplegable. La flecha es nuestra y no la del sistema (`appearance-none`)
 * porque la nativa cambia de tamaño y de color en cada plataforma, y en oscuro
 * se perdía contra el fondo del campo.
 *
 * `className` va al contenedor: es lo que las rejillas usan para colocarlo
 * (`col-span-2`, `hidden md:block`), y puesto en el <select> el ancho w-full no
 * dejaba que se aplicara.
 */
export const Select = React.forwardRef(function Select({ className = "", children, ...props }, ref) {
  return (
    <div className={`relative ${className}`}>
      <select
        ref={ref}
        className={`${claseControl} ${claseOpciones} appearance-none pr-9 cursor-pointer`}
        {...props}
      >
        {children}
      </select>
      <span
        aria-hidden="true"
        className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[9px] text-gray-500 dark:text-gray-400"
      >
        ▼
      </span>
    </div>
  );
});

// Input de dinero o cantidad: a la derecha y sin las flechitas del type=number,
// que en una tabla de cifras estorban más de lo que ayudan.
export const InputNumero = React.forwardRef(function InputNumero({ className = "", ...props }, ref) {
  return (
    <input
      ref={ref}
      type="number"
      inputMode="decimal"
      className={`${claseControl} text-right tabular-nums [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${className}`}
      {...props}
    />
  );
});

/**
 * Campo de dinero: va poniendo los puntos de miles a medida que se escribe.
 *
 * Un valor unitario de 1750000 en una caja sin separadores hay que contarlo
 * con el dedo en la pantalla, y un cero de más en una factura son diez veces
 * el valor. Escribe hacia el estado el número (o "" si se vació el campo), lo
 * mismo que hacía InputNumero, así que el resto del formulario no cambia.
 *
 * Es `type="text"`: un `type="number"` no admite los puntos, y el teclado
 * numérico del teléfono lo pone `inputMode`.
 */
export const InputDinero = React.forwardRef(function InputDinero(
  { value, onChange, className = "", placeholder = "0", ...props },
  refExterna
) {
  // El campo se guarda siempre aquí —hace falta para reponer el cursor— y de
  // paso se le pasa a quien haya pedido la ref, venga como objeto o como
  // función.
  const campo = React.useRef(null);
  const asignarRef = (el) => {
    campo.current = el;
    if (typeof refExterna === "function") refExterna(el);
    else if (refExterna) refExterna.current = el;
  };
  const [texto, setTexto] = React.useState(() => textoDeDinero(value));
  // Cuántas cifras tenían que quedar a la derecha del cursor tras reformatear.
  const cursorPendiente = React.useRef(null);

  const valorNumero = value === "" || value === null || value === undefined ? "" : Number(value);

  // El valor también llega de fuera ("Abonar el saldo", abrir otra factura).
  // Mientras coincida con lo que hay tecleado manda el texto: reescribirlo
  // borraría la coma o el cero a medio escribir.
  React.useEffect(() => {
    setTexto((actual) => (numeroDeDinero(actual) === valorNumero ? actual : textoDeDinero(valorNumero)));
  }, [valorNumero]);

  React.useLayoutEffect(() => {
    const cifras = cursorPendiente.current;
    cursorPendiente.current = null;
    const el = campo.current;
    if (cifras === null || !el || document.activeElement !== el) return;
    const pos = cursorTrasCifras(el.value, cifras);
    el.setSelectionRange(pos, pos);
  }, [texto]);

  const aplicar = (bruto, cursor) => {
    cursorPendiente.current = cifrasTrasCursor(bruto, cursor);
    const formateado = agruparMiles(limpiarDinero(bruto));
    setTexto(formateado);
    onChange?.(numeroDeDinero(formateado));
  };

  const alTeclear = (e) => {
    props.onKeyDown?.(e);
    if (e.key !== "Backspace" || e.defaultPrevented) return;
    const el = e.target;
    const { selectionStart: ini, selectionEnd: fin } = el;
    // El punto lo pone el formato: borrarlo no quitaría nada y el campo se
    // quedaba trabado. Se borra el dígito que tiene delante.
    if (ini !== fin || ini < 2 || el.value[ini - 1] !== MILES) return;
    e.preventDefault();
    aplicar(el.value.slice(0, ini - 2) + el.value.slice(ini), ini - 2);
  };

  return (
    <div className="relative">
      <span
        aria-hidden="true"
        className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400 dark:text-gray-500"
      >
        $
      </span>
      <input
        {...props}
        ref={asignarRef}
        type="text"
        inputMode="decimal"
        autoComplete="off"
        value={texto}
        placeholder={placeholder}
        onChange={(e) => aplicar(e.target.value, e.target.selectionStart ?? e.target.value.length)}
        onKeyDown={alTeclear}
        className={`${claseControl} pl-7 text-right tabular-nums ${className}`}
      />
    </div>
  );
});

/**
 * Etiqueta + control. `hint` explica la consecuencia de lo que se escribe, no
 * el nombre del campo otra vez; `error` lo reemplaza y lo pinta en rojo.
 */
export function Campo({ label, children, hint, error, requerido = false, className = "" }) {
  return (
    <label className={`grid gap-1 min-w-0 ${className}`}>
      {label && (
        <span className="text-[11px] font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
          {label}
          {requerido && <span className="text-red-500 ml-0.5">*</span>}
        </span>
      )}
      {children}
      {(error || hint) && (
        <span className={`text-[11px] leading-tight ${error ? "text-red-600 dark:text-red-400" : "text-gray-500 dark:text-gray-400"}`}>
          {error || hint}
        </span>
      )}
    </label>
  );
}

/** Casilla con su texto clicable entero, no solo el cuadrito de 13 px. */
export function Casilla({ checked, onChange, children, className = "" }) {
  return (
    <label className={`inline-flex items-center gap-2.5 min-h-[44px] sm:min-h-0 text-sm cursor-pointer select-none ${className}`}>
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        className="h-5 w-5 sm:h-4 sm:w-4 shrink-0 rounded border-gray-300 dark:border-gris-500 text-trafico focus:ring-2 focus:ring-trafico/50"
      />
      <span className="text-gray-700 dark:text-gray-200">{children}</span>
    </label>
  );
}

// ─── Acciones de una fila ───────────────────────────────────────────────────

const TONOS_ICONO = {
  neutral:
    "border-gray-300 dark:border-gris-600 bg-white dark:bg-gris-700 text-gray-600 dark:text-gray-300 " +
    "hover:bg-gray-100 dark:hover:bg-gris-600 hover:text-gray-900 dark:hover:text-white",
  bueno:
    "border-emerald-300 dark:border-emerald-500/40 bg-emerald-50 dark:bg-emerald-900/25 text-emerald-700 dark:text-emerald-300 " +
    "hover:bg-emerald-100 dark:hover:bg-emerald-900/50",
  malo:
    "border-red-300 dark:border-red-500/40 bg-red-50 dark:bg-red-900/25 text-red-700 dark:text-red-300 " +
    "hover:bg-red-100 dark:hover:bg-red-900/50",
};

/**
 * Acción de una fila, en símbolo.
 *
 * En una tabla de doce columnas, tres botones con su palabra —"Editar",
 * "Abonos", "Anular"— se comían el ancho que le hace falta al nombre del
 * cliente y a las cifras, que es a lo que se viene. El nombre sigue estando en
 * el `title` y en el `aria-label`, así que ni el lector de pantalla ni el
 * puntero se quedan sin él.
 *
 * `onClick` corta la propagación: la fila entera abre el detalle, y pulsar una
 * acción no puede abrirlo además de hacer lo suyo.
 */
export function BotonIcono({ titulo, onClick, tono = "neutral", disabled = false, children, className = "" }) {
  return (
    <button
      type="button"
      title={titulo}
      aria-label={titulo}
      disabled={disabled}
      onClick={(e) => { e.stopPropagation(); onClick?.(e); }}
      className={
        "inline-flex h-9 w-9 sm:h-8 sm:w-8 shrink-0 items-center justify-center rounded-md border shadow-sm " +
        "transition-colors focus:outline-none focus:ring-2 focus:ring-trafico/60 " +
        `disabled:opacity-40 disabled:cursor-not-allowed ${TONOS_ICONO[tono] || TONOS_ICONO.neutral} ${className}`
      }
    >
      {children}
    </button>
  );
}

// ─── Contenedores ───────────────────────────────────────────────────────────

export function Card({ children, className = "", padding = "p-4", ...props }) {
  return (
    <div
      className={`rounded-xl border border-gray-200 dark:border-gris-700 bg-white dark:bg-gris-800 shadow-sm ${padding} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}

/**
 * Bloque con título dentro de un formulario largo: da dónde apoyar la vista.
 *
 * Sin `overflow-hidden`, a propósito: recortaba en el borde de la sección la
 * lista del autocompletar de cliente y la de producto, y las opciones salían a
 * medias o no salían. Las esquinas de arriba las redondea la cabecera (11 px,
 * que es el radio de la sección menos el píxel del borde).
 */
export function Seccion({ titulo, descripcion, acciones, children, className = "" }) {
  return (
    <section className={`rounded-xl border border-gray-200 dark:border-gris-700 ${className}`}>
      <header className="flex items-center justify-between gap-3 px-3 sm:px-4 py-2.5 rounded-t-[11px] bg-gray-50 dark:bg-gris-900/60 border-b border-gray-200 dark:border-gris-700">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">{titulo}</h3>
          {descripcion && <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">{descripcion}</p>}
        </div>
        {acciones && <div className="shrink-0 flex items-center gap-2">{acciones}</div>}
      </header>
      <div className="p-3 sm:p-4">{children}</div>
    </section>
  );
}

// ─── Cifras ─────────────────────────────────────────────────────────────────

const TONOS_KPI = {
  neutral: "text-gray-900 dark:text-white",
  bueno: "text-emerald-600 dark:text-emerald-400",
  aviso: "text-amber-600 dark:text-amber-400",
  malo: "text-red-600 dark:text-red-400",
  info: "text-blue-600 dark:text-blue-400",
};

/**
 * Tarjeta de total. Es la fila de totales de la hoja FACT, pero respetando el
 * filtro puesto — lo que hacía su SUBTOTAL(109;…).
 */
export function KPI({ titulo, valor, detalle, tono = "neutral", compacto = false, className = "" }) {
  return (
    <div className={`rounded-xl border border-gray-200 dark:border-gris-700 bg-white dark:bg-gris-800 shadow-sm px-3.5 py-3 ${className}`}>
      <div className="text-[10px] font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400 truncate" title={titulo}>
        {titulo}
      </div>
      <div className={`${compacto ? "text-sm" : "text-base"} font-semibold tabular-nums mt-1 ${TONOS_KPI[tono] || TONOS_KPI.neutral}`}>
        {valor}
      </div>
      {detalle && <div className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5 truncate" title={detalle}>{detalle}</div>}
    </div>
  );
}

/** Dinero en una celda: alineado, de ancho fijo, y el cero como raya. */
export function Money({ valor, className = "", cero = "—", fuerte = false }) {
  const n = Number(valor) || 0;
  if (!n && cero) return <span className="text-gray-400 dark:text-gray-500">{cero}</span>;
  return (
    <span className={`tabular-nums whitespace-nowrap ${fuerte ? "font-semibold" : ""} ${className}`}>
      {formatCOP(n)}
    </span>
  );
}

/**
 * Fila de la tarjeta móvil: rótulo a la izquierda, cifra a la derecha.
 *
 * Es la traducción de una fila de tabla al teléfono. La tabla rotula una vez
 * arriba y deja las celdas desnudas; en una tarjeta esa cabecera no existe, así
 * que cada dato lleva su nombre al lado o no se sabe qué cifra se está mirando.
 */
export function FilaDato({ label, children, className = "" }) {
  return (
    <div className={`flex items-baseline justify-between gap-3 py-1 ${className}`}>
      <span className="text-[11px] uppercase tracking-wide text-gray-500 dark:text-gray-400 shrink-0">{label}</span>
      <span className="text-sm text-right min-w-0 truncate">{children}</span>
    </div>
  );
}

/**
 * Fila de totales. En escritorio es una rejilla; en el teléfono, una tira que
 * se desliza con el dedo.
 *
 * Apilar seis totales en una rejilla de dos columnas ocupaba tres pantallazos
 * antes de llegar a la primera factura: los totales son contexto, no el
 * contenido, y no deberían empujar la lista fuera de la vista.
 */
export function TiraTotales({ children, columnas = "sm:grid-cols-3 xl:grid-cols-6", className = "" }) {
  return (
    <div
      className={
        // El -mx-3 tiene que casar con el px-3 de ContabilidadPage: si se resta
        // más de lo que la página acolcha, la tira sobresale y aparece un
        // scroll horizontal en toda la pantalla.
        "flex gap-2 overflow-x-auto no-scrollbar -mx-3 px-3 snap-x snap-mandatory " +
        "sm:mx-0 sm:px-0 sm:overflow-visible sm:grid " +
        // El reparto viaja como parámetro y no como clase añadida: dos
        // `sm:grid-cols-*` en el mismo elemento no compiten por orden de
        // escritura sino por el orden en que Tailwind las emite, y gana la que
        // no se pidió.
        `${columnas} [&>*]:min-w-[9.5rem] [&>*]:snap-start sm:[&>*]:min-w-0 ${className}`
      }
    >
      {children}
    </div>
  );
}

// ─── Tabla ──────────────────────────────────────────────────────────────────

export function Tabla({ children, className = "" }) {
  return (
    <div className={`overflow-x-auto rounded-xl border border-gray-200 dark:border-gris-700 bg-white dark:bg-gris-800 shadow-sm ${className}`}>
      <table className="w-full text-xs border-collapse">{children}</table>
    </div>
  );
}

/** Cabecera pegada arriba: la tabla del año pasa de las 300 filas. */
export function Th({ children, align = "left", className = "" }) {
  const alineacion = align === "right" ? "text-right" : align === "center" ? "text-center" : "text-left";
  return (
    <th
      className={`sticky top-0 z-10 bg-gray-50 dark:bg-gris-900 px-3 py-2 font-semibold text-[11px] uppercase tracking-wide text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gris-700 ${alineacion} ${className}`}
    >
      {children}
    </th>
  );
}

export function Td({ children, align = "left", className = "" }) {
  const alineacion = align === "right" ? "text-right" : align === "center" ? "text-center" : "text-left";
  return <td className={`px-3 py-2 align-middle ${alineacion} ${className}`}>{children}</td>;
}

export function Tr({ children, apagada = false, className = "", ...props }) {
  return (
    <tr
      className={`border-b border-gray-100 dark:border-gris-700/60 last:border-0 hover:bg-gray-50 dark:hover:bg-gris-700/40 transition-colors ${apagada ? "opacity-50" : ""} ${className}`}
      {...props}
    >
      {children}
    </tr>
  );
}

// ─── Modal ──────────────────────────────────────────────────────────────────

/**
 * Ventana de la sección. Cabecera y pie fijos con el contenido desplazándose
 * en medio: el formulario de una factura no cabe en pantalla y, sin esto,
 * había que bajar hasta el final para encontrar el botón de guardar.
 *
 * Cierra con Escape y bloquea el scroll de la página detrás, que es lo que
 * hacía que al cerrar el modal se hubiera perdido la posición del listado.
 *
 * En el teléfono ocupa la pantalla entera. Flotar una ventana con márgenes y
 * esquinas redondeadas sobre un fondo oscurecido regala tres centímetros de
 * alto a la decoración, y son justo los que le faltan al formulario de una
 * factura; los botones del pie pasan a ocupar el ancho completo, apilados, que
 * es donde el pulgar los alcanza sin recolocar la mano.
 */
export function Modal({ titulo, subtitulo, insignia, onCerrar, ancho = "max-w-5xl", pie, children, onSubmit }) {
  const tituloId = React.useId();

  React.useEffect(() => {
    const alTeclear = (e) => { if (e.key === "Escape") onCerrar?.(); };
    window.addEventListener("keydown", alTeclear);
    const previo = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", alTeclear);
      document.body.style.overflow = previo;
    };
  }, [onCerrar]);

  const Cuerpo = onSubmit ? "form" : "div";

  // Enter no envía el formulario. En una factura de varias líneas, la tecla
  // que se usa para pasar de un campo al siguiente no puede ser la que la
  // guarda a medio llenar; para guardar está el botón del pie.
  const alTeclearDentro = (e) => {
    if (e.key !== "Enter") return;
    const destino = e.target;
    if (destino.tagName === "TEXTAREA" || destino.type === "submit") return;
    e.preventDefault();
  };

  return (
    <div className="fixed inset-0 z-[1000] flex items-stretch sm:items-start justify-center p-0 sm:p-6" role="dialog" aria-modal="true" aria-labelledby={tituloId}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onCerrar} />
      <Cuerpo
        {...(onSubmit ? { onSubmit, onKeyDown: alTeclearDentro } : {})}
        className={`relative w-full ${ancho} h-full sm:h-auto sm:max-h-full flex flex-col bg-white dark:bg-gris-800 border-0 sm:border border-gray-200 dark:border-gris-600 rounded-none sm:rounded-xl shadow-2xl overflow-hidden`}
      >
        <header className="shrink-0 flex items-start justify-between gap-3 px-4 sm:px-5 py-3 sm:py-3.5 border-b border-gray-200 dark:border-gris-700 bg-gray-50 dark:bg-gris-900/50">
          <div className="min-w-0">
            <h2 id={tituloId} className="text-base font-semibold text-gray-900 dark:text-white flex items-center gap-2 flex-wrap">
              {titulo}
              {insignia}
            </h2>
            {subtitulo && <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{subtitulo}</p>}
          </div>
          <button
            type="button"
            onClick={onCerrar}
            aria-label="Cerrar"
            className="shrink-0 h-11 w-11 sm:h-8 sm:w-8 -mr-2 sm:mr-0 inline-flex items-center justify-center rounded-md text-gray-500 hover:text-gray-900 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-gris-700 focus:outline-none focus:ring-2 focus:ring-trafico/50"
          >
            ✕
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-4 sm:px-5 py-4">{children}</div>

        {pie && (
          <footer className="shrink-0 flex flex-col-reverse sm:flex-row sm:flex-wrap items-stretch sm:items-center sm:justify-end gap-2 px-4 sm:px-5 py-3 sm:py-3.5 border-t border-gray-200 dark:border-gris-700 bg-gray-50 dark:bg-gris-900/50 [&>button]:w-full sm:[&>button]:w-auto">
            {pie}
          </footer>
        )}
      </Cuerpo>
    </div>
  );
}

// ─── Avisos ─────────────────────────────────────────────────────────────────

const TONOS_AVISO = {
  info: "border-blue-300 dark:border-blue-500/40 bg-blue-50 dark:bg-blue-900/20 text-blue-900 dark:text-blue-200",
  aviso: "border-amber-300 dark:border-amber-500/40 bg-amber-50 dark:bg-amber-900/20 text-amber-900 dark:text-amber-200",
  malo: "border-red-300 dark:border-red-500/40 bg-red-50 dark:bg-red-900/20 text-red-900 dark:text-red-200",
  bueno: "border-emerald-300 dark:border-emerald-500/40 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-900 dark:text-emerald-200",
};

export function Aviso({ tono = "info", titulo, children, acciones, className = "" }) {
  return (
    <div className={`rounded-lg border px-3 py-2.5 text-xs ${TONOS_AVISO[tono] || TONOS_AVISO.info} ${className}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          {titulo && <div className="font-semibold mb-0.5">{titulo}</div>}
          <div className="leading-relaxed">{children}</div>
        </div>
        {acciones && <div className="shrink-0 flex items-center gap-2">{acciones}</div>}
      </div>
    </div>
  );
}

/** Buscador con lupa y botón de limpiar: el filtro puesto tiene que verse. */
export function Buscador({ value, onChange, placeholder = "Buscar…", className = "" }) {
  return (
    <div className={`relative ${className}`}>
      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none text-sm" aria-hidden="true">
        🔍
      </span>
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={`${claseControl} pl-9 ${value ? "pr-11 sm:pr-9" : ""}`}
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange("")}
          aria-label="Limpiar búsqueda"
          className="absolute right-1 sm:right-2 top-1/2 -translate-y-1/2 h-9 w-9 sm:h-6 sm:w-6 inline-flex items-center justify-center rounded text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
        >
          ✕
        </button>
      )}
    </div>
  );
}
