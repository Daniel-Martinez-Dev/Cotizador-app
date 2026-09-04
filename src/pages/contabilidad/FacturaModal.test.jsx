import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import FacturaModal from "./FacturaModal.jsx";

// Prueba de humo del formulario. Lo que se comprueba es lo que el usuario
// pidió poder hacer: abrir una factura ya guardada, ver si su cliente está
// vinculado y corregirlo.

const EMPRESAS = [
  { id: "e1", nombre: "AXIONLOG COLOMBIA S.A.S.", nit: "9001234567", alias: "Axionlog" },
];

const documento = (extra = {}) => ({
  id: "d1",
  tipo: "factura",
  numero: "J-1001",
  fecha: "2026-03-04",
  plazoDias: 30,
  fechaVencimiento: "2026-04-03",
  periodoContable: 2026,
  empresaId: "",
  clienteNombre: "AXIONLOG",
  clienteNit: "",
  items: [{ producto: "Puertas Rápidas", cantidad: 1, unidad: "und", valorUnitario: 840_336 }],
  ivaPorcentaje: 19,
  retenciones: [],
  neto: 1_000_000,
  ...extra,
});

const pintar = (props = {}) =>
  renderToStaticMarkup(
    <FacturaModal
      modo="editar"
      documento={documento()}
      empresas={EMPRESAS}
      documentos={[]}
      config={null}
      onCerrar={() => {}}
      onGuardado={() => {}}
      {...props}
    />
  );

describe("FacturaModal", () => {
  it("avisa cuando el documento no cuelga de ninguna empresa", () => {
    const html = pintar();
    expect(html).toContain("Sin vincular");
    expect(html).toContain("Crear y vincular");
  });

  it("muestra la empresa cuando sí está vinculado", () => {
    const html = pintar({ documento: documento({ empresaId: "e1" }) });
    expect(html).toContain("AXIONLOG COLOMBIA S.A.S.");
    expect(html).toContain("Desvincular");
    expect(html).not.toContain("Crear y vincular");
  });

  it("deja editar el año contable, que es el que decide dónde se lista", () => {
    expect(pintar()).toContain("Año contable");
  });

  it("avisa cuando la fecha y el año contable no coinciden", () => {
    const html = pintar({ documento: documento({ fecha: "2025-12-20", periodoContable: 2026 }) });
    expect(html).toContain("Fechado en 2025 pero reportado en 2026");
  });

  it("conserva el neto declarado en una factura migrada que no se ha tocado", () => {
    const html = pintar({
      documento: documento({ origen: "migracion", neto: 1_000_000, items: [{ producto: "X", cantidad: 1, unidad: "und", valorUnitario: 840_336 }] }),
    });
    expect(html).toContain("Migrado del Excel");
    expect(html).toContain("Se conservará el neto declarado en el Excel");
  });

  it("una nota débito sigue siendo nota débito al abrirla", () => {
    const html = pintar({ documento: documento({ tipo: "nota_debito" }) });
    expect(html).toContain("Editar nota débito");
    expect(html).toContain("suma</strong> a la cartera");
  });

  // Vínculos con el resto del negocio (ver utils/documentoVinculo.js). Son
  // opcionales: lo que se cuida es que la sección esté sin exigir nada, y que
  // lo ya vinculado se lea al abrir el documento.
  it("ofrece vincular cotización y fichas, diciendo que es opcional", () => {
    const html = pintar();
    expect(html).toContain("Vínculos");
    expect(html).toContain("la factura se guarda igual sin ellos");
    expect(html).toContain("Fichas de fabricación");
  });

  it("muestra la cotización y las fichas que el documento ya tenía", () => {
    const html = pintar({
      documento: documento({
        cotizacionId: "cot1",
        cotizacionNumero: "4821",
        fichas: [
          { tipo: "sello", id: "f1", codigo: "SA1203260147", ordenProduccion: 147, nombre: "Muelle 7", cliente: "AXIONLOG" },
          { tipo: "division", id: "f2", codigo: "DT1203260148", ordenProduccion: 148, nombre: "", cliente: "AXIONLOG" },
        ],
      }),
    });
    expect(html).toContain("Cotización N.º 4821");
    expect(html).toContain("SA1203260147");
    expect(html).toContain("DT1203260148");
    expect(html).toContain("2 fichas");
  });

  // El libro viejo se importó sin nada de esto y tiene que seguir abriéndose.
  it("un documento migrado sin vínculos abre sin romperse", () => {
    const html = pintar({ documento: documento({ origen: "migracion" }) });
    expect(html).toContain("Vínculos");
    expect(html).not.toContain("Cotización N.º");
  });
});

// El formulario también se llena desde Android. Lo que se cuida aquí es que en
// pantalla angosta no queden controles sin decir qué son: la cabecera de
// columnas de los conceptos se oculta, y sin rótulo propio eran cuatro cajas
// numéricas seguidas donde no se distingue la cantidad del valor unitario.
describe("FacturaModal en pantalla angosta", () => {
  it("cada campo del concepto lleva su rótulo cuando la cabecera no está", () => {
    const html = pintar();
    // La cabecera de columnas solo existe desde md.
    expect(html).toContain('class="hidden md:grid');
    // Y el rótulo por campo, solo hasta md.
    for (const rotulo of ["Producto", "Cantidad", "Unidad", "Valor unitario", "Subtotal"]) {
      expect(html, `falta el rótulo móvil de ${rotulo}`).toContain(
        `<span class="md:hidden text-[10px] font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">${rotulo}</span>`
      );
    }
  });

  it("numera los conceptos y ofrece quitarlos con un botón que se puede tocar", () => {
    const html = pintar();
    expect(html).toContain("Concepto 1");
    expect(html).toContain("Quitar");
  });
});
