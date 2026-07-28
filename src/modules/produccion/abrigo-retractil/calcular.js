// Motor de cálculo para Abrigos Retráctiles — Cold Chain Services.
// Función pura: (input, params?) => resultado | null
// Todas las medidas en mm. Lona y banda PVC en m².
// Verificado contra ficha real OP001222 (ver CASOS_PRUEBA_ABRIGO_RETRACTIL).

import { PARAMETROS_ABRIGO_RETRACTIL } from "./parametros.js";

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
 * @param {number}  input.ancho              Ancho luz del abrigo (mm)
 * @param {number}  input.alto               Alto del abrigo (mm)
 * @param {number}  [input.travesanos=910]   Largo de los travesaños (mm)
 * @param {number}  [input.cantidad=1]       Cantidad de abrigos del pedido
 * @param {string}  [input.numeroOP]
 * @param {string}  [input.fechaOrden]       "YYYY-MM-DD"
 * @param {string}  [input.auxiliarEncargado]
 * @param {string}  [input.color]
 * @param {'PINTADO'|'GALVANIZADO'} [input.acabado]
 * @param {boolean} [input.llevaBanda=true]
 * @param {object}  [params]                 Sobrescribe PARAMETROS_ABRIGO_RETRACTIL
 * @returns {{ medidas, materiaPrimaPorAbrigo, materiaPrimaTotal, alistamiento, despacho, fechaEntrega } | null}
 */
export function calcularAbrigoRetractil(input, params = PARAMETROS_ABRIGO_RETRACTIL) {
  const ancho      = Number(input.ancho);
  const alto       = Number(input.alto);
  const travesanos = Number(input.travesanos ?? 910);
  const cantidad   = Math.max(1, Math.floor(Number(input.cantidad ?? 1)));
  const llevaBanda = input.llevaBanda !== false;

  if (!ancho || ancho <= 0 || !alto || alto <= 0) return null;

  const {
    traslapeLonaPerimetral,
    descuentoBandaLateral,
    descuentoLarguero,
    anchoRolloLona,
    anchoBandaPVCLateral,
    anchoBandaPVCSuperior,
    largoRolloManguera,
    largueroPorAbrigo,
    travesanosPorAbrigo,
    casitasPorAbrigo,
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

  if (descuentoLarguero >= alto) return null; // larguero quedaría negativo

  // ── Medidas (mm) ───────────────────────────────────────────────────────────

  // "ancho" (input) es el ANCHO TOTAL del abrigo — el vano libre (ancho luz)
  // es un valor derivado: se le resta el ancho de cada banda lateral.
  const loneaPerimetro     = 2 * alto + ancho + traslapeLonaPerimetral;
  const bandaLateralLargo  = alto - descuentoBandaLateral;
  const bandaLateralAncho  = anchoBandaPVCLateral;
  const bandaSuperiorLargo = ancho;
  const bandaSuperiorAncho = anchoBandaPVCSuperior;
  const largueroLargo      = alto - descuentoLarguero;   // postes principales del marco
  const largueroCantidad   = largueroPorAbrigo;
  const travesanoLargo     = travesanos;                  // tubos cuadrados pequeños
  const travesanoCantidad  = travesanosPorAbrigo;
  const casitasLargo       = ancho;                       // refuerzos de esquina
  const casitasCantidad    = casitasPorAbrigo;
  const manguerasCantidad  = Math.ceil((alto * 4 + ancho * 2) / largoRolloManguera);
  const anchoLuz           = ancho - 2 * anchoBandaPVCLateral; // vano libre (ancho total - 2×banda lateral)

  const medidas = {
    loneaPerimetro,
    bandaLateralLargo,
    bandaLateralAncho,
    bandaSuperiorLargo,
    bandaSuperiorAncho,
    largueroLargo,
    largueroCantidad,
    travesanoLargo,
    travesanoCantidad,
    casitasLargo,
    casitasCantidad,
    manguerasCantidad,
    anchoLuz,
  };

  // ── Materia prima por abrigo ───────────────────────────────────────────────

  const lonaPerimetral_m2   = (loneaPerimetro * anchoRolloLona) / 1_000_000;
  const bandaPVC_m2         = llevaBanda
    ? (bandaLateralAncho * 2 * bandaLateralLargo + bandaSuperiorAncho * bandaSuperiorLargo) / 1_000_000
    : 0;
  const tuberiaMarco_und    = largueroPorAbrigo;
  const tuberiaTravesanos_m = (travesanos * travesanosPorAbrigo) / 1000;
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
      medidas:     `${largueroLargo} × 15 × 10`,
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

// ─── Casos de prueba — verificados contra ficha real OP001222 ────────────────
// Input: cliente=ACL OC 770, ancho=3400, alto=3400, travesanos=910, cantidad=10
//
// Medidas esperadas (mm):
//   loneaPerimetro=10240, bandaLateralLargo=3320, bandaLateralAncho=600
//   bandaSuperiorLargo=3400, bandaSuperiorAncho=1000
//   largueroLargo=3200, largueroCantidad=4
//   travesanoLargo=910, travesanoCantidad=4
//   casitasLargo=3400 (= ancho), casitasCantidad=2
//
// Materia prima total pedido (×10):
//   tuberiaMarco_und=40, tuercasArandelas_und=202 (20×10+2)
//   mangueras largo=ancho: 20 (dim 3400), largo=alto: 40 (dim 3400)
//   tornillos 3/8: 80, autorroscantes: 220
//
// M² BANDA (por abrigo) = (600×2×3320 + 1000×3400) / 1e6 = 7.384 ≈ 7,38 (ficha real)
// Peso total pedido = (12.6+15+36+24+2.5) × 10 = 901 kg (ficha real)

export const CASOS_PRUEBA_ABRIGO_RETRACTIL = [
  {
    descripcion: "OP001222 — ACL OC 770 — ancho=3400, alto=3400, travesanos=910, cantidad=10",
    input: {
      cliente: "ACL OC 770",
      cantidad: 10,
      ancho: 3400,
      alto: 3400,
      travesanos: 910,
      color: "NEGRO",
      acabado: "PINTADO",
      llevaBanda: true,
      fechaOrden: "2026-07-19",
    },
    medidas: {
      loneaPerimetro:     10240,
      bandaLateralLargo:  3320,
      bandaLateralAncho:  600,
      bandaSuperiorLargo: 3400,
      bandaSuperiorAncho: 1000,
      largueroLargo:      3200,
      largueroCantidad:   4,
      travesanoLargo:     910,
      travesanoCantidad:  4,
      casitasLargo:       3400,
      casitasCantidad:    2,
    },
    materiaPrimaTotal: {
      tuberiaMarco_und:     40,
      tuercasArandelas_und: 202,
    },
    bandaPVC_m2PorAbrigo: 7.384,
    pesoTotalKg: 901,
  },
];
