import React from "react";
import toast from "react-hot-toast";
import { FaTimes } from "react-icons/fa";
import { useAuth } from "../../context/AuthContext";
import { listAllUsers } from "../../utils/firebaseUsers";
import { marcarFichaTerminada } from "../../utils/firebaseFichas";

function nombreDe(u) {
  return u.displayName || u.email || u.id;
}

export default function FirmaModal({ tipo, id, onClose, onDone }) {
  const { user } = useAuth();
  const [staff, setStaff] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [fabricantesSel, setFabricantesSel] = React.useState(() => new Set(user?.uid ? [user.uid] : []));
  const [verificadorId, setVerificadorId] = React.useState("");
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    let activo = true;
    (async () => {
      try {
        const all = await listAllUsers();
        if (!activo) return;
        const activos = all
          .filter((u) => u.status === "active")
          .sort((a, b) => nombreDe(a).localeCompare(nombreDe(b)));
        setStaff(activos);
      } catch (e) {
        console.error(e);
        toast.error("No se pudo cargar la lista de usuarios");
      } finally {
        if (activo) setLoading(false);
      }
    })();
    return () => { activo = false; };
  }, []);

  const toggleFabricante = (uid) => {
    setFabricantesSel((prev) => {
      const next = new Set(prev);
      if (next.has(uid)) next.delete(uid); else next.add(uid);
      return next;
    });
  };

  const handleConfirm = async () => {
    const fabricantes = staff
      .filter((u) => fabricantesSel.has(u.id))
      .map((u) => ({ uid: u.id, nombre: nombreDe(u) }));
    const verificadorUser = staff.find((u) => u.id === verificadorId);

    if (fabricantes.length === 0) return toast.error("Selecciona quién fabricó la ficha");
    if (!verificadorUser) return toast.error("Selecciona quién verificó la ficha");

    setSaving(true);
    try {
      await marcarFichaTerminada(tipo, id, {
        fabricantes,
        verificador: { uid: verificadorUser.id, nombre: nombreDe(verificadorUser) },
      });
      toast.success("Ficha marcada como terminada");
      onDone?.();
    } catch (e) {
      console.error(e);
      toast.error(e?.message || "No se pudo marcar como terminada");
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
              <div className="text-sm font-semibold">Marcar como terminada</div>
              <div className="text-xs text-gray-500 dark:text-gray-400">Firma de fabricación y verificación</div>
            </div>
            <button type="button" onClick={onClose} className="h-8 w-8 rounded border border-gray-300 dark:border-gris-600 bg-gray-50 dark:bg-gris-700 flex items-center justify-center">
              <FaTimes className="text-sm" />
            </button>
          </div>

          <div className="p-4 overflow-y-auto flex-1">
            {loading ? (
              <div className="text-sm opacity-60 text-center py-6">Cargando…</div>
            ) : (
              <>
                <div className="mb-4">
                  <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
                    ¿Quién(es) la fabricaron?
                  </div>
                  <div className="space-y-1.5 max-h-40 overflow-y-auto">
                    {staff.map((u) => (
                      <label key={u.id} className="flex items-center gap-2.5 px-2 py-2 rounded-lg bg-gray-50 dark:bg-gris-700/50 text-sm">
                        <input
                          type="checkbox"
                          checked={fabricantesSel.has(u.id)}
                          onChange={() => toggleFabricante(u.id)}
                          className="h-4 w-4"
                        />
                        {nombreDe(u)}
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
                    ¿Quién la verificó?
                  </div>
                  <select
                    value={verificadorId}
                    onChange={(e) => setVerificadorId(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-lg border border-gray-300 dark:border-gris-600 bg-white dark:bg-gris-900 text-sm"
                  >
                    <option value="">Selecciona…</option>
                    {staff.map((u) => (
                      <option key={u.id} value={u.id}>{nombreDe(u)}</option>
                    ))}
                  </select>
                </div>
              </>
            )}
          </div>

          <div className="p-4 border-t border-gray-200 dark:border-gris-700 flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-lg border border-gray-300 dark:border-gris-600 bg-gray-50 dark:bg-gris-700 text-sm font-medium"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={saving || loading}
              className="flex-1 py-2.5 rounded-lg bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white text-sm font-semibold"
            >
              {saving ? "Guardando…" : "Confirmar"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
