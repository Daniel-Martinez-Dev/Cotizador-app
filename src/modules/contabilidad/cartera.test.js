import { describe, it, expect } from "vitest";
import {
  agruparNotasCredito,
  anticiposPorCliente,
  aplicacionesPorDestino,
  aniosConMovimiento,
  claveCliente,
  coincideBusqueda,
  construirCartera,
  filtrarDocumentos,
  liquidarDocumentos,
  totalesDocumentos,
} from "./cartera";

const HOY = "2026-09-01";

// Un abono es del cliente y se reparte entre facturas; este ayudante arma el
// caso corriente: todo el valor a una sola.
const abono = (documentoId, valor, extra = {}) => ({
  id: `p-${documentoId}-${valor}`,
  empresaId: "emp1",
  fecha: "2026-02-01",
  valor,
  aplicaciones: [{ tipo: "documento", id: documentoId, valor }],
  ...extra,
});

const fact = (id, extra = {}) => ({
  id,
  tipo: "factura",
  numero: id,
  fecha: "2026-01-10",
  plazoDias: 30,
  empresaId: "emp1",
  clienteNombre: "Axionlog S.A.S.",
  neto: 1_000_000,
  items: [{ producto: "Puertas Rápidas", cantidad: 1, valorUnitario: 840_336 }],
  ...extra,
});

describe("claveCliente", () => {
  it("agrupa por el id de la empresa cuando lo hay", () => {
    expect(claveCliente({ empresaId: "emp1", clienteNombre: "Axionlog" })).toBe("id:emp1");
  });

  it("cae al nombre normalizado para lo importado sin vincular", () => {
    const a = claveCliente({ clienteNombre: "ALIMENTOS CÁRNICOS" });
    const b = claveCliente({ clienteNombre: "alimentos carnicos " });
    expect(a).toBe(b);
  });
});

describe("agrupaciones", () => {
  it("abre las aplicaciones de cada abono e ignora las que no apuntan a nada", () => {
    const mapa = aplicacionesPorDestino([
      abono("f1", 10),
      abono("f1", 20),
      abono("f2", 5),
      { id: "p9", valor: 99, aplicaciones: [] },
      { id: "p8", valor: 99, aplicaciones: [{ tipo: "documento", valor: 99 }] },
    ]);
    expect(mapa.get("documento:f1")).toHaveLength(2);
    expect(mapa.get("documento:f2")).toHaveLength(1);
    expect(mapa.size).toBe(2);
  });

  it("un abono que cubre dos facturas cuenta en las dos", () => {
    const mapa = aplicacionesPorDestino([{
      id: "p1", valor: 1000,
      aplicaciones: [
        { tipo: "documento", id: "f1", valor: 400 },
        { tipo: "documento", id: "f2", valor: 600 },
      ],
    }]);
    expect(mapa.get("documento:f1")[0].valor).toBe(400);
    expect(mapa.get("documento:f2")[0].valor).toBe(600);
  });

  it("separa los abonos hechos contra un arrastre de 2025", () => {
    const mapa = aplicacionesPorDestino([{
      id: "p1", valor: 500, aplicaciones: [{ tipo: "saldo", id: "s1", valor: 500 }],
    }]);
    expect(mapa.get("saldo:s1")[0].valor).toBe(500);
    expect(mapa.get("documento:s1")).toBeUndefined();
  });

  it("lo que no se imputó queda como anticipo del cliente", () => {
    const mapa = anticiposPorCliente([
      { id: "p1", empresaId: "emp1", valor: 1000, aplicaciones: [{ tipo: "documento", id: "f1", valor: 700 }] },
      { id: "p2", empresaId: "emp1", valor: 200, aplicaciones: [] },
    ]);
    expect(mapa.get("id:emp1")).toBe(500);
  });

  it("solo agrupa las notas crédito que apuntan a una factura", () => {
    const mapa = agruparNotasCredito([
      { id: "nc1", tipo: "nota_credito", docAfectadoId: "f1" },
      { id: "nc2", tipo: "nota_credito" },
      { id: "nc3", tipo: "nota_credito", docAfectadoId: "f1", anulado: true },
      { id: "f1", tipo: "factura" },
    ]);
    expect(mapa.get("f1")).toHaveLength(1);
    expect(mapa.size).toBe(1);
  });
});

describe("construirCartera", () => {
  it("suma neto, abonos y saldo por cliente", () => {
    const { clientes, totales } = construirCartera(
      [fact("f1"), fact("f2", { neto: 500_000 })],
      [abono("f1", 400_000)],
      { hoy: HOY }
    );
    expect(clientes).toHaveLength(1);
    expect(clientes[0]).toMatchObject({ neto: 1_500_000, abonado: 400_000, saldo: 1_100_000 });
    expect(totales.saldo).toBe(1_100_000);
    expect(totales.clientesConSaldo).toBe(1);
  });

  it("el saldo de años anteriores entra aparte y no como una factura del año", () => {
    const { clientes, totales } = construirCartera(
      [fact("f1")],
      [],
      { saldosIniciales: [{ empresaId: "emp1", clienteNombre: "Axionlog", anio: 2025, valor: 250_000 }], hoy: HOY }
    );
    expect(clientes[0].neto).toBe(1_000_000);
    expect(clientes[0].saldoInicial).toBe(250_000);
    expect(clientes[0].saldo).toBe(1_250_000);
    expect(totales.saldoInicial).toBe(250_000);
  });

  it("una nota crédito aplicada no resta dos veces", () => {
    const nc = { id: "nc1", tipo: "nota_credito", fecha: "2026-02-01", empresaId: "emp1", clienteNombre: "Axionlog", neto: 300_000, docAfectadoId: "f1" };
    const { clientes } = construirCartera([fact("f1"), nc], [], { hoy: HOY });
    expect(clientes[0].saldo).toBe(700_000);
    // La nota cancela su valor contra el de la factura, también en lo facturado.
    expect(clientes[0].neto).toBe(700_000);
  });

  // La razón de ser de la nota crédito: anular la factura. Con la factura y la
  // nota por el mismo valor el cliente queda en cero, no debiendo la nota.
  it("una nota crédito por el valor de la factura la deja en cero", () => {
    const nc = { id: "nc1", tipo: "nota_credito", fecha: "2026-02-01", empresaId: "emp1", clienteNombre: "Axionlog", neto: 1_000_000, docAfectadoId: "f1" };
    const { clientes, totales } = construirCartera([fact("f1"), nc], [], { hoy: HOY });
    expect(clientes[0].saldo).toBe(0);
    expect(clientes[0].neto).toBe(0);
    expect(clientes[0].vencido).toBe(0);
    expect(clientes[0].saldado).toBe(true);
    expect(totales.clientesConSaldo).toBe(0);
  });

  it("una nota crédito nunca queda pendiente ni vencida", () => {
    // Vieja de un año: con el plazo de 30 días habría figurado en mora.
    const nc = { id: "nc1", tipo: "nota_credito", fecha: "2025-09-01", plazoDias: 30, empresaId: "emp1", clienteNombre: "Axionlog", neto: 400_000, docAfectadoId: "f1" };
    const [factura, nota] = liquidarDocumentos([fact("f1"), nc], [], HOY);
    expect(nota.resumen.estado).toBe("aplicada");
    expect(nota.resumen.saldo).toBe(0);
    expect(nota.resumen.vencida).toBe(false);
    expect(nota.resumen.credito).toBe(400_000);
    expect(factura.resumen.saldo).toBe(600_000);
  });

  // Se podían registrar abonos sobre una nota crédito. Esa plata entró al
  // banco, así que no se puede perder: queda como anticipo del cliente.
  it("un abono aplicado a una nota crédito vuelve a ser anticipo del cliente", () => {
    const nc = { id: "nc1", tipo: "nota_credito", fecha: "2026-02-01", empresaId: "emp1", clienteNombre: "Axionlog S.A.S.", neto: 300_000, docAfectadoId: "f1" };
    const { clientes } = construirCartera([fact("f1"), nc], [abono("nc1", 300_000)], { hoy: HOY });
    expect(clientes[0].anticipos).toBe(300_000);
    expect(clientes[0].abonado).toBe(0);
    // 1.000.000 − 300.000 de la nota − 300.000 de anticipo.
    expect(clientes[0].saldo).toBe(400_000);
  });

  it("una nota crédito general del cliente sí resta por su cuenta", () => {
    const nc = { id: "nc1", tipo: "nota_credito", fecha: "2026-02-01", empresaId: "emp1", clienteNombre: "Axionlog", neto: 300_000 };
    const { clientes } = construirCartera([fact("f1"), nc], [], { hoy: HOY });
    expect(clientes[0].saldo).toBe(700_000);
    expect(clientes[0].neto).toBe(700_000);
  });

  it("deja fuera de la cartera los documentos anulados", () => {
    const { clientes } = construirCartera([fact("f1"), fact("f2", { anulado: true })], [], { hoy: HOY });
    expect(clientes[0].saldo).toBe(1_000_000);
  });

  it("clasifica el saldo por edad de mora", () => {
    const { clientes } = construirCartera(
      [
        fact("f1", { fecha: "2026-08-25", neto: 100 }),   // aún no vence
        fact("f2", { fecha: "2026-07-15", neto: 200 }),   // 18 días vencida
        fact("f3", { fecha: "2026-01-10", neto: 300 }),   // más de 90
      ],
      [],
      { hoy: HOY }
    );
    expect(clientes[0].porRango).toMatchObject({ corriente: 100, d1_30: 200, d90: 300 });
    expect(clientes[0].vencido).toBe(500);
  });

  it("da por saldado al cliente cuyo saldo son residuos de centavos", () => {
    const { clientes, totales } = construirCartera(
      [fact("f1", { neto: 1_000_000 })],
      [abono("f1", 999_999.25)],
      { hoy: HOY }
    );
    expect(clientes[0].saldado).toBe(true);
    expect(totales.clientesConSaldo).toBe(0);
  });

  it("separa clientes distintos y ordena por saldo descendente", () => {
    const otra = fact("f9", { empresaId: "emp2", clienteNombre: "Colanta", neto: 5_000_000 });
    const { clientes } = construirCartera([fact("f1"), otra], [], { hoy: HOY });
    expect(clientes.map((c) => c.nombre)).toEqual(["Colanta", "Axionlog S.A.S."]);
  });
});

describe("totalesDocumentos", () => {
  it("resta las notas crédito del total facturado", () => {
    const liquidados = liquidarDocumentos(
      [
        fact("f1", { neto: null, items: [{ cantidad: 1, valorUnitario: 1_000_000 }], ivaPorcentaje: 19, retenciones: [] }),
        { id: "nc1", tipo: "nota_credito", fecha: "2026-02-01", items: [{ cantidad: 1, valorUnitario: 200_000 }], ivaPorcentaje: 19, retenciones: [] },
      ],
      [],
      HOY
    );
    const t = totalesDocumentos(liquidados);
    expect(t.subtotal).toBe(800_000);
    expect(t.iva).toBe(152_000);
    expect(t.cantidad).toBe(2);
  });

  // El listado sumaba el neto de la nota como saldo por cobrar en negativo, y
  // el "Por cobrar" del año quedaba por debajo de lo que la cartera decía.
  it("una factura anulada por su nota crédito no deja nada por cobrar", () => {
    const liquidados = liquidarDocumentos(
      [
        fact("f1"),
        { id: "nc1", tipo: "nota_credito", fecha: "2026-02-01", empresaId: "emp1", clienteNombre: "Axionlog S.A.S.", neto: 1_000_000, docAfectadoId: "f1" },
      ],
      [],
      HOY
    );
    const t = totalesDocumentos(liquidados);
    expect(t.saldo).toBe(0);
    expect(t.neto).toBe(0);
    expect(t.vencido).toBe(0);
  });
});

describe("filtros", () => {
  const liquidados = liquidarDocumentos(
    [
      fact("f1", { numero: "1001", fecha: "2026-01-10" }),
      fact("f2", { numero: "1002", fecha: "2025-06-05", clienteNombre: "Colanta", empresaId: "emp2", neto: 200 }),
    ],
    [abono("f2", 200, { empresaId: "emp2" })],
    HOY
  );

  it("busca por palabras sueltas en cualquier orden", () => {
    expect(coincideBusqueda(liquidados[0], "axionlog rapidas")).toBe(true);
    expect(coincideBusqueda(liquidados[0], "1001")).toBe(true);
    expect(coincideBusqueda(liquidados[0], "colanta")).toBe(false);
  });

  it("filtra por estado, año y empresa", () => {
    expect(filtrarDocumentos(liquidados, { estado: "pagada" }).map((d) => d.id)).toEqual(["f2"]);
    expect(filtrarDocumentos(liquidados, { anio: 2026 }).map((d) => d.id)).toEqual(["f1"]);
    expect(filtrarDocumentos(liquidados, { empresaId: "emp2" }).map((d) => d.id)).toEqual(["f2"]);
  });

  it("filtra por rango de fechas y por vencidas", () => {
    expect(filtrarDocumentos(liquidados, { desde: "2026-01-01" }).map((d) => d.id)).toEqual(["f1"]);
    expect(filtrarDocumentos(liquidados, { hasta: "2025-12-31" }).map((d) => d.id)).toEqual(["f2"]);
    expect(filtrarDocumentos(liquidados, { soloVencidas: true }).map((d) => d.id)).toEqual(["f1"]);
  });

  it("aísla los documentos sin cliente vinculado", () => {
    const sueltos = liquidarDocumentos(
      [fact("f3", { empresaId: "" }), fact("f4")],
      [],
      HOY
    );
    expect(filtrarDocumentos(sueltos, { soloSinVincular: true }).map((d) => d.id)).toEqual(["f3"]);
    expect(filtrarDocumentos(sueltos, {}).map((d) => d.id)).toEqual(["f3", "f4"]);
  });

  it("lista los años con movimiento del más reciente al más viejo", () => {
    expect(aniosConMovimiento(liquidados)).toEqual([2026, 2025]);
  });
});
