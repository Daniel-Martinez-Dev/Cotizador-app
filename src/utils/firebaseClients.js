// src/utils/firebaseClients.js
// CRUD utilidades para la colección "clientes" en Firestore.
//
// OJO: esta colección quedó obsoleta. La base de clientes de la aplicación es
// `empresas` (+ su subcolección `contactos`, ver firebaseCompanies.js): es la
// que usan el cotizador y las fichas de fabricación, y a la que apunta el
// `clienteId` de una ficha (ver clienteVinculo.js). Su única pantalla,
// ClientsPage.jsx, ya no está enrutada en App.jsx. No escribir clientes nuevos
// aquí: quedarían fuera de la relación cliente ↔ cotización ↔ ficha.
import { db } from "../firebase";
import {
  collection,
  addDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp,
  query,
  orderBy
} from "firebase/firestore";

const COL = "clientes";

export async function listarClientes() {
  const q = query(collection(db, COL), orderBy("nombre", "asc"));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function crearCliente(data) {
  const ref = await addDoc(collection(db, COL), {
    nombre: data.nombre?.trim() || "",
    contacto: data.contacto || "",
    nit: data.nit || "",
    ciudad: data.ciudad || "",
    email: data.email || "",
    telefono: data.telefono || "",
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });
  return ref.id;
}

export async function actualizarCliente(id, data) {
  await updateDoc(doc(db, COL, id), {
    ...data,
    updatedAt: serverTimestamp()
  });
}

export async function eliminarCliente(id) {
  await deleteDoc(doc(db, COL, id));
}
