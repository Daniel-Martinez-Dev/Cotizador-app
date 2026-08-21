import React from "react";
import { FaTimes, FaCamera, FaKeyboard, FaBarcode, FaExclamationTriangle } from "react-icons/fa";
import {
  iniciarEscaneoCamara,
  soportaCamara,
  soportaDetectorNativo,
  vibrarConfirmacion,
} from "../../utils/escanerCodigo";
import { normalizarCodigoLeido } from "../../utils/codigoMaterial";

// Ventana de lectura de código. Los tres caminos conviven en la misma pantalla
// porque dependen del aparato que tenga delante quien la abre:
//
//   · Cámara  → celular de planta (Android). Es el modo por defecto ahí.
//   · Pistola → PC de bodega. Teclea en el campo y remata con Enter sin que
//               nadie tenga que tocar nada: por eso el campo arranca enfocado.
//   · A mano  → el SKU escrito, para cuando la etiqueta está rota o mojada.
//
// El campo enfocado es lo que hace que la pistola funcione sola, así que no se
// le quita el foco aunque se encienda la cámara.
export default function EscanerCodigoModal({
  titulo = "Escanear material",
  descripcion = "",
  onDetect,
  onClose,
  error = "",
  ocupado = false,
}) {
  const [manual, setManual] = React.useState("");
  const [camaraActiva, setCamaraActiva] = React.useState(false);
  const [errorCamara, setErrorCamara] = React.useState("");
  const videoRef = React.useRef(null);
  const inputRef = React.useRef(null);
  const detenerRef = React.useRef(null);
  // El último código evita que un mismo material se dispare en cada frame
  // mientras la etiqueta siga delante del lente.
  const ultimoRef = React.useRef("");

  const puedeUsarCamara = soportaCamara() && soportaDetectorNativo();

  React.useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const emitir = React.useCallback((codigo) => {
    const limpio = normalizarCodigoLeido(codigo);
    if (!limpio || limpio === ultimoRef.current) return;
    ultimoRef.current = limpio;
    vibrarConfirmacion();
    onDetect?.(limpio);
    // Se libera enseguida para poder reintentar el mismo código si no se
    // encontró (p. ej. material aún sin etiquetar en la base).
    setTimeout(() => { ultimoRef.current = ""; }, 1200);
  }, [onDetect]);

  const detenerCamara = React.useCallback(() => {
    detenerRef.current?.();
    detenerRef.current = null;
    setCamaraActiva(false);
  }, []);

  const encenderCamara = React.useCallback(async () => {
    setErrorCamara("");
    // El vídeo se muestra ANTES de reproducirlo: un <video> en display:none
    // puede no decodificar frames, y entonces el detector no vería nunca nada.
    // El await de getUserMedia da tiempo de sobra a que React pinte el cambio.
    setCamaraActiva(true);
    try {
      const detener = await iniciarEscaneoCamara({
        video: videoRef.current,
        onCodigo: emitir,
      });
      detenerRef.current = detener;
    } catch (e) {
      console.error(e);
      setErrorCamara(
        e?.name === "NotAllowedError"
          ? "Permiso de cámara denegado. Actívalo en los ajustes de la app."
          : (e?.message || "No se pudo abrir la cámara")
      );
      setCamaraActiva(false);
    }
  }, [emitir]);

  // La cámara se apaga sí o sí al cerrar: si no, el led sigue encendido y el
  // teléfono se calienta con la app abierta en otra pantalla.
  React.useEffect(() => () => { detenerRef.current?.(); }, []);

  const submitManual = (e) => {
    e.preventDefault();
    const codigo = normalizarCodigoLeido(manual);
    if (!codigo) return;
    ultimoRef.current = "";
    emitir(codigo);
    setManual("");
  };

  const cerrar = () => {
    detenerCamara();
    onClose?.();
  };

  return (
    <div className="fixed inset-0 z-[1200]">
      <div className="absolute inset-0 bg-black/60" onClick={cerrar} />
      <div className="absolute inset-x-0 bottom-0 sm:inset-0 sm:flex sm:items-center sm:justify-center">
        <div className="w-full sm:max-w-md bg-white dark:bg-gris-800 rounded-t-2xl sm:rounded-2xl border border-gray-200 dark:border-gris-700 shadow-xl max-h-[90vh] overflow-hidden flex flex-col">
          <div className="p-4 border-b border-gray-200 dark:border-gris-700 flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="text-sm font-semibold inline-flex items-center gap-2">
                <FaBarcode className="text-gray-500" /> {titulo}
              </div>
              {descripcion && (
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{descripcion}</div>
              )}
            </div>
            <button
              type="button"
              onClick={cerrar}
              aria-label="Cerrar"
              className="h-8 w-8 shrink-0 rounded border border-gray-300 dark:border-gris-600 bg-gray-50 dark:bg-gris-700 flex items-center justify-center"
            >
              <FaTimes className="text-sm" />
            </button>
          </div>

          <div className="p-4 overflow-y-auto flex-1 space-y-3">
            {error && (
              <div className="rounded-lg border border-red-300 dark:border-red-800 bg-red-50 dark:bg-red-950/40 px-3 py-2 text-sm text-red-800 dark:text-red-300 inline-flex items-start gap-2 w-full">
                <FaExclamationTriangle className="mt-0.5 shrink-0 text-xs" />
                <span>{error}</span>
              </div>
            )}

            {puedeUsarCamara && (
              <div>
                <div
                  className={`relative rounded-lg overflow-hidden bg-black ${camaraActiva ? "" : "hidden"}`}
                  style={{ aspectRatio: "4 / 3" }}
                >
                  <video ref={videoRef} className="w-full h-full object-cover" playsInline muted />
                  {/* Guía de puntería: sin ella el operario no sabe a qué
                      distancia poner la etiqueta y barre a ciegas. */}
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="w-[80%] h-[38%] border-2 border-white/80 rounded-lg shadow-[0_0_0_2000px_rgba(0,0,0,0.35)]" />
                  </div>
                </div>

                <button
                  type="button"
                  onClick={camaraActiva ? detenerCamara : encenderCamara}
                  className={`mt-2 w-full inline-flex items-center justify-center gap-2 min-h-[44px] rounded-lg text-sm font-semibold ${
                    camaraActiva
                      ? "border border-gray-300 dark:border-gris-600 bg-gray-50 dark:bg-gris-700 text-gray-700 dark:text-gray-200"
                      : "bg-indigo-600 hover:bg-indigo-500 text-white"
                  }`}
                >
                  <FaCamera /> {camaraActiva ? "Apagar cámara" : "Escanear con la cámara"}
                </button>

                {errorCamara && (
                  <div className="text-xs text-red-700 dark:text-red-400 mt-1.5">{errorCamara}</div>
                )}
              </div>
            )}

            {!puedeUsarCamara && (
              <div className="rounded-lg border border-gray-200 dark:border-gris-700 bg-gray-50 dark:bg-gris-700/40 px-3 py-2 text-xs text-gray-600 dark:text-gray-300">
                Este equipo no puede leer códigos con la cámara. Usa el lector de
                pistola sobre el campo de abajo, o escribe el código a mano.
              </div>
            )}

            <form onSubmit={submitManual}>
              <label className="text-xs text-gray-600 dark:text-gray-300 inline-flex items-center gap-1.5">
                <FaKeyboard className="text-[10px]" /> Lector de pistola o código a mano
              </label>
              <input
                ref={inputRef}
                value={manual}
                onChange={(e) => setManual(e.target.value)}
                autoFocus
                autoComplete="off"
                autoCapitalize="characters"
                spellCheck={false}
                placeholder="Dispara el lector o escribe el SKU…"
                className="mt-1 w-full px-3 py-2.5 rounded-lg border border-gray-300 dark:border-gris-600 bg-white dark:bg-gris-900 text-sm font-mono"
              />
              <div className="text-[11px] text-gray-500 dark:text-gray-400 mt-1">
                El lector de pistola escribe aquí y confirma solo. Este campo se
                mantiene enfocado para que no haya que tocar la pantalla.
              </div>
              <button
                type="submit"
                disabled={ocupado || !manual.trim()}
                className="mt-2 w-full min-h-[44px] rounded-lg bg-gray-900 dark:bg-trafico dark:text-negro text-white text-sm font-semibold disabled:opacity-40"
              >
                {ocupado ? "Buscando…" : "Buscar material"}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
