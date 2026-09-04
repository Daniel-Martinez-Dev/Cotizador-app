import { describe, it, expect } from "vitest";
import {
  agruparPorOrdenCompra, alertaGrupo, claveOrdenCompra, detallesGrupo, estadoGrupo,
  fichasSinLaOC, normalizarOrdenCompra, planAgruparEnOC, productosGrupo, resumenGrupo,
} from "./ordenesAgrupar";

const HOY = "2026-08-28";

const ETIQUETA = {
  sello: "Sello de Andén",
  puertaseccional: "Puertas Seccionales",
  general: "Ficha Básica",
};

let contador = 0;
const ficha = (extra = {}) => {
  const tipo = extra.tipo || "sello";
  return {
    id: `f${++contador}`,
    tipo,
    tipoLabel: ETIQUETA[tipo] || tipo,
    cliente: "Rojas Hermanos",
    numeroOrdenCompra: "OC-991",
    estado: "en_produccion",
    cantidad: 6,
    ordenProduccion: 100,
    ...extra,
  };
};

describe("clave de la orden de compra", () => {
  it("ignora la puntuación y las mayúsculas con que se teclea la OC", () => {
    expect(normalizarOrdenCompra(" 4500-123 ")).toBe("4500123");
    expect(claveOrdenCompra(ficha({ numeroOrdenCompra: "oc 4500 123" })))
      .toBe(claveOrdenCompra(ficha({ numeroOrdenCompra: "OC-4500123" })));
  });

  it("separa la misma OC de dos clientes distintos: todos numeran 001", () => {
    const a = ficha({ cliente: "Rojas Hermanos", numeroOrdenCompra: "001" });
    const b = ficha({ cliente: "Alpina", numeroOrdenCompra: "001" });
    expect(claveOrdenCompra(a)).not.toBe(claveOrdenCompra(b));
  });

  it("reconoce el mismo cliente escrito con tildes o sin ellas", () => {
    expect(claveOrdenCompra(ficha({ cliente: "Frigorífico Norte S.A.S." })))
      .toBe(claveOrdenCompra(ficha({ cliente: "FRIGORIFICO NORTE SAS" })));
  });

  it("deja sin clave la ficha sin orden de compra: no hay por dónde juntarla", () => {
    expect(claveOrdenCompra(ficha({ numeroOrdenCompra: "" }))).toBe("");
  });
});

describe("agrupar por orden de compra", () => {
  it("junta en una sola entrada los productos de la misma OC", () => {
    const entradas = agruparPorOrdenCompra([
      ficha({ tipo: "sello" }),
      ficha({ tipo: "puertaseccional" }),
      ficha({ tipo: "general" }),
    ]);
    expect(entradas).toHaveLength(1);
    expect(entradas[0].esGrupo).toBe(true);
    expect(entradas[0].fichas).toHaveLength(3);
    expect(entradas[0].numeroOrdenCompra).toBe("OC-991");
    expect(entradas[0].cliente).toBe("Rojas Hermanos");
  });

  it("no envuelve la ficha que va sola: sería un clic de más para lo de siempre", () => {
    const [entrada] = agruparPorOrdenCompra([ficha({ numeroOrdenCompra: "OC-1" })]);
    expect(entrada.esGrupo).toBeUndefined();
    expect(entrada.tipo).toBe("sello");
  });

  it("deja sueltas las fichas sin orden de compra aunque sean del mismo cliente", () => {
    const entradas = agruparPorOrdenCompra([
      ficha({ numeroOrdenCompra: "" }),
      ficha({ numeroOrdenCompra: "  " }),
    ]);
    expect(entradas).toHaveLength(2);
    expect(entradas.every((e) => !e.esGrupo)).toBe(true);
  });

  it("respeta el orden de la lista: el grupo se queda donde iba su primera ficha", () => {
    const entradas = agruparPorOrdenCompra([
      ficha({ numeroOrdenCompra: "" , id: "suelta1" }),
      ficha({ numeroOrdenCompra: "OC-991", tipo: "sello" }),
      ficha({ numeroOrdenCompra: "", id: "suelta2" }),
      ficha({ numeroOrdenCompra: "OC-991", tipo: "general" }),
    ]);
    expect(entradas.map((e) => (e.esGrupo ? "grupo" : e.id)))
      .toEqual(["suelta1", "grupo", "suelta2"]);
  });

  it("suma unidades y consecutivo: el pedido se ordena por su ficha más reciente", () => {
    const [grupo] = agruparPorOrdenCompra([
      ficha({ cantidad: 6, ordenProduccion: 120 }),
      ficha({ cantidad: 6, ordenProduccion: 141 }),
    ]);
    expect(grupo.unidades).toBe(12);
    expect(grupo.ordenProduccion).toBe(141);
  });

  it("toma la entrega más próxima y la orden más antigua del pedido", () => {
    const [grupo] = agruparPorOrdenCompra([
      ficha({ fechaOrden: "2026-08-10", fechaEntrega: "2026-09-20" }),
      ficha({ fechaOrden: "2026-08-04", fechaEntrega: "2026-09-02" }),
    ]);
    expect(grupo.fechaEntrega).toBe("2026-09-02");
    expect(grupo.fechaOrden).toBe("2026-08-04");
  });
});

describe("estado del pedido completo", () => {
  it("se queda en el menos avanzado: el camión no sale hasta que estén todas", () => {
    expect(estadoGrupo([
      { estado: "terminado" }, { estado: "en_produccion" }, { estado: "terminado" },
    ])).toBe("en_produccion");
  });

  it("solo se da por entregado cuando lo están todas sus fichas", () => {
    expect(estadoGrupo([{ estado: "entregado" }, { estado: "entregado" }])).toBe("entregado");
    expect(estadoGrupo([{ estado: "entregado" }, { estado: "terminado" }])).toBe("terminado");
  });

  it("trata el estado desconocido como borrador, igual que una ficha suelta", () => {
    expect(estadoGrupo([{ estado: "vaya_usted_a_saber" }, { estado: "terminado" }])).toBe("borrador");
  });
});

describe("alerta del pedido", () => {
  it("hereda la peor de sus fichas: una vencida vence el pedido", () => {
    const fichas = [
      ficha({ fechaEntrega: "2026-09-30" }),
      ficha({ fechaEntrega: "2026-08-01" }),
      ficha({ fechaEntrega: HOY }),
    ];
    expect(alertaGrupo(fichas, HOY)).toBe("vencida");
  });

  it("calla cuando ninguna de sus fichas alerta", () => {
    expect(alertaGrupo([ficha({ fechaEntrega: "2026-12-01" })], HOY)).toBe(null);
  });
});

describe("resumen del pedido", () => {
  it("cuenta las fichas por estado para leer el avance sin desplegarlo", () => {
    const { porEstado } = resumenGrupo([
      ficha({ estado: "terminado" }), ficha({ estado: "terminado" }), ficha({ estado: "en_produccion" }),
    ]);
    expect(porEstado.terminado).toBe(2);
    expect(porEstado.en_produccion).toBe(1);
    expect(porEstado.borrador).toBe(0);
  });

  it("cuenta una unidad por ficha cuando la cantidad no viene", () => {
    expect(resumenGrupo([{ estado: "borrador" }]).unidades).toBe(1);
  });

  it("agrupa los productos repetidos del pedido", () => {
    const productos = productosGrupo([
      ficha({ tipo: "sello" }), ficha({ tipo: "sello" }), ficha({ tipo: "general" }),
    ]);
    expect(productos).toEqual([
      { tipo: "sello", label: "Sello de Andén", fichas: 2 },
      { tipo: "general", label: "Ficha Básica", fichas: 1 },
    ]);
  });
});

describe("detalles del pedido", () => {
  it("lista el detalle de cada línea, en orden", () => {
    expect(detallesGrupo([
      ficha({ nombreFicha: "Muelle 5" }),
      ficha({ nombreFicha: "Muelle 6" }),
      ficha({ nombreFicha: "Muelle 7" }),
    ])).toEqual(["Muelle 5", "Muelle 6", "Muelle 7"]);
  });

  it("no repite el mismo detalle ni cuenta los vacíos", () => {
    expect(detallesGrupo([
      ficha({ nombreFicha: "Zona Norte" }),
      ficha({ nombreFicha: "  " }),
      ficha({ nombreFicha: "Zona Norte" }),
      ficha({}),
    ])).toEqual(["Zona Norte"]);
  });

  it("viaja en el grupo, para pintarlo sin recorrer las fichas", () => {
    const [grupo] = agruparPorOrdenCompra([
      ficha({ nombreFicha: "Muelle 5" }),
      ficha({ nombreFicha: "Muelle 6" }),
    ]);
    expect(grupo.detalles).toEqual(["Muelle 5", "Muelle 6"]);
  });
});

describe("juntar a mano órdenes en una misma OC", () => {
  it("propone la OC que ya traen: sumar una ficha suelta al pedido es lo corriente", () => {
    const plan = planAgruparEnOC([
      ficha({ numeroOrdenCompra: "4500-123" }),
      ficha({ numeroOrdenCompra: "" }),
    ]);
    expect(plan.sugerida).toBe("4500-123");
    expect(plan.mismoCliente).toBe(true);
  });

  it("no propone nada cuando las marcadas vienen de OC distintas", () => {
    const plan = planAgruparEnOC([
      ficha({ numeroOrdenCompra: "4500-123" }),
      ficha({ numeroOrdenCompra: "4500-999" }),
    ]);
    expect(plan.sugerida).toBe("");
    expect(plan.previas).toEqual(["4500-123", "4500-999"]);
  });

  it("dos formas de teclear la misma OC son una sola", () => {
    const plan = planAgruparEnOC([
      ficha({ numeroOrdenCompra: "4500-123" }),
      ficha({ numeroOrdenCompra: "4500 123" }),
    ]);
    expect(plan.previas).toHaveLength(1);
    expect(plan.sugerida).toBe("4500-123");
  });

  it("avisa cuando hay clientes distintos: un pedido es de un solo cliente", () => {
    const plan = planAgruparEnOC([
      ficha({ cliente: "Rojas Hermanos" }),
      ficha({ cliente: "Alpina" }),
    ]);
    expect(plan.mismoCliente).toBe(false);
    expect(plan.clientes).toEqual(["Rojas Hermanos", "Alpina"]);
  });

  it("no reescribe la OC de las que ya la tienen, ni aunque se tecleara distinto", () => {
    const suelta = ficha({ numeroOrdenCompra: "" });
    const puestas = [ficha({ numeroOrdenCompra: "4500-123" }), ficha({ numeroOrdenCompra: "4500123" })];
    expect(fichasSinLaOC([...puestas, suelta], "4500 123")).toEqual([suelta]);
  });

  it("escrita la OC en todas, el tablero ya las pinta como un pedido", () => {
    const sueltas = [ficha({ numeroOrdenCompra: "" }), ficha({ numeroOrdenCompra: "" })];
    expect(agruparPorOrdenCompra(sueltas)).toHaveLength(2);

    const juntas = sueltas.map((f) => ({ ...f, numeroOrdenCompra: "4500-123" }));
    const [grupo, ...resto] = agruparPorOrdenCompra(juntas);
    expect(resto).toHaveLength(0);
    expect(grupo.esGrupo).toBe(true);
    expect(grupo.fichas).toHaveLength(2);
  });
});
