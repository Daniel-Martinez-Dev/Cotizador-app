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
import { camposClienteFicha } from "./clienteVinculo";

const FICHAS_COL = "fichas_abrigo_retractil";

const toIso = (v) => {
  if (!v) return null;
  if (v instanceof Date) return v.toISOString();
  return String(v);
};

export async function crearFichaAbrigoRetractil(input, calculo) {
  await waitForAuth();
  const ordenProduccion = await getNextOrdenProduccionGlobal();
  const ref = await addDoc(collection(db, FICHAS_COL), {
    ordenProduccion,
    // Código impreso de la ficha (AR + ddmmaa + consecutivo). Se congela aquí:
    // aunque después se edite la ficha, el número no cambia.
    codigoFicha:       formatearCodigoFicha({ tipo: "abrigoretractil", fecha: new Date(), consecutivo: ordenProduccion }),
    numeroOrdenCompra: (input.numeroOrdenCompra || "").trim(),
    // Cliente: nombre + vínculo a `empresas/{id}` (la misma base del cotizador).
    // Ver clienteVinculo.js.
    ...camposClienteFicha(input),
    cantidad:          Number(input.cantidad     || 1),
    fechaOrden:        toIso(input.fechaOrden),
    fechaEntrega:      toIso(input.fechaEntrega),
    auxiliarEncargado: (input.auxiliarEncargado || "TODOS").trim(),
    ancho:             Number(input.ancho),
    alto:              Number(input.alto),
    travesanos:        Number(input.travesanos   || 910),
    color:             (input.color              || "NEGRO").trim(),
    acabado:           input.acabado             || "PINTADO",
    llevaBanda:        input.llevaBanda          !== false,
    // Calculados
    medidas:              calculo.medidas,
    materiaPrimaPorAbrigo: calculo.materiaPrimaPorAbrigo,
    materiaPrimaTotal:    calculo.materiaPrimaTotal,
    alistamiento:         calculo.alistamiento,
    despacho:             calculo.despacho,
    // Control
    estado:    "borrador",
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return { id: ref.id, ordenProduccion };
}

export async function listarFichasAbrigoRetractil({ max = 200 } = {}) {
  await waitForAuth();
  const q = query(collection(db, FICHAS_COL), orderBy("createdAt", "desc"), limit(max));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function obtenerFichaAbrigoRetractil(id) {
  await waitForAuth();
  if (!id) return null;
  const snap = await getDoc(doc(db, FICHAS_COL, id));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

export async function actualizarFichaAbrigoRetractil(id, data) {
  await waitForAuth();
  await updateDoc(doc(db, FICHAS_COL, id), { ...data, updatedAt: serverTimestamp() });
}

export async function eliminarFichaAbrigoRetractil(id) {
  await waitForAuth();
  await deleteDoc(doc(db, FICHAS_COL, id));
}
