import { crearListaCacheada } from "./listaCacheada";
import { listarCotizaciones } from "./firebaseQuotes";
import { listarTodasFichasProduccion } from "./firebaseFichas";

// Las dos listas que alimentan los selectores de vínculo (ver
// documentoVinculo.js). Viven aquí y no dentro de cada componente para que la
// caché sea una sola: la ficha elige cotización y la factura también, y las dos
// pantallas deben ver lo mismo sin pedirlo dos veces.

// Cuántas fichas por línea de producto. Son seis colecciones, así que el tope
// real es seis veces esto; con 100 se cubre bastante más de un año de pedidos
// sin traerse el histórico entero para llenar un desplegable.
const FICHAS_POR_TIPO = 100;

export const listaCotizaciones = crearListaCacheada(() => listarCotizaciones());

export const listaFichas = crearListaCacheada(() =>
  listarTodasFichasProduccion({ max: FICHAS_POR_TIPO })
);

// Lo leído con los permisos de una cuenta no vale para otra, y una cotización
// recién guardada tiene que aparecer en el selector sin recargar la app.
export function olvidarListasVinculo() {
  listaCotizaciones.olvidar();
  listaFichas.olvidar();
}
