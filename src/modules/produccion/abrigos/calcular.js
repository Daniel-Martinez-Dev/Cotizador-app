// Motor de cálculo para Abrigos de Andén — Cold Chain Services.
// Función pura: (input, params?) => resultado | null
// Todas las medidas en mm. Lona y banda PVC en m².

import { PARAMETROS_ABRIGO } from "./parametros.js";

/**
 * Agrega N días hábiles (lun–vie) a una fecha ISO "YYYY-MM-DD".
 * @param {string} fechaIso
 * @param {number} dias
 * @returns {string}
 */
function addWorkDays(fechaIso, dias) {
  const d = new Date(fechaIso + "T00:00:00");
  let added = 0;
  while (added < dias) {
    d.setDate(d.getDate() + 1);
    const dow = d.getDay();
    if (dow !== 0 && dow !== 6) added++;
  }
  return d.toISOString().slice(0, 10);
}

/**
 * @param {object}  input
 * @param {string}  [input.cliente]
 * @param {number}  input.ancho            Ancho del abrigo (mm)
 * @param {number}  input.alto             Alto del abrigo (mm)
 * @param {number}  [input.casas=910]      Largo de las casitas (mm)
 * @param {number}  [input.cantidad=1]     Cantidad de abrigos del pedido
 * @param {string}  [input.numeroOP]
 * @param {string}  [input.fechaOrden]     "YYYY-MM-DD"
 * @param {string}  [input.auxiliarEncargado]
 * @param {string}  [input.color]
 * @param {'PINTADO'|'GALVANIZADO'} [input.acabado]
 * @param {boolean} [input.llevaBanda=true]
 * @param {object}  [params]               Sobrescribe PARAMETROS_ABRIGO
 * @returns {{ medidas, materiaPrimaPorAbrigo, materiaPrimaTotal, alistamiento, despacho, fechaEntrega } | null}
 */
export function calcularAbrigo(input, params = PARAMETROS_ABRIGO) {
  const ancho    = Number(input.ancho);
  const alto     = Number(input.alto);
  const casas    = Number(input.casas   ?? 910);
  const cantidad = Math.max(1, Math.floor(Number(input.cantidad ?? 1)));
  const llevaBanda = input.llevaBanda !== false;

  if (!ancho || ancho <= 0 || !alto || alto <= 0) return null;

  const {
    traslapeLonaPerimetral,
    descuentoBandaLateral,
    descuentoTravesano,
    anchoRolloLona,
    anchoBandaPVCLateral,
    anchoBandaPVCSuperior,
    largoRolloManguera,
    travesanosPorAbrigo,
    casitasPorAbrigo,
    largueroPorAbrigo,
    uDoble5x5PorAbrigo,
    refuerzosPlatinaPorAbrigo,
    tubosMediaPorAbrigo,
    tuercasArandelasPorAbrigo,
    tuercasArandelasExtrasPedido,
    tornillos38x25PorAbrigo,
    tornillosAutorroscantesPorAbrigo,
    manguerasLargoAnchoPorAbrigo,
    manguerasLargoAltoPorAbrigo,
    pesoBandaSuperior,
    pesoBandasLateralesJuego,
    pesoPaqueteLargueros,
    pesoPaqueteCumbreras,
    pesoPaqLonaMangueraTornilleria,
  } = params;

  if (descuentoTravesano >= alto) return null; // travesaño quedaría negativo

  // ── Medidas (mm) ───────────────────────────────────────────────────────────

  const loneaPerimetro     = 2 * alto + ancho + traslapeLonaPerimetral;
  const bandaLateralLargo  = alto - descuentoBandaLateral;
  const bandaLateralAncho  = anchoBandaPVCLateral;
  const bandaSuperiorLargo = ancho;
  const bandaSuperiorAncho = anchoBandaPVCSuperior;
  const travesanoLargo     = alto - descuentoTravesano;
  const travesanoCantidad  = travesanosPorAbrigo;
  const casitasLargo       = casas;
  const casitasCantidad    = casitasPorAbrigo;
  const manguerasCantidad  = Math.ceil((alto * 4 + ancho * 2) / largoRolloManguera);

  const medidas = {
    loneaPerimetro,
    bandaLateralLargo,
    bandaLateralAncho,
    bandaSuperiorLargo,
    bandaSuperiorAncho,
    travesanoLargo,
    travesanoCantidad,
    casitasLargo,
    casitasCantidad,
    manguerasCantidad,
  };

  // ── Materia prima por abrigo ───────────────────────────────────────────────

  const lonaPerimetral_m2   = (loneaPerimetro * anchoRolloLona) / 1_000_000;
  const bandaPVC_m2         = llevaBanda
    ? (bandaLateralAncho * 2 * bandaLateralLargo + bandaSuperiorAncho * bandaSuperiorLargo) / 1_000_000
    : 0;
  const tuberiaMarco_und    = largueroPorAbrigo;
  const tuberiaTravesanos_m = (casas * travesanosPorAbrigo) / 1000;
  const mangueras_und       = manguerasCantidad;
  const uDoble5x5_und       = uDoble5x5PorAbrigo;
  const refuerzosPlatina_und = refuerzosPlatinaPorAbrigo;
  const tubosMedia_und      = tubosMediaPorAbrigo;
  // Tuercas por abrigo: prorratea el excedente del pedido entre los abrigos
  const tuercasArandelas_und = tuercasArandelasPorAbrigo + tuercasArandelasExtrasPedido / cantidad;

  const materiaPrimaPorAbrigo = {
    lonaPerimetral_m2,
    bandaPVC_m2,
    tuberiaMarco_und,
    tuberiaTravesanos_m,
    mangueras_und,
    uDoble5x5_und,
    refuerzosPlatina_und,
    tubosMedia_und,
    tuercasArandelas_und,
  };

  // ── Materia prima total pedido ─────────────────────────────────────────────

  const materiaPrimaTotal = {
    lonaPerimetral_m2:    lonaPerimetral_m2    * cantidad,
    bandaPVC_m2:          bandaPVC_m2          * cantidad,
    tuberiaMarco_und:     tuberiaMarco_und     * cantidad,
    tuberiaTravesanos_m:  tuberiaTravesanos_m  * cantidad,
    mangueras_und:        mangueras_und        * cantidad,
    uDoble5x5_und:        uDoble5x5_und        * cantidad,
    refuerzosPlatina_und: refuerzosPlatina_und * cantidad,
    tubosMedia_und:       tubosMedia_und       * cantidad,
    // Fórmula especial: tuercas no es lineal por abrigo
    tuercasArandelas_und: tuercasArandelasPorAbrigo * cantidad + tuercasArandelasExtrasPedido,
  };

  // ── Cantidades adicionales para alistar ───────────────────────────────────

  const alistamiento = {
    manguerasCantAncho:      manguerasLargoAnchoPorAbrigo * cantidad,
    manguerasDimAncho:       ancho,
    manguerasCantAlto:       manguerasLargoAltoPorAbrigo  * cantidad,
    manguerasDimAlto:        alto,
    tornillos38x25:          tornillos38x25PorAbrigo          * cantidad,
    tornillosAutorroscantes: tornillosAutorroscantesPorAbrigo * cantidad,
  };

  // ── Tabla de control de despacho ──────────────────────────────────────────

  const despachoItems = [
    {
      descripcion: "Banda Superior",
      medidas:     `${bandaSuperiorAncho} × ${bandaSuperiorLargo}`,
      pesoUnitKg:  pesoBandaSuperior,
      cantidad,
      pesoTotalKg: pesoBandaSuperior * cantidad,
    },
    {
      descripcion: "Juego Banda Laterales",
      medidas:     `${bandaLateralAncho} × ${bandaLateralLargo}`,
      pesoUnitKg:  pesoBandasLateralesJuego,
      cantidad,
      pesoTotalKg: pesoBandasLateralesJuego * cantidad,
    },
    {
      descripcion: "Paquete Largueros",
      medidas:     `${travesanoLargo} × 15 × 10`,
      pesoUnitKg:  pesoPaqueteLargueros,
      cantidad,
      pesoTotalKg: pesoPaqueteLargueros * cantidad,
    },
    {
      descripcion: "Paquete Cumbreras",
      medidas:     `${alto} × 15 × 10`,
      pesoUnitKg:  pesoPaqueteCumbreras,
      cantidad,
      pesoTotalKg: pesoPaqueteCumbreras * cantidad,
    },
    {
      descripcion: "Paq Lona/Manguera/Tornillería",
      medidas:     "45 × 45 × 10",
      pesoUnitKg:  pesoPaqLonaMangueraTornilleria,
      cantidad,
      pesoTotalKg: pesoPaqLonaMangueraTornilleria * cantidad,
    },
  ];

  const pesoTotalKg = despachoItems.reduce((sum, item) => sum + item.pesoTotalKg, 0);

  const despacho = { items: despachoItems, pesoTotalKg };

  // ── Fecha entrega: WORKDAY(fechaOrden, FLOOR(cantidad/2) + 2) ──────────────

  const fechaEntrega = input.fechaOrden
    ? addWorkDays(input.fechaOrden, Math.floor(cantidad / 2) + 2)
    : null;

  return {
    medidas,
    materiaPrimaPorAbrigo,
    materiaPrimaTotal,
    alistamiento,
    despacho,
    fechaEntrega,
  };
}

// ─── Casos de prueba — verificados contra el caso BIMBO ──────────────────────
// Input: ancho=3500, alto=3600, casas=910, cantidad=1, llevaBanda=true
//
// Medidas esperadas (mm):
//   loneaPerimetro=10740, bandaLateralLargo=3520, bandaLateralAncho=800
//   bandaSuperiorLargo=3500, bandaSuperiorAncho=1600
//   travesanoLargo=3400, travesanoCantidad=4
//   casitasLargo=910, casitasCantidad=2, manguerasCantidad=4
//
// Materia prima por abrigo:
//   lonaPerimetral_m2=7.518, bandaPVC_m2=11.232
//   tuberiaMarco_und=4, tuberiaTravesanos_m=3.64, mangueras_und=4
//   uDoble5x5_und=8, refuerzosPlatina_und=8, tubosMedia_und=8
//   tuercasArandelas_und=22 (20 + 2/1)
//
// Despacho total pedido: 12.6+15+36+24+2.5 = 90.1 kg

export const CASOS_PRUEBA_ABRIGO = [
  {
    descripcion: "BIMBO — ancho=3500, alto=3600, casas=910, cantidad=1",
    input: {
      cliente: "BIMBO",
      cantidad: 1,
      ancho: 3500,
      alto: 3600,
      casas: 910,
      color: "NEGRO",
      acabado: "PINTADO",
      llevaBanda: true,
      fechaOrden: "2026-01-06",
    },
    medidas: {
      loneaPerimetro:     10740,
      bandaLateralLargo:  3520,
      bandaLateralAncho:  800,
      bandaSuperiorLargo: 3500,
      bandaSuperiorAncho: 1600,
      travesanoLargo:     3400,
      travesanoCantidad:  4,
      casitasLargo:       910,
      casitasCantidad:    2,
      manguerasCantidad:  4,
    },
    materiaPrimaPorAbrigo: {
      lonaPerimetral_m2:    7.518,
      bandaPVC_m2:          11.232,
      tuberiaMarco_und:     4,
      tuberiaTravesanos_m:  3.64,
      mangueras_und:        4,
      uDoble5x5_und:        8,
      refuerzosPlatina_und: 8,
      tubosMedia_und:       8,
      tuercasArandelas_und: 22,
    },
    pesoTotalKg: 90.1,
  },
];
