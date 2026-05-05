// src/utils/validateInput.js
// Centralized input validation and sanitization for user-submitted data

/**
 * Validates email format (basic)
 */
export function validateEmail(email) {
  const e = String(email || "").trim();
  return e.length > 0 && e.includes("@") && e.includes(".");
}

/**
 * Validates NIT format (Colombian)
 * Expected: 9-11 digits, optional dashes
 */
export function validateNIT(nit) {
  const n = String(nit || "").replace(/[^0-9]/g, "");
  return n.length >= 9 && n.length <= 11 && /^\d+$/.test(n);
}

/**
 * Validates phone number (basic Colombian format)
 * Expected: 10+ digits
 */
export function validatePhone(phone) {
  const p = String(phone || "").replace(/[^0-9]/g, "");
  return p.length >= 10;
}

/**
 * Validates quantity (positive integer)
 */
export function validateQuantity(qty) {
  const q = parseInt(qty);
  return !isNaN(q) && q > 0 && q <= 10000;
}

/**
 * Validates price (positive number)
 */
export function validatePrice(price) {
  const p = parseFloat(price);
  return !isNaN(p) && p >= 0 && p <= 999999999;
}

/**
 * Validates text field (non-empty, max length)
 */
export function validateText(text, minLen = 1, maxLen = 500) {
  const t = String(text || "").trim();
  return t.length >= minLen && t.length <= maxLen;
}

/**
 * Validates percentage (0-100)
 */
export function validatePercentage(pct) {
  const p = parseFloat(pct);
  return !isNaN(p) && p >= 0 && p <= 100;
}
