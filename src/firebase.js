// src/firebase.js
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth, signInAnonymously, onAuthStateChanged } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyBFIrsU54TWKOXZCLAn5eUyAib3McHhBeY",
  authDomain: "cotizadorccs-38398.firebaseapp.com",
  projectId: "cotizadorccs-38398",
  storageBucket: "cotizadorccs-38398.firebasestorage.app",
  messagingSenderId: "635864265146",
  appId: "1:635864265146:web:81160bb537d67792f06d83",
  measurementId: "G-LSJQ1Q47ZV"
};


const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// Exponer helpers para esperar autenticación y reportar errores de auth
let resolveAuthReady;
const authReady = new Promise((res)=>{ resolveAuthReady = res; });
let authErrorCode = null;

// Intentar autenticación anónima para habilitar permisos de lectura/escritura si las reglas lo requieren
signInAnonymously(auth).catch((e)=>{
  authErrorCode = e?.code || 'auth/unknown-error';
  console.error("Anonymous auth failed", e);
  // Aunque falle, continuamos; onAuthStateChanged igualmente resolverá con null
});

// Resolver cuando tengamos un usuario (o null si no hay)
onAuthStateChanged(auth, (user)=>{
  // console.debug('Auth state:', user?.uid || 'no-user');
  if (resolveAuthReady) resolveAuthReady(user || null);
});

export function waitForAuth(){ return authReady; }
export function getAuthError(){ return authErrorCode; }

export { db, auth };
