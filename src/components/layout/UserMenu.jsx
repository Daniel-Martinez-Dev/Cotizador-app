import React from "react";
import { Link } from "react-router-dom";
import { FaChevronDown, FaHardHat, FaMoon, FaSignOutAlt, FaSun, FaUserCircle } from "react-icons/fa";
import AvatarPerfil from "../perfil/AvatarPerfil";

// Todo lo que es "de mí" y no "de la app" vive aquí: correo, perfil, tema,
// atajo a la vista de planta y salir. Antes eran cinco controles sueltos en la
// barra, del mismo peso visual que las secciones, y se robaban la atención.
export default function UserMenu({ user, profile, dark, onToggleTheme, onSignOut, isAdminUser, requireLogin }) {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef(null);

  React.useEffect(() => {
    if (!open) return undefined;
    const onClickFuera = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    const onEsc = (e) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", onClickFuera);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("mousedown", onClickFuera);
      document.removeEventListener("keydown", onEsc);
    };
  }, [open]);

  const nombre = profile?.displayName || user?.email || "Mi cuenta";
  const itemClass =
    "flex w-full items-center gap-2.5 px-3 py-2 text-sm text-left text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gris-800 focus:outline-none focus:bg-gray-100 dark:focus:bg-gris-800";

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        title={user?.email || "Mi cuenta"}
        className="inline-flex items-center gap-1.5 rounded-full p-0.5 pr-1.5 border border-transparent hover:border-gray-300 dark:hover:border-gris-600 hover:bg-gray-100 dark:hover:bg-gris-800 focus:outline-none focus:ring-2 focus:ring-trafico/60 transition-colors"
      >
        <AvatarPerfil perfil={profile} email={user?.email} size={30} />
        <FaChevronDown className={`text-[10px] text-gray-500 dark:text-gray-400 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 mt-2 w-64 rounded-xl border border-gray-200 dark:border-gris-700 bg-white dark:bg-gris-900 shadow-xl overflow-hidden animate-fade-in z-[60]"
        >
          <div className="flex items-center gap-3 px-3 py-3 border-b border-gray-200 dark:border-gris-700">
            <AvatarPerfil perfil={profile} email={user?.email} size={36} />
            <div className="min-w-0">
              <div className="text-sm font-medium text-gray-900 dark:text-white truncate">{nombre}</div>
              {user?.email && (
                <div className="text-xs text-gray-500 dark:text-gray-400 truncate" title={user.email}>{user.email}</div>
              )}
            </div>
          </div>

          <div className="py-1">
            <Link to="/perfil" role="menuitem" onClick={() => setOpen(false)} className={itemClass}>
              <FaUserCircle className="text-gray-400 dark:text-gray-500" /> Mi perfil
            </Link>

            <button type="button" role="menuitem" onClick={() => { onToggleTheme(); setOpen(false); }} className={itemClass}>
              {dark ? <FaSun className="text-gray-400 dark:text-gray-500" /> : <FaMoon className="text-gray-400" />}
              Tema {dark ? "claro" : "oscuro"}
            </button>

            {/* Atajo de pruebas: el admin entra a la interfaz de planta sin
                cambiar de usuario. El regreso está en EmployeeShell. */}
            {isAdminUser && (
              <Link to="/planta" role="menuitem" onClick={() => setOpen(false)} className={itemClass}
                title="Ver la app como la ve un empleado de planta">
                <FaHardHat className="text-gray-400 dark:text-gray-500" /> Vista de planta
              </Link>
            )}
          </div>

          {requireLogin && (
            <div className="py-1 border-t border-gray-200 dark:border-gris-700">
              <button
                type="button"
                role="menuitem"
                onClick={() => { setOpen(false); onSignOut(); }}
                className={`${itemClass} text-red-600 dark:text-red-400`}
              >
                <FaSignOutAlt className="opacity-70" /> Cerrar sesión
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
