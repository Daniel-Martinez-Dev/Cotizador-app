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
  listarFichasGenerales,
  obtenerFichaGeneral,
  actualizarFichaGeneral,
} from "./firebaseGeneral";
import { ESTADOS_FICHA } from "../components/fichas/estadoFicha";

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

// Junta las 4 colecciones en una sola lista, ordenada por número de orden de
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

// Marca la ficha como terminada, exigiendo fabricante(s) + verificador. Las
// reglas de Firestore validan lo mismo del lado del servidor para el rol
// "empleado" (ver fichaUpdateEmpleadoOk en firestore.rules).
export async function marcarFichaTerminada(tipo, id, {
  fabricantes, verificador, estadoAnterior, autorNombre, autorUid,
}) {
  const cfg = getFichaTipoConfig(tipo);
  const fabricantesLimpios = (Array.isArray(fabricantes) ? fabricantes : [])
    .filter((f) => f?.uid && f?.nombre)
    .map((f) => ({ uid: f.uid, nombre: f.nombre }));
  if (fabricantesLimpios.length === 0) throw new Error("Selecciona quién fabricó la ficha");
  if (!verificador?.uid || !verificador?.nombre) throw new Error("Selecciona quién verificó la ficha");

  // Va también al historial para que el cierre desde planta aparezca en la
  // misma línea de tiempo que los cambios de estado hechos desde el escritorio.
  const entrada = construirNota({
    texto: `Fabricó: ${fabricantesLimpios.map((f) => f.nombre).join(", ")} · Verificó: ${verificador.nombre}`,
    autorNombre,
    autorUid,
    estadoAnterior: estadoAnterior || "en_produccion",
    estadoNuevo: "terminado",
  });

  await waitForAuth();
  await updateDoc(doc(db, cfg.col, id), {
    estado: "terminado",
    firmas: {
      fabricantes: fabricantesLimpios,
      verificador: { uid: verificador.uid, nombre: verificador.nombre },
      fecha: serverTimestamp(),
    },
    notas: arrayUnion(entrada),
    updatedAt: serverTimestamp(),
  });
}

// Marca la ficha como entregada. A diferencia de los demás estados este exige
// datos: la fecha de entrega, y opcionalmente placas del vehículo, quién
// recibió y el registro fotográfico (las fotos ya subidas a Storage, ver
// fotosEntrega.js). Todo queda en `entrega` y resumido en el historial.
export async function registrarEntregaFicha(tipo, id, {
  fecha, placas, recibidoPor, fotos, nota, estadoAnterior, autorNombre, autorUid,
}) {
  const cfg = getFichaTipoConfig(tipo);
  const fechaLimpia = (fecha || "").toString().trim();
  if (!fechaLimpia) throw new Error("La fecha de entrega es obligatoria");

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
    notas: arrayUnion(entrada),
    updatedAt: serverTimestamp(),
  });
  return { entrega, nota: entrada };
}
