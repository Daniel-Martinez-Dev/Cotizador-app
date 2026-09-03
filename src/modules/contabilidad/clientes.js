// Tablero de clientes: quién compra, qué compra, cómo paga y a quién conviene
// pasar a distribuidor.
//
// La cartera (cartera.js) responde "cuánto me deben hoy". Esto responde lo
// otro: cuánto vale cada cliente, en qué producto, con qué constancia y con qué
// comportamiento de pago. Son las tres preguntas que en el Excel había que
// contestar a mano cruzando la hoja FACT con una dinámica por cliente, y por
// eso no se contestaban nunca.
//
// Es puro a propósito —no toca Firebase ni React— para poder probar los
// criterios sin una base ni una pantalla detrás.

import { PRODUCTOS_ACTIVOS } from "../../data/catalogoProductos";
import { CLIENTE_FACTORES } from "../../data/precios";
import { claveCliente } from "./cartera";
import { ESTADO_ANULADA, TIPO_FACTURA, esNotaCredito, signoDocumento } from "./catalogos";
import {
  aNumero,
  anioDe,
  aplicacionesDe,
  diasEntre,
  fechaVencimiento,
  hoyISO,
  mesDe,
  redondear,
  sinAplicar,
  subtotalItem,
} from "./calculos";

// ─── Nombres de producto ────────────────────────────────────────────────────
// El libro traía el concepto escrito a mano: "PUERTA RAPIDA", "Puertas
// Rápidas", "PUERTA RAPIDA 3X3". Para el catálogo son un producto; para un
// `group by` de texto son tres, y el mix de productos salía en pedazos.

const sinTildes = (t) =>
  String(t ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();

// Raíz de comparación: sin tildes, sin plurales y con los espacios colapsados.
// "Puertas Rápidas" y "puerta rapida" caen las dos en "puerta rapida".
const raiz = (t) =>
  sinTildes(t)
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .map((p) => (p.length > 3 && p.endsWith("s") ? p.slice(0, -1) : p))
    .join(" ");

const RAICES_CATALOGO = PRODUCTOS_ACTIVOS.map((p) => ({ etiqueta: p, raiz: raiz(p) }));

export const SIN_CONCEPTO = "Sin concepto";

/**
 * Nombre de catálogo que le corresponde a un concepto escrito a mano. Si no se
 * reconoce se devuelve tal cual (recortado): un producto que no está en el
 * catálogo —un repuesto, un servicio— sigue siendo una línea de venta válida.
 */
export function etiquetaProducto(texto) {
  const limpio = String(texto ?? "").trim();
  if (!limpio) return SIN_CONCEPTO;
  const r = raiz(limpio);
  if (!r) return limpio;
  const exacto = RAICES_CATALOGO.find((c) => c.raiz === r);
  if (exacto) return exacto.etiqueta;
  // Contención por raíz: "puerta rapida 3x3 con radar" es una puerta rápida.
  // Se elige la coincidencia más larga para que "Abrigo Retráctil Inflable" le
  // gane a "Abrigo Retráctil Estándar" cuando el texto trae las dos palabras.
  const contenida = RAICES_CATALOGO
    .filter((c) => r.includes(c.raiz))
    .sort((a, b) => b.raiz.length - a.raiz.length)[0];
  return contenida ? contenida.etiqueta : limpio;
}

// ─── Reparto del neto entre las líneas ──────────────────────────────────────
// El IVA y las retenciones son del documento, no de la línea. Si el mix de
// productos se midiera sobre el subtotal, la suma de los productos no daría
// nunca las ventas del cliente y las dos cifras del tablero se contradirían
// —que es exactamente lo que hacía el Excel—. Así que el neto del documento se
// reparte entre sus líneas en proporción a lo que pesa cada una.

export function repartirNeto(doc = {}) {
  const items = Array.isArray(doc.items) ? doc.items : [];
  const neto = aNumero(doc?.resumen?.neto ?? doc?.neto);
  if (!items.length) return neto ? [{ producto: SIN_CONCEPTO, valor: neto, cantidad: 0, unidad: "" }] : [];

  const bases = items.map((i) => Math.abs(subtotalItem(i)));
  const total = bases.reduce((a, b) => a + b, 0);
  return items.map((item, idx) => ({
    producto: etiquetaProducto(item.producto || item.descripcion),
    // Sin base con qué repartir (una factura de valor cero, o importada sin
    // valor unitario) el neto se le deja entero a la primera línea en vez de
    // perderse: el cliente compró algo.
    valor: total > 0 ? redondear((bases[idx] / total) * neto) : (idx === 0 ? neto : 0),
    cantidad: aNumero(item.cantidad),
    unidad: item.unidad || "",
  }));
}

// ─── Panel ──────────────────────────────────────────────────────────────────

// Lo que el documento le suma al saldo del cliente. `resumen.aporteSaldo` ya
// distingue la nota enlazada (no aporta) de la suelta (descuenta); el respaldo
// es para documentos armados a mano en una prueba.
const aporteSaldo = (doc) =>
  doc?.resumen?.aporteSaldo != null
    ? aNumero(doc.resumen.aporteSaldo)
    : signoDocumento(doc?.tipo) * aNumero(doc?.resumen?.saldo);

function clienteVacio(clave, doc = {}) {
  return {
    clave,
    empresaId: doc.empresaId || "",
    nombre: doc.clienteNombre || "Sin cliente",
    alias: "",
    nit: doc.clienteNit || "",
    ciudad: "",
    vinculado: Boolean(doc.empresaId),
    facturas: 0,
    notas: 0,
    facturado: 0,
    abonado: 0,
    saldo: 0,
    vencido: 0,
    anticipos: 0,
    primeraCompra: "",
    ultimaCompra: "",
    porMes: {},
    porAnio: {},
    porProducto: {},
    documentos: [],
    // Ponderados por valor: un cliente que paga tarde una factura de diez
    // millones no se compensa con tres facturitas al día.
    valorPagado: 0,
    diasPagoPonderados: 0,
    moraPonderada: 0,
    valorPuntual: 0,
  };
}

/**
 * Un cliente por fila, con lo que compró, lo que pagó y lo que debe.
 *
 * `liquidados` son documentos ya pasados por liquidarDocumentos (traen
 * `resumen`), `pagos` los abonos con sus aplicaciones y `empresas` la base de
 * clientes —de ahí salen el alias y la ciudad, que el documento no guarda—.
 */
export function construirPanelClientes(liquidados = [], pagos = [], empresas = [], { hoy = hoyISO() } = {}) {
  const porEmpresa = new Map((empresas || []).map((e) => [e.id, e]));
  const porId = new Map();
  const clientes = new Map();

  const asegurar = (clave, doc) => {
    if (!clientes.has(clave)) clientes.set(clave, clienteVacio(clave, doc));
    const cliente = clientes.get(clave);
    if (!cliente.empresaId && doc?.empresaId) {
      cliente.empresaId = doc.empresaId;
      cliente.vinculado = true;
    }
    if (!cliente.nit && doc?.clienteNit) cliente.nit = doc.clienteNit;
    return cliente;
  };

  for (const doc of liquidados || []) {
    if (!doc || doc.anulado || doc.resumen?.estado === ESTADO_ANULADA) continue;
    porId.set(doc.id, doc);
    const cliente = asegurar(claveCliente(doc), doc);
    const signo = signoDocumento(doc.tipo);
    const neto = aNumero(doc.resumen?.neto ?? doc.neto);

    cliente.documentos.push(doc);
    const nota = esNotaCredito(doc);
    if (nota) cliente.notas += 1;
    else cliente.facturas += 1;

    cliente.facturado = redondear(cliente.facturado + signo * neto);
    // Una nota crédito no se cobra: ni recibe abonos ni deja saldo. Su valor ya
    // salió del saldo de la factura que anula (`aporteSaldo` lo sabe); contarlo
    // aquí otra vez dejaba al cliente con un saldo negativo inventado.
    if (!nota) cliente.abonado = redondear(cliente.abonado + aNumero(doc.resumen?.abonado));
    cliente.saldo = redondear(cliente.saldo + aporteSaldo(doc));
    if (doc.resumen?.vencida) cliente.vencido = redondear(cliente.vencido + aNumero(doc.resumen.saldo));

    const mes = mesDe(doc.fecha);
    const anio = anioDe(doc.fecha);
    if (mes) cliente.porMes[mes] = redondear((cliente.porMes[mes] || 0) + signo * neto);
    if (anio) cliente.porAnio[anio] = redondear((cliente.porAnio[anio] || 0) + signo * neto);

    for (const linea of repartirNeto(doc)) {
      const acumulado = cliente.porProducto[linea.producto] || { valor: 0, cantidad: 0, facturas: 0, unidades: {} };
      acumulado.valor = redondear(acumulado.valor + signo * linea.valor);
      acumulado.cantidad = redondear(acumulado.cantidad + signo * linea.cantidad);
      acumulado.facturas += nota ? 0 : 1;
      if (linea.unidad) {
        acumulado.unidades[linea.unidad] = redondear((acumulado.unidades[linea.unidad] || 0) + signo * linea.cantidad);
      }
      cliente.porProducto[linea.producto] = acumulado;
    }

    // Solo las facturas marcan la vida comercial del cliente: una nota crédito
    // de diciembre no es "le compró en diciembre".
    if (doc.tipo === TIPO_FACTURA && doc.fecha) {
      if (!cliente.primeraCompra || doc.fecha < cliente.primeraCompra) cliente.primeraCompra = doc.fecha;
      if (!cliente.ultimaCompra || doc.fecha > cliente.ultimaCompra) cliente.ultimaCompra = doc.fecha;
    }
  }

  // Comportamiento de pago. Se mide contra el documento al que se aplicó el
  // abono y no contra el cliente del abono: es el destino el que dice si ese
  // dinero llegó a tiempo o dos meses tarde.
  for (const pago of pagos || []) {
    for (const ap of aplicacionesDe(pago)) {
      const doc = porId.get(ap?.id);
      if (!doc) continue;
      const valor = Math.abs(aNumero(ap.valor));
      if (!valor) continue;
      const cliente = asegurar(claveCliente(doc), doc);
      // Un abono aplicado a una nota crédito no pagó nada —la nota no se
      // cobra—, pero la plata entró: vuelve a ser anticipo del cliente. Medir
      // con él cuántos días tarda en pagar sería medir contra una factura que
      // no existe.
      if (esNotaCredito(doc)) {
        cliente.anticipos = redondear(cliente.anticipos + valor);
        continue;
      }
      const dias = Math.max(0, diasEntre(doc.fecha, pago.fecha));
      const mora = Math.max(0, diasEntre(fechaVencimiento(doc), pago.fecha));
      cliente.valorPagado = redondear(cliente.valorPagado + valor);
      cliente.diasPagoPonderados = redondear(cliente.diasPagoPonderados + valor * dias);
      cliente.moraPonderada = redondear(cliente.moraPonderada + valor * mora);
      if (mora <= 0) cliente.valorPuntual = redondear(cliente.valorPuntual + valor);
    }
    const sobra = sinAplicar(pago);
    if (sobra > 0) {
      const cliente = asegurar(claveCliente(pago), pago);
      cliente.anticipos = redondear(cliente.anticipos + sobra);
    }
  }

  const lista = [...clientes.values()].map((c) => {
    const empresa = porEmpresa.get(c.empresaId);
    const productos = Object.entries(c.porProducto)
      .map(([producto, d]) => ({ producto, ...d, unidades: { ...d.unidades } }))
      .sort((a, b) => b.valor - a.valor);
    const meses = Object.keys(c.porMes).length;
    return {
      ...c,
      nombre: empresa?.nombre || c.nombre,
      alias: empresa?.alias || "",
      nit: c.nit || empresa?.nit || "",
      ciudad: empresa?.ciudad || "",
      productos,
      productoPrincipal: productos[0]?.producto || "",
      mesesActivos: meses,
      // El ticket se calcula sobre facturas, no sobre documentos: dividir entre
      // las notas crédito daría un promedio que no existió nunca.
      ticket: c.facturas ? redondear(c.facturado / c.facturas) : 0,
      // Cada cuántos días compra. Con una sola factura no hay frecuencia que
      // medir, y devolver 0 la haría parecer un cliente diario.
      frecuenciaDias:
        c.facturas > 1 && c.primeraCompra && c.ultimaCompra
          ? Math.round(diasEntre(c.primeraCompra, c.ultimaCompra) / (c.facturas - 1))
          : null,
      diasSinComprar: c.ultimaCompra ? Math.max(0, diasEntre(c.ultimaCompra, hoy)) : null,
      diasPago: c.valorPagado ? Math.round(c.diasPagoPonderados / c.valorPagado) : null,
      moraPromedio: c.valorPagado ? Math.round(c.moraPonderada / c.valorPagado) : null,
      puntualidad: c.valorPagado ? Math.round((c.valorPuntual / c.valorPagado) * 100) : null,
      // Lo cobrado sobre lo facturado. Es el otro lado del saldo: un cliente
      // puede deber poco porque compra poco.
      recaudo: c.facturado > 0 ? Math.round((c.abonado / c.facturado) * 100) : null,
    };
  });

  const totales = totalesPanel(lista);
  return {
    clientes: lista
      .map((c) => ({ ...c, participacion: totales.facturado > 0 ? redondear((c.facturado / totales.facturado) * 100, 1) : 0 }))
      .sort((a, b) => b.facturado - a.facturado || a.nombre.localeCompare(b.nombre)),
    totales,
    productos: rankingProductos(lista),
    porMes: seriePorMes(lista),
  };
}

export function totalesPanel(clientes = []) {
  const t = { clientes: 0, activos: 0, facturas: 0, facturado: 0, abonado: 0, saldo: 0, vencido: 0, anticipos: 0, ticket: 0 };
  for (const c of clientes) {
    t.clientes += 1;
    if (c.facturas > 0) t.activos += 1;
    t.facturas += c.facturas;
    t.facturado = redondear(t.facturado + c.facturado);
    t.abonado = redondear(t.abonado + c.abonado);
    t.saldo = redondear(t.saldo + c.saldo);
    t.vencido = redondear(t.vencido + c.vencido);
    t.anticipos = redondear(t.anticipos + c.anticipos);
  }
  t.ticket = t.facturas ? redondear(t.facturado / t.facturas) : 0;
  return t;
}

/**
 * Cuánto llevó, en su unidad. Solo cuando la línea tiene una sola: el libro
 * mezclaba metros de lona con unidades en la misma columna, y "11" sin unidad
 * al lado no significa nada.
 */
export function cantidadLegible(linea = {}) {
  const unidades = Object.entries(linea.unidades || {}).filter(([, valor]) => aNumero(valor) > 0);
  if (unidades.length !== 1) return "";
  const [unidad, cantidad] = unidades[0];
  return `${redondear(cantidad, 2)} ${unidad}`;
}

/** Ventas por producto sumando todos los clientes, de mayor a menor. */
export function rankingProductos(clientes = []) {
  const mapa = new Map();
  for (const c of clientes) {
    for (const p of c.productos || []) {
      const acumulado = mapa.get(p.producto) || { producto: p.producto, valor: 0, cantidad: 0, facturas: 0, clientes: 0 };
      acumulado.valor = redondear(acumulado.valor + p.valor);
      acumulado.cantidad = redondear(acumulado.cantidad + p.cantidad);
      acumulado.facturas += p.facturas;
      if (p.valor) acumulado.clientes += 1;
      mapa.set(p.producto, acumulado);
    }
  }
  return [...mapa.values()].sort((a, b) => b.valor - a.valor);
}

/** Serie mensual de todos los clientes, del mes más viejo al más nuevo. */
export function seriePorMes(clientes = []) {
  const mapa = new Map();
  for (const c of clientes) {
    for (const [mes, valor] of Object.entries(c.porMes || {})) {
      mapa.set(mes, redondear((mapa.get(mes) || 0) + valor));
    }
  }
  return [...mapa.entries()].map(([mes, valor]) => ({ mes, valor })).sort((a, b) => a.mes.localeCompare(b.mes));
}

const MESES_CORTOS = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

export const nombreMes = (mes) => MESES_CORTOS[Number(String(mes).slice(5, 7)) - 1] || String(mes);

/**
 * Los doce meses del año, incluidos los que no tuvieron ventas. Una gráfica de
 * barras que se salta los meses vacíos miente sobre la estacionalidad: el hueco
 * de mitad de año es justo el dato.
 */
export function serieDelAnio(porMes = [], anio) {
  const mapa = new Map(porMes.map((p) => [p.mes, p.valor]));
  return Array.from({ length: 12 }, (_, i) => {
    const mes = `${anio}-${String(i + 1).padStart(2, "0")}`;
    return { mes, etiqueta: MESES_CORTOS[i], valor: mapa.get(mes) || 0 };
  });
}

const mesSiguiente = (mes) => {
  const anio = Number(mes.slice(0, 4));
  const n = Number(mes.slice(5, 7));
  return n === 12 ? `${anio + 1}-01` : `${anio}-${String(n + 1).padStart(2, "0")}`;
};

/**
 * Eje de meses de un periodo, con sus huecos. Se calcula una vez para todo el
 * tablero y lo comparten la gráfica de arriba y la de cada cliente: si cada una
 * armara su propio eje, dos clientes con distinta historia se pintarían con
 * escalas distintas y no se podrían comparar.
 *
 * `maximo` recorta por la izquierda —se muestran los meses más recientes—
 * porque cinco años de histórico son 60 barras de dos píxeles.
 */
export function ejeMeses(porMes = [], { anio = null, maximo = 24 } = {}) {
  if (anio) return serieDelAnio(porMes, anio).map(({ mes, etiqueta }) => ({ mes, etiqueta }));
  const meses = porMes.map((p) => p.mes).filter(Boolean).sort();
  if (!meses.length) return [];
  const eje = [];
  for (let mes = meses[0]; mes <= meses[meses.length - 1]; mes = mesSiguiente(mes)) eje.push(mes);
  const recortado = eje.slice(-maximo);
  const variosAnios = recortado.length > 0 && recortado[0].slice(0, 4) !== recortado[recortado.length - 1].slice(0, 4);
  return recortado.map((mes) => ({
    mes,
    // Con varios años en el eje, "Ene" solo no dice cuál: se le pega el año en
    // dos dígitos, que es lo que cabe debajo de una barra.
    etiqueta: variosAnios ? `${nombreMes(mes)} ${mes.slice(2, 4)}` : nombreMes(mes),
  }));
}

/** Los valores de un cliente puestos sobre el eje común. */
export function serieSobreEje(eje = [], porMes = {}) {
  return eje.map((punto) => ({ ...punto, valor: aNumero(porMes?.[punto.mes]) }));
}

// ─── Candidatos a distribuidor ──────────────────────────────────────────────
//
// Pasar un cliente a distribuidor es bajarle el precio: la lista de precios
// multiplica por 1 al distribuidor y por 1,15 al cliente final (CLIENTE_FACTORES
// en data/precios.js). Es decir, cada peso que hoy factura ese cliente rendiría
// un 13 % menos.
//
// La decisión entonces no es "compra mucho", son cuatro cosas a la vez: compra
// volumen del producto, vuelve (no fue una obra única), ese producto es lo suyo
// y —sobre todo— paga. El puntaje las mide por separado y deja ver de cuál está
// flojo, en vez de dar un sí o un no sin explicación.

export const METAS_DISTRIBUIDOR = {
  valor: 60_000_000,   // compras del producto en el periodo mirado
  facturas: 4,         // cuántas veces volvió por ese producto
  meses: 4,            // en cuántos meses distintos compró
  moraMaxima: 15,      // días de mora promedio que se toleran
  participacion: 40,   // qué tanto de sus compras es ese producto (%)
};

// Lo comercial se reparte entre tres factores; el pago no suma, multiplica.
//
// Sumarlo como un cuarto factor dejaba pasar al cliente que compra mucho y no
// paga: perdía sus 25 puntos y se quedaba igual por encima del umbral. Y ese es
// justo el cliente al que no se le puede bajar el precio. Como multiplicador,
// el mal pagador cae al fondo por bueno que sea comprando.
export const PESOS_DISTRIBUIDOR = { volumen: 40, recurrencia: 35, enfoque: 25 };

// Ni el peor pagador anula del todo lo comercial: un cliente que compra el
// volumen y hoy paga tarde es un candidato aplazado, no un imposible, y la
// pantalla tiene que poder ordenarlos entre ellos.
export const PISO_PAGO = 0.35;

const acotar = (v, min = 0, max = 1) => Math.min(max, Math.max(min, v));

export const NIVEL_LISTO = "listo";
export const NIVEL_CERCA = "cerca";
export const NIVEL_LEJOS = "lejos";

export const ETIQUETA_NIVEL = {
  [NIVEL_LISTO]: "Listo para distribuidor",
  [NIVEL_CERCA]: "Cerca",
  [NIVEL_LEJOS]: "Todavía no",
};

export const TONO_NIVEL = { [NIVEL_LISTO]: "success", [NIVEL_CERCA]: "warning", [NIVEL_LEJOS]: "neutral" };

/**
 * Qué tan candidato es un cliente a distribuidor de un producto.
 *
 * Devuelve el puntaje (0-100), los factores por separado —para poder pintarlos
 * y discutirlos—, qué le falta en palabras y lo que costaría el descuento al
 * año, que es la cifra con la que de verdad se decide.
 */
export function evaluarDistribuidor(cliente = {}, producto = "", metas = METAS_DISTRIBUIDOR) {
  const m = { ...METAS_DISTRIBUIDOR, ...(metas || {}) };
  const linea = (cliente.productos || []).find((p) => p.producto === producto);
  const valor = Math.max(0, aNumero(linea?.valor));
  const facturas = aNumero(linea?.facturas);
  const participacion = cliente.facturado > 0 ? (valor / cliente.facturado) * 100 : 0;

  const volumen = acotar(valor / Math.max(1, m.valor));
  // Volver es las dos cosas: repetir la compra del producto y estar activo
  // varios meses. Cuatro facturas del mismo día no son recurrencia.
  const recurrencia = acotar(
    (acotar(facturas / Math.max(1, m.facturas)) + acotar(aNumero(cliente.mesesActivos) / Math.max(1, m.meses))) / 2
  );
  const enfoque = acotar(participacion / Math.max(1, m.participacion));
  // Sin abonos registrados no se premia ni se castiga: se queda a mitad de
  // tabla. Poner 0 haría que un cliente nuevo que paga de contado —y todavía no
  // tiene historia— pareciera moroso.
  const pago = cliente.valorPagado
    ? acotar(
        (acotar(aNumero(cliente.puntualidad) / 100) * 0.6 +
          acotar(1 - aNumero(cliente.moraPromedio) / Math.max(1, m.moraMaxima)) * 0.4) *
          // Deber plata vencida hoy pesa más que cualquier promedio histórico.
          (cliente.vencido > 0 ? 0.4 : 1)
      )
    : 0.5;

  const comercial =
    (volumen * PESOS_DISTRIBUIDOR.volumen +
      recurrencia * PESOS_DISTRIBUIDOR.recurrencia +
      enfoque * PESOS_DISTRIBUIDOR.enfoque) /
    100;
  const multiplicadorPago = PISO_PAGO + (1 - PISO_PAGO) * pago;
  const puntaje = Math.round(100 * comercial * multiplicadorPago);
  const nivel = puntaje >= 75 ? NIVEL_LISTO : puntaje >= 50 ? NIVEL_CERCA : NIVEL_LEJOS;

  return {
    producto,
    puntaje,
    nivel,
    factores: [
      { clave: "volumen", label: "Volumen del producto", valor: volumen, peso: PESOS_DISTRIBUIDOR.volumen },
      { clave: "recurrencia", label: "Recurrencia", valor: recurrencia, peso: PESOS_DISTRIBUIDOR.recurrencia },
      { clave: "enfoque", label: "Enfoque en el producto", valor: enfoque, peso: PESOS_DISTRIBUIDOR.enfoque },
    ],
    pago: { valor: pago, multiplicador: redondear(multiplicadorPago, 2), sinHistoria: !cliente.valorPagado },
    valor: redondear(valor),
    facturas,
    participacion: redondear(participacion, 1),
    costoDescuento: costoDescuentoDistribuidor(valor),
    reparos: reparosDistribuidor({ valor, facturas, participacion, cliente, metas: m }),
  };
}

/**
 * Lo que cuesta al año darle precio de distribuidor a lo que hoy compra: la
 * diferencia entre facturarle con factor 1,15 y facturarle con factor 1.
 */
export function costoDescuentoDistribuidor(valor, desde = "Cliente Final Contado") {
  const factorActual = CLIENTE_FACTORES[desde] || 1.15;
  const factorDistribuidor = CLIENTE_FACTORES.Distribuidor || 1;
  if (!factorActual) return 0;
  return redondear(aNumero(valor) * (1 - factorDistribuidor / factorActual));
}

// Qué le falta, en palabras. Es lo que hace discutible el puntaje: sin esto,
// un 62 no le dice nada a nadie.
function reparosDistribuidor({ valor, facturas, participacion, cliente, metas }) {
  const faltas = [];
  if (valor < metas.valor) {
    faltas.push(`Le faltan ${porcentajeFaltante(valor, metas.valor)} para el volumen de la meta.`);
  }
  if (facturas < metas.facturas) {
    faltas.push(`Compró el producto ${facturas} ${facturas === 1 ? "vez" : "veces"} (la meta son ${metas.facturas}).`);
  }
  if (cliente.mesesActivos < metas.meses) {
    faltas.push(`Solo tuvo compras en ${cliente.mesesActivos} ${cliente.mesesActivos === 1 ? "mes" : "meses"}.`);
  }
  if (cliente.vencido > 0) faltas.push("Tiene cartera vencida sin pagar.");
  else if ((cliente.moraPromedio || 0) > metas.moraMaxima) {
    faltas.push(`Paga con ${cliente.moraPromedio} días de mora en promedio.`);
  }
  if (participacion < metas.participacion) {
    faltas.push(`Ese producto es solo el ${Math.round(participacion)} % de lo que compra.`);
  }
  return faltas;
}

const porcentajeFaltante = (valor, meta) => {
  const falta = Math.max(0, meta - valor);
  return `${Math.round((falta / Math.max(1, meta)) * 100)} %`;
};

/**
 * Los clientes ordenados por qué tan candidatos son a distribuidor de un
 * producto. Solo entran los que ya compraron ese producto: proponer como
 * distribuidor a quien nunca lo ha comprado no es una recomendación, es ruido.
 */
export function candidatosDistribuidor(clientes = [], producto = "", metas = METAS_DISTRIBUIDOR) {
  if (!producto) return [];
  return clientes
    .filter((c) => (c.productos || []).some((p) => p.producto === producto && p.valor > 0))
    .map((c) => ({ cliente: c, evaluacion: evaluarDistribuidor(c, producto, metas) }))
    .sort((a, b) => b.evaluacion.puntaje - a.evaluacion.puntaje || b.evaluacion.valor - a.evaluacion.valor);
}

// ─── Filtros y orden del listado ────────────────────────────────────────────

export const ORDENES = [
  { valor: "facturado", label: "Más ventas" },
  { valor: "saldo", label: "Más saldo" },
  { valor: "vencido", label: "Más vencido" },
  { valor: "facturas", label: "Más facturas" },
  { valor: "ticket", label: "Mayor ticket" },
  { valor: "reciente", label: "Compra más reciente" },
  { valor: "nombre", label: "Nombre" },
];

export function ordenarClientes(clientes = [], orden = "facturado") {
  const lista = [...clientes];
  if (orden === "nombre") return lista.sort((a, b) => a.nombre.localeCompare(b.nombre));
  if (orden === "reciente") {
    return lista.sort((a, b) => String(b.ultimaCompra || "").localeCompare(String(a.ultimaCompra || "")));
  }
  return lista.sort((a, b) => aNumero(b[orden]) - aNumero(a[orden]) || a.nombre.localeCompare(b.nombre));
}

export function filtrarClientes(clientes = [], { busqueda = "", producto = "", mes = "", soloConSaldo = false } = {}) {
  const terminos = sinTildes(busqueda).split(/\s+/).filter(Boolean);
  return clientes.filter((c) => {
    if (soloConSaldo && Math.abs(c.saldo) < 1) return false;
    if (producto && !(c.productos || []).some((p) => p.producto === producto && p.valor > 0)) return false;
    if (mes && !c.porMes?.[mes]) return false;
    if (!terminos.length) return true;
    const heno = sinTildes(`${c.nombre} ${c.alias} ${c.nit} ${c.ciudad} ${c.productoPrincipal}`);
    return terminos.every((t) => heno.includes(t));
  });
}
