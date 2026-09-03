import { describe, it, expect } from "vitest";
import {
  claveNit,
  claveNitBase,
  claveNombreComercial,
  resolverEmpresa,
  buscarPosiblesDuplicados,
  agruparDuplicados,
  elegirPrincipal,
  planFusion,
  claveContacto,
  resolverContacto,
  nombreContenido,
  tokensNucleo,
} from "./empresaIdentidad";

const EMPRESAS = [
  { id: "e1", nombre: "Alimentos Cárnicos S.A.S.", alias: "ALICAR", nit: "900.123.456-7", ciudad: "Medellín" },
  { id: "e2", nombre: "Frigorífico del Norte", alias: "", nit: '"901234567"', ciudad: "Bogotá" },
  { id: "e3", nombre: "Logística Andina", alias: "LOGAN", nit: "", ciudad: "" },
];

describe("claveNit", () => {
  it("deja solo dígitos, así el NIT con puntos y el limpio son el mismo", () => {
    expect(claveNit("900.123.456-7")).toBe("9001234567");
    expect(claveNit('"9001234567"')).toBe("9001234567");
    expect(claveNit("900 123 456 7")).toBe("9001234567");
  });

  it("devuelve cadena vacía cuando no hay NIT", () => {
    expect(claveNit("")).toBe("");
    expect(claveNit(null)).toBe("");
  });
});

describe("claveNitBase", () => {
  it("quita el dígito de verificación cuando lo trae", () => {
    expect(claveNitBase("900123456-7")).toBe("900123456");
    expect(claveNitBase("900123456")).toBe("900123456");
  });
});

describe("claveNombreComercial", () => {
  it("ignora la forma legal del final", () => {
    expect(claveNombreComercial("Alimentos Cárnicos S.A.S.")).toBe("alimentos carnicos");
    expect(claveNombreComercial("ALIMENTOS CARNICOS LTDA")).toBe("alimentos carnicos");
    expect(claveNombreComercial("Alimentos Carnicos S A S")).toBe("alimentos carnicos");
  });

  it("no vacía un nombre que es solo forma legal", () => {
    expect(claveNombreComercial("S.A.S.")).toBe("sas");
  });

  it("no recorta palabras que son parte del nombre", () => {
    expect(claveNombreComercial("Frigorífico del Norte")).toBe("frigorifico del norte");
  });
});

describe("resolverEmpresa", () => {
  it("reconoce la empresa por el NIT aunque venga escrito distinto", () => {
    const r = resolverEmpresa({ nombre: "ALIMENTOS CARNICOS", nit: "9001234567" }, EMPRESAS);
    expect(r.empresa.id).toBe("e1");
    expect(r.motivo).toBe("nit");
  });

  it("reconoce la empresa por el nombre normalizado cuando no hay NIT", () => {
    const r = resolverEmpresa({ nombre: "alimentos carnicos sas" }, EMPRESAS);
    expect(r.empresa.id).toBe("e1");
    expect(r.motivo).toBe("nombre");
  });

  it("reconoce la empresa cuando se escribió el alias en el campo del nombre", () => {
    const r = resolverEmpresa({ nombre: "alicar" }, EMPRESAS);
    expect(r.empresa.id).toBe("e1");
    expect(r.motivo).toBe("alias");
  });

  it("no se resuelve a sí misma al editar", () => {
    const r = resolverEmpresa({ id: "e1", nombre: "Alimentos Cárnicos S.A.S." }, EMPRESAS);
    expect(r.empresa).toBeNull();
  });

  it("devuelve nulo cuando de verdad es una empresa nueva", () => {
    expect(resolverEmpresa({ nombre: "Carnes del Sur", nit: "800111222" }, EMPRESAS).empresa).toBeNull();
  });

  it("no confunde empresas distintas por tener el nombre vacío", () => {
    const lista = [{ id: "x", nombre: "", alias: "", nit: "" }];
    expect(resolverEmpresa({ nombre: "", nit: "" }, lista).empresa).toBeNull();
  });
});

describe("buscarPosiblesDuplicados", () => {
  it("avisa del nombre que solo cambia en la forma legal", () => {
    const dup = buscarPosiblesDuplicados({ nombre: "Alimentos Carnicos Ltda" }, EMPRESAS);
    expect(dup.map((d) => d.empresa.id)).toEqual(["e1"]);
  });

  it("avisa del NIT sin dígito de verificación", () => {
    const dup = buscarPosiblesDuplicados({ nombre: "Otra cosa", nit: "900123456" }, EMPRESAS);
    expect(dup.map((d) => d.empresa.id)).toEqual(["e1"]);
  });

  it("no repite la que ya coincide de forma exacta", () => {
    expect(buscarPosiblesDuplicados({ nombre: "Alimentos Cárnicos S.A.S." }, EMPRESAS)).toEqual([]);
  });
});

describe("agruparDuplicados", () => {
  it("junta las que comparten NIT aunque esté escrito distinto", () => {
    const grupos = agruparDuplicados([
      ...EMPRESAS,
      { id: "e4", nombre: "ALIMENTOS CARNICOS", nit: "9001234567" },
    ]);
    expect(grupos).toHaveLength(1);
    expect(grupos[0].empresas.map((e) => e.id).sort()).toEqual(["e1", "e4"]);
    expect(grupos[0].certeza).toBe("alta");
  });

  it("encadena tres registros que se enlazan de a dos", () => {
    const grupos = agruparDuplicados([
      { id: "a", nombre: "Andina S.A.S.", nit: "800111222" },
      { id: "b", nombre: "Andina S.A.S.", nit: "" },
      { id: "c", nombre: "Otra", nit: "800111222" },
    ]);
    expect(grupos).toHaveLength(1);
    expect(grupos[0].empresas.map((e) => e.id).sort()).toEqual(["a", "b", "c"]);
  });

  it("marca como sospecha la coincidencia que solo cambia en la forma legal", () => {
    const grupos = agruparDuplicados([
      { id: "a", nombre: "Andina S.A.S.", nit: "800111222" },
      { id: "b", nombre: "Andina Ltda", nit: "890999888" },
    ]);
    expect(grupos).toHaveLength(1);
    expect(grupos[0].certeza).toBe("media");
  });

  it("no inventa grupos con una base limpia", () => {
    expect(agruparDuplicados(EMPRESAS)).toEqual([]);
  });

  it("no agrupa por NIT vacío", () => {
    const grupos = agruparDuplicados([
      { id: "a", nombre: "Uno", nit: "" },
      { id: "b", nombre: "Dos", nit: "" },
    ]);
    expect(grupos).toEqual([]);
  });
});

describe("elegirPrincipal", () => {
  it("conserva la que tiene NIT y más datos llenos", () => {
    const principal = elegirPrincipal([
      { id: "a", nombre: "Andina", nit: "" },
      { id: "b", nombre: "Andina", nit: "800111222", ciudad: "Cali", alias: "AND" },
    ]);
    expect(principal.id).toBe("b");
  });
});

describe("contactos", () => {
  const CONTACTOS = [
    { id: "c1", nombre: "Juan Pérez", email: "Juan@Empresa.com" },
    { id: "c2", nombre: "María López", email: "" },
  ];

  it("empareja por email sin importar mayúsculas", () => {
    const r = resolverContacto({ nombre: "J. Perez", email: "juan@empresa.com" }, CONTACTOS);
    expect(r.contacto.id).toBe("c1");
    expect(r.motivo).toBe("email");
  });

  it("empareja por nombre cuando el contacto no tiene email", () => {
    const r = resolverContacto({ nombre: "maria lopez" }, CONTACTOS);
    expect(r.contacto.id).toBe("c2");
    expect(r.motivo).toBe("nombre");
  });

  it("no empareja un contacto realmente nuevo", () => {
    expect(resolverContacto({ nombre: "Ana Ruiz" }, CONTACTOS).contacto).toBeNull();
  });

  it("la llave prefiere el email y cae al nombre", () => {
    expect(claveContacto({ nombre: "Juan", email: "A@B.com" })).toBe("email:a@b.com");
    expect(claveContacto({ nombre: "Juan Pérez" })).toBe("nombre:juan perez");
    expect(claveContacto({})).toBe("");
  });
});

describe("planFusion", () => {
  const GRUPO = [
    { id: "a", nombre: "Andina", nit: "" },
    { id: "b", nombre: "Andina S.A.S.", nit: "800111222", ciudad: "Cali" },
    { id: "c", nombre: "ANDINA SAS", nit: "" },
  ];

  it("conserva la más completa y elimina las demás", () => {
    const plan = planFusion(GRUPO);
    expect(plan.principal.id).toBe("b");
    expect(plan.otras.map((e) => e.id).sort()).toEqual(["a", "c"]);
  });

  it("respeta la empresa que se marcó a mano", () => {
    const plan = planFusion(GRUPO, { principalId: "a" });
    expect(plan.principal.id).toBe("a");
    expect(plan.otras.map((e) => e.id).sort()).toEqual(["b", "c"]);
  });

  it("deja fuera las desmarcadas", () => {
    const plan = planFusion(GRUPO, { excluidas: { c: true } });
    expect(plan.otras.map((e) => e.id)).toEqual(["a"]);
  });

  it("no fusiona nada si queda una sola empresa dentro", () => {
    expect(planFusion(GRUPO, { excluidas: { a: true, c: true } })).toBeNull();
    expect(planFusion([{ id: "a", nombre: "Andina" }])).toBeNull();
  });

  it("si se excluye la marcada, la principal se recalcula entre las que quedan", () => {
    const plan = planFusion(GRUPO, { principalId: "b", excluidas: { b: true } });
    expect(["a", "c"]).toContain(plan.principal.id);
    expect(plan.otras).toHaveLength(1);
  });

  it("nunca deja la principal dentro de las que se eliminan", () => {
    for (const principalId of ["a", "b", "c", null]) {
      const plan = planFusion(GRUPO, { principalId });
      expect(plan.otras.some((e) => e.id === plan.principal.id)).toBe(false);
      expect(plan.otras).toHaveLength(2);
    }
  });
});

// ─── Nombre corto contra razón social ───────────────────────────────────────
// Lo que dejó la migración del Excel: el libro escribía "AXIONLOG" y la base
// de clientes ya tenía "AXIONLOG COLOMBIA S.A.S.". Al importar se creó un
// cliente nuevo y quedaron dos.

describe("tokensNucleo", () => {
  it("deja solo las palabras que distinguen al cliente", () => {
    expect(tokensNucleo("AXIONLOG COLOMBIA S.A.S.")).toEqual(["axionlog"]);
    expect(tokensNucleo("Grupo Empresarial del Norte Ltda")).toEqual(["empresarial", "norte"]);
    expect(tokensNucleo("S.A.S.")).toEqual([]);
  });
});

describe("nombreContenido", () => {
  it("reconoce el nombre corto dentro de la razón social", () => {
    expect(nombreContenido("AXIONLOG", "AXIONLOG COLOMBIA S.A.S.")).toBe(true);
    expect(nombreContenido("Axionlog Colombia S.A.S.", "axionlog")).toBe(true);
  });

  it("junta cuando el corto tiene varias palabras propias", () => {
    expect(nombreContenido("ALIMENTOS CARNICOS", "Alimentos Cárnicos Zenú S.A.S.")).toBe(true);
  });

  it("no reclama por una sola palabra que no encabeza el nombre", () => {
    expect(nombreContenido("NORTE", "FRIGORIFICO NORTE")).toBe(false);
  });

  it("no reclama por una palabra demasiado corta", () => {
    expect(nombreContenido("ACE", "ACE Refrigeración")).toBe(false);
  });

  it("ignora las palabras de relleno, que si no juntarían media base", () => {
    expect(nombreContenido("COLOMBIA", "AXIONLOG COLOMBIA")).toBe(false);
    expect(nombreContenido("Grupo Andina", "Grupo Bolívar")).toBe(false);
  });

  it("no junta empresas sin nada en común", () => {
    expect(nombreContenido("Colanta", "Alpina")).toBe(false);
    expect(nombreContenido("", "Alpina")).toBe(false);
  });
});

describe("agruparDuplicados con nombres contenidos", () => {
  it("saca el par que la migración duplicó, como sospecha y no como certeza", () => {
    const grupos = agruparDuplicados([
      { id: "a", nombre: "AXIONLOG COLOMBIA S.A.S.", nit: "9001234567" },
      { id: "b", nombre: "AXIONLOG" },
      { id: "c", nombre: "Colanta" },
    ]);
    expect(grupos).toHaveLength(1);
    expect(grupos[0].empresas.map((e) => e.id).sort()).toEqual(["a", "b"]);
    expect(grupos[0].certeza).toBe("media");
    expect(grupos[0].motivos).toContain("un nombre contenido en el otro");
  });

  it("dos NIT distintos son dos empresas por parecido que sea el nombre", () => {
    const grupos = agruparDuplicados([
      { id: "a", nombre: "AXIONLOG COLOMBIA S.A.S.", nit: "9001234567" },
      { id: "b", nombre: "AXIONLOG", nit: "8009998887" },
    ]);
    expect(grupos).toHaveLength(0);
  });

  it("conserva a la que tiene NIT como principal al fusionar", () => {
    const lista = [{ id: "b", nombre: "AXIONLOG" }, { id: "a", nombre: "AXIONLOG COLOMBIA S.A.S.", nit: "9001234567" }];
    expect(planFusion(lista).principal.id).toBe("a");
  });
});
