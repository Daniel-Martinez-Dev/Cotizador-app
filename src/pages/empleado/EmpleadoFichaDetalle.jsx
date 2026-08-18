import React from "react";
import { useParams, Link } from "react-router-dom";
import toast from "react-hot-toast";
import { FaChevronLeft, FaFileAlt, FaCheckCircle, FaTruck } from "react-icons/fa";
import { useAuth } from "../../context/AuthContext";
import { obtenerFichaProduccion, agregarNotaFicha } from "../../utils/firebaseFichas";
import EstadoBadge from "../../components/fichas/EstadoBadge";
import EntregaModal from "../../components/fichas/EntregaModal";
import EntregaResumen from "../../components/fichas/EntregaResumen";
import FirmasResumen from "../../components/fichas/FirmasResumen";
import NotaSection from "../../components/empleado/NotaSection";
import FirmaModal from "../../components/fichas/FirmaModal";
import { getImpresionComponent } from "../../components/fichas/impresionPorTipo";
import { ROL_CORRIGE_FIRMAS } from "../../utils/firmasFicha";
import { codigoFichaOFallback } from "../../utils/codigoFicha";

function fmtFecha(f) {
  if (!f) return "—";
  try {
    const m = typeof f === "string" && /^(\d{4})-(\d{2})-(\d{2})$/.exec(f);
    const d = m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : new Date(f);
    return d.toLocaleDateString("es-CO");
  } catch {
    return "—";
  }
}

export default function EmpleadoFichaDetalle() {
  const { tipo, id } = useParams();
  const { user, profile, hasRole } = useAuth();
  const [ficha, setFicha] = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  const [showImpresion, setShowImpresion] = React.useState(false);
  const [showFirma, setShowFirma] = React.useState(false);
  const [showEntrega, setShowEntrega] = React.useState(false);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const f = await obtenerFichaProduccion(tipo, id);
      setFicha(f);
    } catch (e) {
      console.error(e);
      toast.error("No se pudo cargar la ficha");
    } finally {
      setLoading(false);
    }
  }, [tipo, id]);

  React.useEffect(() => { load(); }, [load]);

  const handleAddNota = async (texto) => {
    await agregarNotaFicha(tipo, id, {
      texto,
      autorNombre: profile?.displayName || user?.email || "",
      autorUid: user?.uid || "",
    });
    await load();
  };

  if (loading) {
    return <div className="pt-4 text-sm opacity-60 text-center py-8">Cargando…</div>;
  }

  if (!ficha) {
    return (
      <div className="pt-4">
        <Link to="/planta/produccion" className="text-sm text-blue-600 dark:text-blue-400 inline-flex items-center gap-1">
          <FaChevronLeft className="text-xs" /> Volver
        </Link>
        <div className="text-sm opacity-60 text-center py-8">No se encontró la ficha.</div>
      </div>
    );
  }

  const ImpresionComponent = getImpresionComponent(tipo);
  // Firmas y fotos ya guardadas son de solo lectura en planta: corregirlas es
  // cosa de producción/admin desde el escritorio (ver firestore.rules).
  const puedeCorregir = hasRole(ROL_CORRIGE_FIRMAS);

  return (
    <div className="pt-4 space-y-3 pb-4">
      <Link to="/planta/produccion" className="text-sm text-blue-600 dark:text-blue-400 inline-flex items-center gap-1">
        <FaChevronLeft className="text-xs" /> Volver
      </Link>

      <div className="rounded-xl border border-gray-200 dark:border-gris-700 bg-white dark:bg-gris-800 p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">{ficha.tipoLabel}</div>
            <div className="font-semibold text-base truncate">{ficha.cliente || "Sin cliente"}</div>
          </div>
          <EstadoBadge estado={ficha.estado} />
        </div>
        <div className="grid grid-cols-2 gap-2 mt-3 text-xs">
          <div>
            <div className="text-gray-400">N.° ficha de producción</div>
            <div className="font-mono font-medium">{codigoFichaOFallback(ficha, tipo)}</div>
          </div>
          <div>
            <div className="text-gray-400">Cantidad</div>
            <div className="font-medium">{ficha.cantidad ?? "—"}</div>
          </div>
          <div>
            <div className="text-gray-400">Fecha orden</div>
            <div className="font-medium">{fmtFecha(ficha.fechaOrden)}</div>
          </div>
          <div>
            <div className="text-gray-400">Fecha entrega</div>
            <div className="font-medium">{fmtFecha(ficha.fechaEntrega)}</div>
          </div>
        </div>

        {ImpresionComponent && (
          <button
            type="button"
            onClick={() => setShowImpresion(true)}
            className="mt-4 w-full inline-flex items-center justify-center gap-2 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium"
          >
            <FaFileAlt className="text-xs" /> Ver ficha completa
          </button>
        )}
      </div>

      <FirmasResumen ficha={ficha} />

      {ficha.entrega && (
        <EntregaResumen
          entrega={ficha.entrega}
          onEditar={puedeCorregir ? () => setShowEntrega(true) : null}
        />
      )}

      {ficha.estado === "en_produccion" && (
        <button
          type="button"
          onClick={() => setShowFirma(true)}
          className="w-full inline-flex items-center justify-center gap-2 py-3 rounded-lg bg-green-600 hover:bg-green-500 text-white text-sm font-semibold"
        >
          <FaCheckCircle /> Marcar como terminada
        </button>
      )}

      {ficha.estado === "terminado" && (
        <button
          type="button"
          onClick={() => setShowEntrega(true)}
          className="w-full inline-flex items-center justify-center gap-2 py-3 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-sm font-semibold"
        >
          <FaTruck /> Registrar entrega
        </button>
      )}

      <NotaSection notas={ficha.notas} onAdd={handleAddNota} />

      {showImpresion && ImpresionComponent && (
        <ImpresionComponent ficha={ficha} numero={ficha.ordenProduccion} onClose={() => setShowImpresion(false)} />
      )}

      {showFirma && (
        <FirmaModal
          tipo={tipo}
          ficha={ficha}
          onClose={() => setShowFirma(false)}
          onDone={() => { setShowFirma(false); load(); }}
        />
      )}

      {showEntrega && (
        <EntregaModal
          tipo={tipo}
          ficha={ficha}
          onClose={() => setShowEntrega(false)}
          onDone={() => { setShowEntrega(false); load(); }}
        />
      )}
    </div>
  );
}
