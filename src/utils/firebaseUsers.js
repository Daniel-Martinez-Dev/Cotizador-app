import { db, auth, waitForAuth } from "../firebase";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from "firebase/firestore";
import { encodeEmailDocId } from "./firestoreIds";

const USERS_COL = "usuarios";
const USERS_BY_EMAIL_COL = "usuarios_email";

function normalizeEmail(email) {
  return (email ?? "").toString().trim().toLowerCase();
}

// ─── Lecturas ───────────────────────────────────────────────────────────────

export async function getUserProfileForUid(uid) {
  if (!uid) return null;
  await waitForAuth();
  const snap = await getDoc(doc(db, USERS_COL, uid));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() };
}

export async function getUserProfileForEmail(email) {
  const emailNorm = normalizeEmail(email);
  if (!emailNorm) return null;
  await waitForAuth();
  const snap = await getDoc(doc(db, USERS_BY_EMAIL_COL, encodeEmailDocId(emailNorm)));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() };
}

/** Lista todos los usuarios registrados (colección usuarios, por UID). */
export async function listAllUsers() {
  await waitForAuth();
  const q = query(collection(db, USERS_COL), orderBy("createdAt", "desc"), limit(300));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

/** Lista solo usuarios pendientes de aprobación. */
export async function listPendingUsers() {
  await waitForAuth();
  const q = query(
    collection(db, USERS_COL),
    where("status", "==", "pending"),
    orderBy("createdAt", "desc"),
    limit(100)
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

/** Lista usuarios pre-registrados por email (colección usuarios_email). */
export async function listEmailUsers({ onlyActive = false } = {}) {
  await waitForAuth();
  const base = collection(db, USERS_BY_EMAIL_COL);
  const q = onlyActive
    ? query(base, where("status", "==", "active"), limit(200))
    : query(base, limit(200));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function countAdmins() {
  await waitForAuth();
  const q = query(collection(db, USERS_COL), where("roles", "array-contains", "admin"), limit(1));
  const snap = await getDocs(q);
  return snap.size;
}

// ─── Escrituras ─────────────────────────────────────────────────────────────

export async function upsertUserProfile(uid, payload) {
  if (!uid) throw new Error("UID requerido");
  await waitForAuth();
  const ref = doc(db, USERS_COL, uid);
  await setDoc(
    ref,
    { ...payload, updatedAt: serverTimestamp(), createdAt: payload?.createdAt ?? serverTimestamp() },
    { merge: true }
  );
  const snap = await getDoc(ref);
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

export async function upsertUserProfileByEmail(email, payload) {
  const emailNorm = normalizeEmail(email);
  if (!emailNorm) throw new Error("Email requerido");
  await waitForAuth();
  const ref = doc(db, USERS_BY_EMAIL_COL, encodeEmailDocId(emailNorm));
  await setDoc(
    ref,
    { email: emailNorm, ...payload, updatedAt: serverTimestamp(), createdAt: payload?.createdAt ?? serverTimestamp() },
    { merge: true }
  );
  return true;
}

// ─── Perfil propio ───────────────────────────────────────────────────────────

// Lo único que una persona puede cambiarse a sí misma desde "Mi perfil". La
// lista es blanca a propósito: `usuarios/{uid}` es también donde viven `roles`
// y `status`, y el perfil no puede ser la puerta por la que alguien se asigna
// un rol. Las reglas de Firestore lo cierran del lado del servidor; esto evita
// además mandar campos de más por error.
const CAMPOS_PERFIL_PROPIO = [
  "displayName",
  "firstName",
  "lastName",
  "fotoURL",
  "fotoPath",
  "firmaDataUrl",
];

// El correo no se toca: es la credencial con la que se inicia sesión y la llave
// del pre-registro por email (usuarios_email).
export async function actualizarPerfilPropio(uid, campos) {
  if (!uid) throw new Error("UID requerido");
  await waitForAuth();

  const payload = {};
  for (const campo of CAMPOS_PERFIL_PROPIO) {
    if (campo in campos) payload[campo] = campos[campo];
  }
  if (Object.keys(payload).length === 0) return null;

  const ref = doc(db, USERS_COL, uid);
  await updateDoc(ref, { ...payload, updatedAt: serverTimestamp() });
  const snap = await getDoc(ref);
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

// ─── Gestión de usuarios (solo admin) ────────────────────────────────────────

/** Aprueba un usuario pendiente y le asigna roles. */
export async function aprobarUsuario(uid, roles = []) {
  if (!uid) throw new Error("UID requerido");
  await waitForAuth();
  await updateDoc(doc(db, USERS_COL, uid), {
    status: "active",
    roles,
    updatedAt: serverTimestamp(),
  });
}

/** Desactiva un usuario activo. */
export async function desactivarUsuario(uid) {
  if (!uid) throw new Error("UID requerido");
  await waitForAuth();
  await updateDoc(doc(db, USERS_COL, uid), {
    status: "disabled",
    updatedAt: serverTimestamp(),
  });
}

/** Actualiza los roles de un usuario. */
export async function actualizarRoles(uid, roles) {
  if (!uid) throw new Error("UID requerido");
  await waitForAuth();
  await updateDoc(doc(db, USERS_COL, uid), {
    roles,
    updatedAt: serverTimestamp(),
  });
}

// ─── Login: asegura perfil al iniciar sesión ─────────────────────────────────

// Copia al perfil propio los roles que un admin dejó pre-cargados en
// `usuarios_email` para este correo. Es la única vía por la que alguien se
// asigna roles a sí mismo, y por eso las reglas la validan entera: mandamos la
// clave del pre-registro en `preRegistroKey` y el servidor comprueba que ese
// documento —que solo un admin pudo escribir— esté a nombre del email del
// token y que los roles y el status que reclamamos sean literalmente los suyos.
//
// Devuelve null si no hay nada que reclamar, y también si el servidor lo
// rechaza: quedarse con el perfil que ya se tiene es preferible a romper el
// inicio de sesión.
async function reclamarPreRegistro(uid, email, perfilActual = {}) {
  const byEmail = await getUserProfileForEmail(email);
  if (!byEmail) return null;

  // Sin roles o sin status no hay nada que reclamar, y además la comparación de
  // las reglas no cuadraría.
  const roles = Array.isArray(byEmail.roles) ? byEmail.roles : null;
  const status = byEmail.status;
  if (!roles || !status) return null;

  try {
    return await upsertUserProfile(uid, {
      email,
      displayName: perfilActual.displayName || byEmail.displayName || "",
      roles,
      status,
      source: perfilActual.source || "email-mapping",
      preRegistroKey: encodeEmailDocId(email),
      // Reclamar el pre-registro no es un alta: si ya había perfil, su fecha de
      // creación es la buena (upsertUserProfile pondría una nueva).
      ...(perfilActual.createdAt ? { createdAt: perfilActual.createdAt } : {}),
    });
  } catch (e) {
    console.error("No se pudo aplicar el pre-registro por email:", e);
    return null;
  }
}

export async function ensureUserProfileForLogin(firebaseUser) {
  if (!firebaseUser?.uid) return null;

  await waitForAuth();

  const uid = firebaseUser.uid;
  const email = normalizeEmail(firebaseUser.email);

  const bootstrapEmail = normalizeEmail(import.meta.env.VITE_BOOTSTRAP_ADMIN_EMAIL);
  const adminEmail = normalizeEmail(import.meta.env.VITE_ADMIN_EMAIL);

  // Determinar si este email es el administrador principal
  const isMainAdmin =
    (email && bootstrapEmail && email === bootstrapEmail) ||
    (email && adminEmail && email === adminEmail);

  // 1) Perfil por UID ya existe
  const byUid = await getUserProfileForUid(uid);
  if (byUid) {
    const existingRoles = Array.isArray(byUid.roles) ? byUid.roles : [];
    const isAdminAlready = existingRoles.includes("admin");

    // Promover a admin si corresponde
    if (isMainAdmin && (!isAdminAlready || byUid.status !== "active")) {
      return await upsertUserProfile(uid, {
        email: email || byUid.email || "",
        displayName: firebaseUser.displayName || byUid.displayName || "",
        roles: Array.from(new Set(["admin", ...existingRoles])),
        status: "active",
        source: byUid.source || "bootstrap-admin",
      });
    }

    // Reclamar el pre-registro por email, si lo hay.
    //
    // Solo la primera vez, mientras la persona no tenga ningún rol: pasado ese
    // punto manda `usuarios/{uid}`, y un pre-registro viejo no puede devolver
    // un rol que un admin acaba de quitar. Las reglas exigen exactamente esto,
    // así que la condición de aquí y la de allá tienen que seguir coincidiendo.
    if (email && existingRoles.length === 0) {
      const reclamado = await reclamarPreRegistro(uid, email, byUid);
      if (reclamado) return reclamado;
    }

    return byUid;
  }

  // 2) Nuevo usuario — admin principal
  if (isMainAdmin) {
    return await upsertUserProfile(uid, {
      email,
      displayName: firebaseUser.displayName || "",
      roles: ["admin"],
      status: "active",
      source: "bootstrap-admin",
    });
  }

  // 3) Nuevo usuario — pre-registro por email existe
  if (email) {
    const reclamado = await reclamarPreRegistro(uid, email, {
      displayName: firebaseUser.displayName || "",
    });
    if (reclamado) return reclamado;
  }

  // 4) Nuevo usuario desconocido — pendiente de aprobación
  return await upsertUserProfile(uid, {
    email: email || "",
    displayName: firebaseUser.displayName || "",
    roles: [],
    status: "pending",
    source: "self-registered",
  });
}
