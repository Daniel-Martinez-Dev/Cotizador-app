import { describe, it, expect } from "vitest";
import { generarSeccionesHTML } from "./htmlSections";
import { calcularTotales } from "./totales";

// Extras configurados por la empresa para Puertas Rápidas (llegan de Firestore
// como override; el catálogo por defecto no trae ni "Sin botonera" ni los
// cortavientos).
const EXTRAS = [
  { nombre: "Transformador 1KVA con caja", precio: 620000 },
  { nombre: "Biométrico", precio: 380000 },
  { nombre: "Sin botonera", precio: -50000 },
  { nombre: "Cortavientos A", precio: 609000 },
  { nombre: "Cortavientos B", precio: 682000 },
  { nombre: "Cortavientos C", precio: 580000 },
];
const extrasOverride = { "Puertas Rápidas": EXTRAS };
const productosOverride = { "Puertas Rápidas": { extras: EXTRAS } };

const puerta = (precio, cortavientos, ancho, alto) => ({
  tipo: "Puertas Rápidas",
  cliente: "Cliente Final Contado",
  cantidad: 1,
  ancho,
  alto,
  precioCalculado: precio,
  extras: ["Transformador 1KVA con caja", "Biométrico", "Sin botonera", cortavientos],
});

// Las tres puertas del caso reportado por el cliente.
const productosReportados = [
  puerta(15485000, "Cortavientos A", 2505, 3040),
  puerta(16525000, "Cortavientos B", 2960, 2880),
  puerta(15485000, "Cortavientos C", 2425, 2990),
];

/** Celdas de texto de cada fila de la tabla de precios. */
function filasDeLaTabla(html) {
  const tabla = html.match(/<table[\s\S]*?<\/table>/)[0];
  return [...tabla.matchAll(/<tr[\s\S]*?<\/tr>/g)].map((f) =>
    [...f[0].matchAll(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/g)].map((c) => c[1].replace(/<[^>]+>/g, "").trim())
  );
}

const aNumero = (texto) => {
  const s = String(texto).trim();
  const n = Number(s.replace(/[^\d]/g, ""));
  return s.startsWith("-") ? -n : n;
};

/** Suma de la última columna: líneas de producto/extra más las de descuento. */
function sumaDeLaColumna(html) {
  const filas = filasDeLaTabla(html);
  const lineas = filas.filter((c) => c.length === 4 && c[0] !== "Producto" && !/^(Subtotal|IVA|Total)/i.test(c[0]));
  const descuentos = filas.filter((c) => c.length === 2 && /Descuento/i.test(c[0]));
  return {
    lineas: lineas.length,
    suma: lineas.reduce((s, c) => s + aNumero(c[3]), 0) + descuentos.reduce((s, c) => s + aNumero(c[1]), 0),
    subtotalImpreso: aNumero(filas.find((c) => /^Subtotal/i.test(c[0]))[1]),
  };
}

function tablaDe(productos, ajusteGeneral = {}) {
  const totales = calcularTotales(productos, ajusteGeneral, { extrasOverride });
  const cot = { cliente: "ACME S.A.S.", productos, ajusteGeneral, ...totales };
  return { totales, html: generarSeccionesHTML(cot, 0, productosOverride).tablaHTML };
}

describe("tabla de precios del PDF", () => {
  it("la columna de valores suma exactamente el subtotal impreso", () => {
    const { totales, html } = tablaDe(productosReportados);
    const { lineas, suma, subtotalImpreso } = sumaDeLaColumna(html);
    expect(lineas).toBe(15); // 3 productos + 12 extras
    expect(suma).toBe(52216000);
    expect(subtotalImpreso).toBe(suma);
    expect(totales.total).toBe(62137040);
  });

  it("cuadra también con descuento general", () => {
    const { totales, html } = tablaDe(productosReportados, { tipo: "Descuento", porcentaje: 12 });
    const { suma, subtotalImpreso } = sumaDeLaColumna(html);
    expect(suma).toBe(totales.subtotal);
    expect(subtotalImpreso).toBe(totales.subtotal);
  });

  it("cuadra con los MAX BULLET automáticos de Cortina Thermofilm", () => {
    const cortina = { tipo: "Cortina Thermofilm", cliente: "Cliente Final Contado", cantidad: 1, ancho: 3000, alto: 2500, precioCalculado: 1500000 };
    const { totales, html } = tablaDe([cortina]);
    const { lineas, suma, subtotalImpreso } = sumaDeLaColumna(html);
    expect(lineas).toBe(2); // producto + bullets
    expect(suma).toBe(totales.subtotal);
    expect(subtotalImpreso).toBe(totales.subtotal);
  });

  it("respeta el precio de distribuidor en los extras", () => {
    const extra = { nombre: "Juego de topes en caucho", precioDistribuidor: 480000, precioCliente: 520000 };
    const producto = { tipo: "Sello de Andén", cliente: "Distribuidor", cantidad: 1, precioCalculado: 5000000, extras: [extra.nombre] };
    const totales = calcularTotales([producto], {}, {});
    const cot = { cliente: "ACME S.A.S.", productos: [producto], ...totales };
    const html = generarSeccionesHTML(cot, 0, {}).tablaHTML;
    const { suma, subtotalImpreso } = sumaDeLaColumna(html);
    expect(totales.subtotal).toBe(5480000);
    expect(suma).toBe(totales.subtotal);
    expect(subtotalImpreso).toBe(totales.subtotal);
  });
});
