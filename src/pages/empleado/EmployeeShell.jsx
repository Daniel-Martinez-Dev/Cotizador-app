import React from "react";
import { Link, Outlet, useLocation } from "react-router-dom";
import { FaHome, FaIndustry, FaBoxes, FaSignOutAlt, FaArrowLeft } from "react-icons/fa";
import { useAuth } from "../../context/AuthContext";
import NotificationBell from "../../components/empleado/NotificationBell";
import logo from "../../assets/imagenes/logo.png";

// Layout mobile-first para el panel de empleados de planta ("/planta/*").
// Deliberadamente no reutiliza AppShell (src/App.jsx): no muestra ninguno de
// los módulos de oficina (cotizar, historial, empresas, productos, admin de
// producción/inventario), solo el logo, la campana de notificaciones y un
// tab bar inferior con las dos secciones permitidas.
const TABS = [
  { to: "/planta", label: "Inicio", icon: FaHome, end: true },
  { to: "/planta/produccion", label: "Producción", icon: FaIndustry },
  { to: "/planta/inventario", label: "Materia prima", icon: FaBoxes },
];

export default function EmployeeShell() {
  const { user, signOutUser, hasRole, isMainAdmin } = useAuth();
  const location = useLocation();
  // Solo el admin ve la salida hacia la interfaz de oficina: un empleado de
  // planta no debe tener forma de llegar allí desde este layout.
  const isAdminUser = isMainAdmin || hasRole('admin');

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

      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-negro border-t border-gray-200 dark:border-gris-700 grid grid-cols-3">
        {TABS.map((tab) => {
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
              <Icon className="text-lg" />
              {tab.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
