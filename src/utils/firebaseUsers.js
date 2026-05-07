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

    // Sincronizar con pre-registro por email si existe
    if (email) {
      const byEmail = await getUserProfileForEmail(email);
      if (byEmail) {
        const incomingRoles = Array.isArray(byEmail.roles) ? byEmail.roles : [];
        const mergedRoles = Array.from(new Set([...existingRoles, ...incomingRoles]));
        const nextStatus = byEmail.status || byUid.status || "active";
        const nextDisplayName = firebaseUser.displayName || byUid.displayName || byEmail.displayName || "";

        const shouldUpdate =
          mergedRoles.length !== existingRoles.length ||
          (byUid.status || "") !== nextStatus ||
          (!byUid.email && email) ||
          (!byUid.displayName && nextDisplayName);

        if (shouldUpdate) {
          return await upsertUserProfile(uid, {
            email: byUid.email || email,
            displayName: nextDisplayName,
            roles: mergedRoles,
            status: nextStatus,
            source: byUid.source || "email-mapping-update",
          });
        }
      }
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
    const byEmail = await getUserProfileForEmail(email);
    if (byEmail) {
      return await upsertUserProfile(uid, {
        email,
        displayName: firebaseUser.displayName || byEmail.displayName || "",
        roles: Array.isArray(byEmail.roles) ? byEmail.roles : [],
        status: byEmail.status || "active",
        source: "email-mapping",
      });
    }
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
