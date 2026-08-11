// Catálogos de referencia para las fichas básicas — las órdenes que pasan a
// producción/despacho pero no tienen ficha de fabricación: repuestos y
// productos que salen tal cual de bodega (semáforos, lámparas, topes, rampas…).
//
// Son sugerencias para el autocompletado, NO una lista cerrada: los campos
// aceptan cualquier texto, porque el surtido cambia con cada pedido.

export const CATEGORIAS_GENERAL = [
  "REPUESTO",
  "SEMÁFORO",
  "LÁMPARA",
  "TOPE",
  "RAMPA",
  "NIVELADOR",
  "GUARDACHOQUE",
  "CORTINA",
  "HERRAJE",
  "ACCESORIO",
  "SERVICIO",
  "OTRO",
];

export const UNIDADES_GENERAL = [
  "UND", "JUEGO", "PAR", "M", "M²", "KG", "ROLLO", "CAJA", "GLOBAL",
];

export const UNIDAD_POR_DEFECTO = "UND";
