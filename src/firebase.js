// src/firebase.js
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth, signInAnonymously, onAuthStateChanged } from "firebase/auth";

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


const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

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
