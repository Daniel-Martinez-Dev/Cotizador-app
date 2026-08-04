import React from "react";
import toast from "react-hot-toast";
import { FaSearch, FaSyncAlt, FaExclamationTriangle, FaChevronDown, FaChevronUp, FaArrowDown, FaArrowUp } from "react-icons/fa";
import {
  listarItemsInventario,
  listarProveedores,
  listarMovimientosPorItem,
} from "../../utils/firebaseInventory";
import EmptyState from "../../components/ui/EmptyState";
import MovimientoModal from "../../components/empleado/MovimientoModal";

function fmtFechaMov(ts) {
  const d = ts?.toDate ? ts.toDate() : (ts?.seconds ? new Date(ts.seconds * 1000) : null);
  if (!d) return "—";
  return d.toLocaleString("es-CO", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}

export default function EmpleadoInventarioList() {
  const [items, setItems] = React.useState([]);
  const [proveedorNameById, setProveedorNameById] = React.useState({});
  const [loading, setLoading] = React.useState(true);
  const [search, setSearch] = React.useState("");
  const [expandedId, setExpandedId] = React.useState("");
  const [movCache, setMovCache] = React.useState({});
  const [movLoadingId, setMovLoadingId] = React.useState("");
  const [modal, setModal] = React.useState(null); // { item, tipo }

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const [i, p] = await Promise.all([listarItemsInventario(), listarProveedores()]);
      setItems(i);
      const map = {};
      for (const prov of p) map[prov.id] = prov.razonSocial || prov.nombre || "";
      setProveedorNameById(map);
    } catch (e) {
      console.error(e);
      toast.error("No se pudo cargar el inventario");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => { load(); }, [load]);

  const filtrados = React.useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return items;
    return items.filter((i) => {
      const blob = `${i.nombre || ""} ${i.sku || ""} ${i.categoria || ""}`.toLowerCase();
      return blob.includes(term);
    });
  }, [items, search]);

  const toggleExpand = async (item) => {
    const next = expandedId === item.id ? "" : item.id;
    setExpandedId(next);
    if (next && !movCache[item.id]) {
      setMovLoadingId(item.id);
      try {
        const lista = await listarMovimientosPorItem(item.id, { max: 10 });
        setMovCache((c) => ({ ...c, [item.id]: lista }));
      } catch (e) {
        console.error(e);
      } finally {
        setMovLoadingId("");
      }
    }
  };

  const handleModalDone = async (itemId) => {
    setModal(null);
    setMovCache((c) => { const next = { ...c }; delete next[itemId]; return next; });
    await load();
    if (expandedId === itemId) toggleExpand({ id: itemId });
  };

  return (
    <div className="pt-4 space-y-3 pb-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">Materia prima</h1>
        <button onClick={load} disabled={loading} className="text-xs text-blue-600 dark:text-blue-400 inline-flex items-center gap-1">
          <FaSyncAlt className={loading ? "animate-spin" : ""} /> Actualizar
        </button>
      </div>

      <div className="relative">
        <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar material…"
          className="w-full pl-8 pr-3 py-2.5 rounded-lg border border-gray-300 dark:border-gris-600 bg-white dark:bg-gris-800 text-sm"
        />
      </div>

      {loading ? (
        <div className="text-sm opacity-60 text-center py-8">Cargando…</div>
      ) : filtrados.length === 0 ? (
        <EmptyState icon="📦" title="Sin materiales" description="No hay materiales que coincidan con la búsqueda." />
      ) : (
        <div className="space-y-2">
          {filtrados.map((item) => {
            const bajoStock = Number(item.stockMinimo || 0) > 0 && Number(item.stockActual || 0) < Number(item.stockMinimo || 0);
            const expanded = expandedId === item.id;
            return (
              <div key={item.id} className="rounded-xl border border-gray-200 dark:border-gris-700 bg-white dark:bg-gris-800 overflow-hidden">
                <button type="button" onClick={() => toggleExpand(item)} className="w-full flex items-center gap-3 px-3 py-3 text-left">
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm truncate">{item.nombre}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                      {item.categoria || "—"} {item.sku ? `· ${item.sku}` : ""}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className={`font-mono font-semibold text-sm ${bajoStock ? "text-red-600 dark:text-red-400" : ""}`}>
                      {item.stockActual ?? 0} <span className="text-[10px] font-normal text-gray-400">{item.unidad || ""}</span>
                    </div>
                    {bajoStock && (
                      <div className="text-[10px] text-red-600 dark:text-red-400 inline-flex items-center gap-1">
                        <FaExclamationTriangle /> Stock bajo
                      </div>
                    )}
                  </div>
                  {expanded ? <FaChevronUp className="text-gray-400 text-xs shrink-0" /> : <FaChevronDown className="text-gray-400 text-xs shrink-0" />}
                </button>

                {expanded && (
                  <div className="px-3 pb-3 border-t border-gray-100 dark:border-gris-700/60">
                    <div className="flex gap-2 pt-3">
                      <button
                        type="button"
                        onClick={() => setModal({ item, tipo: "ingreso" })}
                        className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 rounded-lg bg-green-600 hover:bg-green-500 text-white text-xs font-medium"
                      >
                        <FaArrowDown className="text-[10px]" /> Entrada
                      </button>
                      <button
                        type="button"
                        onClick={() => setModal({ item, tipo: "salida" })}
                        className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs font-medium"
                      >
                        <FaArrowUp className="text-[10px]" /> Salida
                      </button>
                    </div>

                    <div className="mt-3 text-[11px] font-semibold text-gray-400 uppercase tracking-wide">Movimientos recientes</div>
                    {movLoadingId === item.id ? (
                      <div className="text-xs opacity-60 py-2">Cargando…</div>
                    ) : !movCache[item.id] || movCache[item.id].length === 0 ? (
                      <div className="text-xs opacity-60 py-2">Sin movimientos</div>
                    ) : (
                      <div className="mt-1.5 space-y-1.5">
                        {movCache[item.id].map((m) => (
                          <div key={m.id} className="flex items-center justify-between gap-2 text-xs bg-gray-50 dark:bg-gris-700/50 rounded-lg px-2.5 py-1.5">
                            <div className="min-w-0">
                              <span className={`font-medium ${m.tipo === "salida" ? "text-red-600 dark:text-red-400" : "text-green-600 dark:text-green-400"}`}>
                                {m.tipo === "salida" ? "Salida" : "Entrada"}
                              </span>{" "}
                              <span className="font-mono">{m.cantidad}</span>
                              {m.tipo === "ingreso" && m.proveedorId && (
                                <span className="text-gray-400"> · {proveedorNameById[m.proveedorId] || "—"}</span>
                              )}
                              {m.tipo === "salida" && m.ordenProduccion ? (
                                <span className="text-gray-400"> · OP #{m.ordenProduccion}</span>
                              ) : null}
                              {m.nota && <div className="text-gray-400 truncate">{m.nota}</div>}
                            </div>
                            <div className="text-gray-400 shrink-0">{fmtFechaMov(m.createdAt)}</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {modal && (
        <MovimientoModal
          item={modal.item}
          tipo={modal.tipo}
          onClose={() => setModal(null)}
          onDone={() => handleModalDone(modal.item.id)}
        />
      )}
    </div>
  );
}
