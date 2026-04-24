import { db, waitForAuth } from "../firebase";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  limit,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  updateDoc,
  where,
} from "firebase/firestore";

const ITEMS_COL = "inventario_items";
const SUPPLIERS_COL = "inventario_proveedores";
const MOVEMENTS_COL = "inventario_movimientos";

const sanitizeNIT = (nit) => (nit ?? "").toString().replace(/[\"“”]/g, "").trim();

const normalizeStringArray = (arr) => (
  Array.isArray(arr) ? arr.map((v) => String(v || "").trim()).filter(Boolean) : []
);

const normalizeSedes = (sedes) => {
  if (!Array.isArray(sedes)) return [];
  return sedes
    .map((s) => ({
      direccion: (s?.direccion || "").trim(),
      ciudad: (s?.ciudad || "").trim(),
    }))
    .filter((s) => s.direccion || s.ciudad);
};

const normalizeContactos = (contactos) => {
  if (!Array.isArray(contactos)) return [];
  return contactos
    .map((c) => ({
      nombre: (c?.nombre || "").trim(),
      telefono: (c?.telefono || "").trim(),
      correo: (c?.correo || "").trim(),
    }))
    .filter((c) => c.nombre || c.telefono || c.correo);
};

export async function crearProveedor(data) {
  await waitForAuth();
  const razonSocial = (data.razonSocial || data.nombre || "").trim();
  const nit = sanitizeNIT(data.nit);
  const sedes = normalizeSedes(data.sedes);
  const contactos = normalizeContactos(data.contactos);
  const productoTipos = normalizeStringArray(data.productoTipos);
  const materiasPrimas = normalizeStringArray(data.materiasPrimas);
  const primerContacto = contactos[0] || {};
  const ref = await addDoc(collection(db, SUPPLIERS_COL), {
    // Legacy + compatibilidad UI
    nombre: razonSocial,
    contacto: (data.contacto || primerContacto.nombre || "").trim(),
    telefono: (data.telefono || primerContacto.telefono || "").trim(),
    email: (data.email || primerContacto.correo || "").trim(),

    // Nuevo esquema
    razonSocial,
    nit,
    sedes,
    contactos,
    modalidadEntrega: data.modalidadEntrega || "",
    tipoPago: data.tipoPago || "",
    productoTipos,
    materiasPrimas,

    leadTimeDias: Number(data.leadTimeDias || 0),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

export async function listarProveedores() {
  await waitForAuth();
  const q = query(collection(db, SUPPLIERS_COL), orderBy("createdAt", "desc"), limit(200));
  const snap = await getDocs(q);
  return snap.docs.map((d) => {
    const data = d.data() || {};
    return {
      id: d.id,
      ...data,
      nit: sanitizeNIT(data.nit),
      razonSocial: (data.razonSocial || data.nombre || "").trim(),
      sedes: normalizeSedes(data.sedes),
      contactos: normalizeContactos(data.contactos),
      productoTipos: normalizeStringArray(data.productoTipos),
      materiasPrimas: normalizeStringArray(data.materiasPrimas),
    };
  });
}

export async function actualizarProveedor(id, data) {
  await waitForAuth();
  const patch = { ...data };
  if (typeof patch.razonSocial !== "undefined" || typeof patch.nombre !== "undefined") {
    const razonSocial = (patch.razonSocial || patch.nombre || "").trim();
    patch.razonSocial = razonSocial;
    patch.nombre = razonSocial;
  }
  if (typeof patch.nit !== "undefined") patch.nit = sanitizeNIT(patch.nit);
  if (typeof patch.sedes !== "undefined") patch.sedes = normalizeSedes(patch.sedes);
  if (typeof patch.contactos !== "undefined") patch.contactos = normalizeContactos(patch.contactos);
  if (typeof patch.productoTipos !== "undefined") patch.productoTipos = normalizeStringArray(patch.productoTipos);
  if (typeof patch.materiasPrimas !== "undefined") patch.materiasPrimas = normalizeStringArray(patch.materiasPrimas);

  // Mantener campos legacy en sync con el primer contacto, si no vienen explícitos
  if (Array.isArray(patch.contactos) && patch.contactos.length > 0) {
    const c0 = patch.contactos[0] || {};
    if (typeof patch.contacto === "undefined") patch.contacto = (c0.nombre || "").trim();
    if (typeof patch.telefono === "undefined") patch.telefono = (c0.telefono || "").trim();
    if (typeof patch.email === "undefined") patch.email = (c0.correo || "").trim();
  }

  await updateDoc(doc(db, SUPPLIERS_COL, id), { ...patch, updatedAt: serverTimestamp() });
}

export async function crearItemInventario(data) {
  await waitForAuth();
  const productoTipos = Array.isArray(data.productoTipos)
    ? data.productoTipos.map((v) => String(v || "").trim()).filter(Boolean)
    : (data.productoTipo ? [String(data.productoTipo).trim()].filter(Boolean) : []);

  const proveedorIds = Array.isArray(data.proveedorIds)
    ? data.proveedorIds.map((v) => String(v || "").trim()).filter(Boolean)
    : (data.proveedorId ? [String(data.proveedorId).trim()].filter(Boolean) : []);

  const ref = await addDoc(collection(db, ITEMS_COL), {
    sku: (data.sku || "").trim(),
    nombre: (data.nombre || "").trim(),
    // Nuevo esquema: un item puede estar asociado a varios productos del cotizador.
    productoTipos,
    // Campo legacy (primero) para compatibilidad con datos antiguos
    productoTipo: productoTipos[0] || (data.productoTipo || "").trim(),
    categoria: (data.categoria || "").trim(),
    unidad: (data.unidad || "").trim(),
    stockActual: Number(data.stockActual || 0),
    stockMinimo: Number(data.stockMinimo || 0),
    ubicacion: (data.ubicacion || "").trim(),
    costoUnitario: Number(data.costoUnitario || 0),
    // Relación varios-a-varios (nuevo)
    proveedorIds,
    // Campo legacy (primero) para compatibilidad con datos antiguos/UI
    proveedorId: proveedorIds[0] || (data.proveedorId || ""),
    fotoDataUrl: typeof data.fotoDataUrl === "string" ? data.fotoDataUrl : "",
    fotoFileName: (data.fotoFileName || "").trim(),
    fotoMimeType: (data.fotoMimeType || "").trim(),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

export async function listarItemsInventario() {
  await waitForAuth();
  const q = query(collection(db, ITEMS_COL), orderBy("createdAt", "desc"), limit(200));
  const snap = await getDocs(q);
  return snap.docs.map((d) => {
    const data = d.data() || {};
    const proveedorIds = Array.isArray(data.proveedorIds)
      ? data.proveedorIds.map((v) => String(v || "").trim()).filter(Boolean)
      : (data.proveedorId ? [String(data.proveedorId).trim()].filter(Boolean) : []);
    return {
      id: d.id,
      ...data,
      proveedorIds,
      proveedorId: proveedorIds[0] || (data.proveedorId || ""),
    };
  });
}

export async function actualizarItemInventario(id, data) {
  await waitForAuth();
  const patch = { ...data };
  if (Array.isArray(patch.productoTipos)) {
    const normalized = patch.productoTipos.map((v) => String(v || "").trim()).filter(Boolean);
    patch.productoTipos = normalized;
    // Mantener campo legacy en sync
    if (typeof patch.productoTipo === "undefined") patch.productoTipo = normalized[0] || "";
  }
  if (typeof patch.fotoDataUrl !== "undefined") {
    patch.fotoDataUrl = typeof patch.fotoDataUrl === "string" ? patch.fotoDataUrl : "";
  }
  if (typeof patch.fotoFileName !== "undefined") {
    patch.fotoFileName = (patch.fotoFileName || "").trim();
  }
  if (typeof patch.fotoMimeType !== "undefined") {
    patch.fotoMimeType = (patch.fotoMimeType || "").trim();
  }

  // Relación proveedores (varios-a-varios)
  if (typeof patch.proveedorIds !== "undefined") {
    const normalized = Array.isArray(patch.proveedorIds)
      ? patch.proveedorIds.map((v) => String(v || "").trim()).filter(Boolean)
      : [];
    patch.proveedorIds = normalized;
    // Mantener campo legacy en sync
    if (typeof patch.proveedorId === "undefined") patch.proveedorId = normalized[0] || "";
  }
  if (typeof patch.proveedorId !== "undefined" && typeof patch.proveedorIds === "undefined") {
    const v = String(patch.proveedorId || "").trim();
    patch.proveedorId = v;
    patch.proveedorIds = v ? [v] : [];
  }

  await updateDoc(doc(db, ITEMS_COL, id), { ...patch, updatedAt: serverTimestamp() });
}

export async function eliminarItemInventario(id) {
  await waitForAuth();
  await deleteDoc(doc(db, ITEMS_COL, id));
}

export async function eliminarProveedor(id) {
  await waitForAuth();
  await deleteDoc(doc(db, SUPPLIERS_COL, id));
}

export async function registrarMovimientoInventario(itemId, data) {
  await waitForAuth();
  const tipo = data?.tipo === "salida" ? "salida" : "ingreso";
  const cantidad = Number(data?.cantidad || 0);
  if (!itemId) throw new Error("itemId requerido");
  if (Number.isNaN(cantidad) || cantidad <= 0) throw new Error("Cantidad inválida");

  const nota = (data?.nota || "").toString().trim();
  const delta = tipo === "salida" ? -Math.abs(cantidad) : Math.abs(cantidad);

  const itemRef = doc(db, ITEMS_COL, itemId);
  const movRef = doc(collection(db, MOVEMENTS_COL));

  await runTransaction(db, async (tx) => {
    const snap = await tx.get(itemRef);
    if (!snap.exists()) throw new Error("Item no encontrado");
    const item = snap.data() || {};
    const stockAntes = Number(item.stockActual || 0);
    const stockDespues = stockAntes + delta;
    if (stockDespues < 0) throw new Error("Stock insuficiente para registrar la salida");

    const prevMovimientoId = String(item.lastMovimientoId || "");
    const prevMovimientoAt = item.lastMovimientoAt || null;

    tx.update(itemRef, {
      stockActual: stockDespues,
      lastMovimientoId: movRef.id,
      lastMovimientoAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    tx.set(movRef, {
      itemId,
      tipo,
      cantidad: Math.abs(cantidad),
      delta,
      stockAntes,
      stockDespues,
      nota,
      prevMovimientoId,
      prevMovimientoAt,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  });

  return movRef.id;
}

export async function listarMovimientosGeneral({ max = 200 } = {}) {
  await waitForAuth();
  const safeMax = Math.max(1, Math.min(500, Number(max || 200)));
  const q = query(
    collection(db, MOVEMENTS_COL),
    orderBy("createdAt", "desc"),
    limit(safeMax)
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function actualizarMovimientoInventario(movimientoId, data) {
  await waitForAuth();
  if (!movimientoId) throw new Error("movimientoId requerido");

  const nota = (data?.nota || "").toString().trim();
  const wantsDeltaChange = typeof data?.tipo !== "undefined" || typeof data?.cantidad !== "undefined";
  const newTipo = data?.tipo === "salida" ? "salida" : "ingreso";
  const newCantidad = Number(data?.cantidad || 0);
  if (wantsDeltaChange && (Number.isNaN(newCantidad) || newCantidad <= 0)) throw new Error("Cantidad inválida");

  const movRef = doc(db, MOVEMENTS_COL, movimientoId);

  await runTransaction(db, async (tx) => {
    const movSnap = await tx.get(movRef);
    if (!movSnap.exists()) throw new Error("Movimiento no encontrado");
    const mov = movSnap.data() || {};
    const itemId = String(mov.itemId || "");
    if (!itemId) throw new Error("Movimiento sin itemId");

    // Editar solo nota (si no cambia delta)
    if (!wantsDeltaChange) {
      tx.update(movRef, { nota, updatedAt: serverTimestamp() });
      return;
    }

    const itemRef = doc(db, ITEMS_COL, itemId);
    const itemSnap = await tx.get(itemRef);
    if (!itemSnap.exists()) throw new Error("Item no encontrado");
    const item = itemSnap.data() || {};

    // Para no romper consistencia, solo permitimos editar cantidad/tipo si es el último movimiento del item.
    if (String(item.lastMovimientoId || "") !== movimientoId) {
      throw new Error("Solo se puede editar cantidad/tipo del último movimiento del item");
    }

    const oldDelta = Number(mov.delta || 0);
    const stockActual = Number(item.stockActual || 0);
    const stockAntes = stockActual - oldDelta;
    const newDelta = newTipo === "salida" ? -Math.abs(newCantidad) : Math.abs(newCantidad);
    const stockDespues = stockAntes + newDelta;
    if (stockDespues < 0) throw new Error("Stock insuficiente para ese cambio");

    tx.update(itemRef, { stockActual: stockDespues, updatedAt: serverTimestamp() });
    tx.update(movRef, {
      tipo: newTipo,
      cantidad: Math.abs(newCantidad),
      delta: newDelta,
      stockAntes,
      stockDespues,
      nota,
      updatedAt: serverTimestamp(),
    });
  });
}

export async function eliminarMovimientoInventario(movimientoId) {
  await waitForAuth();
  if (!movimientoId) throw new Error("movimientoId requerido");

  const movRef = doc(db, MOVEMENTS_COL, movimientoId);

  await runTransaction(db, async (tx) => {
    const movSnap = await tx.get(movRef);
    if (!movSnap.exists()) throw new Error("Movimiento no encontrado");
    const mov = movSnap.data() || {};
    const itemId = String(mov.itemId || "");
    if (!itemId) throw new Error("Movimiento sin itemId");

    const itemRef = doc(db, ITEMS_COL, itemId);
    const itemSnap = await tx.get(itemRef);
    if (!itemSnap.exists()) throw new Error("Item no encontrado");
    const item = itemSnap.data() || {};

    if (String(item.lastMovimientoId || "") !== movimientoId) {
      throw new Error("Solo se puede borrar el último movimiento del item");
    }

    const oldDelta = Number(mov.delta || 0);
    const stockActual = Number(item.stockActual || 0);
    const restoredStock = stockActual - oldDelta;
    if (restoredStock < 0) throw new Error("No se puede borrar: stock quedaría negativo");

    const prevMovimientoId = String(mov.prevMovimientoId || "");
    const prevMovimientoAt = mov.prevMovimientoAt || null;

    tx.update(itemRef, {
      stockActual: restoredStock,
      lastMovimientoId: prevMovimientoId,
      lastMovimientoAt: prevMovimientoId ? prevMovimientoAt : null,
      updatedAt: serverTimestamp(),
    });
    tx.delete(movRef);
  });
}

export async function listarMovimientosPorItem(itemId, { max = 50 } = {}) {
  await waitForAuth();
  if (!itemId) return [];
  const safeMax = Math.max(1, Math.min(200, Number(max || 50)));

  const normalizeTime = (ts) => {
    try {
      if (!ts) return 0;
      if (typeof ts.toMillis === "function") return ts.toMillis();
      if (typeof ts.toDate === "function") return ts.toDate().getTime();
      if (typeof ts.seconds === "number") return ts.seconds * 1000;
      return 0;
    } catch {
      return 0;
    }
  };

  // Query ideal (requiere índice compuesto itemId + createdAt)
  try {
    const q = query(
      collection(db, MOVEMENTS_COL),
      where("itemId", "==", itemId),
      orderBy("createdAt", "desc"),
      limit(safeMax)
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  } catch (e) {
    // Fallback sin orderBy para no bloquear la UI cuando falta el índice.
    const code = e?.code || "";
    const msg = (e?.message || "").toLowerCase();
    const needsIndex = code === "failed-precondition" && msg.includes("requires an index");
    if (!needsIndex) throw e;

    const q = query(
      collection(db, MOVEMENTS_COL),
      where("itemId", "==", itemId),
      limit(Math.min(200, safeMax * 4))
    );
    const snap = await getDocs(q);
    const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    rows.sort((a, b) => normalizeTime(b.createdAt) - normalizeTime(a.createdAt));
    return rows.slice(0, safeMax);
  }
}
