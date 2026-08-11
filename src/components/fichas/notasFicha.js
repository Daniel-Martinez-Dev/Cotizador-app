// Helpers de presentación para el historial de notas de una ficha.
// El arreglo `notas` lo escriben firebaseFichas.js (cambios de estado y notas
// sueltas) y lo leen tanto el panel de planta como el escritorio.

// Milisegundos de una nota, venga como Timestamp de Firestore o ya serializada.
function millisDeNota(nota) {
  const f = nota?.fecha;
  if (!f) return 0;
  if (typeof f.toMillis === "function") return f.toMillis();
  if (f.seconds) return f.seconds * 1000;
  const t = new Date(f).getTime();
  return Number.isNaN(t) ? 0 : t;
}

// Más recientes primero, sin mutar el arreglo original.
export function ordenarNotasDesc(notas) {
  const lista = Array.isArray(notas) ? notas.slice() : [];
  return lista.sort((a, b) => millisDeNota(b) - millisDeNota(a));
}

export function fmtFechaNota(fecha) {
  const ms = millisDeNota({ fecha });
  if (!ms) return "";
  return new Date(ms).toLocaleString("es-CO", {
    day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit",
  });
}

export const esNotaDeEstado = (nota) => nota?.tipo === "estado" && !!nota?.estadoNuevo;
