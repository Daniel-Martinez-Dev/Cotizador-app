import { fmtDate } from "./fichaFormat";

// Firmas de planta de una ficha de fabricación.
//
// El pie de toda ficha lleva dos filas de responsables — "Pedido alistado y
// empacado por" y "Revisado y aprobado por" (ver FichaVisualKit). Antes se
// diligenciaban a mano sobre el papel; ahora las cierra la app y los nombres
// salen impresos con la fecha en que firmaron.
//
// Cada etapa es la condición de un cambio de estado, no un trámite aparte:
//   en producción → terminada   exige `alistado`
//   terminada     → entregada   exige `revisado`
// Firmar es lo que mueve la ficha, por eso el modal de cada transición pide la
// firma y el estado se escribe en la misma operación (ver firebaseFichas.js).

export const ETAPAS_FIRMA = {
  alistado: {
    // Rótulo de la fila en la ficha impresa: tiene que coincidir palabra por
    // palabra con lo que la planta ya conoce del formato en papel.
    titulo: "Pedido alistado y empacado por",
    corto: "Alistado y empacado",
    // Espacios que dibuja la ficha impresa cuando todavía no hay firmas.
    espacios: 3,
    // Subcarpeta en Storage del registro fotográfico de la etapa.
    carpeta: "alistado",
    estado: "terminado",
  },
  revisado: {
    titulo: "Revisado y aprobado por",
    corto: "Revisado y aprobado",
    espacios: 2,
    carpeta: "revision",
    estado: "entregado",
  },
};

export const ETAPAS = Object.keys(ETAPAS_FIRMA);

// Estado destino → etapa que hay que firmar para llegar a él.
export const ETAPA_DE_ESTADO = {
  terminado: "alistado",
  entregado: "revisado",
};

export function getEtapaFirma(etapa) {
  const cfg = ETAPAS_FIRMA[etapa];
  if (!cfg) throw new Error(`Etapa de firma desconocida: ${etapa}`);
  return cfg;
}

// Fecha de hoy en "YYYY-MM-DD", en hora local. `toISOString()` daría la fecha
// UTC: en Colombia (UTC-5) firmar después de las 7 p.m. dejaría impresa en la
// ficha la fecha de mañana.
export function hoyISO() {
  const d = new Date();
  const mes = String(d.getMonth() + 1).padStart(2, "0");
  const dia = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mes}-${dia}`;
}

// Fecha de una firma en texto corto. Puede venir como "YYYY-MM-DD" (lo que
// guarda la app) o como Timestamp de Firestore (fichas cerradas con el modelo
// anterior, que usaba serverTimestamp).
export function fechaFirmaTexto(valor) {
  if (!valor) return "";
  if (typeof valor === "string") return fmtDate(valor);
  const ms = typeof valor.toMillis === "function"
    ? valor.toMillis()
    : valor.seconds
      ? valor.seconds * 1000
      : new Date(valor).getTime();
  if (!ms || Number.isNaN(ms)) return "";
  return new Date(ms).toLocaleDateString("es-CO");
}

// Deja la lista de firmantes en la forma que se guarda: {uid, nombre} y, si la
// persona dibujó su firma en su perfil, `firma` con esa imagen. El uid va vacío
// en los operarios sin cuenta en la app, que se escriben a mano; el nombre es lo
// único obligatorio porque es lo que se imprime.
//
// La firma se copia dentro de la ficha en vez de leerse del perfil al imprimir:
// la ficha firmada es una constancia de lo que se firmó ese día, así que cambiar
// después la firma en el perfil no puede reescribir las fichas ya cerradas.
//
// Se quitan los repetidos —la misma persona marcada de la lista y escrita a
// mano— comparando por uid, y si no lo hay por nombre sin tildes ni mayúsculas.
export function normalizarPersonasFirma(lista) {
  const vistos = new Set();
  return (Array.isArray(lista) ? lista : [])
    .map((p) => {
      const persona = {
        uid: (p?.uid || "").toString().trim(),
        nombre: (p?.nombre || "").toString().trim().replace(/\s+/g, " "),
      };
      // El campo solo existe cuando hay imagen: quien no tiene firma dibujada
      // no mete un campo vacío en la ficha, y sigue saliendo con su nombre
      // sobre la línea, como siempre.
      const firma = (p?.firma || "").toString();
      if (firma.startsWith("data:image/")) persona.firma = firma;
      return persona;
    })
    .filter((p) => {
      if (!p.nombre) return false;
      const clave = p.uid || claveNombre(p.nombre);
      if (vistos.has(clave)) return false;
      vistos.add(clave);
      return true;
    });
}

// Nombre reducido a lo comparable: sin tildes, sin mayúsculas, sin dobles
// espacios. Sirve para no repetir un firmante y para reconocer a alguien del
// directorio cuando su nombre se escribió a mano.
export function claveNombre(nombre) {
  return (nombre || "").toString().trim().replace(/\s+/g, " ")
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

// Lo único imprescindible de una foto es su URL: es lo que se muestra. El
// `publicId` es su identificador en Cloudinary y se guarda para poder dar con
// el archivo desde la consola —borrarlo exige firma y no se hace desde la app
// (ver cloudinary.js)—, así que se acarrea solo cuando viene.
export function normalizarFotos(fotos) {
  return (Array.isArray(fotos) ? fotos : [])
    .filter((f) => f?.url)
    .map((f) => {
      const foto = { url: f.url, nombre: f.nombre || "" };
      if (f.publicId) foto.publicId = f.publicId;
      return foto;
    });
}

// Un bloque de firma ya guardado, listo para pintar. Devuelve null cuando la
// etapa no se ha firmado, que es lo que consultan la app y la ficha impresa
// para saber si dibujan nombres o líneas en blanco.
export function normalizarBloqueFirma(bloque) {
  if (!bloque) return null;
  const personas = normalizarPersonasFirma(bloque.personas);
  if (personas.length === 0) return null;
  return {
    personas,
    fecha: bloque.fecha || "",
    fotos: normalizarFotos(bloque.fotos),
    registradoPor: {
      uid: bloque.registradoPor?.uid || "",
      nombre: bloque.registradoPor?.nombre || "",
    },
    registradoEn: bloque.registradoEn || null,
  };
}

// Las fichas cerradas antes de este modelo guardaban
// `firmas: { fabricantes, verificador, fecha }`. Se leen como lo que
// significaban: quien fabricó alistó, y quien verificó revisó.
function bloquesLegacy(firmas) {
  const alistado = normalizarBloqueFirma({
    personas: firmas.fabricantes,
    fecha: firmas.fecha,
  });
  const revisado = normalizarBloqueFirma({
    personas: firmas.verificador ? [firmas.verificador] : [],
    fecha: firmas.fecha,
  });
  return { alistado, revisado };
}

// Firmas de una ficha, normalizadas y con el modelo viejo ya traducido. Es el
// único punto por el que la UI y la impresión leen `ficha.firmas`.
export function firmasDeFicha(ficha) {
  const firmas = ficha?.firmas;
  if (!firmas) return { alistado: null, revisado: null };
  const propias = {
    alistado: normalizarBloqueFirma(firmas.alistado),
    revisado: normalizarBloqueFirma(firmas.revisado),
  };
  if (propias.alistado || propias.revisado) return propias;
  return bloquesLegacy(firmas);
}

export function firmaDeEtapa(ficha, etapa) {
  return firmasDeFicha(ficha)[etapa] || null;
}

export const nombresFirma = (bloque) => (bloque?.personas || []).map((p) => p.nombre);

// Texto de una etapa para el historial de la ficha: "Alistado y empacado:
// Juan, Pedro". Es lo que deja la nota del cambio de estado.
export function resumenFirma(etapa, personas) {
  const nombres = normalizarPersonasFirma(personas).map((p) => p.nombre);
  return `${getEtapaFirma(etapa).corto}: ${nombres.join(", ")}`;
}

// Rol que puede corregir una firma o una evidencia ya guardada. El empleado de
// planta solo puede crearlas: una vez confirmadas quedan cerradas para él,
// tanto en la UI como en las reglas de Firestore. `hasRole` de AuthContext ya
// da por bueno a admin, así que esto cubre producción y admin.
export const ROL_CORRIGE_FIRMAS = "produccion";
