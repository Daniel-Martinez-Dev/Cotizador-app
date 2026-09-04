import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import IdentificacionFicha from "./IdentificacionFicha.jsx";
import FichaImpresionSello from "../FichaImpresionSello.jsx";

// La fila de identificación de las seis fichas. Lo que se cuida aquí es la
// regla de quién ve qué: la cotización es un dato de oficina y no puede
// aparecer donde la ve planta (ver utils/documentoVinculo.js).

const pintar = (props = {}) =>
  renderToStaticMarkup(
    <IdentificacionFicha
      codigo="SA1203260147"
      ordenCompra="OC-991"
      onOrdenCompraChange={() => {}}
      nombre="Muelle 7"
      onNombreChange={() => {}}
      {...props}
    />
  );

describe("IdentificacionFicha", () => {
  it("sin el manejador de cotización no monta el selector", () => {
    const html = pintar();
    expect(html).toContain("N.° orden de compra");
    expect(html).not.toContain("Cotización");
  });

  it("con el manejador ofrece vincular una cotización, marcada como opcional", () => {
    const html = pintar({ cotizacion: {}, onCotizacionChange: () => {} });
    expect(html).toContain("Cotización");
    expect(html).toContain("(opcional)");
  });

  // El número congelado en la ficha es lo que se lee cuando la cotización no
  // está en la lista cargada — o cuando quien edita no tiene permiso de leerla.
  it("muestra la cotización ya vinculada por su número", () => {
    const html = pintar({
      cotizacion: { cotizacionId: "cot1", cotizacionNumero: "4821" },
      onCotizacionChange: () => {},
    });
    expect(html).toContain("Cotización N.º 4821");
  });
});

// La ficha impresa es el papel que llega a planta. Que el operario no vea
// cotizaciones no puede depender de en qué pantalla esté: si el dato se
// colara aquí, saldría impreso en cada orden.
describe("la ficha impresa no lleva el vínculo con la cotización", () => {
  const ficha = {
    codigoFicha: "SA1203260147",
    numeroOrdenCompra: "OC-991",
    nombreFicha: "Muelle 7",
    cliente: "AXIONLOG COLOMBIA S.A.S.",
    cantidad: 1,
    anchoVano: 3000,
    altoVano: 3500,
    medidas: {},
    materiaPrima: {},
    cotizacionId: "cot1",
    cotizacionNumero: "4821",
  };

  it("imprime la orden de compra pero nunca el número de cotización", () => {
    const html = renderToStaticMarkup(
      <FichaImpresionSello ficha={ficha} numero={147} onClose={() => {}} />
    );
    expect(html).toContain("OC-991");
    expect(html).not.toContain("4821");
    expect(html).not.toContain("Cotización");
  });
});
