import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { Firmas } from "./FichaVisualKit";

// El pie de firmas es la parte legal de la ficha: si los nombres no salen
// impresos, la orden que llega a planta no sirve como constancia. Estas
// pruebas fijan qué se imprime en cada caso.

const render = (ficha) => renderToStaticMarkup(<Firmas ficha={ficha} />);

const alistado = {
  personas: [{ uid: "u1", nombre: "Juan Pérez" }, { uid: "", nombre: "Carlos Ruiz" }],
  fecha: "2026-08-18",
};
const revisado = {
  personas: [{ uid: "u2", nombre: "Ana Gómez" }],
  fecha: "2026-08-20",
};

describe("bloque de firmas de la ficha impresa", () => {
  it("mantiene los espacios en blanco del formato mientras nadie ha firmado", () => {
    const html = render({});
    expect(html).toContain("Pedido alistado y empacado por");
    expect(html).toContain("Revisado y aprobado por");
    // 3 espacios en la primera fila y 2 en la segunda, como el formato en papel.
    expect(html).toContain("Firma 3");
    expect(html).not.toContain("Firma 4");
  });

  it("imprime los nombres de quienes firmaron, uno por espacio", () => {
    const html = render({ firmas: { alistado, revisado } });
    expect(html).toContain("Juan Pérez");
    expect(html).toContain("Carlos Ruiz");
    expect(html).toContain("Ana Gómez");
    // Ya no quedan espacios anónimos en las filas firmadas.
    expect(html).not.toContain("Firma 1");
  });

  it("imprime la fecha de cada etapa junto a sus firmas", () => {
    const html = render({ firmas: { alistado, revisado } });
    expect(html).toMatch(/18\/0?8\/2026/);
    expect(html).toMatch(/20\/0?8\/2026/);
  });

  it("deja en blanco la etapa que falta y firmada la que ya está", () => {
    const html = render({ firmas: { alistado } });
    expect(html).toContain("Juan Pérez");
    // La fila de revisión sigue esperando: dos espacios en blanco.
    expect(html).toContain("Firma 2");
    expect(html).not.toContain("Firma 3");
  });

  it("imprime con nombres las fichas cerradas con el modelo viejo", () => {
    const html = render({
      firmas: {
        fabricantes: [{ uid: "u1", nombre: "Juan Pérez" }],
        verificador: { uid: "u2", nombre: "Ana Gómez" },
        fecha: { seconds: Math.floor(new Date(2026, 7, 18, 9, 0, 0).getTime() / 1000) },
      },
    });
    expect(html).toContain("Juan Pérez");
    expect(html).toContain("Ana Gómez");
  });

  it("no mete grises claros ni fondos de color en los campos de firma", () => {
    const html = render({ firmas: { alistado, revisado } });
    expect(html).toContain("ING. DANIEL F. MARTÍNEZ");
    expect(html).toContain("Fecha y hora de despacho");
    // Alto contraste para la impresión: los textos del bloque van en negro.
    expect(html).not.toMatch(/color:#(6b7280|9ca3af|d1d5db)/i);
  });
});
