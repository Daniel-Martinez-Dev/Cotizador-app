// src/utils/pdfReact.jsx
import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Font,
  pdf
} from "@react-pdf/renderer";
import { getNextQuoteNumber } from "./quoteNumberFirebase";
import { guardarCotizacionEnFirebase } from "./firebaseQuotes";
import { convertirTablaHTMLaComponentes } from "./tablaPDFParser";
import toast from "react-hot-toast";

Font.register({ family: 'Helvetica' });

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 10.5,
    fontFamily: 'Helvetica',
    color: '#333',
    lineHeight: 1.6,
  },
  header: {
    fontSize: 11,
    textAlign: 'right',
    marginBottom: 10,
  },
  title: {
    fontSize: 15,
    color: '#1a3357',
    marginBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#1a3357',
    paddingBottom: 4,
    fontWeight: 'bold',
  },
  sectionTitle: {
    fontSize: 12,
    color: '#1a3357',
    marginTop: 18,
    marginBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#ccc',
    paddingBottom: 3,
    fontWeight: 'bold',
  },
  htmlContent: {
    marginBottom: 10,
  },
  footer: {
    fontSize: 8,
    marginTop: 30,
    textAlign: "center",
    color: "#999",
  },
});

function SeccionHTML({ titulo, contenido }) {
  return (
    <View wrap={false}>
      <Text style={styles.sectionTitle}>{titulo}</Text>
      <View style={styles.htmlContent}>
        <Text>{contenido.replace(/<[^>]+>/g, "")}</Text>
      </View>
    </View>
  );
}

function PDFCotizacion({ cotizacion, numeroCotizacion }) {
  const {
    nombreCliente,
    cliente,
    productos,
    secciones = [],
  } = cotizacion;

  const producto = productos?.[0];
  const tipoProducto = producto?.tipo?.toUpperCase?.() || "PRODUCTO";
  const fecha = new Date().toLocaleDateString("es-CO");

  const {
    descripcionHTML = "",
    especificacionesHTML = "",
    tablaHTML = "",
    condicionesHTML = "",
    terminosHTML = ""
  } = secciones[0] || {};

  return (
    <Document>
      <Page size="A4" style={styles.page} wrap>
        <View style={styles.header}>
          <Text>Fecha: {fecha}</Text>
          <Text>Cotización No.: {numeroCotizacion}</Text>
        </View>

        <Text style={styles.title}>COTIZACIÓN DE {tipoProducto}</Text>
        <Text>Cliente: {nombreCliente || cliente}</Text>
        <Text>Contacto: _________________________</Text>
        <Text>NIT: _________________________</Text>
        <Text>Ciudad: _________________________</Text>

        <SeccionHTML titulo="Descripción General" contenido={descripcionHTML} />
        <SeccionHTML titulo="Especificaciones Técnicas" contenido={especificacionesHTML} />
        <Text style={styles.sectionTitle}>Detalle de Precios</Text>
        {convertirTablaHTMLaComponentes(tablaHTML)}
        <SeccionHTML titulo="Condiciones Comerciales" contenido={condicionesHTML} />
        <SeccionHTML titulo="Términos y Condiciones Generales" contenido={terminosHTML} />

        <Text style={styles.footer} fixed>
          Cotización generada por COLD CHAIN SERVICES S.A.S. Carrera 4 #1-04, Subachoque, Cundinamarca.{"\n"}
          www.ccservices.com.co – Tel. 3008582709 – comercial@ccservices.com.co
        </Text>
      </Page>
    </Document>
  );
}

export async function generarPDFReact(cotizacion, estaEditando) {
  let numeroCotizacion = cotizacion.numero;

  if (!estaEditando) {
    numeroCotizacion = await getNextQuoteNumber();

    try {
      await guardarCotizacionEnFirebase(cotizacion, numeroCotizacion);
      toast.success(`Cotización #${numeroCotizacion} guardada`);
    } catch (error) {
      toast.error("Error al guardar la cotización");
    }
  }

  const doc = <PDFCotizacion cotizacion={cotizacion} numeroCotizacion={numeroCotizacion} />;
  const asPdf = pdf();
  asPdf.updateContainer(doc);
  const blob = await asPdf.toBlob();

  const nombreArchivo = `Cotizacion#${numeroCotizacion}_${(cotizacion.nombreCliente || cotizacion.cliente || "Cliente").replace(/\s/g, "_")}_${new Date().toLocaleDateString("es-CO").replace(/\//g, "-")}.pdf`;
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = nombreArchivo;
  link.click();
}
