import React from "react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import {
  FaSearch, FaSyncAlt, FaChevronRight, FaTimes, FaRulerCombined,
  FaLayerGroup, FaCalendarAlt, FaExclamationCircle,
} from "react-icons/fa";
import { listarTodasFichasProduccion, FICHA_TIPOS } from "../../utils/firebaseFichas";
import EstadoBadge from "../../components/fichas/EstadoBadge";
import EmptyState from "../../components/ui/EmptyState";
import { codigoFicha as codigoDeFicha, codigoFichaOFallback } from "../../utils/codigoFicha";
import { medidasFichaTexto, coincideMedida } from "../../utils/medidasFicha";
import { nombreClienteImpreso } from "../../utils/clienteVinculo";

const ESTADO_TABS = [
  { key: "en_produccion", label: "En producción" },
  { key: "terminado", label: "Terminadas" },
  { key: "entregado", label: "Entregadas" },
  { key: "todos", label: "Todas" },
];

function aFecha(f) {
  if (!f) return null;
  try {
    const m = typeof f === "string" && /^(\d{4})-(\d{2})-(\d{2})$/.exec(f);
    const d = m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : new Date(f);
    return Number.isNaN(d.getTime()) ? null : d;
  } catch {
    return null;
  }
}

function fmtFecha(f) {
  const d = aFecha(f);
  return d ? d.toLocaleDateString("es-CO") : "—";
}

// Días que faltan para la entrega (negativo = vencida). Se compara a
// medianoche: una entrega de hoy no está vencida por la hora que sea.
function diasParaEntrega(f) {
  const d = aFecha(f);
  if (!d) return null;
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  d.setHours(0, 0, 0, 0);
  return Math.round((d - hoy) / 86400000);
}

// La urgencia solo aplica mientras la ficha esté en planta: una entregada tarde
// ya no es una alarma, es historia.
function urgenciaEntrega(ficha) {
  if ((ficha.estado || "en_produccion") === "entregado") return null;
  const dias = diasParaEntrega(ficha.fechaEntrega);
  if (dias === null) return null;
  if (dias < 0) return { texto: `Vencida hace ${Math.abs(dias)} d`, cls: "text-red-700 dark:text-red-400 font-semibold", alerta: true };
  if (dias === 0) return { texto: "Entrega hoy", cls: "text-red-700 dark:text-red-400 font-semibold", alerta: true };
  if (dias === 1) return { texto: "Entrega mañana", cls: "text-amber-700 dark:text-amber-400 font-semibold", alerta: true };
  if (dias <= 3) return { texto: `En ${dias} días`, cls: "text-amber-700 dark:text-amber-400 font-medium", alerta: false };
  return null;
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

  const porEstado = React.useMemo(() => {
    const cuenta = { todos: fichas.length };
    for (const f of fichas) {
      const k = f.estado || "en_produccion";
      cuenta[k] = (cuenta[k] || 0) + 1;
    }
    return cuenta;
  }, [fichas]);

  // Solo se ofrecen los productos que de verdad hay en el listado: filtrar por
  // una línea sin fichas abiertas es un callejón sin salida.
  const tiposPresentes = React.useMemo(() => {
    const set = new Set(fichas.map((f) => f.tipo));
    return Object.entries(FICHA_TIPOS).filter(([key]) => set.has(key));
  }, [fichas]);

  const filtradas = React.useMemo(() => {
    const term = search.trim().toLowerCase();
    return fichas
      .filter((f) => estadoFiltro === "todos" || (f.estado || "en_produccion") === estadoFiltro)
      .filter((f) => tipoFiltro === "todos" || f.tipo === tipoFiltro)
      .filter((f) => {
        if (!term) return true;
        // El alias entra en la búsqueda junto al nombre completo: en planta se
        // busca por el que salió impreso, pero desde oficina se pregunta por el otro.
        const blob = `${f.cliente || ""} ${f.clienteAlias || ""} ${f.ordenProduccion || ""} ${codigoDeFicha(f) || ""}`.toLowerCase();
        // La medida es el otro dato con el que planta busca una ficha.
        return blob.includes(term) || coincideMedida(f, term);
      });
  }, [fichas, estadoFiltro, tipoFiltro, search]);

  const hayFiltros = search.trim() || estadoFiltro !== "en_produccion" || tipoFiltro !== "todos";

  return (
    <div className="pt-4 pb-4">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <h1 className="text-lg font-semibold">Producción</h1>
          <div className="text-xs text-gray-500 dark:text-gray-400">
            {loading ? "Cargando…" : `${porEstado.en_produccion || 0} en producción · ${fichas.length} órdenes`}
          </div>
        </div>
        <button
          type="button"
          onClick={load}
          disabled={loading}
          aria-label="Actualizar producción"
          className="h-10 w-10 shrink-0 inline-flex items-center justify-center rounded-lg border border-gray-300 dark:border-gris-600 bg-white dark:bg-gris-800 text-gray-700 dark:text-gray-200 disabled:opacity-50"
        >
          <FaSyncAlt className={loading ? "animate-spin" : ""} />
        </button>
      </div>

      {/* Buscador y filtros fijos bajo el header, como en materia prima. */}
      <div className="sticky top-14 z-30 -mx-3 px-3 pt-3 pb-2 bg-gray-50 dark:bg-gris-900 space-y-2">
        <div className="relative">
          <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            type="search"
            inputMode="search"
            placeholder="Buscar por cliente, medida u orden…"
            className="w-full pl-8 pr-10 py-2.5 rounded-lg border border-gray-300 dark:border-gris-600 bg-white dark:bg-gris-800 text-sm"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              aria-label="Limpiar búsqueda"
              className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 inline-flex items-center justify-center text-gray-400"
            >
              <FaTimes className="text-xs" />
            </button>
          )}
        </div>

        <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-3 px-3">
          {ESTADO_TABS.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setEstadoFiltro(t.key)}
              className={`shrink-0 text-xs px-3 py-1.5 rounded-full border font-medium transition ${
                estadoFiltro === t.key
                  ? "bg-gray-900 text-white border-gray-900 dark:bg-trafico dark:text-negro dark:border-trafico"
                  : "border-gray-300 dark:border-gris-600 bg-white dark:bg-gris-800 text-gray-700 dark:text-gray-200"
              }`}
            >
              {t.label} <span className="opacity-70">{porEstado[t.key] || 0}</span>
            </button>
          ))}
        </div>

        {tiposPresentes.length > 1 && (
          <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-3 px-3">
            <button
              type="button"
              onClick={() => setTipoFiltro("todos")}
              className={`shrink-0 text-[11px] px-2.5 py-1 rounded-full border transition ${
                tipoFiltro === "todos"
                  ? "border-trafico text-trafico font-medium"
                  : "border-gray-200 dark:border-gris-700 text-gray-500 dark:text-gray-400"
              }`}
            >
              Todos los productos
            </button>
            {tiposPresentes.map(([key, cfg]) => (
              <button
                key={key}
                type="button"
                onClick={() => setTipoFiltro(tipoFiltro === key ? "todos" : key)}
                className={`shrink-0 text-[11px] px-2.5 py-1 rounded-full border transition ${
                  tipoFiltro === key
                    ? "border-trafico text-trafico font-medium"
                    : "border-gray-200 dark:border-gris-700 text-gray-500 dark:text-gray-400"
                }`}
              >
                {cfg.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {loading ? (
        <div className="space-y-2">
          {[0, 1, 2, 3].map((n) => (
            <div key={n} className="h-24 rounded-xl border border-gray-200 dark:border-gris-700 bg-white dark:bg-gris-800 animate-pulse" />
          ))}
        </div>
      ) : filtradas.length === 0 ? (
        <EmptyState
          icon="📋"
          title="Sin fichas"
          description={hayFiltros ? "Ninguna orden coincide con el filtro." : "No hay órdenes en producción."}
          action={hayFiltros ? (
            <button
              type="button"
              onClick={() => { setSearch(""); setEstadoFiltro("en_produccion"); setTipoFiltro("todos"); }}
              className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gris-600 bg-white dark:bg-gris-800 text-xs font-medium"
            >
              Quitar filtros
            </button>
          ) : null}
        />
      ) : (
        <div className="space-y-2">
          {filtradas.map((f) => {
            const medida = medidasFichaTexto(f);
            const urgencia = urgenciaEntrega(f);
            const cantidad = Number(f.cantidad || 0);
            return (
              <Link
                key={`${f.tipo}-${f.id}`}
                to={`/planta/produccion/${f.tipo}/${f.id}`}
                className="flex items-center gap-3 rounded-xl border border-gray-200 dark:border-gris-700 bg-white dark:bg-gris-800 px-3 py-3 active:scale-[0.99] transition"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[10px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">{f.tipoLabel}</span>
                    <span className="text-[10px] text-gray-400 font-mono">{codigoFichaOFallback(f)}</span>
                  </div>

                  {/* Cliente y medida juntos: cuando un mismo cliente tiene varias
                      órdenes abiertas, la medida es lo que las distingue en planta. */}
                  <div className="font-semibold text-[15px] leading-snug break-words mt-0.5">{nombreClienteImpreso(f) || "Sin cliente"}</div>

                  <div className="flex items-center gap-2 flex-wrap mt-1">
                    {medida ? (
                      <span className="inline-flex items-center gap-1.5 rounded-md bg-gray-900 text-white dark:bg-gris-700 dark:text-gray-100 px-2 py-1 font-mono font-bold text-sm leading-none">
                        <FaRulerCombined className="text-[10px] opacity-70" aria-hidden="true" />
                        {medida}
                        <span className="text-[10px] font-sans font-normal opacity-70">mm</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 rounded-md bg-gray-100 dark:bg-gris-700 text-gray-600 dark:text-gray-300 px-2 py-1 text-xs leading-none">
                        <FaLayerGroup className="text-[10px] opacity-70" aria-hidden="true" />
                        {(f.items?.length || 0) > 0 ? `${f.items.length} ítems` : "Sin medidas"}
                      </span>
                    )}
                    {cantidad > 1 && (
                      <span className="text-xs font-semibold text-gray-600 dark:text-gray-300">×{cantidad}</span>
                    )}
                  </div>

                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-1.5 inline-flex items-center gap-1.5 flex-wrap">
                    <FaCalendarAlt className="text-[10px]" aria-hidden="true" />
                    Entrega: {fmtFecha(f.fechaEntrega)}
                    {urgencia && (
                      <span className={`inline-flex items-center gap-1 ${urgencia.cls}`}>
                        {urgencia.alerta && <FaExclamationCircle className="text-[10px]" aria-hidden="true" />}
                        {urgencia.texto}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex flex-col items-end gap-1.5 shrink-0">
                  <EstadoBadge estado={f.estado} />
                  <FaChevronRight className="text-gray-400 text-xs" />
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
