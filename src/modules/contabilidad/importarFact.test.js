import { describe, it, expect } from "vitest";
import {
  detectarSeparador,
  importarFact,
  interpretarFilas,
  limpiarNombreCliente,
  mapearColumnas,
  parsearCSV,
  parsearFechaCO,
  parsearNumeroCO,
  porcentajeIva,
} from "./importarFact";

// Las 28 columnas de la hoja FACT, en su orden real (A..AB). Tres de ellas se
// llaman BANCO y otras tres FECHA, que es justo lo que obliga a mapear los
// bloques de pago por posición y no por nombre.
const ENCABEZADO = [
  "MES", "FECHA", "CLIENTE", "No. FACT", "CANT", "CONCEPTO DEL GASTO", "OBSERVACIONES",
  "VALOR UNITARIO", "SUBTOTAL", "Rte ICA (Madrid)", "Rte IVA 15%", "RTE FTE 4%", "RTE FTE 2.5%",
  "IVA", "NETO A PAGAR", "ANTICIPO 1", "BANCO", "FECHA", "ANTICIPO 2", "BANCO", "FECHA",
  "ANTICIPO 3", "BANCO", "FECHA", "SALDO PENDIENTE", "ESTADO", "OBSERVACIONES2", "RETRASO",
].join(";");

const FACTURA = "MARZO;10/03/2026;AXIONLOG COLOMBIA S.A.S.;J-1024;2;PUERTAS RAPIDAS;Obra Funza;$ 5.000.000;$ 10.000.000;;;;$ 250.000;$ 1.900.000;$ 11.650.000;$ 5.000.000;DAVIVIENDA;15/03/2026;$ 3.000.000;CAJA SOCIAL;20/04/2026;;;;$ 3.650.000;DEBE;;-120";
const NOTA = "ABRIL;05/04/2026;AXIONLOG COLOMBIA S.A.S. NOTA CREDITO;J-1030;-4;SELLOS DE ANDEN;Devolucion;$ 1.000.000;$ 4.000.000;;;;$ 100.000;$ 760.000;$ 4.660.000;;;;;;;;;;$ 4.660.000;DEBE;;";
const ARRASTRE = "E.C CORTE 2025;;COLANTA S.A.;;;;SALDO PENDIENTE AÑO 2025;;;;;;;;$ 12.500.000;;;;;;;;;;$ 12.500.000;DEBE;;";
const TOTALES = ";;;;;;;;$ 2.029.903.084;;;;;;$ 2.536.366.772;$ 1.684.105.189;;;$ 611.716.877;;;$ 28.994.850;;;$ 211.549.856;;;";
const SIN_CLIENTE = "MAYO;12/05/2026;;J-1099;1;PUERTA RAPIDA;;$ 1.000.000;$ 1.000.000;;;;;$ 190.000;$ 1.190.000;;;;;;;;;;;;;";
const LONA = "JUNIO;01/06/2026;FRIGORIFICO S.A.S.;J-1101;16,2;LONA PVC;;$ 38.000;$ 615.000;;;;;$ 116.850;$ 731.850;;;;;;;;;;;;;";
const SIN_FECHA = "JULIO;;INDUSTRIAS X;J-1102;1;ABRIGO RETRACTIL;;$ 500.000;$ 500.000;;;;;$ 95.000;$ 595.000;;;;;;;;;;;;;";

const csv = (...filas) => [ENCABEZADO, ...filas].join("\n");

describe("parseo del archivo", () => {
  it("reconoce el punto y coma que exporta Excel en español", () => {
    expect(detectarSeparador("a;b;c\n1;2;3")).toBe(";");
    expect(detectarSeparador("a,b,c\n1,2,3")).toBe(",");
  });

  it("no se confunde con una coma dentro de comillas", () => {
    expect(detectarSeparador('"Alimentos, S.A.";b;c')).toBe(";");
  });

  it("respeta comillas, comillas dobladas y saltos de línea dentro de una celda", () => {
    const filas = parsearCSV('a;"Bogotá; D.C.";c\n1;"dice ""hola""";"linea1\nlinea2"');
    expect(filas[0]).toEqual(["a", "Bogotá; D.C.", "c"]);
    expect(filas[1]).toEqual(["1", 'dice "hola"', "linea1\nlinea2"]);
  });
});

describe("parsearNumeroCO", () => {
  it("lee el formato colombiano", () => {
    expect(parsearNumeroCO("$ 1.234.567,89")).toBe(1234567.89);
    expect(parsearNumeroCO("11.650.000")).toBe(11650000);
    expect(parsearNumeroCO("16,2")).toBe(16.2);
  });

  it("también lee el formato inglés", () => {
    expect(parsearNumeroCO("1,234,567.89")).toBe(1234567.89);
  });

  it("toma los paréntesis contables como negativo", () => {
    expect(parsearNumeroCO("(1.691,15)")).toBe(-1691.15);
    expect(parsearNumeroCO("-4")).toBe(-4);
  });

  it("devuelve 0 ante la basura que dejó el Excel", () => {
    expect(parsearNumeroCO("#¡DIV/0!")).toBe(0);
    expect(parsearNumeroCO(" $ 6 ")).toBe(6);
    expect(parsearNumeroCO("")).toBe(0);
    expect(parsearNumeroCO(undefined)).toBe(0);
    expect(parsearNumeroCO("N/A")).toBe(0);
  });
});

describe("parsearFechaCO", () => {
  it("lee día primero, como se escribe en Colombia", () => {
    expect(parsearFechaCO("10/03/2026")).toBe("2026-03-10");
    expect(parsearFechaCO("5-4-2026")).toBe("2026-04-05");
  });

  it("acepta ISO y años de dos dígitos", () => {
    expect(parsearFechaCO("2026-03-10")).toBe("2026-03-10");
    expect(parsearFechaCO("10/03/26")).toBe("2026-03-10");
  });

  it("convierte el número de serie de Excel", () => {
    expect(parsearFechaCO("46091")).toBe("2026-03-10");
  });

  it("devuelve vacío con lo que no es fecha", () => {
    expect(parsearFechaCO("")).toBe("");
    expect(parsearFechaCO("MARZO")).toBe("");
    expect(parsearFechaCO("45/13/2026")).toBe("");
  });
});

describe("mapearColumnas", () => {
  const mapa = mapearColumnas(ENCABEZADO.split(";"));

  it("la FECHA del documento es la primera, no la de un anticipo", () => {
    expect(mapa.campos.fecha).toBe(1);
  });

  it("ubica los tres bloques de pago con su banco y su fecha", () => {
    expect(mapa.bloquesPago).toEqual([
      { valor: 15, banco: 16, fecha: 17 },
      { valor: 18, banco: 19, fecha: 20 },
      { valor: 21, banco: 22, fecha: 23 },
    ]);
  });

  it("no confunde 'Rte IVA 15%' con la columna IVA", () => {
    expect(mapa.campos.iva).toBe(13);
    expect(mapa.campos.reteIva).toBe(10);
  });
});

describe("importarFact", () => {
  const r = importarFact(csv(FACTURA, NOTA, ARRASTRE, LONA, SIN_FECHA, SIN_CLIENTE, TOTALES));

  it("convierte una factura con sus retenciones, su IVA y su neto", () => {
    const f = r.documentos.find((d) => d.numero === "J-1024");
    expect(f).toMatchObject({
      tipo: "factura",
      fecha: "2026-03-10",
      clienteNombre: "AXIONLOG COLOMBIA S.A.S.",
      ivaPorcentaje: 19,
      neto: 11_650_000,
    });
    expect(f.items[0]).toMatchObject({ producto: "PUERTAS RAPIDAS", cantidad: 2, valorUnitario: 5_000_000 });
    expect(f.retenciones).toEqual([
      { codigo: "rte_fte_25", nombre: "Rte Fte 2,5 %", base: "manual", porcentaje: 0, valor: 250_000 },
    ]);
  });

  it("le pone fecha de vencimiento, que el Excel no tenía", () => {
    const f = r.documentos.find((d) => d.numero === "J-1024");
    expect(f.plazoDias).toBe(30);
    expect(f.fechaVencimiento).toBe("2026-04-09");
  });

  it("convierte los bloques ANTICIPO en pagos sueltos, con banco y fecha", () => {
    const f = r.documentos.find((d) => d.numero === "J-1024");
    expect(f.pagos).toEqual([
      { valor: 5_000_000, bancoNombre: "DAVIVIENDA", fecha: "2026-03-15", orden: 1 },
      { valor: 3_000_000, bancoNombre: "CAJA SOCIAL", fecha: "2026-04-20", orden: 2 },
    ]);
  });

  it("reconoce la nota crédito, le limpia el nombre al cliente y le quita el signo a la cantidad", () => {
    const nc = r.documentos.find((d) => d.numero === "J-1030");
    expect(nc.tipo).toBe("nota_credito");
    expect(nc.clienteNombre).toBe("AXIONLOG COLOMBIA S.A.S.");
    expect(nc.items[0].cantidad).toBe(4);
    expect(nc.neto).toBe(4_660_000);
  });

  it("el cliente de la nota crédito queda con el mismo nombre que el de su factura", () => {
    const [factura, nota] = ["J-1024", "J-1030"].map((n) => r.documentos.find((d) => d.numero === n));
    expect(nota.clienteNombre).toBe(factura.clienteNombre);
  });

  it("saca el saldo de 2025 de las facturas y lo deja como saldo inicial", () => {
    expect(r.saldosIniciales).toEqual([
      expect.objectContaining({ clienteNombre: "COLANTA S.A.", anio: 2025, valor: 12_500_000 }),
    ]);
    expect(r.documentos.some((d) => d.clienteNombre === "COLANTA S.A.")).toBe(false);
  });

  it("ignora la fila de totales del pie", () => {
    expect(r.documentos.some((d) => d.neto === 2_536_366_772)).toBe(false);
    expect(r.filasIgnoradas).toBe(1);
  });

  it("reporta la fila sin cliente como error, no la guarda a medias", () => {
    expect(r.errores).toEqual([{ fila: 7, mensaje: "La factura J-1099 no tiene cliente." }]);
    expect(r.documentos.some((d) => d.numero === "J-1099")).toBe(false);
  });

  it("avisa cuando cantidad × valor unitario no cuadra con el subtotal", () => {
    const lona = r.documentos.find((d) => d.numero === "J-1101");
    expect(lona.items[0].cantidad).toBe(16.2);
    expect(lona.avisos).toContain("Cantidad × valor unitario no da el subtotal de la hoja; se conserva el neto del Excel.");
    expect(lona.neto).toBe(731_850);
  });

  it("avisa de la factura sin fecha y la deja sin vencimiento", () => {
    const sf = r.documentos.find((d) => d.numero === "J-1102");
    expect(sf.fecha).toBe("");
    expect(sf.fechaVencimiento).toBe("");
    expect(sf.avisos[0]).toMatch(/Sin fecha/);
  });

  it("resume lo que se va a guardar antes de escribir nada", () => {
    expect(r.resumen).toMatchObject({
      // Tres facturas, no cuatro: la fila sin cliente se fue a errores.
      facturas: 3,
      notasCredito: 1,
      saldosIniciales: 1,
      pagos: 2,
      errores: 1,
      totalPagos: 8_000_000,
      totalSaldosIniciales: 12_500_000,
    });
    // Facturado neto del lote: las facturas menos la nota crédito.
    expect(r.resumen.totalNeto).toBe(11_650_000 + 731_850 + 595_000 - 4_660_000);
  });

  it("no guarda nada cuando no reconoce las columnas", () => {
    const malo = importarFact("hola;mundo\n1;2");
    expect(malo.documentos).toEqual([]);
    expect(malo.errores[0].mensaje).toMatch(/No se reconocieron las columnas/);
  });

  it("tolera el archivo vacío", () => {
    expect(importarFact("").errores[0].mensaje).toMatch(/vacío/);
  });
});

describe("más de tres pagos", () => {
  it("guarda todos los abonos, sin el tope de tres del Excel", () => {
    const encabezado = [
      "FECHA", "CLIENTE", "No. FACT", "CANT", "CONCEPTO", "VALOR UNITARIO", "SUBTOTAL", "IVA", "NETO A PAGAR",
      "ANTICIPO 1", "BANCO", "FECHA", "ANTICIPO 2", "BANCO", "FECHA",
      "ANTICIPO 3", "BANCO", "FECHA", "ANTICIPO 4", "BANCO", "FECHA",
    ].join(";");
    const fila = "10/03/2026;COLANTA S.A.;J-2000;1;PUERTA;$ 1.000.000;$ 1.000.000;$ 190.000;$ 1.190.000;$ 300.000;DAVIVIENDA;11/03/2026;$ 300.000;DAVIVIENDA;12/03/2026;$ 300.000;CAJA SOCIAL;13/03/2026;$ 290.000;CAJA SOCIAL;14/03/2026";
    const r = importarFact([encabezado, fila].join("\n"));
    expect(r.documentos[0].pagos).toHaveLength(4);
    expect(r.resumen.conMasDeTresPagos).toBe(1);
    expect(r.resumen.totalPagos).toBe(1_190_000);
  });
});

describe("porcentajeIva", () => {
  it("devuelve 19 cuando el valor del IVA cuadra con la tarifa", () => {
    expect(porcentajeIva(10_000_000, 1_900_000)).toBe(19);
  });

  it("respeta el exento", () => {
    expect(porcentajeIva(10_000_000, 0)).toBe(0);
  });

  it("no inventa una tarifa: si no cuadra, usa la efectiva", () => {
    expect(porcentajeIva(1_000_000, 50_000)).toBe(5);
  });
});

describe("limpiarNombreCliente", () => {
  it("quita el sufijo con que el Excel marcaba las notas crédito", () => {
    expect(limpiarNombreCliente("AXIONLOG COLOMBIA S.A.S. NOTA CREDITO")).toBe("AXIONLOG COLOMBIA S.A.S.");
    expect(limpiarNombreCliente("COLANTA - NOTA DE CRÉDITO")).toBe("COLANTA");
    expect(limpiarNombreCliente("  COLANTA   S.A.  ")).toBe("COLANTA S.A.");
  });

  it("no toca un nombre normal", () => {
    expect(limpiarNombreCliente("CREDITOS Y AHORROS S.A.")).toBe("CREDITOS Y AHORROS S.A.");
  });
});

describe("interpretarFilas", () => {
  it("numera las filas como en el Excel para poder señalar el error", () => {
    const mapa = mapearColumnas(ENCABEZADO.split(";"));
    const filas = parsearCSV([SIN_CLIENTE].join("\n"));
    const r = interpretarFilas(filas, mapa, { filaInicial: 341 });
    expect(r.errores[0].fila).toBe(341);
  });
});
