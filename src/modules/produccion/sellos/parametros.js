// Parámetros configurables del proceso de fabricación de Sellos de Andén.
// Modificar aquí para ajustar sin tocar la lógica de cálculo.

export const PARAMETROS_SELLO = {
  // Lona
  ANCHO_ROLLO_LONA_MM: 1550,
  RECORTE_CORTINA_MM:  330,   // recorte que se aplica al rollo para obtener el largo útil de cortina

  // Herraje y fijación (por sello)
  ANGULOS_POR_SELLO:    6,
  PLATINAS_POR_SELLO:   6,
  LARGO_PLATINA_MM:     120,  // mm por platina → total = 6 × 120 = 720 mm por sello

  // Tapas (constantes por sello, no por pedido)
  TAPAS_SUPERIORES_POR_SELLO: 2,
  TAPAS_INFERIORES_POR_SELLO: 2,

  // Espesores por defecto (editables en formulario)
  ESPESOR_SELLO_DEFAULT_MM:     250,
  ESPESOR_POSTE_DEFAULT_MM:     250,
  ESPESOR_TRAVESANO_DEFAULT_MM: 250,

  // Despliegue de cortina por defecto
  DESPLIEGUE_CORTINA_DEFAULT_MM: 800,
};
