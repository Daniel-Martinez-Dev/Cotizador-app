import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import CodigoBarrasMaterial from "./CodigoBarrasMaterial";
import EscanerCodigoModal from "./EscanerCodigoModal";
import { construirHtmlEtiquetas } from "./EtiquetasMaterialModal";
import { formatearCodigoBarras } from "../../utils/codigoMaterial";

const CODIGO = formatearCodigoBarras(42);

describe("código de barras en pantalla", () => {
  it("dibuja las barras del código", () => {
    const html = renderToStaticMarkup(<CodigoBarrasMaterial codigo={CODIGO} />);
    expect(html).toContain("<svg");
    expect(html).toContain(`aria-label="Código de barras ${CODIGO}"`);
    expect(html.match(/<rect/g).length).toBeGreaterThan(20);
  });

  it("se mantiene en blanco y negro, sin seguir el tema oscuro", () => {
    // Barras claras sobre fondo oscuro no las lee ningún escáner.
    const html = renderToStaticMarkup(<CodigoBarrasMaterial codigo={CODIGO} />);
    expect(html).toContain('fill="#000"');
    expect(html).toContain('background:#fff');
  });

  it("avisa en vez de romperse cuando el material no tiene código", () => {
    const html = renderToStaticMarkup(<CodigoBarrasMaterial codigo="" />);
    expect(html).toContain("Sin código de barras");
    expect(html).not.toContain("<svg");
  });
});

describe("ventana de escaneo", () => {
  // En un entorno sin cámara (el PC de bodega es el caso real) la ventana no
  // puede quedarse en blanco: tiene que ofrecer el lector de pistola.
  it("ofrece el campo del lector cuando no hay cámara", () => {
    const html = renderToStaticMarkup(
      <EscanerCodigoModal titulo="Escanear material" onDetect={() => {}} onClose={() => {}} />
    );
    expect(html).toContain("Escanear material");
    expect(html).toContain("Lector de pistola");
    expect(html).toContain("no puede leer códigos con la cámara");
  });

  it("muestra el error de un código no encontrado", () => {
    const html = renderToStaticMarkup(
      <EscanerCodigoModal error="Ningún material tiene el código 123" onDetect={() => {}} onClose={() => {}} />
    );
    expect(html).toContain("Ningún material tiene el código 123");
  });
});

describe("hoja de etiquetas", () => {
  const items = [
    { id: "a", nombre: "Lámina galvanizada", sku: "MP-LAM-0042", ubicacion: "Bodega 1", codigoBarras: CODIGO },
    { id: "b", nombre: "Sin etiquetar", sku: "", ubicacion: "", codigoBarras: "" },
  ];

  it("imprime el nombre, el SKU y las barras de cada material", () => {
    const html = construirHtmlEtiquetas(items);
    expect(html).toContain("Lámina galvanizada");
    expect(html).toContain("MP-LAM-0042");
    expect(html).toContain("Bodega 1");
    expect(html).toContain("<svg");
  });

  it("deja fuera los materiales sin código en vez de imprimir etiquetas mudas", () => {
    const html = construirHtmlEtiquetas(items);
    expect(html).not.toContain("Sin etiquetar");
  });

  it("evita que una etiqueta se parta entre dos hojas", () => {
    expect(construirHtmlEtiquetas(items)).toContain("page-break-inside: avoid");
  });

  it("escapa el nombre del material en el HTML de impresión", () => {
    const html = construirHtmlEtiquetas([
      { id: "x", nombre: "<script>alert(1)</script>", sku: "MP-GEN-0001", codigoBarras: CODIGO },
    ]);
    expect(html).not.toContain("<script>alert(1)</script>");
    expect(html).toContain("&lt;script&gt;");
  });

  it("no revienta con la lista vacía", () => {
    expect(construirHtmlEtiquetas([])).toContain("<body>");
    expect(construirHtmlEtiquetas(null)).toContain("<body>");
  });
});
