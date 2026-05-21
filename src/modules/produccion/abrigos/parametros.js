// Parámetros configurables del proceso de fabricación de Abrigos de Andén.
// Modificar aquí para ajustar sin tocar la lógica de cálculo.

export const PARAMETROS_ABRIGO = {
  // Constantes geométricas (mm)
  traslapeLonaPerimetral:    40,    // suma al perímetro para calcular largo de lona
  descuentoBandaLateral:     80,    // se resta al alto para el largo de banda lateral PVC
  descuentoTravesano:       200,    // se resta al alto para el largo del travesaño
  anchoRolloLona:           700,    // ancho del rollo de lona perimetral (mm)
  anchoBandaPVCLateral:     800,    // ancho fijo de la banda PVC lateral (mm)
  anchoBandaPVCSuperior:   1600,    // ancho fijo de la banda PVC superior (mm)
  largoRolloManguera:      6000,    // largo estándar del rollo de manguera (mm)

  // Cantidades por abrigo (constantes)
  travesanosPorAbrigo:          4,
  casitasPorAbrigo:             2,
  largueroPorAbrigo:            4,
  uDoble5x5PorAbrigo:           8,
  refuerzosPlatinaPorAbrigo:    8,
  tubosMediaPorAbrigo:          8,
  tuercasArandelasPorAbrigo:   20,
  tuercasArandelasExtrasPedido: 2,  // se suman al total del pedido, no por abrigo
  tornillos38x25PorAbrigo:      8,
  tornillosAutorroscantesPorAbrigo: 22,
  manguerasLargoAnchoPorAbrigo: 2,  // mangueras cuya longitud = ancho del abrigo
  manguerasLargoAltoPorAbrigo:  4,  // mangueras cuya longitud = alto del abrigo

  // Pesos unitarios (kg) — tabla de control de despacho
  pesoBandaSuperior:              12.6,
  pesoBandasLateralesJuego:       15,
  pesoPaqueteLargueros:           36,
  pesoPaqueteCumbreras:           24,
  pesoPaqLonaMangueraTornilleria:  2.5,
};
