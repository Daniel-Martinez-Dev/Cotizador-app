import { db } from "../firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";

export async function guardarCotizacionEnFirebase(cotizacion, numero) {
  try {
    console.log("Ejecutando guardarCotizacionEnFirebase..."); // ⚠️ prueba
    await addDoc(collection(db, "cotizaciones"), {
      numero,
      ...cotizacion,
      timestamp: serverTimestamp()
    });
    console.log("Cotización guardada en Firebase");
  } catch (error) {
    console.error("Error al guardar la cotización:", error);
  }
}

