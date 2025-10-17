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

// Normaliza NIT: elimina comillas dobles/tipográficas y espacios
const sanitizeNIT = (nit) => (nit ?? "").toString().replace(/["“”]/g, "").trim();

// --- EMPRESAS ---
export async function obtenerEmpresaPorNIT(nit) {
  if(!nit) return null;
  const nitNorm = sanitizeNIT(nit);
  // 1) Buscar por NIT normalizado (sin comillas)
  let q1 = query(collection(db, COL), where("nit","==", nitNorm), limit(1));
  let snap = await getDocs(q1);
  // 2) Fallback: algunos registros pudieron guardarse con comillas alrededor
  if (snap.empty) {
    const quoted = `"${nitNorm}"`;
    const q2 = query(collection(db, COL), where("nit","==", quoted), limit(1));
    snap = await getDocs(q2);
  }
  if (snap.empty) return null;
  const d = snap.docs[0];
  const data = d.data();
  return { id: d.id, ...data, nit: sanitizeNIT(data.nit) };
}

export async function crearEmpresa(data){
  const ref = await addDoc(collection(db, COL), {
  nit: sanitizeNIT(data.nit),
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
  const payload = { ...data };
  if (payload.nit != null) payload.nit = sanitizeNIT(payload.nit);
  await updateDoc(doc(db, COL, id), { ...payload, updatedAt: serverTimestamp() });
}

export async function eliminarEmpresa(id){
  await deleteDoc(doc(db, COL, id));
}

export async function listarEmpresas(){
  const q = query(collection(db, COL), orderBy("nombre","asc"));
  const snap = await getDocs(q);
  return snap.docs.map(d=>{ const data = d.data(); return { id:d.id, ...data, nit: sanitizeNIT(data.nit) }; });
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
