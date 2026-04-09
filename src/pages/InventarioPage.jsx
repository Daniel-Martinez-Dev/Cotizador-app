import React from "react";
import toast from "react-hot-toast";
import {
  crearItemInventario,
  crearProveedor,
  listarItemsInventario,
  listarProveedores,
} from "../utils/firebaseInventory";

export default function InventarioPage() {
  const [provForm, setProvForm] = React.useState({ nombre: "", leadTimeDias: 0, contacto: "", telefono: "", email: "" });
  const [itemForm, setItemForm] = React.useState({ sku: "", nombre: "", unidad: "", stockActual: 0, stockMinimo: 0, proveedorId: "" });

  const [proveedores, setProveedores] = React.useState([]);
  const [items, setItems] = React.useState([]);
  const [loading, setLoading] = React.useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [p, i] = await Promise.all([listarProveedores(), listarItemsInventario()]);
      setProveedores(p);
      setItems(i);
    } catch (e) {
      console.error(e);
      toast.error("No se pudo cargar inventario");
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    load();
  }, []);

  const submitProveedor = async (e) => {
    e.preventDefault();
    try {
      if (!provForm.nombre.trim()) return toast.error("Nombre de proveedor requerido");
      await crearProveedor(provForm);
      toast.success("Proveedor creado");
      setProvForm({ nombre: "", leadTimeDias: 0, contacto: "", telefono: "", email: "" });
      await load();
    } catch (err) {
      console.error(err);
      toast.error("No se pudo crear el proveedor");
    }
  };

  const submitItem = async (e) => {
    e.preventDefault();
    try {
      if (!itemForm.nombre.trim()) return toast.error("Nombre del item requerido");
      await crearItemInventario(itemForm);
      toast.success("Item creado");
      setItemForm({ sku: "", nombre: "", unidad: "", stockActual: 0, stockMinimo: 0, proveedorId: "" });
      await load();
    } catch (err) {
      console.error(err);
      toast.error("No se pudo crear el item");
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4">
      <h1 className="text-xl font-semibold">Inventario</h1>
      <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
        Base inicial: materia prima + proveedores (lead time).
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mt-5">
        <section className="bg-white dark:bg-gris-800 border border-gray-200 dark:border-gris-700 rounded-lg p-4">
          <div className="font-medium">Nuevo proveedor</div>
          <form onSubmit={submitProveedor} className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="md:col-span-2">
              <label className="text-xs text-gray-600 dark:text-gray-300">Nombre</label>
              <input value={provForm.nombre} onChange={(e)=>setProvForm(p=>({...p, nombre:e.target.value}))}
                className="mt-1 w-full px-3 py-2 rounded border border-gray-300 dark:border-gris-600 bg-white dark:bg-gris-700" />
            </div>
            <div>
              <label className="text-xs text-gray-600 dark:text-gray-300">Lead time (días)</label>
              <input type="number" min={0} value={provForm.leadTimeDias} onChange={(e)=>setProvForm(p=>({...p, leadTimeDias:Number(e.target.value)}))}
                className="mt-1 w-full px-3 py-2 rounded border border-gray-300 dark:border-gris-600 bg-white dark:bg-gris-700" />
            </div>
            <div>
              <label className="text-xs text-gray-600 dark:text-gray-300">Contacto</label>
              <input value={provForm.contacto} onChange={(e)=>setProvForm(p=>({...p, contacto:e.target.value}))}
                className="mt-1 w-full px-3 py-2 rounded border border-gray-300 dark:border-gris-600 bg-white dark:bg-gris-700" />
            </div>
            <div>
              <label className="text-xs text-gray-600 dark:text-gray-300">Teléfono</label>
              <input value={provForm.telefono} onChange={(e)=>setProvForm(p=>({...p, telefono:e.target.value}))}
                className="mt-1 w-full px-3 py-2 rounded border border-gray-300 dark:border-gris-600 bg-white dark:bg-gris-700" />
            </div>
            <div>
              <label className="text-xs text-gray-600 dark:text-gray-300">Email</label>
              <input type="email" value={provForm.email} onChange={(e)=>setProvForm(p=>({...p, email:e.target.value}))}
                className="mt-1 w-full px-3 py-2 rounded border border-gray-300 dark:border-gris-600 bg-white dark:bg-gris-700" />
            </div>
            <div className="md:col-span-2 flex justify-end">
              <button type="submit" className="px-4 py-2 rounded bg-green-600 hover:bg-green-500 text-white text-sm">Crear</button>
            </div>
          </form>

          <div className="mt-5">
            <div className="text-sm font-medium">Proveedores recientes</div>
            {loading ? <div className="text-sm opacity-70 mt-2">Cargando…</div> : (
              <div className="mt-2 space-y-2">
                {proveedores.length === 0 ? <div className="text-sm opacity-70">Sin proveedores</div> : proveedores.map(p => (
                  <div key={p.id} className="rounded border border-gray-200 dark:border-gris-700 px-3 py-2">
                    <div className="text-sm font-medium">{p.nombre}</div>
                    <div className="text-xs opacity-70">Lead time: {p.leadTimeDias ?? 0} días</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        <section className="bg-white dark:bg-gris-800 border border-gray-200 dark:border-gris-700 rounded-lg p-4">
          <div className="font-medium">Nuevo item de materia prima</div>
          <form onSubmit={submitItem} className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-600 dark:text-gray-300">SKU</label>
              <input value={itemForm.sku} onChange={(e)=>setItemForm(p=>({...p, sku:e.target.value}))}
                className="mt-1 w-full px-3 py-2 rounded border border-gray-300 dark:border-gris-600 bg-white dark:bg-gris-700" />
            </div>
            <div>
              <label className="text-xs text-gray-600 dark:text-gray-300">Unidad</label>
              <input value={itemForm.unidad} onChange={(e)=>setItemForm(p=>({...p, unidad:e.target.value}))}
                className="mt-1 w-full px-3 py-2 rounded border border-gray-300 dark:border-gris-600 bg-white dark:bg-gris-700" placeholder="m2, kg, und..." />
            </div>
            <div className="md:col-span-2">
              <label className="text-xs text-gray-600 dark:text-gray-300">Nombre</label>
              <input value={itemForm.nombre} onChange={(e)=>setItemForm(p=>({...p, nombre:e.target.value}))}
                className="mt-1 w-full px-3 py-2 rounded border border-gray-300 dark:border-gris-600 bg-white dark:bg-gris-700" />
            </div>
            <div>
              <label className="text-xs text-gray-600 dark:text-gray-300">Stock actual</label>
              <input type="number" value={itemForm.stockActual} onChange={(e)=>setItemForm(p=>({...p, stockActual:Number(e.target.value)}))}
                className="mt-1 w-full px-3 py-2 rounded border border-gray-300 dark:border-gris-600 bg-white dark:bg-gris-700" />
            </div>
            <div>
              <label className="text-xs text-gray-600 dark:text-gray-300">Stock mínimo</label>
              <input type="number" value={itemForm.stockMinimo} onChange={(e)=>setItemForm(p=>({...p, stockMinimo:Number(e.target.value)}))}
                className="mt-1 w-full px-3 py-2 rounded border border-gray-300 dark:border-gris-600 bg-white dark:bg-gris-700" />
            </div>
            <div className="md:col-span-2">
              <label className="text-xs text-gray-600 dark:text-gray-300">Proveedor</label>
              <select value={itemForm.proveedorId} onChange={(e)=>setItemForm(p=>({...p, proveedorId:e.target.value}))}
                className="mt-1 w-full px-3 py-2 rounded border border-gray-300 dark:border-gris-600 bg-white dark:bg-gris-700">
                <option value="">—</option>
                {proveedores.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
              </select>
            </div>
            <div className="md:col-span-2 flex justify-end">
              <button type="submit" className="px-4 py-2 rounded bg-green-600 hover:bg-green-500 text-white text-sm">Crear</button>
            </div>
          </form>

          <div className="mt-5">
            <div className="text-sm font-medium">Items recientes</div>
            {loading ? <div className="text-sm opacity-70 mt-2">Cargando…</div> : (
              <div className="mt-2 space-y-2">
                {items.length === 0 ? <div className="text-sm opacity-70">Sin items</div> : items.map(i => (
                  <div key={i.id} className="rounded border border-gray-200 dark:border-gris-700 px-3 py-2">
                    <div className="text-sm font-medium">{i.nombre}</div>
                    <div className="text-xs opacity-70">SKU: {i.sku || "—"} · Stock: {i.stockActual ?? 0} {i.unidad || ""}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
