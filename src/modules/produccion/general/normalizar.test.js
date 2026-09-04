import { describe, it, expect } from "vitest";
import { normalizarItems, totalUnidades, categoriasDe, construirFichaGeneral } from "./normalizar";

describe("normalizarItems", () => {
  it("descarta las filas sin descripción (las vacías del formulario)", () => {
    const items = normalizarItems([
      { descripcion: "Lámpara LED", cantidad: 2 },
      { descripcion: "   ", cantidad: 5 },
      { cantidad: 9 },
    ]);
    expect(items).toHaveLength(1);
    expect(items[0].descripcion).toBe("Lámpara LED");
  });

  it("normaliza categoría y unidad a mayúsculas y recorta espacios", () => {
    const [item] = normalizarItems([
      { descripcion: "  Tope de muelle  ", categoria: " tope ", unidad: " und ", referencia: " TM-40 " },
    ]);
    expect(item).toMatchObject({
      descripcion: "Tope de muelle",
      categoria: "TOPE",
      unidad: "UND",
      referencia: "TM-40",
    });
  });

  it("convierte cantidades que llegan como texto y cae a 0 si no es número", () => {
    const items = normalizarItems([
      { descripcion: "Semáforo", cantidad: "3" },
      { descripcion: "Rampa", cantidad: "" },
      { descripcion: "Repuesto", cantidad: "abc" },
    ]);
    expect(items.map((i) => i.cantidad)).toEqual([3, 0, 0]);
  });

  it("usa UND cuando no se indica unidad", () => {
    expect(normalizarItems([{ descripcion: "Tope" }])[0].unidad).toBe("UND");
  });

  it("tolera una entrada que no es arreglo", () => {
    expect(normalizarItems(undefined)).toEqual([]);
    expect(normalizarItems(null)).toEqual([]);
  });
});

describe("totalUnidades", () => {
  it("suma solo los ítems con descripción", () => {
    expect(totalUnidades([
      { descripcion: "Lámpara", cantidad: 2 },
      { descripcion: "Tope", cantidad: "4" },
      { descripcion: "", cantidad: 100 },
    ])).toBe(6);
  });
});

describe("categoriasDe", () => {
  it("devuelve las categorías sin repetir y sin vacías", () => {
    expect(categoriasDe([
      { descripcion: "A", categoria: "repuesto" },
      { descripcion: "B", categoria: "REPUESTO" },
      { descripcion: "C", categoria: "" },
      { descripcion: "D", categoria: "Rampa" },
    ])).toEqual(["REPUESTO", "RAMPA"]);
  });
});

describe("construirFichaGeneral", () => {
  it("arma el documento con el total y las categorías derivadas de los ítems", () => {
    const doc = construirFichaGeneral({
      cliente: "  Cliente X ",
      numeroOrdenCompra: " OC-123 ",
      nombreFicha: "  Muelle 7 ",
      responsable: " Juan ",
      fechaOrden: "2026-08-11",
      fechaEntrega: "",
      observaciones: "  Entregar en portería  ",
      items: [
        { descripcion: "Semáforo", categoria: "semáforo", cantidad: "2" },
        { descripcion: "Lámpara", categoria: "lámpara", cantidad: 3 },
        { descripcion: "", cantidad: 99 },
      ],
    });

    expect(doc.cliente).toBe("Cliente X");
    expect(doc.numeroOrdenCompra).toBe("OC-123");
    expect(doc.nombreFicha).toBe("Muelle 7");
    expect(doc.responsable).toBe("Juan");
    expect(doc.observaciones).toBe("Entregar en portería");
    expect(doc.fechaOrden).toBe("2026-08-11");
    expect(doc.fechaEntrega).toBeNull();
    expect(doc.items).toHaveLength(2);
    expect(doc.cantidad).toBe(5);
    expect(doc.categorias).toEqual(["SEMÁFORO", "LÁMPARA"]);
  });

  it("no deja campos undefined (Firestore los rechaza)", () => {
    const doc = construirFichaGeneral({});
    for (const [clave, valor] of Object.entries(doc)) {
      expect(valor, `campo ${clave}`).not.toBeUndefined();
    }
    expect(doc.cantidad).toBe(0);
    expect(doc.items).toEqual([]);
  });
});
