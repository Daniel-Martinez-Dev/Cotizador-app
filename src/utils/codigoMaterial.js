// Identidad de cada material de inventario.
//
//   SKU           MP-LAM-0042      legible: es lo que se escribe, se busca y se
//                                  lee en voz alta en bodega.
//   codigoBarras  2000000000426    EAN-13 interno: es lo que lee el escáner.
//
// Los dos salen del mismo consecutivo (`codigoSecuencia`), así que el 0042 del
// SKU y el ...000042 del código de barras son el mismo material. Si la etiqueta
// se raya y solo se alcanza a leer uno de los dos, el otro se reconstruye.
//
// El prefijo 200 no es arbitrario: GS1 reserva el rango 200–299 para numeración
// interna de cada empresa, de modo que un código nuestro nunca puede chocar con
// el de un producto comprado que ya venga marcado de fábrica.

const PREFIJO_INTERNO = "200";
const DIGITOS_SECUENCIA = 9; // 200 + 9 dígitos = 12, + verificador = 13
export const SECUENCIA_MAXIMA = 10 ** DIGITOS_SECUENCIA - 1;

const sinTildes = (s) => String(s || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "");

// Tres letras de la categoría para que el SKU diga algo a simple vista
// ("MP-LAM-0042" es lámina). Sin categoría queda GEN: el consecutivo sigue
// siendo único, así que dos materiales nunca comparten SKU aunque compartan
// prefijo.
export function siglaCategoria(categoria) {
  const letras = sinTildes(categoria).toUpperCase().replace(/[^A-Z]/g, "");
  return letras ? letras.slice(0, 3).padEnd(3, "X") : "GEN";
}

export function formatearSku({ categoria, secuencia }) {
  const n = Number(secuencia);
  if (!Number.isInteger(n) || n <= 0) return "";
  return `MP-${siglaCategoria(categoria)}-${String(n).padStart(4, "0")}`;
}

// Dígito verificador EAN-13: pesos 1 y 3 alternados sobre los 12 primeros
// dígitos. Es lo que hace que un mal barrido se rechace en vez de descontar
// stock del material equivocado.
export function digitoVerificadorEan13(doceDigitos) {
  const s = String(doceDigitos || "");
  if (!/^\d{12}$/.test(s)) return -1;
  let suma = 0;
  for (let i = 0; i < 12; i += 1) {
    suma += Number(s[i]) * (i % 2 === 0 ? 1 : 3);
  }
  return (10 - (suma % 10)) % 10;
}

export function formatearCodigoBarras(secuencia) {
  const n = Number(secuencia);
  if (!Number.isInteger(n) || n <= 0 || n > SECUENCIA_MAXIMA) return "";
  const base = `${PREFIJO_INTERNO}${String(n).padStart(DIGITOS_SECUENCIA, "0")}`;
  return `${base}${digitoVerificadorEan13(base)}`;
}

export function esEan13Valido(codigo) {
  const s = String(codigo || "").trim();
  if (!/^\d{13}$/.test(s)) return false;
  return digitoVerificadorEan13(s.slice(0, 12)) === Number(s[12]);
}

// Recupera el consecutivo a partir del código impreso. Sirve para verificar una
// etiqueta vieja contra la base sin tener que buscarla por nombre.
export function secuenciaDesdeCodigoBarras(codigo) {
  const s = String(codigo || "").trim();
  if (!esEan13Valido(s) || !s.startsWith(PREFIJO_INTERNO)) return null;
  const n = Number(s.slice(PREFIJO_INTERNO.length, 12));
  return n > 0 ? n : null;
}

export function esCodigoInterno(codigo) {
  return secuenciaDesdeCodigoBarras(codigo) !== null;
}

// Lo que entrega un escáner no viene limpio: los de pistola añaden Enter o
// tabulador, algunos mandan CR+LF, y al teclear a mano se cuelan espacios. Todo
// eso se normaliza antes de comparar para que "mp-lam-0042 " encuentre el item.
export function normalizarCodigoLeido(raw) {
  return String(raw || "")
    .replace(/[\u0000-\u001F\u007F]/g, "")  // Enter/Tab/CR que añade la pistola
    .replace(/\s+/g, "")
    .toUpperCase();
}

// Genera SKU y código de barras a la vez. `secuencia` la reserva quien llama
// (ver reservarConsecutivosMaterial en firebaseConsecutivos.js).
export function generarCodigosMaterial({ categoria, secuencia }) {
  const sku = formatearSku({ categoria, secuencia });
  const codigoBarras = formatearCodigoBarras(secuencia);
  if (!sku || !codigoBarras) return null;
  return { sku, codigoBarras, codigoSecuencia: Number(secuencia) };
}

export function itemNecesitaCodigos(item) {
  if (!item) return false;
  const sku = String(item.sku || "").trim();
  return !sku || !esEan13Valido(item.codigoBarras);
}

// Un código leído identifica al material por código de barras o por SKU: da lo
// mismo si el operario barrió la etiqueta o tecleó el SKU.
export function coincideCodigoConItem(item, codigo) {
  const buscado = normalizarCodigoLeido(codigo);
  if (!item || !buscado) return false;
  return (
    normalizarCodigoLeido(item.codigoBarras) === buscado ||
    normalizarCodigoLeido(item.sku) === buscado
  );
}

export function buscarItemPorCodigoEnLista(items, codigo) {
  const lista = Array.isArray(items) ? items : [];
  return lista.find((it) => coincideCodigoConItem(it, codigo)) || null;
}
