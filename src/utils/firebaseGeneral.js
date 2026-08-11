import { db, waitForAuth } from "../firebase";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";
import { getNextOrdenProduccionGlobal } from "./firebaseConsecutivos";
import { formatearCodigoFicha } from "./codigoFicha";
import { construirFichaGeneral } from "../modules/produccion/general/normalizar";

// Ficha básica = orden de producción/despacho sin ficha de fabricación:
// repuestos y productos que se entregan tal cual (semáforos, lámparas, topes,
// rampas…). No tiene cálculo de medidas ni consumo de materiales; lo que
// guarda es una lista de ítems a alistar.
//
// Comparte con las 4 líneas de producto el consecutivo global de orden de
// producción y la forma de documento (cliente, cantidad, estado, notas,
// firmas), para que aparezca junto a ellas en el listado de órdenes y en el
// panel de planta — ver firebaseFichas.js.
const FICHAS_COL = "fichas_generales";

export async function crearFichaGeneral(input) {
  await waitForAuth();
  const ordenProduccion = await getNextOrdenProduccionGlobal();
  const ref = await addDoc(collection(db, FICHAS_COL), {
    ordenProduccion,
    // Código impreso (OG + ddmmaa + consecutivo). Se congela al crear: aunque
    // después se edite la ficha, el número impreso no cambia.
    codigoFicha: formatearCodigoFicha({ tipo: "general", fecha: new Date(), consecutivo: ordenProduccion }),
    ...construirFichaGeneral(input),
    estado:    "borrador",
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return { id: ref.id, ordenProduccion };
}

export async function listarFichasGenerales({ max = 200 } = {}) {
  await waitForAuth();
  const q = query(collection(db, FICHAS_COL), orderBy("createdAt", "desc"), limit(max));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function obtenerFichaGeneral(id) {
  await waitForAuth();
  if (!id) return null;
  const snap = await getDoc(doc(db, FICHAS_COL, id));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

// Patch genérico. El formulario manda la ficha completa (construirFichaGeneral);
// planta manda solo estado/notas/firmas — ver firebaseFichas.js.
export async function actualizarFichaGeneral(id, data) {
  await waitForAuth();
  await updateDoc(doc(db, FICHAS_COL, id), { ...data, updatedAt: serverTimestamp() });
}

export async function eliminarFichaGeneral(id) {
  await waitForAuth();
  await deleteDoc(doc(db, FICHAS_COL, id));
}
