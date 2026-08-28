import React from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { FaAngleLeft, FaPlus, FaTimes } from "react-icons/fa";
import UserMenu from "./UserMenu";
import AvatarPerfil from "../perfil/AvatarPerfil";
import { NavAgrupada } from "./AppSidebar";
import { gruposVisibles, seccionDe } from "./navSections";
import logo from "../../assets/imagenes/logo.png";
import menuIcon from "../../assets/imagenes/menu-icon.png";

// Barra superior: identidad a la izquierda, la acción principal y la cuenta a
// la derecha. Las secciones no viven aquí — están en el lateral (AppSidebar),
// agrupadas por lo que se hace con ellas.
//
// Vive fuera de AppShell a propósito: cuando se declaraba dentro de su render,
// React la desmontaba y volvía a montar en cada render, y el cajón móvil perdía
// su estado de abierto.
export const HEADER_ALTO = 56;

function BotonVolver() {
  const navigate = useNavigate();
  const handleBack = () => {
    const idx = window.history?.state?.idx;
    if (typeof idx === "number" && idx > 0) navigate(-1);
    else navigate("/dashboard");
  };
  return (
    <button
      type="button"
      onClick={handleBack}
      title="Volver a la pantalla anterior"
      className="hidden sm:inline-flex shrink-0 items-center gap-1 h-9 px-2.5 rounded-lg text-sm font-medium text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gris-800 hover:text-gray-900 dark:hover:text-white focus:outline-none focus:ring-2 focus:ring-trafico/60"
    >
      <FaAngleLeft className="text-base" />
      <span className="hidden lg:inline">Volver</span>
    </button>
  );
}

function CajonMovil({ grupos, activaTo, onNueva, user, profile, dark, onToggleTheme, onSignOut, isAdminUser, requireLogin }) {
  const [open, setOpen] = React.useState(false);
  const cerrar = () => setOpen(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="md:hidden inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-gray-300 dark:border-gris-600 bg-gray-50 dark:bg-gris-800 text-gray-700 dark:text-gray-200"
        aria-label="Abrir menú"
      >
        <img src={menuIcon} alt="" className="h-5 w-5 dark:invert dark:brightness-200" />
      </button>

      {open && (
        <div className="md:hidden fixed inset-0 z-[999]">
          <button type="button" className="absolute inset-0 bg-black/40" onClick={cerrar} aria-label="Cerrar menú" />
          <aside className="absolute left-0 top-0 h-full w-72 bg-white dark:bg-gris-900 border-r border-gray-200 dark:border-gris-700 shadow-2xl flex flex-col">
            <div className="flex items-center gap-3 px-4 h-14 shrink-0 border-b border-gray-200 dark:border-gris-700">
              <AvatarPerfil perfil={profile} email={user?.email} size={32} />
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium truncate">{profile?.displayName || "Mi cuenta"}</div>
                {user?.email && <div className="text-[11px] text-gray-500 dark:text-gray-400 truncate">{user.email}</div>}
              </div>
              <button type="button" onClick={cerrar} aria-label="Cerrar menú"
                className="h-8 w-8 shrink-0 inline-flex items-center justify-center rounded border border-gray-300 dark:border-gris-600 bg-gray-50 dark:bg-gris-800">
                <FaTimes className="text-xs" />
              </button>
            </div>

            {/* Los mismos grupos del lateral: quien usa el teléfono y quien usa
                el escritorio aprenden un solo menú. */}
            <nav className="flex-1 flex flex-col overflow-y-auto p-2">
              <NavAgrupada grupos={grupos} activaTo={activaTo} onNavegar={cerrar} />
              <div className="mt-2 pt-2 border-t border-gray-200 dark:border-gris-700 grid gap-0.5">
                <Link to="/perfil" onClick={cerrar}
                  className="flex items-center h-9 px-4 rounded-lg text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gris-800">
                  Mi perfil
                </Link>
                <button type="button" onClick={() => { onToggleTheme(); cerrar(); }}
                  className="flex items-center h-9 px-4 rounded-lg text-sm font-medium text-left text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gris-800">
                  Tema {dark ? "claro" : "oscuro"}
                </button>
                {isAdminUser && (
                  <Link to="/planta" onClick={cerrar}
                    className="flex items-center h-9 px-4 rounded-lg text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gris-800">
                    Vista de planta
                  </Link>
                )}
                {requireLogin && (
                  <button type="button" onClick={() => { cerrar(); onSignOut(); }}
                    className="flex items-center h-9 px-4 rounded-lg text-sm font-medium text-left text-red-600 dark:text-red-400 hover:bg-gray-100 dark:hover:bg-gris-800">
                    Cerrar sesión
                  </button>
                )}
              </div>
            </nav>

            <div className="p-3 shrink-0 border-t border-gray-200 dark:border-gris-700">
              <button type="button" onClick={() => { cerrar(); onNueva(); }}
                className="w-full inline-flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-sm font-semibold bg-green-600 hover:bg-green-500 text-white">
                <FaPlus className="text-xs" /> Nueva cotización
              </button>
            </div>
          </aside>
        </div>
      )}
    </>
  );
}

export default function AppHeader({
  permisos,
  user,
  profile,
  dark,
  onToggleTheme,
  onSignOut,
  onNuevaCotizacion,
  quoteData,
  onSalirEdicion,
  requireLogin,
}) {
  const location = useLocation();
  const grupos = React.useMemo(() => gruposVisibles(permisos), [permisos]);
  const actual = seccionDe(location.pathname);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 h-14 flex items-center gap-2 px-3 sm:px-4 bg-white dark:bg-negro text-gray-900 dark:text-gray-200 border-b border-gray-200 dark:border-gris-700 shadow-sm">
      <CajonMovil
        grupos={grupos}
        activaTo={actual?.to}
        onNueva={onNuevaCotizacion}
        user={user}
        profile={profile}
        dark={dark}
        onToggleTheme={onToggleTheme}
        onSignOut={onSignOut}
        isAdminUser={permisos?.isAdminUser}
        requireLogin={requireLogin}
      />

      <Link to="/dashboard" className="flex items-center gap-2.5 shrink-0 rounded focus:outline-none focus:ring-2 focus:ring-trafico/60">
        <img src={logo} alt="C-Chain Services" className="h-9 w-auto select-none" />
        <span className="hidden lg:block leading-tight">
          <span className="block text-[13px] font-semibold text-gray-900 dark:text-white">C-Chain Services</span>
          <span className="block text-[11px] text-gray-500 dark:text-gray-400">Cotizador</span>
        </span>
      </Link>

      <BotonVolver />

      {/* En móvil no hay lateral: el nombre de la sección actual es lo que dice
          dónde estás. */}
      {actual && (
        <span className="md:hidden flex items-center gap-2 min-w-0 text-sm font-semibold truncate">
          <actual.icon className="text-trafico shrink-0" />
          <span className="truncate">{actual.label}</span>
        </span>
      )}

      <div className="ml-auto flex items-center gap-2">
        {quoteData?.modoEdicion && (
          <div className="hidden sm:flex items-center gap-2 px-2.5 py-1 rounded-full border border-amber-400 bg-amber-50 text-amber-800 dark:bg-gris-800 dark:border-trafico dark:text-trafico text-xs font-medium">
            <span>Editando #{quoteData.numero || "—"}</span>
            <button
              type="button"
              onClick={onSalirEdicion}
              title="Salir del modo edición"
              className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-amber-800/80 dark:bg-trafico text-white dark:text-black hover:opacity-80 focus:outline-none focus:ring-2 focus:ring-red-400"
            >
              <FaTimes className="text-[8px]" />
            </button>
          </div>
        )}

        <button
          type="button"
          onClick={onNuevaCotizacion}
          title="Iniciar una cotización nueva"
          className="inline-flex items-center gap-2 h-9 px-3 rounded-lg text-sm font-semibold bg-green-600 hover:bg-green-500 text-white shadow-sm focus:outline-none focus:ring-2 focus:ring-trafico/60"
        >
          <FaPlus className="text-xs" />
          <span className="hidden sm:inline">Nueva cotización</span>
        </button>

        <span className="hidden sm:block h-6 w-px bg-gray-200 dark:bg-gris-700" />

        <UserMenu
          user={user}
          profile={profile}
          dark={dark}
          onToggleTheme={onToggleTheme}
          onSignOut={onSignOut}
          isAdminUser={permisos?.isAdminUser}
          requireLogin={requireLogin}
        />
      </div>
    </header>
  );
}
