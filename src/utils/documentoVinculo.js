// Vínculo ficha de fabricación ↔ cotización ↔ factura.
//
// Los tres documentos hablan del mismo negocio pero nacieron sueltos: se cotiza
// en el cotizador, se fabrica con la ficha y se cobra con la factura, y hasta
// ahora la única forma de saber que eran lo mismo era acordarse. Aquí queda la
// forma canónica de esas llaves, con dos reglas que valen para toda la app:
//
//   · El vínculo es OPCIONAL. Una ficha urgente no espera a que exista la
//     cotización, y una factura del libro viejo no tiene ficha ninguna. Sin
//     vínculo, todo sigue funcionando exactamente como antes.
//   · El vínculo se elige en un solo sentido por par, para que no haya dos
//     verdades que se contradigan:
//       — la ficha elige su cotización   → `cotizacionId` vive en la ficha;
//       — la factura elige sus fichas y su cotización → viven en la factura.
//     Así la ficha nunca sabe de facturas: la relación factura→ficha es 1‑a‑N
//     (una factura cubre las varias fichas de un pedido) y la llave tiene que
//     estar del lado que puede tener varias.
//
// Junto a cada id se guarda una copia del número y de lo mínimo para nombrar el
// documento. Es el mismo criterio que ya usa el cliente en la ficha (ver
// clienteVinculo.js): son datos que se muestran, y quien los mira no siempre
// tiene permiso de abrir el documento del otro lado — planta no ve cotizaciones
// ni facturas, y contabilidad no necesita leer la ficha entera para saber cuál
// facturó.

// ─── Ficha → cotización ─────────────────────────────────────────────────────

// Nombre del campo que apunta a `cotizaciones/{id}` desde la ficha. Es el mismo
// nombre que ya usa la factura creada desde una cotización (ver
// modules/contabilidad/desdeCotizacion.js), a propósito: una sola palabra para
// la misma llave en toda la base.
export const CAMPO_COTIZACION = "cotizacionId";

const texto = (v) => String(v ?? "").trim();

export const sinCotizacion = () => ({ cotizacionId: null, cotizacionNumero: "" });

// El vínculo tal como sale del selector, a partir de la cotización elegida.
// El número se congela: la cotización puede editarse después y la ficha debe
// seguir diciendo de cuál salió.
export function vinculoDesdeCotizacion(cotizacion) {
  if (!cotizacion?.id) return sinCotizacion();
  return {
    cotizacionId: cotizacion.id,
    cotizacionNumero: texto(cotizacion.numero),
  };
}

// Normaliza el vínculo antes de escribirlo en Firestore. Lo usan las seis
// líneas de producto para que todas guarden la misma forma.
//
// Sin id no hay vínculo: un número suelto —tecleado y luego desvinculado— haría
// creer que la ficha apunta a una cotización que nadie puede abrir.
export function camposCotizacionFicha(input = {}) {
  const id = texto(input.cotizacionId);
  if (!id) return sinCotizacion();
  return { cotizacionId: id, cotizacionNumero: texto(input.cotizacionNumero) };
}

// Lee el vínculo de una ficha guardada, para precargar el formulario al editar.
// Las fichas anteriores a esto no traen ninguno de los dos campos.
export const cotizacionDeFicha = (ficha = {}) => camposCotizacionFicha(ficha);

export const tieneCotizacion = (doc) => Boolean(texto(doc?.cotizacionId));

// Rótulo del vínculo. Una cotización sin número —guardada a medias— igual se
// puede abrir por id, así que se nombra sin mentir en vez de esconderla.
export function etiquetaCotizacion(doc = {}) {
  const numero = texto(doc.cotizacionNumero);
  return numero ? `Cotización N.º ${numero}` : "Cotización vinculada";
}

// La cotización elegida es de otro cliente que el de la ficha. No lo impide
// —hay pedidos que se cotizan a la matriz y se fabrican para una sede—, pero es
// el error típico de un selector con cientos de cotizaciones y hay que decirlo.
// Solo se puede afirmar cuando ambos lados están vinculados a `empresas/{id}`;
// comparar nombres sueltos daría falsas alarmas.
export function clienteDiscrepa(ficha = {}, cotizacion = null) {
  if (!cotizacion) return false;
  const deFicha = texto(ficha.clienteId);
  const deCotizacion = texto(cotizacion.empresaId);
  if (!deFicha || !deCotizacion) return false;
  return deFicha !== deCotizacion;
}

// ─── Factura → fichas ───────────────────────────────────────────────────────

// Una ficha referenciada desde la factura. Es una copia congelada, no un
// puntero a resolver: contabilidad tiene que poder listar "qué se facturó aquí"
// sin leer seis colecciones de producción, y lo que se facturó no cambia porque
// después alguien renombre la ficha.
//
// `tipo` va junto al `id` porque las fichas viven en seis colecciones distintas
// y el id solo no dice en cuál buscar (ver firebaseFichas.js).
export function referenciaFicha(ficha) {
  const id = texto(ficha?.id);
  const tipo = texto(ficha?.tipo);
  if (!id || !tipo) return null;
  return {
    tipo,
    id,
    codigo: texto(ficha.codigoFicha),
    ordenProduccion: Number(ficha.ordenProduccion) || 0,
    nombre: texto(ficha.nombreFicha),
    cliente: texto(ficha.cliente),
  };
}

// Identidad de una referencia: la pareja colección + documento.
export const claveFicha = (ref) => `${texto(ref?.tipo)}:${texto(ref?.id)}`;

// Normaliza la lista antes de guardarla: descarta lo que no identifica una
// ficha, quita repetidos y ordena por consecutivo de orden de producción, que
// es como se nombran los pedidos en la casa.
export function normalizarFichasFactura(lista = []) {
  const vistas = new Set();
  const salida = [];
  for (const item of Array.isArray(lista) ? lista : []) {
    const ref = referenciaFicha(item);
    if (!ref) continue;
    const clave = claveFicha(ref);
    if (vistas.has(clave)) continue;
    vistas.add(clave);
    salida.push(ref);
  }
  return salida.sort((a, b) => a.ordenProduccion - b.ordenProduccion);
}

export function agregarFichaAFactura(lista = [], ficha) {
  const ref = referenciaFicha(ficha);
  if (!ref) return normalizarFichasFactura(lista);
  return normalizarFichasFactura([...(lista || []), ref]);
}

export function quitarFichaDeFactura(lista = [], ref) {
  const clave = claveFicha(ref || {});
  return normalizarFichasFactura((lista || []).filter((f) => claveFicha(f) !== clave));
}

// Rótulo de una ficha en la factura: el código impreso es lo que se busca en
// planta, y el consecutivo es el que sirve cuando la ficha es vieja y no lo
// tiene (ver codigoFicha.js).
export function etiquetaFicha(ref = {}) {
  const codigo = texto(ref.codigo);
  if (codigo) return codigo;
  const orden = Number(ref.ordenProduccion) || 0;
  return orden ? `Orden ${orden}` : "Ficha vinculada";
}
