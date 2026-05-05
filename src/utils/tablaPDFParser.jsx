// src/utils/tablaPDFParser.jsx
import React from 'react';
import { Text, View, StyleSheet } from '@react-pdf/renderer';
import { pdfTheme } from './pdfTheme';

// Theme centralizado (exportable si luego se reutiliza en otros módulos)
export const theme = {
  colors: {
    border: pdfTheme.colors.border,
    text: pdfTheme.colors.text,
    headerBg: pdfTheme.colors.headerBg,
    headerText: pdfTheme.colors.headerText,
    extraBg: pdfTheme.colors.extraBg,
    summaryBg: '#F0F6FC',
    totalBg: pdfTheme.colors.totalBg,
    discountBg: pdfTheme.colors.discountBg,
    discountText: pdfTheme.colors.discountText
  },
  font: { base: pdfTheme.font.base, header: pdfTheme.font.header, small: 9 },
  spacing: { xxs: 2, xs: 4, sm: 8, md: 10 },
  radius: { sm: 3 }
};

const styles = StyleSheet.create({
  table: {
    width: '100%',
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.sm,
    overflow: 'hidden',
    marginTop: theme.spacing.xs,
    fontSize: theme.font.base,
  },
  row: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    alignItems: 'stretch',
    minHeight: 16,
  },
  headerRow: {
    backgroundColor: theme.colors.headerBg,
    borderBottomWidth: 1.5,
    borderBottomColor: '#0F2238',
  },
  extraRow: {
    backgroundColor: '#F5F7FB',
  },
  productRow: {
    backgroundColor: '#FFFFFF',
  },
  summaryRow: {
    backgroundColor: '#F2F6FB',
  },
  totalRow: {
    backgroundColor: '#E6F2FF',
  },
  descuentoRow: {
    backgroundColor: '#FFF1F1',
  },
  cell: {
    flex: 1,
    paddingVertical: 5,
    paddingHorizontal: 7,
    fontSize: theme.font.base,
    color: theme.colors.text,
  },
  headerCell: {
    fontSize: theme.font.header,
    fontWeight: 'bold',
    color: theme.colors.headerText,
    paddingVertical: 8,
    paddingHorizontal: 8,
    letterSpacing: 0.4,
  },
  boldCell: {
    fontWeight: 'bold',
  },
  rightAlign: { textAlign: 'right' },
  centerAlign: { textAlign: 'center' },
  descuentoText: { color: theme.colors.discountText }
});

function formatCurrency(raw, locale = 'es-CO', currency = 'COP', forceTwoDecimals = false) {
  if (raw == null || raw === '') return '';
  // Extraer números (permitir negativo) y normalizar separadores
  let cleaned = raw.toString().trim();
  // Si ya contiene formato típico con $ y separadores, intentar parseo robusto
  const numericPart = cleaned.replace(/[^0-9,.-]/g, '');
  if (!numericPart) return raw;
  // Eliminar separadores de miles (.) asumiendo formato latino y convertir coma decimal a punto
  let normalized = numericPart;
  // Si hay más de una coma y ningún punto, quedarse con la última como decimal
  // Simplificación: quitar todos los puntos y reemplazar coma por punto
  normalized = normalized.replace(/\./g, '').replace(/,/g, '.');
  const value = parseFloat(normalized);
  if (isNaN(value)) return raw;
  const options = { style: 'currency', currency };
  if (forceTwoDecimals) options.minimumFractionDigits = 2, options.maximumFractionDigits = 2;
  return new Intl.NumberFormat(locale, options).format(value);
}

export function convertirTablaHTMLaComponentes(html, options = {}) {
  if (!html) return null;
  const { summaryPanel = false, zebra = false, currencyOptions = { locale: 'es-CO', currency: 'COP', forceTwoDecimals: false } } = options;

  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  const filas = [...doc.querySelectorAll('tr')];

  const bodyRows = [];
  const summaryRows = [];

  filas.forEach((tr, i) => {
    const celdas = [...tr.querySelectorAll('td'), ...tr.querySelectorAll('th')];
    const isHeader = tr.querySelectorAll('th').length > 0;
    const labelRaw = celdas[0]?.textContent.trim() || '';
    const labelCell = labelRaw.toLowerCase();
    const isGrandTotalRow = /^(total)/i.test(labelRaw);
    const isSubtotalIvaRow = /^(subtotal|iva)/i.test(labelRaw);
    const isDescuentoRow = /descuento/i.test(labelCell);
    const isExtraRow = celdas[0] && /^(↳|³|->|→)/.test(celdas[0].textContent.trim());
    // Ya no numeramos productos ni extras para coincidir con la tabla de preview.

    const isProductRow = !isHeader && !isExtraRow && !isDescuentoRow && !isGrandTotalRow && !isSubtotalIvaRow;

    const renderRow = (rowIndexForZebra) => (
      <View
        key={i}
        style={[
          styles.row,
          isHeader && styles.headerRow,
      isProductRow && styles.productRow,
          isExtraRow && styles.extraRow,
          !summaryPanel && isSubtotalIvaRow && styles.summaryRow,
          !summaryPanel && isGrandTotalRow && styles.totalRow,
          !summaryPanel && isDescuentoRow && styles.descuentoRow,
          zebra && !isHeader && !isExtraRow && !isGrandTotalRow && !isSubtotalIvaRow && !isDescuentoRow && rowIndexForZebra % 2 === 1 && { backgroundColor: '#FBFCFE' },
          summaryPanel && (isGrandTotalRow || isSubtotalIvaRow || isDescuentoRow) && { display: 'none' }
        ]}
      >
        {celdas.map((cell, j) => {
          let content = cell.textContent.trim();
          const isNumericCandidate = /^[$]?[0-9\-\.\, ]+$/.test(content);

          if (summaryPanel && (isGrandTotalRow || isSubtotalIvaRow || isDescuentoRow)) return null;

          if (!summaryPanel && isDescuentoRow) {
            if (j === 0) return <Text key={j} style={[styles.cell, styles.rightAlign, styles.descuentoText, { flex: 3 }]} wrap>{content}</Text>;
            if (j === celdas.length - 1) {
              const val = celdas[j]?.textContent.trim() || '';
              return <Text key={j} style={[styles.cell, styles.rightAlign, styles.descuentoText, { flex: 1 }]} wrap>{val}</Text>;
            }
            return null;
          }

          if (!summaryPanel && (isGrandTotalRow || isSubtotalIvaRow)) {
            if (j === 0) {
              const styleExtras = isGrandTotalRow ? { flex: 3, fontSize: 16 } : { flex: 3 };
              return <Text key={j} style={[styles.cell, styles.rightAlign, styles.boldCell, styleExtras]} wrap>{content}</Text>;
            }
            if (j === celdas.length - 1) {
              const val = celdas[j]?.textContent.trim() || '';
              const styleExtras = isGrandTotalRow ? { flex: 1, fontSize: 16 } : { flex: 1 };
              return <Text key={j} style={[styles.cell, styles.rightAlign, styles.boldCell, styleExtras]} wrap>{val}</Text>;
            }
            return null; // Ocultar celdas intermedias fusionadas en HTML
          }

          if (j === 0) {
            if (isExtraRow && !isHeader) {
              content = content.replace(/^(↳|³|->|→|-)\s*/, '').trim();
              content = `» ${content}`; // símbolo elegido para extras
            }
            // Salto de línea antes de dimensiones si están presentes en la misma frase
            const pattern = /(\d{2,5})\s*mm\s*ancho\s*\*?\s*(\d{2,5})\s*mm\s*alto/i;
            if (pattern.test(content) && !content.includes('\n')) {
              content = content.replace(pattern, '\n$1 mm ancho * $2 mm alto');
            }
          }

          if (isNumericCandidate && (j === 2 || j === 3 || isGrandTotalRow || isSubtotalIvaRow)) {
            content = formatCurrency(content, currencyOptions.locale, currencyOptions.currency, currencyOptions.forceTwoDecimals);
          }

          // Nueva distribución balanceada: Producto 18, Cantidad 4, Precio Unitario 7, Subtotal 7 (total 36)
          const baseFlex = j === 0 ? 18 : (j === 1 ? 4 : 7);
          const cellStyles = [
            styles.cell,
            { flex: baseFlex },
            isHeader && styles.headerCell,
            j === 1 && !isHeader && styles.centerAlign,
            (j === 2 || j === 3) && styles.rightAlign,
            !isHeader && j === 0 && !isExtraRow && !isGrandTotalRow && !isSubtotalIvaRow && styles.boldCell,
            j < celdas.length - 1 && { borderRightWidth: 1, borderRightColor: theme.colors.border },
          ];

          return <Text key={j} style={cellStyles} wrap>{content}</Text>;
        })}
      </View>
    );

    if (summaryPanel && (isGrandTotalRow || isSubtotalIvaRow || isDescuentoRow)) {
      const label = celdas[0]?.textContent.trim();
      const value = celdas[celdas.length - 1]?.textContent.trim();
      summaryRows.push({
        type: isDescuentoRow ? 'discount' : (isGrandTotalRow ? 'total' : 'summary'),
        label,
        value: formatCurrency(value, currencyOptions.locale, currencyOptions.currency, currencyOptions.forceTwoDecimals)
      });
    }

    if (!summaryPanel || !(isGrandTotalRow || isSubtotalIvaRow || isDescuentoRow)) {
      bodyRows.push(renderRow(bodyRows.length));
    }
  });

  return (
    <View wrap>
      <View style={styles.table}>{bodyRows}</View>
      {summaryPanel && summaryRows.length > 0 && (
        <View style={{
          marginTop: theme.spacing.md,
          marginLeft: 'auto',
          width: '60%', // un poco más ancho para valores largos
          borderWidth: 1,
          borderColor: theme.colors.border,
          borderRadius: theme.radius.sm,
          padding: theme.spacing.sm,
          backgroundColor: '#F8FAFC'
        }}>
          {summaryRows.map((r, idx) => {
            const isGrandTotal = r.type === 'total' && /total/i.test(r.label);
            return (
              <View key={idx} style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                marginBottom: idx === summaryRows.length - 1 ? 0 : theme.spacing.xxs,
                paddingTop: isGrandTotal ? theme.spacing.xs : 0,
                borderTopWidth: isGrandTotal ? 1 : 0,
                borderTopColor: isGrandTotal ? '#CBD5E1' : 'transparent'
              }}>
                <Text style={{
                  fontSize: isGrandTotal ? theme.font.base + 2 : theme.font.base,
                  fontWeight: isGrandTotal ? 'bold' : 'normal',
                  color: r.type === 'discount' ? theme.colors.discountText : theme.colors.text,
                  textAlign: 'right',
                  flex: 2.4,
                  paddingRight: 4
                }}>{r.label}</Text>
                <Text style={{
                  fontSize: isGrandTotal ? theme.font.base + 2 : theme.font.base,
                  fontWeight: 'bold',
                  color: r.type === 'discount' ? theme.colors.discountText : theme.colors.text,
                  textAlign: 'right',
                  flex: 1.4,
                  lineHeight: 1.1
                }}>{r.value}</Text>
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
}

export { formatCurrency };
