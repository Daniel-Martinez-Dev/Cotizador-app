import { describe, it, expect } from "vitest";
import {
  agregarFichaAFactura,
  camposCotizacionFicha,
  claveFicha,
  clienteDiscrepa,
  cotizacionDeFicha,
  etiquetaCotizacion,
  etiquetaFicha,
  normalizarFichasFactura,
  quitarFichaDeFactura,
  referenciaFicha,
  sinCotizacion,
  tieneCotizacion,
  vinculoDesdeCotizacion,
} from "./documentoVinculo";

const COTIZACION = { id: "cot1", numero: 4821, empresaId: "e1", nombreCliente: "Alimentos Cárnicos S.A.S." };

const FICHA = {
  id: "f1",
  tipo: "sello",
  codigoFicha: "SA1203260147",
  ordenProduccion: 147,
  nombreFicha: "Muelle 7",
  cliente: "Alimentos Cárnicos S.A.S.",
  clienteId: "e1",
};

describe("vinculoDesdeCotizacion", () => {
  it("congela el número de la cotización elegida", () => {
    expect(vinculoDesdeCotizacion(COTIZACION)).toEqual({ cotizacionId: "cot1", cotizacionNumero: "4821" });
  });

  it("sin cotización deja el vínculo vacío", () => {
    expect(vinculoDesdeCotizacion(null)).toEqual(sinCotizacion());
    expect(vinculoDesdeCotizacion({ numero: 10 })).toEqual(sinCotizacion());
  });
});

describe("camposCotizacionFicha", () => {
  it("normaliza el par id + número", () => {
    expect(camposCotizacionFicha({ cotizacionId: " cot1 ", cotizacionNumero: 4821 }))
      .toEqual({ cotizacionId: "cot1", cotizacionNumero: "4821" });
  });

  // Un número suelto haría creer que la ficha apunta a una cotización que
  // nadie puede abrir.
  it("descarta el número cuando no quedó id", () => {
    expect(camposCotizacionFicha({ cotizacionId: "", cotizacionNumero: "4821" })).toEqual(sinCotizacion());
  });

  it("una ficha sin vínculo guarda los campos vacíos, no indefinidos", () => {
    expect(camposCotizacionFicha({})).toEqual({ cotizacionId: null, cotizacionNumero: "" });
  });
});

describe("cotizacionDeFicha", () => {
  it("relee lo guardado para precargar el formulario", () => {
    expect(cotizacionDeFicha({ ...FICHA, cotizacionId: "cot1", cotizacionNumero: "4821" }))
      .toEqual({ cotizacionId: "cot1", cotizacionNumero: "4821" });
  });

  it("una ficha anterior al vínculo se lee sin vínculo", () => {
    expect(cotizacionDeFicha(FICHA)).toEqual(sinCotizacion());
    expect(tieneCotizacion(FICHA)).toBe(false);
  });
});

describe("etiquetaCotizacion", () => {
  it("nombra la cotización por su número", () => {
    expect(etiquetaCotizacion({ cotizacionId: "cot1", cotizacionNumero: "4821" })).toBe("Cotización N.º 4821");
  });

  it("sin número la nombra igual: se puede abrir por id", () => {
    expect(etiquetaCotizacion({ cotizacionId: "cot1" })).toBe("Cotización vinculada");
  });
});

describe("clienteDiscrepa", () => {
  it("avisa cuando la cotización es de otra empresa", () => {
    expect(clienteDiscrepa(FICHA, { ...COTIZACION, empresaId: "e2" })).toBe(true);
  });

  it("calla cuando es la misma empresa", () => {
    expect(clienteDiscrepa(FICHA, COTIZACION)).toBe(false);
  });

  // Comparar nombres sueltos daría falsas alarmas, así que sin los dos ids no
  // se afirma nada.
  it("calla cuando alguno de los dos lados no está vinculado a la base", () => {
    expect(clienteDiscrepa({ ...FICHA, clienteId: null }, COTIZACION)).toBe(false);
    expect(clienteDiscrepa(FICHA, { ...COTIZACION, empresaId: "" })).toBe(false);
    expect(clienteDiscrepa(FICHA, null)).toBe(false);
  });
});

describe("referenciaFicha", () => {
  it("guarda una copia congelada de lo que nombra la ficha", () => {
    expect(referenciaFicha(FICHA)).toEqual({
      tipo: "sello",
      id: "f1",
      codigo: "SA1203260147",
      ordenProduccion: 147,
      nombre: "Muelle 7",
      cliente: "Alimentos Cárnicos S.A.S.",
    });
  });

  // El id solo no dice en cuál de las seis colecciones buscar.
  it("sin tipo o sin id no hay referencia", () => {
    expect(referenciaFicha({ id: "f1" })).toBeNull();
    expect(referenciaFicha({ tipo: "sello" })).toBeNull();
  });
});

describe("normalizarFichasFactura", () => {
  it("ordena por consecutivo de orden de producción", () => {
    const lista = normalizarFichasFactura([
      { ...FICHA, id: "f2", ordenProduccion: 150 },
      FICHA,
    ]);
    expect(lista.map((f) => f.ordenProduccion)).toEqual([147, 150]);
  });

  it("no repite la misma ficha", () => {
    expect(normalizarFichasFactura([FICHA, { ...FICHA }])).toHaveLength(1);
  });

  // Dos colecciones distintas pueden traer el mismo id de documento.
  it("distingue dos fichas con el mismo id en colecciones distintas", () => {
    const lista = normalizarFichasFactura([FICHA, { ...FICHA, tipo: "division" }]);
    expect(lista).toHaveLength(2);
    expect(claveFicha(lista[0])).not.toBe(claveFicha(lista[1]));
  });

  it("descarta lo que no identifica una ficha", () => {
    expect(normalizarFichasFactura([null, {}, { id: "x" }, FICHA])).toHaveLength(1);
    expect(normalizarFichasFactura(undefined)).toEqual([]);
  });
});

describe("agregarFichaAFactura / quitarFichaDeFactura", () => {
  it("agrega sin duplicar", () => {
    const una = agregarFichaAFactura([], FICHA);
    expect(agregarFichaAFactura(una, FICHA)).toHaveLength(1);
  });

  it("quita solo la ficha indicada", () => {
    const dos = agregarFichaAFactura([FICHA], { ...FICHA, id: "f2", ordenProduccion: 150 });
    const queda = quitarFichaDeFactura(dos, FICHA);
    expect(queda).toHaveLength(1);
    expect(queda[0].id).toBe("f2");
  });
});

describe("etiquetaFicha", () => {
  it("usa el código impreso, que es lo que se busca en planta", () => {
    expect(etiquetaFicha(referenciaFicha(FICHA))).toBe("SA1203260147");
  });

  it("cae en el consecutivo cuando la ficha es anterior al código", () => {
    expect(etiquetaFicha({ ordenProduccion: 147 })).toBe("Orden 147");
    expect(etiquetaFicha({})).toBe("Ficha vinculada");
  });
});
