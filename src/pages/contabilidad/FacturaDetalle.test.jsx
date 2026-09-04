import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import FacturaDetalle from "./FacturaDetalle.jsx";
import { liquidarDocumentos } from "../../modules/contabilidad/cartera";

// El detalle que abre la fila. Reúne en una pantalla lo que estaba repartido
// entre el formulario de edición (los datos y los conceptos) y el modal de
// abonos (los pagos), para poder mirar una factura sin abrir nada que guarde.

const EMPRESAS = [{ id: "e1", nombre: "AXIONLOG COLOMBIA S.A.S.", nit: "9001234567", alias: "Axionlog" }];

const doc = (extra = {}) => ({
  id: "d1",
  tipo: "factura",
  numero: "J-1001",
  fecha: "2026-03-04",
  plazoDias: 30,
  fechaVencimiento: "2026-04-03",
  periodoContable: 2026,
  empresaId: "e1",
  clienteNombre: "AXIONLOG COLOMBIA S.A.S.",
  clienteNit: "9001234567",
  items: [{ producto: "Puertas Rápidas", cantidad: 2, unidad: "und", valorUnitario: 500_000 }],
  ivaPorcentaje: 19,
  retenciones: [],
  neto: 1_190_000,
  ...extra,
});

const pintar = (documentos = [doc()], props = {}) => {
  const liquidados = liquidarDocumentos(documentos, [], "2026-05-01");
  return renderToStaticMarkup(
    <FacturaDetalle
      documento={liquidados[0]}
      documentos={liquidados}
      empresas={EMPRESAS}
      onCerrar={() => {}}
      onEditar={() => {}}
      onVerPagos={() => {}}
      onAnular={() => {}}
      onReactivar={() => {}}
      {...props}
    />
  );
};

describe("FacturaDetalle", () => {
  it("reúne documento, cliente, conceptos, liquidación y abonos", () => {
    const html = pintar();
    for (const bloque of ["Cliente", "Documento", "Conceptos", "Liquidación", "Abonos"]) {
      expect(html, `falta el bloque ${bloque}`).toContain(`>${bloque}<`);
    }
    expect(html).toContain("Puertas Rápidas");
    expect(html).toContain("Axionlog");
  });

  it("enseña el saldo del cliente, no solo el de esta factura", () => {
    const html = pintar([doc(), doc({ id: "d2", numero: "J-1002" })]);
    expect(html).toContain("Saldo del cliente");
    expect(html).toContain("Documentos del año");
  });

  it("avisa cuando el documento no cuelga de ninguna empresa", () => {
    const html = pintar([doc({ empresaId: "" })]);
    expect(html).toContain("Sin cliente vinculado");
  });

  it("una factura vencida lo dice, y dice desde cuándo", () => {
    const html = pintar([doc({ fechaVencimiento: "2026-01-10" })]);
    expect(html).toContain("Vencida hace");
  });

  // Una nota crédito no se cobra: no vence, no tiene saldo, y su valor
  // descuenta de la factura que anula.
  it("la nota crédito dice que no vence y a qué factura anula", () => {
    const liquidados = liquidarDocumentos(
      [doc(), doc({ id: "nc1", tipo: "nota_credito", numero: "NC-7", docAfectadoId: "d1" })],
      [],
      "2026-05-01"
    );
    const html = renderToStaticMarkup(
      <FacturaDetalle
        documento={liquidados[1]}
        documentos={liquidados}
        empresas={EMPRESAS}
        onCerrar={() => {}}
      />
    );
    expect(html).toContain("No vence");
    expect(html).toContain("Anula la factura");
    expect(html).toContain("Una nota crédito no se cobra");
  });

  it("un documento anulado dice por qué y deja reactivarlo", () => {
    const html = pintar([doc({ anulado: true, motivoAnulacion: "Digitada dos veces" })]);
    expect(html).toContain("Documento anulado");
    expect(html).toContain("Digitada dos veces");
    expect(html).toContain("Reactivar");
  });

  // La tabla de conceptos no cabe en el teléfono: tiene su versión en tarjetas,
  // igual que el resto de la sección.
  it("trae las dos vistas de los conceptos", () => {
    const html = pintar();
    expect(html).toContain("hidden sm:block");
    expect(html).toContain("sm:hidden");
  });
});
