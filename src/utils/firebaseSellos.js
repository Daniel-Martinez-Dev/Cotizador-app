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

const FICHAS_COL = "fichas_sellos";

const toIso = (v) => {
  if (!v) return null;
  if (v instanceof Date) return v.toISOString();
  return String(v);
};

export async function crearFichaSello(input, calculo) {
  await waitForAuth();
  const ordenProduccion = await getNextOrdenProduccionGlobal();
  const ref = await addDoc(collection(db, FICHAS_COL), {
    ordenProduccion,
    // Código impreso de la ficha (SA + ddmmaa + consecutivo). Se congela aquí:
    // aunque después se edite la ficha, el número no cambia.
    codigoFicha:      formatearCodigoFicha({ tipo: "sello", fecha: new Date(), consecutivo: ordenProduccion }),
    numeroOrdenCompra: (input.numeroOrdenCompra || "").trim(),
    cliente:          (input.cliente || "").trim(),
    cantidad:         Number(input.cantidad || 1),
    fechaOrden:       toIso(input.fechaOrden),
    fechaEntrega:     toIso(input.fechaEntrega),
    anchoVano:        Number(input.anchoVano),
    altoVano:         Number(input.altoVano),
    espesorSello:     Number(input.espesorSello),
    espesorPoste:     Number(input.espesorPoste),
    espesorTravesano: Number(input.espesorTravesano),
    materialBase:     input.materialBase || "MADERA",
    llevaCortina:     !!input.llevaCortina,
    llevaTravesano:   !!input.llevaTravesano,
    despliegueCortina: Number(input.despliegueCortina || 800),
    fact:             input.fact        || "SI",
    formaCuna:        input.formaCuna   || "NO",
    selloAbrigo:      input.selloAbrigo || "NO",
    bandaLateral:     (input.bandaLateral  || "").trim(),
    bandaSuperior:    (input.bandaSuperior || "").trim(),
    medidas:          calculo.medidas,
    materiaPrima:     calculo.materiaPrima,
    estado:           "borrador",
    createdAt:        serverTimestamp(),
    updatedAt:        serverTimestamp(),
  });
  return { id: ref.id, ordenProduccion };
}

export async function listarFichasSellos({ max = 200 } = {}) {
  await waitForAuth();
  const q = query(collection(db, FICHAS_COL), orderBy("createdAt", "desc"), limit(max));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function obtenerFichaSello(id) {
  await waitForAuth();
  if (!id) return null;
  const snap = await getDoc(doc(db, FICHAS_COL, id));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

export async function actualizarFichaSello(id, data) {
  await waitForAuth();
  await updateDoc(doc(db, FICHAS_COL, id), { ...data, updatedAt: serverTimestamp() });
}

export async function eliminarFichaSello(id) {
  await waitForAuth();
  await deleteDoc(doc(db, FICHAS_COL, id));
}
