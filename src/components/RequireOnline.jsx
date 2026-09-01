import React, { useCallback, useEffect, useRef, useState } from "react";

// Mismo hosting que usa el actualizador OTA (ver utils/otaUpdater.js) — si
// este no responde, Firestore tampoco lo hará, así que sirve como
// comprobación real de internet y no solo de la interfaz de red local.
// Dominio .firebaseapp.com (no .web.app): es el que la CSP de la app permite
// en connect-src (ver vite.config.js y firebase.json) — con .web.app el
// propio navegador bloquearía el fetch y todo el mundo vería "sin conexión"
// aunque sí la tuviera.
// `mode: "no-cors"` evita además falsos "sin conexión" por CORS: el fetch
// solo falla si la petición de red en sí falla.
const PING_URL = "https://cotizadorccs-38398.firebaseapp.com/";
const PING_TIMEOUT_MS = 6000;
const RETRY_INTERVAL_MS = 5000;

async function hayInternet() {
  if (typeof navigator !== "undefined" && navigator.onLine === false) return false;
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), PING_TIMEOUT_MS);
    await fetch(PING_URL, { method: "HEAD", mode: "no-cors", cache: "no-store", signal: controller.signal });
    clearTimeout(timer);
    return true;
  } catch {
    return false;
  }
}

/**
 * Bloquea a sus hijos hasta confirmar una conexión real a internet — no basta
 * con navigator.onLine porque sigue en true con una sesión de Firebase Auth
 * en caché y la PWA servida desde el service worker, que es justo el caso
 * (empleado sin internet accediendo al cotizador) que esto evita.
 */
export default function RequireOnline({ children }) {
  const [online, setOnline] = useState(null); // null = verificando
  const timerRef = useRef(null);

  const verificar = useCallback(async () => {
    setOnline(await hayInternet());
  }, []);

  useEffect(() => {
    verificar();
    const onOnline = () => verificar();
    const onOffline = () => setOnline(false);
    // Revisa de nuevo cuando la app vuelve a primer plano (celular que
    // estuvo en segundo plano toda la jornada, por ejemplo).
    const onVisible = () => {
      if (document.visibilityState === "visible") verificar();
    };
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [verificar]);

  useEffect(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (online === false) {
      timerRef.current = setInterval(verificar, RETRY_INTERVAL_MS);
    }
    return () => clearInterval(timerRef.current);
  }, [online, verificar]);

  if (online) return children;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gris-900 px-4">
      <div className="w-full max-w-md bg-white dark:bg-gris-800 border border-gray-200 dark:border-gris-700 rounded-2xl shadow p-8 text-center">
        <div className="text-4xl mb-4">📶</div>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
          {online === null ? "Verificando conexión…" : "Se requiere conexión a internet"}
        </h2>
        <p className="text-sm text-gray-600 dark:text-gray-300 mb-6">
          {online === null
            ? "Un momento…"
            : "El Cotizador necesita internet para continuar. Conéctate a una red y vuelve a intentarlo."}
        </p>
        {online === false && (
          <button
            type="button"
            onClick={verificar}
            className="px-5 py-2 rounded-lg border border-gray-300 dark:border-gris-600 bg-gray-100 dark:bg-gris-700 hover:bg-gray-200 dark:hover:bg-gris-600 text-sm text-gray-700 dark:text-gray-200"
          >
            Reintentar
          </button>
        )}
      </div>
    </div>
  );
}
