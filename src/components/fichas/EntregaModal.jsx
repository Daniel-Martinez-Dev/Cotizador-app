import React from "react";
import toast from "react-hot-toast";
import { FaTimes, FaTruck, FaLock } from "react-icons/fa";
import { useAuth } from "../../context/AuthContext";
import { getFichaTipoConfig, registrarEntregaFicha } from "../../utils/firebaseFichas";
import { subirFotosFicha } from "../../utils/fotosFicha";
import { ETAPAS_FIRMA, ROL_CORRIGE_FIRMAS, firmaDeEtapa, hoyISO } from "../../utils/firmasFicha";
import PersonasFirmaPicker from "./PersonasFirmaPicker";
import FotosFichaPicker from "./FotosFichaPicker";

// Cierre de la ficha: quién revisó y aprobó el pedido (obligatorio, sale
// impreso en el pie de la ficha), fecha de entrega, placas, quién recibió y el
// registro fotográfico. Las fotos se suben a Storage al confirmar, no al
// seleccionarlas: si el usuario cancela no queda basura en el bucket.
//
// Las fotos de la entrega son evidencia interna — no se imprimen en la ficha,
// a diferencia de los nombres y la fecha de la firma.

const inputCls = "mt-1 w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gris-600 bg-white dark:bg-gris-900 text-sm";
const labelCls = "text-xs font-medium text-gray-600 dark:text-gray-300";

export default function EntregaModal({ tipo, ficha, notaInicial = "", onClose, onDone }) {
  const { user, profile, hasRole } = useAuth();
  // Corregir una entrega ya registrada (quitar una foto, cambiar quién aprobó)
  // es cosa de producción/admin; desde planta la evidencia queda cerrada.
  const puedeCorregir = hasRole(ROL_CORRIGE_FIRMAS);
  const revisionPrevia = firmaDeEtapa(ficha, "revisado");

  const [fecha, setFecha] = React.useState(ficha?.entrega?.fecha || hoyISO());
  const [placas, setPlacas] = React.useState(ficha?.entrega?.placas || "");
  const [recibidoPor, setRecibidoPor] = React.useState(ficha?.entrega?.recibidoPor || "");
  // Sin preselección: quien aprueba el despacho no es necesariamente quien lo
  // está registrando en el celular.
  const [revisadoPor, setRevisadoPor] = React.useState(() => revisionPrevia?.personas || []);
  const [nota, setNota] = React.useState(notaInicial);
  const [archivos, setArchivos] = React.useState([]);
  const [existentes, setExistentes] = React.useState(ficha?.entrega?.fotos || []);
  const [guardando, setGuardando] = React.useState(false);
  const [progreso, setProgreso] = React.useState(null);

  // Quitar una foto la saca de la ficha al guardar; el archivo se queda en
  // Cloudinary, que no permite borrar sin firma (ver cloudinary.js). Para la
  // ficha —que es lo que se consulta y se imprime— el efecto es el mismo.
  const quitarExistente = (idx) => {
    setExistentes((prev) => prev.filter((_, i) => i !== idx));
  };

  const confirmar = async () => {
    if (revisadoPor.length === 0) return toast.error("Indica quién revisó y aprobó el pedido");
    if (!fecha) return toast.error("Indica la fecha de entrega");
    setGuardando(true);
    try {
      const { col } = getFichaTipoConfig(tipo);
      const subidas = await subirFotosFicha(col, ficha.id, "entrega", archivos, setProgreso);
      setProgreso(null);
      const resultado = await registrarEntregaFicha(tipo, ficha.id, {
        fecha,
        placas,
        recibidoPor,
        revisadoPor,
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

          <div className="p-4 overflow-y-auto flex-1 space-y-4">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className={labelCls}>{ETAPAS_FIRMA.revisado.titulo} *</span>
                <span className="text-[11px] text-gray-400">{revisadoPor.length} firmante(s)</span>
              </div>
              <PersonasFirmaPicker personas={revisadoPor} onChange={setRevisadoPor} disabled={guardando} />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Fecha de entrega *</label>
                <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)}
                  disabled={guardando} className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Placas del vehículo</label>
                <input
                  value={placas}
                  onChange={(e) => setPlacas(e.target.value.toUpperCase())}
                  disabled={guardando}
                  placeholder="ABC123"
                  className={`${inputCls} font-mono uppercase`}
                />
              </div>
              <div className="col-span-2">
                <label className={labelCls}>Recibido por</label>
                <input
                  value={recibidoPor}
                  onChange={(e) => setRecibidoPor(e.target.value)}
                  disabled={guardando}
                  placeholder="Nombre de quien recibe en sitio"
                  className={inputCls}
                />
              </div>
            </div>

            <FotosFichaPicker
              existentes={existentes}
              onArchivos={setArchivos}
              onQuitarExistente={puedeCorregir ? quitarExistente : null}
              disabled={guardando}
              ayuda="Se reducen antes de subirlas. Quedan como evidencia interna: no salen en la ficha impresa."
            />

            <div>
              <label className={labelCls}>Nota / observaciones</label>
              <textarea
                value={nota}
                onChange={(e) => setNota(e.target.value)}
                rows={2}
                disabled={guardando}
                placeholder="Novedades de la entrega…"
                className={`${inputCls} resize-none`}
              />
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
            <button type="button" onClick={confirmar} disabled={guardando || !fecha || revisadoPor.length === 0}
              className="flex-1 py-2.5 rounded-lg bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white text-sm font-semibold">
              {progreso ? `Subiendo ${progreso.actual}/${progreso.total}…` : guardando ? "Guardando…" : "Firmar y entregar"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
