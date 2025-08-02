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
  indentText: {
    marginLeft: 12,
    fontWeight: "normal",
  },
  emptyCell: {
    flex: 1,
  }
});

const convertirTablaHTMLaComponentes = (html) => {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");
  const filas = [...doc.querySelectorAll("tr")];

  return (
    <View style={styles.table} wrap>
      {filas.map((tr, i) => {
        const celdas = [...tr.querySelectorAll("td"), ...tr.querySelectorAll("th")];

        const isHeader = tr.querySelectorAll("th").length > 0;
        const isTotalRow = celdas[0]?.textContent.toLowerCase().includes("subtotal") ||
                           celdas[0]?.textContent.toLowerCase().includes("iva") ||
                           celdas[0]?.textContent.toLowerCase().includes("total");

        const isExtraRow = celdas[0] && /^(↳|³|->|→)/.test(celdas[0].textContent.trim());

        return (
          <View
            key={i}
            style={[
              styles.row,
              isHeader && styles.headerRow,
              isExtraRow && styles.extraRow,
              isTotalRow && styles.totalRow
            ]}
          >
            {celdas.map((cell, j) => {
              let content = cell.textContent.trim();
              const isNumeric = /^\$?\d+[.,]?\d*/.test(content);
              const isExtra = isExtraRow && j === 0;

              if (isTotalRow) {
                return (
                  <Text key={j} style={[styles.cell, styles.boldCell, styles.rightAlign]} wrap>
                    {content}
                  </Text>
                );
              }

              if (isExtra) {
                content = content.replace(/^(↳|³|->|→)\s*/, "");
                return (
                  <Text key={j} style={[styles.cell, styles.indentText, isNumeric && styles.rightAlign]} wrap>
                    ↳ {content}
                  </Text>
                );
              }

              const cellStyles = [
                styles.cell,
                isHeader && styles.headerCell,
                j === 1 && !isHeader && styles.centerAlign,
                (j === 2 || j === 3) && isNumeric && styles.rightAlign,
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
