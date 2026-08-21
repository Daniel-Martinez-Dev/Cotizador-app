import React from "react";
import toast from "react-hot-toast";
import { FaTimes, FaCheckCircle, FaLock } from "react-icons/fa";
import { useAuth } from "../../context/AuthContext";
import { getFichaTipoConfig, registrarFirmaAlistado } from "../../utils/firebaseFichas";
import { subirFotosFicha, borrarFotoFicha } from "../../utils/fotosFicha";
import { ETAPAS_FIRMA, ROL_CORRIGE_FIRMAS, firmaDeEtapa, hoyISO } from "../../utils/firmasFicha";
import PersonasFirmaPicker from "./PersonasFirmaPicker";
import FotosFichaPicker from "./FotosFichaPicker";

// Paso obligatorio para pasar una ficha a "Terminada": quién alistó y empacó
// el pedido, con qué fecha, y las fotos de respaldo. Los nombres salen
// impresos en el pie de la ficha (ver FichaVisualKit → Firmas), así que esto
// no es un registro interno: es la firma del formato.

const inputCls = "mt-1 w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gris-600 bg-white dark:bg-gris-900 text-sm";
const labelCls = "text-xs font-medium text-gray-600 dark:text-gray-300";

export default function FirmaModal({ tipo, ficha, notaInicial = "", onClose, onDone }) {
  const { user, profile, roles, hasRole } = useAuth();
  const previa = firmaDeEtapa(ficha, "alistado");
  // Quitar una foto ya guardada es corregir evidencia: producción/admin.
  const puedeCorregir = hasRole(ROL_CORRIGE_FIRMAS);

  const yo = profile?.displayName || user?.displayName || user?.email || "";
  // En planta quien registra suele ser uno de los que alistó, así que viene
  // marcado y se desmarca si no fue así. Desde el escritorio no: quien pasa la
  // ficha a terminada no es quien la empacó, y darlo por hecho metería una
  // firma falsa en la ficha impresa. Se compara contra los roles del perfil
  // —no contra hasRole— porque a un admin le devuelve true cualquier rol.
  const alistaEnPlanta = (roles || []).includes("empleado");
  const [personas, setPersonas] = React.useState(() => (
    previa?.personas
    || (alistaEnPlanta && user?.uid && yo
      ? [{ uid: user.uid, nombre: yo, firma: profile?.firmaDataUrl || "" }]
      : [])
  ));
  const [fecha, setFecha] = React.useState(previa?.fecha || hoyISO());
  const [nota, setNota] = React.useState(notaInicial);
  const [archivos, setArchivos] = React.useState([]);
  const [existentes, setExistentes] = React.useState(previa?.fotos || []);
  const [guardando, setGuardando] = React.useState(false);
  const [progreso, setProgreso] = React.useState(null);

  const quitarExistente = async (idx) => {
    const foto = existentes[idx];
    setExistentes((prev) => prev.filter((_, i) => i !== idx));
    await borrarFotoFicha(foto.path);
  };

  const confirmar = async () => {
    if (personas.length === 0) return toast.error("Indica quién alistó y empacó el pedido");
    if (!fecha) return toast.error("Indica la fecha");
    setGuardando(true);
    try {
      const { col } = getFichaTipoConfig(tipo);
      const subidas = await subirFotosFicha(col, ficha.id, ETAPAS_FIRMA.alistado.carpeta, archivos, setProgreso);
      setProgreso(null);
      const resultado = await registrarFirmaAlistado(tipo, ficha.id, {
        personas,
        fecha,
        fotos: [...existentes, ...subidas],
        nota,
        estadoAnterior: ficha.estado,
        // Corregir la firma de una ficha ya entregada no la devuelve a
        // "terminada": solo reemplaza el bloque de firma.
        marcarTerminada: ficha.estado !== "entregado",
        autorNombre: yo,
        autorUid: user?.uid || "",
      });
      toast.success(ficha.estado === "entregado" ? "Firma actualizada" : "Ficha marcada como terminada");
      onDone?.(resultado);
    } catch (e) {
      console.error(e);
      toast.error(e?.message || "No se pudo firmar el alistado");
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
                <FaCheckCircle className="text-green-600 dark:text-green-400" />
                {ficha.estado === "entregado" ? "Corregir firma de alistado" : "Marcar como terminada"}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                {ETAPAS_FIRMA.alistado.titulo}
              </div>
            </div>
            <button type="button" onClick={onClose} disabled={guardando}
              className="h-8 w-8 shrink-0 rounded border border-gray-300 dark:border-gris-600 bg-gray-50 dark:bg-gris-700 flex items-center justify-center disabled:opacity-40">
              <FaTimes className="text-sm" />
            </button>
          </div>

          <div className="p-4 overflow-y-auto flex-1 space-y-4">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className={labelCls}>¿Quién alistó y empacó? *</span>
                <span className="text-[11px] text-gray-400">{personas.length} firmante(s)</span>
              </div>
              <PersonasFirmaPicker personas={personas} onChange={setPersonas} disabled={guardando} />
            </div>

            <div>
              <label className={labelCls}>Fecha *</label>
              <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)}
                disabled={guardando} className={inputCls} />
            </div>

            <FotosFichaPicker
              existentes={existentes}
              onArchivos={setArchivos}
              onQuitarExistente={puedeCorregir ? quitarExistente : null}
              disabled={guardando}
              ayuda="Se reducen antes de subirlas. Quedan como respaldo del alistado; en la ficha impresa salen los nombres, no las fotos."
            />

            <div>
              <label className={labelCls}>Nota / observaciones</label>
              <textarea value={nota} onChange={(e) => setNota(e.target.value)} rows={2} disabled={guardando}
                placeholder="Novedades del alistado…" className={`${inputCls} resize-none`} />
            </div>

            {!puedeCorregir && (
              <div className="flex items-start gap-2 text-[11px] text-gray-500 dark:text-gray-400">
                <FaLock className="mt-0.5 shrink-0" />
                <span>Al confirmar, la firma y las fotos quedan guardadas: desde planta ya no se pueden modificar ni borrar.</span>
              </div>
            )}
          </div>

          <div className="p-4 border-t border-gray-200 dark:border-gris-700 flex gap-2">
            <button type="button" onClick={onClose} disabled={guardando}
              className="flex-1 py-2.5 rounded-lg border border-gray-300 dark:border-gris-600 bg-gray-50 dark:bg-gris-700 text-sm font-medium disabled:opacity-50">
              Cancelar
            </button>
            <button type="button" onClick={confirmar} disabled={guardando || personas.length === 0 || !fecha}
              className="flex-1 py-2.5 rounded-lg bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white text-sm font-semibold">
              {progreso
                ? `Subiendo ${progreso.actual}/${progreso.total}…`
                : guardando ? "Guardando…"
                : ficha.estado === "entregado" ? "Guardar firma" : "Firmar y terminar"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
