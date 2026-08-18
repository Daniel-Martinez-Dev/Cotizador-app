// Parámetros configurables del proceso de fabricación de Puertas Seccionales.
// Portado de la hoja "FICHA DE FABRICACION DE PUERTAS SECCIONALES" del Excel de
// ingeniería — ficha de referencia OP001248 (cliente MHT, ancho vano=2,35 m,
// alto vano=2,45 m, tipo CURVA, cantidad=1). Ver CASOS_PRUEBA en calcular.js.
//
// UNIDADES: el Excel de origen trabaja en METROS; aquí todo va en MILÍMETROS,
// igual que las otras cuatro líneas de producción (División, Sello, Abrigo,
// Puerta Rápida) y que el formateador compartido `fmtMm`. Así una medida
// significa lo mismo en cualquier pestaña de la app. Cada offset lleva al lado
// su equivalente en la fórmula original.

export const PARAMETROS_PUERTA_SECCIONAL = {
  // Tipos de puerta — define recorrido de rieles, tambor y medida de guaya.
  TIPOS: ["CURVA", "VERTICAL"],

  // ── Medidas derivadas ──────────────────────────────────────────────────────
  OFFSET_PANEL_ZOCALO_CAUCHO_MM: 50,   // anchoPanel = anchoVano + 0,05 m   (H10)
  ALTO_PANEL_MM:                 500,  // cantidadPaneles = techo(altoVano / 0,5 m)   (H11)
  OFFSET_EJE_SUPERIOR_MM:        600,  // ejeSuperior = anchoVano + 0,6 m   (H12)
  AVANCE_RESORTE_POR_VUELTA_MM:  390,  // vueltasResorte = techo(altoVano / 0,39 m)   (J12)
  OFFSET_GUIAS_HORIZONTALES_MM:  300,  // guiasHorizontales = altoVano - 0,3 m   (J13)
  OFFSET_MEDIDA_GUAYA_MM:        1000, // guaya = altoVano + 1 m (CURVA) · altoVano×2 + 1 m (VERTICAL)   (H21)

  // La ventana va centrada a lo ancho del 3.er panel: centroVentana = anchoVano / 2  (J10)
  PANEL_DE_LA_VENTANA: 3,

  // ── Tambor (F12) ───────────────────────────────────────────────────────────
  // Primer tramo cuyo tope de alto de vano alcance el de la puerta. Fuera de
  // rango no se elige referencia: la ficha imprime TAMBOR_FUERA_DE_RANGO para
  // que ingeniería lo defina. Replica la fórmula anidada del Excel:
  //   =SI(F11="VERTICAL";SI(J9<=3,2;"11 CONO";SI(J9<=5,3;"18 CONO";"REVISAR TAMBOR"));
  //     SI(F11="CURVA";SI(J9<=3,5;"12 CIL";SI(J9<=5,3;"18 CONO";"REVISAR TAMBOR"));"REVISAR TAMBOR"))
  TAMBOR_POR_TIPO: {
    VERTICAL: [{ hastaAltoMm: 3200, valor: "11 CONO" }, { hastaAltoMm: 5300, valor: "18 CONO" }],
    CURVA:    [{ hastaAltoMm: 3500, valor: "12 CIL"  }, { hastaAltoMm: 5300, valor: "18 CONO" }],
  },
  TAMBOR_FUERA_DE_RANGO: "REVISAR TAMBOR",
  TAMBOR_OPCIONES: ["11 CONO", "12 CIL", "18 CONO"],

  // ── Listado de empaque — cantidades por puerta (se multiplican × cantidad) ──
  // Es la única lista de la ficha: absorbe el bloque "Control de despacho" del
  // Excel, que traía las mismas piezas con menos detalle (ver calcular.js).
  MOTOR_CAJA_CONTROL_UND:  1,  // solo si la puerta lleva motor (F13 = SI)
  EJE_UND:                 1,  // del largo del eje superior
  TAMBORES_UND:            2,
  ANGULOS_PERFORADOS_UND:  4,
  SOPORTE_SUPERIOR_UND:    2,
  RODAMIENTOS_GRANDES_UND: 4,
  GUAYAS_UND:              2,
  MENSULAS_CAIDAS_UND:     2,

  // Bisagras laterales = 2 × (paneles − 1) × cantidad   (J19)
  // Bisagras centrales = (paneles − 1) × cantidad, y el doble en vanos anchos   (J20)
  // Los rodamientos pequeños van uno por bisagra lateral (=J19 en el Excel).
  UMBRAL_BISAGRAS_CENTRALES_MM: 3000, // SI(anchoVano > 3 m; 2×(paneles−1); paneles−1)

  // Chumaceras porta eje y cuñas dependen del número de resortes montados.
  CHUMACERAS_1_RESORTE:  3,
  CHUMACERAS_2_RESORTES: 4,
  CUNAS_1_RESORTE:       3,
  CUNAS_2_RESORTES:      4,

  AUTOPERFORANTES_POR_PANEL: 16, // autoperforantes = 16 × paneles + 20
  AUTOPERFORANTES_EXTRA:     20,

  // Ángulo porta guías: 2 tramos del alto del vano más un sobrante.
  // PENDIENTE: el sobrante ("2 DEL ALTO DEL VANO + …") está cortado en la
  // captura del listado de empaque; queda en 0 hasta confirmarlo, y el largo se
  // puede corregir a mano en la ficha.
  ANGULO_PORTA_GUIAS_EXTRA_MM: 0,
  ANGULO_PORTA_GUIAS_UND:      2,

  // Empaques de caucho — 4 piezas por puerta, que es el "CAUCHO = 4" del
  // control de despacho abierto en las piezas que se cortan de distinto largo.
  CAUCHO_LATERAL_UND:  2, // del alto del ángulo porta guías
  CAUCHO_INFERIOR_UND: 1, // del ancho del panel
  CAUCHO_SUPERIOR_UND: 1, // del ancho del panel

  // Rieles: los rectos van siempre del alto del vano. La CURVA lleva 2 y los
  // entrega a 2 rieles curvos; la VERTICAL no lleva curvos y sube derecho al
  // doble del alto, así que lleva 4 rectos — dos empatados por lado.
  RIELES_RECTOS_CURVA_UND:    2,
  RIELES_RECTOS_VERTICAL_UND: 4,
  RIELES_CURVOS_UND:          2,

  // ── Resorte ────────────────────────────────────────────────────────────────
  // PENDIENTE: no hay fórmula para calcular el resorte necesario. Por ahora la
  // cantidad se digita y el calibre/largo se anotan en la ficha; el listado de
  // empaque pide mostrar "CANTIDAD · CALIBRE · LARGO".
  RESORTES_DEFAULT: 1,

  // Fecha de entrega estimada = fechaOrden + (cantidad × este valor) días
  // hábiles — replica =DIA.LAB(F8;(J8*4)) del Excel de origen.
  DIAS_HABILES_POR_UNIDAD: 4,
};
