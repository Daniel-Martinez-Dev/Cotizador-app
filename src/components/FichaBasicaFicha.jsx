import React from "react";
import toast from "react-hot-toast";
import { FaEdit, FaTrash, FaPlus, FaTimes } from "react-icons/fa";
import {
  crearFichaGeneral,
  listarFichasGenerales,
  actualizarFichaGeneral,
  eliminarFichaGeneral,
} from "../utils/firebaseGeneral";
import { construirFichaGeneral, totalUnidades } from "../modules/produccion/general/normalizar";
import FichaImpresionGeneral from "./FichaImpresionGeneral";
import { fmtDate } from "../utils/fichaFormat";
import EstadoBadge from "./fichas/EstadoBadge";
import EstadoControl from "./fichas/EstadoControl";
import useEstadoFicha from "./fichas/useEstadoFicha";
import IdentificacionFicha from "./fichas/IdentificacionFicha";
import Combobox from "./ui/Combobox";
import { useQuote } from "../context/QuoteContext";
import { codigoFicha as codigoDeFicha } from "../utils/codigoFicha";
import {
  CATEGORIAS_GENERAL,
  UNIDADES_GENERAL,
  UNIDAD_POR_DEFECTO,
} from "../modules/produccion/general/catalogos";

// Ficha básica — orden de producción/despacho para lo que no tiene ficha de
// fabricación: repuestos y productos que salen tal cual de bodega (semáforos,
// lámparas, topes, rampas…). Igual que las fichas de producto, toma número del
// consecutivo global, tiene estados y se imprime; lo que cambia es que en vez
// de medidas y consumo lleva una lista libre de ítems a alistar.

const hoy = () => new Date().toISOString().slice(0, 10);

const inputCls = "mt-1 w-full px-3 py-2 rounded border border-gray-300 dark:border-gris-600 bg-white dark:bg-gris-700 text-sm";
const inputPlanoCls = "px-2 py-1.5 rounded border border-gray-300 dark:border-gris-600 bg-white dark:bg-gris-700 text-sm";
const labelCls = "text-xs text-gray-600 dark:text-gray-300";
const sectionTitleCls = "text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2";

const itemVacio = () => ({
  descripcion: "", categoria: "", referencia: "",
  cantidad: 1, unidad: UNIDAD_POR_DEFECTO, observaciones: "",
});

const INITIAL_FORM = {
  codigoFicha:       "", // solo lectura: lo asigna el sistema al guardar
  numeroOrdenCompra: "",
  cliente:           "",
  responsable:       "",
  fechaOrden:        hoy(),
  fechaEntrega:      "",
  observaciones:     "",
  items:             [itemVacio()],
};

const CATEGORIA_OPCIONES = CATEGORIAS_GENERAL.map((c) => ({ id: c, label: c }));

export default function FichaBasicaFicha() {
  const { confirm } = useQuote();
  const [form, setForm]             = React.useState(INITIAL_FORM);
  const [fichas, setFichas]         = React.useState([]);
  const [loading, setLoading]       = React.useState(false);
  const [saving, setSaving]         = React.useState(false);
  const [selectedId, setSelectedId] = React.useState(null);
  const [printFicha, setPrintFicha] = React.useState(null);
  const [editingId, setEditingId]   = React.useState(null);
  const formRef = React.useRef(null);

  const { cambiarEstado, agregarNota, editarEntrega, entregaModal } = useEstadoFicha("general", fichas, setFichas);

  const loadFichas = React.useCallback(async () => {
    setLoading(true);
    try {
      setFichas(await listarFichasGenerales());
    } catch (e) {
      console.error(e);
      toast.error("Error cargando fichas básicas");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => { loadFichas(); }, [loadFichas]);

  // ── Handlers de formulario ────────────────────────────────────────────────

  const set = (field) => (e) => setForm((p) => ({ ...p, [field]: e.target.value }));

  const setItem = (idx, campo, valor) =>
    setForm((p) => ({
      ...p,
      items: p.items.map((it, i) => (i === idx ? { ...it, [campo]: valor } : it)),
    }));

  const agregarItem = () => setForm((p) => ({ ...p, items: [...p.items, itemVacio()] }));

  // Nunca se queda sin filas: quitar la última deja una en blanco lista para escribir.
  const quitarItem = (idx) =>
    setForm((p) => {
      const items = p.items.filter((_, i) => i !== idx);
      return { ...p, items: items.length ? items : [itemVacio()] };
    });

  const itemsConDescripcion = form.items.filter((it) => (it.descripcion || "").trim());
  const totalForm = totalUnidades(form.items);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.cliente.trim()) return toast.error("El cliente es requerido");
    if (itemsConDescripcion.length === 0)
      return toast.error("Agrega al menos un ítem con descripción");
    if (itemsConDescripcion.some((it) => Number(it.cantidad) <= 0))
      return toast.error("Todos los ítems deben tener cantidad mayor a 0");

    setSaving(true);
    try {
      if (editingId) {
        await actualizarFichaGeneral(editingId, construirFichaGeneral(form));
        toast.success("Ficha actualizada");
        setEditingId(null);
      } else {
        await crearFichaGeneral(form);
        toast.success("Ficha básica guardada");
      }
      setForm(INITIAL_FORM);
      await loadFichas();
    } catch (err) {
      console.error(err);
      toast.error(editingId ? "Error actualizando ficha" : "Error guardando ficha");
    } finally {
      setSaving(false);
    }
  };

  const handleEditar = (f) => {
    setForm({
      codigoFicha:       codigoDeFicha(f, "general"),
      numeroOrdenCompra: f.numeroOrdenCompra || "",
      cliente:           f.cliente || "",
      responsable:       f.responsable || "",
      fechaOrden:        f.fechaOrden || hoy(),
      fechaEntrega:      f.fechaEntrega || "",
      observaciones:     f.observaciones || "",
      items:             Array.isArray(f.items) && f.items.length ? f.items.map((it) => ({ ...it })) : [itemVacio()],
    });
    setEditingId(f.id);
    setSelectedId(null);
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const cancelarEdicion = () => {
    setEditingId(null);
    setForm(INITIAL_FORM);
  };

  const handleEliminar = async (f) => {
    const ok = await confirm(`¿Eliminar la ficha básica de ${f.cliente || "este cliente"}? Esta acción no se puede deshacer.`);
    if (!ok) return;
    try {
      await eliminarFichaGeneral(f.id);
      setFichas((prev) => prev.filter((x) => x.id !== f.id));
      if (selectedId === f.id) setSelectedId(null);
      if (editingId === f.id) cancelarEdicion();
      toast.success("Ficha eliminada");
    } catch (err) {
      console.error(err);
      toast.error("Error eliminando ficha");
    }
  };

  return (
    <div className="space-y-5">
      <section ref={formRef} className="bg-white dark:bg-gris-800 border border-gray-200 dark:border-gris-700 rounded-lg p-4">
        <div className="flex items-center justify-between mb-1">
          <div className="font-medium text-sm">
            {editingId ? "Editar ficha básica" : "Nueva ficha básica"}
          </div>
          {editingId && (
            <button type="button" onClick={cancelarEdicion}
              className="inline-flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
              <FaTimes className="text-[11px]" /> Cancelar edición
            </button>
          )}
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
          Para órdenes que pasan a producción sin ficha de fabricación: repuestos,
          semáforos, lámparas, topes, rampas y demás productos que se despachan tal cual.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <IdentificacionFicha
            codigo={form.codigoFicha}
            ordenCompra={form.numeroOrdenCompra}
            onOrdenCompraChange={set("numeroOrdenCompra")}
            inputCls={inputCls}
            labelCls={labelCls}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="sm:col-span-2">
              <label className={labelCls}>Cliente</label>
              <input value={form.cliente} onChange={set("cliente")}
                className={inputCls} placeholder="Nombre del cliente" />
            </div>
            <div>
              <label className={labelCls}>Fecha orden</label>
              <input type="date" value={form.fechaOrden} onChange={set("fechaOrden")} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Fecha entrega</label>
              <input type="date" value={form.fechaEntrega} onChange={set("fechaEntrega")} className={inputCls} />
            </div>
            <div className="sm:col-span-2">
              <label className={labelCls}>Responsable / auxiliar encargado</label>
              <input value={form.responsable} onChange={set("responsable")}
                className={inputCls} placeholder="TODOS" />
            </div>
          </div>

          {/* ── Ítems de la orden ── */}
          <div className="border-t border-gray-200 dark:border-gris-700 pt-4">
            <div className="flex items-center justify-between mb-2">
              <div className={`${sectionTitleCls} mb-0`}>Ítems a alistar</div>
              <div className="text-xs text-gray-500 dark:text-gray-400">
                {itemsConDescripcion.length} ítem(s) · {totalForm} unidad(es)
              </div>
            </div>

            {/* Encabezado de columnas — solo en escritorio; en móvil cada campo
                lleva su propia etiqueta porque las filas se apilan. */}
            <div className="hidden md:grid grid-cols-12 gap-2 px-2 pb-1 text-[11px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
              <div className="col-span-4">Descripción</div>
              <div className="col-span-2">Categoría</div>
              <div className="col-span-2">Referencia</div>
              <div className="col-span-1">Cant.</div>
              <div className="col-span-1">Unidad</div>
              <div className="col-span-1">Notas</div>
              <div className="col-span-1" />
            </div>

            <div className="space-y-2">
              {form.items.map((it, idx) => (
                <div key={idx}
                  className="grid grid-cols-12 gap-2 items-start rounded-lg border border-gray-200 dark:border-gris-700 p-2">
                  <div className="col-span-12 md:col-span-4">
                    <label className={`${labelCls} md:sr-only`}>Descripción</label>
                    <input
                      value={it.descripcion}
                      onChange={(e) => setItem(idx, "descripcion", e.target.value)}
                      className={`${inputPlanoCls} w-full`}
                      placeholder="Descripción del ítem"
                    />
                  </div>
                  <div className="col-span-6 md:col-span-2">
                    <label className={`${labelCls} md:sr-only`}>Categoría</label>
                    <Combobox
                      value={it.categoria}
                      onChange={(v) => setItem(idx, "categoria", v)}
                      options={CATEGORIA_OPCIONES}
                      inputClassName={inputPlanoCls}
                      placeholder="Categoría"
                    />
                  </div>
                  <div className="col-span-6 md:col-span-2">
                    <label className={`${labelCls} md:sr-only`}>Referencia</label>
                    <input
                      value={it.referencia}
                      onChange={(e) => setItem(idx, "referencia", e.target.value)}
                      className={`${inputPlanoCls} w-full`}
                      placeholder="Referencia"
                    />
                  </div>
                  <div className="col-span-4 md:col-span-1">
                    <label className={`${labelCls} md:sr-only`}>Cant.</label>
                    <input
                      type="number" min={0} step="any"
                      value={it.cantidad}
                      onChange={(e) => setItem(idx, "cantidad", e.target.value)}
                      className={`${inputPlanoCls} w-full`}
                    />
                  </div>
                  <div className="col-span-4 md:col-span-1">
                    <label className={`${labelCls} md:sr-only`}>Unidad</label>
                    <select
                      value={it.unidad}
                      onChange={(e) => setItem(idx, "unidad", e.target.value)}
                      className={`${inputPlanoCls} w-full`}
                    >
                      {UNIDADES_GENERAL.map((u) => <option key={u} value={u}>{u}</option>)}
                    </select>
                  </div>
                  {/* En móvil el botón de quitar cierra la fila de cantidad/unidad;
                      en escritorio se va al final con order-last. */}
                  <div className="col-span-4 md:col-span-1 md:order-last flex items-end md:justify-end h-full pb-0.5">
                    <button
                      type="button"
                      onClick={() => quitarItem(idx)}
                      title="Quitar ítem"
                      aria-label="Quitar ítem"
                      className="inline-flex items-center justify-center h-8 w-8 rounded bg-red-50 hover:bg-red-100 dark:bg-red-900/30 dark:hover:bg-red-900/50 text-red-600 dark:text-red-300 border border-red-200 dark:border-red-800"
                    >
                      <FaTrash className="text-[11px]" />
                    </button>
                  </div>
                  <div className="col-span-12 md:col-span-1">
                    <label className={`${labelCls} md:sr-only`}>Notas</label>
                    <input
                      value={it.observaciones}
                      onChange={(e) => setItem(idx, "observaciones", e.target.value)}
                      className={`${inputPlanoCls} w-full`}
                      placeholder="Notas"
                    />
                  </div>
                </div>
              ))}
            </div>

            <button type="button" onClick={agregarItem}
              className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-dashed border-gray-300 dark:border-gris-600 text-xs font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gris-700">
              <FaPlus className="text-[10px]" /> Agregar ítem
            </button>
          </div>

          <div>
            <label className={labelCls}>Observaciones de la orden</label>
            <textarea value={form.observaciones} onChange={set("observaciones")}
              className={inputCls} rows={3}
              placeholder="Indicaciones de alistamiento, empaque, transporte…" />
          </div>

          <div className="flex justify-end gap-2">
            {editingId && (
              <button type="button" onClick={cancelarEdicion}
                className="px-4 py-2 rounded border border-gray-300 dark:border-gris-600 text-sm">
                Cancelar
              </button>
            )}
            <button type="submit" disabled={saving}
              className="px-4 py-2 rounded bg-green-600 hover:bg-green-500 disabled:opacity-60 text-white text-sm font-medium">
              {saving ? "Guardando…" : editingId ? "Guardar cambios" : "Crear ficha básica"}
            </button>
          </div>
        </form>
      </section>

      {/* ── Fichas guardadas ── */}
      <section className="bg-white dark:bg-gris-800 border border-gray-200 dark:border-gris-700 rounded-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="font-medium text-sm">Fichas básicas guardadas</div>
          <button onClick={loadFichas} className="text-xs text-blue-600 dark:text-blue-400 hover:underline">
            Actualizar
          </button>
        </div>

        {loading ? (
          <div className="text-sm opacity-60">Cargando…</div>
        ) : fichas.length === 0 ? (
          <div className="text-sm opacity-60">Sin fichas básicas guardadas</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gris-700 text-gray-500">
                  <th className="text-left py-2 font-medium whitespace-nowrap">N.° ficha</th>
                  <th className="text-left py-2 font-medium">Cliente</th>
                  <th className="text-left py-2 font-medium">Ítems</th>
                  <th className="text-center py-2 font-medium">Unidades</th>
                  <th className="text-left py-2 font-medium whitespace-nowrap">Entrega</th>
                  <th className="text-center py-2 font-medium">Estado</th>
                  <th className="py-2"></th>
                </tr>
              </thead>
              <tbody>
                {fichas.map((f) => {
                  const items = Array.isArray(f.items) ? f.items : [];
                  return (
                    <React.Fragment key={f.id}>
                      <tr
                        onClick={() => setSelectedId(selectedId === f.id ? null : f.id)}
                        className="border-b border-gray-100 dark:border-gris-700/50 cursor-pointer hover:bg-gray-50 dark:hover:bg-gris-700/40 transition-colors"
                      >
                        <td className="py-2 font-mono text-gray-500 whitespace-nowrap">
                          {codigoDeFicha(f, "general") || f.ordenProduccion}
                        </td>
                        <td className="py-2 font-medium">{f.cliente || "—"}</td>
                        <td className="py-2 text-gray-600 dark:text-gray-300 max-w-[22rem] truncate">
                          {items.map((it) => it.descripcion).join(", ") || "—"}
                        </td>
                        <td className="py-2 text-center">{f.cantidad ?? 0}</td>
                        <td className="py-2 text-gray-500 whitespace-nowrap">{fmtDate(f.fechaEntrega)}</td>
                        <td className="py-2 text-center">
                          <EstadoBadge estado={f.estado} onChange={(estado) => cambiarEstado(f.id, estado)} />
                        </td>
                        <td className="py-2 pl-2">
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={(e) => { e.stopPropagation(); setPrintFicha(f); }}
                              className="px-2 py-1 text-xs rounded bg-gray-100 hover:bg-gray-200 dark:bg-gris-700 dark:hover:bg-gris-600 border border-gray-300 dark:border-gris-600 whitespace-nowrap"
                            >
                              Ver ficha
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); handleEditar(f); }}
                              title="Editar ficha"
                              className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/30 dark:hover:bg-blue-900/50 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800"
                            >
                              <FaEdit className="text-[11px]" />
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); handleEliminar(f); }}
                              title="Eliminar ficha"
                              className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded bg-red-50 hover:bg-red-100 dark:bg-red-900/30 dark:hover:bg-red-900/50 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800"
                            >
                              <FaTrash className="text-[11px]" />
                            </button>
                          </div>
                        </td>
                      </tr>

                      {selectedId === f.id && (
                        <tr className="border-b border-gray-200 dark:border-gris-700">
                          <td colSpan={7} className="py-3 px-2">
                            <FichaBasicaDetalle
                              ficha={f}
                              onCambiarEstado={cambiarEstado}
                              onAgregarNota={agregarNota}
                              onEditarEntrega={editarEntrega}
                              onVerFicha={() => setPrintFicha(f)}
                              onEditar={() => handleEditar(f)}
                              onEliminar={() => handleEliminar(f)}
                            />
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {printFicha && (
        <FichaImpresionGeneral
          ficha={printFicha}
          numero={printFicha.ordenProduccion}
          onClose={() => setPrintFicha(null)}
        />
      )}

      {entregaModal}
    </div>
  );
}

// ─── Detalle expandido inline ─────────────────────────────────────────────────
function FichaBasicaDetalle({ ficha: f, onCambiarEstado, onAgregarNota, onEditarEntrega, onVerFicha, onEditar, onEliminar }) {
  const items = Array.isArray(f.items) ? f.items : [];

  return (
    <div className="bg-gray-50 dark:bg-gris-700/60 rounded-xl p-4 space-y-4 text-xs border border-gray-200 dark:border-gris-600">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <span className="font-semibold text-sm text-gray-800 dark:text-gray-100">
            {f.cliente || "Sin cliente"}
          </span>
          <span className="ml-2 text-gray-400">
            OC {f.numeroOrdenCompra || "—"} · orden {fmtDate(f.fechaOrden)} · entrega {fmtDate(f.fechaEntrega)}
            {f.responsable ? ` · ${f.responsable}` : ""}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={onVerFicha}
            className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium">
            Ver ficha
          </button>
          <button onClick={onEditar}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 dark:bg-gris-700 dark:hover:bg-gris-600 border border-gray-300 dark:border-gris-600 text-xs font-medium">
            <FaEdit className="text-[11px]" /> Editar
          </button>
          <button onClick={onEliminar}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-50 hover:bg-red-100 dark:bg-red-900/30 dark:hover:bg-red-900/50 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800 text-xs font-medium">
            <FaTrash className="text-[11px]" /> Eliminar
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-xs bg-white dark:bg-gris-800 rounded-lg overflow-hidden">
          <thead>
            <tr className="text-gray-500 border-b border-gray-200 dark:border-gris-700">
              <th className="text-left py-1.5 px-2 font-medium">Descripción</th>
              <th className="text-left py-1.5 px-2 font-medium">Categoría</th>
              <th className="text-left py-1.5 px-2 font-medium">Referencia</th>
              <th className="text-center py-1.5 px-2 font-medium">Cant.</th>
              <th className="text-left py-1.5 px-2 font-medium">Notas</th>
            </tr>
          </thead>
          <tbody>
            {items.map((it, i) => (
              <tr key={`${it.descripcion}-${i}`} className="border-b border-gray-100 dark:border-gris-700/50 last:border-b-0">
                <td className="py-1.5 px-2 font-medium">{it.descripcion}</td>
                <td className="py-1.5 px-2 text-gray-500">{it.categoria || "—"}</td>
                <td className="py-1.5 px-2 font-mono text-gray-500">{it.referencia || "—"}</td>
                <td className="py-1.5 px-2 text-center font-mono">{it.cantidad} {it.unidad}</td>
                <td className="py-1.5 px-2 text-gray-500">{it.observaciones || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {f.observaciones && (
        <div className="bg-white dark:bg-gris-800 border border-gray-200 dark:border-gris-600 rounded-lg p-3">
          <div className="text-[10px] uppercase tracking-wide text-gray-400 font-semibold mb-1">Observaciones</div>
          <div className="whitespace-pre-wrap text-gray-700 dark:text-gray-200">{f.observaciones}</div>
        </div>
      )}

      <EstadoControl
        estado={f.estado}
        notas={f.notas}
        entrega={f.entrega}
        onCambiarEstado={(estado, nota) => onCambiarEstado(f.id, estado, nota)}
        onAgregarNota={(texto) => onAgregarNota(f.id, texto)}
        onEditarEntrega={() => onEditarEntrega(f.id)}
      />
    </div>
  );
}
