// Pruebas de las reglas que protegen `consecutivos`.
//
// De esta colección salen los números que acaban impresos y en manos de otra
// gente: el de cotización (en el PDF que se le manda al cliente), el de orden de
// producción (en la ficha que baja a planta) y el SKU/código de barras de cada
// material (en la etiqueta pegada al rollo).
//
// La propiedad que se defiende aquí no es "quién puede escribir" sino "el
// contador solo sube". Un rol no basta: el almacenista que reinicia el contador
// de materiales tiene permiso legítimo para tocarlo, y aun así el resultado
// sería reimprimir códigos que ya están pegados en el almacén.
//
// Se ejecutan contra el emulador:  npm run test:rules

import { readFileSync } from "node:fs";
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
} from "@firebase/rules-unit-testing";
import { deleteDoc, doc, getDoc, setDoc, updateDoc } from "firebase/firestore";
import { afterAll, beforeAll, beforeEach, describe, test } from "vitest";

const EMAIL_ADMIN = "gerenciacchainservices@gmail.com";

// Los contadores reales, tal como los nombra firebaseConsecutivos.js.
const COTIZACION = "cotizacion";
const ORDEN_PRODUCCION = "orden_produccion_global";
const MATERIAL = "inventario_material";

let testEnv;

function comoUsuario(uid, email) {
  return testEnv
    .authenticatedContext(uid, {
      email,
      email_verified: true,
      firebase: { sign_in_provider: "password", identities: { email: [email] } },
    })
    .firestore();
}

async function sembrar(fn) {
  await testEnv.withSecurityRulesDisabled(async (ctx) => {
    await fn(ctx.firestore());
  });
}

/** Deja creado un perfil con esos roles y devuelve su Firestore autenticado. */
async function conRoles(uid, roles, status = "active") {
  const email = `${uid}@ejemplo.com`;
  await sembrar(async (db) => {
    await setDoc(doc(db, "usuarios", uid), { email, roles, status });
  });
  return comoUsuario(uid, email);
}

/** Deja un contador en un valor de partida. */
async function contadorEn(docId, numero) {
  await sembrar(async (db) => {
    await setDoc(doc(db, "consecutivos", docId), { numero });
  });
}

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: "cotizadorccs-test",
    firestore: { rules: readFileSync("firestore.rules", "utf8") },
  });
});

afterAll(async () => {
  await testEnv?.cleanup();
});

beforeEach(async () => {
  await testEnv.clearFirestore();
});

// ─── Lo que protege los números ya emitidos ──────────────────────────────────

describe("un contador solo puede subir", () => {
  test("nadie lo reinicia a cero, ni con el rol que le corresponde", async () => {
    await contadorEn(COTIZACION, 412);
    const db = await conRoles("comercial", ["contabilidad"]);
    await assertFails(updateDoc(doc(db, "consecutivos", COTIZACION), { numero: 0 }));
  });

  test("nadie lo hace retroceder a un número ya repartido", async () => {
    await contadorEn(COTIZACION, 412);
    const db = await conRoles("comercial", ["contabilidad"]);
    await assertFails(updateDoc(doc(db, "consecutivos", COTIZACION), { numero: 300 }));
  });

  test("tampoco lo deja quieto: repetir el número sería emitirlo dos veces", async () => {
    await contadorEn(COTIZACION, 412);
    const db = await conRoles("comercial", ["contabilidad"]);
    await assertFails(updateDoc(doc(db, "consecutivos", COTIZACION), { numero: 412 }));
  });

  test("el rol de producción tampoco puede bajarlo", async () => {
    await contadorEn(ORDEN_PRODUCCION, 89);
    const db = await conRoles("jefe-planta", ["produccion"]);
    await assertFails(updateDoc(doc(db, "consecutivos", ORDEN_PRODUCCION), { numero: 10 }));
  });

  // Borrar es reiniciar por la puerta de atrás: el siguiente en pedir se lleva el 1.
  test("nadie con un rol de trabajo puede borrar un contador", async () => {
    await contadorEn(MATERIAL, 240);
    const db = await conRoles("tablet-almacen", ["almacenista"]);
    await assertFails(deleteDoc(doc(db, "consecutivos", MATERIAL)));
  });

  test("el número tiene que ser un entero, no un texto", async () => {
    await contadorEn(COTIZACION, 412);
    const db = await conRoles("comercial", ["contabilidad"]);
    await assertFails(updateDoc(doc(db, "consecutivos", COTIZACION), { numero: "500" }));
  });

  test("un contador no nace en cero ni en negativo", async () => {
    const db = await conRoles("comercial", ["contabilidad"]);
    await assertFails(setDoc(doc(db, "consecutivos", COTIZACION), { numero: 0 }));
    await assertFails(setDoc(doc(db, "consecutivos", COTIZACION), { numero: -5 }));
  });
});

// ─── Cada contador es de quien emite ese documento ───────────────────────────

describe("quién puede numerar qué", () => {
  test("planta no numera órdenes de producción", async () => {
    await contadorEn(ORDEN_PRODUCCION, 89);
    const db = await conRoles("operario", ["empleado"]);
    await assertFails(updateDoc(doc(db, "consecutivos", ORDEN_PRODUCCION), { numero: 90 }));
  });

  test("contabilidad no numera materiales del almacén", async () => {
    await contadorEn(MATERIAL, 240);
    const db = await conRoles("cartera", ["contabilidad"]);
    await assertFails(updateDoc(doc(db, "consecutivos", MATERIAL), { numero: 241 }));
  });

  test("un usuario todavía pendiente de aprobación no numera nada", async () => {
    await contadorEn(COTIZACION, 412);
    const db = await conRoles("recien-llegado", [], "pending");
    await assertFails(updateDoc(doc(db, "consecutivos", COTIZACION), { numero: 413 }));
  });

  // Un contador que nadie ha declarado solo lo toca un admin: así uno nuevo
  // entra a mano y no porque a un cliente se le ocurra inventarse el nombre.
  test("un contador desconocido no lo crea cualquiera", async () => {
    const db = await conRoles("comercial", ["contabilidad"]);
    await assertFails(setDoc(doc(db, "consecutivos", "inventado"), { numero: 1 }));
  });

  test("pero el admin sí puede declarar uno nuevo", async () => {
    const db = comoUsuario("admin", EMAIL_ADMIN);
    await assertSucceeds(setDoc(doc(db, "consecutivos", "remisiones"), { numero: 1 }));
  });
});

// ─── El trabajo de todos los días ────────────────────────────────────────────

describe("el reparto normal de números sigue funcionando", () => {
  test("cualquier staff activo reserva número de cotización", async () => {
    await contadorEn(COTIZACION, 412);
    const db = await conRoles("comercial", ["contabilidad"]);
    await assertSucceeds(updateDoc(doc(db, "consecutivos", COTIZACION), { numero: 413 }));
  });

  test("la primera cotización crea el contador en 1", async () => {
    const db = await conRoles("comercial", ["contabilidad"]);
    await assertSucceeds(setDoc(doc(db, "consecutivos", COTIZACION), { numero: 1 }));
  });

  test("producción avanza la orden de producción", async () => {
    await contadorEn(ORDEN_PRODUCCION, 89);
    const db = await conRoles("jefe-planta", ["produccion"]);
    await assertSucceeds(updateDoc(doc(db, "consecutivos", ORDEN_PRODUCCION), { numero: 90 }));
  });

  // reservarConsecutivosMaterial() aparta un bloque de una vez cuando se etiqueta
  // el inventario entero, así que el salto es de muchos números, no de uno.
  test("el almacenista reserva un bloque entero de códigos de material", async () => {
    await contadorEn(MATERIAL, 240);
    const db = await conRoles("tablet-almacen", ["almacenista"]);
    await assertSucceeds(updateDoc(doc(db, "consecutivos", MATERIAL), { numero: 390 }));
  });

  test("inventario de oficina también numera materiales", async () => {
    await contadorEn(MATERIAL, 240);
    const db = await conRoles("bodega", ["inventario"]);
    await assertSucceeds(updateDoc(doc(db, "consecutivos", MATERIAL), { numero: 241 }));
  });

  // La vista previa enseña el próximo número sin reservarlo, y la transacción
  // del contador global consulta el consecutivo legado de División.
  test("cualquier staff activo puede leer un contador sin tocarlo", async () => {
    await contadorEn(COTIZACION, 412);
    const db = await conRoles("operario", ["empleado"]);
    await assertSucceeds(getDoc(doc(db, "consecutivos", COTIZACION)));
  });

  test("el admin puede corregir un contador hacia arriba", async () => {
    await contadorEn(COTIZACION, 412);
    const db = comoUsuario("admin", EMAIL_ADMIN);
    await assertSucceeds(updateDoc(doc(db, "consecutivos", COTIZACION), { numero: 500 }));
  });
});

// ─── Las colecciones que sobraban ────────────────────────────────────────────

describe("counters y quoteCounters ya no existen para nadie", () => {
  test("no se pueden escribir", async () => {
    const db = await conRoles("comercial", ["contabilidad"]);
    await assertFails(setDoc(doc(db, "counters", "cotizacion"), { numero: 1 }));
    await assertFails(setDoc(doc(db, "quoteCounters", "cotizacion"), { numero: 1 }));
  });

  test("tampoco las lee nadie que no sea admin", async () => {
    await sembrar(async (db) => {
      await setDoc(doc(db, "counters", "cotizacion"), { numero: 7 });
    });
    const db = await conRoles("comercial", ["contabilidad"]);
    await assertFails(getDoc(doc(db, "counters", "cotizacion")));
  });
});

// ─── Hasta dónde llega la protección ─────────────────────────────────────────
//
// El catch-all del final de firestore.rules le concede todo al admin, y en
// Firestore los permisos SUMAN: ninguna regla puede quitar lo que otra concede.
// Así que nada de lo de arriba ata a un admin, y eso es deliberado — lo que hay
// que impedir es que quien tiene permiso legítimo para pedir números (el
// almacenista, el comercial) pueda además reiniciar la cuenta.
//
// Queda escrito aquí para que se vea cuál es el alcance real y para que, si
// algún día se decide que el admin tampoco deba poder, salte esta prueba.
describe("el admin sigue por encima de todo, por diseño", () => {
  test("el catch-all le deja bajar y borrar un contador", async () => {
    await contadorEn(ORDEN_PRODUCCION, 89);
    const db = comoUsuario("admin", EMAIL_ADMIN);
    await assertSucceeds(updateDoc(doc(db, "consecutivos", ORDEN_PRODUCCION), { numero: 10 }));
    await assertSucceeds(deleteDoc(doc(db, "consecutivos", ORDEN_PRODUCCION)));
  });
});
