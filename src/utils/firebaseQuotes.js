import { db, auth } from "../firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { writeRateLimiter } from "./rateLimiter";

export async function guardarCotizacionEnFirebase(cotizacion, numero) {
  const uid = auth.currentUser?.uid ?? 'anon';

  if (!writeRateLimiter.isAllowed(uid)) {
    const wait = Math.ceil(writeRateLimiter.retryAfterMs(uid) / 1000);
    throw new Error(`Límite de guardado alcanzado. Intenta en ${wait}s.`);
  }

  try {
    const cotizacionLimpia = { ...cotizacion };
    if (cotizacionLimpia.numero !== undefined) delete cotizacionLimpia.numero;

    await addDoc(collection(db, "cotizaciones"), {
      ...cotizacionLimpia,
      numero,
      uid: auth.currentUser?.uid ?? null, // RLS: vincular doc al usuario dueño
      timestamp: serverTimestamp(),
    });
  } catch (error) {
    console.error("Error al guardar la cotización:", error);
    throw error;
  }
}
