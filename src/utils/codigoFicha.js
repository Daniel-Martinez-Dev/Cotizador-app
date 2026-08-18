// Código de la ficha de producción: PREFIJO + ddmmaa + consecutivo global.
//
//   AR 100826 001  →  Abrigo Retráctil, creada el 10/08/2026, ficha n.° 1 del
//                     consecutivo global de fichas de producción.
//
// El consecutivo es el mismo `ordenProduccion` que ya comparten las 4 líneas
// (ver firebaseConsecutivos.js): el código no introduce un contador nuevo, solo
// le da formato. La fecha es la de creación de la ficha y queda congelada en el
// documento al guardarla, para que el código impreso nunca cambie después.

export const PREFIJO_POR_TIPO = {
  abrigoretractil: "AR",
  sello:           "SA",
  division:        "DT",
  puertarapida:    "PR",
  puertaseccional: "PS",
  general:         "OG", // Orden General — ficha básica, sin ficha de fabricación
};

const dd = (n) => String(n).padStart(2, "0");

// "2026-08-10" se interpreta como fecha local, no UTC: con `new Date(iso)` un
// string de solo fecha se ancla a medianoche UTC y en Colombia (UTC-5) el
// código habría salido con el día anterior.
export function aFechaLocal(valor) {
  if (!valor) return null;
  if (valor instanceof Date) return Number.isNaN(valor.getTime()) ? null : valor;
  if (typeof valor?.toDate === "function") return valor.toDate();          // Timestamp de Firestore
  if (typeof valor?.seconds === "number") return new Date(valor.seconds * 1000); // Timestamp serializado
  if (typeof valor === "string") {
    const soloFecha = /^(\d{4})-(\d{2})-(\d{2})$/.exec(valor);
    if (soloFecha) return new Date(Number(soloFecha[1]), Number(soloFecha[2]) - 1, Number(soloFecha[3]));
  }
  const d = new Date(valor);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function formatearCodigoFicha({ tipo, fecha, consecutivo }) {
  const prefijo = PREFIJO_POR_TIPO[tipo];
  const n = Number(consecutivo);
  const f = aFechaLocal(fecha);
  if (!prefijo || !f || !n || n <= 0) return "";
  const ddmmaa = `${dd(f.getDate())}${dd(f.getMonth() + 1)}${String(f.getFullYear()).slice(2)}`;
  return `${prefijo}${ddmmaa}${String(n).padStart(3, "0")}`;
}

// Código de una ficha ya guardada. Las creadas antes de esta numeración no
// tienen `codigoFicha` en el documento: se reconstruye con su fecha de creación
// y el consecutivo global que ya tenían, para que toda la lista se vea igual.
export function codigoFicha(ficha, tipo) {
  if (!ficha) return "";
  if (ficha.codigoFicha) return ficha.codigoFicha;
  return formatearCodigoFicha({
    tipo: tipo || ficha.tipo,
    fecha: ficha.createdAt || ficha.fechaOrden,
    consecutivo: ficha.ordenProduccion,
  });
}

// Para mostrar: el código, o el consecutivo suelto si la ficha es tan antigua
// que no alcanza ni para reconstruirlo.
export function codigoFichaOFallback(ficha, tipo) {
  return codigoFicha(ficha, tipo) || (ficha?.ordenProduccion ? `#${ficha.ordenProduccion}` : "—");
}
