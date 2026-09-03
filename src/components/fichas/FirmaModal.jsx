import React from "react";
import toast from "react-hot-toast";
import { FaTimes, FaCheckCircle, FaLock, FaLayerGroup } from "react-icons/fa";
import { useAuth } from "../../context/AuthContext";
import { getFichaTipoConfig, registrarFirmaAlistado } from "../../utils/firebaseFichas";
import { subirFotosFicha, subirFotosLote } from "../../utils/fotosFicha";
import { ETAPAS_FIRMA, ROL_CORRIGE_FIRMAS, firmaDeEtapa, hoyISO } from "../../utils/firmasFicha";
import { claveFicha } from "./loteFichas";
import PersonasFirmaPicker from "./PersonasFirmaPicker";
import FotosFichaPicker from "./FotosFichaPicker";
import ListaFichasLote from "./ListaFichasLote";

// Paso obligatorio para pasar una ficha a "Terminada": quién alistó y empacó
// el pedido, con qué fecha, y las fotos de respaldo. Los nombres salen
// impresos en el pie de la ficha (ver FichaVisualKit → Firmas), así que esto
// no es un registro interno: es la firma del formato.
//
// Recibe SIEMPRE una lista de fichas. Con una sola es el formulario de toda la
// vida; con varias es el mismo formulario diligenciado una vez y aplicado a
// todas: un pedido son varias órdenes que se alistan juntas y se firman con la
// misma gente y la misma fecha (ver loteFichas.js). Las fotos se suben una vez
// y su URL queda en todas.

const inputCls = "mt-1 w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gris-600 bg-white dark:bg-gris-900 text-sm";
const labelCls = "text-xs font-medium text-gray-600 dark:text-gray-300";

export default function FirmaModal({ tipo, fichas, notaInicial = "", onClose, onDone }) {
  const { user, profile, roles, hasRole } = useAuth();
  const lista = React.useMemo(() => (Array.isArray(fichas) ? fichas : [fichas]).filter(Boolean), [fichas]);
  const esLote = lista.length > 1;
  // Con una sola ficha se puede partir de lo ya firmado (es también el camino
  // de corrección); en lote no, porque cada ficha tiene su propia evidencia.
  const unica = esLote ? null : lista[0];
  const previa = unica ? firmaDeEtapa(unica, "alistado") : null;
  const corrigiendo = !!unica && unica.estado === "entregado";
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
  const [firmando, setFirmando] = React.useState(null);

  // Quitar una foto la saca de la ficha al guardar; el archivo se queda en
  // Cloudinary, que no permite borrar sin firma (ver cloudinary.js). Para la
  // ficha —que es lo que se consulta y se imprime— el efecto es el mismo.
  const quitarExistente = (idx) => {
    setExistentes((prev) => prev.filter((_, i) => i !== idx));
  };

  const confirmar = async () => {
    if (personas.length === 0) return toast.error("Indica quién alistó y empacó el pedido");
    if (!fecha) return toast.error("Indica la fecha");
    if (lista.length === 0) return;
    setGuardando(true);
    try {
      // Una sola subida para todo el lote: son la misma foto en todas las
      // órdenes y planta trabaja con datos móviles.
      const subidas = esLote
        ? await subirFotosLote(ETAPAS_FIRMA.alistado.carpeta, archivos, setProgreso)
        : await subirFotosFicha(
            getFichaTipoConfig(tipo || unica.tipo).col,
            unica.id,
            ETAPAS_FIRMA.alistado.carpeta,
            archivos,
            setProgreso
          );
      setProgreso(null);

      const fotos = esLote ? subidas : [...existentes, ...subidas];
      const resultados = [];
      const fallidas = [];

      // De a una y en serie: son documentos de colecciones distintas, no cabe
      // un batch, y así se sabe exactamente cuál falló si se cae la red.
      for (const [i, f] of lista.entries()) {
        setFirmando({ actual: i + 1, total: lista.length });
        try {
          // Corregir la firma de una ficha ya entregada no la devuelve a
          // "terminada": solo reemplaza el bloque de firma.
          const marcarTerminada = f.estado !== "entregado";
          const { firma, nota: entrada } = await registrarFirmaAlistado(tipo || f.tipo, f.id, {
            personas,
            fecha,
            fotos,
            nota,
            estadoAnterior: f.estado,
            marcarTerminada,
            autorNombre: yo,
            autorUid: user?.uid || "",
          });
          resultados.push({
            clave: claveFicha(f),
            id: f.id,
            nota: entrada,
            parche: {
              ...(marcarTerminada ? { estado: "terminado" } : null),
              firmas: { ...(f.firmas || {}), alistado: firma },
            },
          });
        } catch (e) {
          console.error(e);
          fallidas.push(f);
        }
      }

      if (fallidas.length > 0) {
        toast.error(`No se pudo firmar ${fallidas.length} de ${lista.length} órdenes`);
      }
      if (resultados.length === 0) return; // el formulario queda abierto para reintentar
      if (fallidas.length === 0) {
        toast.success(
          corrigiendo ? "Firma actualizada"
            : esLote ? `${resultados.length} órdenes marcadas como terminadas`
              : "Ficha marcada como terminada"
        );
      }
      onDone?.(resultados);
    } catch (e) {
      console.error(e);
      toast.error(e?.message || "No se pudo firmar el alistado");
    } finally {
      setGuardando(false);
      setProgreso(null);
      setFirmando(null);
    }
  };

  const titulo = corrigiendo
    ? "Corregir firma de alistado"
    : esLote ? `Marcar ${lista.length} órdenes como terminadas` : "Marcar como terminada";

  return (
    <div className="fixed inset-0 z-[1000]">
      <div className="absolute inset-0 bg-black/50" onClick={guardando ? undefined : onClose} />
      <div className="absolute inset-x-0 bottom-0 sm:inset-0 sm:flex sm:items-center sm:justify-center sm:p-4">
        <div className="w-full sm:max-w-lg bg-white dark:bg-gris-800 rounded-t-2xl sm:rounded-2xl border border-gray-200 dark:border-gris-700 shadow-xl max-h-[90vh] overflow-hidden flex flex-col">

          <div className="p-4 border-b border-gray-200 dark:border-gris-700 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="text-sm font-semibold inline-flex items-center gap-2">
                {esLote
                  ? <FaLayerGroup className="text-green-600 dark:text-green-400" />
                  : <FaCheckCircle className="text-green-600 dark:text-green-400" />}
                {titulo}
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
            {esLote && (
              <div>
                <div className={`${labelCls} mb-1.5`}>Se firman estas órdenes</div>
                <ListaFichasLote fichas={lista} />
              </div>
            )}

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
              existentes={esLote ? [] : existentes}
              onArchivos={setArchivos}
              onQuitarExistente={!esLote && puedeCorregir ? quitarExistente : null}
              disabled={guardando}
              ayuda={esLote
                ? "Se suben una vez y quedan en las órdenes del lote. En la ficha impresa salen los nombres, no las fotos."
                : "Se reducen antes de subirlas. Quedan como respaldo del alistado; en la ficha impresa salen los nombres, no las fotos."}
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
                : firmando && esLote ? `Firmando ${firmando.actual}/${firmando.total}…`
                  : guardando ? "Guardando…"
                    : corrigiendo ? "Guardar firma"
                      : esLote ? `Firmar y terminar (${lista.length})` : "Firmar y terminar"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
