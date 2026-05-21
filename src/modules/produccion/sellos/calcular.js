// Motor de cálculo para Sellos de Andén — Cold Chain Services.
// Función pura: (input, params?) => { medidas, materiaPrima } | null
// Todas las medidas en mm. Lona en m².
// Verificado contra el caso de prueba BIMBO (ver CASOS_PRUEBA al final).

import { PARAMETROS_SELLO } from "./parametros.js";

/**
 * @param {object} input
 * @param {number}  input.anchoVano           Ancho del vano (mm)
 * @param {number}  input.altoVano            Alto del vano (mm)
 * @param {number}  [input.espesorSello=250]  Espesor del sello principal (mm)
 * @param {number}  [input.espesorPoste=250]  Espesor de los postes laterales (mm)
 * @param {number}  [input.espesorTravesano=250]
 * @param {'MADERA'|'LAMINA'} [input.materialBase='MADERA']
 * @param {boolean} [input.llevaCortina=true]
 * @param {boolean} [input.llevaTravesano=false]
 * @param {object}  [params]                  Sobrescribe PARAMETROS_SELLO
 * @returns {{ medidas: object, materiaPrima: object } | null}
 */
export function calcularSello(input, params = PARAMETROS_SELLO) {
  const anchoVano  = Number(input.anchoVano);
  const altoVano   = Number(input.altoVano);

  if (!anchoVano || !altoVano || anchoVano <= 0 || altoVano <= 0) return null;

  const espesorSello     = Number(input.espesorSello     ?? params.ESPESOR_SELLO_DEFAULT_MM);
  const espesorPoste     = Number(input.espesorPoste     ?? params.ESPESOR_POSTE_DEFAULT_MM);
  const espesorTravesano = Number(input.espesorTravesano ?? params.ESPESOR_TRAVESANO_DEFAULT_MM);
  const materialBase     = input.materialBase ?? "MADERA";
  const llevaCortina     = input.llevaCortina  !== false; // default true
  const llevaTravesano   = input.llevaTravesano === true; // default false

  const anchoRolloLona    = Number(params.ANCHO_ROLLO_LONA_MM);
  const recorteCortina    = Number(params.RECORTE_CORTINA_MM);
  const angulosPorSello   = Number(params.ANGULOS_POR_SELLO);
  const platinasPorSello  = Number(params.PLATINAS_POR_SELLO);
  const largoPlatina      = Number(params.LARGO_PLATINA_MM);

  // ── Medidas ────────────────────────────────────────────────────────────────

  const selloAncho = anchoVano + 2 * espesorSello;
  const selloAlto  = altoVano + 50;

  // espumaPostesAncho = espesorSello (= I11 en el Excel), confirmado en la ficha de producción
  const espumaPostesAncho = espesorSello;
  const espumaPostesAlto  = selloAlto;

  const tapaSuperiorLargo = espesorTravesano + 40;
  const tapaSuperiorAncho = espesorSello + 20;

  const tapaInferiorLargo = espesorTravesano + 25;
  const tapaInferiorAncho = espesorTravesano + 25;

  const forroAncho = espesorSello + 2 * espesorPoste + 30;
  const forroLargo = selloAlto + 25;

  const cortinaAncho     = llevaCortina ? anchoVano + 2 * espesorSello + 20 : 0;
  const cortinaLargoLona = llevaCortina ? anchoRolloLona - recorteCortina   : 0;

  const travesanoAncho     = llevaTravesano ? anchoVano + 500 : 0;
  const travesanoLargoLona = llevaTravesano ? travesanoAncho + 25 : 0;

  const medidas = {
    selloAncho,
    selloAlto,
    espumaPostesAncho,
    espumaPostesAlto,
    tapaSuperiorLargo,
    tapaSuperiorAncho,
    tapaInferiorLargo,
    tapaInferiorAncho,
    forroAncho,
    forroLargo,
    cortinaAncho,
    cortinaLargoLona,
    travesanoAncho,
    travesanoLargoLona,
  };

  // ── Materia prima por sello ────────────────────────────────────────────────

  const lonaM2 = (
    selloAncho * selloAlto +
    (llevaCortina   ? cortinaAncho   * cortinaLargoLona   : 0) +
    forroAncho * forroLargo * 2 +
    (llevaTravesano ? travesanoAncho * travesanoLargoLona : 0) +
    tapaSuperiorAncho * tapaSuperiorLargo * 2 +
    tapaInferiorAncho * tapaInferiorLargo * 2
  ) / 1_000_000;

  const espumaPostesMm    = 2 * selloAlto;
  const espumaTravesanoMm = llevaTravesano ? travesanoAncho : 0;
  const maderaPostesMm    = materialBase === "MADERA" ? 2 * selloAlto : 0;
  const laminaPostesMm    = materialBase === "LAMINA"  ? 2 * selloAlto : 0;
  const cadenaMm          = llevaCortina ? cortinaAncho : 0;
  const tuboMm            = llevaCortina ? cortinaAncho : 0;
  const angulosUnd        = angulosPorSello;
  const platinaMm         = platinasPorSello * largoPlatina;

  const materiaPrima = {
    lonaM2,
    espumaPostesMm,
    espumaTravesanoMm,
    maderaPostesMm,
    laminaPostesMm,
    cadenaMm,
    tuboMm,
    angulosUnd,
    platinaMm,
  };

  return { medidas, materiaPrima };
}

// ─── Casos de prueba — verificados manualmente ───────────────────────────────
// Input BIMBO: anchoVano=2400, altoVano=3200, espesorSello=250, espesorPoste=250,
//              espesorTravesano=250, materialBase=MADERA, llevaCortina=true, llevaTravesano=false
//
// Medidas esperadas (mm):
//   selloAncho=2900, selloAlto=3250, espumaPostesAncho=250, espumaPostesAlto=3250  [Excel I11, no I11+20]
//   tapaSuperiorLargo=290, tapaSuperiorAncho=270, tapaInferiorLargo=275, tapaInferiorAncho=275
//   forroAncho=780, forroLargo=3275, cortinaAncho=2920, cortinaLargoLona=1220
//
// Materia prima por sello:
//   lonaM2=18.40425, espumaPostesMm=6500, espumaTravesanoMm=0
//   maderaPostesMm=6500, laminaPostesMm=0, cadenaMm=2920, tuboMm=2920
//   angulosUnd=6, platinaMm=720
//
// Total pedido ×2:
//   lonaM2=36.8085, espumaPostesMm=13000, maderaPostesMm=13000
//   cadenaMm=5840, tuboMm=5840, angulosUnd=12, platinaMm=1440

export const CASOS_PRUEBA_SELLO = [
  {
    descripcion: "BIMBO — cortina SI, travesaño NO, madera",
    input: {
      anchoVano: 2400, altoVano: 3200,
      espesorSello: 250, espesorPoste: 250, espesorTravesano: 250,
      materialBase: "MADERA", llevaCortina: true, llevaTravesano: false,
    },
    medidas: {
      selloAncho: 2900, selloAlto: 3250,
      espumaPostesAncho: 250, espumaPostesAlto: 3250,
      tapaSuperiorLargo: 290, tapaSuperiorAncho: 270,
      tapaInferiorLargo: 275, tapaInferiorAncho: 275,
      forroAncho: 780, forroLargo: 3275,
      cortinaAncho: 2920, cortinaLargoLona: 1220,
    },
    materiaPrima: {
      lonaM2: 18.40425,
      espumaPostesMm: 6500, espumaTravesanoMm: 0,
      maderaPostesMm: 6500, laminaPostesMm: 0,
      cadenaMm: 2920, tuboMm: 2920,
      angulosUnd: 6, platinaMm: 720,
    },
  },
];
