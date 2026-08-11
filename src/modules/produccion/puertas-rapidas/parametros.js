// Parámetros configurables del proceso de fabricación de Puertas Rápidas.
// Verificado contra la ficha de referencia OP001234 (cliente ANDACO,
// ancho vano=3500 mm, alto vano=3050 mm, cantidad=1) — ver CASOS_PRUEBA en calcular.js.
// Todas las medidas están en MILÍMETROS (igual que los demás productos de
// producción), salvo el M2 cortina, que se reporta en m².

export const PARAMETROS_PUERTA_RAPIDA = {
  // Offsets geométricos (mm) — cada medida derivada suma/resta un offset fijo
  // sobre el ancho o alto del vano.
  OFFSET_VINILO_MM:          130,  // vinilo = anchoVano + offset
  OFFSET_LARGO_CORTINA_MM:   600,  // largoCortina = altoVano + offset
  OFFSET_CUBRE_ROLLO_MM:     210,  // cubreRollo = anchoVano + offset
  OFFSET_ALTURA_PARALES_MM:  200,  // alturaParales = altoVano + offset
  OFFSET_EJE_ZOCALO_MM:      100,  // ejeZocalo = cubreRollo - offset
  OFFSET_TUBO_ESTRUCTURA_MM: 80,   // tuboEstructura = cubreRollo - offset
  OFFSET_ANCHO_TOTAL_MM:     230,  // anchoTotalPuerta = cubreRollo + offset

  // Umbrales de clasificación
  UMBRAL_BASE_GRANDE_MM: 3500, // altoVano >= umbral → base/eje motor "GRANDE"
  UMBRAL_MOTOR_KW_M2:    16,   // m2Cortina (m²) <= umbral → motor 0,75Kw; si no, 1,5Kw

  // Añadidos por exceder tamaño estándar de rollo/paral
  UMBRAL_ANADIDO_CUBRE_ROLLO_MM: 3050,
  RESTA_ANADIDO_CUBRE_ROLLO_MM:  3048,
  UMBRAL_ANADIDO_PARAL_MM:       3100,
  RESTA_ANADIDO_PARAL_MM:        3040,

  // Alto de cubrerrollo según tamaño de base
  ALTO_CUBRERROLLO_PEQUENO_MM: 280,
  ALTO_CUBRERROLLO_GRANDE_MM:  300,

  // Visor / vinilo transparente — el rollo viene de 600 mm de alto y se instala
  // completo, así que el alto del visor es FIJO: no depende de la distancia
  // entre cortavientos ni del alto del vano.
  ALTO_VISOR_MM: 600,

  // Cortavientos
  DISTANCIA_CORTAVIENTOS_DEFAULT_MM: 750,
  CORTAVIENTOS_MARGEN_MM:            500, // cantidadCortavientos = REDONDEAR.MAS((largoCortina - margen) / distancia)

  // Fecha de entrega estimada = fechaOrden + (cantidad × este valor) días hábiles
  DIAS_HABILES_POR_UNIDAD: 4,

  // Lista de empaque por puerta — cantidades fijas
  MOTOR_CAJA_CONTROL_UND: 1,
  BOTONERA_UND:           1,
  RADAR_UND:              1,
  CONTROL_REMOTO_UND:     1,
  AIRBAG_UND:             1,
  PARALES_UND:            2,
  UNION_TERMINAL_EMT_UND: 1,
  // Ambos en blanco en la ficha de referencia (no aplican a todas las
  // puertas) — el técnico completa la cantidad real en el momento del pedido.
  CORAZA_TERMINALES_UND:  0,
  LOOP_MAGNETICO_UND:     0,

  // Transformador / UPS — casilla de validación (lista desplegable)
  TRANSFORMADOR_UPS_OPCIONES: ["1KVA + CAJA", "2KVA + CAJA", "3KVA + CAJA", "UPS", "NO"],
  TRANSFORMADOR_UPS_DEFAULT:  "1KVA + CAJA",

  // Lista de empaque — derivadas de alturaParales (mm)
  OFFSET_TUBO_GALVANIZADO_MM: 1000, // tuboGalvanizado = alturaParales - offset
  CANALETA_OFFSET_MM:         2000, // canaletaPlastica = factor × (alturaParales - offset)
  CANALETA_FACTOR:            2,

  // Distancias fijas de instalación/montaje — especificaciones de fábrica del
  // modelo estándar (no dependen del pedido), tomadas del plano técnico de
  // referencia "Puerta Rápida Enrrollable". Se muestran en la ficha de
  // impresión como panel de referencia, junto al plano con las cotas reales.
  ANCHO_GUIA_MM:                                106,  // ancho de cada guía lateral
  DISTANCIA_MIN_SEGURIDAD_MONTAJE_MM:           50,   // holgura superior mínima para montaje
  DISTANCIA_GUIA_EXTERIOR_MOTOR_MM:             180,  // guía → cara exterior del motor
  DISTANCIA_GUIA_EXTERIOR_CUBREMOTOR_MM:        230,  // guía → cara exterior del cubremotor
  DISTANCIA_RECOMENDADA_SEGURIDAD_MM:           250,  // distancia de seguridad recomendada
  MIN_DISTANCIA_INSTALACION_MANTENIMIENTO_MM:   100,  // holgura lateral para instalación/mantenimiento
  ANCHO_ESTRUCTURA_CONTROL_MM:                  220,  // espacio lateral para cuadro de control
  ESPESOR_PARED_EXTERNA_MM:                     284,  // referencia de espesor de muro, lado externo
  ESPESOR_PARED_INTERNA_MM:                     122,  // referencia de espesor de muro, lado interno
};
