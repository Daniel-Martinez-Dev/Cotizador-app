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
  bullet: { marginRight: 2 },
  line: { flexDirection: 'row', flexWrap: 'wrap' }
});

export function parseHtmlToPDFComponents(html, { compact = false, dense = false, readable = false, onlyBoldHeadings = false, compressShortItems = false } = {}) {
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
  paragraph: { ...s.paragraph, marginBottom: 0, lineHeight: 0.9 },
      list: { ...s.list, marginBottom: 0 },
      listItem: { ...s.listItem, marginBottom: 0 },
      listItemText: { ...s.listItemText, lineHeight: 0.9 },
      heading: { ...s.heading, lineHeight: 0.94 },
      headingSmall: { ...s.headingSmall, lineHeight: 0.94 },
    };
  }

  // Modo legible: mayor interlineado y separación, útil para Especificaciones Técnicas
  if (readable) {
    s = {
      ...s,
  paragraph: { ...s.paragraph, lineHeight: 0.8, marginBottom: 1.0 },
  list: { ...s.list, marginTop: 0.5, marginBottom: 0.5, paddingLeft: 12 },
  listItem: { ...s.listItem, marginBottom: 0.2 },
  listItemText: { ...s.listItemText, lineHeight: 0.8},
  heading: { ...s.heading, marginBottom: 2.5, lineHeight: 1.04 },
  headingSmall: { ...s.headingSmall, marginTop: 1.5, marginBottom: 2.5, lineHeight: 1.04 },
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

  const isInside = (n, tag) => {
    let cur = n && n.parentNode;
    tag = (tag || '').toLowerCase();
    while (cur) {
      if (cur.nodeName && cur.nodeName.toLowerCase() === tag) return true;
      cur = cur.parentNode;
    }
    return false;
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
      case "strong": {
        // Si solo se permiten subtítulos en negrilla, desactivar bold dentro de listas y párrafos
        const isInList = isInside(node, 'li') || isInside(node, 'ul');
        const isInHeading = isInside(node, 'h3') || isInside(node, 'h4');
        const style = onlyBoldHeadings && isInList && !isInHeading ? {} : s.bold;
        return (
          <Text key={index} style={style}>
            {parseChildren(node)}
          </Text>
        );
      }
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
            <View key={index} style={{ marginTop:2, marginBottom:0, paddingLeft: extraIndent }}>
              {[...node.children].map((liNode, i) => (
                <View key={i} style={{ flexDirection:'row', marginBottom: s.listItem.marginBottom }}>
                  <Text style={{ width:6, textAlign:'center', lineHeight: (s.listItemText?.lineHeight || s.paragraph.lineHeight) }}>•</Text>
                  <Text style={{ ...s.listItemText, flex:1, marginBottom:0 }}>
                    {parseChildren(liNode)}
                  </Text>
                </View>
              ))}
            </View>
          );
        }
        // Agrupar ítems cortos si está activado
        const liNodes = [...node.children];
        if (!compressShortItems) {
          return (
            <View key={index} style={s.list}>
              {liNodes.map((li, i) => (
                <View key={i} style={s.listItem}>
                  <Text style={s.bullet}>•</Text>
                  <Text style={s.listItemText}>{parseChildren(li)}</Text>
                </View>
              ))}
            </View>
          );
        }
        // Estrategia de agrupación: combinar ítems con texto corto en una sola línea separados por •
        const groups = [];
        let current = [];
        let currentLen = 0;
        const maxLineLen = 120; // umbral aproximado
        const maxItemsPerLine = 3;
        liNodes.forEach((li) => {
          const text = (li.textContent || '').replace(/\s+/g, ' ').trim();
          const len = text.length;
          const isLong = len > 100; // ítems largos permanecen solos
          if (isLong) {
            if (current.length) { groups.push([...current]); current = []; currentLen = 0; }
            groups.push([li]);
          } else {
            if (
              current.length === 0 ||
              (currentLen + len <= maxLineLen && current.length < maxItemsPerLine)
            ) {
              current.push(li);
              currentLen += len;
            } else {
              groups.push([...current]);
              current = [li];
              currentLen = len;
            }
          }
        });
        if (current.length) groups.push(current);

        return (
          <View key={index} style={s.list}>
            {groups.map((grp, i) => (
              <View key={i} style={s.listItem}>
                <Text style={s.bullet}>•</Text>
                <Text style={s.listItemText}>
                  {grp.map((li, j) => (
                    <Text key={j}>
                      {li.textContent.replace(/\s+/g, ' ').trim()}
                      {j < grp.length - 1 ? ' • ' : ''}
                    </Text>
                  ))}
                </Text>
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
