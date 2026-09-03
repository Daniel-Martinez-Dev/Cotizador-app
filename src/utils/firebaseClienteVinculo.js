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
import { listarContactos, crearContacto, eliminarEmpresa } from "./firebaseCompanies";
import { claveContacto } from "./empresaIdentidad";

const COTIZACIONES_COL = "cotizaciones";

// Colecciones de la sección contable que cuelgan de una empresa. Van aquí y no
// en firebaseContabilidad para que fusionar un cliente no pueda olvidarse de
// ninguna: si una factura se queda apuntando a la empresa que se borró,
// desaparece de la cartera de su cliente y el saldo deja de cuadrar.
const CONTABILIDAD = [
  { col: "contabilidad_documentos", campo: "empresaId", clave: "facturas" },
  { col: "contabilidad_pagos", campo: "empresaId", clave: "abonos" },
  { col: "contabilidad_saldos_iniciales", campo: "empresaId", clave: "saldos" },
];

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

// ─── Fusión de empresas duplicadas ──────────────────────────────────────────
// Con dos registros del mismo cliente, la historia queda partida: unas fichas
// cuelgan de uno y otras del otro. Fusionar deja una sola empresa con todo.

// Cuántas fichas y cotizaciones cuelgan de una empresa. Se consulta antes de
// borrar o fusionar para poder decir qué se está moviendo (o qué se rompería).
export async function contarRelacionesEmpresa(empresaId) {
  const vacio = { fichas: 0, cotizaciones: 0, facturas: 0, abonos: 0, saldos: 0, total: 0, incompleto: false };
  if (!empresaId) return vacio;
  await waitForAuth();

  // Las colecciones contables solo las lee quien tenga el rol; un usuario sin
  // él no puede quedarse sin poder ver el resto del conteo, así que un fallo
  // por permisos marca `incompleto` en vez de tumbar la cuenta entera. Esto es
  // para *avisar*: quien de verdad mueve los datos es referenciasDeEmpresa, y
  // ahí un fallo sí aborta.
  const contar = async (col, campo) => {
    const snap = await getDocs(query(collection(db, col), where(campo, "==", empresaId)));
    return snap.size;
  };

  const [porTipo, cotizaciones] = await Promise.all([
    Promise.all(Object.values(FICHA_TIPOS).map((cfg) => contar(cfg.col, CAMPO_CLIENTE_FICHA))),
    contar(COTIZACIONES_COL, CAMPO_CLIENTE_COTIZACION),
  ]);

  const salida = { ...vacio, fichas: porTipo.reduce((a, b) => a + b, 0), cotizaciones };
  for (const { col, campo, clave } of CONTABILIDAD) {
    try {
      salida[clave] = await contar(col, campo);
    } catch (e) {
      console.error(`No se pudo contar ${col} de la empresa`, empresaId, e);
      salida.incompleto = true;
    }
  }
  salida.total = salida.fichas + salida.cotizaciones + salida.facturas + salida.abonos + salida.saldos;
  return salida;
}

// Todo lo que apunta a una empresa: fichas, cotizaciones, y las facturas,
// abonos y saldos de la sección contable.
//
// Aquí no hay red de seguridad a propósito. Si una de estas lecturas falla, la
// fusión se cae antes de borrar nada; tragarse el error dejaría las facturas
// de la empresa borrada apuntando al vacío, que es justo lo que no puede
// pasar.
async function referenciasDeEmpresa(empresaId) {
  const listas = await Promise.all([
    ...Object.values(FICHA_TIPOS).map(async (cfg) => {
      const snap = await getDocs(query(collection(db, cfg.col), where(CAMPO_CLIENTE_FICHA, "==", empresaId)));
      return snap.docs.map((d) => ({ col: cfg.col, id: d.id, campo: CAMPO_CLIENTE_FICHA }));
    }),
    (async () => {
      const snap = await getDocs(query(collection(db, COTIZACIONES_COL), where(CAMPO_CLIENTE_COTIZACION, "==", empresaId)));
      return snap.docs.map((d) => ({ col: COTIZACIONES_COL, id: d.id, campo: CAMPO_CLIENTE_COTIZACION }));
    })(),
    ...CONTABILIDAD.map(async ({ col, campo, clave }) => {
      const snap = await getDocs(query(collection(db, col), where(campo, "==", empresaId)));
      return snap.docs.map((d) => ({ col, id: d.id, campo, clave }));
    }),
  ]);
  return listas.flat();
}

/**
 * Deja una sola empresa donde había varias. Mueve los contactos que falten,
 * repunta a la principal las fichas y cotizaciones de las duplicadas, y borra
 * las duplicadas (con su subcolección).
 *
 * Lo que NO cambia es el nombre impreso dentro de cada ficha: es la copia del
 * momento en que salió a planta y por eso se dejó congelada (ver
 * clienteVinculo.js). La fusión arregla a quién apunta la ficha, no lo que
 * dice el papel que ya se imprimió.
 *
 * Borrar exige rol admin (ver firestore.rules), así que esta operación es de
 * administrador.
 */
export async function fusionarEmpresas(principal, duplicadas = []) {
  if (!principal?.id) throw new Error("Falta la empresa principal");
  const otras = duplicadas.filter((e) => e?.id && e.id !== principal.id);
  if (otras.length === 0) {
    return {
      contactosMovidos: 0, fichasMovidas: 0, cotizacionesMovidas: 0,
      facturasMovidas: 0, abonosMovidos: 0, saldosMovidos: 0, empresasBorradas: 0,
    };
  }
  await waitForAuth();

  // Contactos: se copian a la principal los que no estén ya (por email o, si no
  // tiene, por nombre). Ver claveContacto en empresaIdentidad.js.
  const contactosPrincipal = await listarContactos(principal.id);
  const claves = new Set(contactosPrincipal.map(claveContacto).filter(Boolean));
  let contactosMovidos = 0;
  for (const dup of otras) {
    for (const c of await listarContactos(dup.id)) {
      const clave = claveContacto(c);
      if (clave && claves.has(clave)) continue;
      await crearContacto(principal.id, { nombre: c.nombre, email: c.email, telefono: c.telefono, cargo: c.cargo });
      if (clave) claves.add(clave);
      contactosMovidos++;
    }
  }

  // Fichas y cotizaciones: solo se repunta la llave.
  //
  // En los documentos contables se repunta además el nombre. Ahí el nombre no
  // es la copia congelada de un papel impreso —eso son las fichas— sino lo que
  // el listado y la cartera muestran: dejarlo con el nombre de la empresa que
  // se acaba de borrar sería mostrar un cliente que ya no existe.
  const referencias = (await Promise.all(otras.map((d) => referenciasDeEmpresa(d.id)))).flat();
  const nombrePrincipal = String(principal.nombre || "").trim();
  const nitPrincipal = String(principal.nit || "").trim();
  const TANDA = 400;
  for (let i = 0; i < referencias.length; i += TANDA) {
    const batch = writeBatch(db);
    for (const ref of referencias.slice(i, i + TANDA)) {
      const parche = { [ref.campo]: principal.id, updatedAt: serverTimestamp() };
      if (ref.clave) {
        if (nombrePrincipal) parche.clienteNombre = nombrePrincipal;
        if (nitPrincipal) parche.clienteNit = nitPrincipal;
      }
      batch.update(doc(db, ref.col, ref.id), parche);
    }
    await batch.commit();
  }

  for (const dup of otras) await eliminarEmpresa(dup.id);

  const cuantas = (clave) => referencias.filter((r) => r.clave === clave).length;
  return {
    contactosMovidos,
    fichasMovidas: referencias.filter((r) => r.campo === CAMPO_CLIENTE_FICHA).length,
    cotizacionesMovidas: referencias.filter((r) => r.campo === CAMPO_CLIENTE_COTIZACION).length,
    facturasMovidas: cuantas("facturas"),
    abonosMovidos: cuantas("abonos"),
    saldosMovidos: cuantas("saldos"),
    empresasBorradas: otras.length,
  };
}
