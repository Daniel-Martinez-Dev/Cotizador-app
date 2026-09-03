import React from "react";
import toast from "react-hot-toast";
import { FaSearch, FaSyncAlt, FaTimes, FaCheckDouble } from "react-icons/fa";
import { listarTodasFichasProduccion, FICHA_TIPOS } from "../../utils/firebaseFichas";
import BarraLoteFichas from "../../components/fichas/BarraLoteFichas";
import useSeleccionFichas from "../../components/fichas/useSeleccionFichas";
import { aplicarResultadosLote } from "../../components/fichas/loteFichas";
import EmptyState from "../../components/ui/EmptyState";
import { codigoFicha as codigoDeFicha } from "../../utils/codigoFicha";
import { coincideMedida } from "../../utils/medidasFicha";
import { getImpresionComponent } from "../../components/fichas/impresionPorTipo";
import OrdenPlantaCard from "../../components/empleado/OrdenPlantaCard";

const ESTADO_TABS = [
  { key: "en_produccion", label: "En producción" },
  { key: "terminado", label: "Terminadas" },
  { key: "entregado", label: "Entregadas" },
  { key: "todos", label: "Todas" },
];

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
        // La orden de compra va en la tarjeta, así que también tiene que
        // encontrarse aquí: es el número con el que llama el cliente.
        const blob = `${f.cliente || ""} ${f.clienteAlias || ""} ${f.ordenProduccion || ""} ${f.numeroOrdenCompra || ""} ${codigoDeFicha(f) || ""}`.toLowerCase();
        // La medida es el otro dato con el que planta busca una ficha.
        return blob.includes(term) || coincideMedida(f, term);
      });
  }, [fichas, estadoFiltro, tipoFiltro, search]);

  const hayFiltros = search.trim() || estadoFiltro !== "en_produccion" || tipoFiltro !== "todos";

  // Un pedido son varias órdenes que se alistan y se despachan juntas. En modo
  // selección la tarjeta deja de abrir el detalle y solo marca, para poder
  // firmarlas todas con un formulario (ver BarraLoteFichas).
  const seleccion = useSeleccionFichas(filtradas);

  // La ficha impresa se abre desde el propio listado. En planta lo que se hace
  // con una orden, nueve de cada diez veces, es mirar la ficha: obligar a
  // entrar al detalle y pulsar otro botón eran dos toques para llegar a lo de
  // siempre, con un teléfono en la mano y guantes puestos.
  const [fichaImpresa, setFichaImpresa] = React.useState(null);
  const ImpresionComponent = fichaImpresa ? getImpresionComponent(fichaImpresa.tipo) : null;

  return (
    <div className="pt-4 pb-4">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <h1 className="text-lg font-semibold">Producción</h1>
          <div className="text-xs text-gray-500 dark:text-gray-400">
            {loading ? "Cargando…" : `${porEstado.en_produccion || 0} en producción · ${fichas.length} órdenes`}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => seleccion.setModo(!seleccion.modo)}
            aria-pressed={seleccion.modo}
            className={`h-10 px-3 inline-flex items-center gap-1.5 rounded-lg border text-xs font-semibold ${
              seleccion.modo
                ? "border-green-600 bg-green-600 text-white"
                : "border-gray-300 dark:border-gris-600 bg-white dark:bg-gris-800 text-gray-700 dark:text-gray-200"
            }`}
          >
            <FaCheckDouble className="text-xs" />
            {seleccion.modo ? "Listo" : "Varias"}
          </button>
          <button
            type="button"
            onClick={load}
            disabled={loading}
            aria-label="Actualizar producción"
            className="h-10 w-10 inline-flex items-center justify-center rounded-lg border border-gray-300 dark:border-gris-600 bg-white dark:bg-gris-800 text-gray-700 dark:text-gray-200 disabled:opacity-50"
          >
            <FaSyncAlt className={loading ? "animate-spin" : ""} />
          </button>
        </div>
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
            placeholder="Buscar por cliente, medida, orden u OC…"
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
          {filtradas.map((f) => (
            <OrdenPlantaCard
              key={`${f.tipo}-${f.id}`}
              ficha={f}
              seleccionable={seleccion.modo}
              marcada={seleccion.estaSeleccionada(f)}
              onAlternar={seleccion.alternar}
              onVerFicha={getImpresionComponent(f.tipo) ? setFichaImpresa : null}
            />
          ))}
        </div>
      )}

      {fichaImpresa && ImpresionComponent && (
        <ImpresionComponent
          ficha={fichaImpresa}
          numero={fichaImpresa.ordenProduccion}
          onClose={() => setFichaImpresa(null)}
        />
      )}

      {/* Por encima del tab bar de planta, que es fijo y mide 56 px. */}
      <BarraLoteFichas
        fichas={seleccion.seleccionadas}
        anclaje="bottom-[60px]"
        onAplicar={(resultados) => setFichas((prev) => aplicarResultadosLote(prev, resultados))}
        onLimpiar={seleccion.limpiar}
      />
    </div>
  );
}
