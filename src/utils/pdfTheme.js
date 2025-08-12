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
  font: { base: 10, header: 10, small: 8, h1: 14, h2: 11 },
  spacing: { xxs: 2, xs: 4, sm: 6, md: 10, lg: 16, xl: 24 },
  page: {
    // Márgenes seguros para impresión (en puntos: 1pt = 1/72")
    // 36pt ≈ 12.7mm, 40pt ≈ 14mm
    marginHorizontal: 40,
    marginVertical: 42
  },
  radius: { sm: 2, md: 4 }
};
