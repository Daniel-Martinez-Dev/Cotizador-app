import React from "react";
import toast from "react-hot-toast";
import { FaPlus, FaRegStickyNote, FaTimes, FaCheck, FaTruck, FaPen, FaSignature } from "react-icons/fa";
import {
  ESTADOS_FICHA, ESTADO_LABEL, ESTADO_LABEL_CORTO, ESTADO_ICON,
  ESTADO_ACTIVO_CLS, ESTADO_REQUIERE_ENTREGA, normalizarEstado,
} from "./estadoFicha";
import { ordenarNotasDesc } from "./notasFicha";
import { ROL_CORRIGE_FIRMAS } from "../../utils/firmasFicha";
import { useAuth } from "../../context/AuthContext";
import NotaItem from "./NotaItem";
import EntregaResumen from "./EntregaResumen";
import FirmasResumen from "./FirmasResumen";

// Control de estado de una ficha: un segmentado con los cuatro estados (se ve
// de un golpe dónde está y se salta a cualquiera con un clic), el cambio con
// nota opcional, las firmas ya guardadas y la línea de tiempo con todo lo que
// ha pasado con la ficha.
//
// Los dos últimos estados no se fijan desde aquí: "Terminada" abre el
// formulario de firma del alistado y "Entregada" el de revisión + despacho
// (ver useEstadoFicha).

const NOTAS_VISIBLES = 3;

export default function EstadoControl({ ficha, onCambiarEstado, onAgregarNota, onEditarEntrega, onEditarFirma }) {
  const { hasRole } = useAuth();
  const { estado, notas, entrega } = ficha;
  const actual = normalizarEstado(estado);
  const [pendiente, setPendiente] = React.useState(null);
  const [notaCambio, setNotaCambio] = React.useState("");
  const [notaLibre, setNotaLibre] = React.useState("");
  const [guardando, setGuardando] = React.useState(false);
  const [verTodas, setVerTodas] = React.useState(false);

  const historial = React.useMemo(() => ordenarNotasDesc(notas), [notas]);
  const visibles = verTodas ? historial : historial.slice(0, NOTAS_VISIBLES);
  const esEntrega = pendiente === ESTADO_REQUIERE_ENTREGA;
  // Corregir una firma ya guardada es cosa de producción/admin.
  const puedeCorregirFirmas = hasRole(ROL_CORRIGE_FIRMAS) && onEditarFirma;

  const cancelarCambio = () => { setPendiente(null); setNotaCambio(""); };

  const confirmarCambio = async () => {
    if (!pendiente) return;
    setGuardando(true);
    try {
      // Si falló, el panel sigue abierto con la nota escrita para reintentar.
      const ok = await onCambiarEstado(pendiente, notaCambio.trim());
      if (ok !== false) cancelarCambio();
    } finally {
      setGuardando(false);
    }
  };

  const agregarNota = async () => {
    const texto = notaLibre.trim();
    if (!texto) return;
    setGuardando(true);
    try {
      await onAgregarNota(texto);
      setNotaLibre("");
    } catch (e) {
      console.error(e);
      toast.error(e?.message || "No se pudo agregar la nota");
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="pt-3 border-t border-gray-200 dark:border-gris-600 space-y-3">

      {/* Segmentado de estados */}
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-[10px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
          Estado
        </span>
        <div className="flex flex-wrap gap-0.5 rounded-lg bg-gray-100 dark:bg-gris-800 p-0.5 border border-gray-200 dark:border-gris-600">
          {ESTADOS_FICHA.map((e) => {
            const Icon = ESTADO_ICON[e];
            const esActual = e === actual;
            const esPendiente = e === pendiente;
            return (
              <button
                key={e}
                type="button"
                onClick={() => (esActual ? cancelarCambio() : setPendiente(e))}
                aria-pressed={esActual}
                title={esActual ? `Estado actual: ${ESTADO_LABEL[e]}` : `Cambiar a ${ESTADO_LABEL[e]}`}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition ${
                  esActual
                    ? ESTADO_ACTIVO_CLS[e]
                    : esPendiente
                      ? "bg-white dark:bg-gris-700 text-gray-700 dark:text-gray-200 ring-2 ring-blue-500"
                      : "text-gray-500 dark:text-gray-400 hover:bg-white dark:hover:bg-gris-700 hover:text-gray-700 dark:hover:text-gray-200"
                }`}
              >
                <Icon className="text-[11px]" /> {ESTADO_LABEL_CORTO[e]}
              </button>
            );
          })}
        </div>
      </div>

      {/* Confirmación del cambio, con nota opcional. Los dos estados que cierran
          la ficha no se confirman aquí: abren su formulario de firma —alistado
          o revisión + entrega— y la nota escrita viaja con él. */}
      {pendiente && (
        <div className="rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-50/60 dark:bg-blue-900/20 p-3 space-y-2">
          <div className="text-xs text-gray-700 dark:text-gray-200">
            Cambiar de <strong>{ESTADO_LABEL[actual]}</strong> a <strong>{ESTADO_LABEL[pendiente]}</strong>
            {pendiente === "terminado" && " — se pedirá quién alistó y empacó"}
            {esEntrega && " — se pedirá quién revisó y aprobó, más fecha, placas y fotos"}
          </div>
          <textarea
            value={notaCambio}
            onChange={(ev) => setNotaCambio(ev.target.value)}
            onKeyDown={(ev) => {
              if (ev.key === "Escape") cancelarCambio();
              if (ev.key === "Enter" && (ev.metaKey || ev.ctrlKey)) confirmarCambio();
            }}
            rows={2}
            autoFocus
            placeholder="Nota del cambio (opcional) — qué falta, quién lo recibe, observaciones…"
            className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gris-600 bg-white dark:bg-gris-800 text-xs resize-none"
          />
          <div className="flex justify-end gap-2">
            <button type="button" onClick={cancelarCambio} disabled={guardando}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gris-600 text-xs font-medium hover:bg-white dark:hover:bg-gris-700 disabled:opacity-40">
              <FaTimes className="text-[10px]" /> Cancelar
            </button>
            <button type="button" onClick={confirmarCambio} disabled={guardando}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-white text-xs font-medium disabled:opacity-40 ${
                esEntrega ? "bg-purple-600 hover:bg-purple-500" : "bg-blue-600 hover:bg-blue-500"
              }`}>
              {esEntrega
                ? <><FaTruck className="text-[10px]" /> Registrar entrega</>
                : pendiente === "terminado"
                  ? <><FaSignature className="text-[10px]" /> Firmar alistado</>
                  : <><FaCheck className="text-[10px]" /> Confirmar cambio</>}
            </button>
          </div>
        </div>
      )}

      {/* Firmas del formato: quién alistó y empacó, quién revisó y aprobó */}
      <FirmasResumen
        ficha={ficha}
        onEditarFirma={puedeCorregirFirmas ? onEditarFirma : null}
      />

      {/* Constancia de la entrega, cuando ya se registró */}
      {actual === ESTADO_REQUIERE_ENTREGA && (
        entrega ? (
          <EntregaResumen entrega={entrega} onEditar={onEditarEntrega} />
        ) : onEditarEntrega && (
          <button type="button" onClick={onEditarEntrega}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-purple-200 dark:border-purple-800 bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300 text-xs font-medium">
            <FaPen className="text-[10px]" /> Completar datos de la entrega
          </button>
        )
      )}

      {/* Historial: cambios de estado y notas, en una sola línea de tiempo */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
            <FaRegStickyNote className="text-[10px] opacity-70" /> Historial y notas
            {historial.length > 0 && <span className="text-gray-400">({historial.length})</span>}
          </span>
          {historial.length > NOTAS_VISIBLES && (
            <button type="button" onClick={() => setVerTodas((v) => !v)}
              className="text-[11px] text-blue-600 dark:text-blue-400 hover:underline">
              {verTodas ? "Ver menos" : `Ver todas (${historial.length})`}
            </button>
          )}
        </div>

        {historial.length === 0 ? (
          <div className="text-[11px] text-gray-400 mb-2">Sin movimientos registrados todavía.</div>
        ) : (
          <ul className={`space-y-2 text-xs mb-2 ${verTodas ? "max-h-64 overflow-y-auto pr-1" : ""}`}>
            {visibles.map((n, idx) => <NotaItem key={idx} nota={n} />)}
          </ul>
        )}

        <div className="flex gap-2">
          <textarea
            value={notaLibre}
            onChange={(ev) => setNotaLibre(ev.target.value)}
            onKeyDown={(ev) => {
              if (ev.key === "Enter" && (ev.metaKey || ev.ctrlKey)) agregarNota();
            }}
            rows={1}
            placeholder="Agregar una nota…"
            className="flex-1 px-3 py-2 rounded-lg border border-gray-300 dark:border-gris-600 bg-white dark:bg-gris-800 text-xs resize-none"
          />
          <button type="button" onClick={agregarNota} disabled={guardando || !notaLibre.trim()}
            className="shrink-0 inline-flex items-center gap-1.5 px-3 rounded-lg bg-gray-800 hover:bg-gray-700 dark:bg-gris-600 dark:hover:bg-gris-500 text-white text-xs font-medium disabled:opacity-40">
            <FaPlus className="text-[10px]" /> Agregar
          </button>
        </div>
      </div>
    </div>
  );
}
