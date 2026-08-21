import React from "react";
import toast from "react-hot-toast";
import { FaTimes, FaBoxOpen, FaPlus, FaBarcode } from "react-icons/fa";
import {
  crearItemInventario,
  actualizarItemInventario,
  listarProveedores,
} from "../../utils/firebaseInventory";
import { PRODUCTOS_ACTIVOS } from "../../data/catalogoProductos";
import ProveedorFormModal from "./ProveedorFormModal";

// Alta y edición de un material desde la tablet del almacén.
//
// Es la ficha completa del material salvo una cosa: el costo. El almacenista
// define qué es, en qué unidad se mide, dónde vive, cuándo hay que reponerlo,
// a qué productos alimenta y quién se lo vende — pero el valor de la materia
// prima no se administra desde aquí (el precio se registra al recibir una
// factura, ver MovimientoModal).
//
// El SKU y el código de barras no se escriben: los asigna el sistema al crear
// el material (ver utils/codigoMaterial.js) y aquí solo se muestran para poder
// imprimir la etiqueta.

const PRODUCTOS = [...PRODUCTOS_ACTIVOS, "Productos Personalizados", "Repuestos"];

const UNIDADES = ["und", "m", "m2", "ml", "kg", "g", "lt", "rollo", "lámina", "par", "juego"];

const inputCls = "mt-1 w-full px-3 py-2.5 rounded-lg border border-gray-300 dark:border-gris-600 bg-white dark:bg-gris-900 text-sm";
const labelCls = "text-xs text-gray-600 dark:text-gray-300";

const vacio = {
  nombre: "", categoria: "", unidad: "", ubicacion: "",
  stockActual: "", stockMinimo: "", productoTipos: [], proveedorIds: [],
};

export default function MaterialFormModal({ material, categorias = [], onClose, onDone }) {
  const editando = Boolean(material?.id);
  const [form, setForm] = React.useState(() => (
    material
      ? {
          nombre: material.nombre || "",
          categoria: material.categoria || "",
          unidad: material.unidad || "",
          ubicacion: material.ubicacion || "",
          stockActual: String(material.stockActual ?? ""),
          stockMinimo: String(material.stockMinimo ?? ""),
          productoTipos: Array.isArray(material.productoTipos) ? material.productoTipos.filter(Boolean) : [],
          proveedorIds: Array.isArray(material.proveedorIds) ? material.proveedorIds.filter(Boolean) : [],
        }
      : vacio
  ));
  const [proveedores, setProveedores] = React.useState([]);
  const [nuevoProveedor, setNuevoProveedor] = React.useState(false);
  const [saving, setSaving] = React.useState(false);

  const set = (campo, valor) => setForm((p) => ({ ...p, [campo]: valor }));

  const cargarProveedores = React.useCallback(async () => {
    try {
      setProveedores(await listarProveedores());
    } catch (e) {
      console.error(e);
      toast.error("No se pudieron cargar los proveedores");
    }
  }, []);

  React.useEffect(() => { cargarProveedores(); }, [cargarProveedores]);

  const alternar = (campo, valor) => setForm((p) => {
    const actual = p[campo];
    return {
      ...p,
      [campo]: actual.includes(valor) ? actual.filter((v) => v !== valor) : [...actual, valor],
    };
  });

  const guardar = async (e) => {
    e.preventDefault();
    const nombre = form.nombre.trim();
    if (!nombre) return toast.error("Escribe el nombre del material");
    const stockMinimo = Number(form.stockMinimo || 0);
    if (Number.isNaN(stockMinimo) || stockMinimo < 0) return toast.error("Stock mínimo inválido");
    const stockActual = Number(form.stockActual || 0);
    if (!editando && (Number.isNaN(stockActual) || stockActual < 0)) return toast.error("Stock inicial inválido");

    setSaving(true);
    try {
      const datos = {
        nombre,
        categoria: form.categoria.trim(),
        unidad: form.unidad.trim(),
        ubicacion: form.ubicacion.trim(),
        stockMinimo,
        productoTipos: form.productoTipos,
        proveedorIds: form.proveedorIds,
      };

      if (editando) {
        // El stock no se edita a mano: se mueve con entradas y salidas, que son
        // las que dejan rastro de quién lo hizo y contra qué orden.
        await actualizarItemInventario(material.id, datos);
        toast.success("Material actualizado");
      } else {
        await crearItemInventario({ ...datos, stockActual });
        toast.success("Material creado");
      }
      onDone?.();
    } catch (err) {
      console.error(err);
      toast.error(err?.message || "No se pudo guardar el material");
    } finally {
      setSaving(false);
    }
  };

  const chip = (activo) => `px-2.5 py-1.5 rounded-full text-xs border transition ${
    activo
      ? "bg-gray-900 text-white border-gray-900 dark:bg-trafico dark:text-negro dark:border-trafico"
      : "bg-white text-gray-700 border-gray-300 dark:bg-gris-800 dark:text-gray-300 dark:border-gris-600"
  }`;

  return (
    <div className="fixed inset-0 z-[1000]">
      <div className="absolute inset-0 bg-black/50" onClick={saving ? undefined : onClose} />
      <div className="absolute inset-x-0 bottom-0 sm:inset-0 sm:flex sm:items-center sm:justify-center sm:p-4">
        <div className="w-full sm:max-w-lg bg-white dark:bg-gris-800 rounded-t-2xl sm:rounded-2xl border border-gray-200 dark:border-gris-700 shadow-xl max-h-[90vh] overflow-hidden flex flex-col">
          <div className="p-4 border-b border-gray-200 dark:border-gris-700 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="text-sm font-semibold inline-flex items-center gap-2">
                <FaBoxOpen className="text-gray-400" /> {editando ? "Editar material" : "Nuevo material"}
              </div>
              {editando && (material.sku || material.codigoBarras) && (
                <div className="text-[11px] text-gray-500 dark:text-gray-400 font-mono inline-flex items-center gap-1.5 mt-0.5">
                  <FaBarcode className="text-[10px]" /> {material.sku || material.codigoBarras}
                </div>
              )}
            </div>
            <button type="button" onClick={onClose} disabled={saving}
              className="h-8 w-8 shrink-0 rounded border border-gray-300 dark:border-gris-600 bg-gray-50 dark:bg-gris-700 flex items-center justify-center disabled:opacity-40">
              <FaTimes className="text-sm" />
            </button>
          </div>

          <form id="material-form" onSubmit={guardar} className="p-4 overflow-y-auto flex-1 space-y-4">
            <div>
              <label className={labelCls}>Nombre *</label>
              <input value={form.nombre} onChange={(e) => set("nombre", e.target.value)} autoFocus className={inputCls} />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Categoría</label>
                <input
                  value={form.categoria}
                  onChange={(e) => set("categoria", e.target.value)}
                  list="almacen-categorias"
                  placeholder="Lona, herrajes…"
                  className={inputCls}
                />
                <datalist id="almacen-categorias">
                  {categorias.map((c) => <option key={c} value={c} />)}
                </datalist>
              </div>
              <div>
                <label className={labelCls}>Unidad</label>
                <input
                  value={form.unidad}
                  onChange={(e) => set("unidad", e.target.value)}
                  list="almacen-unidades"
                  placeholder="und, m2, kg…"
                  className={inputCls}
                />
                <datalist id="almacen-unidades">
                  {UNIDADES.map((u) => <option key={u} value={u} />)}
                </datalist>
              </div>
              <div>
                <label className={labelCls}>Ubicación</label>
                <input
                  value={form.ubicacion}
                  onChange={(e) => set("ubicacion", e.target.value)}
                  placeholder="Estante A-3"
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>Stock mínimo</label>
                <input
                  type="number" min={0} step="any" inputMode="decimal"
                  value={form.stockMinimo}
                  onChange={(e) => set("stockMinimo", e.target.value)}
                  placeholder="0"
                  className={inputCls}
                />
              </div>
            </div>

            {!editando && (
              <div>
                <label className={labelCls}>Stock inicial</label>
                <input
                  type="number" min={0} step="any" inputMode="decimal"
                  value={form.stockActual}
                  onChange={(e) => set("stockActual", e.target.value)}
                  placeholder="0"
                  className={inputCls}
                />
                <div className="text-[10px] text-gray-400 mt-1">
                  Lo que hay hoy en bodega. Después solo cambia con entradas y salidas.
                </div>
              </div>
            )}

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className={labelCls}>Productos que lo usan</span>
                <span className="text-[11px] text-gray-400">{form.productoTipos.length} seleccionados</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {PRODUCTOS.map((t) => (
                  <button key={t} type="button" onClick={() => alternar("productoTipos", t)}
                    className={chip(form.productoTipos.includes(t))}>
                    {t}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className={labelCls}>Proveedores</span>
                <button type="button" onClick={() => setNuevoProveedor(true)}
                  className="text-[11px] text-blue-600 dark:text-blue-400 inline-flex items-center gap-1">
                  <FaPlus className="text-[9px]" /> Nuevo
                </button>
              </div>
              {proveedores.length === 0 ? (
                <div className="text-xs text-gray-400">Todavía no hay proveedores registrados.</div>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {proveedores.map((p) => (
                    <button key={p.id} type="button" onClick={() => alternar("proveedorIds", p.id)}
                      className={chip(form.proveedorIds.includes(p.id))}>
                      {p.razonSocial || p.nombre || p.id}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </form>

          <div className="p-4 border-t border-gray-200 dark:border-gris-700 flex gap-2">
            <button type="button" onClick={onClose} disabled={saving}
              className="flex-1 py-2.5 rounded-lg border border-gray-300 dark:border-gris-600 bg-gray-50 dark:bg-gris-700 text-sm font-medium disabled:opacity-50">
              Cancelar
            </button>
            <button type="submit" form="material-form" disabled={saving || !form.nombre.trim()}
              className="flex-1 py-2.5 rounded-lg bg-gray-900 dark:bg-trafico dark:text-negro text-white text-sm font-semibold disabled:opacity-50">
              {saving ? "Guardando…" : editando ? "Guardar cambios" : "Crear material"}
            </button>
          </div>
        </div>
      </div>

      {nuevoProveedor && (
        <ProveedorFormModal
          onClose={() => setNuevoProveedor(false)}
          onDone={async (id) => {
            setNuevoProveedor(false);
            await cargarProveedores();
            alternar("proveedorIds", id);
          }}
        />
      )}
    </div>
  );
}
