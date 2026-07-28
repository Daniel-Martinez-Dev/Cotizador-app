import { db, waitForAuth } from "../firebase";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";

const FICHAS_COL = "fichas_abrigo_retractil";

const toIso = (v) => {
  if (!v) return null;
  if (v instanceof Date) return v.toISOString();
  return String(v);
};

export async function crearFichaAbrigoRetractil(input, calculo) {
  await waitForAuth();
  const ref = await addDoc(collection(db, FICHAS_COL), {
    numeroOP:          (input.numeroOP          || "").trim(),
    cliente:           (input.cliente           || "").trim(),
    cantidad:          Number(input.cantidad     || 1),
    fechaOrden:        toIso(input.fechaOrden),
    fechaEntrega:      toIso(input.fechaEntrega),
    auxiliarEncargado: (input.auxiliarEncargado || "TODOS").trim(),
    ancho:             Number(input.ancho),
    alto:              Number(input.alto),
    travesanos:        Number(input.travesanos   || 910),
    color:             (input.color              || "NEGRO").trim(),
    acabado:           input.acabado             || "PINTADO",
    llevaBanda:        input.llevaBanda          !== false,
    // Calculados
    medidas:              calculo.medidas,
    materiaPrimaPorAbrigo: calculo.materiaPrimaPorAbrigo,
    materiaPrimaTotal:    calculo.materiaPrimaTotal,
    alistamiento:         calculo.alistamiento,
    despacho:             calculo.despacho,
    // Control
    estado:    "borrador",
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

export async function listarFichasAbrigoRetractil({ max = 200 } = {}) {
  await waitForAuth();
  const q = query(collection(db, FICHAS_COL), orderBy("createdAt", "desc"), limit(max));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function actualizarFichaAbrigoRetractil(id, data) {
  await waitForAuth();
  await updateDoc(doc(db, FICHAS_COL, id), { ...data, updatedAt: serverTimestamp() });
}

export async function eliminarFichaAbrigoRetractil(id) {
  await waitForAuth();
  await deleteDoc(doc(db, FICHAS_COL, id));
}
