import { db, waitForAuth } from "../firebase";
import { PARAMETROS_PUERTA_SECCIONAL } from "../modules/produccion/puertas-seccionales/parametros.js";
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
import { camposClienteFicha } from "./clienteVinculo";

const FICHAS_COL = "fichas_puertas_seccionales";

const toIso = (v) => {
  if (!v) return null;
  if (v instanceof Date) return v.toISOString();
  return String(v);
};

export async function crearFichaPuertaSeccional(input, calculo) {
  await waitForAuth();
  const ordenProduccion = await getNextOrdenProduccionGlobal();
  const ref = await addDoc(collection(db, FICHAS_COL), {
    ordenProduccion,
    // Código impreso de la ficha (PS + ddmmaa + consecutivo). Se congela aquí:
    // aunque después se edite la ficha, el número no cambia.
    codigoFicha:       formatearCodigoFicha({ tipo: "puertaseccional", fecha: new Date(), consecutivo: ordenProduccion }),
    numeroOrdenCompra: (input.numeroOrdenCompra || "").trim(),
    // Cliente: nombre + vínculo a `empresas/{id}` (la misma base del cotizador).
    // Ver clienteVinculo.js.
    ...camposClienteFicha(input),
    cantidad:          Number(input.cantidad || 1),
    fechaOrden:        toIso(input.fechaOrden),
    fechaEntrega:      toIso(input.fechaEntrega),
    anchoVano:         Number(input.anchoVano),
    altoVano:          Number(input.altoVano),
    tipo:              input.tipo     || "CURVA",
    motor:             input.motor    || "SI",
    exclusa:           input.exclusa  || "NO",
    factura:           input.factura  || "SI",
    ventanas:          Number(input.ventanas || 0),
    resortes:          Number(input.resortes || PARAMETROS_PUERTA_SECCIONAL.RESORTES_DEFAULT),
    // Referencia de tambor digitada a mano; vacía = vale la que sugiere el tipo
    // y el alto del vano (la efectiva queda en `medidas.tambor`).
    tambor:            (input.tambor || "").trim(),
    // Referencia del resorte: sin fórmula todavía, se digita a mano (ver
    // PARAMETROS_PUERTA_SECCIONAL.RESORTES_DEFAULT).
    resorteCalibre:    (input.resorteCalibre || "").trim(),
    resorteLargo:      (input.resorteLargo || "").trim(),
    adicional:         (input.adicional || "").trim(),
    medidas:           calculo.medidas,
    empaque:           calculo.empaque,
    estado:            "borrador",
    createdAt:         serverTimestamp(),
    updatedAt:         serverTimestamp(),
  });
  return { id: ref.id, ordenProduccion };
}

export async function listarFichasPuertaSeccional({ max = 200 } = {}) {
  await waitForAuth();
  const q = query(collection(db, FICHAS_COL), orderBy("createdAt", "desc"), limit(max));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function obtenerFichaPuertaSeccional(id) {
  await waitForAuth();
  if (!id) return null;
  const snap = await getDoc(doc(db, FICHAS_COL, id));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

export async function actualizarFichaPuertaSeccional(id, data) {
  await waitForAuth();
  await updateDoc(doc(db, FICHAS_COL, id), { ...data, updatedAt: serverTimestamp() });
}

export async function eliminarFichaPuertaSeccional(id) {
  await waitForAuth();
  await deleteDoc(doc(db, FICHAS_COL, id));
}
