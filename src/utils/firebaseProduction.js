import { db, waitForAuth } from "../firebase";
import {
  addDoc,
  collection,
  doc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  limit,
} from "firebase/firestore";

const ORDERS_COL = "produccion_ordenes";
const SHEETS_COL = "produccion_fichas";

export async function crearOrdenProduccion(data) {
  await waitForAuth();
  const ref = await addDoc(collection(db, ORDERS_COL), {
    nombre: data.nombre?.trim() || "",
    producto: data.producto?.trim() || "",
    cantidad: Number(data.cantidad || 0),
    estado: data.estado || "en_produccion",
    notas: data.notas || "",
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

export async function listarOrdenesProduccion() {
  await waitForAuth();
  const q = query(collection(db, ORDERS_COL), orderBy("createdAt", "desc"), limit(200));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function actualizarOrdenProduccion(id, data) {
  await waitForAuth();
  await updateDoc(doc(db, ORDERS_COL, id), {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

export async function crearFichaFabricacion(data) {
  await waitForAuth();
  const ref = await addDoc(collection(db, SHEETS_COL), {
    titulo: data.titulo?.trim() || "",
    ordenId: data.ordenId || "",
    contenido: data.contenido || "",
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

export async function listarFichasFabricacion() {
  await waitForAuth();
  const q = query(collection(db, SHEETS_COL), orderBy("createdAt", "desc"), limit(200));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function actualizarFichaFabricacion(id, data) {
  await waitForAuth();
  await updateDoc(doc(db, SHEETS_COL, id), {
    ...data,
    updatedAt: serverTimestamp(),
  });
}
