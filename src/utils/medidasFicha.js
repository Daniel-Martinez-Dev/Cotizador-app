// Medida principal de una ficha de producción.
//
// En planta la ficha no se reconoce por el consecutivo sino por la medida: un
// mismo cliente manda varias órdenes seguidas y lo que las distingue en la mesa
// de trabajo es "el de 2400 × 3100". Cada línea de producto guarda esa medida
// con nombres distintos (el vano de una puerta, el vehículo de una división),
// así que aquí queda el mapa en un solo lugar para que el listado, el detalle y
// cualquier otra vista muestren exactamente lo mismo.
//
// Los nombres de campo corresponden a los formularios de cada línea:
// SelloAndenFicha, DivisionTermicaFicha, AbrigoRetractilFicha y las de puertas.
const CAMPOS_POR_TIPO = {
  division:        { ancho: "anchoVehiculo", alto: "altoVehiculo", label: "Vehículo" },
  sello:           { ancho: "anchoVano",     alto: "altoVano",     label: "Vano" },
  abrigoretractil: { ancho: "ancho",         alto: "alto",         label: "Abrigo" },
  puertarapida:    { ancho: "anchoVano",     alto: "altoVano",     label: "Vano" },
  puertaseccional: { ancho: "anchoVano",     alto: "altoVano",     label: "Vano" },
  // La ficha básica (repuestos, semáforos, topes…) no tiene medida: lo que la
  // identifica es su lista de ítems.
  general:         null,
};

// Orden de rescate cuando la ficha llega sin `tipo` (por ejemplo al leer un
// documento suelto de una colección): se toma el primer par que exista.
const PARES_FALLBACK = [
  ["anchoVano", "altoVano", "Vano"],
  ["anchoVehiculo", "altoVehiculo", "Vehículo"],
  ["ancho", "alto", ""],
];

const aNumero = (v) => {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : null;
};

/**
 * @param {object} ficha  Documento de ficha (con `tipo` cuando se conoce).
 * @returns {{ ancho: number, alto: number, label: string } | null}
 *   null cuando la ficha no maneja medidas o todavía no las tiene cargadas.
 */
export function medidasFicha(ficha) {
  if (!ficha) return null;

  const cfg = Object.prototype.hasOwnProperty.call(CAMPOS_POR_TIPO, ficha.tipo)
    ? CAMPOS_POR_TIPO[ficha.tipo]
    : undefined;

  if (cfg === null) return null; // tipo conocido y sin medidas (ficha básica)

  if (cfg) {
    const ancho = aNumero(ficha[cfg.ancho]);
    const alto = aNumero(ficha[cfg.alto]);
    return ancho && alto ? { ancho, alto, label: cfg.label } : null;
  }

  for (const [campoAncho, campoAlto, label] of PARES_FALLBACK) {
    const ancho = aNumero(ficha[campoAncho]);
    const alto = aNumero(ficha[campoAlto]);
    if (ancho && alto) return { ancho, alto, label };
  }
  return null;
}

// Texto listo para pintar: "2400 × 3100". Las medidas se guardan en mm y se
// redondean, igual que en las fichas impresas (utils/fichaFormat.js).
export function medidasFichaTexto(ficha, { conUnidad = false } = {}) {
  const m = medidasFicha(ficha);
  if (!m) return "";
  const txt = `${Math.round(m.ancho)} × ${Math.round(m.alto)}`;
  return conUnidad ? `${txt} mm` : txt;
}

// Búsqueda por medida. El operario teclea lo que tiene a mano —"2400x3100",
// "2400 × 3100", o solo "3100"—, así que se compara sin espacios y con la ×
// tipográfica unificada con la x.
const normalizar = (s) => String(s || "").toLowerCase().replace(/[×x]/g, "x").replace(/\s+/g, "");

export function coincideMedida(ficha, termino) {
  const term = normalizar(termino);
  if (!term) return false;
  const m = medidasFicha(ficha);
  if (!m) return false;
  const a = String(Math.round(m.ancho));
  const b = String(Math.round(m.alto));
  return a.includes(term) || b.includes(term) || `${a}x${b}`.includes(term);
}
