import { db, waitForAuth } from "../firebase";
import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";

const FICHAS_COL     = "division_fichas";
const INSUMOS_COL    = "division_insumos";
const PARAMETROS_COL = "division_parametros";

const toIso = (v) => {
  if (!v) return null;
  if (v instanceof Date) return v.toISOString();
  return String(v);
};

export async function crearFichaDivision(input, calculo) {
  await waitForAuth();
  const ref = await addDoc(collection(db, FICHAS_COL), {
    cliente:       (input.cliente || "").trim(),
    cantidad:      Number(input.cantidad || 1),
    fechaOrden:    toIso(input.fechaOrden),
    fechaEntrega:  toIso(input.fechaEntrega),
    anchoVehiculo: Number(input.anchoVehiculo),
    altoVehiculo:  Number(input.altoVehiculo),
    placa:         input.placa    || "NO",
    logo:          input.logo     || "NO",
    agujero:       input.agujero  || "SIN AGUJERO",
    platinas:      input.platinas || "NO",
    factura:       input.factura  || "SI",
    colorLona:     input.colorLona || "NEGRO",
    medidas:       calculo.medidas,
    tipoIcopor:    calculo.tipoIcopor,
    consumo:       calculo.consumo,
    estado:        "borrador",
    createdAt:     serverTimestamp(),
    updatedAt:     serverTimestamp(),
  });
  return ref.id;
}

export async function listarFichasDivision({ max = 200 } = {}) {
  await waitForAuth();
  const q = query(collection(db, FICHAS_COL), orderBy("createdAt", "desc"), limit(max));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function obtenerFichaDivision(id) {
  await waitForAuth();
  if (!id) return null;
  const snap = await getDoc(doc(db, FICHAS_COL, id));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

export async function actualizarFichaDivision(id, data) {
  await waitForAuth();
  await updateDoc(doc(db, FICHAS_COL, id), { ...data, updatedAt: serverTimestamp() });
}

// ─── Catálogo de insumos con precios de compra ────────────────────────────────

export async function listarInsumosDivision() {
  await waitForAuth();
  const q = query(collection(db, INSUMOS_COL), orderBy("nombre", "asc"), limit(100));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function crearInsumo(data) {
  await waitForAuth();
  const ref = await addDoc(collection(db, INSUMOS_COL), {
    nombre:       (data.nombre || "").trim().toUpperCase(),
    unidad:       (data.unidad || "").trim(),
    precioCompra: Number(data.precioCompra || 0),
    descripcion:  (data.descripcion || "").trim(),
    createdAt:    serverTimestamp(),
    updatedAt:    serverTimestamp(),
  });
  return ref.id;
}

export async function actualizarInsumo(id, data) {
  await waitForAuth();
  const patch = { ...data, updatedAt: serverTimestamp() };
  if (typeof patch.nombre !== "undefined") patch.nombre = patch.nombre.trim().toUpperCase();
  if (typeof patch.precioCompra !== "undefined") patch.precioCompra = Number(patch.precioCompra || 0);
  await updateDoc(doc(db, INSUMOS_COL, id), patch);
}

// ─── Parámetros configurables (doc "default") ────────────────────────────────

export async function obtenerParametrosDivision() {
  await waitForAuth();
  const snap = await getDoc(doc(db, PARAMETROS_COL, "default"));
  return snap.exists() ? snap.data() : null;
}

export async function actualizarParametrosDivision(data) {
  await waitForAuth();
  await updateDoc(doc(db, PARAMETROS_COL, "default"), { ...data, updatedAt: serverTimestamp() });
}
