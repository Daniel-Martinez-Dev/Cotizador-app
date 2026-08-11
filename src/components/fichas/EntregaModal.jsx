import React from "react";
import toast from "react-hot-toast";
import { FaTimes, FaTruck, FaCamera, FaTrash } from "react-icons/fa";
import { useAuth } from "../../context/AuthContext";
import { getFichaTipoConfig, registrarEntregaFicha } from "../../utils/firebaseFichas";
import { subirFotosEntrega, borrarFotoEntrega, MAX_FOTOS } from "../../utils/fotosEntrega";

// Captura de la entrega: fecha (obligatoria), placas del vehículo, quién
// recibió y registro fotográfico. Las fotos se suben a Storage al confirmar,
// no al seleccionarlas: si el usuario cancela no queda basura en el bucket.

const hoy = () => new Date().toISOString().slice(0, 10);

const inputCls = "mt-1 w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gris-600 bg-white dark:bg-gris-900 text-sm";
const labelCls = "text-xs font-medium text-gray-600 dark:text-gray-300";

export default function EntregaModal({ tipo, ficha, notaInicial = "", onClose, onDone }) {
  const { user, profile } = useAuth();
  const [fecha, setFecha] = React.useState(ficha?.entrega?.fecha || hoy());
  const [placas, setPlacas] = React.useState(ficha?.entrega?.placas || "");
  const [recibidoPor, setRecibidoPor] = React.useState(ficha?.entrega?.recibidoPor || "");
  const [nota, setNota] = React.useState(notaInicial);
  // Las nuevas viven como File + preview local; las ya subidas solo traen url.
  const [nuevas, setNuevas] = React.useState([]);
  const [existentes, setExistentes] = React.useState(ficha?.entrega?.fotos || []);
  const [guardando, setGuardando] = React.useState(false);
  const [progreso, setProgreso] = React.useState(null);

  // Las previews son object URLs: hay que soltarlas al cerrar o se filtra
  // memoria. Va contra un ref y no contra `nuevas` porque un efecto con esa
  // dependencia revocaría, en cada foto añadida, las previews de las anteriores
  // —que siguen en pantalla— y quedarían en blanco.
  const nuevasRef = React.useRef([]);
  React.useEffect(() => { nuevasRef.current = nuevas; }, [nuevas]);
  React.useEffect(() => () => nuevasRef.current.forEach((n) => URL.revokeObjectURL(n.preview)), []);

  const totalFotos = existentes.length + nuevas.length;

  const agregarArchivos = (e) => {
    const elegidos = Array.from(e.target.files || []).filter((f) => f.type.startsWith("image/"));
    e.target.value = ""; // permite volver a elegir el mismo archivo
    if (elegidos.length === 0) return;
    const cupo = MAX_FOTOS - totalFotos;
    if (cupo <= 0) return toast.error(`Máximo ${MAX_FOTOS} fotos por entrega`);
    if (elegidos.length > cupo) toast(`Solo caben ${cupo} foto(s) más`);
    setNuevas((prev) => [
      ...prev,
      ...elegidos.slice(0, cupo).map((file) => ({ file, preview: URL.createObjectURL(file) })),
    ]);
  };

  const quitarNueva = (idx) => {
    setNuevas((prev) => {
      URL.revokeObjectURL(prev[idx].preview);
      return prev.filter((_, i) => i !== idx);
    });
  };

  const quitarExistente = async (idx) => {
    const foto = existentes[idx];
    setExistentes((prev) => prev.filter((_, i) => i !== idx));
    await borrarFotoEntrega(foto.path);
  };

  const confirmar = async () => {
    if (!fecha) return toast.error("Indica la fecha de entrega");
    setGuardando(true);
    try {
      const { col } = getFichaTipoConfig(tipo);
      const subidas = await subirFotosEntrega(col, ficha.id, nuevas.map((n) => n.file), setProgreso);
      setProgreso(null);
      const resultado = await registrarEntregaFicha(tipo, ficha.id, {
        fecha,
        placas,
        recibidoPor,
        fotos: [...existentes, ...subidas],
        nota,
        estadoAnterior: ficha.estado,
        autorNombre: profile?.displayName || user?.displayName || user?.email || "",
        autorUid: user?.uid || "",
      });
      toast.success("Entrega registrada");
      onDone?.(resultado);
    } catch (e) {
      console.error(e);
      toast.error(e?.message || "No se pudo registrar la entrega");
    } finally {
      setGuardando(false);
      setProgreso(null);
    }
  };

  return (
    <div className="fixed inset-0 z-[1000]">
      <div className="absolute inset-0 bg-black/50" onClick={guardando ? undefined : onClose} />
      <div className="absolute inset-x-0 bottom-0 sm:inset-0 sm:flex sm:items-center sm:justify-center sm:p-4">
        <div className="w-full sm:max-w-lg bg-white dark:bg-gris-800 rounded-t-2xl sm:rounded-2xl border border-gray-200 dark:border-gris-700 shadow-xl max-h-[90vh] overflow-hidden flex flex-col">

          <div className="p-4 border-b border-gray-200 dark:border-gris-700 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="text-sm font-semibold inline-flex items-center gap-2">
                <FaTruck className="text-purple-600 dark:text-purple-400" /> Registrar entrega
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                {ficha?.cliente || "Sin cliente"}
              </div>
            </div>
            <button type="button" onClick={onClose} disabled={guardando}
              className="h-8 w-8 shrink-0 rounded border border-gray-300 dark:border-gris-600 bg-gray-50 dark:bg-gris-700 flex items-center justify-center disabled:opacity-40">
              <FaTimes className="text-sm" />
            </button>
          </div>

          <div className="p-4 overflow-y-auto flex-1 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Fecha de entrega *</label>
                <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Placas del vehículo</label>
                <input
                  value={placas}
                  onChange={(e) => setPlacas(e.target.value.toUpperCase())}
                  placeholder="ABC123"
                  className={`${inputCls} font-mono uppercase`}
                />
              </div>
              <div className="col-span-2">
                <label className={labelCls}>Recibido por</label>
                <input
                  value={recibidoPor}
                  onChange={(e) => setRecibidoPor(e.target.value)}
                  placeholder="Nombre de quien recibe en sitio"
                  className={inputCls}
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className={labelCls}>Registro fotográfico</span>
                <span className="text-[11px] text-gray-400">{totalFotos}/{MAX_FOTOS}</span>
              </div>

              {totalFotos > 0 && (
                <div className="grid grid-cols-4 gap-2 mb-2">
                  {existentes.map((f, i) => (
                    <Miniatura key={f.path} src={f.url} onQuitar={() => quitarExistente(i)} disabled={guardando} />
                  ))}
                  {nuevas.map((n, i) => (
                    <Miniatura key={n.preview} src={n.preview} onQuitar={() => quitarNueva(i)} disabled={guardando} />
                  ))}
                </div>
              )}

              <label className={`flex items-center justify-center gap-2 py-3 rounded-lg border border-dashed text-xs font-medium transition ${
                totalFotos >= MAX_FOTOS || guardando
                  ? "border-gray-200 dark:border-gris-700 text-gray-300 dark:text-gris-500 cursor-default"
                  : "border-gray-300 dark:border-gris-600 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gris-700 cursor-pointer"
              }`}>
                <FaCamera /> Tomar o elegir fotos
                {/* Sin `capture`: con ese atributo Android abre la cámara
                    directamente y deja fuera las fotos ya tomadas en galería. */}
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  disabled={totalFotos >= MAX_FOTOS || guardando}
                  onChange={agregarArchivos}
                  className="hidden"
                />
              </label>
              <div className="text-[10px] text-gray-400 mt-1">
                Se reducen automáticamente antes de subirlas.
              </div>
            </div>

            <div>
              <label className={labelCls}>Nota / observaciones</label>
              <textarea
                value={nota}
                onChange={(e) => setNota(e.target.value)}
                rows={2}
                placeholder="Novedades de la entrega…"
                className={`${inputCls} resize-none`}
              />
            </div>
          </div>

          <div className="p-4 border-t border-gray-200 dark:border-gris-700 flex gap-2">
            <button type="button" onClick={onClose} disabled={guardando}
              className="flex-1 py-2.5 rounded-lg border border-gray-300 dark:border-gris-600 bg-gray-50 dark:bg-gris-700 text-sm font-medium disabled:opacity-50">
              Cancelar
            </button>
            <button type="button" onClick={confirmar} disabled={guardando || !fecha}
              className="flex-1 py-2.5 rounded-lg bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white text-sm font-semibold">
              {progreso ? `Subiendo ${progreso.actual}/${progreso.total}…` : guardando ? "Guardando…" : "Confirmar entrega"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Miniatura({ src, onQuitar, disabled }) {
  return (
    <div className="relative aspect-square rounded-lg overflow-hidden border border-gray-200 dark:border-gris-600">
      <img src={src} alt="" className="h-full w-full object-cover" />
      <button
        type="button"
        onClick={onQuitar}
        disabled={disabled}
        title="Quitar foto"
        className="absolute top-1 right-1 h-6 w-6 rounded-full bg-black/60 text-white flex items-center justify-center disabled:opacity-40"
      >
        <FaTrash className="text-[9px]" />
      </button>
    </div>
  );
}
