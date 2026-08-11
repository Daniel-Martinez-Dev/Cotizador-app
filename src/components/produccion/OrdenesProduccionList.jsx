import React from "react";
import toast from "react-hot-toast";
import { FaSearch, FaSyncAlt, FaTimes, FaFileAlt } from "react-icons/fa";
import { listarTodasFichasProduccion, FICHA_TIPOS } from "../../utils/firebaseFichas";
import { getImpresionComponent } from "../fichas/impresionPorTipo";
import EstadoBadge from "../fichas/EstadoBadge";
import { ESTADOS_FICHA, ESTADO_LABEL, ESTADO_DOT } from "../fichas/estadoFicha";
import EmptyState from "../ui/EmptyState";
import { codigoFichaOFallback, aFechaLocal } from "../../utils/codigoFicha";
import { fmtDate } from "../../utils/fichaFormat";

// Listado único de TODAS las órdenes de producción, de todas las líneas de
// producto (división, sello, abrigo, puerta rápida y fichas básicas). Cada
// producto sigue teniendo su propia pestaña para crear/editar; esta vista es
// solo de consulta: buscar una orden concreta entre todas y abrir su ficha.
//
// El filtrado es en memoria a propósito: las 5 colecciones ya se traen enteras
// (tope de 200 por línea, ver listarTodasFichasProduccion) y cruzarlas en
// Firestore exigiría un índice por cada combinación de filtros.

const CAMPOS_FECHA = [
  { key: "fechaOrden",   label: "Fecha de orden" },
  { key: "fechaEntrega", label: "Fecha de entrega" },
  { key: "createdAt",    label: "Fecha de creación" },
];

const ORDENAMIENTOS = [
  { key: "recientes", label: "N.° ficha (más reciente)" },
  { key: "antiguas",  label: "N.° ficha (más antigua)" },
  { key: "entrega",   label: "Entrega más próxima" },
  { key: "cliente",   label: "Cliente (A–Z)" },
];

const FILTROS_INICIALES = {
  texto: "",
  tipo: "todos",
  estado: "todos",
  cliente: "todos",
  campoFecha: "fechaOrden",
  desde: "",
  hasta: "",
};

// Sin tildes y en minúsculas: buscar "division" debe encontrar "División".
const normalizar = (t) =>
  String(t ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

// Clave "YYYY-MM-DD" comparable como texto, sirva el valor de string ISO,
// Date o Timestamp de Firestore.
function claveDia(valor) {
  const d = aFechaLocal(valor);
  if (!d) return "";
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

// Texto sobre el que busca el campo de búsqueda libre: todo lo que identifica
// una orden sin importar de qué producto sea.
function textoBuscable(f) {
  return normalizar([
    codigoFichaOFallback(f, f.tipo),
    f.cliente,
    f.numeroOrdenCompra,
    f.numeroFicha,
    f.ordenProduccion,
    f.tipoLabel,
    f.responsable,
    f.auxiliarEncargado,
    f.adicional,
    f.observaciones,
    (f.categorias || []).join(" "),
    (f.items || []).map((i) => `${i.descripcion} ${i.referencia}`).join(" "),
  ].filter(Boolean).join(" "));
}

const selectCls = "px-2.5 py-2 rounded border border-gray-300 dark:border-gris-600 bg-white dark:bg-gris-700 text-sm";
const labelCls = "text-[11px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide";

export default function OrdenesProduccionList() {
  const [fichas, setFichas] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [filtros, setFiltros] = React.useState(FILTROS_INICIALES);
  const [ordenamiento, setOrdenamiento] = React.useState("recientes");
  const [printFicha, setPrintFicha] = React.useState(null);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      setFichas(await listarTodasFichasProduccion());
    } catch (e) {
      console.error(e);
      toast.error("No se pudieron cargar las órdenes");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => { load(); }, [load]);

  const set = (campo) => (e) => setFiltros((p) => ({ ...p, [campo]: e.target.value }));

  // El índice de búsqueda se calcula una sola vez por carga, no en cada tecla.
  const indexadas = React.useMemo(
    () => fichas.map((f) => ({ ficha: f, buscable: textoBuscable(f) })),
    [fichas]
  );

  const clientes = React.useMemo(() => {
    const unicos = new Set(fichas.map((f) => (f.cliente || "").trim()).filter(Boolean));
    return [...unicos].sort((a, b) => a.localeCompare(b, "es"));
  }, [fichas]);

  const conteoPorEstado = React.useMemo(() => {
    const acc = {};
    for (const f of fichas) {
      const k = f.estado || "borrador";
      acc[k] = (acc[k] || 0) + 1;
    }
    return acc;
  }, [fichas]);

  const filtradas = React.useMemo(() => {
    const termino = normalizar(filtros.texto.trim());
    const lista = indexadas
      .filter(({ ficha: f, buscable }) => {
        if (filtros.tipo !== "todos" && f.tipo !== filtros.tipo) return false;
        if (filtros.estado !== "todos" && (f.estado || "borrador") !== filtros.estado) return false;
        if (filtros.cliente !== "todos" && (f.cliente || "").trim() !== filtros.cliente) return false;
        if (filtros.desde || filtros.hasta) {
          const dia = claveDia(f[filtros.campoFecha]);
          // Una ficha sin esa fecha no puede afirmarse dentro del rango.
          if (!dia) return false;
          if (filtros.desde && dia < filtros.desde) return false;
          if (filtros.hasta && dia > filtros.hasta) return false;
        }
        if (termino && !buscable.includes(termino)) return false;
        return true;
      })
      .map(({ ficha }) => ficha);

    const porOrden = (a, b) => Number(b.ordenProduccion || 0) - Number(a.ordenProduccion || 0);
    if (ordenamiento === "antiguas") return lista.sort((a, b) => -porOrden(a, b));
    if (ordenamiento === "cliente") {
      return lista.sort((a, b) => (a.cliente || "").localeCompare(b.cliente || "", "es") || porOrden(a, b));
    }
    if (ordenamiento === "entrega") {
      // Las que no tienen fecha de entrega van al final, no al principio.
      return lista.sort((a, b) => {
        const da = claveDia(a.fechaEntrega) || "9999-12-31";
        const db = claveDia(b.fechaEntrega) || "9999-12-31";
        return da.localeCompare(db) || porOrden(a, b);
      });
    }
    return lista.sort(porOrden);
  }, [indexadas, filtros, ordenamiento]);

  const hayFiltros =
    filtros.texto !== "" || filtros.tipo !== "todos" || filtros.estado !== "todos" ||
    filtros.cliente !== "todos" || filtros.desde !== "" || filtros.hasta !== "";

  const ImpresionComponent = printFicha ? getImpresionComponent(printFicha.tipo) : null;

  const chipCls = (activo) =>
    `shrink-0 inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border font-medium transition ${
      activo
        ? "bg-gray-900 text-white border-gray-900 dark:bg-white dark:text-gray-900 dark:border-white"
        : "border-gray-300 dark:border-gris-600 bg-white dark:bg-gris-800 text-gray-600 dark:text-gray-300 hover:border-gray-400"
    }`;

  return (
    <div className="space-y-4">
      <section className="bg-white dark:bg-gris-800 border border-gray-200 dark:border-gris-700 rounded-lg p-4 space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div className="font-medium text-sm">Todas las órdenes de producción</div>
          <button onClick={load} disabled={loading}
            className="text-xs text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-1.5 disabled:opacity-50">
            <FaSyncAlt className={loading ? "animate-spin" : ""} /> Actualizar
          </button>
        </div>

        {/* Búsqueda libre */}
        <div className="relative">
          <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs" />
          <input
            value={filtros.texto}
            onChange={set("texto")}
            placeholder="Buscar por n.° de ficha, cliente, orden de compra, ítem…"
            className="w-full pl-8 pr-3 py-2 rounded border border-gray-300 dark:border-gris-600 bg-white dark:bg-gris-700 text-sm"
          />
        </div>

        {/* Estado */}
        <div className="flex gap-2 overflow-x-auto pb-0.5">
          <button type="button" onClick={() => setFiltros((p) => ({ ...p, estado: "todos" }))}
            className={chipCls(filtros.estado === "todos")}>
            Todos los estados
            <span className="opacity-60">{fichas.length}</span>
          </button>
          {ESTADOS_FICHA.map((e) => (
            <button key={e} type="button" onClick={() => setFiltros((p) => ({ ...p, estado: e }))}
              className={chipCls(filtros.estado === e)}>
              <span className={`h-1.5 w-1.5 rounded-full ${ESTADO_DOT[e]}`} />
              {ESTADO_LABEL[e]}
              <span className="opacity-60">{conteoPorEstado[e] || 0}</span>
            </button>
          ))}
        </div>

        {/* Producto */}
        <div className="flex gap-2 overflow-x-auto pb-0.5">
          <button type="button" onClick={() => setFiltros((p) => ({ ...p, tipo: "todos" }))}
            className={chipCls(filtros.tipo === "todos")}>
            Todos los productos
          </button>
          {Object.entries(FICHA_TIPOS).map(([key, cfg]) => (
            <button key={key} type="button" onClick={() => setFiltros((p) => ({ ...p, tipo: key }))}
              className={chipCls(filtros.tipo === key)}>
              {cfg.label}
            </button>
          ))}
        </div>

        {/* Cliente, rango de fechas y ordenamiento */}
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3 pt-1">
          <div className="col-span-2 md:col-span-1">
            <label className={labelCls}>Cliente</label>
            <select value={filtros.cliente} onChange={set("cliente")} className={`${selectCls} mt-1 w-full`}>
              <option value="todos">Todos ({clientes.length})</option>
              {clientes.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className={labelCls}>Filtrar por</label>
            <select value={filtros.campoFecha} onChange={set("campoFecha")} className={`${selectCls} mt-1 w-full`}>
              {CAMPOS_FECHA.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}
            </select>
          </div>
          <div>
            <label className={labelCls}>Desde</label>
            <input type="date" value={filtros.desde} onChange={set("desde")} className={`${selectCls} mt-1 w-full`} />
          </div>
          <div>
            <label className={labelCls}>Hasta</label>
            <input type="date" value={filtros.hasta} onChange={set("hasta")} className={`${selectCls} mt-1 w-full`} />
          </div>
          <div>
            <label className={labelCls}>Ordenar por</label>
            <select value={ordenamiento} onChange={(e) => setOrdenamiento(e.target.value)} className={`${selectCls} mt-1 w-full`}>
              {ORDENAMIENTOS.map((o) => <option key={o.key} value={o.key}>{o.label}</option>)}
            </select>
          </div>
          <div className="flex items-end">
            <button
              type="button"
              onClick={() => setFiltros(FILTROS_INICIALES)}
              disabled={!hayFiltros}
              className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded border border-gray-300 dark:border-gris-600 text-sm hover:bg-gray-50 dark:hover:bg-gris-700 disabled:opacity-40 disabled:cursor-default"
            >
              <FaTimes className="text-[11px]" /> Limpiar filtros
            </button>
          </div>
        </div>

        <div className="text-xs text-gray-500 dark:text-gray-400">
          {loading ? "Cargando…" : `${filtradas.length} de ${fichas.length} órdenes`}
        </div>
      </section>

      <section className="bg-white dark:bg-gris-800 border border-gray-200 dark:border-gris-700 rounded-lg p-4">
        {loading ? (
          <div className="text-sm opacity-60 py-6 text-center">Cargando órdenes…</div>
        ) : filtradas.length === 0 ? (
          <EmptyState
            icon="🔍"
            title={fichas.length === 0 ? "Aún no hay órdenes" : "Ninguna orden coincide"}
            description={
              fichas.length === 0
                ? "Las fichas que crees en las pestañas de producto aparecerán aquí."
                : "Prueba con otros filtros o limpia la búsqueda."
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gris-700 text-gray-500">
                  <th className="text-left py-2 font-medium whitespace-nowrap">N.° ficha</th>
                  <th className="text-left py-2 font-medium">Producto</th>
                  <th className="text-left py-2 font-medium">Cliente</th>
                  <th className="text-left py-2 font-medium whitespace-nowrap">Orden compra</th>
                  <th className="text-center py-2 font-medium">Cant.</th>
                  <th className="text-left py-2 font-medium whitespace-nowrap">F. orden</th>
                  <th className="text-left py-2 font-medium whitespace-nowrap">F. entrega</th>
                  <th className="text-center py-2 font-medium">Estado</th>
                  <th className="py-2"></th>
                </tr>
              </thead>
              <tbody>
                {filtradas.map((f) => (
                  <tr key={`${f.tipo}-${f.id}`}
                    className="border-b border-gray-100 dark:border-gris-700/50 hover:bg-gray-50 dark:hover:bg-gris-700/40 transition-colors">
                    <td className="py-2 font-mono text-gray-500 whitespace-nowrap">{codigoFichaOFallback(f, f.tipo)}</td>
                    <td className="py-2 text-gray-600 dark:text-gray-300 whitespace-nowrap">{f.tipoLabel}</td>
                    <td className="py-2 font-medium">{f.cliente || "—"}</td>
                    <td className="py-2 text-gray-500">{f.numeroOrdenCompra || "—"}</td>
                    <td className="py-2 text-center">{f.cantidad ?? "—"}</td>
                    <td className="py-2 text-gray-500 whitespace-nowrap">{fmtDate(f.fechaOrden)}</td>
                    <td className="py-2 text-gray-500 whitespace-nowrap">{fmtDate(f.fechaEntrega)}</td>
                    <td className="py-2 text-center"><EstadoBadge estado={f.estado} /></td>
                    <td className="py-2 pl-2">
                      <button
                        onClick={() => setPrintFicha(f)}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs rounded bg-gray-100 hover:bg-gray-200 dark:bg-gris-700 dark:hover:bg-gris-600 border border-gray-300 dark:border-gris-600 whitespace-nowrap"
                      >
                        <FaFileAlt className="text-[10px]" /> Ver ficha
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {printFicha && ImpresionComponent && (
        <ImpresionComponent
          ficha={printFicha}
          numero={printFicha.ordenProduccion}
          onClose={() => setPrintFicha(null)}
        />
      )}
    </div>
  );
}
