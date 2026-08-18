// Consultas que cruzan cliente ↔ fichas ↔ cotizaciones.
//
// La llave es el id de `empresas/{id}`: las fichas lo guardan en `clienteId`
// (ver clienteVinculo.js) y las cotizaciones en `empresaId`. Con eso se puede
// preguntar por un cliente y traer todo lo suyo, que es el objetivo de tener
// una sola base de clientes para cotizar y para fabricar.
//
// Todas las consultas son de igualdad pura (sin orderBy), así que Firestore las
// resuelve con los índices automáticos de campo único: no hay que desplegar
// índices compuestos. El orden se arma aquí, en memoria.
import { db, waitForAuth } from "../firebase";
import { collection, getDocs, limit, query, where, writeBatch, doc, serverTimestamp } from "firebase/firestore";
import { FICHA_TIPOS } from "./firebaseFichas";
import { CAMPO_CLIENTE_FICHA, CAMPO_CLIENTE_COTIZACION, planVinculacion } from "./clienteVinculo";

const COTIZACIONES_COL = "cotizaciones";

// Firestore no ordena por un campo que puede faltar en documentos viejos, y
// `createdAt` es serverTimestamp: mientras el servidor no confirma la escritura
// llega null. Por eso el orden se calcula aquí tolerando ambos casos.
const milis = (v) => {
  if (!v) return 0;
  if (typeof v.toMillis === "function") return v.toMillis();
  const t = new Date(v).getTime();
  return Number.isNaN(t) ? 0 : t;
};

// Fichas de un cliente, de todas las líneas de producto, más recientes primero.
export async function listarFichasDeCliente(clienteId, { max = 100 } = {}) {
  if (!clienteId) return [];
  await waitForAuth();
  const listas = await Promise.all(
    Object.entries(FICHA_TIPOS).map(async ([tipo, cfg]) => {
      const q = query(collection(db, cfg.col), where(CAMPO_CLIENTE_FICHA, "==", clienteId), limit(max));
      const snap = await getDocs(q);
      return snap.docs.map((d) => ({ id: d.id, ...d.data(), tipo, tipoLabel: cfg.label }));
    })
  );
  return listas.flat().sort(
    (a, b) => Number(b.ordenProduccion || 0) - Number(a.ordenProduccion || 0) || milis(b.createdAt) - milis(a.createdAt)
  );
}

// Cotizaciones de un cliente. Las reglas de Firestore solo dejan a un admin
// leer las cotizaciones de otros; por eso quien no lo sea debe pasar su `uid`,
// y la consulta se limita a las suyas (dos igualdades siguen sin necesitar
// índice compuesto).
export async function listarCotizacionesDeCliente(clienteId, { uid = null, max = 100 } = {}) {
  if (!clienteId) return [];
  await waitForAuth();
  const filtros = [where(CAMPO_CLIENTE_COTIZACION, "==", clienteId)];
  if (uid) filtros.push(where("uid", "==", uid));
  const snap = await getDocs(query(collection(db, COTIZACIONES_COL), ...filtros, limit(max)));
  return snap.docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .sort((a, b) => milis(b.timestamp) - milis(a.timestamp));
}

// Las dos caras del cliente en una sola llamada, para la vista de detalle.
export async function historialCliente(clienteId, { uid = null, max = 100 } = {}) {
  const [fichas, cotizaciones] = await Promise.all([
    listarFichasDeCliente(clienteId, { max }),
    listarCotizacionesDeCliente(clienteId, { uid, max }),
  ]);
  return { fichas, cotizaciones };
}

// ─── Vinculación de fichas anteriores ───────────────────────────────────────
// Las fichas creadas antes de esta relación solo tienen el nombre del cliente
// escrito a mano. Estas dos funciones las enganchan a su empresa: primero se
// calcula el plan (sin escribir nada) para poder revisarlo, y después se
// aplica. Solo se vincula cuando el nombre corresponde a una única empresa.

export async function calcularVinculacionPendiente(empresas, { max = 500 } = {}) {
  await waitForAuth();
  const porTipo = await Promise.all(
    Object.entries(FICHA_TIPOS).map(async ([tipo, cfg]) => {
      const fichas = await cfg.listar({ max });
      const plan = planVinculacion(fichas, empresas);
      return {
        tipo,
        col: cfg.col,
        label: cfg.label,
        vincular: plan.vincular,
        sinCoincidencia: plan.sinCoincidencia,
      };
    })
  );
  return {
    porTipo,
    totalVincular: porTipo.reduce((n, t) => n + t.vincular.length, 0),
    totalSinCoincidencia: porTipo.reduce((n, t) => n + t.sinCoincidencia.length, 0),
  };
}

// Escribe el plan. Un batch de Firestore admite 500 operaciones, así que se
// parte en tandas; cada ficha recibe el id de la empresa y la copia de sus
// datos, igual que si se hubiera creado con el selector.
export async function aplicarVinculacion(plan) {
  await waitForAuth();
  const escrituras = plan.porTipo.flatMap((t) =>
    t.vincular.map(({ ficha, datos }) => ({ col: t.col, id: ficha.id, datos }))
  );
  const TANDA = 400;
  for (let i = 0; i < escrituras.length; i += TANDA) {
    const batch = writeBatch(db);
    for (const { col, id, datos } of escrituras.slice(i, i + TANDA)) {
      batch.update(doc(db, col, id), { ...datos, updatedAt: serverTimestamp() });
    }
    await batch.commit();
  }
  return escrituras.length;
}
