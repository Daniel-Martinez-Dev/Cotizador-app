import { db, waitForAuth } from "../firebase";
import { doc, runTransaction } from "firebase/firestore";

const CONSECUTIVOS_COL = "consecutivos";
const GLOBAL_DOC = "orden_produccion_global";
// Consecutivo legado — antes de esta migración, solo División Térmica tenía
// numeración automática, en su propio contador. Se lee una única vez (al
// crear el contador global) para continuar desde ahí y no repetir números
// ya asignados/impresos en fichas de división existentes.
const LEGACY_DIVISION_DOC = "orden_produccion_division";
// Contador de materiales de inventario (SKU + código de barras).
const MATERIAL_DOC = "inventario_material";

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

// Consecutivo de materiales de inventario, del que salen a la vez el SKU y el
// código de barras (ver utils/codigoMaterial.js). Va aparte del de producción:
// son numeraciones de cosas distintas y mezclarlas dejaría huecos en ambas.
//
// Reserva un bloque de una sola vez en lugar de pedir número por número, porque
// el caso normal es marcar de golpe todo el inventario que aún no tiene
// etiqueta: con 150 materiales serían 150 transacciones contra la misma fila,
// que es justo lo que Firestore penaliza. Devuelve el primer número del bloque;
// los `cantidad` números a partir de ahí quedan apartados para quien llamó.
export async function reservarConsecutivosMaterial(cantidad = 1) {
  await waitForAuth();
  const n = Math.max(1, Math.trunc(Number(cantidad) || 1));
  const ref = doc(db, CONSECUTIVOS_COL, MATERIAL_DOC);
  return runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    const usados = snap.exists() ? Number(snap.data().numero || 0) : 0;
    const desde = usados + 1;
    tx.set(ref, { numero: usados + n }, { merge: true });
    return desde;
  });
}
