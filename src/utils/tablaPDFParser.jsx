// src/utils/tablaPDFParser.jsx
import React from "react";
import { Text, View, StyleSheet } from "@react-pdf/renderer";

const styles = StyleSheet.create({
  table: {
    display: "table",
    width: "100%",
    marginBottom: 10,
    borderStyle: "solid",
    borderColor: "#ccc",
    borderWidth: 1,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#ccc",
    borderStyle: "solid",
  },
  headerRow: {
    backgroundColor: "#1a3357",
  },
  headerCell: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 10,
    textAlign: "center",
    paddingVertical: 6,
    paddingHorizontal: 4,
    flex: 1,
  },
  cell: {
    fontSize: 10,
    paddingVertical: 6,
    paddingHorizontal: 4,
    flex: 1,
  },
  boldCell: {
    fontWeight: "bold",
  },
  rightAlign: {
    textAlign: "right",
  },
  centerAlign: {
    textAlign: "center",
  },
  extraRow: {
    backgroundColor: "#f4f4f4",
  },
  totalRow: {
    backgroundColor: "#e6f7ff",
  },
  descuentoRow: {
    backgroundColor: "#e8f5e9",
  },
});

const convertirTablaHTMLaComponentes = (html) => {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");
  const filas = [...doc.querySelectorAll("tr")];

  let productoIndex = 0;
  let extraIndex = 0;

  return (
    <View style={styles.table} wrap>
      {filas.map((tr, i) => {
        const celdas = [...tr.querySelectorAll("td"), ...tr.querySelectorAll("th")];

        const isHeader = tr.querySelectorAll("th").length > 0;
        const isTotalRow = celdas[0]?.textContent.toLowerCase().includes("subtotal") ||
                           celdas[0]?.textContent.toLowerCase().includes("iva") ||
                           celdas[0]?.textContent.toLowerCase().includes("total");
        const isDescuentoRow = celdas[0]?.textContent.toLowerCase().includes("descuento");
        const isExtraRow = celdas[0] && /^(↳|³|->|→)/.test(celdas[0].textContent.trim());

        // Numeración
        if (!isHeader && !isTotalRow && !isDescuentoRow) {
          if (!isExtraRow) {
            productoIndex += 1;
            extraIndex = 0;
          } else {
            extraIndex += 1;
          }
        }

        return (
          <View
            key={i}
            style={[
              styles.row,
              isHeader && styles.headerRow,
              isExtraRow && styles.extraRow,
              isTotalRow && styles.totalRow,
              isDescuentoRow && styles.descuentoRow,
            ]}
          >
            {celdas.map((cell, j) => {
              let content = cell.textContent.trim();
              const isNumeric = /^\$?\-?\d+[.,]?\d*/.test(content);

              // Descuento general
              if (isDescuentoRow) {
                if (j === 0) {
                  return (
                    <Text
                      key={j}
                      style={[
                        styles.cell,
                        styles.rightAlign,
                        { color: "#388e3c", flex: 3 }
                      ]}
                      wrap
                    >
                      {content}
                    </Text>
                  );
                }
                if (j === celdas.length - 1) {
                  return (
                    <Text
                      key={j}
                      style={[
                        styles.cell,
                        styles.rightAlign,
                        { color: "#388e3c", flex: 1 }
                      ]}
                      wrap
                    >
                      {celdas[j]?.textContent.trim() || ""}
                    </Text>
                  );
                }
                return null;
              }

              // Subtotal, IVA, Total
              if (isTotalRow) {
                if (j === 0) {
                  return (
                    <Text
                      key={j}
                      style={[styles.cell, styles.rightAlign, { flex: 3 }, styles.boldCell]}
                      wrap
                    >
                      {content}
                    </Text>
                  );
                }
                if (j === celdas.length - 1) {
                  return (
                    <Text
                      key={j}
                      style={[styles.cell, styles.rightAlign, { flex: 1 }, styles.boldCell]}
                      wrap
                    >
                      {celdas[j]?.textContent.trim() || ""}
                    </Text>
                  );
                }
                return null;
              }

              // Numeración
              if (j === 0 && !isHeader) {
                if (isExtraRow) {
                  content = content.replace(/^(↳|³|->|→)\s*/, "");
                  content = `${productoIndex}.${extraIndex} ${content}`;
                } else {
                  content = `${productoIndex}. ${content}`;
                }
              }

              const cellStyles = [
                styles.cell,
                isHeader && styles.headerCell,
                j === 1 && !isHeader && styles.centerAlign, // Cantidad centrada
                (j === 2 || j === 3) && styles.rightAlign, // Precio Unitario y Subtotal siempre a la derecha
                !isHeader && j === 0 && !isExtraRow && styles.boldCell,
              ];

              return (
                <Text key={j} style={cellStyles} wrap>
                  {content}
                </Text>
              );
            })}
          </View>
        );
      })}
    </View>
  );
};

export { convertirTablaHTMLaComponentes };
