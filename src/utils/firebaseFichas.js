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

// Las 4 líneas de producto comparten forma de documento (ordenProduccion,
// cliente, cantidad, estado, createdAt/updatedAt) pero viven en colecciones y
// módulos separados. Este archivo las trata de forma genérica para el panel
// de empleados (listar todas juntas, agregar notas, marcar terminada).
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

// Agrega una nota (empleado o cualquier staff con acceso). Usa arrayUnion —
// serverTimestamp() no es válido dentro de un elemento de arreglo, por eso la
// fecha de cada nota se genera en el cliente con Timestamp.now().
export async function agregarNotaFicha(tipo, id, { texto, autorNombre, autorUid }) {
  const cfg = getFichaTipoConfig(tipo);
  const textoLimpio = (texto || "").toString().trim();
  if (!textoLimpio) throw new Error("La nota no puede estar vacía");
  await waitForAuth();
  await updateDoc(doc(db, cfg.col, id), {
    notas: arrayUnion({
      texto: textoLimpio,
      autorNombre: autorNombre || "",
      autorUid: autorUid || "",
      fecha: Timestamp.now(),
    }),
    updatedAt: serverTimestamp(),
  });
}

// Marca la ficha como terminada, exigiendo fabricante(s) + verificador. Las
// reglas de Firestore validan lo mismo del lado del servidor para el rol
// "empleado" (ver fichaUpdateEmpleadoOk en firestore.rules).
export async function marcarFichaTerminada(tipo, id, { fabricantes, verificador }) {
  const cfg = getFichaTipoConfig(tipo);
  const fabricantesLimpios = (Array.isArray(fabricantes) ? fabricantes : [])
    .filter((f) => f?.uid && f?.nombre)
    .map((f) => ({ uid: f.uid, nombre: f.nombre }));
  if (fabricantesLimpios.length === 0) throw new Error("Selecciona quién fabricó la ficha");
  if (!verificador?.uid || !verificador?.nombre) throw new Error("Selecciona quién verificó la ficha");

  await waitForAuth();
  await updateDoc(doc(db, cfg.col, id), {
    estado: "terminado",
    firmas: {
      fabricantes: fabricantesLimpios,
      verificador: { uid: verificador.uid, nombre: verificador.nombre },
      fecha: serverTimestamp(),
    },
    updatedAt: serverTimestamp(),
  });
}
