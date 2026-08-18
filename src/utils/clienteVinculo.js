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
// El nombre, el NIT y la ciudad se siguen guardando dentro de la ficha como
// copia del momento en que se creó. Son datos impresos: la ficha que ya salió a
// planta no debe cambiar porque después se corrija el nombre de la empresa, y
// el listado de órdenes puede buscar y filtrar por cliente sin leer `empresas`.

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

const vacio = () => ({ clienteId: null, cliente: "", clienteNit: "", clienteCiudad: "" });

// Datos del cliente tal como quedan guardados en la ficha, a partir de la
// empresa elegida en el selector.
export function clienteDesdeEmpresa(empresa) {
  if (!empresa?.id) return vacio();
  return {
    clienteId:     empresa.id,
    cliente:       (empresa.nombre || "").trim(),
    clienteNit:    limpiarNit(empresa.nit),
    clienteCiudad: (empresa.ciudad || "").trim(),
  };
}

// Cliente escrito a mano, sin empresa en la base. Se permite (una ficha urgente
// no se puede quedar esperando a que alguien cree la empresa), pero queda sin
// vincular y el selector lo señala.
export function clienteSinVincular(nombre) {
  return { ...vacio(), cliente: String(nombre ?? "").trim() };
}

// Normaliza los cuatro campos antes de escribirlos en Firestore. Lo usan los
// seis módulos de fichas para que todas guarden exactamente la misma forma.
export function camposClienteFicha(input = {}) {
  const id = String(input.clienteId ?? "").trim();
  return {
    clienteId:     id || null,
    cliente:       String(input.cliente ?? "").trim(),
    clienteNit:    limpiarNit(input.clienteNit),
    clienteCiudad: String(input.clienteCiudad ?? "").trim(),
  };
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
