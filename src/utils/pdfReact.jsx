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
  marginTop: 1,
  marginBottom: 1,
    borderBottomWidth: 1,
    borderBottomColor: T.colors.sectionDivider,
    paddingBottom: 1,
    fontWeight: 'bold'
  },
  htmlContent: {
  marginBottom: T.spacing.xs,
  paddingRight: 8,
  },
  htmlContentCompact: {
  marginBottom: T.spacing.xs,
  paddingRight: 8,
    fontSize: Math.max(9, (T.font?.base || 12) - 1),
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

function SeccionHTML({ titulo, contenido, compact = false, dense = false, readable = false, onlyBoldHeadings = false, compressShortItems = false }) {
  return (
    <View>
      <Text style={{
        ...styles.sectionTitle,
  ...(compact ? { marginTop: 0.5, marginBottom: 0.5, paddingBottom: 0.5 } : null)
      }}>{titulo}</Text>
      <View style={compact ? styles.htmlContentCompact : styles.htmlContent}>
  {parseHtmlToPDFComponents(contenido, { compact, dense, readable, onlyBoldHeadings, compressShortItems })}
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
  const isPuertasRapidas = (producto?.tipo === 'Puertas Rápidas');

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
            {(nombreCliente || cliente) && (
              <Text><Text style={styles.label}>Cliente:</Text> {nombreCliente || cliente}</Text>
            )}
            <Text style={styles.rightAlign}><Text style={styles.label}>Fecha:</Text> {fecha}</Text>
          </View>
          <View style={{ flexDirection:'row', justifyContent:'flex-end' }}>
            <Text style={styles.rightAlign}><Text style={styles.label}>Cotización No:</Text> {numeroCotizacion}</Text>
          </View>
          {(clienteContacto || clienteEmail || clienteTelefono) && (
            <Text><Text style={styles.label}>Contacto:</Text> {clienteContacto || clienteEmail || clienteTelefono}</Text>
          )}
          {clienteNIT && (
            <Text><Text style={styles.label}>NIT:</Text> {clienteNIT}</Text>
          )}
          {clienteCiudad && (
            <Text><Text style={styles.label}>Ciudad:</Text> {clienteCiudad}</Text>
          )}
          {(clienteEmail || clienteTelefono) && (
            <Text><Text style={styles.label}>Datos:</Text> {[clienteEmail, clienteTelefono].filter(Boolean).join(' / ')}</Text>
          )}
        </View>
        <View style={styles.flexGrowContent}>
          <SeccionHTML titulo="Descripción General" contenido={descripcionHTML} compact dense />
          <SeccionHTML titulo="Especificaciones Técnicas" contenido={especificacionesHTML} readable onlyBoldHeadings compressShortItems />
          {(imagenSeleccionada || imagenesMulti.length > 0) && !isPuertasRapidas && (() => {
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
          {isPuertasRapidas && (imagenSeleccionada || imagenesMulti.length > 0) && (() => {
            const extras = imagenesMulti.slice(0,2);
            const total = (imagenSeleccionada ? 1 : 0) + extras.length;
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
          <Text style={styles.sectionTitle}>Detalle de Precios</Text>
          {convertirTablaHTMLaComponentes(tablaHTML, { summaryPanel: true, zebra: true, currencyOptions: { locale: 'es-CO', currency: 'COP', forceTwoDecimals: true } })}
          <SeccionHTML titulo="Condiciones Comerciales" contenido={condicionesHTML} compact dense />
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
          <SeccionHTML titulo="Términos y Condiciones Generales" contenido={terminosHTML} compact dense />
        </View>
        <Text style={styles.footer} fixed>{footerContent}</Text>
      </Page>
    </Document>
  );
}

export async function generarPDFReact(cotizacion, estaEditando) {
  let numeroCotizacion = cotizacion.numero;

  // Guardar solo si es nueva (no edición) y no tiene id existente
  if (!estaEditando || !cotizacion.id) {
    if(!estaEditando){
      numeroCotizacion = await getNextQuoteNumber();
    }
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

  // Formato actualizado: CT#X_Producto_Empresa_dd-mm-aaaa.pdf
  const ahora = new Date();
  const dd = String(ahora.getDate()).padStart(2,'0');
  const mm = String(ahora.getMonth()+1).padStart(2,'0');
  const yyyy = String(ahora.getFullYear());
  const fechaCompacta = `${dd}-${mm}-${yyyy}`; // dd-mm-aaaa
  const primerProducto = cotizacion.productos?.[0]?.tipo || 'Producto';
  const normalizarTitulo = (txt)=>{
    const base = (txt||'').toString().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
    // Dejar solo letras y números, separar por espacios, capitalizar y unir sin espacios
    return base
      .replace(/[^A-Za-z0-9\s]/g,' ') // sustituir símbolos por espacio
      .split(/\s+/).filter(Boolean)
      .map(w=> w.charAt(0).toUpperCase()+w.slice(1).toLowerCase())
      .join('') || 'Valor';
  };
  const prodNorm = normalizarTitulo(primerProducto);
  const empresaBase = cotizacion.nombreCliente || cotizacion.cliente || 'Empresa';
  const empresaNorm = normalizarTitulo(empresaBase);
  const nombreArchivo = `CT#${numeroCotizacion}_${prodNorm}_${empresaNorm}_${fechaCompacta}.pdf`;
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = nombreArchivo;
  link.click();
}
