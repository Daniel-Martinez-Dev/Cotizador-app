import { db, waitForAuth } from "../firebase";
import { doc, updateDoc, serverTimestamp, arrayUnion, Timestamp } from "firebase/firestore";
import { listarFichasDivision, obtenerFichaDivision, actualizarFichaDivision } from "./firebaseDivision";
import { listarFichasSellos, obtenerFichaSello, actualizarFichaSello } from "./firebaseSellos";
import {
  listarFichasAbrigoRetractil,
  obtenerFichaAbrigoRetractil,
  actualizarFichaAbrigoRetractil,
} from "./firebaseAbrigoRetractil";
import {
  listarFichasPuertaRapida,
  obtenerFichaPuertaRapida,
  actualizarFichaPuertaRapida,
} from "./firebasePuertaRapida";
import {
  listarFichasPuertaSeccional,
  obtenerFichaPuertaSeccional,
  actualizarFichaPuertaSeccional,
} from "./firebasePuertaSeccional";
import {
  listarFichasGenerales,
  obtenerFichaGeneral,
  actualizarFichaGeneral,
} from "./firebaseGeneral";
import { ESTADOS_FICHA } from "../components/fichas/estadoFicha";
import {
  getEtapaFirma,
  normalizarFotos,
  normalizarPersonasFirma,
  resumenFirma,
} from "./firmasFicha";

// Las líneas de producto comparten forma de documento (ordenProduccion,
// cliente, cantidad, estado, createdAt/updatedAt) pero viven en colecciones y
// módulos separados. Este archivo las trata de forma genérica para el panel
// de empleados y el listado de órdenes (listar todas juntas, agregar notas,
// marcar terminada).
export const FICHA_TIPOS = {
  division: {
    label: "División Térmica",
    col: "division_fichas",
    listar: listarFichasDivision,
    obtener: obtenerFichaDivision,
    actualizar: actualizarFichaDivision,
  },
  sello: {
    label: "Sello de Andén",
    col: "fichas_sellos",
    listar: listarFichasSellos,
    obtener: obtenerFichaSello,
    actualizar: actualizarFichaSello,
  },
  abrigoretractil: {
    label: "Abrigo Retráctil",
    col: "fichas_abrigo_retractil",
    listar: listarFichasAbrigoRetractil,
    obtener: obtenerFichaAbrigoRetractil,
    actualizar: actualizarFichaAbrigoRetractil,
  },
  puertarapida: {
    label: "Puertas Rápidas",
    col: "fichas_puertas_rapidas",
    listar: listarFichasPuertaRapida,
    obtener: obtenerFichaPuertaRapida,
    actualizar: actualizarFichaPuertaRapida,
  },
  puertaseccional: {
    label: "Puertas Seccionales",
    col: "fichas_puertas_seccionales",
    listar: listarFichasPuertaSeccional,
    obtener: obtenerFichaPuertaSeccional,
    actualizar: actualizarFichaPuertaSeccional,
  },
  // Órdenes sin ficha de fabricación (repuestos, semáforos, lámparas, topes,
  // rampas…). Igual pasan a producción, así que comparten consecutivo, estados
  // y panel de planta con las demás — ver firebaseGeneral.js.
  general: {
    label: "Ficha Básica",
    col: "fichas_generales",
    listar: listarFichasGenerales,
    obtener: obtenerFichaGeneral,
    actualizar: actualizarFichaGeneral,
  },
};

export function getFichaTipoConfig(tipo) {
  const cfg = FICHA_TIPOS[tipo];
  if (!cfg) throw new Error(`Tipo de ficha desconocido: ${tipo}`);
  return cfg;
}

// Junta todas las colecciones en una sola lista, ordenada por número de orden de
// producción (consecutivo global, ver firebaseConsecutivos.js) descendente.
export async function listarTodasFichasProduccion({ max = 200 } = {}) {
  const entries = Object.entries(FICHA_TIPOS);
  const listas = await Promise.all(
    entries.map(([tipo, cfg]) =>
      cfg.listar({ max }).then((fichas) => fichas.map((f) => ({ ...f, tipo, tipoLabel: cfg.label })))
    )
  );
  return listas.flat().sort((a, b) => Number(b.ordenProduccion || 0) - Number(a.ordenProduccion || 0));
}

export async function obtenerFichaProduccion(tipo, id) {
  const cfg = getFichaTipoConfig(tipo);
  const ficha = await cfg.obtener(id);
  return ficha ? { ...ficha, tipo, tipoLabel: cfg.label } : null;
}

// Una entrada del historial `notas`. Los cambios de estado también se guardan
// aquí (con tipo "estado") para que la ficha tenga una sola línea de tiempo:
// quién la movió, cuándo y por qué, junto a las notas sueltas.
// serverTimestamp() no es válido dentro de un elemento de arreglo, por eso la
// fecha de cada nota se genera en el cliente con Timestamp.now().
function construirNota({ texto, autorNombre, autorUid, estadoAnterior, estadoNuevo }) {
  const nota = {
    texto: (texto || "").toString().trim(),
    autorNombre: autorNombre || "",
    autorUid: autorUid || "",
    fecha: Timestamp.now(),
    tipo: estadoNuevo ? "estado" : "nota",
  };
  if (estadoNuevo) {
    nota.estadoNuevo = estadoNuevo;
    nota.estadoAnterior = estadoAnterior || "borrador";
  }
  return nota;
}

// Agrega una nota (empleado o cualquier staff con acceso). Devuelve la entrada
// escrita para que la UI la pinte sin recargar la ficha entera.
export async function agregarNotaFicha(tipo, id, { texto, autorNombre, autorUid }) {
  const cfg = getFichaTipoConfig(tipo);
  const nota = construirNota({ texto, autorNombre, autorUid });
  if (!nota.texto) throw new Error("La nota no puede estar vacía");
  await waitForAuth();
  await updateDoc(doc(db, cfg.col, id), {
    notas: arrayUnion(nota),
    updatedAt: serverTimestamp(),
  });
  return nota;
}

// Cambia el estado y deja constancia en el historial en una sola escritura.
// Los tres campos que toca (estado, notas, updatedAt) son los que permiten las
// reglas de Firestore, así que sirve igual para producción/admin y para el
// panel de planta.
export async function cambiarEstadoFicha(tipo, id, { estado, estadoAnterior, nota, autorNombre, autorUid }) {
  const cfg = getFichaTipoConfig(tipo);
  if (!ESTADOS_FICHA.includes(estado)) throw new Error(`Estado desconocido: ${estado}`);
  const entrada = construirNota({
    texto: nota,
    autorNombre,
    autorUid,
    estadoAnterior,
    estadoNuevo: estado,
  });
  await waitForAuth();
  await updateDoc(doc(db, cfg.col, id), {
    estado,
    notas: arrayUnion(entrada),
    updatedAt: serverTimestamp(),
  });
  return entrada;
}

// Un bloque de firma tal como se guarda en `firmas.<etapa>`: quién firmó, la
// fecha que sale impresa en la ficha y el registro fotográfico de respaldo.
// Ver firmasFicha.js para el modelo y para cómo se leen las fichas viejas.
function construirBloqueFirma(etapa, { personas, fecha, fotos, autorNombre, autorUid }) {
  const cfg = getEtapaFirma(etapa);
  const gente = normalizarPersonasFirma(personas);
  if (gente.length === 0) throw new Error(`Falta quién firma "${cfg.corto}"`);
  const fechaLimpia = (fecha || "").toString().trim();
  if (!fechaLimpia) throw new Error(`Indica la fecha de "${cfg.corto}"`);
  return {
    personas: gente,
    fecha: fechaLimpia,
    fotos: normalizarFotos(fotos),
    registradoPor: { uid: autorUid || "", nombre: autorNombre || "" },
    registradoEn: Timestamp.now(),
  };
}

// Titular de la firma para el historial, para que la línea de tiempo cuente
// quién cerró la etapa sin tener que abrir el detalle.
function resumenDeFirma(etapa, bloque, nota) {
  return [
    resumenFirma(etapa, bloque.personas),
    (nota || "").toString().trim(),
    bloque.fotos.length > 0 && `${bloque.fotos.length} foto${bloque.fotos.length === 1 ? "" : "s"}`,
  ].filter(Boolean).join(" · ");
}

// Pasa la ficha a "terminada" firmando el alistado y empaque. Firmar no es un
// trámite aparte del cambio de estado: es lo que lo autoriza, y por eso ambas
// cosas viajan en la misma escritura. Las reglas de Firestore exigen lo mismo
// del lado del servidor para el rol "empleado" (ver fichaUpdateEmpleadoOk en
// firestore.rules), que además no puede volver a tocar la firma después.
// `marcarTerminada` en false es el caso de corrección: producción/admin
// arreglando la firma de una ficha que ya se entregó, que no puede devolverse
// a "terminada" por el camino.
export async function registrarFirmaAlistado(tipo, id, {
  personas, fecha, fotos, nota, estadoAnterior, marcarTerminada = true, autorNombre, autorUid,
}) {
  const cfg = getFichaTipoConfig(tipo);
  const bloque = construirBloqueFirma("alistado", { personas, fecha, fotos, autorNombre, autorUid });
  const entrada = construirNota({
    texto: resumenDeFirma("alistado", bloque, nota),
    autorNombre,
    autorUid,
    estadoAnterior: estadoAnterior || "en_produccion",
    estadoNuevo: marcarTerminada ? "terminado" : undefined,
  });

  await waitForAuth();
  // Ruta con punto y no el mapa entero: escribir `firmas` completo borraría la
  // firma de la otra etapa cuando ya existe.
  await updateDoc(doc(db, cfg.col, id), {
    ...(marcarTerminada ? { estado: "terminado" } : null),
    "firmas.alistado": bloque,
    notas: arrayUnion(entrada),
    updatedAt: serverTimestamp(),
  });
  return { firma: bloque, nota: entrada };
}

// Marca la ficha como entregada. Es el cierre de la ficha y por eso exige dos
// cosas: la firma de "Revisado y aprobado" —que es la que sale impresa en el
// pie de la ficha— y la fecha de entrega. Placas, quién recibió y el registro
// fotográfico son opcionales (las fotos ya subidas a Storage, ver
// fotosFicha.js). Todo queda en `entrega` + `firmas.revisado` y resumido en el
// historial, en una sola escritura.
export async function registrarEntregaFicha(tipo, id, {
  fecha, placas, recibidoPor, fotos, revisadoPor, nota, estadoAnterior, autorNombre, autorUid,
}) {
  const cfg = getFichaTipoConfig(tipo);
  const fechaLimpia = (fecha || "").toString().trim();
  if (!fechaLimpia) throw new Error("La fecha de entrega es obligatoria");

  // Las fotos son del despacho entero, no de la revisión aparte: viven en
  // `entrega.fotos` y el bloque de firma solo guarda quién aprobó y cuándo.
  const revision = construirBloqueFirma("revisado", {
    personas: revisadoPor,
    fecha: fechaLimpia,
    fotos: [],
    autorNombre,
    autorUid,
  });

  const entrega = {
    fecha: fechaLimpia,
    placas: (placas || "").toString().trim().toUpperCase(),
    recibidoPor: (recibidoPor || "").toString().trim(),
    fotos: (Array.isArray(fotos) ? fotos : [])
      .filter((f) => f?.url && f?.path)
      .map((f) => ({ url: f.url, path: f.path, nombre: f.nombre || "" })),
    registradoPor: { uid: autorUid || "", nombre: autorNombre || "" },
    registradoEn: Timestamp.now(),
  };

  // El titular del historial se arma con lo diligenciado, para que la línea de
  // tiempo cuente la entrega sin tener que abrir el detalle.
  const resumen = [
    resumenFirma("revisado", revision.personas),
    (nota || "").toString().trim(),
    entrega.placas && `Placas: ${entrega.placas}`,
    entrega.recibidoPor && `Recibió: ${entrega.recibidoPor}`,
    entrega.fotos.length > 0 && `${entrega.fotos.length} foto${entrega.fotos.length === 1 ? "" : "s"}`,
  ].filter(Boolean).join(" · ");

  const entrada = construirNota({
    texto: resumen,
    autorNombre,
    autorUid,
    estadoAnterior: estadoAnterior || "terminado",
    estadoNuevo: "entregado",
  });

  await waitForAuth();
  await updateDoc(doc(db, cfg.col, id), {
    estado: "entregado",
    entrega,
    "firmas.revisado": revision,
    notas: arrayUnion(entrada),
    updatedAt: serverTimestamp(),
  });
  return { entrega, firma: revision, nota: entrada };
}
