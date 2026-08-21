import React from "react";
import toast from "react-hot-toast";
import { FaTimes, FaTruckLoading } from "react-icons/fa";
import { crearProveedor } from "../../utils/firebaseInventory";

// Alta rápida de proveedor desde el almacén. Es deliberadamente corta: cuando
// llega una descarga con un proveedor que todavía no está cargado, lo que hace
// falta es poder registrar la entrada sin salir de la tablet. La ficha
// completa —sedes, contactos, formas de pago, lead time— se termina desde el
// módulo de inventario en la oficina.

const inputCls = "mt-1 w-full px-3 py-2.5 rounded-lg border border-gray-300 dark:border-gris-600 bg-white dark:bg-gris-900 text-sm";
const labelCls = "text-xs text-gray-600 dark:text-gray-300";

export default function ProveedorFormModal({ onClose, onDone }) {
  const [razonSocial, setRazonSocial] = React.useState("");
  const [nit, setNit] = React.useState("");
  const [contacto, setContacto] = React.useState("");
  const [telefono, setTelefono] = React.useState("");
  const [saving, setSaving] = React.useState(false);

  const guardar = async (e) => {
    e.preventDefault();
    const nombre = razonSocial.trim();
    if (!nombre) return toast.error("Escribe la razón social");
    setSaving(true);
    try {
      const id = await crearProveedor({ razonSocial: nombre, nit, contacto, telefono });
      toast.success("Proveedor creado");
      onDone?.(id);
    } catch (err) {
      console.error(err);
      toast.error(err?.message || "No se pudo crear el proveedor");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[1100]">
      <div className="absolute inset-0 bg-black/50" onClick={saving ? undefined : onClose} />
      <div className="absolute inset-x-0 bottom-0 sm:inset-0 sm:flex sm:items-center sm:justify-center sm:p-4">
        <div className="w-full sm:max-w-sm bg-white dark:bg-gris-800 rounded-t-2xl sm:rounded-2xl border border-gray-200 dark:border-gris-700 shadow-xl max-h-[88vh] overflow-hidden flex flex-col">
          <div className="p-4 border-b border-gray-200 dark:border-gris-700 flex items-center justify-between">
            <div className="text-sm font-semibold inline-flex items-center gap-2">
              <FaTruckLoading className="text-gray-400" /> Nuevo proveedor
            </div>
            <button type="button" onClick={onClose} disabled={saving}
              className="h-8 w-8 rounded border border-gray-300 dark:border-gris-600 bg-gray-50 dark:bg-gris-700 flex items-center justify-center disabled:opacity-40">
              <FaTimes className="text-sm" />
            </button>
          </div>

          <form id="proveedor-form" onSubmit={guardar} className="p-4 overflow-y-auto flex-1 space-y-3">
            <div>
              <label className={labelCls}>Razón social *</label>
              <input value={razonSocial} onChange={(e) => setRazonSocial(e.target.value)} autoFocus className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>NIT</label>
              <input value={nit} onChange={(e) => setNit(e.target.value)} inputMode="numeric" className={`${inputCls} font-mono`} />
            </div>
            <div>
              <label className={labelCls}>Contacto</label>
              <input value={contacto} onChange={(e) => setContacto(e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Teléfono</label>
              <input value={telefono} onChange={(e) => setTelefono(e.target.value)} inputMode="tel" className={inputCls} />
            </div>
          </form>

          <div className="p-4 border-t border-gray-200 dark:border-gris-700 flex gap-2">
            <button type="button" onClick={onClose} disabled={saving}
              className="flex-1 py-2.5 rounded-lg border border-gray-300 dark:border-gris-600 bg-gray-50 dark:bg-gris-700 text-sm font-medium disabled:opacity-50">
              Cancelar
            </button>
            <button type="submit" form="proveedor-form" disabled={saving || !razonSocial.trim()}
              className="flex-1 py-2.5 rounded-lg bg-gray-900 dark:bg-trafico dark:text-negro text-white text-sm font-semibold disabled:opacity-50">
              {saving ? "Guardando…" : "Crear"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
