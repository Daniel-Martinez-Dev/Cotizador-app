// Vincular las facturas del libro con la base de clientes.
//
// El Excel escribía el nombre del cliente a mano en cada fila, así que
// "AXIONLOG", "Axionlog Colombia S.A.S." y "AXIONLOG COLOMBIA SAS" eran tres
// clientes para la hoja y uno solo para la empresa. Al importar, el documento
// se queda con el nombre que traía y sin `empresaId` cuando no hubo con quién
// casarlo — y entonces su cartera se cuenta aparte de la del mismo cliente.
//
// Aquí se agrupa lo que quedó suelto y se propone con quién unirlo, con el
// mismo criterio de identidad que usa el resto de la app (empresaIdentidad):
// NIT en dígitos, y nombre o alias normalizados. Lo que no alcanza para
// vincular se ofrece como sospecha; nunca se aplica sin que alguien confirme.
//
// Es puro a propósito: no toca Firebase, así se puede probar el criterio sin
// una base detrás. Quien guarda es la pantalla.

import {
  buscarPosiblesDuplicados,
  claveNit,
  claveNombre,
  resolverEmpresa,
} from "../../utils/empresaIdentidad";
import { aNumero, redondear } from "./calculos";

// Motivos de una sugerencia, del más firme al más flojo. La pantalla los
// muestra distinto: los dos primeros se pueden aplicar en bloque, el tercero
// pide mirar antes.
export const POR_NIT = "nit";
export const POR_NOMBRE = "nombre";
export const POR_HERMANA = "hermana"; // otra factura con el mismo nombre ya está vinculada

export const etiquetaMotivo = (motivo) =>
  ({
    [POR_NIT]: "Mismo NIT",
    [POR_NOMBRE]: "Mismo nombre",
    alias: "Coincide con el alias",
    [POR_HERMANA]: "Otras facturas de este nombre ya están vinculadas",
  }[motivo] || "Coincidencia");

// Dos documentos son del mismo cliente cuando comparten NIT; sin NIT, cuando
// comparten el nombre normalizado. El NIT manda porque es el único dato que no
// depende de cómo lo escribió quien digitó la fila.
export function claveGrupo(doc = {}) {
  const nit = claveNit(doc.clienteNit);
  if (nit) return `nit:${nit}`;
  const nombre = claveNombre(doc.clienteNombre);
  return nombre ? `nombre:${nombre}` : "";
}

const netoDe = (doc) => aNumero(doc?.resumen?.neto ?? doc?.neto);
const saldoDe = (doc) => aNumero(doc?.resumen?.saldo);

// Un nombre por grupo para mostrar: el que más se repite y, a igualdad, el más
// largo. El largo suele ser el razón social completa, que es la que sirve para
// dar de alta la empresa.
function nombreRepresentativo(nombres = []) {
  const cuenta = new Map();
  for (const n of nombres) {
    const limpio = String(n || "").trim();
    if (!limpio) continue;
    cuenta.set(limpio, (cuenta.get(limpio) || 0) + 1);
  }
  const orden = [...cuenta.entries()].sort(
    (a, b) => b[1] - a[1] || b[0].length - a[0].length
  );
  return orden[0]?.[0] || "";
}

/**
 * Empresa que ya se le asignó a cada nombre de cliente en documentos vinculados.
 *
 * Es la pista más útil que hay: si veinte facturas de "AXIONLOG" ya cuelgan de
 * una empresa y la número veintiuno llegó suelta porque venía escrita con un
 * punto de más, la respuesta está en las otras veinte.
 */
export function empresasYaUsadas(documentos = []) {
  const conteos = new Map(); // clave de nombre -> Map(empresaId -> veces)
  for (const doc of documentos || []) {
    if (!doc?.empresaId) continue;
    const clave = claveNombre(doc.clienteNombre);
    if (!clave) continue;
    if (!conteos.has(clave)) conteos.set(clave, new Map());
    const porEmpresa = conteos.get(clave);
    porEmpresa.set(doc.empresaId, (porEmpresa.get(doc.empresaId) || 0) + 1);
  }
  const salida = new Map();
  for (const [clave, porEmpresa] of conteos) {
    // Con dos empresas distintas para el mismo nombre no hay pista, hay un
    // problema: mejor no sugerir nada que sugerir la equivocada.
    if (porEmpresa.size !== 1) continue;
    salida.set(clave, [...porEmpresa.keys()][0]);
  }
  return salida;
}

/**
 * Agrupa los documentos sin `empresaId` por cliente y le propone a cada grupo
 * una empresa de la base.
 *
 * Devuelve los grupos ordenados por lo que hay en juego (saldo pendiente y,
 * a igualdad, facturado): el cliente que debe plata es el que importa vincular
 * primero, porque su deuda está partida en dos en la cartera.
 */
export function agruparSinVincular(documentos = [], empresas = []) {
  const porNombre = empresasYaUsadas(documentos);
  const porId = new Map((empresas || []).filter((e) => e?.id).map((e) => [e.id, e]));
  const grupos = new Map();

  for (const doc of documentos || []) {
    if (!doc || doc.empresaId) continue;
    const clave = claveGrupo(doc);
    if (!clave) continue;
    if (!grupos.has(clave)) {
      grupos.set(clave, { clave, nombres: [], nits: [], documentos: [] });
    }
    const grupo = grupos.get(clave);
    grupo.nombres.push(doc.clienteNombre);
    if (doc.clienteNit) grupo.nits.push(doc.clienteNit);
    grupo.documentos.push(doc);
  }

  const salida = [...grupos.values()].map((grupo) => {
    const nombre = nombreRepresentativo(grupo.nombres);
    const nit = grupo.nits[0] || "";
    const datos = { nombre, nit };

    const { empresa, motivo } = resolverEmpresa(datos, empresas);
    let sugerida = empresa;
    let razon = motivo;

    if (!sugerida) {
      const heredada = porNombre.get(claveNombre(nombre));
      if (heredada && porId.has(heredada)) {
        sugerida = porId.get(heredada);
        razon = POR_HERMANA;
      }
    }

    return {
      ...grupo,
      nombre,
      nit,
      // Variantes de escritura que cayeron en el mismo grupo. Se muestran para
      // que se vea por qué están juntas.
      variantes: [...new Set(grupo.nombres.map((n) => String(n || "").trim()).filter(Boolean))],
      cantidad: grupo.documentos.length,
      neto: redondear(grupo.documentos.reduce((acc, d) => acc + netoDe(d), 0)),
      saldo: redondear(grupo.documentos.reduce((acc, d) => acc + saldoDe(d), 0)),
      sugerida: sugerida || null,
      motivo: sugerida ? razon : null,
      posibles: sugerida ? [] : buscarPosiblesDuplicados(datos, empresas),
    };
  });

  return salida.sort(
    (a, b) => Math.abs(b.saldo) - Math.abs(a.saldo) || b.neto - a.neto || a.nombre.localeCompare(b.nombre)
  );
}

/** Cuántos documentos están vinculados y cuántos no. Alimenta el contador de la pestaña. */
export function resumenVinculacion(documentos = []) {
  const lista = documentos || [];
  const sinVincular = lista.filter((d) => d && !d.empresaId);
  const clientes = new Set(sinVincular.map(claveGrupo).filter(Boolean));
  return {
    total: lista.length,
    vinculados: lista.length - sinVincular.length,
    sinVincular: sinVincular.length,
    clientes: clientes.size,
    saldo: redondear(sinVincular.reduce((acc, d) => acc + saldoDe(d), 0)),
  };
}

/** Datos con los que se daría de alta la empresa de un grupo que no existe todavía. */
export function empresaDesdeGrupo(grupo = {}) {
  return {
    nombre: String(grupo.nombre || "").trim(),
    nit: String(grupo.nit || "").trim(),
  };
}
