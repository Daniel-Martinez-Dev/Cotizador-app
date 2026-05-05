// src/utils/pdfReact.jsx
import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
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
import { compressImageToDataURL } from './pdfImageCompression';

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
    paddingBottom: T.page.marginVertical + 20,
    fontSize: T.font.base,
    fontFamily: 'Helvetica',
    color: T.colors.text,
    lineHeight: 1.35,
    backgroundColor: T.colors.pageBg,
    flexDirection: 'column'
  },
  header: {
    marginBottom: T.spacing.sm,
    paddingBottom: 0,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: T.spacing.xs,
  },
  headerLeft: {
    flexDirection: 'row',
    flex: 1.7,
    gap: 8,
    alignItems: 'flex-start',
  },
  headerRight: {
    flex: 1,
    alignItems: 'flex-end',
  },
  logoBox: {
    width: 120,
    justifyContent: 'center',
    alignItems: 'flex-start'
  },
  logoImg: {
    width: 114,
    height: 40,
    objectFit: 'contain'
  },
  companyBlock: {
    flex: 1,
    paddingTop: 2,
  },
  companyName: {
    fontWeight: 'bold',
    fontSize: 10.5,
    color: T.colors.headerBg,
    marginBottom: 2,
  },
  companyLine: {
    fontSize: 8.2,
    color: T.colors.subtleText,
    marginBottom: 1.5,
  },
  quoteMeta: {
    backgroundColor: T.colors.headerBg,
    borderRadius: 4,
    paddingHorizontal: 10,
    paddingVertical: 7,
    minWidth: 170,
  },
  quoteMetaLine: {
    fontSize: 8.2,
    color: T.colors.headerText,
    marginBottom: 2.5,
  },
  quoteMetaLabel: {
    fontWeight: 'bold',
    color: '#7EC8F0',
  },
  title: {
    fontSize: T.font.h1,
    color: T.colors.headerBg,
    backgroundColor: 'transparent',
    marginTop: T.spacing.xs,
    marginBottom: 0,
    textAlign: 'center',
    fontWeight: 'bold',
    letterSpacing: 0.8,
    paddingVertical: 2,
  },
  datosCliente: {
    marginTop: T.spacing.xs,
    marginBottom: T.spacing.md,
    padding: T.spacing.md,
    backgroundColor: '#F7FAFD',
    borderRadius: T.radius.md,
    borderWidth: 1,
    borderColor: T.colors.sectionDivider,
    borderTopWidth: 3,
    borderTopColor: T.colors.accent,
  },
  dataGrid: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 3 },
  dataCol: { width: '49%' },
  dataLine: { fontSize: 9, color: T.colors.text, marginBottom: 2.5 },
  label: {
    fontWeight: 'bold',
    color: T.colors.headerBg,
    marginRight: 3,
  },
  rightAlign: { textAlign: 'right' },
  sectionTitle: {
    fontSize: T.font.h2,
    color: T.colors.headerBg,
    marginTop: 10,
    marginBottom: 6,
    fontWeight: 'bold',
    borderLeftWidth: 4,
    borderLeftColor: T.colors.accent,
    paddingLeft: 9,
    paddingRight: 8,
    paddingVertical: 4,
    backgroundColor: 'transparent',
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
    marginTop: 3,
    fontSize: 7.5,
    color: T.colors.subtleText,
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
  flexGrowContent: {},
  footer: {
    fontSize: T.font.small,
    textAlign: 'center',
    color: T.colors.subtleText,
    borderTopWidth: 1,
    borderTopColor: T.colors.sectionDivider,
    paddingTop: T.spacing.xs + 1,
    position: 'absolute',
    left: T.page.marginHorizontal,
    right: T.page.marginHorizontal,
    bottom: T.page.marginVertical - 2,
  },
});

function SeccionHTML({ titulo, contenido, compact = false, dense = false, readable = false, onlyBoldHeadings = false, compressShortItems = false, fontScale = 1 }) {
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
        {parseHtmlToPDFComponents(contenido, { compact, dense, readable, onlyBoldHeadings, compressShortItems, fontScale })}
      </View>
    </View>
  );
}

function PdfHeader({ tipoProducto, numeroCotizacion, fecha }) {
  return (
    <View style={styles.header}>
      {/* Barra de acento de marca */}
      <View style={{
        height: 4,
        backgroundColor: T.colors.accent,
        marginHorizontal: -T.page.marginHorizontal,
        marginTop: -(T.page.marginVertical + PAGE_TOP_EXTRA),
        marginBottom: 10,
      }} />
      <View style={styles.headerTop}>
        <View style={styles.headerLeft}>
          <View style={styles.logoBox}>
            <Image src={logoPng} style={styles.logoImg} />
          </View>
          <View style={styles.companyBlock}>
            <Text style={styles.companyName}>Cold Chain Services S.A.S.</Text>
            <Text style={styles.companyLine}>Cra 4 #1-04, Subachoque, Cundinamarca, Colombia</Text>
            <Text style={styles.companyLine}>NIT 900434149-6 | www.ccservices.com.co</Text>
            <Text style={styles.companyLine}>300 858 2709 | santiago.martinez@ccservices.com.co</Text>
          </View>
        </View>
        <View style={styles.headerRight}>
          <View style={styles.quoteMeta}>
            <Text style={styles.quoteMetaLine}><Text style={styles.quoteMetaLabel}>Cotización:</Text> #{numeroCotizacion}</Text>
            <Text style={styles.quoteMetaLine}><Text style={styles.quoteMetaLabel}>Fecha:</Text> {fecha}</Text>
            <Text style={styles.quoteMetaLine}><Text style={styles.quoteMetaLabel}>Vigencia:</Text> 30 días calendario</Text>
            <Text style={[styles.quoteMetaLine, { marginBottom: 0 }]}><Text style={styles.quoteMetaLabel}>Asesor:</Text> Equipo Comercial CCS</Text>
          </View>
        </View>
      </View>
      <Text style={styles.title}>COTIZACIÓN DE {tipoProducto}</Text>
    </View>
  );
}

function PdfFooter({ numeroCotizacion }) {
  return (
    <Text
      style={styles.footer}
      fixed
      render={({ pageNumber, totalPages }) =>
        `Cold Chain Services S.A.S. | Carrera 4 #1-04, Subachoque | www.ccservices.com.co  ·  CT#${numeroCotizacion}  ·  Página ${pageNumber} de ${totalPages}`
      }
    />
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
    <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 8, marginBottom: 4 }}>
      <View style={{
        backgroundColor: '#EBF4FF',
        borderWidth: 1,
        borderColor: '#BFDBFE',
        borderLeftWidth: 3,
        borderLeftColor: T.colors.accent,
        borderRadius: 3,
        padding: 7,
        width: '54%',
      }}>
        <Text style={{ fontSize: 8, fontWeight: 'bold', color: T.colors.headerBg, marginBottom: 2 }}>
          Oferta válida por 30 días calendario desde la fecha de emisión.
        </Text>
        <Text style={{ fontSize: 7.5, color: '#2C5282' }}>
          Precios sujetos a variación de TRM y disponibilidad de materiales.
        </Text>
      </View>
    </View>
  );
}

function SignatureBlock() {
  return (
    <View wrap={false} minPresenceAhead={28} style={{ marginTop: 12, paddingTop: 8, borderTopWidth: 1, borderTopColor: T.colors.sectionDivider }}>
      <Text style={{ fontSize: 9, fontWeight: 'bold', color: T.colors.headerBg, marginBottom: 20, letterSpacing: 0.5 }}>
        ACEPTACIÓN DE COTIZACIÓN
      </Text>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <View style={{ width: '44%' }}>
          <View style={{
            borderWidth: 1,
            borderColor: T.colors.sectionDivider,
            borderRadius: 3,
            backgroundColor: '#FAFCFE',
            padding: 8,
            marginBottom: 6,
            height: 48,
          }} />
          <Text style={{ fontSize: 8, fontWeight: 'bold', color: T.colors.text, marginBottom: 3 }}>Firma y sello — Cold Chain Services S.A.S.</Text>
          <Text style={{ fontSize: 8, color: T.colors.subtleText, marginBottom: 2 }}>Nombre: _________________________________</Text>
          <Text style={{ fontSize: 8, color: T.colors.subtleText }}>Cargo: ___________________________________</Text>
        </View>
        <View style={{ width: '44%' }}>
          <View style={{
            borderWidth: 1,
            borderColor: T.colors.sectionDivider,
            borderRadius: 3,
            backgroundColor: '#FAFCFE',
            padding: 8,
            marginBottom: 6,
            height: 48,
          }} />
          <Text style={{ fontSize: 8, fontWeight: 'bold', color: T.colors.text, marginBottom: 3 }}>Firma y sello — Cliente</Text>
          <Text style={{ fontSize: 8, color: T.colors.subtleText, marginBottom: 2 }}>Nombre: _________________________________</Text>
          <Text style={{ fontSize: 8, color: T.colors.subtleText, marginBottom: 2 }}>Cargo: ___________________________________</Text>
          <Text style={{ fontSize: 8, color: T.colors.subtleText }}>Fecha de aceptación: _____________________</Text>
        </View>
      </View>
    </View>
  );
}

function PDFCotizacion({ cotizacion, numeroCotizacion, imagenesOptimizadas }) {
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
  const imagenSeleccionadaRaw = imagenesPorProducto[nombreImagen] || null;
  const imagenesMultiRaw = Array.isArray(imagenesSeleccionadas) ? imagenesSeleccionadas.map(k => imagenesPorProducto[k]).filter(Boolean) : [];
  const imagenSeleccionada = imagenesOptimizadas?.principal ?? imagenSeleccionadaRaw;
  const imagenesMulti = imagenesOptimizadas?.extras ?? imagenesMultiRaw;
  const hasAnyImage = Boolean(imagenSeleccionada) || imagenesMulti.length > 0;
  const hasSideImage = Boolean(imagenSeleccionada);
  const imagenSectionTitle = hasAnyImage ? "2. Imágenes de Referencia" : "";
  const detalleIndex = hasAnyImage ? 3 : 2;
  const condicionesIndex = hasAnyImage ? 4 : 3;
  const terminosIndex = hasAnyImage ? 5 : 4;
  const showFullImageSection = !hasSideImage && hasAnyImage;
  const showExtraImagesSection = hasSideImage && imagenesMulti.length > 0;

  return (
    <Document>
      <Page size="A4" style={styles.page} wrap>
        <PdfHeader tipoProducto={tipoProducto} numeroCotizacion={numeroCotizacion} fecha={fecha} />
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
              <Text style={[styles.dataLine, styles.rightAlign]}><Text style={styles.label}>Producto:</Text> {tipoProducto}</Text>
            </View>
          </View>
        </View>
        <View style={styles.flexGrowContent}>
          {hasSideImage ? (
            <>
              {descripcionHTML ? (
                <View style={styles.htmlContentCompact}>
                  {parseHtmlToPDFComponents(descripcionHTML, { compact: true, dense: true })}
                </View>
              ) : null}
              <View style={styles.contentRow}>
                <View style={styles.mainColumn}>
                  <Text minPresenceAhead={24} style={styles.sectionTitle}>1. Especificaciones Técnicas</Text>
                  <View style={styles.htmlContent}>
                    {parseHtmlToPDFComponents(especificacionesHTML, { compact: true, onlyBoldHeadings: true, compressShortItems: true })}
                  </View>
                </View>
                <ImageAside titulo={imagenSectionTitle} imagenSeleccionada={imagenSeleccionada} />
              </View>
            </>
          ) : (
            <>
              {descripcionHTML ? (
                <View style={styles.htmlContentCompact}>
                  {parseHtmlToPDFComponents(descripcionHTML, { compact: true, dense: true })}
                </View>
              ) : null}
              <SeccionHTML titulo="1. Especificaciones Técnicas" contenido={especificacionesHTML} compact onlyBoldHeadings compressShortItems />
            </>
          )}
        </View>
        <PdfFooter numeroCotizacion={numeroCotizacion} />
      </Page>

      <Page size="A4" style={styles.page} wrap>
        <PdfHeader tipoProducto={tipoProducto} numeroCotizacion={numeroCotizacion} fecha={fecha} />
        <View style={styles.flexGrowContent}>
          {showFullImageSection && (
            <ImageSection
              titulo={imagenSectionTitle}
              imagenSeleccionada={imagenSeleccionada}
              imagenesMulti={imagenesMulti}
            />
          )}
          {showExtraImagesSection && (
            <ImageSection
              titulo="Imágenes adicionales"
              imagenSeleccionada={null}
              imagenesMulti={imagenesMulti}
            />
          )}
          <Text minPresenceAhead={28} style={styles.sectionTitle}>{detalleIndex}. Detalle Económico</Text>
          {convertirTablaHTMLaComponentes(tablaHTML, { summaryPanel: true, zebra: true, currencyOptions: { locale: 'es-CO', currency: 'COP', forceTwoDecimals: true } })}
          <ValidityCallout />
          <SeccionHTML
            titulo={`${condicionesIndex}. Condiciones Comerciales`}
            contenido={condicionesHTML}
            compact
            dense
            compressShortItems
          />
        </View>
        <PdfFooter numeroCotizacion={numeroCotizacion} />
      </Page>

      <Page size="A4" style={styles.page} wrap>
        <PdfHeader tipoProducto={tipoProducto} numeroCotizacion={numeroCotizacion} fecha={fecha} />
        <View style={styles.flexGrowContent}>
          <SeccionHTML
            titulo={`${terminosIndex}. Términos y Condiciones Generales`}
            contenido={terminosHTML}
            compact
            dense
            fontScale={0.9}
          />
          <SignatureBlock />
        </View>
        <PdfFooter numeroCotizacion={numeroCotizacion} />
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

  const producto = cotizacion.productos?.[0];
  const nombreImagen = cotizacion.imagenSeleccionada || producto?.imagen || '';
  const imagenSeleccionadaSrc = nombreImagen ? (imagenesPorProducto[nombreImagen] || null) : null;
  const imagenesMultiSrc = Array.isArray(cotizacion.imagenesSeleccionadas)
    ? cotizacion.imagenesSeleccionadas.map(k => imagenesPorProducto[k]).filter(Boolean)
    : [];

  let imagenesOptimizadas = undefined;
  try {
    await yieldToMainThread();
    const opts = { maxWidth: 1000, maxHeight: 760, quality: 0.55, mimeType: 'image/jpeg' };
    const [principal, ...extras] = await Promise.all([
      imagenSeleccionadaSrc ? compressImageToDataURL(imagenSeleccionadaSrc, opts) : Promise.resolve(null),
      ...imagenesMultiSrc.slice(0, 2).map(src => compressImageToDataURL(src, opts)),
    ]);
    if (principal || extras.length) {
      imagenesOptimizadas = { principal, extras };
    }
  } catch (e) {
    console.warn('[PDF] Falló compresión de imágenes, se usarán originales.', e);
  }

  const doc = PDFCotizacion({ cotizacion, numeroCotizacion, imagenesOptimizadas });
  const asPdf = pdf();
  asPdf.updateContainer(doc);
  await yieldToMainThread();
  const blob = await asPdf.toBlob();

  const ahora = new Date();
  const dd = String(ahora.getDate()).padStart(2,'0');
  const mm = String(ahora.getMonth()+1).padStart(2,'0');
  const yyyy = String(ahora.getFullYear());
  const fechaCompacta = `${dd}-${mm}-${yyyy}`;
  const primerProducto = cotizacion.productos?.[0]?.tipo || 'Producto';
  const prodNorm = normalizarTitulo(primerProducto);
  const empresaBase = cotizacion.nombreCliente || cotizacion.cliente || 'Empresa';
  const empresaNorm = normalizarTitulo(empresaBase);
  const nombreArchivo = `CT#${numeroCotizacion}_${prodNorm}_${empresaNorm}_${fechaCompacta}.pdf`;
  const link = document.createElement("a");
  const objectUrl = URL.createObjectURL(blob);
  link.href = objectUrl;
  link.download = nombreArchivo;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(objectUrl), 1500);
}
