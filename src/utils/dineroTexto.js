// Separadores de miles mientras se teclea una cifra.
//
// Escribir 1750000 en una caja sin separadores obliga a contar los ceros con
// el dedo en la pantalla, y en una factura un cero de más son diez veces el
// valor. El formato es el colombiano —el mismo que ya enseña formatCOP—: punto
// para los miles y coma para los decimales.
//
// El punto que teclee el usuario se toma como separador de miles y se
// descarta: escribir "1.750.000" y escribir "1750000" tienen que dar la misma
// cifra, porque las dos formas se usan.

export const MILES = ".";
export const DECIMAL = ",";

const ES_CIFRA = /[\d,]/;

const vacio = (v) => v === "" || v === null || v === undefined;

/**
 * Deja de lo escrito solo lo que puede ser una cifra: un menos al principio,
 * los dígitos, y una sola coma decimal con hasta dos decimales.
 */
export function limpiarDinero(texto) {
  const bruto = String(texto ?? "");
  const negativo = bruto.trimStart().startsWith("-");
  const [crudos = "", ...resto] = bruto.replace(/[^\d,]/g, "").split(DECIMAL);
  // Sin ceros de relleno delante: los campos nacen en 0 y, al escribir encima,
  // ese cero se quedaba pegado ("0123" se agrupaba como "0.123", que ya no es
  // la cifra que se tecleó). El 0 solo sobrevive si es toda la parte entera.
  const enteros = crudos.replace(/^0+(?=\d)/, "");
  const cuerpo = resto.length ? `${enteros}${DECIMAL}${resto.join("").slice(0, 2)}` : enteros;
  return `${negativo ? "-" : ""}${cuerpo}`;
}

/** Agrupa los miles de un texto ya limpio: "1234567,5" → "1.234.567,5". */
export function agruparMiles(limpio) {
  const texto = String(limpio ?? "");
  const negativo = texto.startsWith("-");
  const [enteros = "", decimales] = texto.replace("-", "").split(DECIMAL);
  const agrupados = enteros.replace(/\B(?=(\d{3})+(?!\d))/g, MILES);
  return `${negativo ? "-" : ""}${agrupados}${decimales === undefined ? "" : DECIMAL + decimales}`;
}

/** Lo tecleado, ya con separadores puestos. */
export const formatearDinero = (texto) => agruparMiles(limpiarDinero(texto));

/**
 * Número de lo tecleado, o "" si el campo quedó vacío. El vacío se conserva —y
 * no se vuelve 0— por lo mismo que en campoNumero.js: borrar para reescribir
 * no debe dejar un cero que hay que volver a borrar.
 */
export function numeroDeDinero(texto) {
  const limpio = limpiarDinero(texto).replace(DECIMAL, ".");
  if (limpio === "" || limpio === "-" || limpio === "." || limpio === "-.") return "";
  const n = Number(limpio);
  return Number.isFinite(n) ? n : "";
}

/** Texto con separadores a partir del número guardado. */
export function textoDeDinero(valor) {
  if (vacio(valor)) return "";
  const n = Number(valor);
  if (!Number.isFinite(n)) return "";
  return agruparMiles(String(n).replace(".", DECIMAL));
}

/**
 * Cuántos caracteres de cifra quedan a la derecha del cursor.
 *
 * Es lo que hay que conservar al reformatear: la posición absoluta no sirve
 * porque cada punto de miles que se inserta delante corre el cursor una
 * casilla, y el campo terminaba escribiendo al revés.
 */
export function cifrasTrasCursor(texto, cursor) {
  return (String(texto ?? "").slice(cursor).match(new RegExp(ES_CIFRA, "g")) || []).length;
}

/** Dónde poner el cursor para dejar `cuantas` cifras a su derecha. */
export function cursorTrasCifras(texto, cuantas) {
  const cadena = String(texto ?? "");
  if (cuantas <= 0) return cadena.length;
  let vistas = 0;
  for (let i = cadena.length - 1; i >= 0; i--) {
    if (!ES_CIFRA.test(cadena[i])) continue;
    vistas += 1;
    if (vistas === cuantas) return i;
  }
  return 0;
}
