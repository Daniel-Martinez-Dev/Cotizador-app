import React from "react";
import toast from "react-hot-toast";
import { FaTimes, FaTruck, FaLock } from "react-icons/fa";
import { useAuth } from "../../context/AuthContext";
import { getFichaTipoConfig, registrarEntregaFicha } from "../../utils/firebaseFichas";
import { subirFotosFicha, subirFotosLote } from "../../utils/fotosFicha";
import { ETAPAS_FIRMA, ROL_CORRIGE_FIRMAS, firmaDeEtapa, hoyISO } from "../../utils/firmasFicha";
import { claveFicha } from "./loteFichas";
import PersonasFirmaPicker from "./PersonasFirmaPicker";
import FotosFichaPicker from "./FotosFichaPicker";
import ListaFichasLote from "./ListaFichasLote";

// Cierre de la ficha: quién revisó y aprobó el pedido (obligatorio, sale
// impreso en el pie de la ficha), fecha de entrega, placas, quién recibió y el
// registro fotográfico. Las fotos se suben a Storage al confirmar, no al
// seleccionarlas: si el usuario cancela no queda basura en el bucket.
//
// Las fotos de la entrega son evidencia interna — no se imprimen en la ficha,
// a diferencia de los nombres y la fecha de la firma.
//
// Recibe una lista de fichas: varias órdenes del mismo pedido salen en el mismo
// camión, con las mismas placas y el mismo recibido, así que se registran de
// una sola vez (ver loteFichas.js).

const inputCls = "mt-1 w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gris-600 bg-white dark:bg-gris-900 text-sm";
const labelCls = "text-xs font-medium text-gray-600 dark:text-gray-300";

export default function EntregaModal({ tipo, fichas, notaInicial = "", onClose, onDone }) {
  const { user, profile, hasRole } = useAuth();
  const lista = React.useMemo(() => (Array.isArray(fichas) ? fichas : [fichas]).filter(Boolean), [fichas]);
  const esLote = lista.length > 1;
  const unica = esLote ? null : lista[0];
  // Corregir una entrega ya registrada (quitar una foto, cambiar quién aprobó)
  // es cosa de producción/admin; desde planta la evidencia queda cerrada.
  const puedeCorregir = hasRole(ROL_CORRIGE_FIRMAS);
  const revisionPrevia = unica ? firmaDeEtapa(unica, "revisado") : null;

  const [fecha, setFecha] = React.useState(unica?.entrega?.fecha || hoyISO());
  const [placas, setPlacas] = React.useState(unica?.entrega?.placas || "");
  const [recibidoPor, setRecibidoPor] = React.useState(unica?.entrega?.recibidoPor || "");
  // Sin preselección: quien aprueba el despacho no es necesariamente quien lo
  // está registrando en el celular.
  const [revisadoPor, setRevisadoPor] = React.useState(() => revisionPrevia?.personas || []);
  const [nota, setNota] = React.useState(notaInicial);
  const [archivos, setArchivos] = React.useState([]);
  const [existentes, setExistentes] = React.useState(unica?.entrega?.fotos || []);
  const [guardando, setGuardando] = React.useState(false);
  const [progreso, setProgreso] = React.useState(null);
  const [registrando, setRegistrando] = React.useState(null);

  // Quitar una foto la saca de la ficha al guardar; el archivo se queda en
  // Cloudinary, que no permite borrar sin firma (ver cloudinary.js). Para la
  // ficha —que es lo que se consulta y se imprime— el efecto es el mismo.
  const quitarExistente = (idx) => {
    setExistentes((prev) => prev.filter((_, i) => i !== idx));
  };

  const confirmar = async () => {
    if (revisadoPor.length === 0) return toast.error("Indica quién revisó y aprobó el pedido");
    if (!fecha) return toast.error("Indica la fecha de entrega");
    if (lista.length === 0) return;
    setGuardando(true);
    try {
      // Las fotos del despacho son las mismas para todas las órdenes que van en
      // el camión: se suben una vez y su URL queda en cada ficha.
      const subidas = esLote
        ? await subirFotosLote("entrega", archivos, setProgreso)
        : await subirFotosFicha(
            getFichaTipoConfig(tipo || unica.tipo).col,
            unica.id,
            "entrega",
            archivos,
            setProgreso
          );
      setProgreso(null);

      const fotos = esLote ? subidas : [...existentes, ...subidas];
      const resultados = [];
      const fallidas = [];

      for (const [i, f] of lista.entries()) {
        setRegistrando({ actual: i + 1, total: lista.length });
        try {
          const { entrega, firma, nota: entrada } = await registrarEntregaFicha(tipo || f.tipo, f.id, {
            fecha,
            placas,
            recibidoPor,
            revisadoPor,
            fotos,
            nota,
            estadoAnterior: f.estado,
            autorNombre: profile?.displayName || user?.displayName || user?.email || "",
            autorUid: user?.uid || "",
          });
          resultados.push({
            clave: claveFicha(f),
            id: f.id,
            nota: entrada,
            parche: {
              estado: "entregado",
              entrega,
              firmas: { ...(f.firmas || {}), revisado: firma },
            },
          });
        } catch (e) {
          console.error(e);
          fallidas.push(f);
        }
      }

      if (fallidas.length > 0) {
        toast.error(`No se pudo entregar ${fallidas.length} de ${lista.length} órdenes`);
      }
      if (resultados.length === 0) return; // el formulario queda abierto para reintentar
      if (fallidas.length === 0) {
        toast.success(esLote ? `${resultados.length} órdenes entregadas` : "Entrega registrada");
      }
      onDone?.(resultados);
    } catch (e) {
      console.error(e);
      toast.error(e?.message || "No se pudo registrar la entrega");
    } finally {
      setGuardando(false);
      setProgreso(null);
      setRegistrando(null);
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
                <FaTruck className="text-purple-600 dark:text-purple-400" />
                {esLote ? `Registrar entrega de ${lista.length} órdenes` : "Registrar entrega"}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                {esLote ? "Mismas placas, misma fecha y mismo recibido para todas" : (unica?.cliente || "Sin cliente")}
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
                <div className={`${labelCls} mb-1.5`}>Se entregan estas órdenes</div>
                <ListaFichasLote fichas={lista} />
              </div>
            )}

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
              existentes={esLote ? [] : existentes}
              onArchivos={setArchivos}
              onQuitarExistente={!esLote && puedeCorregir ? quitarExistente : null}
              disabled={guardando}
              ayuda={esLote
                ? "Se suben una vez y quedan en las órdenes del lote. Son evidencia interna: no salen en la ficha impresa."
                : "Se reducen antes de subirlas. Quedan como evidencia interna: no salen en la ficha impresa."}
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
              {progreso
                ? `Subiendo ${progreso.actual}/${progreso.total}…`
                : registrando && esLote ? `Entregando ${registrando.actual}/${registrando.total}…`
                  : guardando ? "Guardando…"
                    : esLote ? `Firmar y entregar (${lista.length})` : "Firmar y entregar"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
