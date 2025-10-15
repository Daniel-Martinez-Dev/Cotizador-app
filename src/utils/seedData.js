// Script de seed manual. Ejecutar temporalmente desde alguna parte de la app (botón oculto) y luego eliminar.
// Nuevo seed: lee CSV y crea empresas o contactos-sucursal.
import { empresasCSVRaw } from '../data/empresasCSV';
import { crearEmpresa, obtenerEmpresaPorNIT, crearContacto, listarContactos, listarEmpresas, actualizarEmpresa, actualizarContacto, eliminarEmpresa, eliminarContacto } from './firebaseCompanies';

function detectarDelimitador(linea) {
  // Decide entre ; y , (elige el que más columnas genere)
  const comas = linea.split(',').length;
  const puntosycoma = linea.split(';').length;
  return puntosycoma > comas ? ';' : ',';
}

function limpiarTelefono(t) {
  return (t || '').replace(/[^0-9+]/g, '').trim();
}

function parseCSVEmpresas(raw) {
  if (!raw) return [];
  const lines = raw.replace(/\r\n?/g, '\n').split('\n').filter(l => l.trim() && !l.trim().startsWith('//'));
  if (!lines.length) return [];
  // Detect header
  let startIdx = 0;
  const header = lines[0].toLowerCase();
  if (header.includes('nit') && header.includes('nombre')) {
    startIdx = 1;
  }
  const out = [];
  for (let i = startIdx; i < lines.length; i++) {
    const line = lines[i];
    const delim = detectarDelimitador(line);
  const parts = line.split(delim).map(p => p.trim());
    if (parts.length < 2) continue; // mínimo NIT + NOMBRE
    // Asegurar longitud 5
    while (parts.length < 5) parts.push('');
  const stripQuotes = v => v?.replace(/^"+|"+$/g,'').replace(/^'+|'+$/g,'').trim();
  const [nitRaw, nombreRaw, dirRaw, ciudadRaw, telRaw] = parts;
  const nit = stripQuotes(nitRaw);
  const nombre = stripQuotes(nombreRaw);
  const direccion = stripQuotes(dirRaw);
  const ciudad = stripQuotes(ciudadRaw);
  const telefono = stripQuotes(telRaw);
    if (!nit || !nombre) continue;
    out.push({ nit, nombre, direccion, ciudad, telefono: limpiarTelefono(telefono) });
  }
  return out;
}

/**
 * Seed principal:
 * - No borra empresas existentes.
 * - Si el NIT no existe: crea empresa con su dirección (campo direccion) y ciudad.
 * - Si el NIT ya existe (en BD o creado en este mismo run): se crea un contacto tipo sucursal.
 *   nombre contacto: "Sucursal: <direccion> (<ciudad>)" (si hay datos) evitando duplicados por nombre.
 * - Evita crear dos veces la misma sucursal dentro del mismo CSV.
 */
export async function seedEmpresasYContactos({ onProgress } = {}) {
  const registros = parseCSVEmpresas(empresasCSVRaw);
  let creadasEmp = 0, creadosContactos = 0, lineas = registros.length, sucursalesDuplicadas = 0;
  const cacheEmpresas = new Map(); // nit -> { id, contactos: Set(nombreContacto) }

  for (const reg of registros) {
    try {
      let infoCache = cacheEmpresas.get(reg.nit);
      let empresa;
      if (!infoCache) {
        // Buscar en BD si no está en cache
        empresa = await obtenerEmpresaPorNIT(reg.nit);
        if (!empresa) {
          const id = await crearEmpresa({ nit: reg.nit, nombre: reg.nombre, ciudad: reg.ciudad, direccion: reg.direccion });
          empresa = { id, nit: reg.nit, nombre: reg.nombre };
          creadasEmp++;
          onProgress?.(`Empresa creada: ${reg.nombre}`);
        } else {
          onProgress?.(`Existe empresa: ${empresa.nombre}`);
        }
        // Cargar contactos existentes para evitar duplicados por nombre
        const existentes = await listarContactos(empresa.id);
        infoCache = { empresa, contactos: new Set(existentes.map(c => c.nombre)) };
        cacheEmpresas.set(reg.nit, infoCache);
      } else {
        empresa = infoCache.empresa;
      }

      // Determinar si esta línea representa una sucursal (duplicado de NIT) o la empresa recién creada.
      if (infoCache.contactos.size === 0 && creadasEmp > 0 && empresa.nit === reg.nit && empresa.nombre === reg.nombre && reg.direccion) {
        // Primera línea después de crear empresa ya fue usada para crear la empresa. No crear contacto para ella.
        continue;
      }

      // Si la línea corresponde a misma empresa (mismo NIT) y tiene direccion (o ciudad) => sucursal
      if (reg.direccion || reg.ciudad || reg.telefono) {
        const nombreContacto = `Sucursal: ${reg.direccion || 'Sin dirección'}${reg.ciudad ? ' (' + reg.ciudad + ')' : ''}`;
        if (!infoCache.contactos.has(nombreContacto)) {
          await crearContacto(empresa.id, { nombre: nombreContacto, telefono: reg.telefono || '' });
          infoCache.contactos.add(nombreContacto);
          creadosContactos++;
          onProgress?.(`  + Sucursal agregada: ${nombreContacto}`);
        } else {
          sucursalesDuplicadas++;
          onProgress?.(`  = Sucursal duplicada saltada: ${nombreContacto}`);
        }
      }
    } catch (e) {
      console.error('Error procesando línea CSV', reg, e);
      onProgress?.(`Error NIT ${reg.nit}`);
    }
  }

  const totalEmp = (await listarEmpresas()).length;
  return { lineasProcesadas: lineas, creadasEmp, creadosContactos, sucursalesDuplicadas, totalEmp };
}

/**
 * Deduplicación de empresas por NIT.
 * Estrategia:
 *  - Normalizar NIT removiendo espacios y puntos y comillas.
 *  - Agrupar empresas por NIT normalizado.
 *  - Mantener la empresa "principal" (la primera del array, que viene ordenado por nombre) y eliminar las demás.
 *  - Fusionar contactos: se traen todos los contactos de las duplicadas; se insertan en la principal los que no existan
 *    usando llave compuesta (nombre.trim().toLowerCase(), email.toLowerCase()).
 *  - Se preservan campos vacíos de principal: si principal no tiene direccion/ciudad y alguna duplicada sí, se actualiza.
 */
export async function dedupeEmpresasPorNIT({ onProgress } = {}) {
  const empresas = await listarEmpresas();
  const grupos = new Map(); // nitNorm -> [emp]
  // Normaliza quitando comillas, espacios, puntos, comas, guiones, slash
  const norm = nit => (nit||'').toString().toLowerCase().replace(/"|'|\s|\.|,|-|\//g,'').trim();
  for (const e of empresas) {
    const k = norm(e.nit);
    if(!k) continue; // si no hay nit no se deduplica
    if(!grupos.has(k)) grupos.set(k, []);
    grupos.get(k).push(e);
  }
  let eliminadas = 0, gruposProcesados = 0, contactosMover = 0, contactosCreados = 0, camposActualizados = 0;
  for (const [k, lista] of grupos.entries()) {
    if (lista.length < 2) continue; // no hay duplicados
    gruposProcesados++;
    // Elegir principal: preferir la que tenga más campos (direccion / ciudad) y menor createdAt si existiera.
    let principal = lista[0];
    for (const e of lista) {
      if ((e.direccion && !principal.direccion) || (e.ciudad && !principal.ciudad)) principal = e;
    }
    const duplicadas = lista.filter(e=> e.id !== principal.id);
    onProgress?.(`Grupo NIT ${principal.nit} duplicados: ${duplicadas.length}`);
    // Cargar contactos de principal y crear key set
    const contactosPrincipal = await listarContactos(principal.id);
    const keyContacto = c => `${(c.nombre||'').trim().toLowerCase()}|${(c.email||'').trim().toLowerCase()}`;
    const setKeys = new Set(contactosPrincipal.map(keyContacto));
    // Transferir contactos de duplicadas
    for (const dup of duplicadas) {
      const contactosDup = await listarContactos(dup.id);
      for (const c of contactosDup) {
        const key = keyContacto(c);
        if(!setKeys.has(key)) {
          await crearContacto(principal.id, { nombre: c.nombre, email: c.email, telefono: c.telefono||'', cargo: c.cargo||'' });
          setKeys.add(key); contactosMover++; contactosCreados++;
          onProgress?.(`  + Movido contacto ${c.nombre}`);
        }
      }
    }
    // Completar datos faltantes en principal
    const patch = {};
    if(!principal.direccion) {
      const conDir = duplicadas.find(d=> d.direccion);
      if(conDir) patch.direccion = conDir.direccion;
    }
    if(!principal.ciudad) {
      const conCiudad = duplicadas.find(d=> d.ciudad);
      if(conCiudad) patch.ciudad = conCiudad.ciudad;
    }
    if(Object.keys(patch).length) {
      await actualizarEmpresa(principal.id, patch); camposActualizados++;
    }
    // Eliminar duplicadas (borrando primero sus contactos)
    for (const dup of duplicadas) {
      try {
        const contactosDup = await listarContactos(dup.id);
        for (const c of contactosDup) {
          try { await eliminarContacto(dup.id, c.id); } catch {}
        }
        await eliminarEmpresa(dup.id);
        eliminadas++;
        onProgress?.(`  - Eliminada duplicada ${dup.nombre}`);
      } catch(e) { onProgress?.(`  ! Error eliminando ${dup.nombre}`); }
    }
  }
  return { gruposProcesados, eliminadas, contactosMovidos: contactosMover, contactosCreados, camposActualizados };
}

/**
 * Migración para limpiar comillas sobrantes en nombres/direcciones ya guardadas.
 * Uso: llamar manualmente desde la UI (botón temporal) y luego quitar.
 */
export async function migrarQuitarComillas({ onProgress } = {}) {
  const empresas = await listarEmpresas();
  const regex = /^"+|"+$/g;
  let actualizadasEmp = 0, actualizadosCont = 0;
  for (const emp of empresas) {
    const limpioNombre = emp.nombre?.replace(regex,'').replace(/^'+|'+$/g,'').trim();
    const limpioCiudad = emp.ciudad?.replace(regex,'').replace(/^'+|'+$/g,'').trim();
    let changed = false;
    const patch = {};
    if (limpioNombre && limpioNombre !== emp.nombre) { patch.nombre = limpioNombre; changed = true; }
    if (limpioCiudad && limpioCiudad !== emp.ciudad) { patch.ciudad = limpioCiudad; changed = true; }
    if (changed) {
      await actualizarEmpresa(emp.id, patch);
      actualizadasEmp++;
      onProgress?.(`Empresa limpiada: ${emp.nombre} -> ${patch.nombre}`);
    }
    const contactos = await listarContactos(emp.id);
    for (const cont of contactos) {
      const limpioCont = cont.nombre?.replace(regex,'').replace(/^'+|'+$/g,'').trim();
      if (limpioCont && limpioCont !== cont.nombre) {
        await actualizarContacto(emp.id, cont.id, { nombre: limpioCont });
        actualizadosCont++;
        onProgress?.(`  Contacto limpiado: ${cont.nombre} -> ${limpioCont}`);
      }
    }
  }
  return { actualizadasEmp, actualizadosCont };
}

