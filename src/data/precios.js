//C:\Users\danma\Downloads\cotizador-app\src\data\precios.js
export const priceMatrices = {
  "Divisiones Térmicas": {
    base: [
      [1090000, 1130000, 1180000, 1220000, 1260000, 1310000, 1350000, 1390000],
      [1130000, 1180000, 1230000, 1280000, 1330000, 1380000, 1430000, 1470000],
      [1180000, 1230000, 1290000, 1340000, 1390000, 1450000, 1500000, 1560000],
      [1220000, 1280000, 1340000, 1400000, 1460000, 1520000, 1580000, 1640000],
      [1260000, 1330000, 1390000, 1460000, 1520000, 1590000, 1650000, 1720000],
      [1310000, 1380000, 1450000, 1520000, 1590000, 1660000, 1730000, 1800000],
      [1350000, 1430000, 1500000, 1580000, 1650000, 1730000, 1800000, 1880000],
      [1390000, 1470000, 1560000, 1640000, 1720000, 1800000, 1880000, 1960000]
    ],
    anchoRanges: [0, 1600, 1750, 1900, 2050, 2200, 2350, 2500, 2650],
    altoRanges: [0, 1600, 1750, 1900, 2050, 2200, 2350, 2500, 2650]
  },
  
  "Abrigo Retráctil Estándar": {
    base: [
      [4150000, 4300000, 4450000], // 3000-3200 alto
      [4530000, 4660000, 4800000], // 3201-3400 alto
      [4700000, 4800000, 4900000], // 3401-3600 alto
      [4900000, 5000000, 5100000], // 3601-4000 alto
      [5000000, 5060000, 5200000], // 4001-4500 alto
    ],
    anchoRanges: [3000, 3200, 3400, 3600],
    altoRanges:  [3000, 3200, 3400, 3600, 4000, 4500]
  },

  "Abrigo Retráctil Inflable": {
    base: [
      [10070000, 10440000, 10800000], // 3000–3200 alto
      [10990000, 11310000, 11650000], // 3201–3400 alto
      [11410000, 11650000, 11890000], // 3401–3600 alto
      [11890000, 12140000, 12380000], // 3601–4000 alto
      [12140000, 12280000, 12620000], // 4001–4500 alto
    ],
    anchoRanges: [3000, 3200, 3400, 3600],
    altoRanges:  [3000, 3200, 3400, 3600, 4000, 4500]
  },
  "Puertas Rápidas": {
    base: [
      [12650000, 13230000, 13800000, 14780000, 15770000, 16740000, 17730000, 18710000, 19690000, 20670000],
      [13050000, 13620000, 14200000, 15190000, 16170000, 17150000, 18130000, 20270000, 21250000, 22230000],
      [13460000, 14030000, 14610000, 15590000, 16570000, 17550000, 19690000, 20670000, 21660000, 22630000],
      [14030000, 14610000, 15190000, 16170000, 17150000, 19280000, 20270000, 21250000, 22230000, 23210000],
      [14610000, 15190000, 15770000, 16740000, 18880000, 19860000, 20850000, 21820000, 22810000, 23790000],
      [15190000, 15770000, 16340000, 18480000, 19460000, 20440000, 21430000, 22400000, 23390000, 24370000],
      [15770000, 16340000, 16920000, 19050000, 20040000, 21020000, 22000000, 22980000, 23970000, 24940000],
      [16340000, 16920000, 18650000, 19630000, 20620000, 21590000, 22580000, 23560000, 25590000, 26570000],
      [16920000, 17500000, 19230000, 20210000, 21190000, 22170000, 23160000, 24130000, 26170000, 27150000]
    ],
    anchoRanges: [0, 1750, 2250, 2750, 3250, 3750, 4250, 4750, 5250, 5750, 6250],
    altoRanges: [0, 2250, 2750, 3250, 3750, 4250, 4750, 5250, 5750, 6250]
  },
  "Sello de Andén": {
    base: {
      cortina: [448000, 548000, 603000],
      postes: [1818000, 2105000, 2176000],
      travesano: [912000, 1055000, 1089000],
      completos: [2265000, 2651000, 2779000]
    },
    medidaRanges: [0, 2000, 2900, 3500]
  }
};
// MATRIZ ESPECIAL CARROCERÍAS PANAMERICANA (DIVISIONES TÉRMICAS)
export const matrizPanamericana = {
  base: [
    [1210000, 1310000, 1420000, 1510000, 1620000], // Hasta 1600
    [1270000, 1370000, 1490000, 1580000, 1690000], // 1601 - 1900
    [1330000, 1430000, 1560000, 1650000, 1760000], // 1901 - 2200
    [1390000, 1490000, 1680000, 1720000, 1830000], // 2201 - 2450
    [1450000, 1550000, 1750000, 1790000, 1900000], // 2451 - 2650
  ],
  anchoRanges: [0, 1600, 1900, 2250, 2500, 2650], // 5 columnas, 6 rangos
  altoRanges: [0, 1600, 1900, 2200, 2450, 2650],  // 5 filas, 6 rangos
};
export const CLIENTE_FACTORES = {
  "Distribuidor": 1,
  "Cliente Final Contado": 1.15,
  "Cliente Final Crédito": 1.15 * 1.03,
  "Pequeño Distribuidor": 1.15 * 0.92
};

export const EXTRAS_POR_DEFECTO = {
  "Puertas Rápidas": [
    { nombre: "Cortina óptica adicional", precio: 1100000 },
    { nombre: "Radar adicional", precio: 250000 },
    { nombre: "Transformador simple", precio: 480000 },
    { nombre: "Transformador con caja", precio: 580000 },
  { nombre: "UPS 3KVA", precio: 1400000 },
  { nombre: "Loop Magnético", precio: 250000 },
  { nombre: "Sensor No Touch", precio: 250000 },
  { nombre: "Juego de Bolardos 100 cm", precio: 300000 },
  { nombre: "Alarma Sonora", precio: 250000 },
  { nombre: "Biométrico", precio: 450000 }
  ],
  "Abrigo Retráctil Estándar": [
    { nombre: "Juego de almohadillas", precio: 320000 },
    { nombre: "Juego de topes en caucho", precioDistribuidor: 480000, precioCliente: 520000 },
    { nombre: "Instalación en Bogotá", precio: 1130000 }
  ],
  "Abrigo Retráctil Inflable": [
    { nombre: "Juego de almohadillas", precio: 320000 },
    { nombre: "Juego de topes en caucho", precioDistribuidor: 480000, precioCliente: 520000 },
    { nombre: "Instalación en Bogotá", precio: 1130000 }
  ],
  "Sello de Andén": [
    { nombre: "Juego de topes en caucho", precioDistribuidor: 480000, precioCliente: 520000 }
  ],
  "Divisiones Térmicas": [
    { nombre: "PLATINAS PARA RIEL LOGISTICO", precio: 50000 },
    { nombre: "PLATINAS + REATAS", precio: 200000 },
    { nombre: "DIVISION CON 3 PANELES", precio: 80000 },
    { nombre: "PUERTA", precio: 400000 },
    { nombre: "VENTILADOR", precio: 450000 }
  ]
};

// Extras universales disponibles para todos los productos
export const EXTRAS_UNIVERSALES = [
  { nombre: "Instalación", precio: 0 }, // precio por digitar/ajustar en la cotización
  { nombre: "Transporte", precio: 0 }   // precio por digitar/ajustar en la cotización
];


// 👉 Función auxiliar única
function getRangoIndex(ranges, valor) {
  for (let i = 0; i < ranges.length - 1; i++) {
    if (valor > ranges[i] && valor <= ranges[i + 1]) {
      return i;
    }
  }
  // Si es igual o menor al primer rango, usa el primer índice
  if (valor <= ranges[0]) return 0;
  // Si es mayor al último, usa el último índice disponible
  return ranges.length - 2;
}

export function buscarPrecio(matriz, ancho, alto) {
  const fila = getRangoIndex(matriz.altoRanges, alto);
  const col = getRangoIndex(matriz.anchoRanges, ancho);

  const fueraDeRango =
    fila === -1 || col === -1 || !matriz.base[fila] || matriz.base[fila][col] == null;

  if (fueraDeRango) {
    return { precio: null, fueraDeRango: true };
  }

  return { precio: matriz.base[fila][col], fueraDeRango: false };
}

export function buscarRangoSellos(valor) {
  const rangos = priceMatrices["Sello de Andén"].medidaRanges;
  return rangos.findIndex((v, i, arr) => valor <= arr[i + 1]) - 1;
}
export function buscarPrecioAbrigo(matriz, ancho, alto) {
  const fila = getRangoIndex(matriz.altoRanges, alto);
  const col = getRangoIndex(matriz.anchoRanges, ancho);
  const fueraDeRango =
    fila < 0 || col < 0 || !matriz.base[fila] || matriz.base[fila][col] == null;
  return {
    precio: fueraDeRango ? null : matriz.base[fila][col],
    fueraDeRango
  };
}