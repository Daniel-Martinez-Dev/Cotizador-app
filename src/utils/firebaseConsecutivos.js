import { db, waitForAuth } from "../firebase";
import { doc, runTransaction } from "firebase/firestore";

const CONSECUTIVOS_COL = "consecutivos";
const GLOBAL_DOC = "orden_produccion_global";
// Consecutivo legado — antes de esta migración, solo División Térmica tenía
// numeración automática, en su propio contador. Se lee una única vez (al
// crear el contador global) para continuar desde ahí y no repetir números
// ya asignados/impresos en fichas de división existentes.
const LEGACY_DIVISION_DOC = "orden_produccion_division";

// Consecutivo único de "orden de producción", compartido por las 4 fichas de
// producción (División Térmica, Sello de Andén, Abrigo Retráctil, Puertas
// Rápidas) — antes cada producto numeraba por su cuenta (o no numeraba en
// absoluto y solo mostraba la posición en la lista). Asignado por
// transacción para evitar colisiones si dos fichas de cualquier producto se
// crean casi al mismo tiempo.
export async function getNextOrdenProduccionGlobal() {
  await waitForAuth();
  const ref = doc(db, CONSECUTIVOS_COL, GLOBAL_DOC);
  const legacyRef = doc(db, CONSECUTIVOS_COL, LEGACY_DIVISION_DOC);
  return runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    let next;
    if (snap.exists()) {
      next = (snap.data().numero || 0) + 1;
    } else {
      const legacySnap = await tx.get(legacyRef);
      next = (legacySnap.exists() ? (legacySnap.data().numero || 0) : 0) + 1;
    }
    tx.set(ref, { numero: next }, { merge: true });
    return next;
  });
}
