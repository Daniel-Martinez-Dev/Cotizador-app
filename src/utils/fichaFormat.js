// Formateadores compartidos por las fichas de fabricación (Abrigo, Sello,
// División Térmica) y sus respectivas fichas de impresión. Antes cada
// componente redefinía su propia copia de estas funciones.

export const fmtMm = (n, { hideZero = false } = {}) => {
  if (n == null) return "—";
  if (hideZero && Number(n) === 0) return "—";
  return Math.round(Number(n)).toString();
};

export const fmtM2 = (n) => (n == null ? "—" : Number(n).toFixed(3));

export const fmtN = (n) => (n == null ? "—" : Number(n).toString());

export const fmtDec = (n, d = 2) => (n == null ? "—" : Number(n).toFixed(d));

export const fmtCm = (n) => (n == null ? "—" : Number(n).toFixed(1));

export const fmtDate = (s) => {
  if (!s) return "—";
  try {
    return new Date(s).toLocaleDateString("es-CO");
  } catch {
    return s;
  }
};
