import { describe, it, expect } from "vitest";
import fs from "node:fs";
import { importarMigracion } from "./importarMigracion";
import { construirCartera } from "./cartera";

// Verificación contra el archivo real del libro 2026. Es la prueba que de
// verdad importa —cuadrar contra la contabilidad de la empresa— pero depende de
// un archivo que no vive en el repo, así que se salta cuando no está.
const RUTA = process.env.MIGRACION_JSON || "/Users/danielmartinez/Documents/migracion.json";
const hay = fs.existsSync(RUTA);

describe.skipIf(!hay)("archivo real de migración", () => {
  it("cuadra contra los totales de control del propio archivo", () => {
    const r = importarMigracion(fs.readFileSync(RUTA, "utf-8"));
    expect(r.ok).toBe(true);
    const s = r.resumen;
    console.log("\n--- RESUMEN ---");
    console.log("periodo:", s.periodo);
    console.log("documentos:", s.documentos, "(fact", s.facturas, "/ NC", s.notasCredito, "/ ND", s.notasDebito, ")");
    console.log("saldos:", s.saldos, " pagos:", s.pagos, " clientes:", s.clientes);
    console.log("neto:", s.sumaNeto.toLocaleString("es-CO"), "vs control", s.control.suma_neto_a_pagar.toLocaleString("es-CO"));
    console.log("pagos:", s.sumaPagos.toLocaleString("es-CO"), "vs control", s.control.suma_pagos.toLocaleString("es-CO"));
    console.log("saldos:", s.sumaSaldos.toLocaleString("es-CO"), "vs control", s.control.suma_saldos_iniciales_2025.toLocaleString("es-CO"));
    console.log("cuadre:", s.cuadre);
    console.log("notas crédito enlazadas:", s.enlaces.enlazadas, "/ ambiguas", s.enlaces.ambiguas.length, "/ sin enlace", s.enlaces.sinEnlace.length);
    console.log("imputación:", s.imputacion);
    console.log("avisos:", s.avisos);
    expect(s.cuadre).toEqual({ documentos: true, pagos: true, neto: true, pagosValor: true, saldos: true });
  });

  it("ninguna factura recibe más abonos de los que vale", () => {
    const r = importarMigracion(fs.readFileSync(RUTA, "utf-8"));
    const cap = new Map(r.documentos.map((d) => [d.claveOrigen, d.neto]));
    const aplicado = new Map();
    for (const p of r.pagos) {
      for (const a of p.aplicaciones) {
        if (a.tipo !== "documento") continue;
        aplicado.set(a.id, (aplicado.get(a.id) || 0) + a.valor);
      }
    }
    const excedidos = [...aplicado].filter(([id, v]) => v - cap.get(id) > 1);
    console.log("\ndocumentos con abonos por encima del neto:", excedidos.length, "(en el Excel eran 53)");
    expect(excedidos).toEqual([]);
  });

  it("la cartera por cliente da lo mismo que el Excel", () => {
    const r = importarMigracion(fs.readFileSync(RUTA, "utf-8"));
    const emp = (cid) => `c${cid}`;
    const docs = r.documentos.map((d) => ({
      ...d, id: d.claveOrigen, empresaId: emp(d.clienteOrigenId), docAfectadoId: d.docAfectadoClave,
    }));
    const saldosIni = r.saldos.map((s) => ({
      ...s, id: s.claveOrigen, empresaId: emp(s.clienteOrigenId),
    }));
    const pagos = r.pagos.map((p) => ({ ...p, empresaId: emp(p.clienteOrigenId) }));

    const { totales } = construirCartera(docs, pagos, { saldosIniciales: saldosIni, hoy: "2026-09-01" });
    console.log("\nfacturado:", Math.round(totales.neto).toLocaleString("es-CO"));
    console.log("arrastre pendiente:", Math.round(totales.saldoInicial).toLocaleString("es-CO"));
    console.log("anticipos sin aplicar:", Math.round(totales.anticipos).toLocaleString("es-CO"));
    console.log("CARTERA:", Math.round(totales.saldo).toLocaleString("es-CO"));
    console.log("Excel FACT!O342: 211.549.856");
    expect(Math.abs(totales.saldo - 211549855.6)).toBeLessThan(2);
  });
});
