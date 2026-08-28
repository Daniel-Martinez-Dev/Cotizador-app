// src/firebase.js
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import {
  browserLocalPersistence,
  browserPopupRedirectResolver,
  getAuth,
  indexedDBLocalPersistence,
  initializeAuth,
  onAuthStateChanged,
  signInAnonymously,
} from "firebase/auth";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};

const missingKeys = Object.entries(firebaseConfig)
  .filter(([, value]) => !value)
  .map(([key]) => key);
if (missingKeys.length) {
  console.error(
    "Firebase config is missing env vars:",
    missingKeys.join(", ")
  );
}


// Sin Storage a propósito: las imágenes de la app van a Cloudinary (ver
// cloudinary.js) porque activar Firebase Storage obliga a pasar a plan Blaze.
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
// La sesión se guarda a mano en vez de dejar que `getAuth` elija: su lista por
// defecto termina en `browserSessionPersistence` y en memoria, y cuando el
// WebView de Android o Electron le niegan IndexedDB cae ahí sin avisar. El
// resultado era el que reportaba la gente: se cierra la app y hay que volver a
// iniciar sesión. Con esta lista solo quedan almacenes que sobreviven al cierre.
function crearAuth() {
  try {
    return initializeAuth(app, {
      persistence: [indexedDBLocalPersistence, browserLocalPersistence],
      popupRedirectResolver: browserPopupRedirectResolver,
    });
  } catch (e) {
    // `auth/already-initialized`: pasa con el recargado en caliente de Vite.
    return getAuth(app);
  }
}

const auth = crearAuth();

// Sin esto el sistema puede borrar IndexedDB del origen cuando anda escaso de
// espacio —y con ella la sesión—. Marcarlo como almacenamiento persistente le
// pide que no la desaloje. Si el navegador no lo soporta, no pasa nada.
if (typeof navigator !== "undefined" && navigator.storage?.persist) {
  navigator.storage
    .persisted()
    .then((yaEsPersistente) => (yaEsPersistente ? true : navigator.storage.persist()))
    .catch(() => {});
}

// Exponer helpers para esperar autenticación y reportar errores de auth
let resolveAuthReady;
const authReady = new Promise((res)=>{ resolveAuthReady = res; });
let authErrorCode = null;

// Intentar autenticación anónima para habilitar permisos de lectura/escritura si las reglas lo requieren.
// Nota: si la app exige login real, la auth anónima suele estar deshabilitada en Firebase y genera
// `auth/operation-not-allowed`. Por eso, el valor por defecto depende de VITE_REQUIRE_LOGIN.
// - Forzar ON:  VITE_ANON_AUTH=true
// - Forzar OFF: VITE_ANON_AUTH=false
const requireLogin = String(import.meta.env.VITE_REQUIRE_LOGIN ?? 'true').toLowerCase() !== 'false';
const allowAnon = String(import.meta.env.VITE_ANON_AUTH ?? (requireLogin ? 'false' : 'true')).toLowerCase() !== 'false';
if (allowAnon) {
  signInAnonymously(auth).catch((e)=>{
    authErrorCode = e?.code || 'auth/unknown-error';
    console.error("Anonymous auth failed", e);
    // Aunque falle, continuamos; onAuthStateChanged igualmente resolverá con null
  });
}

// Resolver cuando tengamos un usuario (o null si no hay)
onAuthStateChanged(auth, (user)=>{
  // console.debug('Auth state:', user?.uid || 'no-user');
  if (resolveAuthReady) resolveAuthReady(user || null);
});

export function waitForAuth(){ return authReady; }
export function getAuthError(){ return authErrorCode; }

export { db, auth };
