//C:\Users\danma\Downloads\cotizador-app\src\utils\quoteNumber.js
const STORAGE_KEY = "numero_cotizacion";

export function getNextQuoteNumber() {
  const actual = parseInt(localStorage.getItem(STORAGE_KEY) || "1");
  const siguiente = actual + 1;
  localStorage.setItem(STORAGE_KEY, siguiente.toString());
  return actual;
}
