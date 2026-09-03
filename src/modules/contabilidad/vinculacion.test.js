import { describe, it, expect } from "vitest";
import {
  POR_HERMANA,
  agruparSinVincular,
  claveGrupo,
  empresasYaUsadas,
  resumenVinculacion,
} from "./vinculacion";

const doc = (extra = {}) => ({
  id: extra.id || Math.random().toString(36).slice(2),
  tipo: "factura",
  clienteNombre: "",
  clienteNit: "",
  neto: 0,
  resumen: { neto: extra.neto ?? 0, saldo: extra.saldo ?? 0 },
  ...extra,
});

describe("claveGrupo", () => {
  it("agrupa por NIT aunque el nombre esté escrito distinto", () => {
    const a = doc({ clienteNombre: "AXIONLOG COLOMBIA SAS", clienteNit: "900.123.456-7" });
    const b = doc({ clienteNombre: "Axionlog", clienteNit: "9001234567" });
    expect(claveGrupo(a)).toBe(claveGrupo(b));
  });

  it("cae al nombre cuando no hay NIT", () => {
    const a = doc({ clienteNombre: "Frigorífico del Norte" });
    const b = doc({ clienteNombre: "FRIGORIFICO DEL NORTE" });
    expect(claveGrupo(a)).toBe(claveGrupo(b));
    expect(claveGrupo(a).startsWith("nombre:")).toBe(true);
  });

  it("ignora el documento sin nombre ni NIT", () => {
    expect(claveGrupo(doc({}))).toBe("");
  });
});

describe("empresasYaUsadas", () => {
  it("aprende la empresa del nombre a partir de los documentos ya vinculados", () => {
    const docs = [
      doc({ clienteNombre: "AXIONLOG", empresaId: "e1" }),
      doc({ clienteNombre: "Axionlog", empresaId: "e1" }),
      doc({ clienteNombre: "AXIONLOG" }),
    ];
    expect(empresasYaUsadas(docs).get("axionlog")).toBe("e1");
  });

  it("no sugiere nada si el mismo nombre cuelga de dos empresas", () => {
    const docs = [
      doc({ clienteNombre: "REICO", empresaId: "e1" }),
      doc({ clienteNombre: "REICO", empresaId: "e2" }),
    ];
    expect(empresasYaUsadas(docs).has("reico")).toBe(false);
  });
});

describe("agruparSinVincular", () => {
  const empresas = [
    { id: "e1", nombre: "AXIONLOG COLOMBIA S.A.S.", nit: "9001234567" },
    { id: "e2", nombre: "Frigorífico del Norte", nit: "" },
  ];

  it("solo toma los documentos sin empresa", () => {
    const docs = [
      doc({ clienteNombre: "AXIONLOG", empresaId: "e1" }),
      doc({ clienteNombre: "Otro cliente" }),
    ];
    const grupos = agruparSinVincular(docs, empresas);
    expect(grupos).toHaveLength(1);
    expect(grupos[0].nombre).toBe("Otro cliente");
  });

  it("sugiere por NIT", () => {
    const docs = [doc({ clienteNombre: "AXIONLOG", clienteNit: "900.123.456-7" })];
    const [grupo] = agruparSinVincular(docs, empresas);
    expect(grupo.sugerida.id).toBe("e1");
    expect(grupo.motivo).toBe("nit");
  });

  it("sugiere por nombre normalizado", () => {
    const docs = [doc({ clienteNombre: "FRIGORIFICO DEL NORTE" })];
    const [grupo] = agruparSinVincular(docs, empresas);
    expect(grupo.sugerida.id).toBe("e2");
  });

  it("hereda la empresa de otra factura con el mismo nombre", () => {
    const docs = [
      doc({ clienteNombre: "Comercial Andina", empresaId: "e9" }),
      doc({ clienteNombre: "COMERCIAL ANDINA" }),
    ];
    const [grupo] = agruparSinVincular(docs, [...empresas, { id: "e9", nombre: "Comercial Andina Ltda" }]);
    expect(grupo.sugerida.id).toBe("e9");
    expect(grupo.motivo).toBe(POR_HERMANA);
  });

  it("suma neto y saldo del grupo y elige el nombre más repetido", () => {
    const docs = [
      doc({ clienteNombre: "Cliente X", neto: 100, saldo: 40 }),
      doc({ clienteNombre: "Cliente X", neto: 200, saldo: 60 }),
      doc({ clienteNombre: "CLIENTE  X.", neto: 50, saldo: 0 }),
    ];
    const [grupo] = agruparSinVincular(docs, []);
    expect(grupo.cantidad).toBe(3);
    expect(grupo.neto).toBe(350);
    expect(grupo.saldo).toBe(100);
    expect(grupo.nombre).toBe("Cliente X");
    expect(grupo.variantes).toEqual(["Cliente X", "CLIENTE  X."]);
  });

  it("pone primero al grupo con más saldo pendiente", () => {
    const docs = [
      doc({ clienteNombre: "Poco", neto: 900, saldo: 10 }),
      doc({ clienteNombre: "Mucho", neto: 100, saldo: 500 }),
    ];
    expect(agruparSinVincular(docs, []).map((g) => g.nombre)).toEqual(["Mucho", "Poco"]);
  });

  it("ofrece posibles duplicados cuando no hay coincidencia firme", () => {
    const docs = [doc({ clienteNombre: "Axionlog Colombia Ltda" })];
    const [grupo] = agruparSinVincular(docs, empresas);
    expect(grupo.sugerida).toBeNull();
    expect(grupo.posibles.map((p) => p.empresa.id)).toContain("e1");
  });
});

describe("resumenVinculacion", () => {
  it("cuenta documentos, clientes y saldo suelto", () => {
    const docs = [
      doc({ clienteNombre: "A", empresaId: "e1", saldo: 5 }),
      doc({ clienteNombre: "B", saldo: 100 }),
      doc({ clienteNombre: "B", saldo: 200 }),
      doc({ clienteNombre: "C", saldo: 0 }),
    ];
    expect(resumenVinculacion(docs)).toEqual({
      total: 4,
      vinculados: 1,
      sinVincular: 3,
      clientes: 2,
      saldo: 300,
    });
  });
});
