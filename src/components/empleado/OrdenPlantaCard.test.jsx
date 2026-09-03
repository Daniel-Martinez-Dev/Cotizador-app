import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import OrdenPlantaCard from "./OrdenPlantaCard.jsx";

// Prueba de humo de la tarjeta de orden en el teléfono de planta. Lo que se
// cuida aquí es que la ficha esté a un toque y que el cliente y la medida se
// vean sin abrir nada: es como se reconoce una orden en la mesa.

const ORDEN = {
  id: "f1",
  tipo: "sello",
  tipoLabel: "Sello de Andén",
  cliente: "AXIONLOG COLOMBIA S.A.S.",
  cantidad: 2,
  estado: "en_produccion",
  ordenProduccion: 412,
  anchoVano: 2400,
  altoVano: 3100,
  fechaEntrega: "2026-12-30",
};

const pintar = (props = {}) =>
  renderToStaticMarkup(
    <MemoryRouter>
      <OrdenPlantaCard ficha={ORDEN} onVerFicha={() => {}} {...props} />
    </MemoryRouter>
  );

describe("tarjeta de orden en planta", () => {
  it("ofrece la ficha en la propia tarjeta, sin entrar al detalle", () => {
    expect(pintar()).toContain("Ver ficha");
  });

  it("enlaza al detalle de la orden", () => {
    expect(pintar()).toContain('href="/planta/produccion/sello/f1"');
  });

  it("muestra cliente, medida y cantidad de un vistazo", () => {
    const html = pintar();
    expect(html).toContain("AXIONLOG COLOMBIA S.A.S.");
    expect(html).toContain("2400 × 3100");
    expect(html).toContain("×2");
  });

  it("imprime el alias cuando la ficha lo pidió", () => {
    const html = pintar({ ficha: { ...ORDEN, clienteAlias: "AXIONLOG", usarAlias: true } });
    expect(html).toContain("AXIONLOG");
    expect(html).not.toContain("AXIONLOG COLOMBIA S.A.S.");
  });

  it("enseña la orden de compra del cliente cuando la ficha la trae", () => {
    const html = pintar({ ficha: { ...ORDEN, numeroOrdenCompra: "4500123456" } });
    expect(html).toContain("OC 4500123456");
    // Sin orden de compra la etiqueta no aparece vacía ni con guion.
    expect(pintar()).not.toContain("OC ");
  });

  it("una orden sin ficha imprimible no enseña el botón", () => {
    expect(pintar({ onVerFicha: null })).not.toContain("Ver ficha");
  });

  it("en modo selección la tarjeta marca y no ofrece acciones", () => {
    const html = pintar({ seleccionable: true, marcada: true });
    expect(html).toContain('aria-pressed="true"');
    expect(html).not.toContain("Ver ficha");
    expect(html).not.toContain("<a ");
  });

  it("avisa de la entrega vencida mientras la orden siga en planta", () => {
    const html = pintar({ ficha: { ...ORDEN, fechaEntrega: "2020-01-01" } });
    expect(html).toContain("Vencida hace");
  });

  it("una orden ya entregada no alarma por la fecha", () => {
    const html = pintar({ ficha: { ...ORDEN, fechaEntrega: "2020-01-01", estado: "entregado" } });
    expect(html).not.toContain("Vencida hace");
  });
});
