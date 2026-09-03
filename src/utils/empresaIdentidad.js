// Identidad de una empresa: cómo se decide que dos registros son el mismo
// cliente.
//
// Es la pieza que faltaba para los duplicados. Antes cada camino que podía dar
// de alta un cliente (el cotizador, la vista previa, el selector de la ficha)
// buscaba a su manera —o no buscaba— antes de crear, así que la misma empresa
// entraba varias veces: escrita con otra puntuación, con el NIT con puntos, o
// simplemente sin NIT. Aquí vive el criterio único que usan todos.
//
// Tres niveles, de más a menos seguro:
//   1. NIT en dígitos            → identidad dura, se reutiliza sin preguntar.
//   2. Nombre o alias normalizado → identidad práctica, se reutiliza.
//   3. Nombre sin la forma legal  → solo sospecha; se avisa, no se decide solo.
//
// El nivel 3 nunca vincula por su cuenta: "Andina S.A.S." y "Andina Ltda."
// pueden ser dos empresas distintas de verdad, y colgar una ficha del cliente
// equivocado es peor que tener dos fichas en clientes separados.
import { normalizarNombreCliente, limpiarNit } from "./clienteVinculo";

// NIT reducido a dígitos: así "900.123.456-7", '"9001234567"' y "9001234567"
// caen en la misma clave. El seed del CSV ya guardaba unos sin puntos y otros
// con ellos, y esa sola diferencia bastaba para duplicar la empresa.
export function claveNit(nit) {
  return limpiarNit(nit).replace(/[^0-9]/g, "");
}

// El mismo NIT sin el dígito de verificación. Unos lo escriben ("9001234567")
// y otros no ("900123456"); son el mismo NIT y hay que reconocerlo, pero solo
// como sospecha: dos NIT distintos pueden compartir los primeros nueve dígitos.
export function claveNitBase(nit) {
  const digitos = claveNit(nit);
  return digitos.length >= 10 ? digitos.slice(0, 9) : digitos;
}

// Nombre y alias comparten normalización (sin tildes, sin puntuación, sin
// espacios repetidos) para poder cruzarlos: alguien escribe el alias en el
// campo del nombre y hay que reconocer la empresa igual.
export const claveNombre = normalizarNombreCliente;

// Formas societarias y conectores que sobran al final del nombre. Se quitan
// solo para *sospechar* de un duplicado, nunca para vincular en automático.
const SUFIJOS_LEGALES = new Set([
  "sas", "sa", "ltda", "limitada", "eu", "sca", "esp", "bic", "cia", "compania",
  "scs", "sencs", "sen", "inc", "llc", "ltd", "corp", "y", "e",
]);

const esSufijo = (token) => token.length === 1 || SUFIJOS_LEGALES.has(token);

// Nombre sin la forma legal del final: "Alimentos Cárnicos S.A.S." y
// "ALIMENTOS CARNICOS" quedan en "alimentos carnicos". Se conserva siempre al
// menos un token, para que "S.A.S." no termine en cadena vacía.
export function claveNombreComercial(nombre) {
  const tokens = claveNombre(nombre).split(" ").filter(Boolean);
  while (tokens.length > 1 && esSufijo(tokens[tokens.length - 1])) tokens.pop();
  return tokens.join(" ");
}

// Palabras que no distinguen a nadie. Van además de las formas societarias:
// media base es "… COLOMBIA S.A.S." y "GRUPO …", así que dejarlas dentro haría
// que cualquier par de clientes pareciera el mismo.
const RELLENO = new Set([
  ...SUFIJOS_LEGALES,
  "colombia", "col", "grupo", "cia", "compania", "empresa", "empresas",
  "de", "del", "la", "las", "el", "los", "y", "e", "en",
]);

/**
 * Tokens con los que se reconoce un nombre: sin la forma legal, sin relleno y
 * sin palabras de menos de tres letras.
 *
 * "AXIONLOG COLOMBIA S.A.S." → ["axionlog"].
 */
export function tokensNucleo(nombre) {
  return claveNombre(nombre)
    .split(" ")
    .filter((t) => t.length >= 3 && !RELLENO.has(t));
}

/**
 * ¿Un nombre está contenido en el otro?
 *
 * Es el caso que dejó la migración: el Excel escribía "AXIONLOG" y la base de
 * clientes tenía "AXIONLOG COLOMBIA S.A.S.". Ni el nombre normalizado ni el
 * nombre sin forma legal los juntan, así que hasta ahora el detector de
 * duplicados no los veía.
 *
 * Es deliberadamente estricto, porque un falso positivo aquí fusiona dos
 * clientes que no lo son:
 *   · los tokens del corto tienen que estar todos en el largo;
 *   · si el corto es una sola palabra, tiene que ser la primera del largo y
 *     medir cuatro letras o más ("NORTE" no reclama a "FRIGORÍFICO NORTE");
 *   · y ninguno de los dos puede quedarse sin tokens propios.
 */
export function nombreContenido(a, b) {
  const ta = tokensNucleo(a);
  const tb = tokensNucleo(b);
  if (!ta.length || !tb.length) return false;
  const [corto, largo] = ta.length <= tb.length ? [ta, tb] : [tb, ta];
  const enLargo = new Set(largo);
  if (!corto.every((t) => enLargo.has(t))) return false;
  if (corto.length === 1) return corto[0].length >= 4 && corto[0] === largo[0];
  return true;
}

// Las cuatro llaves con las que se compara una empresa.
export function clavesEmpresa(empresa = {}) {
  return {
    nit:       claveNit(empresa.nit),
    nitBase:   claveNitBase(empresa.nit),
    nombre:    claveNombre(empresa.nombre),
    alias:     claveNombre(empresa.alias),
    comercial: claveNombreComercial(empresa.nombre),
  };
}

// ¿A qué empresa de la lista corresponde lo que se escribió? Devuelve también
// por qué coincidió y cuántas empresas coincidían, para que quien llama pueda
// avisar cuando la lista trae más de una candidata.
//
// `empresas` es la lista ya cargada en memoria (la caché del contexto). Se
// resuelve aquí y no en Firestore porque las empresas viejas no tienen campos
// normalizados guardados y una consulta por igualdad no las encontraría.
export function resolverEmpresa(datos = {}, empresas = []) {
  const buscada = clavesEmpresa(datos);
  // Las claves de cada candidata se calculan una sola vez: esto corre en cada
  // tecla del selector de cliente, sobre la lista completa de empresas.
  const candidatas = empresas
    .filter((e) => e && e.id !== datos.id)
    .map((e) => ({ empresa: e, claves: clavesEmpresa(e) }));

  const porClave = (campo, clave) =>
    clave ? candidatas.filter((c) => c.claves[campo] === clave) : [];

  const intentos = [
    ["nit",    porClave("nit", buscada.nit)],
    ["nombre", porClave("nombre", buscada.nombre)],
    ["alias",  porClave("alias", buscada.alias)],
    // Cruzados: lo escrito en el nombre es el alias de una empresa, o al revés.
    ["alias",  porClave("alias", buscada.nombre)],
    ["nombre", porClave("nombre", buscada.alias)],
  ];

  for (const [motivo, coincidencias] of intentos) {
    if (coincidencias.length > 0) {
      return { empresa: coincidencias[0].empresa, motivo, coincidencias: coincidencias.length };
    }
  }
  return { empresa: null, motivo: null, coincidencias: 0 };
}

// Empresas que *podrían* ser la misma que la buscada sin serlo con certeza:
// mismo NIT sin dígito de verificación, o mismo nombre una vez quitada la
// forma legal. Sirve para advertir antes de crear, no para vincular.
export function buscarPosiblesDuplicados(datos = {}, empresas = []) {
  const buscada = clavesEmpresa(datos);
  const exacta = resolverEmpresa(datos, empresas).empresa;
  const salida = [];
  for (const empresa of empresas) {
    if (!empresa || empresa.id === datos.id || empresa.id === exacta?.id) continue;
    const claves = clavesEmpresa(empresa);
    let motivo = null;
    if (buscada.nitBase && claves.nitBase === buscada.nitBase) motivo = "nit";
    else if (buscada.comercial && claves.comercial === buscada.comercial) motivo = "nombre";
    else if (buscada.comercial && claveNombreComercial(empresa.alias) === buscada.comercial) motivo = "alias";
    if (motivo) salida.push({ empresa, motivo });
  }
  return salida;
}

// ─── Duplicados ya guardados ────────────────────────────────────────────────
// Agrupa toda la base para poder revisarla y fusionar. Un mismo par de
// empresas puede coincidir por varias llaves a la vez (mismo NIT y mismo
// nombre), y una cadena A~B por NIT + B~C por nombre son las tres el mismo
// cliente: por eso se unen en componentes con union-find en vez de devolver
// una lista de parejas sueltas.
function crearUnion() {
  const padre = new Map();
  const raiz = (x) => {
    if (!padre.has(x)) padre.set(x, x);
    while (padre.get(x) !== x) {
      padre.set(x, padre.get(padre.get(x)));
      x = padre.get(x);
    }
    return x;
  };
  return {
    unir(a, b) {
      const ra = raiz(a);
      const rb = raiz(b);
      if (ra !== rb) padre.set(ra, rb);
    },
    raiz,
  };
}

// Devuelve los grupos de dos o más empresas que parecen el mismo cliente, con
// el motivo por el que quedaron juntas. `certeza: "alta"` es NIT o nombre
// idénticos (fusionable sin pensarlo); `"media"` es la sospecha del nivel 3.
export function agruparDuplicados(empresas = []) {
  const validas = empresas.filter((e) => e?.id);
  const union = crearUnion();
  const motivos = new Map(); // id raíz -> Set de motivos

  const agrupar = (obtener, motivo, certeza) => {
    const porClave = new Map();
    for (const empresa of validas) {
      const clave = obtener(empresa);
      if (!clave) continue;
      if (!porClave.has(clave)) porClave.set(clave, []);
      porClave.get(clave).push(empresa);
    }
    for (const lista of porClave.values()) {
      if (lista.length < 2) continue;
      for (const empresa of lista.slice(1)) union.unir(lista[0].id, empresa.id);
      const marca = `${motivo}:${certeza}`;
      const raiz = union.raiz(lista[0].id);
      if (!motivos.has(raiz)) motivos.set(raiz, new Set());
      motivos.get(raiz).add(marca);
    }
  };

  agrupar((e) => claveNit(e.nit), "NIT idéntico", "alta");
  agrupar((e) => claveNombre(e.nombre), "nombre idéntico", "alta");
  agrupar((e) => claveNombre(e.alias), "alias idéntico", "alta");
  agrupar((e) => claveNitBase(e.nit), "NIT sin dígito de verificación", "media");
  agrupar((e) => claveNombreComercial(e.nombre), "nombre sin la forma legal", "media");

  // Un nombre contenido en el otro no es igualdad de llave, así que no se puede
  // agrupar como los demás: hay que comparar por parejas. Con unos cientos de
  // empresas son unas decenas de miles de comparaciones, instantáneo.
  for (let i = 0; i < validas.length; i += 1) {
    for (let j = i + 1; j < validas.length; j += 1) {
      const a = validas[i];
      const b = validas[j];
      // Dos NIT distintos son dos empresas distintas, por parecido que sea el
      // nombre. Sin esto, una sucursal con NIT propio se tragaría a la matriz.
      const nitA = claveNit(a.nit);
      const nitB = claveNit(b.nit);
      if (nitA && nitB && nitA !== nitB) continue;
      if (!nombreContenido(a.nombre, b.nombre)) continue;
      union.unir(a.id, b.id);
      const raiz = union.raiz(a.id);
      if (!motivos.has(raiz)) motivos.set(raiz, new Set());
      motivos.get(raiz).add("un nombre contenido en el otro:media");
    }
  }

  const grupos = new Map();
  for (const empresa of validas) {
    const raiz = union.raiz(empresa.id);
    if (!grupos.has(raiz)) grupos.set(raiz, []);
    grupos.get(raiz).push(empresa);
  }

  return [...grupos.entries()]
    .filter(([, lista]) => lista.length > 1)
    .map(([raiz, lista]) => {
      // Los motivos se acumularon en la raíz que tenía union-find en ese
      // momento; se recogen de todos los miembros para no perder ninguno.
      const marcas = new Set();
      for (const empresa of lista) {
        for (const m of motivos.get(union.raiz(empresa.id)) || []) marcas.add(m);
        for (const m of motivos.get(empresa.id) || []) marcas.add(m);
      }
      const partes = [...marcas].map((m) => m.split(":"));
      return {
        clave: raiz,
        empresas: [...lista].sort((a, b) => (a.nombre || "").localeCompare(b.nombre || "")),
        motivos: partes.map(([motivo]) => motivo),
        certeza: partes.some(([, c]) => c === "alta") ? "alta" : "media",
      };
    })
    .sort((a, b) => (a.certeza === b.certeza ? b.empresas.length - a.empresas.length : a.certeza === "alta" ? -1 : 1));
}

// Cuál de las duplicadas conviene conservar: la que tenga NIT y más datos
// llenos. Al fusionar, las demás ceden sus contactos y sus fichas a esta.
export function elegirPrincipal(lista = []) {
  const puntaje = (e) =>
    (claveNit(e?.nit) ? 8 : 0) +
    (e?.alias ? 4 : 0) +
    (e?.ciudad ? 2 : 0) +
    (e?.direccion ? 1 : 0) +
    (e?.emailGeneral ? 1 : 0) +
    (e?.telefonoGeneral ? 1 : 0);
  return [...lista].sort((a, b) => puntaje(b) - puntaje(a))[0] || null;
}

// Qué se conserva y qué se elimina al fusionar un grupo: `principalId` es la
// empresa marcada a mano (si no hay, decide `elegirPrincipal`) y `excluidas`
// son las que el usuario dejó fuera porque el agrupado por parecido metió un
// cliente ajeno. Con menos de dos empresas dentro no hay nada que fusionar.
//
// Vive aquí y no en la pantalla porque la fusión no se puede deshacer: quién
// sobrevive a un lote de fusiones es exactamente lo que hay que poder probar.
export function planFusion(empresas = [], { principalId = null, excluidas = {} } = {}) {
  const incluidas = empresas.filter((e) => e?.id && !excluidas[e.id]);
  if (incluidas.length < 2) return null;
  const elegida = incluidas.find((e) => e.id === principalId);
  const principal = elegida || elegirPrincipal(incluidas);
  return { principal, otras: incluidas.filter((e) => e.id !== principal.id) };
}

// Llave de comparación de contactos dentro de una empresa: el email manda y el
// nombre normalizado hace de respaldo, porque muchos contactos entran sin
// email (y ese fue justo el caso que los duplicaba en cada cotización).
export function claveContacto(contacto = {}) {
  const email = String(contacto.email ?? "").trim().toLowerCase();
  if (email) return `email:${email}`;
  const nombre = claveNombre(contacto.nombre);
  return nombre ? `nombre:${nombre}` : "";
}

// Contacto ya existente que corresponde a lo que se escribió. Primero por
// email (dos personas distintas no comparten correo) y después por nombre.
export function resolverContacto(datos = {}, contactos = []) {
  const email = String(datos.email ?? "").trim().toLowerCase();
  const nombre = claveNombre(datos.nombre);
  const candidatos = contactos.filter((c) => c && c.id !== datos.id);
  if (email) {
    const porEmail = candidatos.find((c) => String(c.email ?? "").trim().toLowerCase() === email);
    if (porEmail) return { contacto: porEmail, motivo: "email" };
  }
  if (nombre) {
    const porNombre = candidatos.find((c) => claveNombre(c.nombre) === nombre);
    if (porNombre) return { contacto: porNombre, motivo: "nombre" };
  }
  return { contacto: null, motivo: null };
}
