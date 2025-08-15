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
import logoPng from "../assets/imagenes/logo.png";
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
  headerBar: {
    flexDirection: 'row',
    alignItems: 'stretch',
    marginBottom: T.spacing.sm,
  },
  headerBlock: {
    flex: 1,
    paddingHorizontal: 8,
    justifyContent: 'center'
  },
  headerDivider: {
    width: 1,
    backgroundColor: '#1a3357'
  },
  logoBox: {
    width: 150,
    paddingRight: 30,
    justifyContent: 'center',
    alignItems: 'flex-start'
  },
  logoImg: {
    width: 140,
    height: 54,
    objectFit: 'contain'
  },
  headerTextLine: {
    fontSize: 8,
    color: '#444',
    marginBottom: 1.5,
    fontWeight: 'normal'
  },
  headerTextBold: { fontWeight: 'bold', fontSize: 9, color: '#222', marginBottom: 2 },
  rightAlign: { textAlign: 'right' },
  title: {
    fontSize: T.font.h1,
    color: T.colors.headerBg,
  marginTop: 14,
  marginBottom: T.spacing.xs,
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
  marginTop: T.spacing.xs,
  marginBottom: 3,
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
    clienteContacto,
    clienteNIT,
    clienteCiudad,
    clienteEmail,
    clienteTelefono,
    productos,
    secciones = [],
  imagenSeleccionada: imagenSeleccionadaPorUsuario,
  imagenesSeleccionadas = []
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
  const imagenesMulti = Array.isArray(imagenesSeleccionadas) ? imagenesSeleccionadas.map(k => imagenesPorProducto[k]).filter(Boolean) : [];

  const footerContent = (
    <>Cotización generada por COLD CHAIN SERVICES S.A.S. Carrera 4 #1-04, Subachoque, Cundinamarca.{"\n"}
      www.ccservices.com.co – Tel. 3008582709 – santiago.martinez@ccservices.com.co</>
  );

  return (
    <Document>
      <Page size="A4" style={styles.page} wrap>
  <View style={styles.headerBar} fixed>
          <View style={styles.logoBox}>
            <Image src={logoPng} style={styles.logoImg} />
          </View>
          <View style={styles.headerDivider} />
          <View style={styles.headerBlock}>
            <Text style={styles.headerTextBold}>Cold Chain Services S.A.S.</Text>
            <Text style={styles.headerTextLine}>Cra 4 1#04</Text>
            <Text style={styles.headerTextLine}>250220, Subachoque, Cundinamarca, Colombia</Text>
            <Text style={styles.headerTextLine}>Nit: 900434149-6</Text>
          </View>
          <View style={styles.headerDivider} />
          <View style={styles.headerBlock}>
            <Text style={styles.headerTextLine}>Whatsapp 3008582709</Text>
            <Text style={styles.headerTextLine}>santiago.martinez@ccservices.com.co</Text>
            <Text style={styles.headerTextLine}>www.ccservices.com.co</Text>
            <Text style={styles.headerTextLine}>Cel: 3008582709 - 3112360170</Text>
          </View>
        </View>
        <Text style={styles.title}>COTIZACIÓN DE {tipoProducto}</Text>
        <View style={styles.datosCliente}>
          <View style={{ flexDirection:'row', justifyContent:'space-between' }}>
            <Text><Text style={styles.label}>Cliente:</Text> {nombreCliente || cliente || '—'}</Text>
            <Text style={styles.rightAlign}><Text style={styles.label}>Fecha:</Text> {fecha}</Text>
          </View>
          <View style={{ flexDirection:'row', justifyContent:'flex-end' }}>
            <Text style={styles.rightAlign}><Text style={styles.label}>Cotización No:</Text> {numeroCotizacion}</Text>
          </View>
          {clienteContacto || clienteEmail || clienteTelefono ? (
            <Text><Text style={styles.label}>Contacto:</Text> {clienteContacto || clienteEmail || clienteTelefono}</Text>
          ) : <Text><Text style={styles.label}>Contacto:</Text> —</Text>}
          <Text><Text style={styles.label}>NIT:</Text> {clienteNIT || '—'}</Text>
          <Text><Text style={styles.label}>Ciudad:</Text> {clienteCiudad || '—'}</Text>
          {(clienteEmail || clienteTelefono) && (
            <Text><Text style={styles.label}>Datos:</Text> {[clienteEmail, clienteTelefono].filter(Boolean).join(' / ')}</Text>
          )}
        </View>
        <View style={styles.flexGrowContent}>
          <SeccionHTML titulo="Descripción General" contenido={descripcionHTML} />
          <SeccionHTML titulo="Especificaciones Técnicas" contenido={especificacionesHTML} />
          {(imagenSeleccionada || imagenesMulti.length > 0) && (() => {
            const extras = imagenesMulti.slice(0,2);
            const total = (imagenSeleccionada ? 1 : 0) + extras.length;
            // calcular width por imagen
            let widthPct;
            if (total === 1) widthPct = '100%';
            else if (total === 2) widthPct = '48%';
            else widthPct = '32%';
            return (
              <>
                <Text style={styles.sectionTitle}>Imágenes de Referencia</Text>
                <View style={{ flexDirection:'row', flexWrap:'wrap', justifyContent: total === 2 ? 'center' : 'space-between' }}>
                  {imagenSeleccionada && (
                    <View style={{ width: widthPct, padding:4, border:'1 solid #d0d5db', borderRadius:6, marginBottom:6 }}>
                      <Image src={imagenSeleccionada} style={{ width:'100%', height:165, objectFit:'contain' }} />
                    </View>
                  )}
                  {extras.map((imgSrc, idx) => (
                    <View key={idx} style={{ width: widthPct, padding:4, border:'1 solid #d0d5db', borderRadius:6, marginBottom:6 }}>
                      <Image src={imgSrc} style={{ width:'100%', height:165, objectFit:'contain' }} />
                    </View>
                  ))}
                </View>
              </>
            );
          })()}
        </View>
        <Text style={styles.footer} fixed>{footerContent}</Text>
      </Page>

      <Page size="A4" style={styles.page} wrap>
        <View style={styles.headerBar} fixed>
          <View style={styles.logoBox}>
            <Image src={logoPng} style={styles.logoImg} />
          </View>
          <View style={styles.headerDivider} />
          <View style={styles.headerBlock}>
            <Text style={styles.headerTextBold}>Cold Chain Services S.A.S.</Text>
            <Text style={styles.headerTextLine}>Cra 4 1#04</Text>
            <Text style={styles.headerTextLine}>250220, Subachoque, Cundinamarca, Colombia</Text>
            <Text style={styles.headerTextLine}>Nit: 900434149-6</Text>
          </View>
          <View style={styles.headerDivider} />
          <View style={styles.headerBlock}>
            <Text style={styles.headerTextLine}>Whatsapp 3008582709</Text>
            <Text style={styles.headerTextLine}>santiago.martinez@ccservices.com.co</Text>
            <Text style={styles.headerTextLine}>www.ccservices.com.co</Text>
            <Text style={styles.headerTextLine}>Cel: 3008582709 - 3112360170</Text>
          </View>
        </View>
        <View style={styles.flexGrowContent}>
          <Text style={styles.sectionTitle}>Detalle de Precios</Text>
          {convertirTablaHTMLaComponentes(tablaHTML, { summaryPanel: true, zebra: true, currencyOptions: { locale: 'es-CO', currency: 'COP', forceTwoDecimals: true } })}
          <SeccionHTML titulo="Condiciones Comerciales" contenido={condicionesHTML} />
        </View>
        <Text style={styles.footer} fixed>{footerContent}</Text>
      </Page>

      <Page size="A4" style={styles.page} wrap>
        <View style={styles.headerBar} fixed>
          <View style={styles.logoBox}>
            <Image src={logoPng} style={styles.logoImg} />
          </View>
          <View style={styles.headerDivider} />
          <View style={styles.headerBlock}>
            <Text style={styles.headerTextBold}>Cold Chain Services S.A.S.</Text>
            <Text style={styles.headerTextLine}>Cra 4 1#04</Text>
            <Text style={styles.headerTextLine}>250220, Subachoque, Cundinamarca, Colombia</Text>
            <Text style={styles.headerTextLine}>Nit: 900434149-6</Text>
          </View>
          <View style={styles.headerDivider} />
          <View style={styles.headerBlock}>
            <Text style={styles.headerTextLine}>Whatsapp 3008582709</Text>
            <Text style={styles.headerTextLine}>santiago.martinez@ccservices.com.co</Text>
            <Text style={styles.headerTextLine}>www.ccservices.com.co</Text>
            <Text style={styles.headerTextLine}>Cel: 3008582709 - 3112360170</Text>
          </View>
        </View>
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
