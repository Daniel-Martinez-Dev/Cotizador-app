// Tema centralizado para PDF (colores, tipografía, espaciados)
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
  },
  radius: { sm: 3, md: 4, lg: 6 }
};
