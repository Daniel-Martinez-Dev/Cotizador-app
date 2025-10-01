// src/utils/htmlToReactPDFParser.js
import React from "react";
import { Text, View, StyleSheet } from "@react-pdf/renderer";
import { pdfTheme } from './pdfTheme';

const T = pdfTheme;
// Estilos base unificados para todas las secciones (descripción, condiciones, términos, especificaciones)
// Objetivo: mismo interlineado y separación vertical mínima y consistente.
// Reducido para lograr un interlineado más compacto (solicitud del usuario)
const baseLineHeight = 0.99; // compacto pero legible
const verticalGap = 1;       // antes 2
const compactGap = 0;        // ya no usamos margen inferior entre párrafos

const styles = StyleSheet.create({
  heading: {
    fontWeight: 'bold',
    fontSize: Math.max(T.font.h2 - 0.5, T.font.base + 0.5),
    marginTop: 0,
    marginBottom: verticalGap,
    lineHeight: baseLineHeight,
  },
  headingSmall: {
    fontWeight: 'bold',
    fontSize: T.font.base + 0.25,
  marginTop: 2, // reducido para evitar salto de página
  marginBottom: 1, // ligero espacio bajo subtítulo
    lineHeight: baseLineHeight,
  },
  paragraph: {
    marginTop: 0,
    marginBottom: 0, // sin espacio inferior para evitar salto doble
    lineHeight: baseLineHeight,
    textAlign: 'justify',
  },
  bold: { fontWeight: 'bold' },
  italic: { fontStyle: 'italic' },
  list: {
    marginTop: 0,
    marginBottom: verticalGap,
    paddingLeft: 10,
  },
  listItem: {
    marginBottom: 0,
    flexDirection: 'row',
  },
  listItemText: {
    flex: 1,
    textAlign: 'justify',
    lineHeight: baseLineHeight,
  },
  bullet: { marginRight: 3 },
  line: { flexDirection: 'row', flexWrap: 'wrap' }
});

export function parseHtmlToPDFComponents(html, { compact = false, dense = false } = {}) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");
  const root = doc.body;

  // Estilos compactos para ocupar menos espacio en página
  let s = compact
    ? {
        ...styles,
  heading: { ...styles.heading, marginTop: 0, marginBottom: 0 },
  headingSmall: { ...styles.headingSmall, marginTop: 0, marginBottom: 0 },
  paragraph: { ...styles.paragraph, marginBottom: 0 },
  list: { ...styles.list, marginTop: 0, marginBottom: 0 },
      }
    : styles;

  if (dense) {
    s = {
      ...s,
  paragraph: { ...s.paragraph, marginBottom: 0, lineHeight: 0.95 },
      list: { ...s.list, marginBottom: 0 },
      listItem: { ...s.listItem, marginBottom: 0 },
      listItemText: { ...s.listItemText, lineHeight: 0.95 },
      heading: { ...s.heading, lineHeight: 0.97 },
      headingSmall: { ...s.headingSmall, lineHeight: 0.97 },
    };
  }

  const applyInlineStyle = (base, node) => {
    if (!node.getAttribute) return base;
    const styleAttr = node.getAttribute('style');
    if (!styleAttr) return base;
    const styleMap = {};
    styleAttr.split(';').forEach(rule => {
      const [prop, value] = rule.split(':').map(p => p && p.trim());
      if (prop && value) styleMap[prop.toLowerCase()] = value;
    });
    const merged = { ...base };
    if (styleMap['margin'] && /^\d/.test(styleMap['margin'])) {
      // margen uniforme => usar como marginBottom si es pequeño
      const num = parseFloat(styleMap['margin']);
      if (!isNaN(num)) {
        merged.marginBottom = num <= 2 ? 0 : Math.min(num, 4);
        merged.marginTop = 0; // normalizar para compactar
      }
    }
    // márgenes específicos
    if (styleMap['margin-bottom']) {
      const num = parseFloat(styleMap['margin-bottom']);
      if (!isNaN(num)) merged.marginBottom = num;
    }
    if (styleMap['line-height']) {
      const lh = parseFloat(styleMap['line-height']);
      if (!isNaN(lh)) merged.lineHeight = lh;
    }
    if (styleMap['font-size']) {
      const fs = parseFloat(styleMap['font-size']);
      if (!isNaN(fs)) merged.fontSize = fs;
    }
    return merged;
  };

  const processNode = (node, index) => {
    switch (node.nodeName.toLowerCase()) {
      case "h3":
        return (
          <Text key={index} style={applyInlineStyle(s.heading, node)}>
            {parseChildren(node)}
          </Text>
        );
      case "h4":
        return (
          <Text key={index} style={s.headingSmall}>
            {parseChildren(node)}
          </Text>
        );
      case "p": {
        // Render directo, sin agrupación
        return (
          <Text key={index} style={s.paragraph}>
            {parseChildren(node)}
          </Text>
        );
      }
      case "br":
        return <Text key={index}>""</Text>;
      case "strong":
        return (
          <Text key={index} style={s.bold}>
            {parseChildren(node)}
          </Text>
        );
      case "em":
        return (
          <Text key={index} style={s.italic}>
            {parseChildren(node)}
          </Text>
        );
      case "ul": {
        const className = node.getAttribute && node.getAttribute('class');
        if (className && className.includes('condiciones-compactas')) {
          const isEspec = className.includes('espec-compactas');
          const extraIndent = isEspec ? 4 : 0; // indent base
          if (!isEspec) {
            // Condiciones / Términos: sin bullets (mantener comportamiento actual)
            return (
              <View key={index} style={{ marginTop:0, marginBottom:0, paddingLeft: extraIndent }}>
                {[...node.children].map((liNode, i) => (
                  <Text key={i} style={{ ...s.paragraph, marginBottom:0 }}>
                    {parseChildren(liNode)}
                  </Text>
                ))}
              </View>
            );
          }
          // Especificaciones: mostrar bullets compactos
          return (
            <View key={index} style={{ marginTop:3, marginBottom:0, paddingLeft: extraIndent }}>
              {[...node.children].map((liNode, i) => (
                <View key={i} style={{ flexDirection:'row', marginBottom:0 }}>
                  <Text style={{ width:6, textAlign:'center', lineHeight: s.paragraph.lineHeight }}>•</Text>
                  <Text style={{ ...s.paragraph, flex:1, marginBottom:0 }}>
                    {parseChildren(liNode)}
                  </Text>
                </View>
              ))}
            </View>
          );
        }
        return (
          <View key={index} style={s.list}>
            {[...node.children].map((li, i) => (
              <View key={i} style={s.listItem}>
                <Text style={s.bullet}>•</Text>
                <Text style={s.listItemText}>{parseChildren(li)}</Text>
              </View>
            ))}
          </View>
        );
      }
      case "div":
        return (
          <View key={index}>
            {parseChildren(node)}
          </View>
        );
      case "span":
        return (
          <Text key={index} style={applyInlineStyle({}, node)}>
            {parseChildren(node)}
          </Text>
        );
      default:
        return (
          <Text key={index}>
            {node.textContent}
          </Text>
        );
    }
  };

  const parseChildren = (node) => {
    return [...node.childNodes]
      .filter(
        (child) =>
          // Si es texto, solo si no es vacío o solo espacios
          !(child.nodeType === 3 && (!child.textContent || !child.textContent.trim()))
      )
      .map((child, i) =>
    child.nodeType === 3 ? child.textContent : processNode(child, i)
      );
  };

  return [...root.childNodes].map((node, i) => processNode(node, i));
}
