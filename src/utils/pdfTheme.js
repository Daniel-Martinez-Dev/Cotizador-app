// Tema centralizado para PDF (colores, tipografía, espaciados)
export const pdfTheme = {
  colors: {
    border: '#ccc',
    text: '#222222',
    headerBg: '#1a3357',
    headerText: '#ffffff',
    extraBg: '#f4f4f4',
    totalBg: '#e6f7ff',
    discountBg: '#e8f5e9',
    discountText: '#388e3c',
    sectionDivider: '#e0e0e0',
    pageBg: '#ffffff',
    subtleText: '#666',
  },
  font: { base: 9, header: 9, small: 7, h1: 13, h2: 10 },
  spacing: { xxs: 2, xs: 4, sm: 6, md: 10, lg: 16, xl: 24 },
  page: {
    // Márgenes reducidos para permitir imágenes más grandes
    marginHorizontal: 18,
    marginVertical: 14
  },
  radius: { sm: 2, md: 4 }
};
