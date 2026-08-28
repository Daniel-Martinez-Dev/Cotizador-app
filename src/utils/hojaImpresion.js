// Ajuste de la ficha a la hoja de papel.
//
// Las fichas se imprimen como una imagen rasterizada al ancho de diseño (ver
// fichas/FichaImpresionShell.jsx y fichaImpresionMovil.js): el papel no vuelve
// a maquetar nada, solo encoge esa imagen hasta que entra completa. Aquí está
// la cuenta de cuánto encogerla, que es la misma para el PDF del celular y para
// la hoja del PC.

export const CARTA_HORIZONTAL_MM = { ancho: 279.4, alto: 215.9 };
export const MARGEN_MM = 5;

// Área imprimible: la hoja menos los márgenes de cada lado.
export const HOJA_CARTA_MM = {
  ancho: CARTA_HORIZONTAL_MM.ancho - MARGEN_MM * 2,
  alto:  CARTA_HORIZONTAL_MM.alto  - MARGEN_MM * 2,
};

// Tamaño en milímetros con el que se coloca la imagen de la ficha: entra
// completa y sin deformarse. Nunca la agranda por encima de la hoja, y si la
// ficha fuera más pequeña que el área imprimible igual la lleva hasta el borde
// —las fichas siempre son más grandes, pero así el resultado no depende de eso.
export function tamanoEnHoja({ width, height }, hoja = HOJA_CARTA_MM) {
  if (!(width > 0) || !(height > 0)) return { anchoMm: hoja.ancho, altoMm: hoja.alto };
  const escala = Math.min(hoja.ancho / width, hoja.alto / height);
  return { anchoMm: width * escala, altoMm: height * escala };
}
