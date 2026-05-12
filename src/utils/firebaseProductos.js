import { db } from '../firebase';
import {
  collection, getDocs, getDoc, doc, setDoc, writeBatch,
  serverTimestamp, query, orderBy
} from 'firebase/firestore';
import { priceMatrices, matrizPanamericana, EXTRAS_POR_DEFECTO, EXTRAS_UNIVERSALES } from '../data/precios';
import {
  PRODUCTOS_ACTIVOS,
  getDescripcionGeneral,
  getEspecificacionesHTML,
  getConfigProducto,
} from '../data/catalogoProductos';
import { generarCondicionesComerciales } from './htmlSections';

const COLECCION = 'productos';

// Firestore no soporta arrays anidados. Serializamos base como JSON string.
function serializarMatrices(data) {
  const out = { ...data };
  if (out.matriz?.base && Array.isArray(out.matriz.base)) {
    out.matriz = { ...out.matriz, base: JSON.stringify(out.matriz.base) };
  }
  if (out.matrizPanamericana?.base && Array.isArray(out.matrizPanamericana.base)) {
    out.matrizPanamericana = { ...out.matrizPanamericana, base: JSON.stringify(out.matrizPanamericana.base) };
  }
  return out;
}

function deserializarMatrices(data) {
  const out = { ...data };
  if (out.matriz?.base && typeof out.matriz.base === 'string') {
    out.matriz = { ...out.matriz, base: JSON.parse(out.matriz.base) };
  }
  if (out.matrizPanamericana?.base && typeof out.matrizPanamericana.base === 'string') {
    out.matrizPanamericana = { ...out.matrizPanamericana, base: JSON.parse(out.matrizPanamericana.base) };
  }
  return out;
}

export async function cargarProductos() {
  try {
    const q = query(collection(db, COLECCION), orderBy('orden'));
    const snap = await getDocs(q);
    if (snap.empty) return null;
    return snap.docs.map(d => deserializarMatrices({ id: d.id, ...d.data() }));
  } catch (e) {
    console.error('Error cargando productos:', e);
    return null;
  }
}

export async function guardarProducto(id, data) {
  const docRef = doc(db, COLECCION, id);
  await setDoc(docRef, { ...serializarMatrices(data), updatedAt: serverTimestamp() }, { merge: true });
}

// Sube un archivo a Cloudinary. Retorna la URL pública.
export async function subirFotoProducto(_productoId, file) {
  const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
  const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;
  if (!cloudName || !uploadPreset) throw new Error('Credenciales de Cloudinary no configuradas (VITE_CLOUDINARY_CLOUD_NAME / VITE_CLOUDINARY_UPLOAD_PRESET)');
  const form = new FormData();
  form.append('file', file);
  form.append('upload_preset', uploadPreset);
  const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, { method: 'POST', body: form });
  const json = await res.json();
  if (!res.ok) throw new Error(`Cloudinary error ${res.status}: ${json?.error?.message || JSON.stringify(json)}`);
  return json.secure_url;
}

// Construye la lista de extras por producto (propios + universales sin duplicar)
function buildExtras(etiqueta) {
  const cfg = getConfigProducto(etiqueta);
  const key = cfg?.extrasKey || etiqueta;
  const propios = EXTRAS_POR_DEFECTO[key] || [];
  const byName = new Map();
  [...propios, ...EXTRAS_UNIVERSALES].forEach(e => {
    if (e && e.nombre) byName.set(e.nombre.toLowerCase(), e);
  });
  return Array.from(byName.values());
}

function buildSeedDoc(etiqueta, orden) {
  const cfg = getConfigProducto(etiqueta);

  const docData = {
    etiqueta,
    nombre: etiqueta,
    descripcionGeneral: getDescripcionGeneral(etiqueta),
    especificacionesHTML: getEspecificacionesHTML(etiqueta),
    fotos: [],
    tipoCalculo: cfg?.tipoCalculo || 'especial',
    requiereMedidas: cfg?.requiereMedidas || false,
    orden,
    activo: true,
    extras: buildExtras(etiqueta),
  };

  if (cfg?.tipoCalculo === 'matriz') {
    const matriz = priceMatrices[etiqueta];
    if (matriz && Array.isArray(matriz.base)) {
      docData.matriz = {
        base: JSON.stringify(matriz.base), // serializado para Firestore
        anchoRanges: matriz.anchoRanges,
        altoRanges: matriz.altoRanges,
      };
    }
    if (etiqueta === 'Abrigo Retráctil Estándar' || etiqueta === 'Abrigo Retráctil Inflable') {
      docData.usarLookupAbrigo = true;
    }
    if (cfg?.factorBaseCliente) {
      docData.factorBaseCliente = cfg.factorBaseCliente;
    }
    if (etiqueta === 'Divisiones Térmicas') {
      docData.matrizPanamericana = {
        base: JSON.stringify(matrizPanamericana.base), // serializado para Firestore
        anchoRanges: matrizPanamericana.anchoRanges,
        altoRanges: matrizPanamericana.altoRanges,
      };
    }
  }

  if (cfg?.tipoCalculo === 'componentes') {
    const matriz = priceMatrices[etiqueta];
    if (matriz) {
      docData.matrizComponentes = {
        base: matriz.base,
        medidaRanges: matriz.medidaRanges,
      };
    }
  }

  if (cfg?.variantes) {
    docData.variantes = cfg.variantes.map(v => ({
      id: v.id,
      nombre: v.nombre,
      precio: v.precio,
    }));
  }

  if (etiqueta === 'Lámpara Industrial') docData.precioFijo = 590000;
  if (etiqueta === 'Canastilla de Seguridad') docData.precioFijo = 5410000;
  if (etiqueta === 'Cortina Thermofilm') {
    docData.precioPorM2ConInstalacion = 180000;
    docData.precioPorM2SinInstalacion = 175000;
  }

  return docData;
}

// Sube las imágenes locales de un producto a Cloudinary y actualiza Firestore.
// imageUrls: array de URLs (import de Vite). onProgress(actual, total) opcional.
export async function migrarImagenesProducto(productoId, imageUrls, onProgress) {
  const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
  const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;
  if (!cloudName || !uploadPreset) throw new Error('Credenciales de Cloudinary no configuradas');

  const urls = [];
  for (let i = 0; i < imageUrls.length; i++) {
    const imageUrl = imageUrls[i];
    onProgress?.(i, imageUrls.length);
    const res = await fetch(imageUrl);
    const blob = await res.blob();
    const ext = blob.type.split('/')[1] || 'jpg';
    const file = new File([blob], `imagen_${i}.${ext}`, { type: blob.type });
    const url = await subirFotoProducto(productoId, file);
    urls.push(url);
  }
  onProgress?.(imageUrls.length, imageUrls.length);

  // Actualiza solo el campo fotos (merge)
  const docRef = doc(db, COLECCION, productoId);
  await setDoc(docRef, { fotos: urls, updatedAt: serverTimestamp() }, { merge: true });
  return urls;
}

// ── Términos y condiciones globales (config/terminos) ────────────────────────
export async function cargarTerminos() {
  try {
    const snap = await getDoc(doc(db, 'config', 'terminos'));
    if (!snap.exists()) return '';
    return snap.data().contenidoHTML || '';
  } catch (e) {
    console.error('Error cargando términos:', e);
    return '';
  }
}

export async function guardarTerminos(contenidoHTML) {
  await setDoc(doc(db, 'config', 'terminos'), { contenidoHTML, updatedAt: serverTimestamp() }, { merge: true });
}

// Migración única: escribe los 10 productos en Firestore desde los datos hardcodeados.
export async function sembrarProductos() {
  const batch = writeBatch(db);
  PRODUCTOS_ACTIVOS.forEach((etiqueta, idx) => {
    const docRef = doc(collection(db, COLECCION));
    const data = buildSeedDoc(etiqueta, idx);
    batch.set(docRef, { ...data, updatedAt: serverTimestamp() });
  });
  await batch.commit();
}

// Actualiza solo condicionesComerciales en los docs existentes usando la lógica real de htmlSections.
export async function migrarCondicionesComerciales() {
  const snap = await getDocs(collection(db, COLECCION));
  if (snap.empty) throw new Error('No hay productos en Firestore. Ejecuta la migración inicial primero.');
  const batch = writeBatch(db);
  snap.docs.forEach(d => {
    const etiqueta = d.data().etiqueta;
    const mockCot = { productos: [{ tipo: etiqueta }] };
    const condiciones = generarCondicionesComerciales(mockCot, 0);
    if (condiciones) {
      batch.update(d.ref, { condicionesComerciales: condiciones, updatedAt: serverTimestamp() });
    }
  });
  await batch.commit();
}
