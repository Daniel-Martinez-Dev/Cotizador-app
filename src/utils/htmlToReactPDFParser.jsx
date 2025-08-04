// src/utils/htmlToReactPDFParser.js
import React from "react";
import { Text, View, StyleSheet } from "@react-pdf/renderer";

const styles = StyleSheet.create({
  paragraph: {
    marginBottom: 6,
  },
  bold: {
    fontWeight: 'bold',
  },
  list: {
    marginBottom: 6,
    paddingLeft: 10,
  },
  listItem: {
    marginBottom: 2,
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
        return (
          <Text key={index} style={styles.paragraph}>
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
    return [...node.childNodes].map((child, i) =>
      child.nodeType === 3 ? child.textContent : processNode(child, i)
    );
  };

  return [...root.childNodes].map((node, i) => processNode(node, i));
}
