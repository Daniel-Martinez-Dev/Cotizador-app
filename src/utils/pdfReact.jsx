// src/utils/pdfReact.jsx
import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Font,
  pdf,
  Image
} from "@react-pdf/renderer";
import { getNextQuoteNumber } from "./quoteNumberFirebase";
import { guardarCotizacionEnFirebase } from "./firebaseQuotes";
import { convertirTablaHTMLaComponentes } from "./tablaPDFParser";
import toast from "react-hot-toast";
import { parseHtmlToPDFComponents } from "./htmlToReactPDFParser";
import imagenesPorProducto from "../data/imagenesPorProducto";
import TablaPDFManual from "./TablaPDFManual";
Font.register({ family: 'Helvetica' });

const styles = StyleSheet.create({
  page: {
    padding: 32,
    fontSize: 10,
    fontFamily: 'Helvetica',
    color: '#222',
    lineHeight: 1.25, // Más compacto
    backgroundColor: '#fff',
  },
  header: {
    fontSize: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    paddingBottom: 4,
  },
  title: {
    fontSize: 14,
    color: '#1a3357',
    marginVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#1a3357',
    paddingBottom: 3,
    fontWeight: 'bold',
    letterSpacing: 1,
    textAlign: 'center',
  },
  datosCliente: {
    marginVertical: 6,
    padding: 8,
    backgroundColor: '#f7f9fa',
    borderRadius: 4,
    border: '1 solid #e0e0e0',
  },
  label: {
    fontWeight: 'bold',
    color: '#1a3357',
    marginRight: 4,
  },
  sectionTitle: {
    fontSize: 11,
    color: '#1a3357',
    marginTop: 6,         // Antes: 14
    marginBottom: 2,      // Antes: 4
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    paddingBottom: 1,     // Antes: 2
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  htmlContent: {
    marginBottom: 3,      // Antes: 6
  },
  footer: {
    fontSize: 7.5,
    marginTop: 18,
    textAlign: "center",
    color: "#999",
    borderTopWidth: 1,
    borderTopColor: "#e0e0e0",
    paddingTop: 4,
  },
  leftPadded: {
    paddingLeft: 18, // o el valor que mejor se vea, prueba 18-24
  },
});

function SeccionHTML({ titulo, contenido }) {
  return (
    <View>
      <Text style={styles.sectionTitle}>{titulo}</Text>
      <View style={styles.htmlContent}>
        {parseHtmlToPDFComponents(contenido)}
      </View>
    </View>
  );
}

async function PDFCotizacion({ cotizacion, numeroCotizacion }) {
  const {
    nombreCliente,
    cliente,
    productos,
    secciones = [],
    imagenSeleccionada: imagenSeleccionadaPorUsuario
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

  const nombreImagen = imagenSeleccionadaPorUsuario || producto?.imagen || "";
  const imagenSeleccionada = imagenesPorProducto[nombreImagen] || null;

  return (
    <Document>
      <Page size="A4" style={styles.page} wrap>
        <View style={styles.header}>
          <Text>Fecha: {fecha}</Text>
          <Text>Cotización No.: {numeroCotizacion}</Text>
        </View>

        <Text style={styles.title}>COTIZACIÓN DE {tipoProducto}</Text>

        <View style={styles.datosCliente}>
          <Text>
            <Text style={styles.label}>Cliente:</Text> {nombreCliente || cliente}
          </Text>
          <Text>
            <Text style={styles.label}>Contacto:</Text> _________________________
          </Text>
          <Text>
            <Text style={styles.label}>NIT:</Text> _________________________
          </Text>
          <Text>
            <Text style={styles.label}>Ciudad:</Text> _________________________
          </Text>
        </View>

        <SeccionHTML titulo="Descripción General" contenido={descripcionHTML} />
        <SeccionHTML titulo="Especificaciones Técnicas" contenido={especificacionesHTML} />

        {imagenSeleccionada &&
          (imagenSeleccionada.startsWith("data:image/jpeg") ||
            imagenSeleccionada.startsWith("data:image/png")) && (
            <Image
              src={imagenSeleccionada}
              style={{
                width: "100%",
                maxHeight: 180,
                objectFit: "contain",
                marginVertical: 10,
                border: "1 solid #e0e0e0",
                borderRadius: 4,
              }}
            />
          )}

        <Text style={styles.footer} fixed>
          Cotización generada por COLD CHAIN SERVICES S.A.S. Carrera 4 #1-04, Subachoque, Cundinamarca.{"\n"}
          www.ccservices.com.co – Tel. 3008582709 – santiago.martinez@ccservices.com.co
        </Text>
      </Page>

      <Page size="A4" style={styles.page} wrap>
        <Text style={styles.sectionTitle}>Detalle de Precios</Text>
        {convertirTablaHTMLaComponentes(tablaHTML)}
        <SeccionHTML titulo="Condiciones Comerciales" contenido={condicionesHTML} />

        <Text style={styles.footer} fixed>
          Cotización generada por COLD CHAIN SERVICES S.A.S. Carrera 4 #1-04, Subachoque, Cundinamarca.{"\n"}
          www.ccservices.com.co – Tel. 3008582709 – santiago.martinez@ccservices.com.co
        </Text>
      </Page>

      <Page size="A4" style={styles.page} wrap>
        <SeccionHTML titulo="Términos y Condiciones Generales" contenido={terminosHTML} />
        <Text style={styles.footer} fixed>
          Cotización generada por COLD CHAIN SERVICES S.A.S. Carrera 4 #1-04, Subachoque, Cundinamarca.{"\n"}
          www.ccservices.com.co – Tel. 3008582709 – santiago.martinez@ccservices.com.co
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

  const doc = await PDFCotizacion({ cotizacion, numeroCotizacion });
  const asPdf = pdf();
  asPdf.updateContainer(doc);
  const blob = await asPdf.toBlob();

  const nombreArchivo = `Cotizacion#${numeroCotizacion}_${(cotizacion.nombreCliente || cotizacion.cliente || "Cliente").replace(/\s/g, "_")}_${new Date().toLocaleDateString("es-CO").replace(/\//g, "-")}.pdf`;
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = nombreArchivo;
  link.click();
}
