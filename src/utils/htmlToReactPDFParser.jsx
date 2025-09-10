// src/utils/htmlToReactPDFParser.js
import React from "react";
import { Text, View, StyleSheet } from "@react-pdf/renderer";
import { pdfTheme } from './pdfTheme';

const T = pdfTheme;
const styles = StyleSheet.create({
  heading: {
  fontWeight: 'bold',
  fontSize: Math.max(T.font.h2 - 0.5, T.font.base + 0.5), // ligeramente menor que sectionTitle
    marginTop: 2,
    marginBottom: 3,
  },
  headingSmall: {
  fontWeight: 'bold',
  fontSize: T.font.base + 0.25,
    marginTop: 2,
    marginBottom: 2,
  },
  paragraph: {
    marginBottom: 0.5,
    lineHeight: 1.12,
    textAlign: 'justify',
  },
  bold: {
    fontWeight: 'bold',
  },
  italic: {
    fontStyle: 'italic',
  },
  list: {
    marginBottom: 0.5,
    paddingLeft: 12,
  },
  listItem: {
    marginBottom: 0.5,
    flexDirection: "row",
  },
  listItemText: {
    flex: 1,
    textAlign: 'justify',
    lineHeight: 1.15,
  },
  bullet: {
    marginRight: 4,
  },
  line: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  }
});

export function parseHtmlToPDFComponents(html, { compact = false, dense = false } = {}) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");
  const root = doc.body;

  // Estilos compactos para ocupar menos espacio en página
  let s = compact
    ? {
        heading: { ...styles.heading, marginBottom: 2 },
        headingSmall: { ...styles.headingSmall, marginBottom: 1 },
  paragraph: { ...styles.paragraph, marginBottom: 1.5, lineHeight: 1.08 },
        bold: styles.bold,
        italic: styles.italic,
  list: { ...styles.list, marginBottom: 1.5, paddingLeft: 12 },
  listItem: { ...styles.listItem, marginBottom: 0.8 },
        bullet: { ...styles.bullet, marginRight: 3 },
        line: styles.line,
      }
    : styles;

  if (dense) {
    s = {
      ...s,
      paragraph: { ...s.paragraph, marginBottom: 0 },
      list: { ...s.list, marginBottom: 0 },
      listItem: { ...s.listItem, marginBottom: 0 },
    };
  }

  const processNode = (node, index) => {
    switch (node.nodeName.toLowerCase()) {
      case "h3":
        return (
          <Text key={index} style={s.heading}>
            {parseChildren(node)}
          </Text>
        );
      case "h4":
        return (
          <Text key={index} style={s.headingSmall}>
            {parseChildren(node)}
          </Text>
        );
      case "p":
        const isStrong = node.firstChild && node.firstChild.nodeName.toLowerCase() === "strong";
        return (
          <Text
            key={index}
            style={isStrong ? { ...s.paragraph, marginBottom: 0 } : s.paragraph}
          >
            {parseChildren(node)}
          </Text>
        );
      case "br":
        return <Text key={index}>{"\n"}</Text>;
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
      case "ul":
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
      case "div":
        return (
          <View key={index}>
            {parseChildren(node)}
          </View>
        );
      case "span":
        return (
          <Text key={index}>
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
