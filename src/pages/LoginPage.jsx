import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import toast from "react-hot-toast";
import { useAuth } from "../context/AuthContext";
import logo from "../assets/imagenes/logo.png";

const inputClass =
  "w-full px-3 py-2 border border-gray-300 dark:border-gris-600 rounded-md text-sm bg-white dark:bg-gris-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-trafico/60";

const btnPrimary =
  "w-full px-4 py-2 rounded bg-trafico text-black font-medium hover:opacity-90 disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-trafico/60 transition-opacity";

function authErrorMsg(code) {
  switch (code) {
    case "auth/email-already-in-use":
      return "Este correo ya está registrado.";
    case "auth/weak-password":
      return "La contraseña debe tener al menos 6 caracteres.";
    case "auth/invalid-email":
      return "El correo electrónico no es válido.";
    case "auth/user-not-found":
    case "auth/wrong-password":
    case "auth/invalid-credential":
      return "Correo o contraseña incorrectos.";
    case "auth/too-many-requests":
      return "Demasiados intentos fallidos. Intenta más tarde.";
    case "auth/user-disabled":
      return "Esta cuenta ha sido deshabilitada.";
    case "auth/network-request-failed":
      return "Error de conexión. Revisa tu internet.";
    default:
      return "Ocurrió un error. Intenta de nuevo.";
  }
}

export default function LoginPage() {
  const { signInWithEmail, signUpWithEmail, resetPassword, loading, isLoggedIn } =
    useAuth();

  const navigate = useNavigate();
  const location = useLocation();

  const [view, setView] = useState("login"); // "login" | "register" | "reset"
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [busy, setBusy] = useState(false);

  React.useEffect(() => {
    if (isLoggedIn) {
      const from = location.state?.from;
      navigate(from || "/dashboard", { replace: true });
    }
  }, [isLoggedIn, location.state, navigate]);

  const handleChange = (e) =>
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const handleLogin = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await signInWithEmail(form.email, form.password);
    } catch (err) {
      toast.error(authErrorMsg(err?.code));
    } finally {
      setBusy(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    if (!form.firstName.trim() || !form.lastName.trim()) {
      toast.error("Por favor ingresa tu nombre y apellido.");
      return;
    }
    if (form.password.length < 8) {
      toast.error("La contraseña debe tener al menos 8 caracteres.");
      return;
    }
    if (form.password !== form.confirmPassword) {
      toast.error("Las contraseñas no coinciden.");
      return;
    }
    setBusy(true);
    try {
      await signUpWithEmail(form.email, form.password, form.firstName, form.lastName);
    } catch (err) {
      toast.error(authErrorMsg(err?.code));
    } finally {
      setBusy(false);
    }
  };

  const handleReset = async (e) => {
    e.preventDefault();
    if (!form.email.trim()) {
      toast.error("Ingresa tu correo electrónico.");
      return;
    }
    setBusy(true);
    try {
      await resetPassword(form.email);
      toast.success("Correo de recuperación enviado. Revisa tu bandeja de entrada.");
      setView("login");
    } catch (err) {
      toast.error(authErrorMsg(err?.code));
    } finally {
      setBusy(false);
    }
  };

  const subtitles = {
    login: "Inicio de sesión",
    register: "Crear cuenta",
    reset: "Recuperar contraseña",
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gris-900 flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-white dark:bg-gris-800 border border-gray-200 dark:border-gris-700 rounded-lg shadow p-6">
        <div className="flex items-center gap-3 mb-6">
          <img src={logo} alt="Logo" className="h-10 w-auto" />
          <div>
            <div className="font-semibold text-gray-900 dark:text-white">
              Cotizador Cold Chain Services
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400">
              {subtitles[view]}
            </div>
          </div>
        </div>

        {view === "login" && (
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                Correo electrónico
              </label>
              <input
                name="email"
                type="email"
                required
                autoComplete="email"
                value={form.email}
                onChange={handleChange}
                className={inputClass}
                placeholder="nombre@ejemplo.com"
              />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">
                  Contraseña
                </label>
                <button
                  type="button"
                  onClick={() => setView("reset")}
                  className="text-xs text-trafico hover:underline"
                >
                  ¿Olvidaste tu contraseña?
                </button>
              </div>
              <input
                name="password"
                type="password"
                required
                autoComplete="current-password"
                value={form.password}
                onChange={handleChange}
                className={inputClass}
                placeholder="••••••••"
              />
            </div>
            <button type="submit" disabled={busy || loading} className={btnPrimary}>
              {busy ? "Ingresando..." : "Iniciar sesión"}
            </button>
            <p className="text-xs text-center text-gray-500 dark:text-gray-400">
              ¿No tienes cuenta?{" "}
              <button
                type="button"
                onClick={() => setView("register")}
                className="text-trafico font-medium hover:underline"
              >
                Crear cuenta
              </button>
            </p>
          </form>
        )}

        {view === "register" && (
          <form onSubmit={handleRegister} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                  Nombre
                </label>
                <input
                  name="firstName"
                  type="text"
                  required
                  autoComplete="given-name"
                  value={form.firstName}
                  onChange={handleChange}
                  className={inputClass}
                  placeholder="Juan"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                  Apellido
                </label>
                <input
                  name="lastName"
                  type="text"
                  required
                  autoComplete="family-name"
                  value={form.lastName}
                  onChange={handleChange}
                  className={inputClass}
                  placeholder="Pérez"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                Correo electrónico
              </label>
              <input
                name="email"
                type="email"
                required
                autoComplete="email"
                value={form.email}
                onChange={handleChange}
                className={inputClass}
                placeholder="nombre@ejemplo.com"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                Contraseña
              </label>
              <input
                name="password"
                type="password"
                required
                minLength={8}
                autoComplete="new-password"
                value={form.password}
                onChange={handleChange}
                className={inputClass}
                placeholder="Mínimo 8 caracteres"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                Confirmar contraseña
              </label>
              <input
                name="confirmPassword"
                type="password"
                required
                autoComplete="new-password"
                value={form.confirmPassword}
                onChange={handleChange}
                className={inputClass}
                placeholder="Repite tu contraseña"
              />
            </div>
            <button type="submit" disabled={busy || loading} className={btnPrimary}>
              {busy ? "Creando cuenta..." : "Crear cuenta"}
            </button>
            <p className="text-xs text-center text-gray-500 dark:text-gray-400">
              ¿Ya tienes cuenta?{" "}
              <button
                type="button"
                onClick={() => setView("login")}
                className="text-trafico font-medium hover:underline"
              >
                Iniciar sesión
              </button>
            </p>
          </form>
        )}

        {view === "reset" && (
          <form onSubmit={handleReset} className="space-y-4">
            <p className="text-sm text-gray-600 dark:text-gray-300">
              Ingresa tu correo y te enviaremos un enlace para restablecer tu
              contraseña.
            </p>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                Correo electrónico
              </label>
              <input
                name="email"
                type="email"
                required
                autoComplete="email"
                value={form.email}
                onChange={handleChange}
                className={inputClass}
                placeholder="nombre@ejemplo.com"
              />
            </div>
            <button type="submit" disabled={busy} className={btnPrimary}>
              {busy ? "Enviando..." : "Enviar correo de recuperación"}
            </button>
            <p className="text-xs text-center text-gray-500 dark:text-gray-400">
              <button
                type="button"
                onClick={() => setView("login")}
                className="text-trafico font-medium hover:underline"
              >
                Volver al inicio de sesión
              </button>
            </p>
          </form>
        )}

        <p className="mt-5 text-xs text-gray-500 dark:text-gray-400 border-t border-gray-100 dark:border-gris-700 pt-4">
          Al registrarte, un administrador debe aprobar tu acceso antes de que
          puedas usar la aplicación.
        </p>
      </div>
    </div>
  );
}
