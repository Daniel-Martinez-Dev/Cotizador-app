// src/utils/pdfReact.jsx
import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  pdf,
  Image,
  Font,
  Link
} from "@react-pdf/renderer";
import InterRegularUrl from '../assets/fonts/Inter-Regular.ttf?url';
import InterBoldUrl from '../assets/fonts/Inter-Bold.ttf?url';
import { getNextQuoteNumber } from "./quoteNumberFirebase";
import { guardarCotizacionEnFirebase } from "./firebaseQuotes";
import { convertirTablaHTMLaComponentes } from "./tablaPDFParser";
import { pdfTheme } from './pdfTheme';
import toast from "react-hot-toast";
import { Capacitor } from "@capacitor/core";
import { Filesystem, Directory } from "@capacitor/filesystem";
import { Share } from "@capacitor/share";
import { parseHtmlToPDFComponents } from "./htmlToReactPDFParser";
import imagenesPorProducto from "../data/imagenesPorProducto";
import logoPng from "../assets/imagenes/logo.png";
import { compressImageToDataURL } from './pdfImageCompression';

// Carga lazy de fuentes como data URIs (evita problemas de URL relativa con base:'./')
let PDF_FONT_FAMILY = 'Helvetica';
let _fontsLoadPromise = null;

async function _toFontDataURI(url) {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  const buf = await r.arrayBuffer();
  const bytes = new Uint8Array(buf);
  let bin = '';
  for (let i = 0; i < bytes.length; i += 32768)
    bin += String.fromCharCode(...bytes.subarray(i, i + 32768));
  return `data:font/truetype;base64,${btoa(bin)}`;
}

async function ensureFontsRegistered() {
  if (_fontsLoadPromise) return _fontsLoadPromise;
  _fontsLoadPromise = (async () => {
    try {
      const [regular, bold] = await Promise.all([
        _toFontDataURI(InterRegularUrl),
        _toFontDataURI(InterBoldUrl),
      ]);
      Font.register({
        family: 'Inter',
        fonts: [
          { src: regular, fontWeight: 'normal' },
          { src: bold, fontWeight: 'bold' },
        ],
      });
      PDF_FONT_FAMILY = 'Inter';
    } catch (e) {
      console.warn('[PDF] Inter no disponible, usando Helvetica.', e.message);
    }
  })();
  return _fontsLoadPromise;
}

// Extra top padding added to page, also needed by the header accent bar to bleed to page edge.
const PAGE_TOP_EXTRA = 4;
const yieldToMainThread = () => new Promise((resolve) => setTimeout(resolve, 0));

function normalizarTitulo(txt) {
  const base = (txt || '').toString().normalize('NFD').replace(/[̀-ͯ]/g, '');
  return base
    .replace(/[^A-Za-z0-9\s]/g, ' ')
    .split(/\s+/).filter(Boolean)
    .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join('') || 'Valor';
}

const T = pdfTheme;

const styles = StyleSheet.create({
  page: {
    paddingHorizontal: T.page.marginHorizontal,
    paddingTop: T.page.marginVertical + PAGE_TOP_EXTRA,
    paddingBottom: 10,
    fontSize: T.font.base,
    fontFamily: 'Helvetica',
    color: T.colors.text,
    lineHeight: 1.35,
    backgroundColor: T.colors.pageBg,
    flexDirection: 'column',
    display: 'flex'
  },
  pageNoHeader: {
    paddingHorizontal: T.page.marginHorizontal,
    paddingTop: T.page.marginVertical,
    paddingBottom: 10,
    fontSize: T.font.base,
    fontFamily: 'Helvetica',
    color: T.colors.text,
    lineHeight: 1.35,
    backgroundColor: T.colors.pageBg,
    flexDirection: 'column',
    display: 'flex'
  },
  header: {
    marginBottom: T.spacing.xs,
    paddingBottom: 0,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 3,
  },
  headerLeft: {
    flexDirection: 'row',
    flex: 1.7,
    gap: 10,
    alignItems: 'flex-start',
  },
  headerRight: {
    flex: 1,
    alignItems: 'flex-end',
  },
  logoBox: {
    width: 130,
    justifyContent: 'center',
    alignItems: 'center'
  },
  logoImg: {
    width: 118,
    height: 44,
    objectFit: 'contain'
  },
  companyBlock: {
    flex: 1,
    paddingTop: 1,
  },
  companyName: {
    fontWeight: 'bold',
    fontSize: 10,
    color: T.colors.headerBg,
    marginBottom: 1,
  },
  companyLine: {
    fontSize: 7.8,
    color: T.colors.subtleText,
    marginBottom: 1,
  },
  quoteMeta: {
    backgroundColor: T.colors.headerBg,
    borderRadius: T.radius.md,
    paddingHorizontal: 10,
    paddingVertical: 5,
    minWidth: 170,
    borderLeftWidth: 3,
    borderLeftColor: T.colors.accent,
  },
  quoteMetaLine: {
    fontSize: T.font.meta,
    color: T.colors.headerText,
    marginBottom: 2,
  },
  quoteMetaLabel: {
    fontWeight: 'bold',
    color: T.colors.metaLabel,
  },
  title: {
    fontSize: T.font.h1,
    color: T.colors.headerText,
    backgroundColor: T.colors.headerBg,
    marginTop: T.spacing.xs,
    marginBottom: 0,
    marginHorizontal: -T.page.marginHorizontal,
    textAlign: 'center',
    fontWeight: 'bold',
    letterSpacing: 1.5,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  datosCliente: {
    marginTop: 10,
    marginBottom: T.spacing.md,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: T.colors.clientBlockBg,
    borderRadius: T.radius.md,
    borderWidth: 1,
    borderColor: T.colors.border,
    borderTopWidth: 3,
    borderTopColor: T.colors.accent,
  },
  dataGrid: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 3 },
  dataCol: { width: '49%' },
  dataLine: { fontSize: 8.5, color: T.colors.text, marginBottom: 3, lineHeight: 1.4 },
  label: {
    fontWeight: 'bold',
    color: T.colors.accent,
    marginRight: 3,
  },
  rightAlign: { textAlign: 'right' },
  sectionTitle: {
    fontSize: T.font.h2,
    color: T.colors.headerBg,
    marginTop: T.spacing.sectionGap,
    marginBottom: 8,
    fontWeight: 'bold',
    borderBottomWidth: 2,
    borderBottomColor: T.colors.accent,
    paddingLeft: 4,
    paddingRight: 4,
    paddingVertical: 5,
    backgroundColor: T.colors.sectionTitleBg,
    borderRadius: T.radius.sm,
    letterSpacing: 0.3,
  },
  htmlContent: {
    marginBottom: T.spacing.sm,
    paddingRight: 4,
  },
  htmlContentCompact: {
    marginBottom: T.spacing.sm,
    paddingRight: 4,
    fontSize: T.font.base,
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  mainColumn: {
    width: '66%',
    flexGrow: 0,
    flexShrink: 0,
  },
  sideColumn: {
    width: '32%',
    flexGrow: 0,
    flexShrink: 0,
  },
  imageGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  imageCard: {
    padding: 4,
    borderWidth: 1,
    borderColor: T.colors.border,
    borderRadius: 4,
    marginBottom: 8,
    backgroundColor: '#FFFFFF',
  },
  imageCaption: {
    marginTop: 4,
    fontSize: T.font.caption,
    color: T.colors.captionText,
    textAlign: 'center',
  },
  sideImageTitle: {
    fontSize: 8.5,
    fontWeight: 'bold',
    color: T.colors.headerBg,
    marginBottom: 4,
  },
  sideImageCard: {
    padding: 4,
    borderWidth: 1,
    borderColor: T.colors.border,
    borderRadius: 4,
    backgroundColor: '#FFFFFF',
    marginBottom: 4,
  },
  sideImage: {
    width: '100%',
    height: 150,
    objectFit: 'contain',
  },
  sideImageCaption: {
    fontSize: 7.2,
    color: T.colors.subtleText,
    textAlign: 'center',
  },
  flexGrowContent: {
    flex: 1,
  },
  footerContainer: {
    marginHorizontal: -T.page.marginHorizontal,
    paddingHorizontal: T.page.marginHorizontal,
    paddingTop: T.spacing.xxs,
    paddingBottom: T.spacing.xxs,
    borderTopWidth: 1,
    borderTopColor: T.colors.sectionDivider,
  },
  footerAccent: {
    height: 1.5,
    backgroundColor: T.colors.accent,
    marginHorizontal: -T.page.marginHorizontal,
    marginBottom: T.spacing.xxs,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  footerText: {
    fontSize: 7,
    color: T.colors.subtleText,
    letterSpacing: 0.1,
  },
  footerQuoteInfo: {
    fontSize: 7,
    fontWeight: 'bold',
    color: T.colors.text,
    letterSpacing: 0.1,
  },
});

function SeccionHTML({ titulo, contenido, compact = false, dense = false, readable = false, onlyBoldHeadings = false, compressShortItems = false, fontScale = 1, paragraphSpacing = null }) {
  return (
    <View>
      <Text
        minPresenceAhead={24}
        style={{
          ...styles.sectionTitle,
          ...(compact ? { marginTop: 2, marginBottom: 2, paddingVertical: 1 } : null)
        }}
      >
        {titulo}
      </Text>
      <View style={compact ? styles.htmlContentCompact : styles.htmlContent}>
        {parseHtmlToPDFComponents(contenido, { compact, dense, readable, onlyBoldHeadings, compressShortItems, fontScale, paragraphSpacing })}
      </View>
    </View>
  );
}

function PdfHeader({ tipoProducto, numeroCotizacion, fecha }) {
  return (
    <View style={styles.header}>
      {/* Barra de acento de marca */}
      <View style={{
        height: T.page.headerAccentHeight,
        backgroundColor: T.colors.accent,
        marginHorizontal: -T.page.marginHorizontal,
        marginTop: -(T.page.marginVertical + PAGE_TOP_EXTRA),
        marginBottom: 12,
      }} />
      <View style={styles.headerTop}>
        <View style={styles.headerLeft}>
          <View style={styles.logoBox}>
            <Image src={logoPng} style={styles.logoImg} />
          </View>
          <View style={styles.companyBlock}>
            <Text style={styles.companyName}>Cold Chain Services S.A.S.</Text>
            <Link src="https://www.google.com/maps/place/Cold+Chain+Services+SAS/@4.8553394,-74.1948824,1097m/data=!3m1!1e3!4m6!3m5!1s0x8e407f8546bba43d:0xb6eddda2b352370b!8m2!3d4.8549508!4d-74.1950576!16s%2Fg%2F11j0tx4nqn?entry=ttu&g_ep=EgoyMDI2MDUwMi4wIKXMDSoASAFQAw%3D%3D" style={styles.companyLine}>Km 6.5, vía Puente Piedra, Subachoque</Link>
            <Text style={styles.companyLine}>NIT 900434149-6 | www.ccservices.com.co</Text>
            <Text style={styles.companyLine}>santiago.martinez@ccservices.com.co</Text>
          </View>
        </View>
        <View style={styles.headerRight}>
          <View style={styles.quoteMeta}>
            <Text style={styles.quoteMetaLine}><Text style={styles.quoteMetaLabel}>Cotización:</Text> #{numeroCotizacion}</Text>
            <Text style={styles.quoteMetaLine}><Text style={styles.quoteMetaLabel}>Fecha:</Text> {fecha}</Text>
            <Text style={styles.quoteMetaLine}><Text style={styles.quoteMetaLabel}>Vigencia:</Text> 30 días calendario</Text>
            <Text style={[styles.quoteMetaLine, { marginBottom: 0 }]}><Text style={styles.quoteMetaLabel}>Asesor:</Text> Santiago Martinez</Text>
          </View>
        </View>
      </View>
      <Text style={styles.title}>{tipoProducto.startsWith("COTIZACIÓN") ? tipoProducto : `COTIZACIÓN DE ${tipoProducto}`}</Text>
    </View>
  );
}

function PdfFooter({ numeroCotizacion, pageNumber, totalPages }) {
  return (
    <View style={styles.footerContainer} wrap={false}>
      <View style={styles.footerAccent} />
      <Text style={[styles.footerText, { textAlign: 'center' }]}>
        {`Cotización #${numeroCotizacion} generada por Cold Chain Services S.A.S. | www.ccservices.com.co | Tel. 300 858 2709 | santiago.martinez@ccservices.com.co | Pág. ${pageNumber} / ${totalPages}`}
      </Text>
    </View>
  );
}

function ImageSection({ imagenSeleccionada, imagenesMulti, titulo }) {
  if (!imagenSeleccionada && imagenesMulti.length === 0) return null;
  const extras = imagenesMulti.slice(0, 2);
  const total = (imagenSeleccionada ? 1 : 0) + extras.length;
  let widthPct;
  if (total === 1) widthPct = '60%';
  else if (total === 2) widthPct = '48%';
  else widthPct = '32%';

  return (
    <View>
      <Text minPresenceAhead={24} style={styles.sectionTitle}>{titulo}</Text>
      <View style={styles.imageGrid}>
        {imagenSeleccionada && (
          <View style={[styles.imageCard, { width: widthPct, marginHorizontal: total === 1 ? 'auto' : 0 }]}>
            <Image src={imagenSeleccionada} style={{ width: '100%', height: 165, objectFit: 'contain' }} />
            <Text style={styles.imageCaption}>Referencia visual principal (no contractual)</Text>
          </View>
        )}
        {extras.map((imgSrc, idx) => (
          <View key={idx} style={[styles.imageCard, { width: widthPct }]}>
            <Image src={imgSrc} style={{ width: '100%', height: 165, objectFit: 'contain' }} />
            <Text style={styles.imageCaption}>Imagen adicional {idx + 1} (referencial)</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function ImageAside({ imagenSeleccionada, titulo }) {
  if (!imagenSeleccionada) return null;
  return (
    <View style={styles.sideColumn}>
      <Text style={styles.sideImageTitle}>{titulo}</Text>
      <View style={styles.sideImageCard}>
        <Image src={imagenSeleccionada} style={styles.sideImage} />
      </View>
      <Text style={styles.sideImageCaption}>Referencia visual (no contractual)</Text>
    </View>
  );
}

function ValidityCallout() {
  return (
    <>
      <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 8, marginBottom: 4 }}>
        <View style={{
          backgroundColor: T.colors.calloutBg,
          borderLeftWidth: 3,
          borderLeftColor: T.colors.accent,
          borderRadius: T.radius.sm,
          padding: 9,
          width: '56%',
        }}>
          <Text style={{ fontSize: 8.5, fontWeight: 'bold', color: T.colors.headerBg, marginBottom: 2 }}>
            Oferta válida por 30 días calendario desde la fecha de emisión.
          </Text>
          <Text style={{ fontSize: 8, color: T.colors.calloutText }}>
            Precios sujetos a variación de TRM y disponibilidad de materiales.
          </Text>
        </View>
      </View>
      <View style={{ height: 1, backgroundColor: T.colors.sectionDivider, marginVertical: T.spacing.sm }} />
    </>
  );
}

function SignatureBlock() {
  return (
    <View wrap={false} minPresenceAhead={8} style={{ marginTop: T.spacing.sm, paddingTop: 4, borderTopWidth: 2, borderTopColor: T.colors.accent }}>
      <View style={{
        backgroundColor: T.colors.headerBg,
        borderRadius: T.radius.sm,
        padding: 5,
        marginBottom: 8,
      }}>
        <Text style={{ fontSize: 9, fontWeight: 'bold', color: T.colors.headerText, letterSpacing: 0.8, textAlign: 'center' }}>
          ACEPTACIÓN DE COTIZACIÓN
        </Text>
      </View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <View style={{ width: '46%' }}>
          <View style={{
            borderWidth: 1,
            borderColor: T.colors.border,
            borderRadius: T.radius.sm,
            backgroundColor: T.colors.signatureBoxBg,
            padding: 6,
            marginBottom: 6,
            height: 44,
          }} />
          <Text style={{ fontSize: 8, fontWeight: 'bold', color: T.colors.headerBg, marginBottom: 3 }}>Firma y sello — Cold Chain Services S.A.S.</Text>
          <Text style={{ fontSize: 7.5, color: T.colors.subtleText, marginBottom: 2 }}>Nombre: _________________________________</Text>
          <Text style={{ fontSize: 7.5, color: T.colors.subtleText }}>Cargo: ___________________________________</Text>
        </View>
        <View style={{ width: '46%' }}>
          <View style={{
            borderWidth: 1,
            borderColor: T.colors.border,
            borderRadius: T.radius.sm,
            backgroundColor: T.colors.signatureBoxBg,
            padding: 6,
            marginBottom: 6,
            height: 44,
          }} />
          <Text style={{ fontSize: 8, fontWeight: 'bold', color: T.colors.headerBg, marginBottom: 3 }}>Firma y sello — Cliente</Text>
          <Text style={{ fontSize: 7.5, color: T.colors.subtleText, marginBottom: 2 }}>Nombre: _________________________________</Text>
          <Text style={{ fontSize: 7.5, color: T.colors.subtleText, marginBottom: 2 }}>Cargo: ___________________________________</Text>
          <Text style={{ fontSize: 7.5, color: T.colors.subtleText }}>Fecha de aceptación: _____________________</Text>
        </View>
      </View>
    </View>
  );
}

function PDFCotizacion({ cotizacion, numeroCotizacion, imagenesOptimizadasPorProducto }) {
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
    seccionesPorProducto = [],
    tituloCotizacion,
  } = cotizacion;

  const fecha = new Date().toLocaleDateString("es-CO");

  const tiposProducto = tituloCotizacion || ((productos || [])
    .map(p => p.tipo?.toUpperCase?.() || "PRODUCTO")
    .join(", "));

  // Secciones compartidas (tabla, condiciones, términos)
  const { tablaHTML = "", condicionesHTML = "", terminosHTML = "" } = secciones[0] || {};

  // Si no hay seccionesPorProducto (backward compat), construir desde secciones[0]
  const secsPorProd = seccionesPorProducto.length > 0
    ? seccionesPorProducto
    : [{ tipo: productos?.[0]?.tipo, descripcionHTML: secciones[0]?.descripcionHTML || "", especificacionesHTML: secciones[0]?.especificacionesHTML || "" }];

  // Paginación estimada: N páginas de producto + tabla + términos
  const totalPagesEst = secsPorProd.length + 2;

  const ClienteBlock = () => (
    <View style={styles.datosCliente}>
      <View style={styles.dataGrid}>
        <View style={styles.dataCol}>
          {(nombreCliente || cliente) && (
            <Text style={styles.dataLine}><Text style={styles.label}>Cliente:</Text> {nombreCliente || cliente}</Text>
          )}
          {(clienteContacto || clienteEmail || clienteTelefono) && (
            <Text style={styles.dataLine}><Text style={styles.label}>Contacto:</Text> {clienteContacto || clienteEmail || clienteTelefono}</Text>
          )}
          {clienteNIT && (
            <Text style={styles.dataLine}><Text style={styles.label}>NIT:</Text> {clienteNIT}</Text>
          )}
        </View>
        <View style={styles.dataCol}>
          {clienteCiudad && (
            <Text style={[styles.dataLine, styles.rightAlign]}><Text style={styles.label}>Ciudad:</Text> {clienteCiudad}</Text>
          )}
          {(clienteEmail || clienteTelefono) && (
            <Text style={[styles.dataLine, styles.rightAlign]}>
              <Text style={styles.label}>Datos:</Text> {[clienteEmail, clienteTelefono].filter(Boolean).join(' / ')}
            </Text>
          )}
          <Text style={[styles.dataLine, styles.rightAlign]}>
            <Text style={styles.label}>Productos:</Text> {(productos || []).length}
          </Text>
        </View>
      </View>
    </View>
  );

  return (
    <Document>
      {/* Una página por producto */}
      {secsPorProd.map((seccion, idx) => {
        const imgOpt = imagenesOptimizadasPorProducto?.[idx] || {};
        const imagenPrincipal = imgOpt.principal || null;
        const imagenesExtras = imgOpt.extras || [];
        const hasAnyImage = Boolean(imagenPrincipal) || imagenesExtras.length > 0;

        return (
          <Page key={idx} size="A4" style={[idx === 0 ? styles.page : styles.pageNoHeader, { fontFamily: PDF_FONT_FAMILY }]} wrap>
            {idx === 0 ? (
              <>
                <PdfHeader tipoProducto={tiposProducto} numeroCotizacion={numeroCotizacion} fecha={fecha} />
                <ClienteBlock />
              </>
            ) : (
              <View style={{ marginBottom: T.spacing.sm }}>
                <Text style={[styles.sectionTitle, { marginTop: 0 }]}>
                  Producto {idx + 1}: {(seccion.tipo || 'PRODUCTO').toUpperCase()}
                </Text>
              </View>
            )}
            <View style={styles.flexGrowContent}>
              {seccion.descripcionHTML ? (
                <View style={styles.htmlContentCompact}>
                  {parseHtmlToPDFComponents(seccion.descripcionHTML, { compact: true, dense: true, fontScale: 0.9 })}
                </View>
              ) : null}
              {seccion.especificacionesHTML ? (
                <SeccionHTML titulo="Especificaciones Técnicas" contenido={seccion.especificacionesHTML} compact dense fontScale={0.9} />
              ) : null}
              {hasAnyImage && (
                <ImageSection
                  titulo="Imágenes de Referencia"
                  imagenSeleccionada={imagenPrincipal}
                  imagenesMulti={imagenesExtras}
                />
              )}
            </View>
            <PdfFooter numeroCotizacion={numeroCotizacion} pageNumber={idx + 1} totalPages={totalPagesEst} />
          </Page>
        );
      })}

      {/* Página tabla + condiciones comerciales */}
      <Page size="A4" style={[styles.pageNoHeader, { fontFamily: PDF_FONT_FAMILY }]} wrap>
        <View style={styles.flexGrowContent}>
          <Text minPresenceAhead={28} style={styles.sectionTitle}>Detalle Económico</Text>
          {convertirTablaHTMLaComponentes(tablaHTML, {
            summaryPanel: true,
            zebra: true,
            currencyOptions: { locale: 'es-CO', currency: 'COP', forceTwoDecimals: true },
            leftPanel: (
              <View style={{
                backgroundColor: T.colors.calloutBg,
                borderLeftWidth: 3,
                borderLeftColor: T.colors.accent,
                borderRadius: T.radius.sm,
                padding: 9,
              }}>
                <Text style={{ fontSize: 8.5, fontWeight: 'bold', color: T.colors.headerBg, marginBottom: 2 }}>
                  Oferta válida por 30 días calendario desde la fecha de emisión.
                </Text>
                <Text style={{ fontSize: 8, color: T.colors.calloutText }}>
                  Precios sujetos a variación de TRM y disponibilidad de materiales.
                </Text>
              </View>
            ),
          })}
          <View style={{ height: 1, backgroundColor: T.colors.sectionDivider, marginVertical: T.spacing.sm }} />
          <SeccionHTML
            titulo="Condiciones Comerciales"
            contenido={condicionesHTML}
            compact
            dense
            fontScale={0.9}
          />
        </View>
        <PdfFooter numeroCotizacion={numeroCotizacion} pageNumber={secsPorProd.length + 1} totalPages={totalPagesEst} />
      </Page>

      {/* Página términos y condiciones */}
      <Page size="A4" style={[styles.pageNoHeader, { fontFamily: PDF_FONT_FAMILY }]} wrap>
        <View style={styles.flexGrowContent}>
          <View style={{ flexDirection: 'row', marginBottom: 4 }}>
            <View style={{ backgroundColor: T.colors.accent, borderRadius: T.radius.sm, paddingHorizontal: 8, paddingVertical: 3 }}>
              <Text style={{ fontSize: 7, color: '#FFFFFF', fontWeight: 'bold', letterSpacing: 0.8 }}>
                DOCUMENTO LEGAL — LEER ANTES DE FIRMAR
              </Text>
            </View>
          </View>
          <SeccionHTML
            titulo="Términos y Condiciones Generales"
            contenido={terminosHTML}
            compact
            dense
            fontScale={0.78}
          />
          <SignatureBlock />
        </View>
        <PdfFooter numeroCotizacion={numeroCotizacion} pageNumber={secsPorProd.length + 2} totalPages={totalPagesEst} />
      </Page>
    </Document>
  );
}

export async function generarPDFReact(cotizacion, estaEditando) {
  let numeroCotizacion = cotizacion.numero;

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

  // Construir lista de imágenes por producto
  // Nuevo formato: cotizacion.imagenesSeleccionadasPorProducto = [{principal, adicionales}]
  // Backward compat: si no existe, usar imagenSeleccionada + imagenesSeleccionadas del primer producto
  let seleccionesPorProd = cotizacion.imagenesSeleccionadasPorProducto;
  if (!Array.isArray(seleccionesPorProd) || seleccionesPorProd.length === 0) {
    const nombreImagen = cotizacion.imagenSeleccionada || cotizacion.productos?.[0]?.imagen || '';
    const adicionales = Array.isArray(cotizacion.imagenesSeleccionadas) ? cotizacion.imagenesSeleccionadas : [];
    seleccionesPorProd = [{ principal: nombreImagen || null, adicionales }];
  }

  const opts = { maxWidth: 1000, maxHeight: 760, quality: 0.55, mimeType: 'image/jpeg' };
  let imagenesOptimizadasPorProducto = [];
  try {
    await yieldToMainThread();
    imagenesOptimizadasPorProducto = await Promise.all(
      seleccionesPorProd.map(async ({ principal, adicionales = [] }) => {
        const principalSrc = principal ? (imagenesPorProducto[principal] || null) : null;
        const adicionalesSrc = adicionales.slice(0, 2).map(k => imagenesPorProducto[k]).filter(Boolean);
        const [principalComp, ...extrasComp] = await Promise.all([
          principalSrc ? compressImageToDataURL(principalSrc, opts) : Promise.resolve(null),
          ...adicionalesSrc.map(src => compressImageToDataURL(src, opts)),
        ]);
        return { principal: principalComp, extras: extrasComp };
      })
    );
  } catch (e) {
    console.warn('[PDF] Falló compresión de imágenes, se usarán originales.', e);
  }

  await ensureFontsRegistered();
  const doc = PDFCotizacion({ cotizacion, numeroCotizacion, imagenesOptimizadasPorProducto });
  const asPdf = pdf();
  asPdf.updateContainer(doc);
  await yieldToMainThread();
  const blob = await asPdf.toBlob();

  const ahora = new Date();
  const dd = String(ahora.getDate()).padStart(2,'0');
  const mm = String(ahora.getMonth()+1).padStart(2,'0');
  const yyyy = String(ahora.getFullYear());
  const fechaCompacta = `${dd}-${mm}-${yyyy}`;
  const productos = cotizacion.productos || [];
  const prodNorm = productos.length > 1
    ? productos.slice(0, 3).map(p => normalizarTitulo(p.tipo || 'Producto')).join('_')
    : normalizarTitulo(productos[0]?.tipo || 'Producto');
  const empresaBase = cotizacion.nombreCliente || cotizacion.cliente || 'Empresa';
  const empresaNorm = normalizarTitulo(empresaBase);
  const nombreArchivo = `CT#${numeroCotizacion}_${prodNorm}_${empresaNorm}_${fechaCompacta}.pdf`;
  if (Capacitor.isNativePlatform()) {
    // Android: guardar en almacenamiento del dispositivo y compartir
    const base64 = await blobToBase64(blob);
    await Filesystem.writeFile({
      path: nombreArchivo,
      data: base64,
      directory: Directory.Cache,
    });
    const { uri } = await Filesystem.getUri({
      path: nombreArchivo,
      directory: Directory.Cache,
    });
    await Share.share({
      title: nombreArchivo,
      url: uri,
      dialogTitle: "Guardar o compartir cotización",
    });
  } else {
    // Web / Electron: descarga estándar del navegador
    const link = document.createElement("a");
    const objectUrl = URL.createObjectURL(blob);
    link.href = objectUrl;
    link.download = nombreArchivo;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(objectUrl), 1500);
  }
}

function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      // El resultado viene como "data:application/pdf;base64,XXXX"
      // Capacitor Filesystem necesita solo la parte base64
      const base64 = reader.result.split(",")[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}
