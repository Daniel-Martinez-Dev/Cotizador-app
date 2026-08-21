import React from "react";
import toast from "react-hot-toast";
import {
  FaSearch,
  FaSyncAlt,
  FaExclamationTriangle,
  FaChevronDown,
  FaChevronUp,
  FaArrowDown,
  FaArrowUp,
  FaBoxOpen,
  FaMapMarkerAlt,
  FaTimes,
  FaHistory,
  FaBarcode,
  FaPlus,
  FaPen,
  FaFileInvoice,
} from "react-icons/fa";
import {
  listarItemsInventario,
  listarProveedores,
  listarMovimientosPorItem,
  buscarItemPorCodigo,
} from "../../utils/firebaseInventory";
import EmptyState from "../../components/ui/EmptyState";
import MovimientoModal from "../../components/empleado/MovimientoModal";
import MaterialFormModal from "../../components/almacen/MaterialFormModal";
import EscanerCodigoModal from "../../components/inventario/EscanerCodigoModal";
import { buscarItemPorCodigoEnLista } from "../../utils/codigoMaterial";
import { crearAcumuladorEscaner } from "../../utils/escanerCodigo";

const nfmt = new Intl.NumberFormat("es-CO", { maximumFractionDigits: 2 });
const fmtNum = (v) => nfmt.format(Number(v || 0));

function fmtFechaMov(ts) {
  const d = ts?.toDate ? ts.toDate() : (ts?.seconds ? new Date(ts.seconds * 1000) : null);
  if (!d) return "—";
  return d.toLocaleString("es-CO", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}

// Semáforo de disponibilidad. Es lo primero que mira el operario, así que cada
// estado tiene color, etiqueta y franja lateral propios en vez de depender solo
// del número.
const ESTADOS = {
  agotado: {
    label: "Agotado",
    strip: "bg-red-600",
    chip: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300",
    valor: "text-red-700 dark:text-red-400",
    barra: "bg-red-600",
  },
  bajo: {
    label: "Stock bajo",
    strip: "bg-amber-500",
    chip: "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-300",
    valor: "text-amber-700 dark:text-amber-400",
    barra: "bg-amber-500",
  },
  ok: {
    label: "Disponible",
    strip: "bg-emerald-500",
    chip: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
    valor: "text-gray-900 dark:text-gray-100",
    barra: "bg-emerald-500",
  },
};

function estadoDeStock(item) {
  const actual = Number(item.stockActual || 0);
  const minimo = Number(item.stockMinimo || 0);
  if (actual <= 0) return "agotado";
  if (minimo > 0 && actual < minimo) return "bajo";
  return "ok";
}

export default function EmpleadoInventarioList() {
  const [items, setItems] = React.useState([]);
  const [proveedorNameById, setProveedorNameById] = React.useState({});
  const [loading, setLoading] = React.useState(true);
  const [search, setSearch] = React.useState("");
  const [filtroEstado, setFiltroEstado] = React.useState("todos"); // todos | alerta | agotado
  const [filtroCategoria, setFiltroCategoria] = React.useState("");
  const [expandedId, setExpandedId] = React.useState("");
  const [movCache, setMovCache] = React.useState({});
  const [movLoadingId, setMovLoadingId] = React.useState("");
  const [modal, setModal] = React.useState(null); // { item, tipo }
  // null = cerrado; { material: null } = alta; { material } = edición.
  const [formMaterial, setFormMaterial] = React.useState(null);
  const [foto, setFoto] = React.useState(null); // { src, nombre }
  const [escanerAbierto, setEscanerAbierto] = React.useState(false);
  const [escanerError, setEscanerError] = React.useState("");
  const [buscandoCodigo, setBuscandoCodigo] = React.useState(false);
  // Material identificado por su código, a la espera de que se diga si entra o
  // sale. El código leído viaja con él para dejarlo grabado en el movimiento.
  const [escaneado, setEscaneado] = React.useState(null); // { item, codigo }

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

  // Un código leído se resuelve primero contra la lista que ya está en pantalla
  // —es instantáneo y funciona con la conexión intermitente de la planta— y
  // solo si no aparece se pregunta al servidor, porque el listado se corta en
  // 200 materiales y el que se acaba de barrer puede estar fuera.
  const resolverCodigo = React.useCallback(async (codigo) => {
    setEscanerError("");
    const local = buscarItemPorCodigoEnLista(items, codigo);
    if (local) return local;

    setBuscandoCodigo(true);
    try {
      return await buscarItemPorCodigo(codigo);
    } catch (e) {
      console.error(e);
      return null;
    } finally {
      setBuscandoCodigo(false);
    }
  }, [items]);

  const manejarCodigo = React.useCallback(async (codigo) => {
    const item = await resolverCodigo(codigo);
    if (!item) {
      // El escáner se queda abierto: lo normal es volver a intentarlo con otra
      // etiqueta, no cerrar y empezar de nuevo.
      setEscanerError(`Ningún material tiene el código ${codigo}. Revisa que la etiqueta esté impresa desde el inventario.`);
      return;
    }
    setEscanerError("");
    setEscanerAbierto(false);
    setEscaneado({ item, codigo });
  }, [resolverCodigo]);

  // Lector de pistola sin abrir nada: en el PC de bodega se dispara sobre la
  // lista y el material aparece solo. El acumulador distingue el barrido del
  // tecleo por la velocidad (ver utils/escanerCodigo.js).
  React.useEffect(() => {
    if (escanerAbierto || modal || escaneado || foto) return;

    const acumulador = crearAcumuladorEscaner({ onCodigo: manejarCodigo });
    const onKeyDown = (e) => {
      // Si el foco está en el buscador o en cualquier campo, las teclas son de
      // quien escribe y no se tocan.
      const tag = document.activeElement?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (acumulador.procesarTecla({ key: e.key, tiempo: e.timeStamp })) e.preventDefault();
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [escanerAbierto, modal, escaneado, foto, manejarCodigo]);

  const resumen = React.useMemo(() => {
    let bajos = 0;
    let agotados = 0;
    for (const i of items) {
      const estado = estadoDeStock(i);
      if (estado === "agotado") agotados += 1;
      else if (estado === "bajo") bajos += 1;
    }
    return { total: items.length, bajos, agotados, alerta: bajos + agotados };
  }, [items]);

  const categorias = React.useMemo(() => {
    const set = new Set();
    for (const i of items) if (i.categoria) set.add(i.categoria);
    return Array.from(set).sort((a, b) => a.localeCompare(b, "es"));
  }, [items]);

  const filtrados = React.useMemo(() => {
    const term = search.trim().toLowerCase();
    const lista = items.filter((i) => {
      const estado = estadoDeStock(i);
      if (filtroEstado === "alerta" && estado === "ok") return false;
      if (filtroEstado === "agotado" && estado !== "agotado") return false;
      if (filtroCategoria && i.categoria !== filtroCategoria) return false;
      if (!term) return true;
      const blob = `${i.nombre || ""} ${i.sku || ""} ${i.codigoBarras || ""} ${i.categoria || ""} ${i.ubicacion || ""}`.toLowerCase();
      return blob.includes(term);
    });
    // Lo que necesita reposición va arriba; dentro de cada grupo, orden alfabético
    // para que la lista sea predecible entre recargas.
    const peso = { agotado: 0, bajo: 1, ok: 2 };
    return lista.sort((a, b) => {
      const d = peso[estadoDeStock(a)] - peso[estadoDeStock(b)];
      if (d !== 0) return d;
      return String(a.nombre || "").localeCompare(String(b.nombre || ""), "es");
    });
  }, [items, search, filtroEstado, filtroCategoria]);

  const fetchMovimientos = React.useCallback(async (itemId) => {
    setMovLoadingId(itemId);
    try {
      const lista = await listarMovimientosPorItem(itemId, { max: 10 });
      setMovCache((c) => ({ ...c, [itemId]: lista }));
    } catch (e) {
      console.error(e);
    } finally {
      setMovLoadingId("");
    }
  }, []);

  const toggleExpand = async (item) => {
    const next = expandedId === item.id ? "" : item.id;
    setExpandedId(next);
    if (next && !movCache[item.id]) await fetchMovimientos(item.id);
  };

  // Tras registrar un movimiento la tarjeta debe quedarse abierta mostrando el
  // movimiento recién hecho: antes se colapsaba y el operario perdía el contexto.
  const handleModalDone = async (itemId) => {
    setModal(null);
    setMovCache((c) => { const next = { ...c }; delete next[itemId]; return next; });
    await load();
    if (expandedId === itemId) await fetchMovimientos(itemId);
  };

  const chipBase = "shrink-0 px-3 py-1.5 rounded-full text-xs font-medium border transition";
  const chipOn = "bg-gray-900 text-white border-gray-900 dark:bg-trafico dark:text-negro dark:border-trafico";
  const chipOff = "bg-white text-gray-700 border-gray-300 dark:bg-gris-800 dark:text-gray-300 dark:border-gris-600";

  return (
    <div className="pt-4 pb-4">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <h1 className="text-lg font-semibold">Materia prima</h1>
          <div className="text-xs text-gray-500 dark:text-gray-400">
            {loading ? "Cargando…" : `${resumen.total} materiales · ${resumen.alerta} por reponer`}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {/* Escanear es la vía rápida: se apunta a la etiqueta del material y
              la app lo encuentra sin buscarlo en la lista. */}
          <button
            type="button"
            onClick={() => { setEscanerError(""); setEscanerAbierto(true); }}
            className="inline-flex items-center gap-2 h-10 px-3 rounded-lg bg-gray-900 dark:bg-trafico dark:text-negro text-white text-sm font-semibold"
          >
            <FaBarcode /> Escanear
          </button>
          <button
            type="button"
            onClick={() => setFormMaterial({ material: null })}
            className="inline-flex items-center gap-2 h-10 px-3 rounded-lg border border-gray-300 dark:border-gris-600 bg-white dark:bg-gris-800 text-gray-800 dark:text-gray-200 text-sm font-semibold"
          >
            <FaPlus className="text-xs" /> Nuevo
          </button>
          <button
            type="button"
            onClick={load}
            disabled={loading}
            aria-label="Actualizar inventario"
            className="h-10 w-10 inline-flex items-center justify-center rounded-lg border border-gray-300 dark:border-gris-600 bg-white dark:bg-gris-800 text-gray-700 dark:text-gray-200 disabled:opacity-50"
          >
            <FaSyncAlt className={loading ? "animate-spin" : ""} />
          </button>
        </div>
      </div>

      {/* Buscador y filtros fijos bajo el header: en una lista larga el operario
          no tiene que volver arriba para cambiar de filtro. */}
      <div className="sticky top-14 z-30 -mx-3 px-3 pt-3 pb-2 bg-gray-50 dark:bg-gris-900 space-y-2">
        <div className="relative">
          <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            type="search"
            inputMode="search"
            placeholder="Buscar por nombre, SKU, código o ubicación…"
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
          <button type="button" onClick={() => setFiltroEstado("todos")} className={`${chipBase} ${filtroEstado === "todos" ? chipOn : chipOff}`}>
            Todos {resumen.total > 0 && <span className="opacity-70">{resumen.total}</span>}
          </button>
          <button type="button" onClick={() => setFiltroEstado("alerta")} className={`${chipBase} ${filtroEstado === "alerta" ? chipOn : chipOff}`}>
            <FaExclamationTriangle className="inline text-[10px] mr-1 text-amber-500" />
            Por reponer <span className="opacity-70">{resumen.alerta}</span>
          </button>
          <button type="button" onClick={() => setFiltroEstado("agotado")} className={`${chipBase} ${filtroEstado === "agotado" ? chipOn : chipOff}`}>
            Agotados <span className="opacity-70">{resumen.agotados}</span>
          </button>
        </div>

        {categorias.length > 1 && (
          <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-3 px-3">
            <button type="button" onClick={() => setFiltroCategoria("")} className={`${chipBase} ${!filtroCategoria ? chipOn : chipOff}`}>
              Toda categoría
            </button>
            {categorias.map((c) => (
              <button key={c} type="button" onClick={() => setFiltroCategoria(filtroCategoria === c ? "" : c)} className={`${chipBase} ${filtroCategoria === c ? chipOn : chipOff}`}>
                {c}
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
      ) : filtrados.length === 0 ? (
        <EmptyState
          icon="📦"
          title="Sin materiales"
          description={search || filtroEstado !== "todos" || filtroCategoria ? "Ningún material coincide con el filtro." : "Todavía no hay materiales registrados."}
          action={(search || filtroEstado !== "todos" || filtroCategoria) ? (
            <button
              type="button"
              onClick={() => { setSearch(""); setFiltroEstado("todos"); setFiltroCategoria(""); }}
              className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gris-600 bg-white dark:bg-gris-800 text-xs font-medium"
            >
              Quitar filtros
            </button>
          ) : null}
        />
      ) : (
        <div className="space-y-2">
          {filtrados.map((item) => {
            const estadoKey = estadoDeStock(item);
            const estado = ESTADOS[estadoKey];
            const actual = Number(item.stockActual || 0);
            const minimo = Number(item.stockMinimo || 0);
            const pct = minimo > 0 ? Math.min(100, Math.round((actual / minimo) * 100)) : null;
            const falta = minimo > 0 && actual < minimo ? minimo - actual : 0;
            const expanded = expandedId === item.id;
            const provNames = (item.proveedorIds || [])
              .map((pid) => proveedorNameById[pid])
              .filter(Boolean);

            return (
              <div key={item.id} className="relative rounded-xl border border-gray-200 dark:border-gris-700 bg-white dark:bg-gris-800 overflow-hidden">
                <span className={`absolute inset-y-0 left-0 w-1.5 ${estado.strip}`} aria-hidden="true" />

                <div className="pl-1.5">
                  <div className="flex items-start gap-3 px-3 py-3">
                    {/* La foto es la forma más rápida de reconocer el material en planta. */}
                    {item.fotoDataUrl ? (
                      <button
                        type="button"
                        onClick={() => setFoto({ src: item.fotoDataUrl, nombre: item.nombre })}
                        aria-label={`Ver foto de ${item.nombre || "material"}`}
                        className="shrink-0"
                      >
                        <img
                          src={item.fotoDataUrl}
                          alt={item.nombre || "Material"}
                          loading="lazy"
                          className="h-14 w-14 rounded-lg object-cover border border-gray-200 dark:border-gris-600"
                        />
                      </button>
                    ) : (
                      <span className="h-14 w-14 shrink-0 rounded-lg bg-gray-100 dark:bg-gris-700 border border-gray-200 dark:border-gris-600 flex items-center justify-center text-gray-400">
                        <FaBoxOpen />
                      </span>
                    )}

                    <button
                      type="button"
                      onClick={() => toggleExpand(item)}
                      aria-expanded={expanded}
                      className="flex-1 min-w-0 flex items-start gap-3 text-left"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-[15px] leading-snug break-words">{item.nombre}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">
                          {item.categoria || "Sin categoría"}{item.sku ? ` · ${item.sku}` : ""}
                        </div>
                        {item.ubicacion && (
                          <div className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5 inline-flex items-center gap-1">
                            <FaMapMarkerAlt className="text-[10px] shrink-0" /> {item.ubicacion}
                          </div>
                        )}
                      </div>

                      <div className="text-right shrink-0 flex flex-col items-end gap-1">
                        <div className={`font-mono font-bold text-xl leading-none ${estado.valor}`}>
                          {fmtNum(actual)}
                        </div>
                        <div className="text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-wide">{item.unidad || "und"}</div>
                        <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${estado.chip}`}>{estado.label}</span>
                        {expanded ? <FaChevronUp className="text-gray-400 text-xs" /> : <FaChevronDown className="text-gray-400 text-xs" />}
                      </div>
                    </button>
                  </div>

                  {/* Barra contra el mínimo: dice de un vistazo cuánto margen queda. */}
                  {minimo > 0 && (
                    <div className="px-3 pb-2.5">
                      <div className="h-1.5 rounded-full bg-gray-200 dark:bg-gris-700 overflow-hidden">
                        <div className={`h-full rounded-full ${estado.barra}`} style={{ width: `${pct}%` }} />
                      </div>
                      <div className="flex justify-between text-[10px] text-gray-500 dark:text-gray-400 mt-1">
                        <span>Mínimo {fmtNum(minimo)} {item.unidad || ""}</span>
                        {falta > 0 && (
                          <span className="font-semibold text-amber-700 dark:text-amber-400">Faltan {fmtNum(falta)}</span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Entrada y salida siempre visibles: registrar el movimiento es
                      la acción principal y antes exigía desplegar la tarjeta. */}
                  <div className="flex gap-2 px-3 pb-3">
                    <button
                      type="button"
                      onClick={() => setModal({ item, tipo: "ingreso" })}
                      className="flex-1 inline-flex items-center justify-center gap-1.5 min-h-[44px] rounded-lg bg-green-600 hover:bg-green-500 active:scale-[0.98] transition text-white text-sm font-semibold"
                    >
                      <FaArrowDown className="text-xs" /> Entrada
                    </button>
                    <button
                      type="button"
                      onClick={() => setModal({ item, tipo: "salida" })}
                      disabled={actual <= 0}
                      className="flex-1 inline-flex items-center justify-center gap-1.5 min-h-[44px] rounded-lg bg-red-600 hover:bg-red-500 active:scale-[0.98] transition text-white text-sm font-semibold disabled:opacity-40 disabled:active:scale-100"
                    >
                      <FaArrowUp className="text-xs" /> Salida
                    </button>
                  </div>

                  {expanded && (
                    <div className="px-3 pb-3 border-t border-gray-100 dark:border-gris-700/60 pt-3 space-y-3">
                      {provNames.length > 0 && (
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          <span className="font-semibold text-gray-600 dark:text-gray-300">Proveedores:</span> {provNames.join(", ")}
                        </div>
                      )}

                      <div className="flex items-center justify-between gap-2">
                        {item.codigoBarras ? (
                          <span className="text-xs text-gray-500 dark:text-gray-400 inline-flex items-center gap-1.5">
                            <FaBarcode className="text-[10px] shrink-0" />
                            <span className="font-mono">{item.codigoBarras}</span>
                          </span>
                        ) : <span />}
                        <button
                          type="button"
                          onClick={() => setFormMaterial({ material: item })}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gris-600 bg-white dark:bg-gris-800 text-xs font-medium shrink-0"
                        >
                          <FaPen className="text-[10px]" /> Editar material
                        </button>
                      </div>

                      <div>
                        <div className="text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide inline-flex items-center gap-1.5">
                          <FaHistory className="text-[10px]" /> Últimos movimientos
                        </div>
                        {movLoadingId === item.id ? (
                          <div className="text-xs opacity-60 py-2">Cargando…</div>
                        ) : !movCache[item.id] || movCache[item.id].length === 0 ? (
                          <div className="text-xs opacity-60 py-2">Sin movimientos registrados</div>
                        ) : (
                          <div className="mt-2 space-y-1.5">
                            {movCache[item.id].map((m) => {
                              const esSalida = m.tipo === "salida";
                              return (
                                <div key={m.id} className="flex items-start gap-2.5 text-xs bg-gray-50 dark:bg-gris-700/50 rounded-lg px-2.5 py-2">
                                  <span
                                    className={`mt-0.5 h-6 w-6 shrink-0 rounded-full flex items-center justify-center ${
                                      esSalida
                                        ? "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400"
                                        : "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-400"
                                    }`}
                                    aria-hidden="true"
                                  >
                                    {esSalida ? <FaArrowUp className="text-[10px]" /> : <FaArrowDown className="text-[10px]" />}
                                  </span>
                                  <div className="min-w-0 flex-1">
                                    <div className="flex items-baseline gap-1.5 flex-wrap">
                                      <span className={`font-semibold ${esSalida ? "text-red-700 dark:text-red-400" : "text-green-700 dark:text-green-400"}`}>
                                        {esSalida ? "−" : "+"}{fmtNum(m.cantidad)} {item.unidad || ""}
                                      </span>
                                      {typeof m.stockDespues === "number" && (
                                        <span className="text-gray-500 dark:text-gray-400 font-mono text-[11px]">
                                          → {fmtNum(m.stockDespues)}
                                        </span>
                                      )}
                                    </div>
                                    <div className="text-gray-500 dark:text-gray-400 truncate">
                                      {!esSalida && m.proveedorId ? (proveedorNameById[m.proveedorId] || "Proveedor —") : null}
                                      {esSalida && m.ordenProduccion ? (m.codigoFicha || `OP #${m.ordenProduccion}`) : null}
                                    </div>
                                    {!esSalida && m.facturaNumero && (
                                      <div className="text-gray-400 inline-flex items-center gap-1 truncate">
                                        <FaFileInvoice className="text-[9px] shrink-0" />
                                        <span className="font-mono">{m.facturaNumero}</span>
                                        {m.facturaItem && <span className="truncate">· {m.facturaItem}</span>}
                                      </div>
                                    )}
                                    {m.nota && <div className="text-gray-400 break-words">{m.nota}</div>}
                                  </div>
                                  <div className="text-gray-400 shrink-0 text-[11px] text-right">{fmtFechaMov(m.createdAt)}</div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {escanerAbierto && (
        <EscanerCodigoModal
          titulo="Escanear material"
          descripcion="Apunta a la etiqueta del material para registrar una entrada o una salida."
          error={escanerError}
          ocupado={buscandoCodigo}
          onDetect={manejarCodigo}
          onClose={() => { setEscanerAbierto(false); setEscanerError(""); }}
        />
      )}

      {/* Leído el código, falta lo único que el lector no puede saber: si el
          material entra o sale. Se pregunta con el material ya en pantalla para
          que el operario confirme de un vistazo que es el correcto. */}
      {escaneado && (
        <div className="fixed inset-0 z-[1100]">
          <div className="absolute inset-0 bg-black/50" onClick={() => setEscaneado(null)} />
          <div className="absolute inset-x-0 bottom-0 sm:inset-0 sm:flex sm:items-center sm:justify-center">
            <div className="w-full sm:max-w-sm bg-white dark:bg-gris-800 rounded-t-2xl sm:rounded-2xl border border-gray-200 dark:border-gris-700 shadow-xl">
              <div className="p-4 border-b border-gray-200 dark:border-gris-700 flex items-start gap-3">
                {escaneado.item.fotoDataUrl ? (
                  <img
                    src={escaneado.item.fotoDataUrl}
                    alt={escaneado.item.nombre || "Material"}
                    className="h-14 w-14 rounded-lg object-cover border border-gray-200 dark:border-gris-600 shrink-0"
                  />
                ) : (
                  <span className="h-14 w-14 shrink-0 rounded-lg bg-gray-100 dark:bg-gris-700 border border-gray-200 dark:border-gris-600 flex items-center justify-center text-gray-400">
                    <FaBoxOpen />
                  </span>
                )}
                <div className="min-w-0 flex-1">
                  <div className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 uppercase tracking-wide">
                    Material identificado
                  </div>
                  <div className="font-semibold text-[15px] leading-snug break-words">{escaneado.item.nombre}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 font-mono mt-0.5">{escaneado.codigo}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    Stock: {fmtNum(escaneado.item.stockActual)} {escaneado.item.unidad || "und"}
                    {escaneado.item.ubicacion ? ` · ${escaneado.item.ubicacion}` : ""}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setEscaneado(null)}
                  aria-label="Cerrar"
                  className="h-8 w-8 shrink-0 rounded border border-gray-300 dark:border-gris-600 bg-gray-50 dark:bg-gris-700 flex items-center justify-center"
                >
                  <FaTimes className="text-sm" />
                </button>
              </div>

              <div className="p-4 flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setModal({ item: escaneado.item, tipo: "ingreso", codigoLeido: escaneado.codigo });
                    setEscaneado(null);
                  }}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 min-h-[48px] rounded-lg bg-green-600 hover:bg-green-500 active:scale-[0.98] transition text-white text-sm font-semibold"
                >
                  <FaArrowDown className="text-xs" /> Entrada
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setModal({ item: escaneado.item, tipo: "salida", codigoLeido: escaneado.codigo });
                    setEscaneado(null);
                  }}
                  disabled={Number(escaneado.item.stockActual || 0) <= 0}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 min-h-[48px] rounded-lg bg-red-600 hover:bg-red-500 active:scale-[0.98] transition text-white text-sm font-semibold disabled:opacity-40 disabled:active:scale-100"
                >
                  <FaArrowUp className="text-xs" /> Salida
                </button>
              </div>
              <div className="px-4 pb-4">
                <button
                  type="button"
                  onClick={() => { setEscaneado(null); setEscanerError(""); setEscanerAbierto(true); }}
                  className="w-full min-h-[44px] rounded-lg border border-gray-300 dark:border-gris-600 bg-gray-50 dark:bg-gris-700 text-sm font-medium"
                >
                  No es este — escanear otro
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {modal && (
        <MovimientoModal
          item={modal.item}
          tipo={modal.tipo}
          codigoLeido={modal.codigoLeido}
          onClose={() => setModal(null)}
          onDone={() => handleModalDone(modal.item.id)}
        />
      )}

      {formMaterial && (
        <MaterialFormModal
          material={formMaterial.material}
          categorias={categorias}
          onClose={() => setFormMaterial(null)}
          onDone={async () => { setFormMaterial(null); await load(); }}
        />
      )}

      {foto && (
        <div className="fixed inset-0 z-[1100] bg-black/80 flex items-center justify-center p-4" onClick={() => setFoto(null)}>
          <button
            type="button"
            onClick={() => setFoto(null)}
            aria-label="Cerrar foto"
            className="absolute top-4 right-4 h-10 w-10 rounded-full bg-white/10 text-white flex items-center justify-center"
          >
            <FaTimes />
          </button>
          <figure className="max-w-full" onClick={(e) => e.stopPropagation()}>
            <img src={foto.src} alt={foto.nombre || "Material"} className="max-h-[75vh] max-w-full rounded-lg object-contain" />
            <figcaption className="text-center text-white text-sm mt-3">{foto.nombre}</figcaption>
          </figure>
        </div>
      )}
    </div>
  );
}
