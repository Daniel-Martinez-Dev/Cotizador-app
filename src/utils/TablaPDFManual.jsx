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
  leftAlign: {
    textAlign: "left",
  },
  leftPadded: {
    paddingLeft: 24, // Ajusta este valor según necesites
  },
  greenRow: {
    backgroundColor: "#e8f5e9",
  },
  greenText: {
    color: "#388e3c",
    fontWeight: "bold",
  },
  blueRow: {
    backgroundColor: "#e6f7ff",
  },
});

const TablaPDFManual = ({ datos }) => (
  <View style={styles.table} wrap>
    {/* Header */}
    <View style={[styles.row, styles.headerRow]}>
      <Text style={styles.headerCell}>Producto</Text>
      <Text style={styles.headerCell}>Cantidad</Text>
      <Text style={styles.headerCell}>Precio Unitario</Text>
      <Text style={styles.headerCell}>Subtotal</Text>
    </View>
    {/* Body */}
    {datos.map((fila, i) => {
      if (fila.descuento) {
        return (
          <View key={i} style={[styles.row, styles.greenRow]}>
            <Text style={[styles.cell, styles.greenText, styles.rightAlign, { flex: 2 }]}>
              {fila.label}
            </Text>
            <Text style={[styles.cell, { flex: 1 }]}></Text>
            <Text style={[styles.cell, { flex: 1 }]}></Text>
            <Text style={[styles.cell, styles.greenText, styles.rightAlign, { flex: 1 }]}>
              {fila.valor}
            </Text>
          </View>
        );
      }
      if (fila.total) {
        return (
          <View key={i} style={[styles.row, styles.blueRow]}>
            <Text style={[styles.cell, styles.boldCell, styles.rightAlign, { flex: 3 }]}>
              {fila.label}
            </Text>
            <Text style={[styles.cell, { flex: 1 }]}></Text>
            <Text style={[styles.cell, { flex: 1 }]}></Text>
            <Text style={[styles.cell, styles.boldCell, styles.rightAlign, { flex: 1 }]}>
              {fila.valor}
            </Text>
          </View>
        );
      }
      return (
        <View key={i} style={[styles.row, fila.extra && { backgroundColor: "#f4f4f4" }]}>
          <Text
            style={[
              styles.cell,
              fila.bold && styles.boldCell,
              fila.extra && { marginLeft: 16 }, // O el valor que prefieras
              styles.leftAlign,
            ]}
          >
            {fila.producto}
          </Text>
          <Text style={[styles.cell, styles.rightAlign]}>{fila.cantidad}</Text>
          <Text style={[styles.cell, styles.leftAlign, styles.leftPadded]}>{fila.precio}</Text>
          <Text style={[styles.cell, styles.leftAlign, styles.leftPadded]}>{fila.subtotal}</Text>
        </View>
      );
    })}
  </View>
);

export default TablaPDFManual;
