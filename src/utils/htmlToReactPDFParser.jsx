// src/utils/htmlToReactPDFParser.js
import React from "react";
import { Text, View, StyleSheet } from "@react-pdf/renderer";

const styles = StyleSheet.create({
  paragraph: {
    marginBottom: 2, // antes 0, ahora un poco más de espacio
    lineHeight: 1, // aumenta el interlineado
  },
  bold: {
    fontWeight: 'bold',
  },
  list: {
    marginBottom: 0.5, // antes 1
    paddingLeft: 10,
  },
  listItem: {
    marginBottom: 0.2, // antes 0.5
    flexDirection: "row",
  },
  bullet: {
    marginRight: 4,
  },
  line: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  }
});

export function parseHtmlToPDFComponents(html) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");
  const root = doc.body;

  const processNode = (node, index) => {
    switch (node.nodeName.toLowerCase()) {
      case "p":
        const isStrong = node.firstChild && node.firstChild.nodeName.toLowerCase() === "strong";
        return (
          <Text
            key={index}
            style={isStrong ? { ...styles.paragraph, marginBottom: 0 } : styles.paragraph}
          >
            {parseChildren(node)}
          </Text>
        );
      case "br":
        return <Text key={index}>{"\n"}</Text>;
      case "strong":
        return (
          <Text key={index} style={styles.bold}>
            {parseChildren(node)}
          </Text>
        );
      case "ul":
        return (
          <View key={index} style={styles.list}>
            {[...node.children].map((li, i) => (
              <View key={i} style={styles.listItem}>
                <Text style={styles.bullet}>•</Text>
                <Text>{parseChildren(li)}</Text>
              </View>
            ))}
          </View>
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
