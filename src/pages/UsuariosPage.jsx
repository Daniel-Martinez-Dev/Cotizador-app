import React from "react";
import toast from "react-hot-toast";
import { listEmailUsers, upsertUserProfileByEmail } from "../utils/firebaseUsers";

const ROLES = ["admin", "vendedor", "produccion", "inventario"];

export default function UsuariosPage() {
  const [email, setEmail] = React.useState("");
  const [roles, setRoles] = React.useState([]);
  const [status, setStatus] = React.useState("active");
  const [items, setItems] = React.useState([]);
  const [loading, setLoading] = React.useState(false);
  const [editingId, setEditingId] = React.useState(null);

  const resetForm = () => {
    setEmail("");
    setRoles([]);
    setStatus("active");
    setEditingId(null);
  };

  const load = async () => {
    setLoading(true);
    try {
      const data = await listEmailUsers();
      setItems(data);
    } catch (e) {
      console.error(e);
      toast.error("No se pudo cargar usuarios");
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    load();
  }, []);

  const toggleRole = (r) => {
    setRoles((prev) => (prev.includes(r) ? prev.filter((x) => x !== r) : [...prev, r]));
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      const emailNorm = email.trim().toLowerCase();
      if (!emailNorm) {
        toast.error("Email requerido");
        return;
      }

      await upsertUserProfileByEmail(emailNorm, {
        roles,
        status,
      });

      toast.success(editingId ? "Cambios guardados" : "Acceso actualizado");
      resetForm();
      await load();
    } catch (e2) {
      console.error(e2);
      toast.error("No se pudo guardar");
    }
  };

  const startEdit = (it) => {
    const nextEmail = (it?.email || "").toString().trim().toLowerCase();
    setEditingId(it?.id || nextEmail || "editing");
    setEmail(nextEmail);
    setRoles(Array.isArray(it?.roles) ? it.roles : []);
    setStatus(it?.status || "active");
    try {
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch {
      window.scrollTo(0, 0);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4">
      <h1 className="text-xl font-semibold">Usuarios y permisos</h1>
      <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
        Aquí defines qué correos pueden entrar y qué roles tendrán.
      </p>

      {editingId && (
        <div className="mt-4 text-sm rounded border border-trafico bg-trafico/10 text-gray-900 dark:text-gray-100 px-3 py-2 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            Editando: <span className="font-medium break-all">{email}</span>
          </div>
          <button
            type="button"
            onClick={resetForm}
            className="px-3 py-1.5 rounded border border-gray-300 dark:border-gris-600 bg-white/80 dark:bg-gris-800 hover:bg-white dark:hover:bg-gris-700 text-sm"
          >
            Cancelar
          </button>
        </div>
      )}

      <form onSubmit={handleCreate} className="mt-5 bg-white dark:bg-gris-800 border border-gray-200 dark:border-gris-700 rounded-lg p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="md:col-span-2">
            <label className="text-xs text-gray-600 dark:text-gray-300">Email</label>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={Boolean(editingId)}
              className="mt-1 w-full px-3 py-2 rounded border border-gray-300 dark:border-gris-600 bg-white dark:bg-gris-700"
              placeholder="usuario@empresa.com"
              type="email"
            />
            {editingId && (
              <div className="mt-1 text-xs text-gray-600 dark:text-gray-300">
                El email no se edita en modo edición.
              </div>
            )}
          </div>
          <div>
            <label className="text-xs text-gray-600 dark:text-gray-300">Estado</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="mt-1 w-full px-3 py-2 rounded border border-gray-300 dark:border-gris-600 bg-white dark:bg-gris-700"
            >
              <option value="active">Activo</option>
              <option value="disabled">Deshabilitado</option>
            </select>
          </div>
        </div>

        <div className="mt-3">
          <div className="text-xs text-gray-600 dark:text-gray-300">Roles</div>
          <div className="flex flex-wrap gap-2 mt-2">
            {ROLES.map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => toggleRole(r)}
                className={`px-3 py-1.5 rounded text-sm border ${
                  roles.includes(r)
                    ? "bg-trafico text-black border-trafico"
                    : "bg-gray-100 dark:bg-gris-700 text-gray-800 dark:text-gray-100 border-gray-300 dark:border-gris-600"
                }`}
              >
                {r}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-4 flex flex-col sm:flex-row gap-2 sm:justify-end">
          {editingId && (
            <button
              type="button"
              onClick={resetForm}
              className="px-4 py-2 rounded border border-gray-300 dark:border-gris-600 bg-gray-100 dark:bg-gris-700 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gris-600 text-sm"
            >
              Cancelar
            </button>
          )}
          <button
            type="submit"
            className="px-4 py-2 rounded bg-green-600 hover:bg-green-500 text-white text-sm"
          >
            {editingId ? "Guardar cambios" : "Guardar"}
          </button>
        </div>
      </form>

      <div className="mt-6">
        <div className="text-sm font-medium mb-2">Accesos por email</div>
        <div className="bg-white dark:bg-gris-800 border border-gray-200 dark:border-gris-700 rounded-lg overflow-hidden">
          <div className="grid grid-cols-12 px-4 py-2 text-xs bg-gray-50 dark:bg-gris-900 border-b border-gray-200 dark:border-gris-700">
            <div className="col-span-5">Email</div>
            <div className="col-span-4">Roles</div>
            <div className="col-span-2">Estado</div>
            <div className="col-span-1 text-right">Acción</div>
          </div>
          {loading ? (
            <div className="px-4 py-3 text-sm opacity-70">Cargando…</div>
          ) : items.length === 0 ? (
            <div className="px-4 py-3 text-sm opacity-70">Sin registros</div>
          ) : (
            items.map((it) => (
              <div key={it.id} className="grid grid-cols-12 px-4 py-2 text-sm border-b border-gray-100 dark:border-gris-700 items-center">
                <div className="col-span-5 break-all">{it.email || it.id}</div>
                <div className="col-span-4">{Array.isArray(it.roles) && it.roles.length ? it.roles.join(", ") : "—"}</div>
                <div className="col-span-2">{it.status || "—"}</div>
                <div className="col-span-1 flex justify-end">
                  <button
                    type="button"
                    onClick={() => startEdit(it)}
                    className="px-2 py-1 rounded border border-gray-300 dark:border-gris-600 bg-gray-50 dark:bg-gris-700 hover:bg-gray-100 dark:hover:bg-gris-600 text-xs"
                  >
                    Editar
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
