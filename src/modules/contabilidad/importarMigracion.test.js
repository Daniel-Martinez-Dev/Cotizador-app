import { describe, it, expect } from "vitest";
import {
  enlazarNotasCredito,
  importarMigracion,
  leerMigracion,
  mapearDocumento,
  mapearSaldos,
  repararJsonDeExcel,
} from "./importarMigracion";
import { sinAplicar } from "./calculos";

// Recorte fiel del archivo real: una factura normal, otra con el valor unitario
// borrado, una nota crédito, una nota débito y un arrastre de 2025.
const ARCHIVO = {
  meta: { periodo_detallado: 2026 },
  catalogos: { clientes: [{ id: 1, nombre: "ACL LOGISTICA SAS", aliases: [] }] },
  saldos_iniciales_2025: [
    { cliente_id: 1, cliente: "ACL LOGISTICA SAS", anio: 2025, valor_neto: 202300, observaciones: "SALDO PENDIENTE AÑO 2025", factura_referencia: null, fila_excel: 3 },
    { cliente_id: 2, cliente: "SIN VALOR SAS", anio: 2025, valor_neto: null, observaciones: "", factura_referencia: null, fila_excel: 8 },
  ],
  documentos: [
    {
      id: "2817", tipo: "FACTURA", numero: "2817", fecha_emision: "2026-02-10", cliente_id: 1,
      cliente: "ACL LOGISTICA SAS", producto: "PUERTAS RAPIDAS", descripcion: "oc 591",
      cantidad: 1, valor_unitario: 16105000, subtotal: 16105000, iva_19: 3059950,
      retenciones: [{ codigo: "RTE_FTE_2_5", nombre: "Retefuente 2.5%", valor: 402625, porcentaje: 0.025 }],
      neto_a_pagar: 18762325, fila_excel: 44,
    },
    {
      id: "2842", tipo: "FACTURA", numero: "2842", fecha_emision: "2026-03-02", cliente_id: 1,
      cliente: "ACL LOGISTICA SAS", producto: "PUERTAS RAPIDAS", descripcion: "9 puertas",
      cantidad: 9, valor_unitario: null, subtotal: 154420000, iva_19: 29339800,
      retenciones: [], neto_a_pagar: 183759800, fila_excel: 70,
    },
    {
      id: "J1592", tipo: "NOTA_CREDITO", numero: "J1592", fecha_emision: "2026-04-10", cliente_id: 1,
      cliente: "ACL LOGISTICA SAS", producto: "REPUESTOS - ACCESORIOS", descripcion: "OC 666",
      cantidad: -1, valor_unitario: 16105000, subtotal: -16105000, iva_19: -3059950,
      retenciones: [{ codigo: "RTE_FTE_2_5", nombre: "Retefuente 2.5%", valor: -402625, porcentaje: 0.025 }],
      neto_a_pagar: -18762325, fila_excel: 113,
    },
    {
      id: "D1501", tipo: "NOTA_DEBITO", numero: "D1501", fecha_emision: "2026-08-24", cliente_id: 1,
      cliente: "ACL LOGISTICA SAS", producto: "PUERTAS RAPIDAS", descripcion: "reajuste",
      cantidad: 1, valor_unitario: 6923.25, subtotal: 6923.25, iva_19: 1315.4175,
      retenciones: [], neto_a_pagar: 8238.6675, fila_excel: 253,
    },
  ],
  pagos: [
    { id: 1, documento_id: "SALDO-2025-1", cliente_id: 1, orden: 1, valor: 202300, banco: "DAVIVIENDA", fecha: "2026-02-23" },
    { id: 2, documento_id: "2817", cliente_id: 1, orden: 1, valor: 200000000, banco: "DAVIVIENDA", fecha: "2026-03-05" },
  ],
  totales_control: { documentos: 4, pagos: 2, clientes: 1, suma_neto_a_pagar: 183768038.6675, suma_pagos: 200202300, suma_saldos_iniciales_2025: 202300 },
};

const texto = JSON.stringify(ARCHIVO);

// El mismo texto tal como vuelve de pegarlo desde Excel: envuelto como celda de
// CSV, con las comillas dobladas y con una frontera de bloque partiendo un dato.
const comoDeExcel = (() => {
  const escapado = texto.replace(/"/g, '""');
  const corte = escapado.indexOf('""cliente_id"": 1');
  return `"${escapado.slice(0, corte + 5)}"\n   "${escapado.slice(corte + 5)}"`;
})();

describe("repararJsonDeExcel", () => {
  it("deshace el escapado de celda y las fronteras de bloque", () => {
    expect(JSON.parse(repararJsonDeExcel(comoDeExcel))).toEqual(ARCHIVO);
  });

  it("deja en paz un JSON que ya es válido", () => {
    expect(repararJsonDeExcel(texto)).toBe(texto);
  });

  it("no parte un dato al reunir los bloques", () => {
    // "DIVISIONES TERMICA" + "S" tiene que volver a ser "DIVISIONES TERMICAS".
    const partido = '"{""p"": ""DIVISIONES TERMICA"\n   "S""}"';
    expect(JSON.parse(repararJsonDeExcel(partido))).toEqual({ p: "DIVISIONES TERMICAS" });
  });
});

describe("leerMigracion", () => {
  it("reporta el error en vez de lanzar", () => {
    expect(leerMigracion("{ roto").error).toMatch(/No se pudo leer/);
    expect(leerMigracion('{"meta":{}}').error).toMatch(/documentos/);
  });
});

describe("mapearDocumento", () => {
  it("guarda los importes en positivo: el signo lo pone el tipo", () => {
    const nc = mapearDocumento(ARCHIVO.documentos[2], { periodo: 2026 });
    expect(nc.tipo).toBe("nota_credito");
    expect(nc.neto).toBe(18_762_325);
    expect(nc.items[0].cantidad).toBe(1);
    expect(nc.retenciones[0].valor).toBe(402_625);
  });

  it("reconoce la nota débito", () => {
    expect(mapearDocumento(ARCHIVO.documentos[3], { periodo: 2026 }).tipo).toBe("nota_debito");
  });

  it("deriva el valor unitario cuando el Excel lo dejó vacío", () => {
    const d = mapearDocumento(ARCHIVO.documentos[1], { periodo: 2026 });
    // 154.420.000 / 9 con dos decimales, que es como se guarda el dinero.
    expect(d.items[0].valorUnitario).toBe(17_157_777.78);
    expect(d.avisos[0]).toMatch(/Valor unitario derivado/);
  });

  it("mapea los códigos de retención a los del catálogo de la app", () => {
    const d = mapearDocumento(ARCHIVO.documentos[0], { periodo: 2026 });
    expect(d.retenciones[0]).toMatchObject({ codigo: "rte_fte_25", base: "manual", valor: 402_625 });
  });

  it("le pone vencimiento, que el Excel no tenía", () => {
    const d = mapearDocumento(ARCHIVO.documentos[0], { periodo: 2026, plazoDias: 30 });
    expect(d.fechaVencimiento).toBe("2026-03-12");
  });

  it("respeta la fecha real y reporta el documento en el periodo del libro", () => {
    const viejo = { ...ARCHIVO.documentos[0], fecha_emision: "2025-02-19" };
    const d = mapearDocumento(viejo, { periodo: 2026 });
    expect(d.fecha).toBe("2025-02-19");
    expect(d.periodoContable).toBe(2026);
    expect(d.avisos.join(" ")).toMatch(/Fecha de 2025 dentro del libro de 2026/);
  });

  it("avisa de la factura sin producto en vez de dejarla sin concepto", () => {
    const d = mapearDocumento({ ...ARCHIVO.documentos[0], producto: null, descripcion: "RAMPA NIVELADORA" }, { periodo: 2026 });
    expect(d.items[0].producto).toBe("RAMPA NIVELADORA");
    expect(d.avisos.join(" ")).toMatch(/Sin producto/);
  });
});

describe("enlazarNotasCredito", () => {
  it("enlaza la nota con la única factura del cliente que vale lo mismo", () => {
    const docs = ARCHIVO.documentos.map((f) => mapearDocumento(f, { periodo: 2026 }));
    const r = enlazarNotasCredito(docs);
    expect(r.enlazadas).toBe(1);
    expect(docs.find((d) => d.claveOrigen === "J1592").docAfectadoClave).toBe("2817");
  });

  it("no enlaza cuando hay dos candidatas: colgarla de la equivocada es peor", () => {
    const docs = [
      ...ARCHIVO.documentos.map((f) => mapearDocumento(f, { periodo: 2026 })),
      mapearDocumento({ ...ARCHIVO.documentos[0], id: "2818", numero: "2818" }, { periodo: 2026 }),
    ];
    const r = enlazarNotasCredito(docs);
    expect(r.enlazadas).toBe(0);
    expect(r.ambiguas[0]).toMatchObject({ nota: "J1592", candidatas: ["2817", "2818"] });
  });

  it("una nota sin factura que le corresponda queda suelta, no se inventa", () => {
    const docs = [mapearDocumento({ ...ARCHIVO.documentos[2], neto_a_pagar: -999 }, { periodo: 2026 })];
    const r = enlazarNotasCredito(docs);
    expect(r.sinEnlace).toEqual(["J1592"]);
    expect(docs[0].docAfectadoClave).toBe("");
  });
});

describe("mapearSaldos", () => {
  it("descarta los arrastres sin valor: no son saldo de nadie", () => {
    const s = mapearSaldos(ARCHIVO);
    expect(s).toHaveLength(1);
    expect(s[0]).toMatchObject({ clienteNombre: "ACL LOGISTICA SAS", anio: 2025, valor: 202_300 });
  });
});

describe("importarMigracion", () => {
  const r = importarMigracion(texto);

  it("cuadra contra los totales de control del archivo", () => {
    expect(r.ok).toBe(true);
    expect(r.resumen.cuadre).toEqual({
      documentos: true, pagos: true, neto: true, pagosValor: true, saldos: true,
    });
  });

  it("cubre primero el arrastre de 2025 y luego los cobrables por antigüedad", () => {
    const [arrastre, grande] = r.pagos;
    expect(arrastre.aplicaciones).toEqual([{ tipo: "saldo", id: "saldo:3", valor: 202_300 }]);
    // La 2817 quedó anulada por su nota crédito, así que no admite abono; la
    // nota débito sí, porque cobra de más y se cobra como una factura.
    expect(grande.aplicaciones).toEqual([
      { tipo: "documento", id: "2842", valor: 183_759_800 },
      { tipo: "documento", id: "D1501", valor: 8_238.67 },
    ]);
    expect(sinAplicar(grande)).toBe(16_231_961.33);
  });

  it("una factura anulada por su nota crédito no recibe abonos", () => {
    const aplicadoA2817 = r.pagos.flatMap((p) => p.aplicaciones).filter((a) => a.id === "2817");
    expect(aplicadoA2817).toEqual([]);
  });

  it("cuenta los tipos de documento por separado", () => {
    expect(r.resumen).toMatchObject({ facturas: 2, notasCredito: 1, notasDebito: 1, periodo: 2026 });
  });

  it("lee igual el archivo pegado desde Excel", () => {
    const desdeExcel = importarMigracion(comoDeExcel);
    expect(desdeExcel.ok).toBe(true);
    expect(desdeExcel.resumen.sumaNeto).toBe(r.resumen.sumaNeto);
  });

  it("devuelve el error sin romperse cuando el archivo no sirve", () => {
    const malo = importarMigracion("{ esto no es");
    expect(malo.ok).toBe(false);
    expect(malo.documentos).toEqual([]);
  });
});
