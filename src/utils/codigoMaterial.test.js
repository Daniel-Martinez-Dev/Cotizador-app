import { describe, it, expect } from "vitest";
import {
  siglaCategoria,
  formatearSku,
  digitoVerificadorEan13,
  formatearCodigoBarras,
  esEan13Valido,
  secuenciaDesdeCodigoBarras,
  normalizarCodigoLeido,
  generarCodigosMaterial,
  itemNecesitaCodigos,
  coincideCodigoConItem,
  buscarItemPorCodigoEnLista,
  SECUENCIA_MAXIMA,
} from "./codigoMaterial";

// El código de barras es lo que decide de qué material se descuenta el stock.
// Si el dígito verificador está mal calculado, un barrido defectuoso pasa por
// bueno y el inventario se descuadra sin que nadie se entere.

describe("sigla de categoría", () => {
  it("toma tres letras sin tildes", () => {
    expect(siglaCategoria("Lámina galvanizada")).toBe("LAM");
    expect(siglaCategoria("PVC")).toBe("PVC");
  });

  it("rellena las categorías de menos de tres letras", () => {
    expect(siglaCategoria("Pu")).toBe("PUX");
  });

  it("cae en GEN cuando no hay categoría", () => {
    expect(siglaCategoria("")).toBe("GEN");
    expect(siglaCategoria("123")).toBe("GEN");
    expect(siglaCategoria(null)).toBe("GEN");
  });
});

describe("SKU", () => {
  it("combina categoría y consecutivo", () => {
    expect(formatearSku({ categoria: "Lámina", secuencia: 42 })).toBe("MP-LAM-0042");
  });

  it("no inventa SKU sin consecutivo válido", () => {
    expect(formatearSku({ categoria: "Lámina", secuencia: 0 })).toBe("");
    expect(formatearSku({ categoria: "Lámina", secuencia: -3 })).toBe("");
    expect(formatearSku({ categoria: "Lámina", secuencia: 1.5 })).toBe("");
  });

  it("crece más allá de cuatro dígitos sin truncar", () => {
    expect(formatearSku({ categoria: "Lámina", secuencia: 123456 })).toBe("MP-LAM-123456");
  });
});

describe("dígito verificador EAN-13", () => {
  // Códigos reales de referencia: si estos fallan, el algoritmo está mal.
  it("coincide con códigos conocidos", () => {
    expect(digitoVerificadorEan13("400638133393")).toBe(1);
    expect(digitoVerificadorEan13("978020137962")).toBe(4);
  });

  it("rechaza entradas que no sean 12 dígitos", () => {
    expect(digitoVerificadorEan13("12345")).toBe(-1);
    expect(digitoVerificadorEan13("40063813339X")).toBe(-1);
  });
});

describe("código de barras interno", () => {
  it("usa el prefijo 200 reservado para numeración interna", () => {
    expect(formatearCodigoBarras(42).startsWith("200")).toBe(true);
  });

  it("produce 13 dígitos válidos", () => {
    const codigo = formatearCodigoBarras(42);
    expect(codigo).toHaveLength(13);
    expect(esEan13Valido(codigo)).toBe(true);
  });

  it("es válido para todo el rango de consecutivos", () => {
    for (const n of [1, 9, 10, 999, 1000, 123456789, SECUENCIA_MAXIMA]) {
      expect(esEan13Valido(formatearCodigoBarras(n))).toBe(true);
    }
  });

  it("no genera código fuera de rango", () => {
    expect(formatearCodigoBarras(0)).toBe("");
    expect(formatearCodigoBarras(SECUENCIA_MAXIMA + 1)).toBe("");
  });

  it("detecta un dígito cambiado", () => {
    const codigo = formatearCodigoBarras(42);
    const alterado = `${codigo.slice(0, 5)}${(Number(codigo[5]) + 1) % 10}${codigo.slice(6)}`;
    expect(esEan13Valido(alterado)).toBe(false);
  });

  it("devuelve el consecutivo del que salió", () => {
    expect(secuenciaDesdeCodigoBarras(formatearCodigoBarras(1234))).toBe(1234);
  });

  it("no reconoce como interno un código de otra empresa", () => {
    expect(secuenciaDesdeCodigoBarras("4006381333931")).toBeNull();
  });
});

describe("normalización de lo que entrega el lector", () => {
  it("quita el Enter y el retorno de carro que añade la pistola", () => {
    expect(normalizarCodigoLeido("2000000000428\r\n")).toBe("2000000000428");
    expect(normalizarCodigoLeido("2000000000428\t")).toBe("2000000000428");
  });

  it("conserva el guion del SKU y sube a mayúsculas", () => {
    expect(normalizarCodigoLeido(" mp-lam-0042 ")).toBe("MP-LAM-0042");
  });

  it("tolera vacíos", () => {
    expect(normalizarCodigoLeido(null)).toBe("");
  });
});

describe("qué items necesitan códigos", () => {
  it("pide códigos cuando faltan o son inválidos", () => {
    expect(itemNecesitaCodigos({ sku: "", codigoBarras: "" })).toBe(true);
    expect(itemNecesitaCodigos({ sku: "MP-LAM-0042", codigoBarras: "" })).toBe(true);
    expect(itemNecesitaCodigos({ sku: "MP-LAM-0042", codigoBarras: "123" })).toBe(true);
  });

  it("deja en paz a los que ya están marcados", () => {
    const codigos = generarCodigosMaterial({ categoria: "Lámina", secuencia: 42 });
    expect(itemNecesitaCodigos(codigos)).toBe(false);
  });

  it("respeta un SKU escrito a mano si el código de barras es válido", () => {
    expect(itemNecesitaCodigos({ sku: "ESPUMA-25", codigoBarras: formatearCodigoBarras(9) })).toBe(false);
  });
});

describe("búsqueda por código leído", () => {
  const items = [
    { id: "a", nombre: "Lámina", sku: "MP-LAM-0042", codigoBarras: formatearCodigoBarras(42) },
    { id: "b", nombre: "Espuma", sku: "MP-ESP-0007", codigoBarras: formatearCodigoBarras(7) },
  ];

  it("encuentra por código de barras", () => {
    expect(buscarItemPorCodigoEnLista(items, formatearCodigoBarras(7))?.id).toBe("b");
  });

  it("encuentra por SKU tecleado a mano", () => {
    expect(buscarItemPorCodigoEnLista(items, "mp-lam-0042")?.id).toBe("a");
  });

  it("encuentra aunque el lector añada Enter", () => {
    expect(buscarItemPorCodigoEnLista(items, `${formatearCodigoBarras(42)}\r\n`)?.id).toBe("a");
  });

  it("devuelve null con un código desconocido", () => {
    expect(buscarItemPorCodigoEnLista(items, "4006381333931")).toBeNull();
  });

  it("no confunde un item sin códigos con un barrido vacío", () => {
    expect(coincideCodigoConItem({ sku: "", codigoBarras: "" }, "")).toBe(false);
    expect(buscarItemPorCodigoEnLista([{ id: "x", sku: "", codigoBarras: "" }], "")).toBeNull();
  });
});
