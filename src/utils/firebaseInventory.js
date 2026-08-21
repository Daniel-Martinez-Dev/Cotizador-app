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
  runTransaction,
  serverTimestamp,
  updateDoc,
  where,
  writeBatch,
} from "firebase/firestore";
import { reservarConsecutivosMaterial } from "./firebaseConsecutivos";
import {
  generarCodigosMaterial,
  itemNecesitaCodigos,
  normalizarCodigoLeido,
} from "./codigoMaterial";

const ITEMS_COL = "inventario_items";
const SUPPLIERS_COL = "inventario_proveedores";
const MOVEMENTS_COL = "inventario_movimientos";

const sanitizeText = (v) => {
  if (v === null || typeof v === "undefined") return "";
  return String(v)
    .replace(/[\u0000-\u001F\u007F]/g, "")
    .replace(/\s+/g, " ")
    .trim();
};

const sanitizeNIT = (nit) => {
  if (nit === null || typeof nit === "undefined") return "";
  if (typeof nit === "number" && Number.isFinite(nit)) return String(Math.trunc(nit));
  let s = String(nit).replace(/[\"“”]/g, "").trim();
  if (!s) return "";
  s = s.replace(/\s+/g, "");

  if (/^\d+(?:\.\d+)?e\+\d+$/i.test(s)) {
    const asNum = Number(s);
    if (Number.isFinite(asNum)) s = String(Math.trunc(asNum));
  }

  s = s.replace(/[^0-9]/g, "");
  return s;
};

const sanitizePhone = (phone) => {
  if (phone === null || typeof phone === "undefined") return "";
  if (typeof phone === "number" && Number.isFinite(phone)) {
    const n = Math.trunc(phone);
    return n === 0 ? "" : String(n);
  }
  let s = String(phone).trim();
  if (!s) return "";
  s = s.replace(/\s+/g, "");

  if (/^\d+(?:\.\d+)?e\+\d+$/i.test(s)) {
    const asNum = Number(s);
    if (Number.isFinite(asNum)) s = String(Math.trunc(asNum));
  }

  s = s.replace(/[^0-9]/g, "");
  if (!s || s === "0") return "";
  return s;
};

const normalizeStringArray = (arr) => (
  Array.isArray(arr) ? arr.map((v) => String(v || "").trim()).filter(Boolean) : []
);

const normalizeSedes = (sedes) => {
  if (!Array.isArray(sedes)) return [];
  return sedes
    .map((s) => ({
      direccion: sanitizeText(s?.direccion),
      ciudad: sanitizeText(s?.ciudad),
    }))
    .filter((s) => s.direccion || s.ciudad);
};

const normalizeContactos = (contactos) => {
  if (!Array.isArray(contactos)) return [];
  return contactos
    .map((c) => ({
      nombre: sanitizeText(c?.nombre),
      telefono: sanitizePhone(c?.telefono),
      correo: sanitizeText(c?.correo),
    }))
    .filter((c) => c.nombre || c.telefono || c.correo);
};

const buildItemDoc = (data) => {
  const productoTipos = Array.isArray(data.productoTipos)
    ? data.productoTipos.map((v) => String(v || "").trim()).filter(Boolean)
    : (data.productoTipo ? [String(data.productoTipo).trim()].filter(Boolean) : []);

  const proveedorIds = Array.isArray(data.proveedorIds)
    ? data.proveedorIds.map((v) => String(v || "").trim()).filter(Boolean)
    : (data.proveedorId ? [String(data.proveedorId).trim()].filter(Boolean) : []);

  return {
    sku: (data.sku || "").trim(),
    // Código de barras interno de la etiqueta y el consecutivo del que salió
    // (ver utils/codigoMaterial.js). Se guarda el consecutivo aparte para poder
    // reimprimir o auditar una etiqueta sin tener que descomponer el EAN-13.
    codigoBarras: (data.codigoBarras || "").trim(),
    codigoSecuencia: Number(data.codigoSecuencia || 0),
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
  };
};

const buildProveedorDoc = (data) => {
  const razonSocial = sanitizeText(data.razonSocial || data.nombre);
  const nit = sanitizeNIT(data.nit);
  const sedes = normalizeSedes(data.sedes);
  const contactos = normalizeContactos(data.contactos);
  const productoTipos = normalizeStringArray(data.productoTipos);
  const materiasPrimas = normalizeStringArray(data.materiasPrimas);
  const primerContacto = contactos[0] || {};
  return {
    // Legacy + compatibilidad UI
    nombre: razonSocial,
    contacto: sanitizeText(data.contacto || primerContacto.nombre),
    telefono: sanitizePhone(data.telefono || primerContacto.telefono),
    email: sanitizeText(data.email || primerContacto.correo),

    // Nuevo esquema
    razonSocial,
    nit,
    sedes,
    contactos,
    modalidadEntrega: sanitizeText(data.modalidadEntrega),
    tipoPago: sanitizeText(data.tipoPago),
    productoTipos,
    materiasPrimas,

    leadTimeDias: Number(data.leadTimeDias || 0),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
};

export async function crearProveedor(data) {
  await waitForAuth();
  const ref = await addDoc(collection(db, SUPPLIERS_COL), buildProveedorDoc(data));
  return ref.id;
}

export async function crearProveedoresBulk(list) {
  await waitForAuth();
  const rows = Array.isArray(list) ? list : [];
  if (rows.length === 0) return { created: 0 };

  // Firestore batch limit: 500 ops. Usamos margen.
  const CHUNK = 400;
  let created = 0;
  for (let i = 0; i < rows.length; i += CHUNK) {
    const batch = writeBatch(db);
    const slice = rows.slice(i, i + CHUNK);
    for (const r of slice) {
      const ref = doc(collection(db, SUPPLIERS_COL));
      batch.set(ref, buildProveedorDoc(r));
      created += 1;
    }
    await batch.commit();
  }
  return { created };
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

export async function obtenerProveedorPorId(id) {
  await waitForAuth();
  if (!id) return null;
  const snap = await getDoc(doc(db, SUPPLIERS_COL, id));
  if (!snap.exists()) return null;
  const data = snap.data() || {};
  return {
    id: snap.id,
    ...data,
    nit: sanitizeNIT(data.nit),
    razonSocial: (data.razonSocial || data.nombre || "").trim(),
    sedes: normalizeSedes(data.sedes),
    contactos: normalizeContactos(data.contactos),
    productoTipos: normalizeStringArray(data.productoTipos),
    materiasPrimas: normalizeStringArray(data.materiasPrimas),
  };
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

// Todo material nace etiquetable: si no trae SKU ni código de barras se le
// asignan al crearlo, para que nunca queden items sin identificar que después
// haya que salir a buscar uno por uno.
//
// Un SKU escrito a mano se respeta —hay materiales que ya vienen con el código
// del proveedor— y solo se completa el código de barras que falte.
async function completarCodigosMaterial(data, secuencia = null) {
  if (!itemNecesitaCodigos(data)) return data;
  const n = secuencia ?? (await reservarConsecutivosMaterial(1));
  const codigos = generarCodigosMaterial({ categoria: data?.categoria, secuencia: n });
  if (!codigos) return data;
  return { ...data, ...codigos, sku: String(data?.sku || "").trim() || codigos.sku };
}

export async function crearItemInventario(data) {
  await waitForAuth();
  const conCodigos = await completarCodigosMaterial(data);
  const ref = await addDoc(collection(db, ITEMS_COL), buildItemDoc(conCodigos));
  return ref.id;
}

export async function crearItemsInventarioBulk(list) {
  await waitForAuth();
  const rows = Array.isArray(list) ? list : [];
  if (rows.length === 0) return { created: 0 };

  // Se aparta de una vez el bloque de consecutivos que va a hacer falta, en vez
  // de pedir uno por fila: una carga masiva son cientos de items y cada
  // consecutivo suelto es una transacción contra el mismo contador.
  const faltantes = rows.filter(itemNecesitaCodigos).length;
  let siguiente = faltantes > 0 ? await reservarConsecutivosMaterial(faltantes) : 0;
  const conCodigos = rows.map((r) => {
    if (!itemNecesitaCodigos(r)) return r;
    const codigos = generarCodigosMaterial({ categoria: r?.categoria, secuencia: siguiente });
    siguiente += 1;
    if (!codigos) return r;
    return { ...r, ...codigos, sku: String(r?.sku || "").trim() || codigos.sku };
  });

  const CHUNK = 400;
  let created = 0;
  for (let i = 0; i < conCodigos.length; i += CHUNK) {
    const batch = writeBatch(db);
    const slice = conCodigos.slice(i, i + CHUNK);
    for (const r of slice) {
      const ref = doc(collection(db, ITEMS_COL));
      batch.set(ref, buildItemDoc(r));
      created += 1;
    }
    await batch.commit();
  }
  return { created };
}

// Marca de una sola pasada todo el inventario que todavía no tiene etiqueta.
// Es la operación de arranque: el inventario ya existía antes de que hubiera
// códigos de barras, así que hay que poder ponérselos a todo lo que ya está.
//
// Numera en orden alfabético para que la hoja de etiquetas que se imprime
// después salga ordenada y sea fácil ir pegándolas recorriendo la bodega.
export async function asignarCodigosMaterialFaltantes(items = null) {
  await waitForAuth();
  const lista = Array.isArray(items) ? items : await listarItemsInventario();
  const pendientes = lista
    .filter(itemNecesitaCodigos)
    .sort((a, b) => String(a?.nombre || "").localeCompare(String(b?.nombre || ""), "es"));

  if (pendientes.length === 0) return { actualizados: 0, codigosPorItemId: {} };

  const desde = await reservarConsecutivosMaterial(pendientes.length);
  const codigosPorItemId = {};

  const CHUNK = 400;
  let actualizados = 0;
  for (let i = 0; i < pendientes.length; i += CHUNK) {
    const batch = writeBatch(db);
    for (const [j, item] of pendientes.slice(i, i + CHUNK).entries()) {
      const codigos = generarCodigosMaterial({
        categoria: item?.categoria,
        secuencia: desde + i + j,
      });
      if (!codigos) continue;
      // Un SKU puesto a mano no se pisa: solo se le añade el código de barras.
      const patch = { ...codigos, sku: String(item?.sku || "").trim() || codigos.sku };
      batch.update(doc(db, ITEMS_COL, item.id), { ...patch, updatedAt: serverTimestamp() });
      codigosPorItemId[item.id] = patch;
      actualizados += 1;
    }
    await batch.commit();
  }
  return { actualizados, codigosPorItemId };
}

// Busca el material que corresponde a un código leído. La lista que ya está en
// pantalla se consulta primero desde la UI; esto es el respaldo para cuando el
// material no está en ella (el listado se corta en 200) y para que un barrido
// nunca se quede sin respuesta por un problema de paginación.
export async function buscarItemPorCodigo(codigo) {
  await waitForAuth();
  const buscado = normalizarCodigoLeido(codigo);
  if (!buscado) return null;

  for (const campo of ["codigoBarras", "sku"]) {
    const q = query(collection(db, ITEMS_COL), where(campo, "==", buscado), limit(1));
    const snap = await getDocs(q);
    if (!snap.empty) {
      const d = snap.docs[0];
      const data = d.data() || {};
      const proveedorIds = Array.isArray(data.proveedorIds)
        ? data.proveedorIds.map((v) => String(v || "").trim()).filter(Boolean)
        : (data.proveedorId ? [String(data.proveedorId).trim()].filter(Boolean) : []);
      return { id: d.id, ...data, proveedorIds, proveedorId: proveedorIds[0] || (data.proveedorId || "") };
    }
  }
  return null;
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
  if (typeof patch.codigoBarras !== "undefined") {
    patch.codigoBarras = String(patch.codigoBarras || "").trim();
  }
  if (typeof patch.codigoSecuencia !== "undefined") {
    patch.codigoSecuencia = Number(patch.codigoSecuencia || 0);
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

// Núcleo compartido por los tres flujos que mueven stock: oficina
// (admin/inventario, costo obligatorio en ingresos), almacén (el almacenista,
// que sí registra el precio de la factura aunque no lo pueda consultar después)
// y planta (nunca fija costo). En salidas, los dos flujos de planta exigen
// quedar ligados a una orden de producción vía extraMovimientoFields.
async function registrarMovimientoInventarioCore(itemId, data, { requireCosto, extraMovimientoFields = {} }) {
  await waitForAuth();
  const tipo = data?.tipo === "salida" ? "salida" : "ingreso";
  const cantidad = Number(data?.cantidad || 0);
  if (!itemId) throw new Error("itemId requerido");
  if (Number.isNaN(cantidad) || cantidad <= 0) throw new Error("Cantidad inválida");

  const proveedorId = String(data?.proveedorId || "").trim();
  const costoProvisto = data?.costoUnitario != null;
  const costoUnitario = Number(data?.costoUnitario || 0);
  if (tipo === "ingreso") {
    if (!proveedorId) throw new Error("proveedorId requerido");
    if (requireCosto && (Number.isNaN(costoUnitario) || costoUnitario <= 0)) {
      throw new Error("Costo unitario inválido");
    }
  }

  const nota = (data?.nota || "").toString().trim();
  // Queda registrado qué código se barrió para elegir el material. Si algún día
  // un movimiento resulta estar en el item equivocado, esto dice si se
  // seleccionó a mano de la lista o se identificó con el lector.
  const codigoLeido = normalizarCodigoLeido(data?.codigoLeido);
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

    const itemPatch = {
      stockActual: stockDespues,
      lastMovimientoId: movRef.id,
      lastMovimientoAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    if (tipo === "ingreso" && costoProvisto) itemPatch.costoUnitario = costoUnitario;
    tx.update(itemRef, itemPatch);
    tx.set(movRef, {
      itemId,
      tipo,
      cantidad: Math.abs(cantidad),
      delta,
      stockAntes,
      stockDespues,
      nota,
      codigoLeido,
      proveedorId: proveedorId || "",
      // Datos de la factura de compra, cuando el ingreso los trae (ver
      // registrarMovimientoInventarioAlmacen).
      facturaNumero: (data?.facturaNumero || "").toString().trim(),
      facturaItem: (data?.facturaItem || "").toString().trim(),
      costoUnitario: tipo === "ingreso" && costoProvisto ? costoUnitario : 0,
      prevMovimientoId,
      prevMovimientoAt,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      ...extraMovimientoFields,
    });
  });

  return movRef.id;
}

export async function registrarMovimientoInventario(itemId, data) {
  return registrarMovimientoInventarioCore(itemId, data, { requireCosto: true });
}

// Toda salida desde planta queda ligada a una orden de producción: es lo que
// permite saber después en qué se gastó el material.
function camposSalidaPlanta(data) {
  const ordenProduccion = Number(data?.ordenProduccion || 0);
  if (!ordenProduccion || ordenProduccion <= 0) {
    throw new Error("Debes indicar la orden de producción para la salida");
  }
  const campos = { ordenProduccion };
  if (data?.codigoFicha) campos.codigoFicha = String(data.codigoFicha);
  if (data?.fichaId) campos.fichaId = String(data.fichaId);
  if (data?.fichaTipo) campos.fichaTipo = String(data.fichaTipo);
  return campos;
}

// Variante del almacenista (la tablet del almacén). A diferencia del empleado
// sí registra los datos de la compra —número de factura, ítem y precio
// unitario—, porque es quien tiene el papel del proveedor en la mano.
//
// Que pueda escribir el precio no significa que pueda consultarlo: el valor de
// la materia prima no se muestra en ninguna pantalla de planta (ver
// EmpleadoInventarioList y MovimientoModal).
export async function registrarMovimientoInventarioAlmacen(itemId, data) {
  const tipo = data?.tipo === "salida" ? "salida" : "ingreso";
  return registrarMovimientoInventarioCore(
    itemId,
    tipo === "ingreso" ? data : { ...data, costoUnitario: undefined },
    {
      requireCosto: false,
      extraMovimientoFields: tipo === "salida" ? camposSalidaPlanta(data) : {},
    },
  );
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
