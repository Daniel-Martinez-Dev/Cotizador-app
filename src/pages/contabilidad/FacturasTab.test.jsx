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

  // Las acciones pasaron de tres palabras al final de la fila a tres símbolos
  // al comienzo: en una tabla de doce columnas, "Editar Abonos Anular" se comía
  // el ancho del cliente y de las cifras, y estaba donde hay que barrer la fila
  // entera con la vista para llegar.
  it("las acciones son símbolos, no palabras", () => {
    const html = pintar();
    for (const accion of ["Abonos", "Editar", "Anular"]) {
      expect(html, `${accion} debería ir como símbolo`).toContain(`aria-label="${accion}"`);
      expect(html, `${accion} no debería ir escrita`).not.toContain(`>${accion}<`);
    }
  });

  it("las acciones van al comienzo de la fila y no al final", () => {
    const html = pintar();
    // La celda del cliente es la que lleva el nombre en `title`; el aria-label
    // de la fila también lo nombra, y por eso no sirve buscar el nombre suelto.
    expect(html.indexOf('aria-label="Editar"')).toBeLessThan(
      html.indexOf('title="AXIONLOG COLOMBIA S.A.S."')
    );
  });

  // Antes había que abrir el formulario de edición para mirar una factura, con
  // el riesgo de guardar algo sin querer.
  it("la fila abre el detalle, y con teclado lo abre el nombre del cliente", () => {
    const html = pintar();
    expect(html).toContain("cursor-pointer");
    // La fila sigue siendo una fila: el camino accesible es un botón de verdad
    // dentro de ella, no un role="button" encima que descuadre la tabla.
    expect(html).not.toContain('role="button"');
    expect(html).toContain('title="AXIONLOG COLOMBIA S.A.S."');
    expect(html).toContain("Pulsa una fila para ver el detalle completo.");
  });

  it("sin facturas invita a crear la primera en vez de dejar la pantalla vacía", () => {
    const html = pintar([]);
    expect(html).toContain("Sin facturas en 2026");
    expect(html).toContain("Nueva factura");
  });
});
