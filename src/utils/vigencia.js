// src/utils/vigencia.js
//
// Fuente única de la vigencia de la oferta. La misma cadena alimenta el
// encabezado del PDF, el recuadro junto a la tabla de precios y la línea
// "Vigencia de la oferta" de las condiciones comerciales, para que no puedan
// quedar desincronizados.

const MESES = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];

export const VIGENCIA_DIAS_POR_DEFECTO = 30;

// Fecha local en formato YYYY-MM-DD (el que usa <input type="date">).
export function fechaAISO(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function isoHoyMasDias(dias = VIGENCIA_DIAS_POR_DEFECTO) {
  const hoy = new Date();
  hoy.setDate(hoy.getDate() + dias);
  return fechaAISO(hoy);
}

// "2026-06-30" → "30 de junio del 2026". Se parsea a mano para evitar que
// new Date("YYYY-MM-DD") lo interprete en UTC y corra un día.
export function fechaLarga(iso) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(iso || "").trim());
  if (!m) return "";
  const [, anio, mes, dia] = m;
  const nombreMes = MESES[Number(mes) - 1];
  if (!nombreMes) return "";
  return `${Number(dia)} de ${nombreMes} del ${anio}`;
}

export function textoVigenciaDesdeISO(iso) {
  const larga = fechaLarga(iso);
  return larga ? `Hasta el ${larga}` : "";
}

export function vigenciaPorDefecto() {
  return textoVigenciaDesdeISO(isoHoyMasDias());
}

// Texto de vigencia de una cotización, sin punto final.
// Prioridad: texto libre guardado → fecha guardada → hoy + 30 días.
export function resolverVigencia(cot = {}) {
  const libre = typeof cot.vigencia === "string" ? cot.vigencia.trim() : "";
  if (libre) return libre.replace(/\.\s*$/, "");
  const porFecha = textoVigenciaDesdeISO(cot.vigenciaFecha);
  return porFecha || vigenciaPorDefecto();
}

// "Hasta el 30 de junio del 2026" → "Oferta válida hasta el 30 de junio del 2026."
// Con textos libres que no empiezan por "hasta", se usa la forma con dos puntos.
export function fraseOfertaValida(texto) {
  const t = String(texto || "").trim().replace(/\.\s*$/, "");
  if (!t) return "";
  if (/^hasta\b/i.test(t)) return `Oferta válida ${t[0].toLowerCase()}${t.slice(1)}.`;
  return `Oferta válida: ${t}.`;
}

const RE_LINEA_VIGENCIA = /(<(?:strong|b)>\s*Vigencia de la oferta:?\s*<\/(?:strong|b)>)([^<]*)/i;

// Reescribe la línea de vigencia dentro de un HTML de condiciones comerciales
// ya generado (o ya editado a mano en el editor). Si el bloque no tiene esa
// línea —condiciones personalizadas desde la base de datos— se deja intacto.
export function reemplazarVigenciaEnHTML(html, texto) {
  const original = String(html || "");
  if (!original || !texto) return original;
  return original.replace(RE_LINEA_VIGENCIA, `$1 ${texto.replace(/\.\s*$/, "")}.`);
}
