// Modelo separado Empresa -> Contactos
// Colección: empresas (única por NIT)
// Subcolección: contactos (multiples agentes de compras)
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
  where,
  orderBy,
  limit
} from "firebase/firestore";

const COL = "empresas";

// --- EMPRESAS ---
export async function obtenerEmpresaPorNIT(nit) {
  if(!nit) return null;
  const q = query(collection(db, COL), where("nit","==", nit), limit(1));
  const snap = await getDocs(q);
  if (snap.empty) return null;
  const d = snap.docs[0];
  return { id: d.id, ...d.data() };
}

export async function crearEmpresa(data){
  const ref = await addDoc(collection(db, COL), {
    nit: data.nit?.trim() || "",
    nombre: data.nombre?.trim() || "",
    ciudad: data.ciudad || "",
    direccion: data.direccion || "", // NUEVO: dirección principal de la empresa (opcional)
    emailGeneral: data.emailGeneral || "", // opcional
    telefonoGeneral: data.telefonoGeneral || "", // opcional
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });
  return ref.id;
}

export async function actualizarEmpresa(id, data){
  await updateDoc(doc(db, COL, id), { ...data, updatedAt: serverTimestamp() });
}

export async function eliminarEmpresa(id){
  await deleteDoc(doc(db, COL, id));
}

export async function listarEmpresas(){
  const q = query(collection(db, COL), orderBy("nombre","asc"));
  const snap = await getDocs(q);
  return snap.docs.map(d=>({ id:d.id, ...d.data() }));
}

// --- CONTACTOS ---
export async function listarContactos(empresaId){
  const snap = await getDocs(collection(db, COL, empresaId, "contactos"));
  return snap.docs.map(d=>({ id:d.id, ...d.data() }));
}

export async function buscarContactoPorEmail(empresaId, email){
  if(!email) return null;
  const q = query(collection(db, COL, empresaId, "contactos"), where("email","==", email), limit(1));
  const snap = await getDocs(q);
  if(snap.empty) return null;
  const d = snap.docs[0];
  return { id:d.id, ...d.data() };
}

export async function crearContacto(empresaId, data){
  const ref = await addDoc(collection(db, COL, empresaId, "contactos"), {
    nombre: data.nombre?.trim() || "",
    email: data.email || "",
    telefono: data.telefono || "",
    cargo: data.cargo || "",
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });
  return ref.id;
}

export async function actualizarContacto(empresaId, contactoId, data){
  await updateDoc(doc(db, COL, empresaId, "contactos", contactoId), { ...data, updatedAt: serverTimestamp() });
}

export async function eliminarContacto(empresaId, contactoId){
  await deleteDoc(doc(db, COL, empresaId, "contactos", contactoId));
}
