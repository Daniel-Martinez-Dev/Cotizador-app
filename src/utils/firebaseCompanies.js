// Modelo separado Empresa -> Contactos
// Colección: empresas (única por NIT)
// Subcolección: contactos (multiples agentes de compras)
//
// Es la única base de clientes de la app: la usan el cotizador y las fichas de
// fabricación (ver clienteVinculo.js). Para dar de alta un cliente desde
// cualquier pantalla se usa `resolverOCrearEmpresa`, no `crearEmpresa` a secas:
// esa es la que consulta primero si el cliente ya existe. Ver empresaIdentidad.js.
import { db } from "../firebase";
import {
  collection,
  addDoc,
  getDocs,
  getDoc,
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp,
  query,
  where,
  orderBy,
  limit
} from "firebase/firestore";
import { resolverEmpresa, resolverContacto, claveNit } from "./empresaIdentidad";

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
  // 3) Último recurso: el mismo NIT escrito con puntos o guion no coincide en
  //    una consulta de igualdad, así que se compara por dígitos sobre la lista
  //    completa. Es una lectura cara, pero pasar de largo aquí es exactamente
  //    lo que venía creando la empresa por segunda vez.
  if (snap.empty) {
    const clave = claveNit(nitNorm);
    if (!clave) return null;
    const todas = await listarEmpresas();
    return todas.find((e) => claveNit(e.nit) === clave) || null;
  }
  const d = snap.docs[0];
  const data = d.data();
  return { id: d.id, ...data, nit: sanitizeNIT(data.nit) };
}

export async function obtenerEmpresa(id){
  if(!id) return null;
  const snap = await getDoc(doc(db, COL, id));
  if(!snap.exists()) return null;
  const data = snap.data();
  return { id: snap.id, ...data, nit: sanitizeNIT(data.nit) };
}

export async function crearEmpresa(data){
  const ref = await addDoc(collection(db, COL), {
  nit: sanitizeNIT(data.nit),
    nombre: data.nombre?.trim() || "",
    // Abreviación con la que se conoce al cliente en planta. Los nombres
    // legales largos no caben en la orden de producción; el alias sí, y es lo
    // que la gente reconoce. Ver clienteVinculo.js (nombreClienteImpreso).
    alias: data.alias?.trim() || "",
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

// Borra la empresa y sus contactos. Firestore no borra en cascada: hasta ahora
// la subcolección quedaba colgando, invisible y contando como datos del
// cliente eliminado.
export async function eliminarEmpresa(id){
  const contactos = await listarContactos(id);
  for (const c of contactos) {
    try { await eliminarContacto(id, c.id); } catch(e){ console.error("No se pudo borrar el contacto", c.id, e); }
  }
  await deleteDoc(doc(db, COL, id));
}

export async function listarEmpresas(){
  const q = query(collection(db, COL), orderBy("nombre","asc"));
  const snap = await getDocs(q);
  return snap.docs.map(d=>{ const data = d.data(); return { id:d.id, ...data, nit: sanitizeNIT(data.nit) }; });
}

// Campos que se pueden rellenar sobre una empresa existente sin pisar lo que ya
// tiene: si el registro venía sin NIT y ahora se cotiza con NIT, se completa.
// Nunca se sobrescribe un valor que ya estaba —para corregir un dato está la
// pantalla de empresas.
const CAMPOS_COMPLETABLES = ["nit", "alias", "ciudad", "direccion", "emailGeneral", "telefonoGeneral"];

function faltantes(empresa, datos){
  const patch = {};
  for (const campo of CAMPOS_COMPLETABLES) {
    const nuevo = String(datos?.[campo] ?? "").trim();
    const actual = String(empresa?.[campo] ?? "").trim();
    if (nuevo && !actual) patch[campo] = nuevo;
  }
  return patch;
}

/**
 * Punto único de alta de clientes. Busca primero si la empresa ya existe
 * (por NIT en dígitos, por nombre o por alias) y solo crea cuando de verdad es
 * nueva. Devuelve siempre la empresa con su id, más `creada` y `motivo` para
 * que la pantalla pueda decir qué pasó.
 *
 * `empresas` evita releer la colección cuando quien llama ya tiene la caché,
 * pero antes de crear se relee igual: entre que se cargó la caché y se guarda
 * la cotización, otro usuario pudo haber dado de alta el mismo cliente.
 */
export async function resolverOCrearEmpresa(datos = {}, { empresas = null } = {}){
  const nombre = (datos.nombre || "").trim();
  const nit = sanitizeNIT(datos.nit);
  if (!nombre && !nit) return { empresa: null, id: null, creada: false, motivo: null };

  const buscar = (lista) => resolverEmpresa({ ...datos, nombre, nit }, lista);

  let { empresa: encontrada, motivo } = empresas?.length
    ? buscar(empresas)
    : { empresa: null, motivo: null };
  if (!encontrada) {
    ({ empresa: encontrada, motivo } = buscar(await listarEmpresas()));
  }

  if (encontrada) {
    const patch = faltantes(encontrada, { ...datos, nit });
    if (Object.keys(patch).length) {
      await actualizarEmpresa(encontrada.id, patch);
      encontrada = { ...encontrada, ...patch };
    }
    return { empresa: encontrada, id: encontrada.id, creada: false, motivo };
  }

  if (!nombre) return { empresa: null, id: null, creada: false, motivo: null };
  const id = await crearEmpresa({ ...datos, nombre, nit });
  return {
    empresa: {
      id,
      nombre,
      nit,
      alias: (datos.alias || "").trim(),
      ciudad: datos.ciudad || "",
      direccion: datos.direccion || "",
    },
    id,
    creada: true,
    motivo: null,
  };
}

// --- CONTACTOS ---
export async function listarContactos(empresaId){
  const snap = await getDocs(collection(db, COL, empresaId, "contactos"));
  return snap.docs.map(d=>({ id:d.id, ...d.data() }));
}

// Se compara en memoria y no con una consulta de igualdad porque el email
// guardado puede diferir en mayúsculas del que se escribe.
export async function buscarContactoPorEmail(empresaId, email){
  if(!email) return null;
  const contactos = await listarContactos(empresaId);
  return resolverContacto({ email }, contactos).contacto;
}

export async function crearContacto(empresaId, data){
  const ref = await addDoc(collection(db, COL, empresaId, "contactos"), {
    nombre: data.nombre?.trim() || "",
    email: data.email?.trim() || "",
    telefono: data.telefono || "",
    cargo: data.cargo || "",
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });
  return ref.id;
}

/**
 * Alta de contacto sin duplicar. Empareja por email y, cuando no hay email
 * —que es el caso corriente—, por nombre: de otro modo cada cotización creaba
 * de nuevo al mismo agente de compras.
 */
export async function resolverOCrearContacto(empresaId, datos = {}, { contactos = null } = {}){
  if(!empresaId) return { contacto: null, id: null, creada: false, motivo: null };
  const nombre = (datos.nombre || "").trim();
  const email = (datos.email || "").trim();
  if(!nombre && !email) return { contacto: null, id: null, creada: false, motivo: null };

  const lista = contactos ?? await listarContactos(empresaId);
  const { contacto, motivo } = resolverContacto({ nombre, email }, lista);
  if (contacto) {
    // Igual que con la empresa: solo se rellenan los campos vacíos.
    const patch = {};
    for (const campo of ["email", "telefono", "cargo"]) {
      const nuevo = String(datos?.[campo] ?? "").trim();
      if (nuevo && !String(contacto[campo] ?? "").trim()) patch[campo] = nuevo;
    }
    if (Object.keys(patch).length) {
      await actualizarContacto(empresaId, contacto.id, patch);
      return { contacto: { ...contacto, ...patch }, id: contacto.id, creada: false, motivo };
    }
    return { contacto, id: contacto.id, creada: false, motivo };
  }

  const datosNuevos = { nombre: nombre || email, email, telefono: datos.telefono || "", cargo: datos.cargo || "" };
  const id = await crearContacto(empresaId, datosNuevos);
  return { contacto: { id, ...datosNuevos }, id, creada: true, motivo: null };
}

export async function actualizarContacto(empresaId, contactoId, data){
  await updateDoc(doc(db, COL, empresaId, "contactos", contactoId), { ...data, updatedAt: serverTimestamp() });
}

export async function eliminarContacto(empresaId, contactoId){
  await deleteDoc(doc(db, COL, empresaId, "contactos", contactoId));
}
