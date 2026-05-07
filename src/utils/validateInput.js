// src/utils/validateInput.js
// Validación y sanitización centralizada para datos de usuario

/** Valida formato básico de email. */
export function validateEmail(email) {
  const e = String(email || "").trim();
  return e.length > 0 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
}

/** Valida NIT colombiano: 9–11 dígitos. */
export function validateNIT(nit) {
  const n = String(nit || "").replace(/[^0-9]/g, "");
  return n.length >= 9 && n.length <= 11;
}

/** Valida teléfono colombiano: mínimo 10 dígitos. */
export function validatePhone(phone) {
  const p = String(phone || "").replace(/[^0-9]/g, "");
  return p.length >= 10;
}

/** Valida cantidad: entero positivo ≤ 10.000. */
export function validateQuantity(qty) {
  const q = parseInt(qty, 10);
  return !isNaN(q) && q > 0 && q <= 10_000;
}

/** Valida precio: número ≥ 0. */
export function validatePrice(price) {
  const p = parseFloat(price);
  return !isNaN(p) && p >= 0 && p <= 999_999_999;
}

/** Valida campo de texto con longitud mínima y máxima. */
export function validateText(text, minLen = 1, maxLen = 500) {
  const t = String(text || "").trim();
  return t.length >= minLen && t.length <= maxLen;
}

/** Valida porcentaje: 0–100. */
export function validatePercentage(pct) {
  const p = parseFloat(pct);
  return !isNaN(p) && p >= 0 && p <= 100;
}

/**
 * Limpia texto plano eliminando caracteres de control y recortando espacios.
 * No usa DOMPurify para no crear dependencias circulares con sanitizeHtml.
 */
export function cleanText(text, maxLen = 500) {
  return String(text ?? "")
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "") // control chars
    .replace(/</g, "")   // eliminar < para prevenir inyección de tags
    .replace(/>/g, "")   // eliminar >
    .trim()
    .slice(0, maxLen);
}

/** Normaliza email: minúsculas y sin espacios. */
export function normalizeEmail(email) {
  return String(email ?? "").trim().toLowerCase();
}

/** Normaliza NIT: solo dígitos. */
export function normalizeNIT(nit) {
  return String(nit ?? "").replace(/[^0-9]/g, "");
}
