import React from "react";
import toast from "react-hot-toast";
import { FaSearch, FaCheckCircle, FaTimes } from "react-icons/fa";
import { listarTodasFichasProduccion } from "../../utils/firebaseFichas";

// Selector de "orden de producción" para ligar una salida de materia prima a
// la ficha que la está consumiendo. Prioriza fichas "en producción".
export default function OrdenProduccionPicker({ value, onChange }) {
  const [fichas, setFichas] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [term, setTerm] = React.useState("");

  React.useEffect(() => {
    let activo = true;
    (async () => {
      try {
        const todas = await listarTodasFichasProduccion();
        if (!activo) return;
        setFichas(todas.filter((f) => f.estado !== "borrador"));
      } catch (e) {
        console.error(e);
        toast.error("No se pudieron cargar las órdenes de producción");
      } finally {
        if (activo) setLoading(false);
      }
    })();
    return () => { activo = false; };
  }, []);

  const resultados = React.useMemo(() => {
    const t = term.trim().toLowerCase();
    const base = t
      ? fichas.filter((f) => `${f.cliente || ""} ${f.ordenProduccion || ""}`.toLowerCase().includes(t))
      : fichas;
    return base
      .slice()
      .sort((a, b) => {
        const aEnProd = a.estado === "en_produccion" ? 0 : 1;
        const bEnProd = b.estado === "en_produccion" ? 0 : 1;
        if (aEnProd !== bEnProd) return aEnProd - bEnProd;
        return Number(b.ordenProduccion || 0) - Number(a.ordenProduccion || 0);
      })
      .slice(0, 8);
  }, [fichas, term]);

  if (value) {
    return (
      <div className="flex items-center justify-between gap-2 rounded-lg border border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20 px-3 py-2.5">
        <div className="min-w-0 flex items-center gap-2 text-xs">
          <FaCheckCircle className="text-green-600 dark:text-green-400 shrink-0" />
          <div className="min-w-0">
            <div className="font-medium text-green-900 dark:text-green-200 truncate">
              OP #{value.ordenProduccion} · {value.tipoLabel}
            </div>
            <div className="text-green-800/80 dark:text-green-300/80 truncate">{value.cliente || "Sin cliente"}</div>
          </div>
        </div>
        <button type="button" onClick={() => onChange(null)} className="shrink-0 h-7 w-7 rounded bg-white dark:bg-gris-800 border border-green-200 dark:border-green-800 flex items-center justify-center">
          <FaTimes className="text-[11px] text-green-700 dark:text-green-300" />
        </button>
      </div>
    );
  }

  return (
    <div>
      <div className="relative">
        <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs" />
        <input
          value={term}
          onChange={(e) => setTerm(e.target.value)}
          placeholder="Buscar orden por cliente o número…"
          className="w-full pl-8 pr-3 py-2.5 rounded-lg border border-gray-300 dark:border-gris-600 bg-white dark:bg-gris-900 text-sm"
        />
      </div>
      <div className="mt-2 max-h-44 overflow-y-auto space-y-1.5">
        {loading ? (
          <div className="text-xs opacity-60 text-center py-3">Cargando…</div>
        ) : resultados.length === 0 ? (
          <div className="text-xs opacity-60 text-center py-3">Sin resultados</div>
        ) : (
          resultados.map((f) => (
            <button
              key={`${f.tipo}-${f.id}`}
              type="button"
              onClick={() => onChange({ ordenProduccion: f.ordenProduccion, fichaId: f.id, fichaTipo: f.tipo, tipoLabel: f.tipoLabel, cliente: f.cliente })}
              className="w-full text-left rounded-lg border border-gray-200 dark:border-gris-700 bg-white dark:bg-gris-900 px-3 py-2 text-xs hover:bg-gray-50 dark:hover:bg-gris-700/50"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium">OP #{f.ordenProduccion} · {f.tipoLabel}</span>
                {f.estado === "en_produccion" && <span className="text-[10px] text-blue-600 dark:text-blue-400 font-medium">En producción</span>}
              </div>
              <div className="text-gray-500 dark:text-gray-400 truncate">{f.cliente || "Sin cliente"}</div>
            </button>
          ))
        )}
      </div>
    </div>
  );
}
