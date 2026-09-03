// Tema centralizado para PDF (colores, tipografía, espaciados, maquetación)
//
// `layout` recoge las medidas que antes estaban escritas a mano dentro del JSX
// de pdfReact.jsx (alto de imágenes, anchos de columna, escalas de fuente por
// sección...). Están aquí para que el panel de "Ajustes de maquetación" del
// preview pueda moverlas en vivo: el tema se pasa como parámetro al construir
// el documento, en vez de leerse una sola vez al cargar el módulo.
export const pdfTheme = {
  colors: {
    // Paleta base
    border: '#D1D9E4',
    text: '#1E2D3D',
    headerBg: '#152E4D',
    headerText: '#F8FAFC',
    sectionDivider: '#E2E8F0',
    pageBg: '#FFFFFF',
    subtleText: '#64748B',
    accent: '#2271B3',
    accentLight: '#BFDBFE',
    // Tipografía contextual
    captionText: '#94A3B8',
    metaLabel: '#93C5FD',
    // Bloques estructurales
    clientBlockBg: '#F7FAFD',
    sectionTitleBg: '#F1F5FB',
    summaryPanelBg: '#F8FAFC',
    signatureBoxBg: '#F8FAFD',
    calloutBg: '#EFF6FF',
    calloutText: '#1E3A5F',
    // Tabla de precios
    extraBg: '#F5F7FB',
    zebraStripe: '#F9FAFB',
    summaryRowBg: '#EEF4FB',
    totalBg: '#DBEEFF',
    totalText: '#0F2A4A',
    discountRowBg: '#FEF2F2',
    discountText: '#B91C1C',
    generalDiscountBg: '#F0FDF4',
    generalDiscountText: '#15803D',
    headerRowBottom: '#0D1F35',
  },
  font: {
    family: 'Inter',
    base: 9.5,
    small: 7.5,
    caption: 7,
    h1: 15,
    h2: 10.5,
    h3: 9.5,
    meta: 8,
    companyName: 10,
    companyLine: 8,
    tableHeader: 8.5,
    tableBody: 9,
    summaryLabel: 9,
    summaryTotal: 11,
  },
  spacing: { xxs: 2, xs: 4, sm: 8, md: 12, lg: 20, xl: 28, xxl: 36, sectionGap: 14 },
  page: {
    marginHorizontal: 32,
    marginVertical: 18,
    headerAccentHeight: 5,
    // Aire extra en el borde superior; la barra de acento del encabezado lo usa
    // en negativo para sangrar hasta el filo de la hoja.
    topExtra: 4,
    // Espacio reservado abajo para que el pie fijo no pise el contenido.
    footerSpace: 38,
  },
  radius: { sm: 3, md: 4, lg: 6 },
  layout: {
    // Encabezado
    logoBoxWidth: 130,
    logoWidth: 118,
    logoHeight: 44,
    quoteMetaMinWidth: 170,
    // Imágenes de referencia (rejilla horizontal bajo las especificaciones)
    imagenAltura: 190,
    imagenAlturaPuertaRapida: 120,
    // Porcentajes del ancho útil, como números para poderlos ajustar con un
    // control. pdfReact les añade el '%' al aplicarlos.
    imagenAnchoUna: 60,
    imagenAnchoDos: 48,
    imagenAnchoTres: 32,
    // Imagen lateral (ImageAside)
    asideAltura: 110,
    // Columnas de contenido con imagen al lado
    columnaPrincipal: '66%',
    columnaLateral: '32%',
    // Escalas de fuente por sección (1 = tamaño base del tema)
    escalaDescripcion: 0.9,
    escalaEspecificaciones: 0.9,
    escalaCondiciones: 0.9,
    escalaTerminos: 0.78,
    // Bloque de firmas
    firmaCajaAltura: 44,
  },
};

// Une el tema base con los ajustes guardados/en edición. Fusiona por sección
// para que un override parcial (solo `layout`, o solo un color) no borre el
// resto del tema.
export function crearTema(overrides) {
  if (!overrides) return pdfTheme;
  return {
    ...pdfTheme,
    colors: { ...pdfTheme.colors, ...(overrides.colors || {}) },
    font: { ...pdfTheme.font, ...(overrides.font || {}) },
    spacing: { ...pdfTheme.spacing, ...(overrides.spacing || {}) },
    page: { ...pdfTheme.page, ...(overrides.page || {}) },
    radius: { ...pdfTheme.radius, ...(overrides.radius || {}) },
    layout: { ...pdfTheme.layout, ...(overrides.layout || {}) },
  };
}
