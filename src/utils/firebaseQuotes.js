import { db, auth, waitForAuth } from "../firebase";
import { collection, addDoc, getDocs, limit, orderBy, query, serverTimestamp } from "firebase/firestore";
import { writeRateLimiter } from "./rateLimiter";

export async function guardarCotizacionEnFirebase(cotizacion, numero) {
  const uid = auth.currentUser?.uid ?? 'anon';

  if (!writeRateLimiter.isAllowed(uid)) {
    const wait = Math.ceil(writeRateLimiter.retryAfterMs(uid) / 1000);
    throw new Error(`Límite de guardado alcanzado. Intenta en ${wait}s.`);
  }

  try {
    const cotizacionLimpia = { ...cotizacion };
    if (cotizacionLimpia.numero !== undefined) delete cotizacionLimpia.numero;

    await addDoc(collection(db, "cotizaciones"), {
      ...cotizacionLimpia,
      numero,
      uid: auth.currentUser?.uid ?? null, // RLS: vincular doc al usuario dueño
      timestamp: serverTimestamp(),
    });
  } catch (error) {
    console.error("Error al guardar la cotización:", error);
    throw error;
  }
}

// Cotizaciones recientes para los selectores que vinculan una cotización con
// otra cosa: la ficha de fabricación que se va a producir y la factura con la
// que se cobra (ver utils/documentoVinculo.js).
//
// Trae solo la cabecera de cada una —número, cliente, fecha y estado—, no los
// productos ni los totales: quien vincula necesita reconocer la cotización, no
// leer lo que vale. Es además lo que permite ofrecer el selector a producción
// sin abrirle la lista de precios.
//
// Se deduplica por número quedándose con la más reciente, igual que el
// historial: el mismo número se guarda varias veces cuando una cotización se
// reabre y se vuelve a guardar, y el selector no puede ofrecer tres veces la
// "N.º 4821" sin decir cuál es cuál.
//
// Las reglas de Firestore siguen mandando sobre qué cotizaciones alcanza a ver
// cada quien; esto solo pide las más recientes de entre las que pueda leer.
export async function listarCotizaciones({ max = 300 } = {}) {
  await waitForAuth();
  const snap = await getDocs(
    query(collection(db, "cotizaciones"), orderBy("timestamp", "desc"), limit(max))
  );

  const porNumero = new Map();
  for (const d of snap.docs) {
    const data = d.data();
    const numero = data.numero == null ? "" : String(data.numero);
    const cot = {
      id: d.id,
      numero,
      nombreCliente: data.nombreCliente || data.cliente || "",
      empresaId: data.empresaId || "",
      estadoSeguimiento: data.estadoSeguimiento || "COTIZACIÓN ENVIADA",
      fecha: data.timestamp?.toDate?.() || null,
    };
    // Sin número no hay con qué deduplicar, y tampoco con qué confundirla: pasa
    // derecho con su id como llave.
    const clave = numero || `id:${d.id}`;
    // La consulta ya viene de la más reciente a la más vieja, así que la
    // primera que llega con un número es la que se queda.
    if (!porNumero.has(clave)) porNumero.set(clave, cot);
  }
  return [...porNumero.values()];
}
