import DOMPurify from "dompurify";

// Tags permitidos en el editor de texto enriquecido
const RICH_TEXT_TAGS = [
  "p", "br", "strong", "em", "u", "s",
  "ul", "ol", "li",
  "h1", "h2", "h3", "h4",
  "a", "span", "div",
  "table", "thead", "tbody", "tr", "th", "td",
  "blockquote", "pre", "code",
];

const RICH_TEXT_ATTR = ["href", "target", "rel", "class", "style", "colspan", "rowspan"];

let hookAdded = false;

function ensureHooks() {
  if (hookAdded) return;
  DOMPurify.addHook("afterSanitizeAttributes", (node) => {
    const tag = node.tagName ? node.tagName.toLowerCase() : "";

    // Todos los enlaces abren en pestaña nueva con rel seguro
    if (tag === "a") {
      if (node.getAttribute("href")) {
        node.setAttribute("rel", "noopener noreferrer");
        node.setAttribute("target", "_blank");
      } else {
        node.removeAttribute("href");
      }
    }

    // Eliminar event handlers inline (onclick, onmouseover, etc.)
    const attrs = Array.from(node.attributes || []);
    for (const attr of attrs) {
      if (attr.name.startsWith("on")) {
        node.removeAttribute(attr.name);
      }
    }

    // Neutralizar javascript: en style
    if (node.hasAttribute("style")) {
      const style = node.getAttribute("style");
      if (/javascript:/i.test(style) || /expression\s*\(/i.test(style)) {
        node.removeAttribute("style");
      }
    }
  });
  hookAdded = true;
}

/**
 * Sanitiza HTML rico (editor de cotizaciones).
 * Úsalo siempre antes de dangerouslySetInnerHTML.
 */
export function sanitizeHtml(html) {
  ensureHooks();
  return DOMPurify.sanitize(String(html ?? ""), {
    ALLOWED_TAGS: RICH_TEXT_TAGS,
    ALLOWED_ATTR: RICH_TEXT_ATTR,
    ALLOW_DATA_ATTR: false,
    FORBID_SCRIPTS: true,
    FORBID_TAGS: ["script", "iframe", "object", "embed", "form", "input"],
    ALLOWED_URI_REGEXP: /^(?:(?:https?|mailto|tel):|[#/])/i,
  });
}

/**
 * Elimina todo HTML y devuelve texto plano.
 * Úsalo para campos de texto en Firestore (nombres, emails, cargos).
 */
export function sanitizeText(text) {
  return DOMPurify.sanitize(String(text ?? ""), {
    ALLOWED_TAGS: [],
    ALLOWED_ATTR: [],
  }).trim();
}

/**
 * Sanitiza una URL. Rechaza javascript: y data: (excepto imágenes).
 * Devuelve cadena vacía si la URL es insegura.
 */
export function sanitizeUrl(url) {
  const s = String(url ?? "").trim();
  if (/^javascript:/i.test(s)) return "";
  if (/^data:(?!image\/(png|jpe?g|gif|webp|svg\+xml))/i.test(s)) return "";
  return s;
}
