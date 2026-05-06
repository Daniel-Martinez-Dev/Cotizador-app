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
    summaryPanelBg: pdfTheme.colors.summaryPanelBg,
    summaryRowBg: pdfTheme.colors.summaryRowBg,
    totalBg: pdfTheme.colors.totalBg,
    totalText: pdfTheme.colors.totalText,
    discountRowBg: pdfTheme.colors.discountRowBg,
    discountText: pdfTheme.colors.discountText,
    generalDiscountBg: pdfTheme.colors.generalDiscountBg,
    generalDiscountText: pdfTheme.colors.generalDiscountText,
  },
  font: { base: pdfTheme.font.base, tableHeader: pdfTheme.font.tableHeader, summaryTotal: pdfTheme.font.summaryTotal, small: 9 },
  spacing: pdfTheme.spacing,
  radius: pdfTheme.radius
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
    borderBottomWidth: 2,
    borderBottomColor: pdfTheme.colors.headerRowBottom,
  },
  extraRow: {
    backgroundColor: theme.colors.extraBg,
  },
  productRow: {
    backgroundColor: '#FFFFFF',
  },
  summaryRow: {
    backgroundColor: theme.colors.summaryRowBg,
  },
  totalRow: {
    backgroundColor: theme.colors.totalBg,
  },
  descuentoRow: {
    backgroundColor: theme.colors.discountRowBg,
  },
  generalDescuentoRow: {
    backgroundColor: theme.colors.generalDiscountBg,
  },
  cell: {
    flex: 1,
    paddingVertical: 5,
    paddingHorizontal: 7,
    fontSize: theme.font.base,
    color: theme.colors.text,
  },
  headerCell: {
    fontSize: theme.font.tableHeader,
    fontWeight: 'bold',
    color: theme.colors.headerText,
    paddingVertical: 9,
    paddingHorizontal: 10,
    letterSpacing: 0.5,
  },
  boldCell: {
    fontWeight: 'bold',
  },
  rightAlign: { textAlign: 'right' },
  centerAlign: { textAlign: 'center' },
  descuentoText: { color: theme.colors.discountText },
  generalDescuentoText: { color: theme.colors.generalDiscountText }
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
    const isGeneralDescuentoRow = /descuento general/i.test(labelCell);
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
          !summaryPanel && isDescuentoRow && !isGeneralDescuentoRow && styles.descuentoRow,
          !summaryPanel && isGeneralDescuentoRow && styles.generalDescuentoRow,
          zebra && !isHeader && !isExtraRow && !isGrandTotalRow && !isSubtotalIvaRow && !isDescuentoRow && rowIndexForZebra % 2 === 1 && { backgroundColor: pdfTheme.colors.zebraStripe },
          summaryPanel && (isGrandTotalRow || isSubtotalIvaRow || isDescuentoRow) && { display: 'none' }
        ].filter(Boolean)}
      >
        {celdas.map((cell, j) => {
          let content = cell.textContent.trim();
          const isNumericCandidate = /^[$]?[0-9\-\.\, ]+$/.test(content);

          if (summaryPanel && (isGrandTotalRow || isSubtotalIvaRow || isDescuentoRow)) return null;

          if (!summaryPanel && isDescuentoRow) {
            const dtStyle = isGeneralDescuentoRow ? styles.generalDescuentoText : styles.descuentoText;
            if (j === 0) return <Text key={j} style={[styles.cell, styles.rightAlign, dtStyle, { flex: 3 }]} wrap>{content}</Text>;
            if (j === celdas.length - 1) {
              const val = celdas[j]?.textContent.trim() || '';
              return <Text key={j} style={[styles.cell, styles.rightAlign, dtStyle, { flex: 1 }]} wrap>{val}</Text>;
            }
            return null;
          }

          if (!summaryPanel && (isGrandTotalRow || isSubtotalIvaRow)) {
            if (j === 0) {
              const styleExtras = isGrandTotalRow ? { flex: 3, fontSize: theme.font.summaryTotal, color: theme.colors.totalText } : { flex: 3 };
              return <Text key={j} style={[styles.cell, styles.rightAlign, styles.boldCell, styleExtras]} wrap>{content}</Text>;
            }
            if (j === celdas.length - 1) {
              const val = celdas[j]?.textContent.trim() || '';
              const styleExtras = isGrandTotalRow ? { flex: 1, fontSize: theme.font.summaryTotal, color: theme.colors.totalText } : { flex: 1 };
              return <Text key={j} style={[styles.cell, styles.rightAlign, styles.boldCell, styleExtras]} wrap>{val}</Text>;
            }
            return null;
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
          ].filter(Boolean);

          return <Text key={j} style={cellStyles} wrap>{content}</Text>;
        })}
      </View>
    );

    if (summaryPanel && (isGrandTotalRow || isSubtotalIvaRow || isDescuentoRow)) {
      const label = celdas[0]?.textContent.trim();
      const value = celdas[celdas.length - 1]?.textContent.trim();
      summaryRows.push({
        type: isGeneralDescuentoRow ? 'generalDiscount' : isDescuentoRow ? 'discount' : (isGrandTotalRow ? 'total' : 'summary'),
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
          width: '58%',
          borderLeftWidth: 3,
          borderLeftColor: pdfTheme.colors.accent,
          borderRadius: theme.radius.lg,
          padding: theme.spacing.md,
          backgroundColor: theme.colors.summaryPanelBg
        }}>
          {summaryRows.map((r, idx) => {
            const isGrandTotal = r.type === 'total' && /total/i.test(r.label);
            const isDiscount = r.type === 'discount';
            const isGenDiscount = r.type === 'generalDiscount';
            const textColor = isDiscount
              ? theme.colors.discountText
              : isGenDiscount
                ? theme.colors.generalDiscountText
                : isGrandTotal
                  ? theme.colors.totalText
                  : theme.colors.text;
            return (
              <View key={idx} style={[
                {
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  marginBottom: idx === summaryRows.length - 1 ? 0 : theme.spacing.xxs,
                },
                isGrandTotal && {
                  paddingTop: theme.spacing.xs,
                  borderTopWidth: 1,
                  borderTopColor: theme.colors.border,
                }
              ].filter(Boolean)}>
                <Text style={{
                  fontSize: isGrandTotal ? theme.font.summaryTotal : theme.font.base,
                  fontWeight: isGrandTotal ? 'bold' : 'normal',
                  color: textColor,
                  textAlign: 'right',
                  flex: 2.4,
                  paddingRight: 4
                }}>{r.label}</Text>
                <Text style={{
                  fontSize: isGrandTotal ? theme.font.summaryTotal : theme.font.base,
                  fontWeight: 'bold',
                  color: textColor,
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
