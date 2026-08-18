// Motor de cálculo para Puertas Seccionales — Cold Chain Services.
// Función pura: (input, params?) => { medidas, empaque } | null
// Todas las medidas en MILÍMETROS (igual que los demás productos de
// producción) — el M² panel es la única excepción, reportado como en el Excel.
// Fórmulas verificadas contra la ficha real OP001248 (MHT, ancho vano=2350 mm,
// alto vano=2450 mm, tipo CURVA, cantidad=1) — ver CASOS_PRUEBA al final.

import { addBusinessDays, formatISO, parseISO } from "date-fns";
import { PARAMETROS_PUERTA_SECCIONAL } from "./parametros.js";

// Referencia de tambor (F12 del Excel): el primer tramo del tipo de puerta cuyo
// tope de alto alcance al del vano. Por encima del último tramo no hay tambor
// de catálogo, y devuelve el aviso para que ingeniería lo defina.
export function tamborSugerido(tipo, altoVano, params = PARAMETROS_PUERTA_SECCIONAL) {
  const tramos = params.TAMBOR_POR_TIPO[tipo];
  const tramo = tramos?.find((t) => altoVano <= t.hastaAltoMm);
  return tramo?.valor ?? params.TAMBOR_FUERA_DE_RANGO;
}

export function calcularPuertaSeccional(input, params = PARAMETROS_PUERTA_SECCIONAL) {
  const anchoVano = Number(input.anchoVano);
  const altoVano  = Number(input.altoVano);
  if (!anchoVano || !altoVano || anchoVano <= 0 || altoVano <= 0) return null;

  const cantidad  = Number(input.cantidad || 1);
  const tipo      = input.tipo || "CURVA";
  const conMotor  = (input.motor || "SI") === "SI";
  const resortes  = Number(input.resortes || params.RESORTES_DEFAULT);
  const ventanas  = Number(input.ventanas || 0);

  // ── Medidas derivadas ──────────────────────────────────────────────────────
  // El panel se corta más ancho que el vano: ese mismo largo lo comparten el
  // zócalo y el caucho inferior, por eso en la ficha van en una sola casilla.
  const anchoPanel      = anchoVano + params.OFFSET_PANEL_ZOCALO_CAUCHO_MM;
  const cantidadPaneles = Math.ceil(altoVano / params.ALTO_PANEL_MM);
  const centroVentana   = anchoVano / 2;
  const ejeSuperior     = anchoVano + params.OFFSET_EJE_SUPERIOR_MM;
  const vueltasResorte  = Math.ceil(altoVano / params.AVANCE_RESORTE_POR_VUELTA_MM);
  const guiasVerticales   = altoVano;
  const guiasHorizontales = altoVano - params.OFFSET_GUIAS_HORIZONTALES_MM;

  // "M² PANEL" del Excel = paneles × ancho de panel. Pese al nombre no es área:
  // son los metros lineales de panel que se cortan (cada panel mide 0,5 m de
  // alto). Se replica tal cual porque es la cifra con la que se pide el material.
  const m2Panel = (cantidadPaneles * anchoPanel) / 1000;

  // La puerta VERTICAL sube en línea recta hasta el doble del alto del vano, así
  // que su guaya —y sus rieles rectos— van al doble que los de una CURVA.
  const recorrido = tipo === "VERTICAL" ? altoVano * 2 : altoVano;
  const medidaGuaya = recorrido + params.OFFSET_MEDIDA_GUAYA_MM;

  const tambor = (input.tambor || "").trim() || tamborSugerido(tipo, altoVano, params);

  const medidas = {
    anchoPanel, cantidadPaneles, centroVentana, m2Panel,
    ejeSuperior, vueltasResorte, guiasVerticales, guiasHorizontales,
    medidaGuaya, recorrido, tambor, tipo, resortes, ventanas,
    panelDeLaVentana: params.PANEL_DE_LA_VENTANA,
  };

  // ── Listado de empaque ─────────────────────────────────────────────────────
  // Lista única de la ficha. El Excel traía además un bloque "Control de
  // despacho" con las mismas piezas contadas más grueso (PORTA EJE fijo en 3
  // sin mirar los resortes, RIELES en 4 sin separar rectos de curvos, CAUCHO en
  // 4 sin abrir los largos); se absorbió aquí, que es la versión con la que se
  // empaca de verdad, para no mantener dos conteos de lo mismo.

  // Las bisagras se cuentan por unión entre paneles: (paneles − 1) uniones, con
  // dos bisagras laterales cada una. Las centrales se duplican en vanos anchos
  // porque el panel necesita apoyo intermedio.
  const uniones = Math.max(0, cantidadPaneles - 1);
  const bisagrasLaterales = 2 * uniones * cantidad;
  const bisagrasCentrales = (anchoVano > params.UMBRAL_BISAGRAS_CENTRALES_MM ? 2 * uniones : uniones) * cantidad;

  const chumaceras = resortes >= 2 ? params.CHUMACERAS_2_RESORTES : params.CHUMACERAS_1_RESORTE;
  const cunas      = resortes >= 2 ? params.CUNAS_2_RESORTES : params.CUNAS_1_RESORTE;
  const largoAnguloPortaGuias = altoVano + params.ANGULO_PORTA_GUIAS_EXTRA_MM;
  const autoperforantes = params.AUTOPERFORANTES_POR_PANEL * cantidadPaneles + params.AUTOPERFORANTES_EXTRA;
  const rielesRectos = tipo === "VERTICAL"
    ? params.RIELES_RECTOS_VERTICAL_UND
    : params.RIELES_RECTOS_CURVA_UND;

  const largo = (mm) => `largo ${Math.round(mm)} mm`;

  const empaque = [
    // Sin motor no se despacha ni motor ni caja de control.
    { insumo: "MOTOR Y CAJA DE CONTROL", unidad: "und", cantidad: conMotor ? params.MOTOR_CAJA_CONTROL_UND * cantidad : 0 },
    { insumo: "CHUMACERA PORTA EJE",     unidad: "und", cantidad: chumaceras * cantidad },
    { insumo: "TAMBORES",                unidad: "und", cantidad: params.TAMBORES_UND * cantidad, detalle: `tipo ${tambor}` },
    // Sin fórmula para el resorte todavía: se empaca lo que diga la ficha y el
    // calibre/largo se anotan a mano sobre la orden impresa.
    { insumo: "RESORTE",                 unidad: "und", cantidad: resortes * cantidad, detalle: "calibre ____ · largo ____" },
    { insumo: "EJE",                     unidad: "und", cantidad: params.EJE_UND * cantidad, detalle: largo(ejeSuperior) },
    { insumo: "GUAYAS",                  unidad: "und", cantidad: params.GUAYAS_UND * cantidad, detalle: largo(medidaGuaya) },
    // El Excel los iguala a las bisagras laterales (=J19): va un rodamiento
    // pequeño por cada bisagra lateral.
    { insumo: "RODAMIENTOS PEQUEÑOS",    unidad: "und", cantidad: bisagrasLaterales },
    { insumo: "RODAMIENTOS GRANDES",     unidad: "und", cantidad: params.RODAMIENTOS_GRANDES_UND * cantidad },
    { insumo: "BISAGRAS CENTRALES",      unidad: "und", cantidad: bisagrasCentrales },
    { insumo: "BISAGRAS LATERALES",      unidad: "und", cantidad: bisagrasLaterales },
    { insumo: "SOPORTE SUPERIOR",        unidad: "und", cantidad: params.SOPORTE_SUPERIOR_UND * cantidad },
    { insumo: "MENSULAS PARA CAIDAS",    unidad: "und", cantidad: params.MENSULAS_CAIDAS_UND * cantidad },
    { insumo: "CUÑAS",                   unidad: "und", cantidad: cunas * cantidad },
    { insumo: "RIELES RECTOS",           unidad: "und", cantidad: rielesRectos * cantidad, detalle: largo(altoVano) },
    tipo === "CURVA"
      ? { insumo: "RIELES CURVOS",       unidad: "und", cantidad: params.RIELES_CURVOS_UND * cantidad, detalle: largo(altoVano) }
      : { insumo: "RIELES CURVOS",       unidad: "",    cantidad: null, texto: "NO LLEVA" },
    { insumo: "ANGULOS PERFORADOS",      unidad: "und", cantidad: params.ANGULOS_PERFORADOS_UND * cantidad },
    { insumo: "ANGULO PORTA GUIAS",      unidad: "und", cantidad: params.ANGULO_PORTA_GUIAS_UND * cantidad, detalle: largo(largoAnguloPortaGuias) },
    { insumo: "CAUCHO LATERAL",          unidad: "und", cantidad: params.CAUCHO_LATERAL_UND * cantidad, detalle: largo(largoAnguloPortaGuias) },
    { insumo: "CAUCHO INFERIOR",         unidad: "und", cantidad: params.CAUCHO_INFERIOR_UND * cantidad, detalle: largo(anchoPanel) },
    { insumo: "CAUCHO SUPERIOR",         unidad: "und", cantidad: params.CAUCHO_SUPERIOR_UND * cantidad, detalle: largo(anchoPanel) },
    { insumo: "AUTOPERFORANTES",         unidad: "und", cantidad: autoperforantes * cantidad },
    // En blanco en la ficha de referencia: la cantidad depende del montaje y la
    // completa el técnico al alistar el pedido.
    { insumo: "TORNILLOS CARRIAJE",      unidad: "und", cantidad: 0 },
    { insumo: "CHAZOS",                  unidad: "und", cantidad: 0 },
    { insumo: "PANELES",                 unidad: "und", cantidad: cantidadPaneles * cantidad, detalle: largo(anchoPanel) },
  ];

  return { medidas, empaque };
}

// Fecha de entrega estimada = fechaOrden + (cantidad × DIAS_HABILES_POR_UNIDAD)
// días hábiles (lunes a viernes) — replica =DIA.LAB(F8;(J8*4)) del Excel.
export function calcularFechaEntrega(fechaOrden, cantidad, params = PARAMETROS_PUERTA_SECCIONAL) {
  if (!fechaOrden) return "";
  const base = typeof fechaOrden === "string" ? parseISO(fechaOrden) : fechaOrden;
  if (Number.isNaN(base.getTime())) return "";
  const dias = Number(cantidad || 1) * params.DIAS_HABILES_POR_UNIDAD;
  return formatISO(addBusinessDays(base, dias), { representation: "date" });
}

// ─── Caso de prueba — ficha real OP001248 (MHT) ───────────────────────────────
export const CASOS_PRUEBA_PUERTA_SECCIONAL = [
  {
    cliente: "MHT", cantidad: 1, anchoVano: 2350, altoVano: 2450,
    tipo: "CURVA", motor: "SI", exclusa: "NO", factura: "SI", ventanas: 1, resortes: 1,
    fechaOrden: "2026-08-14", fechaEntrega: "2026-08-20",
    anchoPanel: 2400, cantidadPaneles: 5, centroVentana: 1175, m2Panel: 12,
    ejeSuperior: 2950, vueltasResorte: 7, guiasVerticales: 2450, guiasHorizontales: 2150,
    medidaGuaya: 3450, tambor: "12 CIL",
    // Cantidades del bloque "Control de despacho" del Excel, que hoy viven
    // dentro del listado de empaque: sirven de contraste contra la ficha real.
    empaque: {
      "MOTOR Y CAJA DE CONTROL": 1, "CHUMACERA PORTA EJE": 3, "TAMBORES": 2,
      "RESORTE": 1, "EJE": 1, "GUAYAS": 2,
      "RODAMIENTOS PEQUEÑOS": 8, "RODAMIENTOS GRANDES": 4,
      "BISAGRAS CENTRALES": 4, "BISAGRAS LATERALES": 8,
      "SOPORTE SUPERIOR": 2, "MENSULAS PARA CAIDAS": 2, "CUÑAS": 3,
      "RIELES RECTOS": 2, "RIELES CURVOS": 2, "ANGULOS PERFORADOS": 4,
      "ANGULO PORTA GUIAS": 2, "CAUCHO LATERAL": 2, "CAUCHO INFERIOR": 1, "CAUCHO SUPERIOR": 1,
      "AUTOPERFORANTES": 100, "TORNILLOS CARRIAJE": 0, "CHAZOS": 0, "PANELES": 5,
    },
  },
];
