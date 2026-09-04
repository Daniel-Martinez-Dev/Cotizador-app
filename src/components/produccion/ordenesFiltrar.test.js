import { describe, it, expect } from "vitest";
import {
  alertaEntrega, agruparPorEstado, claveDia, clientesDe, filtrar,
  hayFiltrosActivos, indexar, metricas, normalizar, ordenar, sumarDias,
  FILTROS_INICIALES,
} from "./ordenesFiltrar";

const HOY = "2026-08-28";

const ETIQUETA = { division: "División Térmica", sello: "Sello de Andén" };

const ficha = (extra) => {
  const tipo = extra.tipo || "division";
  return {
    id: extra.id || Math.random().toString(36).slice(2),
    tipo,
    // La etiqueta tiene que seguir al tipo: si no, un sello se dejaría
    // encontrar buscando "division" y la prueba no probaría nada.
    tipoLabel: ETIQUETA[tipo] || tipo,
    cliente: "Alpina",
    estado: "en_produccion",
    ordenProduccion: 100,
    ...extra,
  };
};

describe("semáforo de entrega", () => {
  it("marca vencida la que ya pasó y sigue sin salir", () => {
    expect(alertaEntrega(ficha({ fechaEntrega: "2026-08-27" }), HOY)).toBe("vencida");
  });

  it("distingue hoy de próxima y de lejana", () => {
    expect(alertaEntrega(ficha({ fechaEntrega: HOY }), HOY)).toBe("hoy");
    expect(alertaEntrega(ficha({ fechaEntrega: "2026-08-31" }), HOY)).toBe("proxima");
    expect(alertaEntrega(ficha({ fechaEntrega: "2026-09-15" }), HOY)).toBe(null);
  });

  it("calla en las que ya salieron: la fecha dejó de ser una deuda", () => {
    const vencida = { fechaEntrega: "2026-01-01" };
    expect(alertaEntrega(ficha({ ...vencida, estado: "terminado" }), HOY)).toBe(null);
    expect(alertaEntrega(ficha({ ...vencida, estado: "entregado" }), HOY)).toBe(null);
    expect(alertaEntrega(ficha({ ...vencida, estado: "borrador" }), HOY)).toBe("vencida");
  });

  it("calla si no hay fecha de entrega", () => {
    expect(alertaEntrega(ficha({}), HOY)).toBe(null);
    expect(alertaEntrega(ficha({ fechaEntrega: "" }), HOY)).toBe(null);
  });

  it("suma días sin cruzarse con el cambio de mes", () => {
    expect(sumarDias("2026-08-30", 3)).toBe("2026-09-02");
    expect(sumarDias("2026-12-31", 1)).toBe("2027-01-01");
    expect(sumarDias("2028-02-28", 1)).toBe("2028-02-29");
  });
});

describe("filtros", () => {
  const lista = [
    ficha({ id: "a", cliente: "Alpina",  tipo: "division", estado: "borrador",      ordenProduccion: 3, fechaEntrega: "2026-08-20" }),
    ficha({ id: "b", cliente: "Colanta", tipo: "sello",    estado: "en_produccion", ordenProduccion: 1, fechaEntrega: "2026-09-30" }),
    ficha({ id: "c", cliente: "Nutresa", tipo: "division", estado: "terminado",     ordenProduccion: 2, fechaEntrega: "2026-08-10" }),
  ];
  const idx = indexar(lista);
  const ids = (r) => r.map((f) => f.id);

  it("busca sin tildes y sin distinguir mayúsculas", () => {
    expect(normalizar("División Térmica")).toBe("division termica");
    expect(ids(filtrar(idx, { ...FILTROS_INICIALES, texto: "DIVISION" }, HOY)).sort()).toEqual(["a", "c"]);
  });

  it("cruza estado, tipo y cliente", () => {
    expect(ids(filtrar(idx, { ...FILTROS_INICIALES, estado: "borrador" }, HOY))).toEqual(["a"]);
    expect(ids(filtrar(idx, { ...FILTROS_INICIALES, tipo: "sello" }, HOY))).toEqual(["b"]);
    expect(ids(filtrar(idx, { ...FILTROS_INICIALES, cliente: "Nutresa" }, HOY))).toEqual(["c"]);
  });

  it("«solo con alerta» deja fuera lo que ya salió aunque esté vencido", () => {
    // "c" está vencida en fecha pero terminada: no es una alerta.
    expect(ids(filtrar(idx, { ...FILTROS_INICIALES, soloAlerta: true }, HOY))).toEqual(["a"]);
  });

  it("descarta la ficha sin la fecha por la que se está filtrando", () => {
    const sinFecha = indexar([ficha({ id: "z", fechaEntrega: "" })]);
    const rango = { ...FILTROS_INICIALES, campoFecha: "fechaEntrega", desde: "2026-01-01" };
    expect(filtrar(sinFecha, rango, HOY)).toEqual([]);
  });

  it("sabe cuándo hay filtros puestos", () => {
    expect(hayFiltrosActivos(FILTROS_INICIALES)).toBe(false);
    expect(hayFiltrosActivos({ ...FILTROS_INICIALES, soloAlerta: true })).toBe(true);
    expect(hayFiltrosActivos({ ...FILTROS_INICIALES, texto: "x" })).toBe(true);
  });

  it("lista los clientes presentes, sin repetir y ordenados", () => {
    expect(clientesDe([...lista, ficha({ cliente: "Alpina" }), ficha({ cliente: "" })]))
      .toEqual(["Alpina", "Colanta", "Nutresa"]);
  });
});

describe("detalle de la ficha", () => {
  // Es el dato con el que se pide una orden de viva voz en planta, así que el
  // buscador tiene que encontrarla por él.
  const fichas = indexar([
    ficha({ id: "a", nombreFicha: "Muelle 7" }),
    ficha({ id: "b", nombreFicha: "Zona Norte" }),
  ]);

  it("encuentra la ficha por su detalle", () => {
    const hallada = filtrar(fichas, { ...FILTROS_INICIALES, texto: "muelle" }, HOY);
    expect(hallada.map((f) => f.id)).toEqual(["a"]);
  });

  it("busca sin tildes ni mayúsculas, como el resto del campo", () => {
    const hallada = filtrar(fichas, { ...FILTROS_INICIALES, texto: "ZONA" }, HOY);
    expect(hallada.map((f) => f.id)).toEqual(["b"]);
  });
});

describe("orden y agrupación", () => {
  const lista = [
    ficha({ id: "a", ordenProduccion: 3, cliente: "Zeta",  fechaEntrega: "2026-09-30" }),
    ficha({ id: "b", ordenProduccion: 1, cliente: "Alpha", fechaEntrega: "" }),
    ficha({ id: "c", ordenProduccion: 2, cliente: "Media", fechaEntrega: "2026-08-05" }),
  ];
  const ids = (r) => r.map((f) => f.id);

  it("ordena por consecutivo en ambos sentidos", () => {
    expect(ids(ordenar(lista, "recientes"))).toEqual(["a", "c", "b"]);
    expect(ids(ordenar(lista, "antiguas"))).toEqual(["b", "c", "a"]);
  });

  it("manda al final las que no tienen fecha de entrega", () => {
    expect(ids(ordenar(lista, "entrega"))).toEqual(["c", "a", "b"]);
  });

  it("no muta la lista que recibe", () => {
    const original = [...lista];
    ordenar(lista, "cliente");
    expect(lista).toEqual(original);
  });

  it("siempre devuelve las cuatro columnas, aunque estén vacías", () => {
    const grupos = agruparPorEstado([ficha({ estado: "en_produccion" })]);
    expect(Object.keys(grupos)).toEqual(["borrador", "en_produccion", "terminado", "entregado"]);
    expect(grupos.en_produccion).toHaveLength(1);
    expect(grupos.borrador).toEqual([]);
  });

  it("trata un estado corrupto como borrador en vez de perder la ficha", () => {
    const grupos = agruparPorEstado([ficha({ estado: "vaya_usted_a_saber" })]);
    expect(grupos.borrador).toHaveLength(1);
  });
});

describe("métricas", () => {
  it("cuenta por estado y por urgencia de entrega", () => {
    const m = metricas([
      ficha({ estado: "borrador",      fechaEntrega: "2026-08-01" }),
      ficha({ estado: "en_produccion", fechaEntrega: HOY }),
      ficha({ estado: "en_produccion", fechaEntrega: "2026-08-30" }),
      ficha({ estado: "terminado",     fechaEntrega: "2026-01-01" }),
      ficha({ estado: "entregado" }),
    ], HOY);
    expect(m.total).toBe(5);
    expect(m.porEstado).toEqual({ borrador: 1, en_produccion: 2, terminado: 1, entregado: 1 });
    expect(m.vencidas).toBe(1);
    expect(m.paraHoy).toBe(1);
    expect(m.proximas).toBe(1);
  });
});

describe("fechas de Firestore", () => {
  it("entiende Timestamp, Date y texto ISO", () => {
    const d = new Date(2026, 7, 28, 15, 30);
    expect(claveDia(d)).toBe(HOY);
    expect(claveDia({ toDate: () => d })).toBe(HOY);
    expect(claveDia("2026-08-28")).toBe(HOY);
    expect(claveDia(null)).toBe("");
  });
});
