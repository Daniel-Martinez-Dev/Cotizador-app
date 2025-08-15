import { db } from "../firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";

export async function guardarCotizacionEnFirebase(cotizacion, numero) {
  try {
    // Evitar que un numero antiguo dentro de la cotizacion sobreescriba el consecutivo nuevo
    const cotizacionLimpia = { ...cotizacion };
    if (cotizacionLimpia.numero !== undefined) delete cotizacionLimpia.numero;

    await addDoc(collection(db, "cotizaciones"), {
      ...cotizacionLimpia,
      numero, // el consecutivo correcto siempre al final
      timestamp: serverTimestamp()
    });
  } catch (error) {
    console.error("Error al guardar la cotización:", error);
  }
}

