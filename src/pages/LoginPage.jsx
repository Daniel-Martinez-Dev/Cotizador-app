import React from "react";
import { useNavigate, useLocation } from "react-router-dom";
import toast from "react-hot-toast";
import { useAuth } from "../context/AuthContext";
import logo from "../assets/imagenes/logo.png";

export default function LoginPage() {
  const { signInWithGoogle, loading, isLoggedIn } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  React.useEffect(() => {
    if (isLoggedIn) {
      const from = location.state?.from;
      navigate(from || "/dashboard", { replace: true });
    }
  }, [isLoggedIn, location.state, navigate]);

  const handleGoogle = async () => {
    try {
      await signInWithGoogle();
    } catch (e) {
      console.error(e);
      const code = e?.code;
      const msg =
        code === "auth/operation-not-allowed"
          ? "El proveedor Google no está habilitado en Firebase Authentication (Sign-in method)."
          : code === "auth/unauthorized-domain"
            ? "Este dominio no está autorizado en Firebase Auth. Agrega localhost/electron a 'Authorized domains'."
            : code === "auth/popup-blocked"
              ? "El navegador bloqueó la ventana emergente. Intenta de nuevo o permite popups."
              : "No se pudo iniciar sesión. Revisa la configuración de Firebase Auth.";

      toast.error(msg);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gris-900 flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-white dark:bg-gris-800 border border-gray-200 dark:border-gris-700 rounded-lg shadow p-6">
        <div className="flex items-center gap-3 mb-4">
          <img src={logo} alt="Logo" className="h-10 w-auto" />
          <div>
            <div className="font-semibold text-gray-900 dark:text-white">Cotizador Cold Chain Services</div>
            <div className="text-xs text-gray-600 dark:text-gray-300">Inicio de sesión</div>
          </div>
        </div>

        <button
          type="button"
          onClick={handleGoogle}
          disabled={loading}
          className="w-full px-4 py-2 rounded bg-trafico text-black font-medium hover:opacity-90 disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-trafico/60"
        >
          Continuar con Google
        </button>

        <p className="mt-4 text-xs text-gray-600 dark:text-gray-300">
          Si es tu primera vez, un administrador debe habilitar tus permisos.
        </p>
      </div>
    </div>
  );
}
