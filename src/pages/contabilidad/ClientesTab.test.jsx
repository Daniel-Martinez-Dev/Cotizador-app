import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import ClientesTab from "./ClientesTab.jsx";

// Prueba de humo del tablero. Se renderiza a texto —sin jsdom— así que el
// histórico no se pide: la pestaña tiene que servir con lo que la sección ya
// tiene cargado del año, que es justo lo que se comprueba aquí.

const factura = (extra = {}) => ({
  id: "d1",
  tipo: "factura",
  numero: "J-1001",
  fecha: "2026-03-04",
  fechaVencimiento: "2026-04-03",
  periodoContable: 2026,
  empresaId: "e1",
  clienteNombre: "AXIONLOG COLOMBIA S.A.S.",
  clienteNit: "9001234567",
  items: [{ producto: "Puertas Rápidas", cantidad: 1, unidad: "und", valorUnitario: 40_000_000 }],
  ivaPorcentaje: 0,
  retenciones: [],
  neto: 40_000_000,
  ...extra,
});

const pintar = (props = {}) =>
  renderToStaticMarkup(
    <ClientesTab
      documentos={[factura()]}
      pagos={[]}
      empresas={[{ id: "e1", nombre: "AXIONLOG COLOMBIA S.A.S.", ciudad: "Funza" }]}
      cargando={false}
      anio={2026}
      recargar={() => {}}
      {...props}
    />
  );

describe("ClientesTab", () => {
  it("muestra el cliente con sus ventas sin esperar al histórico", () => {
    const html = pintar();
    expect(html).toContain("AXIONLOG COLOMBIA S.A.S.");
    expect(html).toContain("Ventas");
    expect(html).toContain("Ticket promedio");
    expect(html).toContain("trayendo el histórico completo");
  });

  it("pinta las tres gráficas del tablero", () => {
    const html = pintar();
    expect(html).toContain("Ventas por mes");
    expect(html).toContain("Qué se vende");
    expect(html).toContain("Clientes que más compran");
  });

  it("propone al cliente como distribuidor del producto que compra", () => {
    const html = pintar();
    expect(html).toContain("Candidatos a distribuidor");
    expect(html).toContain("Puertas Rápidas");
  });

  it("avisa de los documentos que no cuelgan de un cliente", () => {
    const html = pintar({ documentos: [factura(), factura({ id: "d2", empresaId: "", clienteNombre: "Suelto" })] });
    expect(html).toContain("1 documento sin cliente vinculado");
    expect(html).toContain("Vincular ahora");
  });

  it("no inventa un tablero vacío mientras no hay datos", () => {
    // Sin documentos y con el histórico todavía en camino se espera, no se
    // afirma que el cliente no tiene ventas.
    const html = pintar({ documentos: [], pagos: [] });
    expect(html).toContain("Reuniendo el histórico de clientes");
    expect(html).not.toContain("Ticket promedio");
  });
});
