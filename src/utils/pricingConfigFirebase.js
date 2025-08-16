// src/utils/pricingConfigFirebase.js
import { db } from '../firebase';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';

const CONFIG_DOC_ID = 'global';
const MATRICES_COLLECTION = 'config_matrices';
const EXTRAS_COLLECTION = 'config_extras';

export async function cargarMatricesConfig() {
  try {
    const ref = doc(db, MATRICES_COLLECTION, CONFIG_DOC_ID);
    const snap = await getDoc(ref);
    if (!snap.exists()) return null;
    return snap.data().matrices || null;
  } catch (e) {
    console.error('Error cargando matrices config:', e);
    return null;
  }
}

export async function guardarMatricesConfig(matricesObj) {
  try {
    const ref = doc(db, MATRICES_COLLECTION, CONFIG_DOC_ID);
    await setDoc(ref, { matrices: matricesObj, updatedAt: serverTimestamp() }, { merge: true });
    return true;
  } catch (e) {
    console.error('Error guardando matrices config:', e);
    throw e;
  }
}

export async function cargarExtrasConfig() {
  try {
    const ref = doc(db, EXTRAS_COLLECTION, CONFIG_DOC_ID);
    const snap = await getDoc(ref);
    if (!snap.exists()) return null;
    return snap.data().extras || null;
  } catch (e) {
    console.error('Error cargando extras config:', e);
    return null;
  }
}

export async function guardarExtrasConfig(extrasObj) {
  try {
    const ref = doc(db, EXTRAS_COLLECTION, CONFIG_DOC_ID);
    await setDoc(ref, { extras: extrasObj, updatedAt: serverTimestamp() }, { merge: true });
    return true;
  } catch (e) {
    console.error('Error guardando extras config:', e);
    throw e;
  }
}

export async function guardarConfiguracionCompleta({ matrices, extras }) {
  const promesas = [];
  if (matrices) promesas.push(guardarMatricesConfig(matrices));
  if (extras) promesas.push(guardarExtrasConfig(extras));
  await Promise.all(promesas);
}
