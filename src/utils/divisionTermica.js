// Motor de cálculo para divisiones térmicas de furgones.
// Todas las medidas en mm. Convertir a m² solo para insumos comerciales (lona, policarbonato).

export const PARAMETROS_DEFAULT = {
  ANCHO_ROLLO_LONA_MM: 1530,
  IVA: 0.19,
  MARKUP: 2.1,
  ESPUMA_MM: 320,
  REATAS_MM: 2000,
  VELCROS_UND: 1,
  PEGANTE_UND: 1,
  PISOS_UND: 2,
  ICOPOR_LAMINAS: 2,
};

export function calcularMedidas(anchoVehiculo, altoVehiculo, params = PARAMETROS_DEFAULT) {
  const a = anchoVehiculo;
  const h = altoVehiculo;
  const ANCHO_ROLLO = (params && params.ANCHO_ROLLO_LONA_MM) || 1530;

  const anchoIcopor = (a + 40) / 2 - 70;
  const altoIcopor  = h - 50;

  const anchoPanel  = (a + 40) / 2;
  const altoPanel   = h + 30;

  const anchoFunda  = (a + 40) * 2 + 200;
  const altoFunda   = h + 135;

  const anchoPoli   = (a + 40) / 2 + 5;
  const altoPoli    = h - 10;

  const tirasLona     = Math.floor(anchoFunda / ANCHO_ROLLO);
  const sobranteAncho = anchoFunda - ANCHO_ROLLO * tirasLona + 30;
  const largoTira     = altoFunda;

  const medidaPiso      = anchoPanel - 50;
  const distanciaSellar = (altoFunda - 20) / 8;

  return {
    icopor:        { ancho: anchoIcopor, alto: altoIcopor },
    panel:         { ancho: anchoPanel,  alto: altoPanel },
    funda:         { ancho: anchoFunda,  alto: altoFunda },
    policarbonato: { ancho: anchoPoli,   alto: altoPoli },
    lona: { tiras: tirasLona, largoTira, sobranteAncho, anchoRollo: ANCHO_ROLLO },
    medidaPiso,
    distanciaSellar,
  };
}

export function seleccionarIcopor(anchoPanel, altoPanel) {
  return anchoPanel <= 1020 && altoPanel <= 2000 ? 'PEQUENO' : 'GRANDE';
}

export function calcularConsumo(input, m, params = PARAMETROS_DEFAULT) {
  const { tiras, largoTira, sobranteAncho, anchoRollo } = m.lona;
  const tipoIcopor    = seleccionarIcopor(m.panel.ancho, m.panel.alto);
  const llevaPlatinas = input.platinas === 'SI';

  const tornPiso     = tipoIcopor === 'PEQUENO' ? 14 : 16;
  const tornPlatinas = llevaPlatinas ? 16 : 0;
  const tornilleria  = 8 + tornPiso + tornPlatinas;

  const lonaM2  = ((tiras * anchoRollo + sobranteAncho) * largoTira) / 1_000_000;
  const policM2 = (input.anchoVehiculo * input.altoVehiculo * 2) / 1_000_000;

  const espumaMm = (params && params.ESPUMA_MM) || 320;
  const reatasMm = (params && params.REATAS_MM) || 2000;

  return {
    tipoIcopor,
    consumo: [
      { insumo: 'LONA',           unidad: 'm²',      cantidad: lonaM2 },
      { insumo: 'ICOPOR_GRANDE',  unidad: 'láminas', cantidad: tipoIcopor === 'GRANDE' ? 2 : 0 },
      { insumo: 'ICOPOR_PEQUENO', unidad: 'láminas', cantidad: tipoIcopor === 'PEQUENO' ? 2 : 0 },
      { insumo: 'ESPUMA',         unidad: 'mm',      cantidad: espumaMm },
      { insumo: 'POLICARBONATO',  unidad: 'm²',      cantidad: policM2 },
      { insumo: 'TORNILLERIA',    unidad: 'und',     cantidad: tornilleria },
      { insumo: 'PISOS',         unidad: 'und',     cantidad: 2, largoMm: m.medidaPiso },
      { insumo: 'REATAS',         unidad: 'mm',      cantidad: reatasMm },
      { insumo: 'VELCROS',        unidad: 'und',     cantidad: 1 },
      { insumo: 'PEGANTE',        unidad: 'und',     cantidad: 1 },
    ],
  };
}

export function calcularDesdeInput(input, params = PARAMETROS_DEFAULT) {
  const a = Number(input.anchoVehiculo);
  const h = Number(input.altoVehiculo);
  if (!a || !h || a <= 0 || h <= 0) return null;
  const medidas = calcularMedidas(a, h, params);
  const { tipoIcopor, consumo } = calcularConsumo({ ...input, anchoVehiculo: a, altoVehiculo: h }, medidas, params);
  return { medidas, tipoIcopor, consumo };
}

// ─── Casos de prueba validados contra el Excel de referencia ─────────────────
// Exportar para que las pruebas puedan importarlos sin necesidad de Jest.
export const CASOS_PRUEBA = [
  { ancho: 1500, alto: 1800, platinas: 'NO', icopor: 'PEQUENO', panelA: 770,  panelH: 1830, fundaA: 3280, fundaH: 1935, tiras: 2, sobrante: 250,  lonaM2: 6.405,  policM2: 5.400,  torn: 22 },
  { ancho: 1800, alto: 2000, platinas: 'NO', icopor: 'GRANDE',  panelA: 920,  panelH: 2030, fundaA: 3880, fundaH: 2135, tiras: 2, sobrante: 850,  lonaM2: 8.348,  policM2: 7.200,  torn: 24 },
  { ancho: 2000, alto: 2200, platinas: 'SI', icopor: 'GRANDE',  panelA: 1020, panelH: 2230, fundaA: 4280, fundaH: 2335, tiras: 2, sobrante: 1250, lonaM2: 10.064, policM2: 8.800,  torn: 40 },
  { ancho: 2100, alto: 2500, platinas: 'NO', icopor: 'GRANDE',  panelA: 1070, panelH: 2530, fundaA: 4480, fundaH: 2635, tiras: 2, sobrante: 1450, lonaM2: 11.884, policM2: 10.500, torn: 24 },
  { ancho: 2160, alto: 2640, platinas: 'NO', icopor: 'GRANDE',  panelA: 1100, panelH: 2670, fundaA: 4600, fundaH: 2775, tiras: 3, sobrante: 40,   lonaM2: 12.848, policM2: 11.405, torn: 24 },
  { ancho: 2300, alto: 2400, platinas: 'SI', icopor: 'GRANDE',  panelA: 1170, panelH: 2430, fundaA: 4880, fundaH: 2535, tiras: 3, sobrante: 320,  lonaM2: 12.447, policM2: 11.040, torn: 40 },
  { ancho: 2410, alto: 2330, platinas: 'NO', icopor: 'GRANDE',  panelA: 1225, panelH: 2360, fundaA: 5100, fundaH: 2465, tiras: 3, sobrante: 540,  lonaM2: 12.645, policM2: 11.231, torn: 24 },
  { ancho: 2530, alto: 2850, platinas: 'NO', icopor: 'GRANDE',  panelA: 1285, panelH: 2880, fundaA: 5340, fundaH: 2985, tiras: 3, sobrante: 780,  lonaM2: 16.029, policM2: 14.421, torn: 24 },
  { ancho: 2600, alto: 2700, platinas: 'SI', icopor: 'GRANDE',  panelA: 1320, panelH: 2730, fundaA: 5480, fundaH: 2835, tiras: 3, sobrante: 920,  lonaM2: 15.621, policM2: 14.040, torn: 40 },
  { ancho: 2700, alto: 2990, platinas: 'NO', icopor: 'GRANDE',  panelA: 1370, panelH: 3020, fundaA: 5680, fundaH: 3125, tiras: 3, sobrante: 1120, lonaM2: 17.844, policM2: 16.146, torn: 24 },
];
