import { describe, it, expect } from "vitest";
import { getPrecioProducto, getFactorCliente } from "./catalogoProductos";
import { priceMatrices, CLIENTE_FACTORES, redondearPrecio, getPasoRedondeo } from "./precios";

// El precio del Sello de Andén ya se rompió tres veces por el mismo sitio:
// primero el índice de rango quedó fijo en [1] (todos los sellos cobraban
// precio de rango medio), después una reescritura perdió el factor del tipo de
// cliente, y el desglose que se pinta en el cotizador siguió mostrando los
// valores crudos de la matriz mucho después de que el cálculo sí aplicara el
// factor. Estas pruebas fijan las dos reglas: el rango sale de las medidas y el
// tipo de cliente multiplica siempre.

const M = priceMatrices["Sello de Andén"];
const sello = (extra) => ({
  tipo: "Sello de Andén",
  cliente: "Distribuidor",
  componentes: ["sello completo"],
  ...extra,
});

describe("precio del Sello de Andén", () => {
  it("cotiza el sello completo como cortina (por ancho) + postes (por alto)", () => {
    // 1800 cae en el primer rango, 3200 en el tercero: si el índice se volviera
    // a congelar o a leerse del eje equivocado, este caso lo delata.
    const r = getPrecioProducto(sello({ ancho: 1800, alto: 3200 }));
    expect(r.ajustado).toBe(M.base.cortina[0] + M.base.postes[2]);
  });

  it("cobra cada componente suelto por su propio eje", () => {
    const medidas = { ancho: 1800, alto: 3200 };
    const cortina = getPrecioProducto(sello({ ...medidas, componentes: ["cortina"] }));
    const postes = getPrecioProducto(sello({ ...medidas, componentes: ["postes laterales"] }));
    const travesano = getPrecioProducto(sello({ ...medidas, componentes: ["travesaño"] }));

    expect(cortina.ajustado).toBe(M.base.cortina[0]);   // por ancho
    expect(postes.ajustado).toBe(M.base.postes[2]);     // por alto
    expect(travesano.ajustado).toBe(M.base.travesano[0]); // por ancho
  });

  it("suma el travesaño encima del sello completo", () => {
    const medidas = { ancho: 2500, alto: 2500 };
    const conTravesano = getPrecioProducto(sello({ ...medidas, componentes: ["sello completo", "travesaño"] }));
    const sinTravesano = getPrecioProducto(sello(medidas));
    expect(conTravesano.ajustado - sinTravesano.ajustado).toBe(M.base.travesano[1]);
  });

  it("aplica el factor de cada tipo de cliente sobre la matriz de Distribuidor", () => {
    const medidas = { ancho: 2500, alto: 2500 };
    const distribuidor = getPrecioProducto(sello(medidas)).ajustado;

    for (const cliente of Object.keys(CLIENTE_FACTORES)) {
      const r = getPrecioProducto(sello({ ...medidas, cliente }));
      const esperado = redondearPrecio(Math.round(distribuidor * CLIENTE_FACTORES[cliente]), "Sello de Andén");
      expect(r.ajustado, cliente).toBe(esperado);
    }

    // Y no son todos iguales: el bug original era justamente ese.
    const contado = getPrecioProducto(sello({ ...medidas, cliente: "Cliente Final Contado" })).ajustado;
    expect(contado).toBeGreaterThan(distribuidor);
  });

  it("expone el mismo factor que usa el cálculo, para que el desglose cuadre", () => {
    const medidas = { ancho: 2500, alto: 2500, cliente: "Cliente Final Contado" };
    const factor = getFactorCliente("Sello de Andén", medidas.cliente);
    const lineas = Math.round(M.base.cortina[1] * factor) + Math.round(M.base.postes[1] * factor);
    const cobrado = getPrecioProducto(sello(medidas)).ajustado;

    // El desglose del cotizador pinta esas líneas; sólo puede separarse del
    // precio cobrado por el redondeo.
    expect(Math.abs(cobrado - lineas)).toBeLessThan(getPasoRedondeo("Sello de Andén"));
  });

  it("sin medidas no inventa un precio", () => {
    expect(getPrecioProducto(sello({ ancho: "", alto: "" })).ajustado).toBe(0);
  });
});
