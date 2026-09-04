import { db, waitForAuth } from "../firebase";
import { PARAMETROS_PUERTA_RAPIDA } from "../modules/produccion/puertas-rapidas/parametros.js";
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

const FICHAS_COL = "fichas_puertas_rapidas";

const toIso = (v) => {
  if (!v) return null;
  if (v instanceof Date) return v.toISOString();
  return String(v);
};

export async function crearFichaPuertaRapida(input, calculo) {
  await waitForAuth();
  const ordenProduccion = await getNextOrdenProduccionGlobal();
  const ref = await addDoc(collection(db, FICHAS_COL), {
    ordenProduccion,
    // Código impreso de la ficha (PR + ddmmaa + consecutivo). Se congela aquí:
    // aunque después se edite la ficha, el número no cambia.
    codigoFicha:           formatearCodigoFicha({ tipo: "puertarapida", fecha: new Date(), consecutivo: ordenProduccion }),
    numeroOrdenCompra:     (input.numeroOrdenCompra || "").trim(),
    // Detalle libre de la ficha ("Zona 3", "Muelle 7"): lo que distingue
    // dos fichas iguales del mismo pedido. Ver fichas/IdentificacionFicha.
    nombreFicha:           (input.nombreFicha || "").trim(),
    // Cliente: nombre + vínculo a `empresas/{id}` (la misma base del cotizador).
    // Ver clienteVinculo.js.
    ...camposClienteFicha(input),
    // Cotización de la que salió el pedido, cuando la hay. Opcional: la ficha
    // se guarda igual sin ella. Ver utils/documentoVinculo.js.
    ...camposCotizacionFicha(input),
    cantidad:              Number(input.cantidad || 1),
    fechaOrden:            toIso(input.fechaOrden),
    fechaEntrega:          toIso(input.fechaEntrega),
    anchoVano:             Number(input.anchoVano),
    altoVano:              Number(input.altoVano),
    colorLona:             input.colorLona   || "NEGRO",
    ladoMotor:             input.ladoMotor   || "IZQUIERDO",
    exclusa:               input.exclusa     || "SI",
    fct:                   input.fct         || "SI",
    vinilo:                input.vinilo      || "SI",
    distanciaCortavientos: Number(input.distanciaCortavientos || PARAMETROS_PUERTA_RAPIDA.DISTANCIA_CORTAVIENTOS_DEFAULT_MM),
    adicional:             (input.adicional || "").trim(),
    medidas:               calculo.medidas,
    empaque:               calculo.empaque,
    estado:                "borrador",
    createdAt:             serverTimestamp(),
    updatedAt:             serverTimestamp(),
  });
  return { id: ref.id, ordenProduccion };
}

export async function listarFichasPuertaRapida({ max = 200 } = {}) {
  await waitForAuth();
  const q = query(collection(db, FICHAS_COL), orderBy("createdAt", "desc"), limit(max));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function obtenerFichaPuertaRapida(id) {
  await waitForAuth();
  if (!id) return null;
  const snap = await getDoc(doc(db, FICHAS_COL, id));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

export async function actualizarFichaPuertaRapida(id, data) {
  await waitForAuth();
  await updateDoc(doc(db, FICHAS_COL, id), { ...data, updatedAt: serverTimestamp() });
}

export async function eliminarFichaPuertaRapida(id) {
  await waitForAuth();
  await deleteDoc(doc(db, FICHAS_COL, id));
}
