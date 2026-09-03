import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import CarteraTab from "./CarteraTab.jsx";

// La cartera es la pantalla que más se consulta desde el teléfono —se mira el
// saldo de un cliente antes de llamarlo—, y hasta ahora era una tabla de ocho
// columnas dentro de un scroll horizontal: el saldo quedaba fuera de pantalla.
// Estas pruebas fijan que existan las dos vistas y que la angosta lleve las
// cifras que se vienen a mirar.

const doc = (extra = {}) => ({
  id: extra.id || "d1",
  tipo: "factura",
  numero: "J-1001",
  fecha: "2026-03-04",
  fechaVencimiento: "2026-04-03",
  empresaId: "e1",
  clienteNombre: "AXIONLOG COLOMBIA S.A.S.",
  clienteNit: "9001234567",
  items: [{ producto: "Puertas Rápidas", cantidad: 1, unidad: "und", valorUnitario: 1_000_000 }],
  ivaPorcentaje: 0,
  retenciones: [],
  neto: 1_000_000,
  ...extra,
});

const pintar = (props = {}) =>
  renderToStaticMarkup(
    <CarteraTab
      documentos={[doc()]}
      pagos={[]}
      saldosIniciales={[]}
      cargando={false}
      onVerPagos={() => {}}
      onEditar={() => {}}
      {...props}
    />
  );

describe("CarteraTab", () => {
  it("trae las dos vistas: tabla en escritorio y tarjetas en el teléfono", () => {
    const html = pintar();
    expect(html).toContain("hidden lg:block");  // la tabla
    expect(html).toContain("lg:hidden");        // las tarjetas
  });

  it("la tarjeta lleva el cliente y su saldo, sin tener que arrastrar nada", () => {
    const html = pintar();
    expect(html).toContain("AXIONLOG COLOMBIA S.A.S.");
    expect(html).toContain("Saldo");
    expect(html).toContain("Ver 1 documento");
  });

  it("cuando nadie debe nada no pinta ninguna de las dos listas", () => {
    const html = pintar({ documentos: [] });
    expect(html).toContain("Nadie debe nada");
    expect(html).not.toContain("Ver 1 documento");
  });

  it("mientras calcula no enseña cifras a medias", () => {
    expect(pintar({ cargando: true })).toContain("Calculando la cartera");
  });

  // Una nota crédito anula la factura: el cliente no queda debiendo nada, y la
  // nota no ofrece "Abonos" porque no se cobra.
  it("una factura anulada por su nota crédito deja al cliente sin saldo", () => {
    const nota = doc({ id: "nc1", tipo: "nota_credito", numero: "NC-7", docAfectadoId: "d1" });
    const html = pintar({ documentos: [doc(), nota] });
    expect(html).toContain("Nadie debe nada");
    expect(html).not.toContain(">Abonos<");
  });
});
