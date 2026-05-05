import DOMPurify from "dompurify";

const ALLOWED_TAGS = [
  "p",
  "br",
  "strong",
  "em",
  "u",
  "ul",
  "ol",
  "li",
  "h1",
  "h2",
  "h3",
  "a",
];

const ALLOWED_ATTR = ["href", "target", "rel", "class"];

let hookAdded = false;

function ensureHooks() {
  if (hookAdded) return;
  DOMPurify.addHook("afterSanitizeAttributes", (node) => {
    const tag = node.tagName ? node.tagName.toLowerCase() : "";
    if (tag === "a") {
      if (node.getAttribute("href")) {
        node.setAttribute("rel", "noopener noreferrer");
        node.setAttribute("target", "_blank");
      }
    } else {
      node.removeAttribute("target");
      node.removeAttribute("rel");
    }

    if (tag !== "ul") {
      node.removeAttribute("class");
    }
  });
  hookAdded = true;
}

export function sanitizeHtml(html) {
  ensureHooks();
  return DOMPurify.sanitize(String(html ?? ""), {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
    ALLOW_DATA_ATTR: false,
    ALLOWED_URI_REGEXP: /^(?:(?:https?|mailto|tel):|[#/])/i,
  });
}
