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
import { pdfTheme } from './pdfTheme';
import toast from "react-hot-toast";
import { parseHtmlToPDFComponents } from "./htmlToReactPDFParser";
import imagenesPorProducto from "../data/imagenesPorProducto";
import TablaPDFManual from "./TablaPDFManual";
Font.register({ family: 'Helvetica' });

const T = pdfTheme; // alias corto

const styles = StyleSheet.create({
  page: {
  paddingHorizontal: T.page.marginHorizontal,
  paddingVertical: T.page.marginVertical,
    fontSize: T.font.base,
    fontFamily: 'Helvetica',
    color: T.colors.text,
    lineHeight: 1.25,
    backgroundColor: T.colors.pageBg,
    flexDirection: 'column'
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: T.colors.sectionDivider,
    paddingBottom: T.spacing.xs,
    marginBottom: T.spacing.sm,
    fontSize: T.font.small,
    color: T.colors.subtleText
  },
  title: {
    fontSize: T.font.h1,
    color: T.colors.headerBg,
    marginTop: T.spacing.xs,
    marginBottom: T.spacing.sm,
    textAlign: 'center',
    fontWeight: 'bold',
    letterSpacing: 0.8,
    borderBottomWidth: 1,
    borderBottomColor: T.colors.headerBg,
    paddingBottom: 3
  },
  datosCliente: {
    marginTop: T.spacing.xs,
    marginBottom: T.spacing.md,
    padding: T.spacing.sm,
    backgroundColor: '#f7f9fa',
    borderRadius: T.radius.md,
    borderWidth: 1,
    borderColor: T.colors.sectionDivider,
  },
  label: {
    fontWeight: 'bold',
    color: T.colors.headerBg,
    marginRight: 3,
  },
  sectionTitle: {
    fontSize: T.font.h2,
    color: T.colors.headerBg,
    marginTop: T.spacing.sm,
    marginBottom: T.spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: T.colors.sectionDivider,
    paddingBottom: 2,
    fontWeight: 'bold'
  },
  htmlContent: {
    marginBottom: T.spacing.xs,
  },
  flexGrowContent: {
    flexGrow: 1,
  },
  footer: {
    fontSize: T.font.small,
    textAlign: 'center',
    color: T.colors.subtleText,
    borderTopWidth: 1,
    borderTopColor: T.colors.sectionDivider,
    paddingTop: T.spacing.xs,
    marginTop: 'auto'
  },
  leftPadded: { paddingLeft: 18 },
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

  const footerContent = (
    <>Cotización generada por COLD CHAIN SERVICES S.A.S. Carrera 4 #1-04, Subachoque, Cundinamarca.{"\n"}
      www.ccservices.com.co – Tel. 3008582709 – santiago.martinez@ccservices.com.co</>
  );

  return (
    <Document>
      <Page size="A4" style={styles.page} wrap>
        <View style={styles.header}>
          <Text>Fecha: {fecha}</Text>
          <Text>Cotización No: {numeroCotizacion}</Text>
        </View>
        <Text style={styles.title}>COTIZACIÓN DE {tipoProducto}</Text>
        <View style={styles.datosCliente}>
          <Text><Text style={styles.label}>Cliente:</Text> {nombreCliente || cliente}</Text>
          <Text><Text style={styles.label}>Contacto:</Text> _________________________</Text>
          <Text><Text style={styles.label}>NIT:</Text> _________________________</Text>
          <Text><Text style={styles.label}>Ciudad:</Text> _________________________</Text>
        </View>
        <View style={styles.flexGrowContent}>
          <SeccionHTML titulo="Descripción General" contenido={descripcionHTML} />
          <SeccionHTML titulo="Especificaciones Técnicas" contenido={especificacionesHTML} />
        </View>
        <Text style={styles.footer} fixed>{footerContent}</Text>
      </Page>

      <Page size="A4" style={styles.page} wrap>
        <View style={styles.flexGrowContent}>
          {imagenSeleccionada && (imagenSeleccionada.startsWith('data:image/jpeg') || imagenSeleccionada.startsWith('data:image/png')) && (
            <>
              <Text style={styles.sectionTitle}>IMAGEN DE REFERENCIA</Text>
              <Image
                src={imagenSeleccionada}
                style={{ width: '100%', maxHeight: 180, objectFit: 'contain', marginBottom: T.spacing.sm, border: '1 solid ' + T.colors.sectionDivider, borderRadius: T.radius.md }}
              />
            </>
          )}
          <Text style={styles.sectionTitle}>Detalle de Precios</Text>
          {convertirTablaHTMLaComponentes(tablaHTML, { summaryPanel: true, zebra: true, currencyOptions: { locale: 'es-CO', currency: 'COP', forceTwoDecimals: true } })}
          <SeccionHTML titulo="Condiciones Comerciales" contenido={condicionesHTML} />
        </View>
        <Text style={styles.footer} fixed>{footerContent}</Text>
      </Page>

      <Page size="A4" style={styles.page} wrap>
        <View style={styles.flexGrowContent}>
          <SeccionHTML titulo="Términos y Condiciones Generales" contenido={terminosHTML} />
        </View>
        <Text style={styles.footer} fixed>{footerContent}</Text>
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
