// Parámetros configurables del proceso de fabricación de Abrigos Retráctiles.
// Verificado contra ficha real OP001222 (cliente ACL OC 770, ancho=alto=3400,
// cantidad=10) — ver CASOS_PRUEBA_ABRIGO_RETRACTIL en calcular.js.

export const PARAMETROS_ABRIGO_RETRACTIL = {
  // Constantes geométricas (mm)
  traslapeLonaPerimetral:    40,    // suma al perímetro para calcular largo de lona
  descuentoBandaLateral:     80,    // se resta al alto para el largo de banda lateral PVC
  descuentoLarguero:        200,    // se resta al alto para el largo del larguero (poste principal)
  anchoRolloLona:           700,    // ancho del rollo de lona perimetral (mm)
  anchoBandaPVCLateral:     600,    // ancho fijo de la banda PVC lateral (mm)
  anchoBandaPVCSuperior:   1000,    // ancho fijo de la banda PVC superior (mm)
  largoRolloManguera:      6000,    // largo estándar del rollo de manguera (mm)

  // Cantidades por abrigo (constantes)
  largueroPorAbrigo:            4,  // postes principales del marco (largo = alto - descuentoLarguero)
  travesanosPorAbrigo:          4,  // tubos cuadrados pequeños (largo = input travesanos)
  casitasPorAbrigo:             2,  // refuerzos de esquina (largo = ancho)
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
