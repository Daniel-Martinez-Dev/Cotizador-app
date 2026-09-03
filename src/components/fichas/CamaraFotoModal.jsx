import React from "react";
import { FaTimes, FaCamera, FaSyncAlt, FaCheck, FaTrash, FaExclamationTriangle } from "react-icons/fa";
import { abrirCamaraFoto, capturarFoto, mensajeErrorCamara } from "../../utils/camaraFoto";

// Cámara dentro de la app para el registro fotográfico. Existe porque el
// WebView de Android no ofrece la cámara desde el selector de archivos (ver
// camaraFoto.js): sin esto, planta solo podía adjuntar fotos ya guardadas en
// la galería.
//
// Se toman varias seguidas sin salir: en una entrega se fotografían el pedido,
// las placas y el remisionado, y volver a abrir la cámara entre foto y foto es
// justo lo que hace tedioso el registro. Solo al pulsar "Usar fotos" se
// entregan al formulario.

export default function CamaraFotoModal({ maximo = 8, onListo, onClose, onUsarSistema }) {
  const videoRef = React.useRef(null);
  const detenerRef = React.useRef(null);
  const [camara, setCamara] = React.useState("environment");
  const [listaCamara, setListaCamara] = React.useState(false);
  const [error, setError] = React.useState("");
  const [tomadas, setTomadas] = React.useState([]);
  const [capturando, setCapturando] = React.useState(false);

  const restantes = Math.max(0, maximo - tomadas.length);

  // Las previews son object URLs: se sueltan al desmontar o se filtra memoria.
  // Va contra un ref por lo mismo que en FotosFichaPicker: un efecto que
  // dependiera de `tomadas` revocaría las previews aún visibles.
  const tomadasRef = React.useRef([]);
  React.useEffect(() => { tomadasRef.current = tomadas; }, [tomadas]);

  React.useEffect(() => {
    let cancelado = false;
    setError("");
    setListaCamara(false);
    (async () => {
      try {
        const detener = await abrirCamaraFoto({ video: videoRef.current, camara });
        if (cancelado) return detener();
        detenerRef.current = detener;
        setListaCamara(true);
      } catch (e) {
        console.error(e);
        if (!cancelado) setError(mensajeErrorCamara(e));
      }
    })();
    return () => {
      cancelado = true;
      detenerRef.current?.();
      detenerRef.current = null;
    };
  }, [camara]);

  // Apagar la cámara al salir es obligatorio; las previews solo se sueltan si
  // el usuario NO se llevó las fotos (si las usó, el formulario las necesita).
  React.useEffect(() => () => {
    detenerRef.current?.();
  }, []);

  const soltarPreviews = () => {
    for (const t of tomadasRef.current) URL.revokeObjectURL(t.preview);
  };

  const cerrar = () => {
    soltarPreviews();
    onClose?.();
  };

  const tomar = async () => {
    if (restantes <= 0 || capturando) return;
    setCapturando(true);
    try {
      const file = await capturarFoto(videoRef.current);
      setTomadas((prev) => [...prev, { file, preview: URL.createObjectURL(file) }]);
      // Confirmación física: en planta se dispara sin mirar la pantalla.
      try { navigator?.vibrate?.(40); } catch { /* sin vibración */ }
    } catch (e) {
      console.error(e);
      setError(mensajeErrorCamara(e));
    } finally {
      setCapturando(false);
    }
  };

  const descartar = (idx) => {
    setTomadas((prev) => {
      URL.revokeObjectURL(prev[idx].preview);
      return prev.filter((_, i) => i !== idx);
    });
  };

  const usar = () => {
    if (tomadas.length === 0) return cerrar();
    onListo?.(tomadas.map((t) => t.file));
    soltarPreviews();
  };

  return (
    <div className="fixed inset-0 z-[1100] bg-black flex flex-col">
      <div className="flex items-center justify-between gap-3 px-4 py-3 text-white shrink-0">
        <div className="text-sm font-semibold inline-flex items-center gap-2">
          <FaCamera /> Tomar fotos
        </div>
        <div className="text-xs text-white/70">{tomadas.length}/{maximo}</div>
        <button
          type="button"
          onClick={cerrar}
          aria-label="Cerrar cámara"
          className="h-9 w-9 rounded-full bg-white/15 flex items-center justify-center"
        >
          <FaTimes className="text-sm" />
        </button>
      </div>

      <div className="relative flex-1 min-h-0 bg-black">
        <video
          ref={videoRef}
          className={`h-full w-full object-contain ${error ? "invisible" : ""}`}
          playsInline
          muted
        />

        {!error && !listaCamara && (
          <div className="absolute inset-0 flex items-center justify-center text-white/70 text-sm">
            Encendiendo la cámara…
          </div>
        )}

        {error && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-6 text-center">
            <FaExclamationTriangle className="text-amber-400 text-2xl" />
            <p className="text-sm text-white/90">{error}</p>
            {/* Plan B: la cámara del sistema por el input con `capture`. Sirve
                en el aparato donde el WebView no entrega getUserMedia. */}
            {onUsarSistema && (
              <button
                type="button"
                onClick={() => { soltarPreviews(); onUsarSistema(); }}
                className="px-4 py-2.5 rounded-lg bg-white text-gray-900 text-sm font-semibold"
              >
                Abrir la cámara del teléfono
              </button>
            )}
            <button
              type="button"
              onClick={cerrar}
              className="text-xs text-white/70 underline"
            >
              Volver y elegir de la galería
            </button>
          </div>
        )}

        {listaCamara && !error && (
          <button
            type="button"
            onClick={() => setCamara((c) => (c === "environment" ? "user" : "environment"))}
            aria-label="Cambiar de cámara"
            className="absolute top-3 right-3 h-10 w-10 rounded-full bg-black/50 text-white flex items-center justify-center"
          >
            <FaSyncAlt className="text-sm" />
          </button>
        )}
      </div>

      {tomadas.length > 0 && (
        <div className="shrink-0 flex gap-2 overflow-x-auto px-4 py-2 no-scrollbar">
          {tomadas.map((t, i) => (
            <div key={t.preview} className="relative h-16 w-16 shrink-0 rounded-lg overflow-hidden border border-white/30">
              <img src={t.preview} alt="" className="h-full w-full object-cover" />
              <button
                type="button"
                onClick={() => descartar(i)}
                aria-label="Descartar foto"
                className="absolute top-0.5 right-0.5 h-5 w-5 rounded-full bg-black/70 text-white flex items-center justify-center"
              >
                <FaTrash className="text-[8px]" />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="shrink-0 flex items-center justify-between gap-4 px-6 pb-6 pt-2">
        <button
          type="button"
          onClick={cerrar}
          className="text-sm text-white/80 min-w-[72px] text-left"
        >
          Cancelar
        </button>

        {/* Disparador grande y centrado: se pulsa con guantes y sin apuntar. */}
        <button
          type="button"
          onClick={tomar}
          disabled={!listaCamara || !!error || restantes <= 0 || capturando}
          aria-label="Tomar foto"
          className="h-[72px] w-[72px] rounded-full bg-white ring-4 ring-white/40 disabled:opacity-30 flex items-center justify-center active:scale-95 transition"
        >
          <FaCamera className="text-gray-900 text-xl" />
        </button>

        <button
          type="button"
          onClick={usar}
          disabled={tomadas.length === 0}
          className="text-sm font-semibold text-white min-w-[72px] text-right disabled:opacity-40 inline-flex items-center justify-end gap-1.5"
        >
          <FaCheck className="text-xs" /> Usar {tomadas.length > 0 ? `(${tomadas.length})` : ""}
        </button>
      </div>

      {restantes <= 0 && (
        <div className="shrink-0 text-center text-[11px] text-amber-300 pb-3">
          Llegaste al máximo de {maximo} fotos.
        </div>
      )}
    </div>
  );
}
