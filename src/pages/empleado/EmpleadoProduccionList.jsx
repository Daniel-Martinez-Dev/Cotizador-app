import React from "react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import { FaSearch, FaSyncAlt, FaChevronRight } from "react-icons/fa";
import { listarTodasFichasProduccion, FICHA_TIPOS } from "../../utils/firebaseFichas";
import EstadoBadge from "../../components/fichas/EstadoBadge";
import EmptyState from "../../components/ui/EmptyState";

const ESTADO_TABS = [
  { key: "en_produccion", label: "En producción" },
  { key: "terminado", label: "Terminadas" },
  { key: "todos", label: "Todas" },
];

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

export default function EmpleadoProduccionList() {
  const [fichas, setFichas] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [estadoFiltro, setEstadoFiltro] = React.useState("en_produccion");
  const [tipoFiltro, setTipoFiltro] = React.useState("todos");
  const [search, setSearch] = React.useState("");

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const todas = await listarTodasFichasProduccion();
      // Los empleados nunca ven fichas en borrador (aún no pasadas a producción).
      setFichas(todas.filter((f) => f.estado !== "borrador"));
    } catch (e) {
      console.error(e);
      toast.error("No se pudo cargar producción");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => { load(); }, [load]);

  const filtradas = React.useMemo(() => {
    const term = search.trim().toLowerCase();
    return fichas
      .filter((f) => estadoFiltro === "todos" || (f.estado || "en_produccion") === estadoFiltro)
      .filter((f) => tipoFiltro === "todos" || f.tipo === tipoFiltro)
      .filter((f) => {
        if (!term) return true;
        const blob = `${f.cliente || ""} ${f.ordenProduccion || ""}`.toLowerCase();
        return blob.includes(term);
      });
  }, [fichas, estadoFiltro, tipoFiltro, search]);

  return (
    <div className="pt-4 space-y-3 pb-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">Producción</h1>
        <button onClick={load} disabled={loading} className="text-xs text-blue-600 dark:text-blue-400 inline-flex items-center gap-1">
          <FaSyncAlt className={loading ? "animate-spin" : ""} /> Actualizar
        </button>
      </div>

      <div className="relative">
        <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por cliente u orden…"
          className="w-full pl-8 pr-3 py-2.5 rounded-lg border border-gray-300 dark:border-gris-600 bg-white dark:bg-gris-800 text-sm"
        />
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1 -mx-3 px-3">
        {ESTADO_TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setEstadoFiltro(t.key)}
            className={`shrink-0 text-xs px-3 py-1.5 rounded-full border font-medium ${
              estadoFiltro === t.key
                ? "bg-black text-white border-black dark:bg-white dark:text-black dark:border-white"
                : "border-gray-300 dark:border-gris-600 bg-white dark:bg-gris-800 text-gray-700 dark:text-gray-200"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1 -mx-3 px-3">
        <button
          type="button"
          onClick={() => setTipoFiltro("todos")}
          className={`shrink-0 text-[11px] px-2.5 py-1 rounded-full border ${
            tipoFiltro === "todos"
              ? "border-trafico text-trafico"
              : "border-gray-200 dark:border-gris-700 text-gray-500 dark:text-gray-400"
          }`}
        >
          Todos los productos
        </button>
        {Object.entries(FICHA_TIPOS).map(([key, cfg]) => (
          <button
            key={key}
            type="button"
            onClick={() => setTipoFiltro(key)}
            className={`shrink-0 text-[11px] px-2.5 py-1 rounded-full border ${
              tipoFiltro === key
                ? "border-trafico text-trafico"
                : "border-gray-200 dark:border-gris-700 text-gray-500 dark:text-gray-400"
            }`}
          >
            {cfg.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-sm opacity-60 text-center py-8">Cargando…</div>
      ) : filtradas.length === 0 ? (
        <EmptyState icon="📋" title="Sin fichas" description="No hay fichas que coincidan con el filtro." />
      ) : (
        <div className="space-y-2">
          {filtradas.map((f) => (
            <Link
              key={`${f.tipo}-${f.id}`}
              to={`/planta/produccion/${f.tipo}/${f.id}`}
              className="flex items-center gap-3 rounded-xl border border-gray-200 dark:border-gris-700 bg-white dark:bg-gris-800 px-3 py-3 active:scale-[0.99] transition"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">{f.tipoLabel}</span>
                  <span className="text-[10px] text-gray-400 font-mono">OP #{f.ordenProduccion ?? "—"}</span>
                </div>
                <div className="font-medium text-sm truncate mt-0.5">{f.cliente || "Sin cliente"}</div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  Entrega: {fmtFecha(f.fechaEntrega)}
                </div>
              </div>
              <div className="flex flex-col items-end gap-1.5 shrink-0">
                <EstadoBadge estado={f.estado} />
                <FaChevronRight className="text-gray-400 text-xs" />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
