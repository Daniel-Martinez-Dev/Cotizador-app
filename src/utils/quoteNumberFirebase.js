// src/utils/quoteNumberFirebase.js
import { db } from "../firebase";
import { doc, runTransaction } from "firebase/firestore";

const contadorRef = doc(db, "consecutivos", "cotizacion");

export async function getNextQuoteNumber() {
  try {
    const nextNum = await runTransaction(db, async (transaction) => {
      const docSnap = await transaction.get(contadorRef);
      if (!docSnap.exists()) {
        transaction.set(contadorRef, { numero: 1 });
        return 1;
      }
      const current = docSnap.data().numero || 0;
      const next = current + 1;
      transaction.update(contadorRef, { numero: next });
      return next;
    });
    return nextNum;
  } catch (error) {
    console.error("Error obteniendo número de cotización:", error);
    return Date.now(); // fallback de emergencia
  }
}
