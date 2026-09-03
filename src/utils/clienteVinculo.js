// Vínculo cliente ↔ ficha ↔ cotización.
//
// El cliente es uno solo para toda la app: la colección `empresas` (la misma
// que ya usa el cotizador, con su subcolección `contactos`). Las fichas de
// fabricación guardaban el cliente como texto suelto; ahora guardan además
// `clienteId`, que apunta a `empresas/{id}` — el mismo id que la cotización
// guarda en `empresaId`.
//
// Cardinalidad 1‑a‑N: la llave vive en la ficha, así que una ficha tiene un
// solo cliente, y un cliente puede estar en muchas fichas (y en muchas
// cotizaciones).
//
// El nombre, el alias, el NIT y la ciudad se siguen guardando dentro de la
// ficha como copia del momento en que se creó. Son datos impresos: la ficha que
// ya salió a planta no debe cambiar porque después se corrija el nombre de la
// empresa, y el listado de órdenes puede buscar y filtrar por cliente sin leer
// `empresas`.

// Nombre del campo que apunta a `empresas/{id}` en cada lado de la relación.
// La cotización nació con `empresaId` y hay documentos históricos con ese
// nombre, así que se respeta; las fichas usan `clienteId`.
export const CAMPO_CLIENTE_FICHA = "clienteId";
export const CAMPO_CLIENTE_COTIZACION = "empresaId";

// Clave de comparación de nombres: sin tildes, sin puntuación y sin espacios
// repetidos. Sirve para reconocer que "Alimentos Cárnicos S.A.S." y
// "ALIMENTOS CARNICOS SAS" son el mismo cliente al vincular fichas viejas.
//
// La puntuación se borra sin dejar espacio (así "S.A.S." queda "sas") y los
// espacios se colapsan aparte. La ñ se pliega a n junto con las demás tildes:
// para emparejar conviene que "Peñalosa" y "Penalosa" caigan en la misma clave.
export function normalizarNombreCliente(nombre) {
  return String(nombre ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]+/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

// El NIT llega con comillas de las importaciones de Excel (ver firebaseCompanies).
export function limpiarNit(nit) {
  return String(nit ?? "").replace(/["“”]/g, "").trim();
}

const vacio = () => ({
  clienteId: null,
  cliente: "",
  clienteAlias: "",
  usarAlias: false,
  clienteNit: "",
  clienteCiudad: "",
});

// Datos del cliente tal como quedan guardados en la ficha, a partir de la
// empresa elegida en el selector.
//
// El alias viaja junto al nombre y también se congela: la orden que ya salió a
// planta debe seguir diciendo lo mismo aunque después se cambie la abreviación
// de la empresa. `usarAlias` arranca encendido cuando la empresa tiene alias
// —definirlo es justamente decir "a este cliente lo llamamos así"— y el
// selector deja apagarlo en la ficha concreta que deba salir con el nombre
// legal completo.
export function clienteDesdeEmpresa(empresa, { usarAlias } = {}) {
  if (!empresa?.id) return vacio();
  const alias = (empresa.alias || "").trim();
  return {
    clienteId:     empresa.id,
    cliente:       (empresa.nombre || "").trim(),
    clienteAlias:  alias,
    usarAlias:     alias ? (usarAlias ?? true) : false,
    clienteNit:    limpiarNit(empresa.nit),
    clienteCiudad: (empresa.ciudad || "").trim(),
  };
}

// Cliente escrito a mano, sin empresa en la base. Se permite (una ficha urgente
// no se puede quedar esperando a que alguien cree la empresa), pero queda sin
// vincular y el selector lo señala.
//
// `recortar: false` conserva el texto tal cual se escribió. Es lo que necesita
// el campo mientras se teclea: recortar en cada pulsación borra el espacio que
// se acaba de escribir, así que "Frigorífico Norte" se quedaba en
// "FrigoríficoNorte" y no había forma de separar las palabras. Lo guardado
// vuelve a recortarse en camposClienteFicha, que es la puerta a Firestore.
export function clienteSinVincular(nombre, { recortar = true } = {}) {
  const texto = String(nombre ?? "");
  return { ...vacio(), cliente: recortar ? texto.trim() : texto };
}

// Alias escrito a mano en la ficha: sirve para el cliente que todavía no está
// en la base (una orden urgente no espera a que alguien lo dé de alta) y para
// abreviar distinto en una ficha puntual.
//
// Escribir el primer alias lo enciende —para eso se escribe—, pero si ya había
// uno se respeta la decisión de la casilla: quien la apagó y sigue corrigiendo
// el texto no quiere que se le vuelva a encender sola.
//
// `recortar` funciona como en clienteSinVincular: el alias también se escribe
// con espacios ("CI ANDINA") y recortar en cada tecla los impedía.
export function aliasManual(datos = {}, alias, { recortar = true } = {}) {
  const texto = String(alias ?? "");
  const limpio = texto.trim();
  if (!limpio) return { ...datos, clienteAlias: recortar ? "" : texto, usarAlias: false };
  const yaTenia = Boolean(String(datos.clienteAlias ?? "").trim());
  return {
    ...datos,
    clienteAlias: recortar ? limpio : texto,
    usarAlias: yaTenia ? Boolean(datos.usarAlias) : true,
  };
}

// Normaliza los campos de cliente antes de escribirlos en Firestore. Lo usan
// los seis módulos de fichas para que todas guarden exactamente la misma forma.
export function camposClienteFicha(input = {}) {
  const id = String(input.clienteId ?? "").trim();
  const alias = String(input.clienteAlias ?? "").trim();
  return {
    clienteId:     id || null,
    cliente:       String(input.cliente ?? "").trim(),
    clienteAlias:  alias,
    // Sin alias no hay nada que imprimir en su lugar, así que la marca se
    // guarda apagada: así ninguna ficha queda pidiendo un alias que no existe.
    usarAlias:     alias ? Boolean(input.usarAlias) : false,
    clienteNit:    limpiarNit(input.clienteNit),
    clienteCiudad: String(input.clienteCiudad ?? "").trim(),
  };
}

// Nombre del cliente tal como debe salir impreso en la orden de producción y
// mostrarse en el panel de planta: el alias cuando la ficha lo pidió, y el
// nombre completo en cualquier otro caso. Las fichas anteriores al alias no
// tienen ninguno de los dos campos, así que caen solas en el nombre.
export function nombreClienteImpreso(ficha = {}) {
  const alias = String(ficha.clienteAlias ?? "").trim();
  const nombre = String(ficha.cliente ?? "").trim();
  return ficha.usarAlias && alias ? alias : nombre;
}

// Lee el vínculo de una ficha ya guardada (para precargar el formulario al
// editar). Las fichas anteriores al vínculo solo tienen el nombre.
export function clienteDeFicha(ficha = {}) {
  return camposClienteFicha(ficha);
}

export function fichaVinculada(ficha) {
  return Boolean(ficha?.clienteId);
}

// Busca a qué empresa corresponde un nombre suelto. Solo devuelve resultado si
// hay una única coincidencia: con dos empresas que normalizan igual no se puede
// decidir sin intervención humana, y vincular a la equivocada es peor que
// dejarla sin vincular.
export function buscarEmpresaPorNombre(nombre, empresas = []) {
  const clave = normalizarNombreCliente(nombre);
  if (!clave) return null;
  const coincidencias = empresas.filter((e) => normalizarNombreCliente(e?.nombre) === clave);
  return coincidencias.length === 1 ? coincidencias[0] : null;
}

// Empresa por NIT dentro de una lista ya cargada (sin ir a la red).
export function buscarEmpresaPorNit(nit, empresas = []) {
  const clave = limpiarNit(nit);
  if (!clave) return null;
  return empresas.find((e) => limpiarNit(e?.nit) === clave) || null;
}

// Plan de vinculación de las fichas que todavía guardan el cliente como texto:
// qué fichas se pueden enlazar sin ambigüedad y cuáles quedan pendientes. Se
// calcula aparte de la escritura para poder mostrarlo antes de tocar nada.
export function planVinculacion(fichas = [], empresas = []) {
  const vincular = [];
  const sinCoincidencia = [];
  for (const ficha of fichas) {
    if (fichaVinculada(ficha)) continue;
    const nombre = (ficha?.cliente || "").trim();
    if (!nombre) continue;
    const empresa = buscarEmpresaPorNombre(nombre, empresas);
    if (empresa) vincular.push({ ficha, empresa, datos: clienteDesdeEmpresa(empresa) });
    else sinCoincidencia.push({ ficha, nombre });
  }
  return { vincular, sinCoincidencia };
}
