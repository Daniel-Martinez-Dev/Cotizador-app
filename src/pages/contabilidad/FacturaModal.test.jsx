import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import FacturaModal from "./FacturaModal.jsx";

// Prueba de humo del formulario. Lo que se comprueba es lo que el usuario
// pidió poder hacer: abrir una factura ya guardada, ver si su cliente está
// vinculado y corregirlo.

const EMPRESAS = [
  { id: "e1", nombre: "AXIONLOG COLOMBIA S.A.S.", nit: "9001234567", alias: "Axionlog" },
];

const documento = (extra = {}) => ({
  id: "d1",
  tipo: "factura",
  numero: "J-1001",
  fecha: "2026-03-04",
  plazoDias: 30,
  fechaVencimiento: "2026-04-03",
  periodoContable: 2026,
  empresaId: "",
  clienteNombre: "AXIONLOG",
  clienteNit: "",
  items: [{ producto: "Puertas Rápidas", cantidad: 1, unidad: "und", valorUnitario: 840_336 }],
  ivaPorcentaje: 19,
  retenciones: [],
  neto: 1_000_000,
  ...extra,
});

const pintar = (props = {}) =>
  renderToStaticMarkup(
    <FacturaModal
      modo="editar"
      documento={documento()}
      empresas={EMPRESAS}
      documentos={[]}
      config={null}
      onCerrar={() => {}}
      onGuardado={() => {}}
      {...props}
    />
  );

describe("FacturaModal", () => {
  it("avisa cuando el documento no cuelga de ninguna empresa", () => {
    const html = pintar();
    expect(html).toContain("Sin vincular");
    expect(html).toContain("Crear y vincular");
  });

  it("muestra la empresa cuando sí está vinculado", () => {
    const html = pintar({ documento: documento({ empresaId: "e1" }) });
    expect(html).toContain("AXIONLOG COLOMBIA S.A.S.");
    expect(html).toContain("Desvincular");
    expect(html).not.toContain("Crear y vincular");
  });

  it("deja editar el año contable, que es el que decide dónde se lista", () => {
    expect(pintar()).toContain("Año contable");
  });

  it("avisa cuando la fecha y el año contable no coinciden", () => {
    const html = pintar({ documento: documento({ fecha: "2025-12-20", periodoContable: 2026 }) });
    expect(html).toContain("Fechado en 2025 pero reportado en 2026");
  });

  it("conserva el neto declarado en una factura migrada que no se ha tocado", () => {
    const html = pintar({
      documento: documento({ origen: "migracion", neto: 1_000_000, items: [{ producto: "X", cantidad: 1, unidad: "und", valorUnitario: 840_336 }] }),
    });
    expect(html).toContain("Migrado del Excel");
    expect(html).toContain("Se conservará el neto declarado en el Excel");
  });

  it("una nota débito sigue siendo nota débito al abrirla", () => {
    const html = pintar({ documento: documento({ tipo: "nota_debito" }) });
    expect(html).toContain("Editar nota débito");
    expect(html).toContain("suma</strong> a la cartera");
  });
});
