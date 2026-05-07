import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import {
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  signInWithRedirect,
  signOut,
} from "firebase/auth";
import { auth } from "../firebase";
import {
  ensureUserProfileForLogin,
  getUserProfileForUid,
} from "../utils/firebaseUsers";

const AuthContext = createContext(null);

const ADMIN_EMAIL = (import.meta.env.VITE_ADMIN_EMAIL ?? "").trim().toLowerCase();

function getRequireLoginFlag() {
  return String(import.meta.env.VITE_REQUIRE_LOGIN ?? "true").toLowerCase() !== "false";
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const requireLogin = getRequireLoginFlag();

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (nextUser) => {
      setUser(nextUser || null);
      setProfile(null);

      try {
        if (nextUser && !nextUser.isAnonymous) {
          const ensured = await ensureUserProfileForLogin(nextUser);
          setProfile(ensured);
        }
      } catch (e) {
        console.error("Error ensuring user profile:", e);
        setProfile(null);
      } finally {
        setLoading(false);
      }

      if (!nextUser) setLoading(false);
    });

    return () => unsub();
  }, []);

  const roles = profile?.roles || [];

  // El email del admin principal siempre tiene acceso completo
  const isMainAdmin = Boolean(
    user?.email && ADMIN_EMAIL && user.email.toLowerCase() === ADMIN_EMAIL
  );

  const hasRole = (role) => {
    if (!role) return true;
    if (isMainAdmin) return true;
    if (roles.includes("admin")) return true;
    return roles.includes(role);
  };

  const isLoggedIn = useMemo(() => {
    if (!requireLogin) return true;
    return Boolean(user && !user.isAnonymous);
  }, [requireLogin, user]);

  // Usuario pendiente de aprobación (no puede usar la app)
  const isPending = useMemo(() => {
    if (!isLoggedIn) return false;
    if (isMainAdmin) return false;                    // admin nunca queda bloqueado
    return profile?.status === "pending";
  }, [isLoggedIn, isMainAdmin, profile]);

  const signInWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: "select_account" });
    try {
      await signInWithPopup(auth, provider);
    } catch (e) {
      const code = e?.code;
      if (
        code === "auth/popup-blocked" ||
        code === "auth/popup-closed-by-user" ||
        code === "auth/operation-not-supported-in-this-environment"
      ) {
        await signInWithRedirect(auth, provider);
        return;
      }
      throw e;
    }
  };

  const refreshProfile = async () => {
    if (!user?.uid) return null;
    const p = await getUserProfileForUid(user.uid);
    setProfile(p);
    return p;
  };

  const signOutUser = async () => {
    await signOut(auth);
  };

  const value = useMemo(
    () => ({
      user,
      profile,
      roles,
      loading,
      requireLogin,
      isLoggedIn,
      isPending,
      isMainAdmin,
      hasRole,
      signInWithGoogle,
      signOutUser,
      refreshProfile,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [user, profile, roles, loading, requireLogin, isLoggedIn, isPending, isMainAdmin]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
