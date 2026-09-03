import { describe, it, expect } from "vitest";
import { aplicarResultadosLote, claveFicha, fichasAbiertas } from "./loteFichas";

const ficha = (extra) => ({ id: "a1", tipo: "sello", estado: "en_produccion", notas: [], ...extra });

describe("lote de órdenes", () => {
  it("distingue dos fichas con el mismo id en colecciones distintas", () => {
    // Cada línea de producto es una colección aparte: solo el par tipo+id
    // identifica una orden en el listado que las mezcla.
    expect(claveFicha({ tipo: "sello", id: "a1" })).not.toBe(claveFicha({ tipo: "division", id: "a1" }));
  });

  it("aplica el parche y añade la nota al historial", () => {
    const lista = [ficha(), ficha({ id: "b2" })];
    const resultado = aplicarResultadosLote(lista, [{
      clave: claveFicha(lista[0]),
      parche: { estado: "terminado", firmas: { alistado: { personas: [{ nombre: "Ana" }] } } },
      nota: { texto: "Alistado y empacado: Ana" },
    }]);

    expect(resultado[0].estado).toBe("terminado");
    expect(resultado[0].firmas.alistado.personas[0].nombre).toBe("Ana");
    expect(resultado[0].notas).toHaveLength(1);
    // La que no iba en el lote se queda tal cual, y con la misma identidad.
    expect(resultado[1]).toBe(lista[1]);
  });

  it("no toca la ficha de otra colección aunque comparta id", () => {
    const lista = [ficha({ tipo: "sello" }), ficha({ tipo: "division" })];
    const resultado = aplicarResultadosLote(lista, [{
      clave: claveFicha(lista[0]),
      parche: { estado: "entregado" },
      nota: null,
    }]);

    expect(resultado[0].estado).toBe("entregado");
    expect(resultado[1].estado).toBe("en_produccion");
  });

  it("devuelve la lista intacta cuando el lote no guardó nada", () => {
    const lista = [ficha()];
    expect(aplicarResultadosLote(lista, [])).toBe(lista);
  });

  it("deja fuera del lote lo que ya se entregó", () => {
    // Reabrir una entrega cerrada es una corrección, y esa se hace de a una.
    const lista = [ficha(), ficha({ id: "b2", estado: "entregado" })];
    expect(fichasAbiertas(lista).map((f) => f.id)).toEqual(["a1"]);
  });
});
