import { describe, it, expect } from "vitest";
import { liquidarDocumentos } from "./cartera";
import {
  METAS_DISTRIBUIDOR,
  NIVEL_LEJOS,
  NIVEL_LISTO,
  candidatosDistribuidor,
  cantidadLegible,
  construirPanelClientes,
  costoDescuentoDistribuidor,
  etiquetaProducto,
  evaluarDistribuidor,
  filtrarClientes,
  ordenarClientes,
  repartirNeto,
  serieDelAnio,
} from "./clientes";

const factura = (extra = {}) => ({
  id: "d1",
  tipo: "factura",
  numero: "J-1001",
  fecha: "2026-03-04",
  fechaVencimiento: "2026-04-03",
  empresaId: "e1",
  clienteNombre: "AXIONLOG COLOMBIA S.A.S.",
  clienteNit: "9001234567",
  items: [{ producto: "Puertas Rápidas", cantidad: 1, unidad: "und", valorUnitario: 10_000_000 }],
  ivaPorcentaje: 19,
  retenciones: [],
  ...extra,
});

const abono = (extra = {}) => ({
  id: "p1",
  fecha: "2026-04-01",
  valor: 1_000_000,
  empresaId: "e1",
  clienteNombre: "AXIONLOG COLOMBIA S.A.S.",
  aplicaciones: [{ tipo: "documento", id: "d1", valor: 1_000_000 }],
  ...extra,
});

const panel = (docs, pagos = [], empresas = [], hoy = "2026-05-01") =>
  construirPanelClientes(liquidarDocumentos(docs, pagos, hoy), pagos, empresas, { hoy });

describe("etiquetaProducto", () => {
  it("unifica el concepto escrito a mano con el del catálogo", () => {
    expect(etiquetaProducto("PUERTA RAPIDA")).toBe("Puertas Rápidas");
    expect(etiquetaProducto("puertas rapidas")).toBe("Puertas Rápidas");
    expect(etiquetaProducto("PUERTA RAPIDA 3000X3000 CON RADAR")).toBe("Puertas Rápidas");
  });

  it("prefiere la coincidencia más específica", () => {
    expect(etiquetaProducto("ABRIGO RETRACTIL INFLABLE")).toBe("Abrigo Retráctil Inflable");
  });

  it("deja pasar lo que no está en el catálogo", () => {
    expect(etiquetaProducto("Repuesto lona 3,2 m")).toBe("Repuesto lona 3,2 m");
    expect(etiquetaProducto("")).toBe("Sin concepto");
  });
});

describe("repartirNeto", () => {
  it("reparte el neto entre las líneas según lo que pesa cada una", () => {
    const doc = factura({
      items: [
        { producto: "Puertas Rápidas", cantidad: 1, valorUnitario: 3_000_000 },
        { producto: "Sello de Andén", cantidad: 1, valorUnitario: 1_000_000 },
      ],
      neto: 4_000_000,
    });
    const lineas = repartirNeto({ ...doc, resumen: { neto: 4_000_000 } });
    expect(lineas.map((l) => l.valor)).toEqual([3_000_000, 1_000_000]);
  });

  it("no pierde el neto de una factura importada sin valor unitario", () => {
    const lineas = repartirNeto({
      items: [{ producto: "Puertas Rápidas", cantidad: 0, valorUnitario: 0 }],
      resumen: { neto: 5_000_000 },
    });
    expect(lineas[0].valor).toBe(5_000_000);
  });
});

describe("construirPanelClientes", () => {
  it("suma ventas, facturas y saldo por cliente", () => {
    const { clientes, totales } = panel(
      [factura(), factura({ id: "d2", numero: "J-1002", fecha: "2026-04-10", neto: 5_000_000 })],
      [abono()]
    );
    expect(clientes).toHaveLength(1);
    const [c] = clientes;
    expect(c.facturas).toBe(2);
    expect(c.facturado).toBe(16_900_000); // 10M + 19 % de IVA, más los 5M de la segunda
    expect(c.abonado).toBe(1_000_000);
    expect(c.saldo).toBe(15_900_000);
    expect(totales.activos).toBe(1);
    expect(c.participacion).toBe(100);
  });

  it("resta la nota crédito de las ventas del cliente", () => {
    const { clientes } = panel([
      factura({ neto: 10_000_000, ivaPorcentaje: 0 }),
      factura({ id: "d2", tipo: "nota_credito", numero: "NC-1", neto: 2_000_000, ivaPorcentaje: 0, docAfectadoId: "d1" }),
    ]);
    expect(clientes[0].facturado).toBe(8_000_000);
    expect(clientes[0].facturas).toBe(1);
    expect(clientes[0].notas).toBe(1);
  });

  it("la nota crédito enlazada no deja saldo y la suelta lo descuenta", () => {
    const conEnlace = panel([
      factura({ neto: 10_000_000, ivaPorcentaje: 0 }),
      factura({ id: "d2", tipo: "nota_credito", numero: "NC-1", neto: 2_000_000, ivaPorcentaje: 0, docAfectadoId: "d1" }),
    ]);
    // La nota ya bajó el saldo de su factura: contarla otra vez lo restaría dos veces.
    expect(conEnlace.clientes[0].saldo).toBe(8_000_000);

    const suelta = panel([
      factura({ neto: 10_000_000, ivaPorcentaje: 0 }),
      factura({ id: "d2", tipo: "nota_credito", numero: "NC-2", neto: 2_000_000, ivaPorcentaje: 0 }),
    ]);
    expect(suelta.clientes[0].saldo).toBe(8_000_000);
  });

  it("el abono aplicado a una nota crédito vuelve a ser anticipo", () => {
    const { clientes } = panel(
      [
        factura({ neto: 1_000_000, ivaPorcentaje: 0 }),
        factura({ id: "d2", tipo: "nota_credito", numero: "NC-1", neto: 500_000, ivaPorcentaje: 0, docAfectadoId: "d1" }),
      ],
      [abono({ valor: 300_000, aplicaciones: [{ tipo: "documento", id: "d2", valor: 300_000 }] })]
    );
    const [c] = clientes;
    expect(c.anticipos).toBe(300_000);
    expect(c.abonado).toBe(0);
    // Y no cuenta como historia de pago: no pagó ninguna factura con eso.
    expect(c.diasPago).toBeNull();
  });

  it("toma el nombre y el alias de la base de clientes", () => {
    const { clientes } = panel([factura({ clienteNombre: "AXIONLOG" })], [], [
      { id: "e1", nombre: "AXIONLOG COLOMBIA S.A.S.", alias: "AXION", ciudad: "Funza" },
    ]);
    expect(clientes[0].nombre).toBe("AXIONLOG COLOMBIA S.A.S.");
    expect(clientes[0].alias).toBe("AXION");
    expect(clientes[0].ciudad).toBe("Funza");
  });

  it("separa al cliente que todavía no cuelga de una empresa", () => {
    const { clientes } = panel([factura(), factura({ id: "d2", empresaId: "", clienteNombre: "Cliente suelto", clienteNit: "" })]);
    expect(clientes).toHaveLength(2);
    expect(clientes.some((c) => !c.vinculado)).toBe(true);
  });

  it("mide cómo paga: días, mora y puntualidad ponderados por valor", () => {
    const { clientes } = panel(
      [factura({ neto: 1_000_000, ivaPorcentaje: 0 })],
      [abono({ fecha: "2026-04-13", valor: 1_000_000 })] // vencía el 03/04
    );
    const [c] = clientes;
    expect(c.diasPago).toBe(40);
    expect(c.moraPromedio).toBe(10);
    expect(c.puntualidad).toBe(0);
  });

  it("cuenta como puntual el abono que llega antes del vencimiento", () => {
    const { clientes } = panel(
      [factura({ neto: 1_000_000, ivaPorcentaje: 0 })],
      [abono({ fecha: "2026-03-20", valor: 1_000_000 })]
    );
    expect(clientes[0].puntualidad).toBe(100);
    expect(clientes[0].moraPromedio).toBe(0);
  });

  it("guarda como anticipo el abono que no se aplicó a ninguna factura", () => {
    const { clientes } = panel([factura()], [abono({ valor: 3_000_000, aplicaciones: [] })]);
    expect(clientes[0].anticipos).toBe(3_000_000);
  });

  it("agrupa el mix de productos aunque el concepto venga escrito distinto", () => {
    const { productos } = panel([
      factura({ items: [{ producto: "PUERTA RAPIDA", cantidad: 1, valorUnitario: 1_000_000 }], neto: 1_000_000, ivaPorcentaje: 0 }),
      factura({ id: "d2", items: [{ producto: "Puertas Rápidas", cantidad: 2, valorUnitario: 500_000 }], neto: 1_000_000, ivaPorcentaje: 0 }),
    ]);
    expect(productos).toHaveLength(1);
    expect(productos[0]).toMatchObject({ producto: "Puertas Rápidas", valor: 2_000_000, cantidad: 3 });
  });

  it("deja fuera la factura anulada", () => {
    const { totales } = panel([factura({ anulado: true })]);
    expect(totales.facturado).toBe(0);
  });

  it("mide la frecuencia y los días sin comprar", () => {
    const { clientes } = panel([
      factura({ fecha: "2026-01-01" }),
      factura({ id: "d2", fecha: "2026-03-01" }),
      factura({ id: "d3", fecha: "2026-04-01" }),
    ]);
    expect(clientes[0].frecuenciaDias).toBe(45);
    expect(clientes[0].diasSinComprar).toBe(30);
  });
});

describe("cantidadLegible", () => {
  it("dice cuánto llevó cuando la unidad es una sola", () => {
    expect(cantidadLegible({ unidades: { und: 8 } })).toBe("8 und");
    expect(cantidadLegible({ unidades: { m: 16.2 } })).toBe("16.2 m");
  });

  it("calla cuando la línea mezcla unidades o no tiene ninguna", () => {
    expect(cantidadLegible({ unidades: { und: 3, m: 12 } })).toBe("");
    expect(cantidadLegible({})).toBe("");
  });
});

describe("serieDelAnio", () => {
  it("rellena los meses sin ventas", () => {
    const serie = serieDelAnio([{ mes: "2026-03", valor: 500 }], 2026);
    expect(serie).toHaveLength(12);
    expect(serie[2]).toMatchObject({ etiqueta: "Mar", valor: 500 });
    expect(serie[6].valor).toBe(0);
  });
});

describe("evaluarDistribuidor", () => {
  const cliente = {
    facturado: 100_000_000,
    mesesActivos: 6,
    vencido: 0,
    valorPagado: 90_000_000,
    puntualidad: 100,
    moraPromedio: 0,
    productos: [{ producto: "Puertas Rápidas", valor: 80_000_000, facturas: 6, cantidad: 8 }],
  };

  it("aprueba al que compra volumen, vuelve y paga", () => {
    const ev = evaluarDistribuidor(cliente, "Puertas Rápidas");
    expect(ev.nivel).toBe(NIVEL_LISTO);
    expect(ev.puntaje).toBeGreaterThanOrEqual(75);
    expect(ev.reparos).toHaveLength(0);
  });

  it("frena al que compra mucho pero debe plata vencida", () => {
    const ev = evaluarDistribuidor({ ...cliente, vencido: 20_000_000, puntualidad: 20, moraPromedio: 60 }, "Puertas Rápidas");
    expect(ev.nivel).toBe(NIVEL_LEJOS);
    expect(ev.puntaje).toBeLessThan(50);
    expect(ev.reparos).toContain("Tiene cartera vencida sin pagar.");
  });

  it("el mal pago pesa más que cualquier otra cosa buena", () => {
    const bueno = evaluarDistribuidor(cliente, "Puertas Rápidas");
    const moroso = evaluarDistribuidor({ ...cliente, vencido: 1, puntualidad: 0, moraPromedio: 90 }, "Puertas Rápidas");
    // Mismo volumen, misma recurrencia, mismo enfoque: solo cambia cómo paga.
    expect(moroso.puntaje).toBeLessThan(bueno.puntaje / 2);
  });

  it("no premia una obra única por grande que sea", () => {
    const ev = evaluarDistribuidor(
      { ...cliente, mesesActivos: 1, productos: [{ producto: "Puertas Rápidas", valor: 80_000_000, facturas: 1 }] },
      "Puertas Rápidas"
    );
    expect(ev.nivel).not.toBe(NIVEL_LISTO);
    expect(ev.reparos.join(" ")).toContain("1 vez");
  });

  it("deja a mitad de tabla al que todavía no tiene abonos registrados", () => {
    const sinPagos = evaluarDistribuidor({ ...cliente, valorPagado: 0, puntualidad: null, moraPromedio: null }, "Puertas Rápidas");
    expect(sinPagos.pago.valor).toBe(0.5);
    expect(sinPagos.pago.sinHistoria).toBe(true);
  });

  it("da cero al producto que el cliente nunca compró", () => {
    const ev = evaluarDistribuidor(cliente, "Sello de Andén");
    expect(ev.valor).toBe(0);
    expect(ev.nivel).toBe(NIVEL_LEJOS);
  });

  it("cuantifica lo que cuesta el descuento", () => {
    // Facturar a 1,00 lo que hoy se factura a 1,15 son ~13 puntos menos.
    expect(costoDescuentoDistribuidor(11_500_000)).toBe(1_500_000);
    expect(evaluarDistribuidor(cliente, "Puertas Rápidas").costoDescuento).toBeGreaterThan(0);
  });

  it("respeta las metas que se le pasen", () => {
    const exigente = evaluarDistribuidor(cliente, "Puertas Rápidas", { ...METAS_DISTRIBUIDOR, valor: 500_000_000 });
    expect(exigente.puntaje).toBeLessThan(evaluarDistribuidor(cliente, "Puertas Rápidas").puntaje);
  });
});

describe("candidatosDistribuidor", () => {
  const clientes = [
    {
      nombre: "Compra mucho",
      facturado: 100_000_000,
      mesesActivos: 6,
      vencido: 0,
      valorPagado: 100_000_000,
      puntualidad: 100,
      moraPromedio: 0,
      productos: [{ producto: "Puertas Rápidas", valor: 90_000_000, facturas: 6 }],
    },
    {
      nombre: "Compra poco",
      facturado: 5_000_000,
      mesesActivos: 1,
      vencido: 0,
      valorPagado: 0,
      productos: [{ producto: "Puertas Rápidas", valor: 5_000_000, facturas: 1 }],
    },
    {
      nombre: "Otro producto",
      facturado: 50_000_000,
      mesesActivos: 5,
      vencido: 0,
      valorPagado: 50_000_000,
      productos: [{ producto: "Sello de Andén", valor: 50_000_000, facturas: 5 }],
    },
  ];

  it("solo propone a quien ya compra el producto, y del mejor al peor", () => {
    const lista = candidatosDistribuidor(clientes, "Puertas Rápidas");
    expect(lista.map((c) => c.cliente.nombre)).toEqual(["Compra mucho", "Compra poco"]);
    expect(lista[0].evaluacion.puntaje).toBeGreaterThan(lista[1].evaluacion.puntaje);
  });

  it("sin producto elegido no propone nada", () => {
    expect(candidatosDistribuidor(clientes, "")).toEqual([]);
  });
});

describe("filtros y orden", () => {
  const clientes = [
    { nombre: "Alpina", alias: "", nit: "800", ciudad: "Bogotá", saldo: 0, facturado: 10, ultimaCompra: "2026-01-01", porMes: { "2026-01": 10 }, productos: [{ producto: "Sello de Andén", valor: 10 }] },
    { nombre: "Colanta", alias: "COL", nit: "900", ciudad: "Medellín", saldo: 500, facturado: 5, ultimaCompra: "2026-04-01", porMes: { "2026-04": 5 }, productos: [{ producto: "Puertas Rápidas", valor: 5 }] },
  ];

  it("busca sin tildes por nombre, alias, NIT o ciudad", () => {
    expect(filtrarClientes(clientes, { busqueda: "medellin" })).toHaveLength(1);
    expect(filtrarClientes(clientes, { busqueda: "col" })).toHaveLength(1);
    expect(filtrarClientes(clientes, { busqueda: "bogota alpina" })).toHaveLength(1);
  });

  it("filtra por producto, por mes y por saldo", () => {
    expect(filtrarClientes(clientes, { producto: "Puertas Rápidas" })[0].nombre).toBe("Colanta");
    expect(filtrarClientes(clientes, { mes: "2026-01" })[0].nombre).toBe("Alpina");
    expect(filtrarClientes(clientes, { soloConSaldo: true })[0].nombre).toBe("Colanta");
  });

  it("ordena por la columna pedida", () => {
    expect(ordenarClientes(clientes, "saldo")[0].nombre).toBe("Colanta");
    expect(ordenarClientes(clientes, "facturado")[0].nombre).toBe("Alpina");
    expect(ordenarClientes(clientes, "reciente")[0].nombre).toBe("Colanta");
    expect(ordenarClientes(clientes, "nombre")[0].nombre).toBe("Alpina");
  });
});
