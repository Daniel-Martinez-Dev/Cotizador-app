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
import { camposCotizacionFicha } from "./documentoVinculo";

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
  const ordenProduccion = await getNextOrdenProduccionGlobal();
  const ref = await addDoc(collection(db, FICHAS_COL), {
    ordenProduccion,
    // Código impreso de la ficha (DT + ddmmaa + consecutivo). Se congela aquí:
    // aunque después se edite la ficha, el número no cambia.
    codigoFicha:   formatearCodigoFicha({ tipo: "division", fecha: new Date(), consecutivo: ordenProduccion }),
    numeroOrdenCompra: (input.numeroOrdenCompra || "").trim(),
    // Detalle libre de la ficha ("Zona 3", "Muelle 7"): lo que distingue
    // dos fichas iguales del mismo pedido. Ver fichas/IdentificacionFicha.
    nombreFicha:       (input.nombreFicha || "").trim(),
    numeroFicha:   (input.numeroFicha || "").trim(),
    // Cliente: nombre + vínculo a `empresas/{id}` (la misma base del cotizador).
    // Ver clienteVinculo.js.
    ...camposClienteFicha(input),
    // Cotización de la que salió el pedido, cuando la hay. Opcional: la ficha
    // se guarda igual sin ella. Ver utils/documentoVinculo.js.
    ...camposCotizacionFicha(input),
    cantidad:      Number(input.cantidad || 1),
    fechaOrden:    toIso(input.fechaOrden),
    fechaEntrega:  toIso(input.fechaEntrega),
    anchoVehiculo: Number(input.anchoVehiculo),
    altoVehiculo:  Number(input.altoVehiculo),
    placa:         input.placa    || "NO",
    numeroPlaca:   input.placa === "SI" ? (input.numeroPlaca || "").trim() : "",
    logo:          input.logo     || "NO",
    agujero:       input.agujero  || "SIN AGUJERO",
    platinas:      input.platinas || "NO",
    alturasPlatinas: input.platinas === "SI"
      ? (Array.isArray(input.alturasPlatinas) ? input.alturasPlatinas.map(Number).filter((n) => n > 0) : [])
      : [],
    reatasRiel:    input.platinas === "SI" ? (input.reatasRiel || "NO") : "NO",
    factura:       input.factura  || "SI",
    colorLona:     input.colorLona || "NEGRO",
    adicional:     (input.adicional || "").trim(),
    medidas:       calculo.medidas,
    tipoIcopor:    calculo.tipoIcopor,
    consumo:       calculo.consumo,
    estado:        "borrador",
    createdAt:     serverTimestamp(),
    updatedAt:     serverTimestamp(),
  });
  return { id: ref.id, ordenProduccion };
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

export async function eliminarFichaDivision(id) {
  await waitForAuth();
  await deleteDoc(doc(db, FICHAS_COL, id));
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
