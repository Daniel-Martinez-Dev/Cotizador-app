import React from "react";
import toast from "react-hot-toast";
import { FaTimes, FaUndo, FaEraser, FaCheck } from "react-icons/fa";
import {
  COLOR_TRAZO,
  FIRMA_MAX_BYTES,
  GROSOR_TRAZO,
  dibujarTrazos,
  hayTrazos,
  limitesTrazos,
  pesoDataUrl,
  trazosAPng,
} from "../../utils/firmaDibujo";

// Lienzo para dibujar la firma con el dedo o con el mouse.
//
// Se usan eventos de puntero (no de mouse ni de touch por separado): son los
// únicos que en el mismo código atienden dedo, lápiz y mouse, y con
// `setPointerCapture` el trazo no se corta si el dedo se sale del recuadro.
// El lienzo lleva `touch-action: none` porque, sin eso, Android interpreta el
// arrastre como desplazamiento de la página y no llega a dibujarse nada.
//
// Lo dibujado vive en `trazosRef` como lista de trazos (ver firmaDibujo.js), no
// como píxeles: por eso se puede deshacer trazo por trazo, y al redimensionarse
// el lienzo (girar el teléfono) el trazo se vuelve a pintar en vez de perderse.
// Los puntos conservan sus coordenadas originales, así que si el lienzo se
// angosta la firma no se reencuadra sola — da igual para lo que se guarda,
// porque el PNG se exporta recortado a la firma (ver trazosAPng).

// Proporción del recuadro: ancho de una firma normal, no un cuadrado.
const RELACION = 2.6;
// Una firma tiene que tener algo de recorrido; un toque suelto no es una firma.
const RECORRIDO_MINIMO = 24;

export default function FirmaPad({ firmaActual = "", guardando = false, onGuardar, onClose }) {
  const canvasRef = React.useRef(null);
  const contenedorRef = React.useRef(null);
  const trazosRef = React.useRef([]);
  const trazoActivoRef = React.useRef(null);
  const [vacio, setVacio] = React.useState(true);

  // Repinta todo desde los trazos guardados. Se llama al cambiar de tamaño el
  // lienzo (girar el teléfono, abrir el teclado) y al deshacer.
  const repintar = React.useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const dpr = window.devicePixelRatio || 1;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, canvas.width / dpr, canvas.height / dpr);
    dibujarTrazos(ctx, trazosRef.current, { grosor: GROSOR_TRAZO, color: COLOR_TRAZO });
  }, []);

  // El lienzo se dimensiona en píxeles reales del dispositivo (× devicePixelRatio)
  // y se muestra a su tamaño CSS: en una pantalla de celular, sin esto, el trazo
  // sale escalonado.
  React.useEffect(() => {
    const contenedor = contenedorRef.current;
    const canvas = canvasRef.current;
    if (!contenedor || !canvas) return;

    const ajustar = () => {
      const ancho = contenedor.clientWidth;
      const alto = Math.round(ancho / RELACION);
      const dpr = window.devicePixelRatio || 1;
      canvas.style.width = `${ancho}px`;
      canvas.style.height = `${alto}px`;
      canvas.width = Math.round(ancho * dpr);
      canvas.height = Math.round(alto * dpr);
      repintar();
    };

    ajustar();
    const observer = new ResizeObserver(ajustar);
    observer.observe(contenedor);
    return () => observer.disconnect();
  }, [repintar]);

  const puntoDe = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const empezar = (e) => {
    // Con el dedo, el navegador seguiría mandando también eventos de mouse
    // sintéticos y el trazo se duplicaría.
    e.preventDefault();
    try {
      canvasRef.current.setPointerCapture?.(e.pointerId);
    } catch {}
    trazoActivoRef.current = [puntoDe(e)];
    trazosRef.current = [...trazosRef.current, trazoActivoRef.current];
    setVacio(false);
    repintar();
  };

  const seguir = (e) => {
    if (!trazoActivoRef.current) return;
    e.preventDefault();
    // Los eventos agrupados son las posiciones intermedias que el navegador no
    // alcanzó a entregar una por una: sin ellas, un trazo rápido sale poligonal.
    const eventos = e.nativeEvent.getCoalescedEvents?.() || [e];
    for (const ev of eventos) trazoActivoRef.current.push(puntoDe(ev));
    repintar();
  };

  // Con la captura activa el pointerup llega al lienzo aunque el dedo se haya
  // salido del recuadro, así que no hace falta cerrar el trazo al salir.
  const terminar = (e) => {
    if (!trazoActivoRef.current) return;
    // Soltar una captura que ya no está lanza excepción, y desde un manejador
    // de eventos eso dejaría el trazo sin cerrar.
    try {
      canvasRef.current?.releasePointerCapture?.(e.pointerId);
    } catch {}
    trazoActivoRef.current = null;
  };

  const deshacer = () => {
    trazosRef.current = trazosRef.current.slice(0, -1);
    setVacio(!hayTrazos(trazosRef.current));
    repintar();
  };

  const limpiar = () => {
    trazosRef.current = [];
    setVacio(true);
    repintar();
  };

  const guardar = () => {
    const limites = limitesTrazos(trazosRef.current);
    // Un punto suelto o un roce se guardarían como una firma que en la ficha se
    // vería como una mancha: mejor avisar que dejarlo pasar.
    if (!limites || Math.max(limites.ancho, limites.alto) < RECORRIDO_MINIMO) {
      toast.error("Dibuja tu firma dentro del recuadro");
      return;
    }
    const png = trazosAPng(trazosRef.current);
    if (pesoDataUrl(png) > FIRMA_MAX_BYTES) {
      toast.error("La firma quedó demasiado pesada. Hazla con menos trazos.");
      return;
    }
    onGuardar(png);
  };

  return (
    <div className="fixed inset-0 z-[1100]">
      <div className="absolute inset-0 bg-black/60" onClick={guardando ? undefined : onClose} />
      <div className="absolute inset-x-0 bottom-0 sm:inset-0 sm:flex sm:items-center sm:justify-center sm:p-4">
        <div className="w-full sm:max-w-xl bg-white dark:bg-gris-800 rounded-t-2xl sm:rounded-2xl border border-gray-200 dark:border-gris-700 shadow-xl overflow-hidden">

          <div className="p-4 border-b border-gray-200 dark:border-gris-700 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="text-sm font-semibold">Dibuja tu firma</div>
              <div className="text-xs text-gray-500 dark:text-gray-400">
                Con el dedo en el celular o con el mouse
              </div>
            </div>
            <button type="button" onClick={onClose} disabled={guardando}
              className="h-8 w-8 shrink-0 rounded border border-gray-300 dark:border-gris-600 bg-gray-50 dark:bg-gris-700 flex items-center justify-center disabled:opacity-40">
              <FaTimes className="text-sm" />
            </button>
          </div>

          <div className="p-4 space-y-3">
            {/* El recuadro va siempre en blanco, también en modo oscuro: la firma
                se guarda en trazo negro y así se ve tal como saldrá impresa. */}
            <div ref={contenedorRef} className="relative rounded-xl border-2 border-dashed border-gray-300 dark:border-gris-600 bg-white overflow-hidden">
              <canvas
                ref={canvasRef}
                onPointerDown={empezar}
                onPointerMove={seguir}
                onPointerUp={terminar}
                onPointerCancel={terminar}
                className="block touch-none cursor-crosshair"
              />
              {/* La línea guía y el texto no forman parte del dibujo: van encima
                  del lienzo, no dentro de él, y no se exportan. */}
              <div className="pointer-events-none absolute inset-x-6 bottom-[22%] border-b border-gray-300" />
              {vacio && (
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-sm text-gray-400">
                  Firma aquí
                </div>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button type="button" onClick={deshacer} disabled={vacio || guardando}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-gray-300 dark:border-gris-600 bg-gray-50 dark:bg-gris-700 text-xs font-medium disabled:opacity-40">
                <FaUndo className="text-[10px]" /> Deshacer
              </button>
              <button type="button" onClick={limpiar} disabled={vacio || guardando}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-gray-300 dark:border-gris-600 bg-gray-50 dark:bg-gris-700 text-xs font-medium disabled:opacity-40">
                <FaEraser className="text-[10px]" /> Borrar todo
              </button>
              {firmaActual && (
                <span className="ml-auto text-[11px] text-gray-500 dark:text-gray-400">
                  Reemplaza tu firma actual
                </span>
              )}
            </div>
          </div>

          <div className="p-4 border-t border-gray-200 dark:border-gris-700 flex gap-2">
            <button type="button" onClick={onClose} disabled={guardando}
              className="flex-1 py-2.5 rounded-lg border border-gray-300 dark:border-gris-600 bg-gray-50 dark:bg-gris-700 text-sm font-medium disabled:opacity-50">
              Cancelar
            </button>
            <button type="button" onClick={guardar} disabled={vacio || guardando}
              className="flex-1 inline-flex items-center justify-center gap-2 py-2.5 rounded-lg bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white text-sm font-semibold">
              <FaCheck className="text-xs" /> {guardando ? "Guardando…" : "Usar esta firma"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
