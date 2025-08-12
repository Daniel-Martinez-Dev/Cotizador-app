// src/utils/tablaPDFParser.jsx
import React from 'react';
import { Text, View, StyleSheet } from '@react-pdf/renderer';

// Theme centralizado (exportable si luego se reutiliza en otros módulos)
export const theme = {
  colors: {
    border: '#ccc',
    text: '#222222',
    headerBg: '#1a3357',
    headerText: '#ffffff',
    extraBg: '#f4f4f4',
    totalBg: '#e6f7ff',
    discountBg: '#e8f5e9',
    discountText: '#388e3c'
  },
  font: { base: 10, header: 10, small: 9 },
  spacing: { xxs: 2, xs: 4, sm: 6, md: 8 },
  radius: { sm: 2 }
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
    minHeight: 14,
  },
  headerRow: {
    backgroundColor: theme.colors.headerBg,
  },
  extraRow: {
    backgroundColor: theme.colors.extraBg,
  },
  totalRow: {
    backgroundColor: theme.colors.totalBg,
  },
  descuentoRow: {
    backgroundColor: theme.colors.discountBg,
  },
  cell: {
    flex: 1,
    paddingVertical: 2,
    paddingHorizontal: 4,
    fontSize: theme.font.base,
    color: theme.colors.text,
  },
  headerCell: {
    fontSize: theme.font.header,
    fontWeight: 'bold',
    color: theme.colors.headerText,
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

  let productoIndex = 0;
  let extraIndex = 0;

  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  const filas = [...doc.querySelectorAll('tr')];

  const bodyRows = [];
  const summaryRows = [];

  filas.forEach((tr, i) => {
    const celdas = [...tr.querySelectorAll('td'), ...tr.querySelectorAll('th')];
    const isHeader = tr.querySelectorAll('th').length > 0;
    const labelCell = celdas[0]?.textContent.toLowerCase();
    const isTotalRow = labelCell && (labelCell.includes('subtotal') || labelCell.includes('iva') || labelCell.includes('total'));
    const isDescuentoRow = labelCell && labelCell.includes('descuento');
    const isExtraRow = celdas[0] && /^(↳|³|->|→)/.test(celdas[0].textContent.trim());

    if (!isHeader && !isTotalRow && !isDescuentoRow) {
      if (!isExtraRow) { productoIndex += 1; extraIndex = 0; } else { extraIndex += 1; }
    }

    const renderRow = (rowIndexForZebra) => (
      <View
        key={i}
        style={[
          styles.row,
          isHeader && styles.headerRow,
          isExtraRow && styles.extraRow,
          !summaryPanel && isTotalRow && styles.totalRow,
          !summaryPanel && isDescuentoRow && styles.descuentoRow,
          zebra && !isHeader && !isExtraRow && !isTotalRow && !isDescuentoRow && rowIndexForZebra % 2 === 1 && { backgroundColor: '#fafbfc' },
          summaryPanel && (isTotalRow || isDescuentoRow) && { display: 'none' }
        ]}
      >
        {celdas.map((cell, j) => {
          let content = cell.textContent.trim();
          const isNumericCandidate = /^[$]?[0-9\-\.\, ]+$/.test(content);

          if (summaryPanel && (isTotalRow || isDescuentoRow)) return null;

          if (!summaryPanel && isDescuentoRow) {
            if (j === 0) return <Text key={j} style={[styles.cell, styles.rightAlign, styles.descuentoText, { flex: 3 }]} wrap>{content}</Text>;
            if (j === celdas.length - 1) {
              const val = celdas[j]?.textContent.trim() || '';
              return <Text key={j} style={[styles.cell, styles.rightAlign, styles.descuentoText, { flex: 1 }]} wrap>{val}</Text>;
            }
            return null;
          }

            if (!summaryPanel && isTotalRow) {
            if (j === 0) return <Text key={j} style={[styles.cell, styles.rightAlign, { flex: 3 }, styles.boldCell]} wrap>{content}</Text>;
            if (j === celdas.length - 1) {
              const val = celdas[j]?.textContent.trim() || '';
              return <Text key={j} style={[styles.cell, styles.rightAlign, { flex: 1 }, styles.boldCell]} wrap>{val}</Text>;
            }
            return null;
          }

          if (j === 0 && !isHeader) {
            if (isExtraRow) {
              content = content.replace(/^(↳|³|->|→)\s*/, '');
              content = `${productoIndex}.${extraIndex} ${content}`;
            } else {
              content = `${productoIndex}. ${content}`;
            }
          }

          if (isNumericCandidate && (j === 2 || j === 3 || isTotalRow)) {
            content = formatCurrency(content, currencyOptions.locale, currencyOptions.currency, currencyOptions.forceTwoDecimals);
          }

          const cellStyles = [
            styles.cell,
            isHeader && styles.headerCell,
            j === 1 && !isHeader && styles.centerAlign,
            (j === 2 || j === 3) && styles.rightAlign,
            !isHeader && j === 0 && !isExtraRow && styles.boldCell,
          ];

          return <Text key={j} style={cellStyles} wrap>{content}</Text>;
        })}
      </View>
    );

    if (summaryPanel && (isTotalRow || isDescuentoRow)) {
      const label = celdas[0]?.textContent.trim();
      const value = celdas[celdas.length - 1]?.textContent.trim();
      summaryRows.push({
        type: isDescuentoRow ? 'discount' : 'total',
        label,
        value: formatCurrency(value, currencyOptions.locale, currencyOptions.currency, currencyOptions.forceTwoDecimals)
      });
    }

    bodyRows.push(renderRow(bodyRows.length));
  });

  return (
    <View wrap>
      <View style={styles.table}>{bodyRows}</View>
      {summaryPanel && summaryRows.length > 0 && (
        <View style={{
          marginTop: theme.spacing.sm,
          marginLeft: 'auto',
          width: '60%', // un poco más ancho para valores largos
          borderWidth: 1,
          borderColor: theme.colors.border,
          padding: theme.spacing.sm,
          backgroundColor: '#fff'
        }}>
          {summaryRows.map((r, idx) => {
            const isGrandTotal = r.type === 'total' && /total/i.test(r.label);
            return (
              <View key={idx} style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                marginBottom: idx === summaryRows.length - 1 ? 0 : theme.spacing.xxs
              }}>
                <Text style={{
                  fontSize: isGrandTotal ? theme.font.base + 1 : theme.font.base,
                  fontWeight: isGrandTotal ? 'bold' : (r.type === 'discount' ? 'normal' : 'normal'),
                  color: r.type === 'discount' ? theme.colors.discountText : theme.colors.text,
                  textAlign: 'right',
                  flex: 2.4,
                  paddingRight: 4
                }}>{r.label}</Text>
                <Text style={{
                  fontSize: isGrandTotal ? theme.font.base + 1 : theme.font.base,
                  fontWeight: isGrandTotal ? 'bold' : 'bold',
                  color: r.type === 'discount' ? theme.colors.discountText : theme.colors.text,
                  textAlign: 'right',
                  flex: 1.4,
                  // Evitar que números grandes se corten: permitir wrap suave
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
