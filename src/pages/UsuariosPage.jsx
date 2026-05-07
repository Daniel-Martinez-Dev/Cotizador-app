import React from "react";
import toast from "react-hot-toast";
import {
  listAllUsers,
  listEmailUsers,
  aprobarUsuario,
  desactivarUsuario,
  actualizarRoles,
  upsertUserProfileByEmail,
} from "../utils/firebaseUsers";

const ALL_ROLES = ["admin", "vendedor", "produccion", "inventario"];

const ROLE_LABELS = {
  admin: "Admin",
  vendedor: "Vendedor",
  produccion: "Producción",
  inventario: "Inventario",
};

const STATUS_BADGE = {
  active:   "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300",
  pending:  "bg-amber-100  text-amber-800  dark:bg-amber-900/40  dark:text-amber-300",
  disabled: "bg-red-100    text-red-800    dark:bg-red-900/40    dark:text-red-300",
};

const STATUS_LABEL = { active: "Activo", pending: "Pendiente", disabled: "Desactivado" };

// ─── Sub-componente: chip de rol ─────────────────────────────────────────────
function RoleChip({ role, active, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${
        active
          ? "bg-trafico text-black border-trafico"
          : "bg-gray-100 dark:bg-gris-700 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gris-600 hover:border-trafico"
      }`}
    >
      {ROLE_LABELS[role] ?? role}
    </button>
  );
}

// ─── Sub-componente: fila de usuario en la tabla ─────────────────────────────
function UserRow({ user, onApprove, onDeactivate, onRolesChange }) {
  const [editingRoles, setEditingRoles] = React.useState(null); // null = no editando
  const [saving, setSaving] = React.useState(false);

  const roles = Array.isArray(user.roles) ? user.roles : [];
  const status = user.status || "pending";

  const startEdit = () => setEditingRoles([...roles]);
  const cancelEdit = () => setEditingRoles(null);

  const toggleRole = (r) =>
    setEditingRoles((prev) =>
      prev.includes(r) ? prev.filter((x) => x !== r) : [...prev, r]
    );

  const saveRoles = async () => {
    setSaving(true);
    try {
      await onRolesChange(user.id, editingRoles);
      setEditingRoles(null);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="px-4 py-3 border-b border-gray-100 dark:border-gris-700 last:border-0">
      {/* Fila principal */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-2">
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium truncate text-gray-900 dark:text-gray-100">
            {user.displayName || "Sin nombre"}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400 truncate">{user.email || user.id}</div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${STATUS_BADGE[status] ?? STATUS_BADGE.pending}`}>
            {STATUS_LABEL[status] ?? status}
          </span>

          {/* Roles actuales (cuando no está editando) */}
          {editingRoles === null && roles.length > 0 && (
            <div className="flex gap-1 flex-wrap">
              {roles.map((r) => (
                <span key={r} className="text-[11px] px-2 py-0.5 rounded-full bg-sky-100 dark:bg-sky-900/40 text-sky-800 dark:text-sky-300">
                  {ROLE_LABELS[r] ?? r}
                </span>
              ))}
            </div>
          )}

          {/* Acciones */}
          {status === "pending" && (
            <button
              type="button"
              onClick={() => onApprove(user.id, roles.length ? roles : [])}
              className="px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium"
            >
              Aprobar
            </button>
          )}
          {status === "active" && editingRoles === null && (
            <button
              type="button"
              onClick={startEdit}
              className="px-3 py-1 rounded-lg border border-gray-300 dark:border-gris-600 bg-white dark:bg-gris-700 hover:bg-gray-50 dark:hover:bg-gris-600 text-xs"
            >
              Editar
            </button>
          )}
          {status === "active" && (
            <button
              type="button"
              onClick={() => onDeactivate(user.id)}
              className="px-3 py-1 rounded-lg border border-red-300 dark:border-red-800 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/40 text-red-700 dark:text-red-400 text-xs"
            >
              Desactivar
            </button>
          )}
          {status === "disabled" && (
            <button
              type="button"
              onClick={() => onApprove(user.id, roles)}
              className="px-3 py-1 rounded-lg border border-emerald-300 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-900/20 hover:bg-emerald-100 text-emerald-700 dark:text-emerald-400 text-xs"
            >
              Reactivar
            </button>
          )}
        </div>
      </div>

      {/* Panel de edición de roles (inline) */}
      {editingRoles !== null && (
        <div className="mt-3 p-3 rounded-lg bg-gray-50 dark:bg-gris-900 border border-gray-200 dark:border-gris-600">
          <div className="text-xs text-gray-500 dark:text-gray-400 mb-2">Roles asignados:</div>
          <div className="flex flex-wrap gap-2 mb-3">
            {ALL_ROLES.map((r) => (
              <RoleChip
                key={r}
                role={r}
                active={editingRoles.includes(r)}
                onClick={() => toggleRole(r)}
              />
            ))}
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={saveRoles}
              disabled={saving}
              className="px-3 py-1.5 rounded-lg bg-trafico hover:opacity-90 text-black text-xs font-medium disabled:opacity-50"
            >
              {saving ? "Guardando…" : "Guardar"}
            </button>
            <button
              type="button"
              onClick={cancelEdit}
              className="px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gris-600 bg-white dark:bg-gris-700 text-xs"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Panel de aprobación para solicitudes pendientes ─────────────────────────
function ApproveModal({ user, onConfirm, onClose }) {
  const [roles, setRoles] = React.useState([]);
  const [saving, setSaving] = React.useState(false);

  const toggle = (r) => setRoles((p) => (p.includes(r) ? p.filter((x) => x !== r) : [...p, r]));

  const handleConfirm = async () => {
    setSaving(true);
    try {
      await onConfirm(user.id, roles);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative w-full max-w-sm mx-4 bg-white dark:bg-gris-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gris-700 p-6">
        <h3 className="font-semibold text-gray-900 dark:text-white mb-1">Aprobar acceso</h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4 break-all">
          {user.displayName && <span className="font-medium text-gray-700 dark:text-gray-200">{user.displayName} — </span>}
          {user.email}
        </p>
        <div className="text-xs text-gray-500 dark:text-gray-400 mb-2">Asignar roles:</div>
        <div className="flex flex-wrap gap-2 mb-5">
          {ALL_ROLES.map((r) => (
            <RoleChip key={r} role={r} active={roles.includes(r)} onClick={() => toggle(r)} />
          ))}
        </div>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={handleConfirm}
            disabled={saving}
            className="flex-1 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium disabled:opacity-50"
          >
            {saving ? "Aprobando…" : "Aprobar"}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2 rounded-lg border border-gray-300 dark:border-gris-600 bg-gray-100 dark:bg-gris-700 text-sm"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Formulario de pre-registro por email ────────────────────────────────────
function PreRegisterForm({ onSaved }) {
  const [email, setEmail] = React.useState("");
  const [roles, setRoles] = React.useState([]);
  const [saving, setSaving] = React.useState(false);

  const toggle = (r) => setRoles((p) => (p.includes(r) ? p.filter((x) => x !== r) : [...p, r]));

  const handleSubmit = async (e) => {
    e.preventDefault();
    const emailNorm = email.trim().toLowerCase();
    if (!emailNorm) { toast.error("Email requerido"); return; }
    setSaving(true);
    try {
      await upsertUserProfileByEmail(emailNorm, { roles, status: "active" });
      toast.success("Acceso pre-registrado");
      setEmail("");
      setRoles([]);
      onSaved();
    } catch (err) {
      console.error(err);
      toast.error("No se pudo guardar");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white dark:bg-gris-800 border border-gray-200 dark:border-gris-700 rounded-xl p-4">
      <div className="text-sm font-medium mb-3">Pre-registrar usuario por email</div>
      <div className="flex flex-col sm:flex-row gap-3">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="usuario@empresa.com"
          className="flex-1 px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gris-600 bg-white dark:bg-gris-700"
        />
      </div>
      <div className="flex flex-wrap gap-2 mt-3">
        {ALL_ROLES.map((r) => (
          <RoleChip key={r} role={r} active={roles.includes(r)} onClick={() => toggle(r)} />
        ))}
      </div>
      <div className="mt-3 text-xs text-gray-500 dark:text-gray-400">
        Cuando ese email inicie sesión con Google, recibirá los roles asignados automáticamente.
      </div>
      <button
        type="submit"
        disabled={saving}
        className="mt-3 px-4 py-2 rounded-lg bg-trafico hover:opacity-90 text-black text-sm font-medium disabled:opacity-50"
      >
        {saving ? "Guardando…" : "Guardar pre-registro"}
      </button>
    </form>
  );
}

// ─── Página principal ─────────────────────────────────────────────────────────
export default function UsuariosPage() {
  const [tab, setTab] = React.useState("solicitudes");
  const [allUsers, setAllUsers] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [approveTarget, setApproveTarget] = React.useState(null);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const users = await listAllUsers();
      setAllUsers(users);
    } catch (e) {
      console.error(e);
      toast.error("No se pudo cargar usuarios");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => { load(); }, [load]);

  const pending  = allUsers.filter((u) => u.status === "pending");
  const active   = allUsers.filter((u) => u.status === "active" || u.status === "disabled");

  const handleApprove = async (uid, roles) => {
    try {
      await aprobarUsuario(uid, roles);
      toast.success("Usuario aprobado");
      await load();
    } catch (e) {
      console.error(e);
      toast.error("No se pudo aprobar");
    }
  };

  const handleDeactivate = async (uid) => {
    try {
      await desactivarUsuario(uid);
      toast.success("Usuario desactivado");
      await load();
    } catch (e) {
      console.error(e);
      toast.error("No se pudo desactivar");
    }
  };

  const handleRolesChange = async (uid, roles) => {
    try {
      await actualizarRoles(uid, roles);
      toast.success("Roles actualizados");
      await load();
    } catch (e) {
      console.error(e);
      toast.error("No se pudo actualizar");
    }
  };

  const tabs = [
    { key: "solicitudes", label: "Solicitudes", count: pending.length },
    { key: "usuarios",    label: "Usuarios",    count: active.length },
    { key: "preregistro", label: "Pre-registro", count: null },
  ];

  return (
    <div className="max-w-4xl mx-auto px-4 pb-10">
      <h1 className="text-xl font-semibold text-gray-900 dark:text-white">Usuarios y permisos</h1>
      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
        Aprueba solicitudes de acceso, asigna roles y pre-registra usuarios.
      </p>

      {/* Tabs */}
      <div className="flex gap-1 mt-5 border-b border-gray-200 dark:border-gris-700">
        {tabs.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={`px-4 py-2 text-sm font-medium rounded-t-lg border-b-2 transition-colors ${
              tab === t.key
                ? "border-trafico text-gray-900 dark:text-white"
                : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
            }`}
          >
            {t.label}
            {t.count !== null && t.count > 0 && (
              <span className={`ml-1.5 text-[11px] px-1.5 py-0.5 rounded-full font-semibold ${
                t.key === "solicitudes" ? "bg-amber-500 text-white" : "bg-gray-200 dark:bg-gris-600 text-gray-700 dark:text-gray-300"
              }`}>
                {t.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab: Solicitudes */}
      {tab === "solicitudes" && (
        <div className="mt-4">
          {loading ? (
            <div className="text-sm text-gray-500 py-8 text-center">Cargando…</div>
          ) : pending.length === 0 ? (
            <div className="text-sm text-gray-500 dark:text-gray-400 py-12 text-center rounded-xl border border-dashed border-gray-300 dark:border-gris-600">
              No hay solicitudes pendientes
            </div>
          ) : (
            <div className="bg-white dark:bg-gris-800 border border-gray-200 dark:border-gris-700 rounded-xl overflow-hidden">
              {pending.map((u) => (
                <div key={u.id} className="flex flex-col sm:flex-row sm:items-center gap-3 px-4 py-3 border-b border-gray-100 dark:border-gris-700 last:border-0">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-900 dark:text-white truncate">
                      {u.displayName || "Sin nombre"}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 truncate">{u.email}</div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setApproveTarget(u)}
                      className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium"
                    >
                      Aprobar
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeactivate(u.id)}
                      className="px-3 py-1.5 rounded-lg border border-red-300 dark:border-red-800 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 text-xs"
                    >
                      Rechazar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab: Usuarios activos / desactivados */}
      {tab === "usuarios" && (
        <div className="mt-4">
          {loading ? (
            <div className="text-sm text-gray-500 py-8 text-center">Cargando…</div>
          ) : active.length === 0 ? (
            <div className="text-sm text-gray-500 dark:text-gray-400 py-12 text-center rounded-xl border border-dashed border-gray-300 dark:border-gris-600">
              No hay usuarios registrados
            </div>
          ) : (
            <div className="bg-white dark:bg-gris-800 border border-gray-200 dark:border-gris-700 rounded-xl overflow-hidden">
              {active.map((u) => (
                <UserRow
                  key={u.id}
                  user={u}
                  onApprove={handleApprove}
                  onDeactivate={handleDeactivate}
                  onRolesChange={handleRolesChange}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab: Pre-registro */}
      {tab === "preregistro" && (
        <div className="mt-4">
          <PreRegisterForm onSaved={load} />
        </div>
      )}

      {/* Modal de aprobación con selección de roles */}
      {approveTarget && (
        <ApproveModal
          user={approveTarget}
          onConfirm={handleApprove}
          onClose={() => setApproveTarget(null)}
        />
      )}
    </div>
  );
}
