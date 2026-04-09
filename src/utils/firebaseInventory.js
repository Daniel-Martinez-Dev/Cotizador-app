import { db, waitForAuth } from "../firebase";
import {
  addDoc,
  collection,
  doc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";

const ITEMS_COL = "inventario_items";
const SUPPLIERS_COL = "inventario_proveedores";

export async function crearProveedor(data) {
  await waitForAuth();
  const ref = await addDoc(collection(db, SUPPLIERS_COL), {
    nombre: data.nombre?.trim() || "",
    contacto: data.contacto || "",
    telefono: data.telefono || "",
    email: data.email || "",
    leadTimeDias: Number(data.leadTimeDias || 0),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

export async function listarProveedores() {
  await waitForAuth();
  const q = query(collection(db, SUPPLIERS_COL), orderBy("createdAt", "desc"), limit(200));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function actualizarProveedor(id, data) {
  await waitForAuth();
  await updateDoc(doc(db, SUPPLIERS_COL, id), { ...data, updatedAt: serverTimestamp() });
}

export async function crearItemInventario(data) {
  await waitForAuth();
  const ref = await addDoc(collection(db, ITEMS_COL), {
    sku: (data.sku || "").trim(),
    nombre: (data.nombre || "").trim(),
    unidad: (data.unidad || "").trim(),
    stockActual: Number(data.stockActual || 0),
    stockMinimo: Number(data.stockMinimo || 0),
    proveedorId: data.proveedorId || "",
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

export async function listarItemsInventario() {
  await waitForAuth();
  const q = query(collection(db, ITEMS_COL), orderBy("createdAt", "desc"), limit(200));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function actualizarItemInventario(id, data) {
  await waitForAuth();
  await updateDoc(doc(db, ITEMS_COL, id), { ...data, updatedAt: serverTimestamp() });
}
