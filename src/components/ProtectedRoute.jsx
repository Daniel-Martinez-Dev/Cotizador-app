import React from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import RequireOnline from "./RequireOnline";

function PendingScreen({ onSignOut }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gris-900 px-4">
      <div className="w-full max-w-md bg-white dark:bg-gris-800 border border-gray-200 dark:border-gris-700 rounded-2xl shadow p-8 text-center">
        <div className="text-4xl mb-4">⏳</div>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
          Acceso pendiente de aprobación
        </h2>
        <p className="text-sm text-gray-600 dark:text-gray-300 mb-6">
          Tu cuenta está registrada. Un administrador debe aprobar tu acceso
          antes de que puedas usar la aplicación.
        </p>
        <button
          type="button"
          onClick={onSignOut}
          className="px-5 py-2 rounded-lg border border-gray-300 dark:border-gris-600 bg-gray-100 dark:bg-gris-700 hover:bg-gray-200 dark:hover:bg-gris-600 text-sm text-gray-700 dark:text-gray-200"
        >
          Cerrar sesión
        </button>
      </div>
    </div>
  );
}

/**
 * @param {string}   [requireRole]     rol requerido en el perfil
 * @param {string[]} [requireAnyRole]  basta con tener uno de estos roles
 * @param {string}   [requireEmail]    email exacto requerido (comparación case-insensitive)
 * @param {string}   [redirectTo]      a dónde rebota quien no cumple. El
 *   default sirve para la oficina; las rutas de planta tienen que pasar
 *   "/planta" o mandarían al operario a una interfaz que no le corresponde.
 */
export default function ProtectedRoute({ requireRole, requireAnyRole, requireEmail, redirectTo = "/dashboard" }) {
  const { loading, isLoggedIn, isPending, hasRole, user, signOutUser } = useAuth();
  const location = useLocation();

  let content;
  if (loading) {
    content = (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gris-900 text-gray-900 dark:text-gray-100">
        <div className="text-sm opacity-80">Cargando…</div>
      </div>
    );
  } else if (!isLoggedIn) {
    content = <Navigate to="/login" replace state={{ from: location.pathname }} />;
  } else if (isPending) {
    // Usuario autenticado pero pendiente de aprobación
    content = <PendingScreen onSignOut={signOutUser} />;
  } else {
    const rolesAdmitidos = requireAnyRole || (requireRole ? [requireRole] : null);
    const userEmail = (user?.email ?? "").toLowerCase();
    if (rolesAdmitidos && !rolesAdmitidos.some((r) => hasRole(r))) {
      content = <Navigate to={redirectTo} replace state={{ denied: rolesAdmitidos.join(",") }} />;
    } else if (requireEmail && userEmail !== requireEmail.toLowerCase()) {
      content = <Navigate to={redirectTo} replace state={{ denied: "email" }} />;
    } else {
      content = <Outlet />;
    }
  }

  // Una sesión de Firebase Auth en caché sobrevive sin internet, así que sin
  // esta comprobación un empleado podría abrir el cotizador (o la interfaz de
  // planta) totalmente offline.
  return <RequireOnline>{content}</RequireOnline>;
}
