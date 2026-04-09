//C:\Users\danma\Downloads\cotizador-app\src\data\precios.js
export const priceMatrices = {
  "Divisiones Térmicas": {
    base: [
      [1170000, 1210000, 1260000, 1310000, 1350000, 1400000, 1440000, 1490000],
      [1210000, 1260000, 1320000, 1370000, 1420000, 1480000, 1530000, 1570000],
      [1260000, 1320000, 1380000, 1430000, 1490000, 1550000, 1610000, 1670000],
      [1310000, 1370000, 1430000, 1500000, 1560000, 1630000, 1690000, 1750000],
      [1350000, 1420000, 1490000, 1560000, 1630000, 1700000, 1770000, 1840000],
      [1400000, 1480000, 1550000, 1630000, 1700000, 1780000, 1850000, 1930000],
      [1440000, 1530000, 1610000, 1690000, 1770000, 1850000, 1930000, 2010000],
      [1490000, 1570000, 1670000, 1750000, 1840000, 1930000, 2010000, 2100000]
    ],
    anchoRanges: [0, 1600, 1750, 1900, 2050, 2200, 2350, 2500, 2650],
    altoRanges: [0, 1600, 1750, 1900, 2050, 2200, 2350, 2500, 2650]
  },
  
  "Abrigo Retráctil Estándar": {
    base: [
      [4480000, 4640000, 4810000], // 3000-3200 alto
      [4890000, 5030000, 5180000], // 3201-3400 alto
      [5080000, 5180000, 5290000], // 3401-3600 alto
      [5290000, 5400000, 5510000], // 3601-4000 alto
      [5400000, 5460000, 5620000], // 4001-4500 alto
    ],
    anchoRanges: [3000, 3200, 3400, 3600],
    altoRanges:  [3000, 3200, 3400, 3600, 4000, 4500]
  },

  "Abrigo Retráctil Inflable": {
    base: [
      [10880000, 11280000, 11660000], // 3000–3200 alto
      [11870000, 12210000, 12580000], // 3201–3400 alto
      [12320000, 12580000, 12840000], // 3401–3600 alto
      [12840000, 13110000, 13370000], // 3601–4000 alto
      [13110000, 13260000, 13630000], // 4001–4500 alto
    ],
    anchoRanges: [3000, 3200, 3400, 3600],
    altoRanges:  [3000, 3200, 3400, 3600, 4000, 4500]
  },
  "Puertas Rápidas": {
    base: [
      [13410000, 14025000, 14630000, 15665000, 16715000, 17745000, 18795000, 19835000, 20870000, 21910000],
      [13835000, 14435000, 15050000, 16100000, 17140000, 18180000, 19220000, 21485000, 22525000, 23565000],
      [14270000, 14870000, 15485000, 16525000, 17565000, 18605000, 20870000, 21910000, 22960000, 23990000],
      [14870000, 15485000, 16100000, 17140000, 18180000, 20435000, 21485000, 22525000, 23565000, 24605000],
      [15485000, 16100000, 16715000, 17745000, 20015000, 21050000, 22100000, 23130000, 24180000, 25215000],
      [16100000, 16715000, 17320000, 19590000, 20630000, 21665000, 22715000, 23745000, 24795000, 25830000],
      [16715000, 17320000, 17935000, 20195000, 21240000, 22280000, 23320000, 24360000, 25410000, 26435000],
      [17320000, 17935000, 19770000, 20810000, 21855000, 22885000, 23935000, 24975000, 27125000, 28165000],
      [17935000, 18550000, 20385000, 21425000, 22460000, 23500000, 24550000, 25580000, 27740000, 28780000]
    ],
    anchoRanges: [0, 1750, 2250, 2750, 3250, 3750, 4250, 4750, 5250, 5750, 6250],
    altoRanges: [0, 2250, 2750, 3250, 3750, 4250, 4750, 5250, 5750, 6250]
  },
  "Puertas Seccionales": {
    base: [
      [5730000, 6000000, 6260000, 6520000, 6890000, 7260000, 7620000, 8100000, 8570000],
      [6230000, 6490000, 6750000, 7010000, 7380000, 7750000, 8120000, 8590000, 9060000],
      [6720000, 6980000, 7250000, 7510000, 7880000, 8240000, 8610000, 9080000, 9560000],
      [7250000, 7510000, 7770000, 8030000, 8400000, 8770000, 9240000, 9820000, 10400000],
      [7670000, 7930000, 8190000, 8450000, 8820000, 9190000, 9660000, 10240000, 10820000],
      [8190000, 8450000, 8720000, 8980000, 9450000, 9920000, 10500000, 11290000, 12080000],
      [8720000, 8980000, 9240000, 9500000, 9980000, 10450000, 11030000, 11810000, 12600000],
      [9190000, 9450000, 9710000, 9980000, 10450000, 10920000, 11500000, 12290000, 13070000],
      [9680000, 9940000, 10210000, 10470000, 10940000, 11410000, 11990000, 12780000, 13570000]
    ],
    anchoRanges: [0, 1500, 2000, 2500, 3000, 3500, 4000, 4500, 5000, 5500],
    altoRanges: [0, 1500, 2000, 2500, 3000, 3500, 4000, 4500, 5000, 5500]
  },
  "Sello de Andén": {
    base: {
      cortina: [480000, 590000, 650000],
      postes: [1960000, 2270000, 2350000],
      travesano: [980000, 1140000, 1180000],
      completos: [2450000, 2860000, 3000000]
    },
    medidaRanges: [0, 2000, 2900, 3500]
  }
};
// MATRIZ ESPECIAL CARROCERÍAS PANAMERICANA (DIVISIONES TÉRMICAS)
export const matrizPanamericana = {
  base: [
    [1290000, 1400000, 1520000, 1620000, 1730000], // Hasta 1600
    [1360000, 1470000, 1590000, 1690000, 1810000], // 1601 - 1900
    [1420000, 1530000, 1670000, 1770000, 1880000], // 1901 - 2200
    [1490000, 1590000, 1800000, 1840000, 1960000], // 2201 - 2450
    [1550000, 1660000, 1870000, 1920000, 2030000], // 2451 - 2650
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
    { nombre: "Transformador 1KVA simple", precio: 520000 },
    { nombre: "Transformador 1KVA con caja", precio: 620000 },
    { nombre: "Transformador 2KVA simple", precio: 850000 },
    { nombre: "Transformador 2KVA con caja", precio: 950000 },
  { nombre: "UPS 3KVA", precio: 1700000 },
  { nombre: "Loop Magnético", precio: 350000 },
  { nombre: "Sensor No Touch", precio: 100000 },
  { nombre: "Juego de Bolardos 100 cm", precio: 480000 },
  { nombre: "Alarma Sonora", precio: 250000 },
  { nombre: "Biométrico", precio: 380000 }
  ],
  "Abrigo Retráctil Estándar": [
    { nombre: "Juego de almohadillas", precio: 320000 },
    { nombre: "Juego de topes en caucho", precioDistribuidor: 480000, precioCliente: 520000 },
    { nombre: "M2 adicional de banda 3mm", precio: 195000 },
      ],
  "Abrigo Retráctil Inflable": [
    { nombre: "Juego de almohadillas", precio: 320000 },
    { nombre: "Juego de topes en caucho", precioDistribuidor: 480000, precioCliente: 520000 },
    { nombre: "M2 adicional de banda 3mm", precio: 195000 },
  ],
  "Sello de Andén": [
    { nombre: "Juego de topes en caucho", precioDistribuidor: 480000, precioCliente: 520000 }
  ],
  "Divisiones Térmicas": [
    { nombre: "LINEA DE PLATINAS PARA RIEL LOGISTICO", precio: 60000 },
    { nombre: "LINEA DE PLATINAS + REATAS", precio: 110000 },
    { nombre: "DIVISION CON 3 PANELES", precio: 95000 },
    { nombre: "PUERTA", precio: 420000 },
    { nombre: "VENTILADOR", precio: 230000 }
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