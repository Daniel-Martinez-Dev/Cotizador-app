// Pruebas de las reglas de Firestore que protegen `usuarios` y `usuarios_email`.
//
// Estos dos documentos son los que reparten permisos en toda la aplicación:
// `isAdmin()` y `hasRole()` leen sus roles de `usuarios/{uid}`, y con qué roles
// entra alguien la primera vez lo decide `usuarios_email`. Si el dueño de un
// perfil pudiera escribirse sus propios roles, cualquiera podría registrarse
// desde el login público y quedarse con el sistema entero; de ahí que la mitad
// de este archivo sean intentos de escalada que TIENEN que fallar.
//
// Se ejecutan contra el emulador:  npm run test:rules

import { readFileSync } from "node:fs";
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
} from "@firebase/rules-unit-testing";
import { doc, getDoc, getDocs, collection, setDoc, updateDoc } from "firebase/firestore";
import { afterAll, beforeAll, beforeEach, describe, expect, test } from "vitest";

// El correo que las reglas reconocen como administrador sin mirar la base de
// datos (isAdminEmail), para que el dueño del sistema nunca se quede fuera.
const EMAIL_ADMIN = "gerenciacchainservices@gmail.com";

let testEnv;

/** Contexto de alguien que inició sesión con correo y contraseña. */
function comoUsuario(uid, email) {
  return testEnv
    .authenticatedContext(uid, {
      email,
      email_verified: true,
      firebase: { sign_in_provider: "password", identities: { email: [email] } },
    })
    .firestore();
}

/** Escribe datos de partida saltándose las reglas. */
async function sembrar(fn) {
  await testEnv.withSecurityRulesDisabled(async (ctx) => {
    await fn(ctx.firestore());
  });
}

/** La clave con la que `usuarios_email` indexa un correo (ver firestoreIds.js). */
function claveEmail(email) {
  return encodeURIComponent(email.trim().toLowerCase());
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

// ─── La escalada de privilegios ──────────────────────────────────────────────
//
// El escenario real: el registro está abierto, así que quien monta el ataque no
// necesita ser empleado. Se registra con cualquier correo y desde ahí intenta
// llegar a admin.

describe("un usuario registrado no puede darse permisos a sí mismo", () => {
  const UID = "atacante";
  const EMAIL = "cualquiera@ejemplo.com";

  beforeEach(async () => {
    await sembrar(async (db) => {
      await setDoc(doc(db, "usuarios", UID), {
        email: EMAIL,
        displayName: "Cualquiera",
        roles: [],
        status: "pending",
        source: "self-registered",
      });
    });
  });

  test("no puede asignarse el rol admin en su propio perfil", async () => {
    const db = comoUsuario(UID, EMAIL);
    await assertFails(updateDoc(doc(db, "usuarios", UID), { roles: ["admin"] }));
  });

  test("no puede asignarse ningún otro rol", async () => {
    const db = comoUsuario(UID, EMAIL);
    await assertFails(updateDoc(doc(db, "usuarios", UID), { roles: ["contabilidad"] }));
  });

  test("no puede activarse solo para saltarse la aprobación", async () => {
    const db = comoUsuario(UID, EMAIL);
    await assertFails(updateDoc(doc(db, "usuarios", UID), { status: "active" }));
  });

  test("no puede colar roles junto a un cambio legítimo de perfil", async () => {
    const db = comoUsuario(UID, EMAIL);
    await assertFails(
      updateDoc(doc(db, "usuarios", UID), { displayName: "Nuevo nombre", roles: ["admin"] })
    );
  });

  test("no puede cambiarse el correo, que es de lo que cuelga el pre-registro", async () => {
    const db = comoUsuario(UID, EMAIL);
    await assertFails(updateDoc(doc(db, "usuarios", UID), { email: EMAIL_ADMIN }));
  });

  test("no puede crear su perfil ya nacido admin", async () => {
    const db = comoUsuario("nuevo", "nuevo@ejemplo.com");
    await assertFails(
      setDoc(doc(db, "usuarios", "nuevo"), {
        email: "nuevo@ejemplo.com",
        roles: ["admin"],
        status: "active",
      })
    );
  });

  test("no puede tocar el perfil de otra persona", async () => {
    await sembrar(async (db) => {
      await setDoc(doc(db, "usuarios", "otro"), { email: "otro@ejemplo.com", roles: [], status: "active" });
    });
    const db = comoUsuario(UID, EMAIL);
    await assertFails(updateDoc(doc(db, "usuarios", "otro"), { roles: ["admin"] }));
  });
});

// La segunda puerta a la misma habitación: si `usuarios_email` fuera escribible,
// bastaría con pre-registrarse a uno mismo como admin y volver a entrar.
describe("un usuario registrado no puede escribir el pre-registro por email", () => {
  const UID = "atacante";
  const EMAIL = "cualquiera@ejemplo.com";

  beforeEach(async () => {
    await sembrar(async (db) => {
      await setDoc(doc(db, "usuarios", UID), { email: EMAIL, roles: [], status: "pending" });
    });
  });

  test("no puede pre-registrarse a sí mismo como admin", async () => {
    const db = comoUsuario(UID, EMAIL);
    await assertFails(
      setDoc(doc(db, "usuarios_email", claveEmail(EMAIL)), {
        email: EMAIL,
        roles: ["admin"],
        status: "active",
      })
    );
  });

  test("no puede pre-registrar a nadie más", async () => {
    const db = comoUsuario(UID, EMAIL);
    await assertFails(
      setDoc(doc(db, "usuarios_email", claveEmail("victima@ejemplo.com")), {
        email: "victima@ejemplo.com",
        roles: ["admin"],
        status: "active",
      })
    );
  });

  test("no puede listar el directorio de correos y sus roles", async () => {
    const db = comoUsuario(UID, EMAIL);
    await assertFails(getDocs(collection(db, "usuarios_email")));
  });
});

// ─── El pre-registro, que sí debe seguir funcionando ─────────────────────────

describe("pre-registro por email", () => {
  const UID = "empleado-nuevo";
  const EMAIL = "empleado@ejemplo.com";

  async function preRegistrar(email, roles, status = "active") {
    await sembrar(async (db) => {
      await setDoc(doc(db, "usuarios_email", claveEmail(email)), { email, roles, status });
    });
  }

  test("quien tiene un pre-registro a su nombre se aplica esos roles al entrar", async () => {
    await preRegistrar(EMAIL, ["produccion"]);
    const db = comoUsuario(UID, EMAIL);

    await assertSucceeds(
      setDoc(doc(db, "usuarios", UID), {
        email: EMAIL,
        displayName: "Empleado",
        roles: ["produccion"],
        status: "active",
        source: "email-mapping",
        preRegistroKey: claveEmail(EMAIL),
      })
    );
  });

  test("no puede reclamar roles distintos a los que dejó el admin", async () => {
    await preRegistrar(EMAIL, ["produccion"]);
    const db = comoUsuario(UID, EMAIL);

    await assertFails(
      setDoc(doc(db, "usuarios", UID), {
        email: EMAIL,
        roles: ["admin"],
        status: "active",
        source: "email-mapping",
        preRegistroKey: claveEmail(EMAIL),
      })
    );
  });

  // El corazón de la validación: la clave la manda el cliente, pero lo que se
  // compara es el correo que hay DENTRO del documento pre-registrado contra el
  // del token. Apuntar al pre-registro de otro no sirve de nada.
  test("no puede reclamar el pre-registro de otra persona", async () => {
    await preRegistrar("jefe@ejemplo.com", ["admin"]);
    const db = comoUsuario(UID, EMAIL);

    await assertFails(
      setDoc(doc(db, "usuarios", UID), {
        email: EMAIL,
        roles: ["admin"],
        status: "active",
        source: "email-mapping",
        preRegistroKey: claveEmail("jefe@ejemplo.com"),
      })
    );
  });

  test("no sirve inventarse una clave de pre-registro que no existe", async () => {
    const db = comoUsuario(UID, EMAIL);
    await assertFails(
      setDoc(doc(db, "usuarios", UID), {
        email: EMAIL,
        roles: ["admin"],
        status: "active",
        preRegistroKey: "no-existe",
      })
    );
  });

  // Si un admin le quita un rol a alguien, un pre-registro viejo no puede
  // devolvérselo en el siguiente inicio de sesión.
  test("no revive roles ya quitados: solo aplica si la persona no tiene ninguno", async () => {
    await preRegistrar(EMAIL, ["produccion"]);
    await sembrar(async (db) => {
      await setDoc(doc(db, "usuarios", UID), {
        email: EMAIL,
        roles: ["empleado"],
        status: "active",
      });
    });

    const db = comoUsuario(UID, EMAIL);
    await assertFails(
      updateDoc(doc(db, "usuarios", UID), {
        roles: ["produccion"],
        status: "active",
        preRegistroKey: claveEmail(EMAIL),
      })
    );
  });
});

// ─── Lo que la gente hace todos los días y no puede romperse ─────────────────

describe("el uso normal sigue funcionando", () => {
  const UID = "persona";
  const EMAIL = "persona@ejemplo.com";

  test("alguien que se registra crea su perfil pendiente y sin roles", async () => {
    const db = comoUsuario(UID, EMAIL);
    await assertSucceeds(
      setDoc(doc(db, "usuarios", UID), {
        email: EMAIL,
        displayName: "Persona",
        firstName: "Persona",
        lastName: "Ejemplo",
        roles: [],
        status: "pending",
        source: "self-registered",
      })
    );
  });

  test("puede editar sus propios datos de perfil", async () => {
    await sembrar(async (db) => {
      await setDoc(doc(db, "usuarios", UID), {
        email: EMAIL,
        displayName: "Persona",
        roles: ["produccion"],
        status: "active",
      });
    });

    const db = comoUsuario(UID, EMAIL);
    await assertSucceeds(
      updateDoc(doc(db, "usuarios", UID), {
        displayName: "Persona Ejemplo",
        firstName: "Persona",
        lastName: "Ejemplo",
        fotoURL: "https://res.cloudinary.com/foto.jpg",
        fotoPath: "perfiles/persona.jpg",
        firmaDataUrl: "data:image/png;base64,iVBORw0KGgo=",
      })
    );
  });

  test("puede leer su propio perfil aunque siga pendiente", async () => {
    await sembrar(async (db) => {
      await setDoc(doc(db, "usuarios", UID), { email: EMAIL, roles: [], status: "pending" });
    });

    const db = comoUsuario(UID, EMAIL);
    await assertSucceeds(getDoc(doc(db, "usuarios", UID)));
  });

  test("puede leer su propio pre-registro al iniciar sesión", async () => {
    await sembrar(async (db) => {
      await setDoc(doc(db, "usuarios", UID), { email: EMAIL, roles: [], status: "pending" });
      await setDoc(doc(db, "usuarios_email", claveEmail(EMAIL)), {
        email: EMAIL,
        roles: ["produccion"],
        status: "active",
      });
    });

    const db = comoUsuario(UID, EMAIL);
    await assertSucceeds(getDoc(doc(db, "usuarios_email", claveEmail(EMAIL))));
  });

  // El directorio alimenta el selector de firmas de las fichas de producción.
  test("un staff activo puede leer el directorio de usuarios", async () => {
    await sembrar(async (db) => {
      await setDoc(doc(db, "usuarios", UID), { email: EMAIL, roles: ["produccion"], status: "active" });
      await setDoc(doc(db, "usuarios", "companero"), { email: "c@ejemplo.com", roles: ["empleado"], status: "active" });
    });

    const db = comoUsuario(UID, EMAIL);
    await assertSucceeds(getDoc(doc(db, "usuarios", "companero")));
  });
});

describe("el administrador conserva el mando", () => {
  const UID_ADMIN = "admin";

  test("puede asignar roles a otra persona", async () => {
    await sembrar(async (db) => {
      await setDoc(doc(db, "usuarios", "pendiente"), {
        email: "pendiente@ejemplo.com",
        roles: [],
        status: "pending",
      });
    });

    const db = comoUsuario(UID_ADMIN, EMAIL_ADMIN);
    await assertSucceeds(
      updateDoc(doc(db, "usuarios", "pendiente"), { roles: ["inventario"], status: "active" })
    );
  });

  test("puede pre-registrar un correo con sus roles", async () => {
    const db = comoUsuario(UID_ADMIN, EMAIL_ADMIN);
    await assertSucceeds(
      setDoc(doc(db, "usuarios_email", claveEmail("futuro@ejemplo.com")), {
        email: "futuro@ejemplo.com",
        roles: ["almacenista"],
        status: "active",
      })
    );
  });

  test("puede listar el directorio de pre-registros", async () => {
    const db = comoUsuario(UID_ADMIN, EMAIL_ADMIN);
    await assertSucceeds(getDocs(collection(db, "usuarios_email")));
  });

  // Un admin por rol —no por correo— tiene el mismo mando.
  test("un admin por rol también puede asignar roles", async () => {
    await sembrar(async (db) => {
      await setDoc(doc(db, "usuarios", "admin2"), {
        email: "admin2@ejemplo.com",
        roles: ["admin"],
        status: "active",
      });
      await setDoc(doc(db, "usuarios", "pendiente"), { email: "p@ejemplo.com", roles: [], status: "pending" });
    });

    const db = comoUsuario("admin2", "admin2@ejemplo.com");
    await assertSucceeds(updateDoc(doc(db, "usuarios", "pendiente"), { roles: ["produccion"] }));
  });
});

// La lista de campos vive en dos sitios (reglas y firebaseUsers.js) y tienen que
// decir lo mismo; esto lo deja escrito para que se note si alguien toca uno solo.
describe("la whitelist de perfil propio está sincronizada", () => {
  test("las reglas aceptan exactamente los campos de CAMPOS_PERFIL_PROPIO", () => {
    const reglas = readFileSync("firestore.rules", "utf8");
    const cliente = readFileSync("src/utils/firebaseUsers.js", "utf8");

    const bloqueReglas = reglas.match(/function camposPerfilPropio\(\)\s*{\s*return \[([^\]]+)\]/s)[1];
    const bloqueCliente = cliente.match(/const CAMPOS_PERFIL_PROPIO = \[([^\]]+)\]/s)[1];

    const extraer = (txt) => (txt.match(/'[^']+'|"[^"]+"/g) || []).map((s) => s.slice(1, -1)).sort();

    // `updatedAt` solo está en las reglas: lo pone serverTimestamp(), no el
    // formulario, pero la escritura tiene que poder incluirlo.
    const enReglas = extraer(bloqueReglas).filter((c) => c !== "updatedAt");
    expect(enReglas).toEqual(extraer(bloqueCliente));
  });
});
