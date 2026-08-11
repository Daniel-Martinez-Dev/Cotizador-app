import React from "react";
import toast from "react-hot-toast";
import { FaTimes } from "react-icons/fa";
import { listarProveedores, registrarMovimientoInventarioEmpleado } from "../../utils/firebaseInventory";
import OrdenProduccionPicker from "./OrdenProduccionPicker";

export default function MovimientoModal({ item, tipo, onClose, onDone }) {
  const esSalida = tipo === "salida";
  const [cantidad, setCantidad] = React.useState(1);
  const [proveedorId, setProveedorId] = React.useState("");
  const [proveedores, setProveedores] = React.useState([]);
  const [orden, setOrden] = React.useState(null);
  const [nota, setNota] = React.useState("");
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    if (esSalida) return;
    let activo = true;
    (async () => {
      try {
        const list = await listarProveedores();
        if (activo) setProveedores(list);
      } catch (e) {
        console.error(e);
        toast.error("No se pudieron cargar los proveedores");
      }
    })();
    return () => { activo = false; };
  }, [esSalida]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const cant = Number(cantidad || 0);
    if (Number.isNaN(cant) || cant <= 0) return toast.error("Cantidad inválida");
    if (esSalida && cant > Number(item.stockActual || 0)) return toast.error("No hay stock suficiente");
    if (!esSalida && !proveedorId) return toast.error("Selecciona el proveedor");
    if (esSalida && !orden) return toast.error("Selecciona la orden de producción");

    setSaving(true);
    try {
      await registrarMovimientoInventarioEmpleado(item.id, {
        tipo,
        cantidad: cant,
        nota,
        proveedorId: esSalida ? "" : proveedorId,
        ordenProduccion: esSalida ? orden.ordenProduccion : undefined,
        codigoFicha: esSalida ? orden.codigo : undefined,
        fichaId: esSalida ? orden.fichaId : undefined,
        fichaTipo: esSalida ? orden.fichaTipo : undefined,
      });
      toast.success(esSalida ? "Salida registrada" : "Entrada registrada");
      onDone?.();
    } catch (e2) {
      console.error(e2);
      toast.error(e2?.message || "No se pudo registrar el movimiento");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[1000]">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="absolute inset-x-0 bottom-0 sm:inset-0 sm:flex sm:items-center sm:justify-center">
        <div className="w-full sm:max-w-sm bg-white dark:bg-gris-800 rounded-t-2xl sm:rounded-2xl border border-gray-200 dark:border-gris-700 shadow-xl max-h-[85vh] overflow-hidden flex flex-col">
          <div className="p-4 border-b border-gray-200 dark:border-gris-700 flex items-center justify-between">
            <div>
              <div className="text-sm font-semibold">{esSalida ? "Registrar salida" : "Registrar entrada"}</div>
              <div className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-[220px]">{item.nombre}</div>
            </div>
            <button type="button" onClick={onClose} className="h-8 w-8 rounded border border-gray-300 dark:border-gris-600 bg-gray-50 dark:bg-gris-700 flex items-center justify-center">
              <FaTimes className="text-sm" />
            </button>
          </div>

          <form id="movimiento-form" onSubmit={handleSubmit} className="p-4 overflow-y-auto flex-1 space-y-3">
            <div className="text-xs text-gray-500 dark:text-gray-400">
              Stock actual: <span className="font-mono font-medium text-gray-700 dark:text-gray-200">{item.stockActual ?? 0} {item.unidad || ""}</span>
            </div>

            <div>
              <label className="text-xs text-gray-600 dark:text-gray-300">Cantidad</label>
              <input
                type="number"
                min={1}
                value={cantidad}
                onChange={(e) => setCantidad(e.target.value)}
                className="mt-1 w-full px-3 py-2.5 rounded-lg border border-gray-300 dark:border-gris-600 bg-white dark:bg-gris-900 text-sm"
              />
            </div>

            {!esSalida && (
              <div>
                <label className="text-xs text-gray-600 dark:text-gray-300">Proveedor</label>
                <select
                  value={proveedorId}
                  onChange={(e) => setProveedorId(e.target.value)}
                  className="mt-1 w-full px-3 py-2.5 rounded-lg border border-gray-300 dark:border-gris-600 bg-white dark:bg-gris-900 text-sm"
                >
                  <option value="">Selecciona proveedor</option>
                  {proveedores.map((p) => (
                    <option key={p.id} value={p.id}>{p.razonSocial || p.nombre || p.id}</option>
                  ))}
                </select>
              </div>
            )}

            {esSalida && (
              <div>
                <label className="text-xs text-gray-600 dark:text-gray-300">Orden de producción</label>
                <div className="mt-1">
                  <OrdenProduccionPicker value={orden} onChange={setOrden} />
                </div>
              </div>
            )}

            <div>
              <label className="text-xs text-gray-600 dark:text-gray-300">Nota (opcional)</label>
              <input
                value={nota}
                onChange={(e) => setNota(e.target.value)}
                className="mt-1 w-full px-3 py-2.5 rounded-lg border border-gray-300 dark:border-gris-600 bg-white dark:bg-gris-900 text-sm"
                placeholder="Observación…"
              />
            </div>
          </form>

          <div className="p-4 border-t border-gray-200 dark:border-gris-700 flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-lg border border-gray-300 dark:border-gris-600 bg-gray-50 dark:bg-gris-700 text-sm font-medium"
            >
              Cancelar
            </button>
            <button
              type="submit"
              form="movimiento-form"
              disabled={saving}
              className={`flex-1 py-2.5 rounded-lg disabled:opacity-50 text-white text-sm font-semibold ${esSalida ? "bg-red-600 hover:bg-red-500" : "bg-green-600 hover:bg-green-500"}`}
            >
              {saving ? "Guardando…" : esSalida ? "Registrar salida" : "Registrar entrada"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
