import React from "react";
import toast from "react-hot-toast";
import {
  crearOrdenProduccion,
  listarOrdenesProduccion,
  crearFichaFabricacion,
  listarFichasFabricacion,
} from "../utils/firebaseProduction";

export default function ProduccionPage() {
  const [ordenForm, setOrdenForm] = React.useState({ nombre: "", producto: "", cantidad: 1, estado: "en_produccion", notas: "" });
  const [fichaForm, setFichaForm] = React.useState({ titulo: "", ordenId: "", contenido: "" });

  const [ordenes, setOrdenes] = React.useState([]);
  const [fichas, setFichas] = React.useState([]);
  const [loading, setLoading] = React.useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [o, f] = await Promise.all([listarOrdenesProduccion(), listarFichasFabricacion()]);
      setOrdenes(o);
      setFichas(f);
    } catch (e) {
      console.error(e);
      toast.error("No se pudo cargar producción");
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    load();
  }, []);

  const submitOrden = async (e) => {
    e.preventDefault();
    try {
      if (!ordenForm.nombre.trim()) return toast.error("Nombre requerido");
      await crearOrdenProduccion(ordenForm);
      toast.success("Orden creada");
      setOrdenForm({ nombre: "", producto: "", cantidad: 1, estado: "en_produccion", notas: "" });
      await load();
    } catch (err) {
      console.error(err);
      toast.error("No se pudo crear la orden");
    }
  };

  const submitFicha = async (e) => {
    e.preventDefault();
    try {
      if (!fichaForm.titulo.trim()) return toast.error("Título requerido");
      await crearFichaFabricacion(fichaForm);
      toast.success("Ficha creada");
      setFichaForm({ titulo: "", ordenId: "", contenido: "" });
      await load();
    } catch (err) {
      console.error(err);
      toast.error("No se pudo crear la ficha");
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4">
      <h1 className="text-xl font-semibold">Producción</h1>
      <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
        Base inicial: registrar órdenes en curso y fichas de fabricación.
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mt-5">
        <section className="bg-white dark:bg-gris-800 border border-gray-200 dark:border-gris-700 rounded-lg p-4">
          <div className="font-medium">Nueva orden</div>
          <form onSubmit={submitOrden} className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-600 dark:text-gray-300">Nombre</label>
              <input value={ordenForm.nombre} onChange={(e)=>setOrdenForm(p=>({...p, nombre:e.target.value}))}
                className="mt-1 w-full px-3 py-2 rounded border border-gray-300 dark:border-gris-600 bg-white dark:bg-gris-700" />
            </div>
            <div>
              <label className="text-xs text-gray-600 dark:text-gray-300">Producto</label>
              <input value={ordenForm.producto} onChange={(e)=>setOrdenForm(p=>({...p, producto:e.target.value}))}
                className="mt-1 w-full px-3 py-2 rounded border border-gray-300 dark:border-gris-600 bg-white dark:bg-gris-700" />
            </div>
            <div>
              <label className="text-xs text-gray-600 dark:text-gray-300">Cantidad</label>
              <input type="number" min={1} value={ordenForm.cantidad} onChange={(e)=>setOrdenForm(p=>({...p, cantidad:Number(e.target.value)}))}
                className="mt-1 w-full px-3 py-2 rounded border border-gray-300 dark:border-gris-600 bg-white dark:bg-gris-700" />
            </div>
            <div>
              <label className="text-xs text-gray-600 dark:text-gray-300">Estado</label>
              <select value={ordenForm.estado} onChange={(e)=>setOrdenForm(p=>({...p, estado:e.target.value}))}
                className="mt-1 w-full px-3 py-2 rounded border border-gray-300 dark:border-gris-600 bg-white dark:bg-gris-700">
                <option value="en_produccion">En producción</option>
                <option value="pausado">Pausado</option>
                <option value="terminado">Terminado</option>
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="text-xs text-gray-600 dark:text-gray-300">Notas</label>
              <textarea value={ordenForm.notas} onChange={(e)=>setOrdenForm(p=>({...p, notas:e.target.value}))}
                className="mt-1 w-full px-3 py-2 rounded border border-gray-300 dark:border-gris-600 bg-white dark:bg-gris-700" rows={3} />
            </div>
            <div className="md:col-span-2 flex justify-end">
              <button type="submit" className="px-4 py-2 rounded bg-green-600 hover:bg-green-500 text-white text-sm">Crear</button>
            </div>
          </form>

          <div className="mt-5">
            <div className="text-sm font-medium">Órdenes recientes</div>
            {loading ? <div className="text-sm opacity-70 mt-2">Cargando…</div> : (
              <div className="mt-2 space-y-2">
                {ordenes.length === 0 ? <div className="text-sm opacity-70">Sin órdenes</div> : ordenes.map(o => (
                  <div key={o.id} className="rounded border border-gray-200 dark:border-gris-700 px-3 py-2">
                    <div className="text-sm font-medium">{o.nombre} <span className="opacity-70">({o.estado})</span></div>
                    <div className="text-xs opacity-70">{o.producto || "—"} · Cant: {o.cantidad ?? "—"}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        <section className="bg-white dark:bg-gris-800 border border-gray-200 dark:border-gris-700 rounded-lg p-4">
          <div className="font-medium">Nueva ficha de fabricación</div>
          <form onSubmit={submitFicha} className="mt-3 grid grid-cols-1 gap-3">
            <div>
              <label className="text-xs text-gray-600 dark:text-gray-300">Título</label>
              <input value={fichaForm.titulo} onChange={(e)=>setFichaForm(p=>({...p, titulo:e.target.value}))}
                className="mt-1 w-full px-3 py-2 rounded border border-gray-300 dark:border-gris-600 bg-white dark:bg-gris-700" />
            </div>
            <div>
              <label className="text-xs text-gray-600 dark:text-gray-300">Orden ID (opcional)</label>
              <input value={fichaForm.ordenId} onChange={(e)=>setFichaForm(p=>({...p, ordenId:e.target.value}))}
                className="mt-1 w-full px-3 py-2 rounded border border-gray-300 dark:border-gris-600 bg-white dark:bg-gris-700" placeholder="Pega el id de la orden" />
            </div>
            <div>
              <label className="text-xs text-gray-600 dark:text-gray-300">Contenido</label>
              <textarea value={fichaForm.contenido} onChange={(e)=>setFichaForm(p=>({...p, contenido:e.target.value}))}
                className="mt-1 w-full px-3 py-2 rounded border border-gray-300 dark:border-gris-600 bg-white dark:bg-gris-700" rows={6} />
            </div>
            <div className="flex justify-end">
              <button type="submit" className="px-4 py-2 rounded bg-green-600 hover:bg-green-500 text-white text-sm">Crear</button>
            </div>
          </form>

          <div className="mt-5">
            <div className="text-sm font-medium">Fichas recientes</div>
            {loading ? <div className="text-sm opacity-70 mt-2">Cargando…</div> : (
              <div className="mt-2 space-y-2">
                {fichas.length === 0 ? <div className="text-sm opacity-70">Sin fichas</div> : fichas.map(f => (
                  <div key={f.id} className="rounded border border-gray-200 dark:border-gris-700 px-3 py-2">
                    <div className="text-sm font-medium">{f.titulo}</div>
                    <div className="text-xs opacity-70">Orden: {f.ordenId || "—"}</div>
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
