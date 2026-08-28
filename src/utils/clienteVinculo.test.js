import { describe, it, expect } from "vitest";
import {
  normalizarNombreCliente,
  limpiarNit,
  clienteDesdeEmpresa,
  clienteSinVincular,
  camposClienteFicha,
  clienteDeFicha,
  fichaVinculada,
  buscarEmpresaPorNombre,
  buscarEmpresaPorNit,
  planVinculacion,
  nombreClienteImpreso,
  aliasManual,
} from "./clienteVinculo";

const EMPRESAS = [
  { id: "e1", nombre: "Alimentos Cárnicos S.A.S.", nit: "890900608", ciudad: "Medellín" },
  { id: "e2", nombre: "Frigorífico del Norte", nit: '"901234567"', ciudad: "Bogotá" },
  { id: "e3", nombre: "Logística Andina", nit: "", ciudad: "" },
];

describe("normalizarNombreCliente", () => {
  it("ignora tildes, mayúsculas y puntuación", () => {
    expect(normalizarNombreCliente("Alimentos Cárnicos S.A.S."))
      .toBe(normalizarNombreCliente("ALIMENTOS CARNICOS SAS"));
  });

  it("colapsa espacios repetidos y recorta los extremos", () => {
    expect(normalizarNombreCliente("  Frigorífico   del  Norte ")).toBe("frigorifico del norte");
  });

  it("pliega la eñe a n, para que 'Penalosa' empareje con 'Peñalosa'", () => {
    expect(normalizarNombreCliente("Peñalosa")).toBe("penalosa");
    expect(normalizarNombreCliente("Distribuciones Peñalosa"))
      .toBe(normalizarNombreCliente("DISTRIBUCIONES PENALOSA"));
  });

  it("devuelve cadena vacía para valores nulos", () => {
    expect(normalizarNombreCliente(null)).toBe("");
    expect(normalizarNombreCliente(undefined)).toBe("");
  });
});

describe("limpiarNit", () => {
  it("quita las comillas que dejan las importaciones de Excel", () => {
    expect(limpiarNit('"901234567"')).toBe("901234567");
    expect(limpiarNit("“890900608”")).toBe("890900608");
  });
});

describe("datos del cliente en la ficha", () => {
  it("copia nombre, NIT y ciudad de la empresa elegida", () => {
    expect(clienteDesdeEmpresa(EMPRESAS[1])).toEqual({
      clienteId: "e2",
      cliente: "Frigorífico del Norte",
      clienteAlias: "",
      usarAlias: false,
      clienteNit: "901234567",
      clienteCiudad: "Bogotá",
    });
  });

  it("copia el alias y lo deja activo, porque para eso se define", () => {
    const datos = clienteDesdeEmpresa({ id: "e9", nombre: "Comercializadora Internacional Andina S.A.S.", alias: "CI ANDINA" });
    expect(datos.clienteAlias).toBe("CI ANDINA");
    expect(datos.usarAlias).toBe(true);
    expect(nombreClienteImpreso(datos)).toBe("CI ANDINA");
  });

  it("respeta que la ficha haya pedido el nombre completo", () => {
    const datos = clienteDesdeEmpresa({ id: "e9", nombre: "Comercializadora Andina S.A.S.", alias: "ANDINA" }, { usarAlias: false });
    expect(datos.usarAlias).toBe(false);
    expect(nombreClienteImpreso(datos)).toBe("Comercializadora Andina S.A.S.");
  });

  it("una empresa sin alias nunca queda pidiendo alias", () => {
    expect(clienteDesdeEmpresa(EMPRESAS[1], { usarAlias: true }).usarAlias).toBe(false);
  });

  it("un cliente escrito a mano queda sin id", () => {
    const datos = clienteSinVincular("  Taller Nuevo  ");
    expect(datos).toEqual({
      clienteId: null, cliente: "Taller Nuevo", clienteAlias: "", usarAlias: false, clienteNit: "", clienteCiudad: "",
    });
    expect(fichaVinculada(datos)).toBe(false);
  });

  it("camposClienteFicha normaliza lo que llega del formulario", () => {
    expect(camposClienteFicha({ clienteId: "  ", cliente: "  ACME  ", clienteNit: '"123"' })).toEqual({
      clienteId: null,
      cliente: "ACME",
      clienteAlias: "",
      usarAlias: false,
      clienteNit: "123",
      clienteCiudad: "",
    });
  });

  it("camposClienteFicha sobre un objeto vacío no rompe", () => {
    expect(camposClienteFicha()).toEqual({
      clienteId: null, cliente: "", clienteAlias: "", usarAlias: false, clienteNit: "", clienteCiudad: "",
    });
  });

  it("clienteDeFicha lee fichas viejas que solo tienen el nombre", () => {
    const ficha = { cliente: "Cliente Antiguo", cantidad: 2 };
    expect(clienteDeFicha(ficha)).toEqual({
      clienteId: null, cliente: "Cliente Antiguo", clienteAlias: "", usarAlias: false, clienteNit: "", clienteCiudad: "",
    });
    expect(fichaVinculada(ficha)).toBe(false);
  });

  it("una ficha con clienteId cuenta como vinculada", () => {
    expect(fichaVinculada({ clienteId: "e1", cliente: "Alimentos Cárnicos S.A.S." })).toBe(true);
  });
});

describe("buscarEmpresaPorNombre", () => {
  it("encuentra la empresa aunque el nombre esté escrito distinto", () => {
    expect(buscarEmpresaPorNombre("alimentos carnicos sas", EMPRESAS)?.id).toBe("e1");
  });

  it("no adivina cuando no hay coincidencia", () => {
    expect(buscarEmpresaPorNombre("Empresa Que No Existe", EMPRESAS)).toBeNull();
  });

  it("no elige cuando dos empresas normalizan igual", () => {
    const ambiguas = [...EMPRESAS, { id: "e4", nombre: "ALIMENTOS CARNICOS SAS" }];
    expect(buscarEmpresaPorNombre("Alimentos Cárnicos S.A.S.", ambiguas)).toBeNull();
  });

  it("un nombre vacío no coincide con nada", () => {
    expect(buscarEmpresaPorNombre("   ", EMPRESAS)).toBeNull();
  });
});

describe("buscarEmpresaPorNit", () => {
  it("compara el NIT ya limpio de comillas", () => {
    expect(buscarEmpresaPorNit("901234567", EMPRESAS)?.id).toBe("e2");
  });

  it("un NIT vacío no coincide con la empresa sin NIT", () => {
    expect(buscarEmpresaPorNit("", EMPRESAS)).toBeNull();
  });
});

describe("planVinculacion", () => {
  const fichas = [
    { id: "f1", cliente: "ALIMENTOS CARNICOS SAS" },
    { id: "f2", cliente: "Cliente Suelto" },
    { id: "f3", cliente: "Frigorífico del Norte", clienteId: "e2" },
    { id: "f4", cliente: "   " },
  ];

  it("separa lo que se puede vincular de lo que queda pendiente", () => {
    const { vincular, sinCoincidencia } = planVinculacion(fichas, EMPRESAS);
    expect(vincular).toHaveLength(1);
    expect(vincular[0].ficha.id).toBe("f1");
    expect(vincular[0].datos).toEqual({
      clienteId: "e1",
      cliente: "Alimentos Cárnicos S.A.S.",
      clienteAlias: "",
      usarAlias: false,
      clienteNit: "890900608",
      clienteCiudad: "Medellín",
    });
    expect(sinCoincidencia.map((x) => x.ficha.id)).toEqual(["f2"]);
  });

  it("deja quietas las fichas ya vinculadas y las que no tienen cliente", () => {
    const { vincular, sinCoincidencia } = planVinculacion(fichas, EMPRESAS);
    const tocadas = [...vincular, ...sinCoincidencia].map((x) => x.ficha.id);
    expect(tocadas).not.toContain("f3");
    expect(tocadas).not.toContain("f4");
  });

  it("sin empresas cargadas no vincula nada", () => {
    expect(planVinculacion(fichas, []).vincular).toEqual([]);
  });
});

describe("nombreClienteImpreso", () => {
  it("saca el alias cuando la ficha lo pidió", () => {
    expect(nombreClienteImpreso({ cliente: "Comercializadora Andina S.A.S.", clienteAlias: "ANDINA", usarAlias: true }))
      .toBe("ANDINA");
  });

  it("saca el nombre completo cuando la ficha no lo pidió", () => {
    expect(nombreClienteImpreso({ cliente: "Comercializadora Andina S.A.S.", clienteAlias: "ANDINA", usarAlias: false }))
      .toBe("Comercializadora Andina S.A.S.");
  });

  it("no deja la orden en blanco si se pidió un alias que no existe", () => {
    expect(nombreClienteImpreso({ cliente: "Taller Nuevo", usarAlias: true })).toBe("Taller Nuevo");
  });

  it("las fichas anteriores al alias siguen imprimiendo su nombre", () => {
    expect(nombreClienteImpreso({ cliente: "Cliente Antiguo" })).toBe("Cliente Antiguo");
    expect(nombreClienteImpreso({})).toBe("");
  });
});

describe("aliasManual", () => {
  it("permite escribir el alias en una ficha sin vincular", () => {
    const datos = aliasManual(clienteSinVincular("Taller Nuevo"), "  TALLER  ");
    expect(datos.clienteAlias).toBe("TALLER");
    expect(datos.usarAlias).toBe(true);
    expect(nombreClienteImpreso(datos)).toBe("TALLER");
  });

  it("no vuelve a encender la casilla que se apagó a propósito", () => {
    const datos = aliasManual({ cliente: "Taller", clienteAlias: "TAL", usarAlias: false }, "TALL");
    expect(datos.usarAlias).toBe(false);
  });

  it("borrar el alias apaga la marca", () => {
    const datos = aliasManual({ cliente: "Taller Nuevo", clienteAlias: "TALLER", usarAlias: true }, "");
    expect(datos.usarAlias).toBe(false);
    expect(nombreClienteImpreso(datos)).toBe("Taller Nuevo");
  });
});
