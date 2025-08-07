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
        <Text>Cliente: {nombreCliente || cliente}</Text>
        <Text>Contacto: _________________________</Text>
        <Text>NIT: _________________________</Text>
        <Text>Ciudad: _________________________</Text>

        <SeccionHTML titulo="Descripción General" contenido={descripcionHTML} />
        <SeccionHTML titulo="Especificaciones Técnicas" contenido={especificacionesHTML} />

        {imagenSeleccionada &&
          (imagenSeleccionada.startsWith("data:image/jpeg") ||
          imagenSeleccionada.startsWith("data:image/png")) && (
            <Image
              src={imagenSeleccionada}
              style={{
                width: "100%",
                maxHeight: 250,
                objectFit: "contain",
                marginVertical: 12,
                border: "1 solid #ccc"
              }}
            />
        )}


        <Text style={styles.footer} fixed>
          Cotización generada por COLD CHAIN SERVICES S.A.S. Carrera 4 #1-04, Subachoque, Cundinamarca.{"\n"}
          www.ccservices.com.co – Tel. 3008582709 – comercial@ccservices.com.co
        </Text>
      </Page>

      <Page size="A4" style={styles.page} wrap>
        <Text style={styles.sectionTitle}>Detalle de Precios</Text>
        {convertirTablaHTMLaComponentes(tablaHTML)}
        <SeccionHTML titulo="Condiciones Comerciales" contenido={condicionesHTML} />

        <Text style={styles.footer} fixed>
          Cotización generada por COLD CHAIN SERVICES S.A.S. Carrera 4 #1-04, Subachoque, Cundinamarca.{"\n"}
          www.ccservices.com.co – Tel. 3008582709 – comercial@ccservices.com.co
        </Text>
      </Page>

      <Page size="A4" style={styles.page} wrap>
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
