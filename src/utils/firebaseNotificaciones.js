import { db, waitForAuth } from "../firebase";
import {
  addDoc,
  arrayUnion,
  collection,
  doc,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";

const NOTIFICACIONES_COL = "notificaciones";

// Aviso a planta de que una ficha de fabricación pasó a producción. Se llama
// desde los componentes de fichas (admin/producción) cuando cambian el
// estado a "en_produccion" — ver DivisionTermicaFicha.jsx y análogos.
export async function crearNotificacionFichaEnProduccion({ fichaTipo, tipoLabel, fichaId, cliente, ordenProduccion, codigoFicha }) {
  if (!fichaTipo || !fichaId) return;
  await waitForAuth();
  await addDoc(collection(db, NOTIFICACIONES_COL), {
    tipo: "ficha_en_produccion",
    fichaTipo,
    tipoLabel: tipoLabel || "",
    fichaId,
    cliente: cliente || "",
    ordenProduccion: Number(ordenProduccion || 0),
    codigoFicha: codigoFicha || "",
    leidoPor: [],
    createdAt: serverTimestamp(),
  });
}

// Suscripción en tiempo real a las notificaciones recientes. Devuelve la
// función de desuscripción (para usar en un cleanup de useEffect).
export function suscribirNotificaciones(callback, { max = 30 } = {}) {
  const q = query(collection(db, NOTIFICACIONES_COL), orderBy("createdAt", "desc"), limit(max));
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
  });
}

export async function marcarNotificacionLeida(id, uid) {
  if (!id || !uid) return;
  await waitForAuth();
  await updateDoc(doc(db, NOTIFICACIONES_COL, id), { leidoPor: arrayUnion(uid) });
}
