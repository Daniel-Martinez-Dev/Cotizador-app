import { db, auth, waitForAuth } from "../firebase";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  query,
  serverTimestamp,
  setDoc,
  where,
} from "firebase/firestore";
import { encodeEmailDocId } from "./firestoreIds";

const USERS_COL = "usuarios";
const USERS_BY_EMAIL_COL = "usuarios_email";

function normalizeEmail(email) {
  return (email ?? "").toString().trim().toLowerCase();
}

export async function getUserProfileForUid(uid) {
  if (!uid) return null;
  await waitForAuth();
  const ref = doc(db, USERS_COL, uid);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() };
}

export async function getUserProfileForEmail(email) {
  const emailNorm = normalizeEmail(email);
  if (!emailNorm) return null;
  await waitForAuth();
  const ref = doc(db, USERS_BY_EMAIL_COL, encodeEmailDocId(emailNorm));
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() };
}

export async function upsertUserProfileByEmail(email, payload) {
  const emailNorm = normalizeEmail(email);
  if (!emailNorm) throw new Error("Email requerido");
  await waitForAuth();
  const ref = doc(db, USERS_BY_EMAIL_COL, encodeEmailDocId(emailNorm));
  await setDoc(
    ref,
    {
      email: emailNorm,
      ...payload,
      updatedAt: serverTimestamp(),
      createdAt: payload?.createdAt ? payload.createdAt : serverTimestamp(),
    },
    { merge: true }
  );
  return true;
}

export async function upsertUserProfile(uid, payload) {
  if (!uid) throw new Error("UID requerido");
  await waitForAuth();
  const ref = doc(db, USERS_COL, uid);
  await setDoc(
    ref,
    {
      ...payload,
      updatedAt: serverTimestamp(),
      createdAt: payload?.createdAt ? payload.createdAt : serverTimestamp(),
    },
    { merge: true }
  );
  const snap = await getDoc(ref);
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

export async function ensureUserProfileForLogin(firebaseUser) {
  if (!firebaseUser?.uid) return null;

  await waitForAuth();

  const uid = firebaseUser.uid;
  const email = normalizeEmail(firebaseUser.email);

  // Bootstrap admin by env email (optional) — even if the UID profile already exists.
  const bootstrapEmail = normalizeEmail(import.meta.env.VITE_BOOTSTRAP_ADMIN_EMAIL);

  // 1) UID profile exists?
  const byUid = await getUserProfileForUid(uid);
  if (byUid) {
    const existingRoles = Array.isArray(byUid.roles) ? byUid.roles : [];
    const isAdminAlready = existingRoles.includes("admin");

    // 1a) Promote to admin if matches bootstrap email
    if (email && bootstrapEmail && email === bootstrapEmail && !isAdminAlready) {
      const mergedRoles = Array.from(new Set(["admin", ...existingRoles]));
      return await upsertUserProfile(uid, {
        email: email || byUid.email || "",
        displayName: firebaseUser.displayName || byUid.displayName || "",
        roles: mergedRoles,
        status: "active",
        source: byUid.source || "bootstrap-admin",
      });
    }

    // 1b) If there is an email pre-registration, sync roles/status into the existing UID doc
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
            email: byUid.email || email || "",
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

  // 2) Bootstrap admin by env email (optional)
  if (email && bootstrapEmail && email === bootstrapEmail) {
    return await upsertUserProfile(uid, {
      email,
      displayName: firebaseUser.displayName || "",
      roles: ["admin"],
      status: "active",
      source: "bootstrap-admin",
    });
  }

  // 3) If an email pre-registration exists, copy it.
  if (email) {
    const byEmail = await getUserProfileForEmail(email);
    if (byEmail) {
      const roles = Array.isArray(byEmail.roles) ? byEmail.roles : [];
      return await upsertUserProfile(uid, {
        email,
        displayName: firebaseUser.displayName || byEmail.displayName || "",
        roles,
        status: byEmail.status || "active",
        source: "email-mapping",
      });
    }
  }

  // 4) Create a pending profile
  return await upsertUserProfile(uid, {
    email: email || "",
    displayName: firebaseUser.displayName || "",
    roles: [],
    status: "pending",
  });
}

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
