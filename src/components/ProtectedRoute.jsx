import React from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

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
 * @param {string} [requireRole]   rol requerido en el perfil
 * @param {string} [requireEmail]  email exacto requerido (comparación case-insensitive)
 */
export default function ProtectedRoute({ requireRole, requireEmail }) {
  const { loading, isLoggedIn, isPending, hasRole, user, signOutUser } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gris-900 text-gray-900 dark:text-gray-100">
        <div className="text-sm opacity-80">Cargando…</div>
      </div>
    );
  }

  if (!isLoggedIn) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  // Usuario autenticado pero pendiente de aprobación
  if (isPending) {
    return <PendingScreen onSignOut={signOutUser} />;
  }

  if (requireRole && !hasRole(requireRole)) {
    return <Navigate to="/dashboard" replace state={{ denied: requireRole }} />;
  }

  if (requireEmail) {
    const userEmail = (user?.email ?? "").toLowerCase();
    if (userEmail !== requireEmail.toLowerCase()) {
      return <Navigate to="/dashboard" replace state={{ denied: "email" }} />;
    }
  }

  return <Outlet />;
}
