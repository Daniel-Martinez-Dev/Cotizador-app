// src/utils/tablaPDFParser.jsx
import React from 'react';
import { Text, View, StyleSheet } from '@react-pdf/renderer';
import { pdfTheme } from './pdfTheme';
import { numeroALetras } from './numeroALetras';

// Los estilos se construyen a partir del tema recibido, no de una copia fijada
// al cargar el módulo: así los ajustes de maquetación del preview afectan a
// este render igual que al resto del documento. Se cachea por identidad de tema
// para no rehacer el StyleSheet en cada fila.
const _cacheEstilos = new WeakMap();

function crearEstilos(T) {
  const cacheado = _cacheEstilos.get(T);
  if (cacheado) return cacheado;

  const estilos = StyleSheet.create({
    table: {
      width: '100%',
      borderWidth: 1,
      borderColor: T.colors.border,
      borderRadius: T.radius.md,
      overflow: 'hidden',
      marginTop: T.spacing.xs,
      fontSize: T.font.base,
    },
    row: {
      flexDirection: 'row',
      borderBottomWidth: 1,
      borderBottomColor: T.colors.border,
      alignItems: 'stretch',
      minHeight: 16,
    },
    headerRow: {
      backgroundColor: T.colors.headerBg,
      borderBottomWidth: 3,
      borderBottomColor: T.colors.accent,
    },
    extraRow: {
      backgroundColor: T.colors.extraBg,
    },
    productRow: {
      backgroundColor: '#FFFFFF',
    },
    summaryRow: {
      backgroundColor: T.colors.summaryRowBg,
    },
    totalRow: {
      backgroundColor: T.colors.totalBg,
    },
    descuentoRow: {
      backgroundColor: T.colors.discountRowBg,
    },
    generalDescuentoRow: {
      backgroundColor: T.colors.generalDiscountBg,
    },
    cell: {
      flex: 1,
      paddingVertical: 5,
      paddingHorizontal: 7,
      fontSize: T.font.base,
      color: T.colors.text,
    },
    headerCell: {
      fontSize: T.font.tableHeader,
      fontWeight: 'bold',
      color: T.colors.headerText,
      paddingVertical: 7,
      paddingHorizontal: 8,
      letterSpacing: 0.8,
    },
    boldCell: {
      fontWeight: 'bold',
    },
    rightAlign: { textAlign: 'right' },
    centerAlign: { textAlign: 'center' },
    descuentoText: { color: T.colors.discountText },
    generalDescuentoText: { color: T.colors.generalDiscountText }
  });

  _cacheEstilos.set(T, estilos);
  return estilos;
}

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
  const { summaryPanel = false, zebra = false, currencyOptions = { locale: 'es-CO', currency: 'COP', forceTwoDecimals: false }, leftPanel = null, total = null, theme = pdfTheme } = options;

  const T = theme || pdfTheme;
  const styles = crearEstilos(T);

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
        wrap={false}
        style={[
          styles.row,
          isHeader && styles.headerRow,
          isProductRow && styles.productRow,
          isExtraRow && styles.extraRow,
          !summaryPanel && isSubtotalIvaRow && styles.summaryRow,
          !summaryPanel && isGrandTotalRow && styles.totalRow,
          !summaryPanel && isDescuentoRow && !isGeneralDescuentoRow && styles.descuentoRow,
          !summaryPanel && isGeneralDescuentoRow && styles.generalDescuentoRow,
          zebra && !isHeader && !isExtraRow && !isGrandTotalRow && !isSubtotalIvaRow && !isDescuentoRow && rowIndexForZebra % 2 === 1 && { backgroundColor: T.colors.zebraStripe },
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
              const styleExtras = isGrandTotalRow ? { flex: 3, fontSize: T.font.summaryTotal, color: T.colors.totalText } : { flex: 3 };
              return <Text key={j} style={[styles.cell, styles.rightAlign, styles.boldCell, styleExtras]} wrap>{content}</Text>;
            }
            if (j === celdas.length - 1) {
              const val = celdas[j]?.textContent.trim() || '';
              const styleExtras = isGrandTotalRow ? { flex: 1, fontSize: T.font.summaryTotal, color: T.colors.totalText } : { flex: 1 };
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
          const isPriceCol = (j === 2 || j === 3) && !isHeader;
          const cellStyles = [
            styles.cell,
            { flex: baseFlex },
            isHeader && styles.headerCell,
            j === 1 && !isHeader && styles.centerAlign,
            (j === 2 || j === 3) && styles.rightAlign,
            !isHeader && j === 0 && !isExtraRow && !isGrandTotalRow && !isSubtotalIvaRow && styles.boldCell,
            isPriceCol && { fontSize: T.font.base + 1, fontWeight: 'bold' },
            j < celdas.length - 1 && { borderRightWidth: 1, borderRightColor: T.colors.border },
            isExtraRow && !isHeader && { color: T.colors.subtleText, fontSize: T.font.base - 0.5, fontWeight: 'normal' },
            !summaryPanel && isGrandTotalRow && { paddingVertical: 6 },
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
      {(summaryPanel && summaryRows.length > 0) || leftPanel ? (
        <View wrap={false} style={{ flexDirection: 'row', alignItems: 'flex-start', marginTop: T.spacing.md }}>
          {leftPanel && (
            <View style={{ flex: 1, paddingRight: 10 }}>
              {leftPanel}
            </View>
          )}
          {summaryPanel && summaryRows.length > 0 && (
            <View style={{
              width: leftPanel ? '52%' : '58%',
              borderLeftWidth: 3,
              borderLeftColor: T.colors.accent,
              borderTopWidth: 1,
              borderRightWidth: 1,
              borderBottomWidth: 1,
              borderTopColor: T.colors.border,
              borderRightColor: T.colors.border,
              borderBottomColor: T.colors.border,
              borderRadius: T.radius.lg,
              overflow: 'hidden',
              backgroundColor: T.colors.summaryPanelBg,
            }}>
              <View style={{
                paddingHorizontal: 10,
                paddingVertical: 5,
                borderBottomWidth: 1,
                borderBottomColor: T.colors.border,
                backgroundColor: T.colors.sectionTitleBg,
              }}>
                <Text style={{ fontSize: 7, fontWeight: 'bold', color: T.colors.headerBg, letterSpacing: 1.5 }}>
                  RESUMEN DE PRECIOS
                </Text>
              </View>
              {summaryRows.map((r, idx) => {
                const isGrandTotal = r.type === 'total' && /total/i.test(r.label);
                const isDiscount = r.type === 'discount';
                const isGenDiscount = r.type === 'generalDiscount';
                const textColor = isDiscount
                  ? T.colors.discountText
                  : isGenDiscount
                    ? T.colors.generalDiscountText
                    : isGrandTotal
                      ? T.colors.totalText
                      : T.colors.text;
                const rowBg = isGrandTotal
                  ? T.colors.totalBg
                  : isDiscount
                    ? T.colors.discountRowBg
                    : isGenDiscount
                      ? T.colors.generalDiscountBg
                      : 'transparent';
                return (
                  <View key={idx} style={{
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    paddingHorizontal: 10,
                    paddingVertical: isGrandTotal ? 6 : 4,
                    backgroundColor: rowBg,
                    borderTopWidth: 0.5,
                    borderTopColor: isGrandTotal ? T.colors.accent : T.colors.border,
                  }}>
                    <Text style={{
                      fontSize: isGrandTotal ? T.font.summaryTotal : T.font.base,
                      fontWeight: isGrandTotal ? 'bold' : 'normal',
                      color: textColor,
                      flex: 2.4,
                      paddingRight: 4,
                    }}>{r.label}</Text>
                    <Text style={{
                      fontSize: isGrandTotal ? T.font.summaryTotal : T.font.base + 1,
                      fontWeight: 'bold',
                      color: textColor,
                      textAlign: 'right',
                      flex: 1.4,
                    }}>{r.value}</Text>
                  </View>
                );
              })}
            </View>
          )}
        </View>
      ) : null}
      {summaryPanel && total != null && (
        <Text style={{ fontSize: 7.5, color: '#6B7280', marginTop: 3 }}>
          {`Son: ${numeroALetras(total)}`}
        </Text>
      )}
    </View>
  );
}

export { formatCurrency };
