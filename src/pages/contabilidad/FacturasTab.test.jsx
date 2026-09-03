import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import FacturasTab from "./FacturasTab.jsx";
import { liquidarDocumentos } from "../../modules/contabilidad/cartera";

// La pestaña que más se abre, y también desde el teléfono. Se comprueba que
// existan las dos vistas del listado y que en la angosta no haya que bajar
// media pantalla de totales y filtros antes de ver la primera factura.

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

const pintar = (documentos = [doc()], props = {}) =>
  renderToStaticMarkup(
    <FacturasTab
      liquidados={liquidarDocumentos(documentos, [], "2026-05-01")}
      cargando={false}
      anio={2026}
      recargar={() => {}}
      onEditar={() => {}}
      onVerPagos={() => {}}
      onNueva={() => {}}
      {...props}
    />
  );

describe("FacturasTab", () => {
  it("trae las dos vistas del listado: tabla y tarjetas", () => {
    const html = pintar();
    expect(html).toContain("hidden lg:block");
    expect(html).toContain("lg:hidden");
  });

  it("los totales se deslizan en el teléfono en vez de apilarse en tres filas", () => {
    expect(pintar()).toContain("overflow-x-auto no-scrollbar");
  });

  it("en el teléfono el buscador queda a la vista y el resto tras un botón", () => {
    const html = pintar();
    expect(html).toContain("Filtros");
    // Los selectores arrancan ocultos en angosto y visibles desde md.
    expect(html).toContain("hidden md:block");
  });

  it("la tarjeta enseña el saldo, que es el dato que se viene a mirar", () => {
    const html = pintar();
    expect(html).toContain("AXIONLOG COLOMBIA S.A.S.");
    expect(html).toContain("Saldo");
  });

  it("una factura vencida lo dice en la tarjeta", () => {
    const html = pintar([doc({ fechaVencimiento: "2026-01-10" })]);
    expect(html).toContain("Vencida hace");
  });

  // Una nota crédito no se cobra: sale "Aplicada", sin vencimiento y sin botón
  // de abonos. Antes salía "Pendiente" y con días de mora, como si el cliente
  // tuviera que pagarla.
  it("una nota crédito sale aplicada y sin abonos que registrar", () => {
    const nota = doc({ id: "nc1", tipo: "nota_credito", numero: "NC-7", docAfectadoId: "d1" });
    const html = pintar([nota]);
    expect(html).toContain("Aplicada");
    expect(html).not.toContain(">Abonos<");
    // Sin fecha de vencimiento: una nota crédito no vence.
    expect(html).not.toContain("2026-04-03");
  });

  it("la nota crédito cancela el valor de la factura que anula", () => {
    const nota = doc({ id: "nc1", tipo: "nota_credito", numero: "NC-7", docAfectadoId: "d1" });
    // Sin etiquetas y con el espacio duro de formatCOP vuelto espacio normal.
    const texto = pintar([doc(), nota]).replace(/<[^>]+>/g, "").replace(/\u00a0/g, " ");
    expect(texto).toContain("Total filtrado: $ 0 facturados");
    expect(texto).toContain("$ 0 por cobrar");
  });

  it("sin facturas invita a crear la primera en vez de dejar la pantalla vacía", () => {
    const html = pintar([]);
    expect(html).toContain("Sin facturas en 2026");
    expect(html).toContain("Nueva factura");
  });
});
