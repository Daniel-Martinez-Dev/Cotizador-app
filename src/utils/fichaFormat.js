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
    // Las fechas "YYYY-MM-DD" (sin hora) las interpreta el motor de JS como
    // medianoche UTC; en husos horarios detrás de UTC (Colombia, UTC-5) eso
    // muestra el día anterior. Se construyen en hora local para evitarlo.
    const m = typeof s === "string" && /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
    const d = m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : new Date(s);
    return d.toLocaleDateString("es-CO");
  } catch {
    return s;
  }
};
