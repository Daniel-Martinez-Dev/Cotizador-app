// Helpers puros compartidos por las pestañas de Inventario (Materiales,
// Proveedores, Movimientos). No dependen de estado de ningún componente.

export const toggleSort = (stateSetter, current, key) => {
  stateSetter((p) => {
    if (p.key !== key) return { key, dir: "asc" };
    return { key, dir: p.dir === "asc" ? "desc" : "asc" };
  });
};

export const sortArrow = (sortState, key) => {
  if (sortState.key !== key) return "";
  return sortState.dir === "asc" ? " ▲" : " ▼";
};

export const compareValues = (a, b) => {
  if (a === b) return 0;
  if (a === null || typeof a === "undefined") return -1;
  if (b === null || typeof b === "undefined") return 1;
  if (typeof a === "number" && typeof b === "number") return a - b;
  return String(a).localeCompare(String(b));
};

export const normalizeTerms = (q) => (q || "")
  .toString()
  .toLowerCase()
  .split(/\s+/)
  .map((t) => t.trim())
  .filter(Boolean);

export const formatMovimientoFecha = (ts) => {
  try {
    const d = ts?.toDate ? ts.toDate() : (ts?.seconds ? new Date(ts.seconds * 1000) : null);
    if (!d) return "";
    return d.toLocaleString();
  } catch {
    return "";
  }
};

export const formatCOP = (n) => {
  try {
    return new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency: "COP",
      maximumFractionDigits: 0,
    }).format(Number(n || 0));
  } catch {
    return `$ ${Number(n || 0)}`;
  }
};
