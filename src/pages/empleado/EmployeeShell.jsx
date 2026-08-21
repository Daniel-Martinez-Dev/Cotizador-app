import React from "react";
import { Link, Outlet, useLocation } from "react-router-dom";
import { FaHome, FaIndustry, FaBoxes, FaSignOutAlt, FaArrowLeft, FaUser } from "react-icons/fa";
import { useAuth } from "../../context/AuthContext";
import { puedeAlmacen } from "../../utils/roles";
import NotificationBell from "../../components/empleado/NotificationBell";
import AvatarPerfil from "../../components/perfil/AvatarPerfil";
import logo from "../../assets/imagenes/logo.png";

// Layout mobile-first para el panel de empleados de planta ("/planta/*").
// Deliberadamente no reutiliza AppShell (src/App.jsx): no muestra ninguno de
// los módulos de oficina (cotizar, historial, empresas, productos, admin de
// producción/inventario), solo el logo, la campana de notificaciones y un
// tab bar inferior con las secciones permitidas.
// "Materia prima" solo aparece para quien puede mover el almacén: el
// almacenista (y el rol de inventario que lo administra). Para el resto de la
// planta la sección no existe — ni pestaña, ni ruta (ver App.jsx).
const TABS = [
  { to: "/planta", label: "Inicio", icon: FaHome, end: true },
  { to: "/planta/produccion", label: "Producción", icon: FaIndustry },
  { to: "/planta/inventario", label: "Materia prima", icon: FaBoxes, soloAlmacen: true },
  { to: "/planta/perfil", label: "Perfil", icon: FaUser },
];

export default function EmployeeShell() {
  const { user, profile, signOutUser, hasRole, isMainAdmin } = useAuth();
  const location = useLocation();
  // Solo el admin ve la salida hacia la interfaz de oficina: un empleado de
  // planta no debe tener forma de llegar allí desde este layout.
  const isAdminUser = isMainAdmin || hasRole('admin');
  const tabs = React.useMemo(
    () => TABS.filter((t) => !t.soloAlmacen || puedeAlmacen(hasRole)),
    // hasRole se rehace en cada render de AuthProvider; lo que decide es el perfil.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [profile?.roles, isMainAdmin]
  );

  React.useEffect(() => {
    const root = document.documentElement;
    try {
      if (localStorage.getItem("theme") === "dark") root.classList.add("dark");
      else root.classList.remove("dark");
    } catch {}
  }, []);

  const isActive = (tab) => (tab.end ? location.pathname === tab.to : location.pathname.startsWith(tab.to));

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gris-900 text-gray-900 dark:text-gray-200 transition-colors">
      <header className="fixed top-0 left-0 right-0 z-50 bg-white dark:bg-negro shadow flex items-center gap-3 px-4 h-14 border-b border-gray-200 dark:border-gris-700">
        <img src={logo} alt="Logo" className="h-9 w-auto select-none" />
        <span className="text-sm font-semibold truncate">Planta</span>
        <div className="ml-auto flex items-center gap-2">
          {isAdminUser && (
            <Link
              to="/dashboard"
              title="Volver a la interfaz principal (admin)"
              className="inline-flex items-center gap-1.5 h-9 px-2.5 rounded-lg border border-blue-500 bg-blue-50 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 text-xs font-medium"
            >
              <FaArrowLeft className="text-xs" />
              <span className="hidden sm:inline">Volver a admin</span>
            </Link>
          )}
          <NotificationBell />
          <button
            type="button"
            onClick={() => signOutUser()}
            title={user?.email || "Salir"}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-gray-300 dark:border-gris-600 bg-gray-50 dark:bg-gris-800 text-gray-700 dark:text-gray-200"
          >
            <FaSignOutAlt className="text-sm" />
          </button>
        </div>
      </header>

      <main className="pt-14 pb-20 min-h-screen max-w-lg mx-auto px-3">
        <Outlet />
      </main>

      <nav
        className="fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-negro border-t border-gray-200 dark:border-gris-700 grid"
        style={{ gridTemplateColumns: `repeat(${tabs.length}, minmax(0, 1fr))` }}
      >
        {tabs.map((tab) => {
          const active = isActive(tab);
          const Icon = tab.icon;
          return (
            <Link
              key={tab.to}
              to={tab.to}
              className={`flex flex-col items-center justify-center gap-0.5 py-2.5 min-h-[56px] text-xs font-medium ${
                active ? "text-trafico" : "text-gray-500 dark:text-gray-400"
              }`}
            >
              {/* La pestaña del perfil muestra la foto de quien tiene la sesión
                  abierta: en planta los turnos comparten el teléfono, y así se
                  ve de un vistazo con qué usuario se está firmando. */}
              {tab.to === "/planta/perfil" && profile?.fotoURL ? (
                <AvatarPerfil perfil={profile} email={user?.email} size={20} />
              ) : (
                <Icon className="text-lg" />
              )}
              {tab.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
