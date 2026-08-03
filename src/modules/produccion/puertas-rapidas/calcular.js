// Motor de cálculo para Puertas Rápidas — Cold Chain Services.
// Función pura: (input, params?) => { medidas, empaque } | null
// Todas las medidas en MILÍMETROS (igual que los demás productos de
// producción) — el M2 cortina es la única excepción, reportada en m².
// Fórmulas verificadas contra la ficha real OP001234 (ANDACO, ancho vano=3500 mm,
// alto vano=3050 mm, cantidad=1) — ver CASOS_PRUEBA al final.

import { addBusinessDays, formatISO, parseISO } from "date-fns";
import { PARAMETROS_PUERTA_RAPIDA } from "./parametros.js";

export function calcularPuertaRapida(input, params = PARAMETROS_PUERTA_RAPIDA) {
  const anchoVano = Number(input.anchoVano);
  const altoVano  = Number(input.altoVano);
  if (!anchoVano || !altoVano || anchoVano <= 0 || altoVano <= 0) return null;

  const cantidad = Number(input.cantidad || 1);
  const distanciaCortavientos = Number(input.distanciaCortavientos || params.DISTANCIA_CORTAVIENTOS_DEFAULT_MM);

  const vinilo         = anchoVano + params.OFFSET_VINILO_MM;
  const largoCortina   = altoVano + params.OFFSET_LARGO_CORTINA_MM;
  const cubreRollo     = anchoVano + params.OFFSET_CUBRE_ROLLO_MM;
  const alturaParales  = altoVano + params.OFFSET_ALTURA_PARALES_MM;
  const ejeZocalo      = cubreRollo - params.OFFSET_EJE_ZOCALO_MM;
  const tuboEstructura = cubreRollo - params.OFFSET_TUBO_ESTRUCTURA_MM;
  const anchoTotalPuerta = cubreRollo + params.OFFSET_ANCHO_TOTAL_MM;

  // M2 cortina: única medida en m² — se convierten los mm a m antes de multiplicar.
  const m2Cortina = (largoCortina / 1000) * (ejeZocalo / 1000);
  const base     = altoVano >= params.UMBRAL_BASE_GRANDE_MM ? "GRANDE" : "PEQUEÑA";
  const ejeMotor = base === "GRANDE" ? "GRANDE" : "PEQUEÑO";
  const motorKw  = m2Cortina <= params.UMBRAL_MOTOR_KW_M2 ? "0,75Kw" : "1,5Kw";

  const anadidoCubreRollo = cubreRollo > params.UMBRAL_ANADIDO_CUBRE_ROLLO_MM
    ? cubreRollo - params.RESTA_ANADIDO_CUBRE_ROLLO_MM
    : 0;
  const anadidoPorParal = alturaParales >= params.UMBRAL_ANADIDO_PARAL_MM
    ? alturaParales - params.RESTA_ANADIDO_PARAL_MM
    : 0;

  const altoCubrerrollo = base === "GRANDE" ? params.ALTO_CUBRERROLLO_GRANDE_MM : params.ALTO_CUBRERROLLO_PEQUENO_MM;
  const altoTotalPuerta = alturaParales + altoCubrerrollo;

  const cantidadCortavientos = Math.ceil((largoCortina - params.CORTAVIENTOS_MARGEN_MM) / distanciaCortavientos);

  const medidas = {
    vinilo, largoCortina, cubreRollo, alturaParales, ejeZocalo, tuboEstructura,
    anchoTotalPuerta, altoTotalPuerta, altoCubrerrollo, m2Cortina,
    base, ejeMotor, motorKw,
    anadidoCubreRollo, anadidoPorParal,
    distanciaCortavientos, cantidadCortavientos,
  };

  const tuboGalvanizado  = alturaParales - params.OFFSET_TUBO_GALVANIZADO_MM;
  const canaletaPlastica = params.CANALETA_FACTOR * (alturaParales - params.CANALETA_OFFSET_MM);

  const empaque = [
    { insumo: "MOTOR Y CAJA DE CONTROL",                   unidad: "und", cantidad: params.MOTOR_CAJA_CONTROL_UND },
    { insumo: "BOTONERA",                                  unidad: "und", cantidad: params.BOTONERA_UND },
    { insumo: "RADAR",                                     unidad: "und", cantidad: params.RADAR_UND },
    { insumo: "CONTROL REMOTO + CABLE",                    unidad: "und", cantidad: params.CONTROL_REMOTO_UND },
    { insumo: "AIRBAG",                                    unidad: "und", cantidad: params.AIRBAG_UND },
    { insumo: "ESTRUCTURA LONA",                           unidad: "und", cantidad },
    { insumo: "PARALES",                                   unidad: "und", cantidad: params.PARALES_UND },
    { insumo: "CORTINA OPTICA",                            unidad: "und", cantidad },
    { insumo: "TUBO GALVANIZADO",                          unidad: "mm",  cantidad: tuboGalvanizado },
    { insumo: "CABLE 2 HILOS NEGRO Y BLANCO",               unidad: "mm",  cantidad: alturaParales },
    { insumo: "CANALETA PLASTICA",                         unidad: "mm",  cantidad: canaletaPlastica },
    { insumo: "UNIÓN + TERMINAL EMT + 2 ABRAZADERAS 1\"",  unidad: "und", cantidad: params.UNION_TERMINAL_EMT_UND },
    { insumo: "CORAZA + TERMINALES 1/2\" Y 1\"",           unidad: "und", cantidad: params.CORAZA_TERMINALES_UND },
    {
      insumo: "TRANSFORMADOR / UPS", unidad: "", cantidad: null,
      texto: params.TRANSFORMADOR_UPS_DEFAULT, opciones: params.TRANSFORMADOR_UPS_OPCIONES,
    },
    { insumo: "LOOP MAGNETICO",                            unidad: "und", cantidad: params.LOOP_MAGNETICO_UND },
  ];

  return { medidas, empaque };
}

// Fecha de entrega estimada = fechaOrden + (cantidad × DIAS_HABILES_POR_UNIDAD) días
// hábiles (lunes a viernes) — replica =DIA.LAB(fechaOrden;cantidad*4) del Excel de origen.
export function calcularFechaEntrega(fechaOrden, cantidad, params = PARAMETROS_PUERTA_RAPIDA) {
  if (!fechaOrden) return "";
  const base = typeof fechaOrden === "string" ? parseISO(fechaOrden) : fechaOrden;
  if (Number.isNaN(base.getTime())) return "";
  const dias = Number(cantidad || 1) * params.DIAS_HABILES_POR_UNIDAD;
  return formatISO(addBusinessDays(base, dias), { representation: "date" });
}

// ─── Caso de prueba — ficha real OP001234 (ANDACO) ────────────────────────────
export const CASOS_PRUEBA_PUERTA_RAPIDA = [
  {
    cliente: "ANDACO", cantidad: 1, anchoVano: 3500, altoVano: 3050,
    fechaOrden: "2026-07-31", fechaEntrega: "2026-08-06",
    vinilo: 3630, largoCortina: 3650, cubreRollo: 3710, alturaParales: 3250,
    ejeZocalo: 3610, tuboEstructura: 3630, anchoTotalPuerta: 3940, altoTotalPuerta: 3530,
    altoCubrerrollo: 280, m2Cortina: 13.18, base: "PEQUEÑA", ejeMotor: "PEQUEÑO", motorKw: "0,75Kw",
    anadidoCubreRollo: 662, anadidoPorParal: 210, cantidadCortavientos: 5,
  },
];
