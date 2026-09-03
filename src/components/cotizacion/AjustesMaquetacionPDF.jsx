// Ventana flotante para mover tamaños y posiciones del PDF sin tocar código.
//
// Flota y se arrastra a propósito: para maquetar hay que ver el PDF grande (o a
// pantalla completa) mientras se mueven los valores, y un panel fijo en la
// columna lateral obliga a elegir entre ver el documento o ver los controles.
//
// Los controles afectan al preview de inmediato, pero solo se vuelven el
// predeterminado de la empresa al pulsar "Guardar como predeterminado": así se
// puede tantear sin cambiarle el PDF a todo el mundo.
import React, { useCallback, useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import {
  CAMPOS_AJUSTABLES,
  SECCIONES_AJUSTES,
  valorPorDefecto,
  guardarAjustesPDF,
  hayAjustes,
} from "../../utils/pdfLayoutConfig";

const CLAVE_POSICION = "pdfLayoutPanelPos";
const ANCHO = 320;

function posicionInicial() {
  try {
    const guardada = JSON.parse(localStorage.getItem(CLAVE_POSICION));
    if (guardada && typeof guardada.x === "number" && typeof guardada.y === "number") return guardada;
  } catch {
    // Sin posición guardada: se abre arriba a la derecha.
  }
  return { x: Math.max(16, window.innerWidth - ANCHO - 32), y: 96 };
}

// Mantiene la ventana dentro de la pantalla: si se guardó una posición con el
// navegador más ancho, al abrir en una pantalla menor quedaría inalcanzable.
function acotar({ x, y }) {
  const maxX = Math.max(0, window.innerWidth - 120);
  const maxY = Math.max(0, window.innerHeight - 60);
  return { x: Math.min(Math.max(0, x), maxX), y: Math.min(Math.max(0, y), maxY) };
}

export default function AjustesMaquetacionPDF({ ajustes, onCambiar, onRestaurar, onCerrar, onActualizar }) {
  const [pos, setPos] = useState(() => acotar(posicionInicial()));
  const [minimizado, setMinimizado] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const arrastreRef = useRef(null);

  const modificado = hayAjustes(ajustes);

  // El arrastre se sigue en window, no en la cabecera: si el puntero va más
  // rápido que el repintado y sale del elemento, el panel se quedaría pegado.
  useEffect(() => {
    const mover = (e) => {
      if (!arrastreRef.current) return;
      const { dx, dy } = arrastreRef.current;
      setPos(acotar({ x: e.clientX - dx, y: e.clientY - dy }));
    };
    const soltar = () => {
      if (!arrastreRef.current) return;
      arrastreRef.current = null;
      setPos((p) => {
        try { localStorage.setItem(CLAVE_POSICION, JSON.stringify(p)); } catch {}
        return p;
      });
    };
    window.addEventListener("pointermove", mover);
    window.addEventListener("pointerup", soltar);
    window.addEventListener("pointercancel", soltar);
    return () => {
      window.removeEventListener("pointermove", mover);
      window.removeEventListener("pointerup", soltar);
      window.removeEventListener("pointercancel", soltar);
    };
  }, []);

  useEffect(() => {
    const alRedimensionar = () => setPos((p) => acotar(p));
    window.addEventListener("resize", alRedimensionar);
    return () => window.removeEventListener("resize", alRedimensionar);
  }, []);

  const empezarArrastre = (e) => {
    if (e.button !== 0) return;
    arrastreRef.current = { dx: e.clientX - pos.x, dy: e.clientY - pos.y };
  };

  // Teclado: mover la ventana sin ratón (accesibilidad y pantallas pequeñas).
  const moverConTeclado = useCallback((e) => {
    const paso = e.shiftKey ? 40 : 12;
    const delta = { ArrowLeft: [-paso, 0], ArrowRight: [paso, 0], ArrowUp: [0, -paso], ArrowDown: [0, paso] }[e.key];
    if (!delta) return;
    e.preventDefault();
    setPos((p) => {
      const siguiente = acotar({ x: p.x + delta[0], y: p.y + delta[1] });
      try { localStorage.setItem(CLAVE_POSICION, JSON.stringify(siguiente)); } catch {}
      return siguiente;
    });
  }, []);

  const valorDe = (campo) => {
    const guardado = ajustes?.[campo.grupo]?.[campo.clave];
    return typeof guardado === "number" ? guardado : valorPorDefecto(campo);
  };

  const cambiar = (campo, valorCrudo) => {
    const valor = parseFloat(valorCrudo);
    if (isNaN(valor)) return;
    onCambiar({
      ...ajustes,
      [campo.grupo]: { ...(ajustes?.[campo.grupo] || {}), [campo.clave]: valor },
    });
  };

  const guardar = async () => {
    setGuardando(true);
    try {
      await guardarAjustesPDF(ajustes);
      toast.success("Maquetación guardada como predeterminada");
    } catch (e) {
      console.error("Error guardando ajustes de maquetación:", e);
      toast.error("No se pudieron guardar los ajustes");
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div
      className="fixed z-[60] rounded-2xl shadow-2xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 flex flex-col"
      style={{ left: pos.x, top: pos.y, width: ANCHO, maxHeight: "82vh" }}
      role="dialog"
      aria-label="Ajustes de maquetación del PDF"
    >
      {/* Cabecera = asa de arrastre */}
      <div
        onPointerDown={empezarArrastre}
        onKeyDown={moverConTeclado}
        tabIndex={0}
        role="button"
        aria-label="Mover la ventana de ajustes (flechas del teclado)"
        title="Arrastra para mover · flechas del teclado también"
        className="flex items-center justify-between gap-2 px-3 py-2 rounded-t-2xl bg-gray-100 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600 cursor-move select-none focus:outline-none focus:ring-2 focus:ring-blue-500/50"
      >
        <span className="flex items-center gap-2 min-w-0">
          <span className="text-gray-400 dark:text-gray-300 shrink-0" aria-hidden="true">⠿</span>
          <span className="text-sm font-semibold text-gray-700 dark:text-gray-100 truncate">Ajustes de maquetación</span>
          {modificado && (
            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-200 whitespace-nowrap">
              modificada
            </span>
          )}
        </span>
        <span className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={() => setMinimizado((v) => !v)}
            aria-label={minimizado ? "Desplegar" : "Plegar"}
            title={minimizado ? "Desplegar" : "Plegar"}
            className="w-6 h-6 rounded-md text-gray-500 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 text-xs"
          >{minimizado ? "▢" : "—"}</button>
          <button
            type="button"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={onCerrar}
            aria-label="Cerrar ajustes"
            title="Cerrar"
            className="w-6 h-6 rounded-md text-gray-500 dark:text-gray-300 hover:bg-red-100 dark:hover:bg-red-900/50 hover:text-red-600 text-xs"
          >✕</button>
        </span>
      </div>

      {!minimizado && (
        <>
          <div className="overflow-y-auto px-3 py-3 space-y-4 min-h-0">
            <p className="text-[11px] text-gray-500 dark:text-gray-400">
              Los cambios se aplican a la vista previa. El PDF que descargues usa exactamente estos valores.
            </p>

            {SECCIONES_AJUSTES.map((seccion) => (
              <div key={seccion} className="space-y-2.5">
                <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500 border-b border-gray-100 dark:border-gray-700 pb-1">
                  {seccion}
                </p>
                {CAMPOS_AJUSTABLES.filter((c) => c.seccion === seccion).map((campo) => {
                  const valor = valorDe(campo);
                  const esDefecto = valor === valorPorDefecto(campo);
                  const id = `ajuste-${campo.grupo}-${campo.clave}`;
                  return (
                    <div key={id}>
                      <div className="flex items-center justify-between gap-2 mb-0.5">
                        <label htmlFor={id} className="text-[11px] font-medium text-gray-600 dark:text-gray-300">
                          {campo.etiqueta}
                        </label>
                        <span className={`text-[11px] tabular-nums ${esDefecto ? "text-gray-400" : "text-blue-600 dark:text-blue-300 font-semibold"}`}>
                          {valor}{campo.unidad ? ` ${campo.unidad}` : ""}
                        </span>
                      </div>
                      <input
                        id={id}
                        type="range"
                        min={campo.min}
                        max={campo.max}
                        step={campo.paso}
                        value={valor}
                        onChange={(e) => cambiar(campo, e.target.value)}
                        className="w-full accent-blue-600"
                      />
                    </div>
                  );
                })}
              </div>
            ))}
          </div>

          <div className="border-t border-gray-200 dark:border-gray-700 px-3 py-2.5 space-y-2 rounded-b-2xl bg-white dark:bg-gray-800">
            <button
              type="button"
              onClick={onActualizar}
              className="w-full bg-gray-800 dark:bg-gray-600 text-white px-3 py-2 rounded-lg text-xs font-medium hover:bg-gray-900 dark:hover:bg-gray-500 transition-colors"
            >
              🔄 Actualizar vista ahora
            </button>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={guardar}
                disabled={guardando}
                className="flex-1 bg-blue-600 text-white px-3 py-2 rounded-lg text-xs font-medium hover:bg-blue-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {guardando ? "Guardando…" : "Guardar como predeterminado"}
              </button>
              <button
                type="button"
                onClick={onRestaurar}
                disabled={!modificado}
                className="px-3 py-2 rounded-lg text-xs font-medium border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Restaurar
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
