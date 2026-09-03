import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { claseControl, Modal, TiraTotales, KPI, FilaDato, Casilla } from "./ui.jsx";

// El kit decide cómo se ve toda la sección, así que las reglas que hacen que
// sirva en Android se fijan aquí y no en cada pestaña.

describe("kit de contabilidad en el teléfono", () => {
  it("los controles miden 44 px hasta sm y bajan a 36 en escritorio", () => {
    expect(claseControl).toContain("h-11");
    expect(claseControl).toContain("sm:h-9");
  });

  it("el texto de los campos llega a 16 px, que es lo que evita el zoom al enfocar", () => {
    expect(claseControl).toContain("text-base");
    expect(claseControl).toContain("sm:text-sm");
  });

  it("la ventana ocupa la pantalla entera en el teléfono y flota desde sm", () => {
    const html = renderToStaticMarkup(
      <Modal titulo="Prueba" onCerrar={() => {}} pie={<button type="button">Guardar</button>}>
        <p>contenido</p>
      </Modal>
    );
    expect(html).toContain("h-full sm:h-auto");
    expect(html).toContain("rounded-none sm:rounded-xl");
    // El pie se apila al revés: la acción principal queda arriba, al alcance.
    expect(html).toContain("flex-col-reverse sm:flex-row");
  });

  it("los totales se deslizan en el teléfono y se reparten en rejilla en escritorio", () => {
    const html = renderToStaticMarkup(
      <TiraTotales>
        <KPI titulo="Por cobrar" valor="$ 1.000" />
      </TiraTotales>
    );
    expect(html).toContain("overflow-x-auto");
    expect(html).toContain("sm:grid");
    expect(html).toContain("sm:grid-cols-3");
  });

  it("lo que resta a los lados casa con lo que acolcha la página, o sobresale", () => {
    // ContabilidadPage usa px-3 en el teléfono: restar -mx-4 sacaba la tira
    // cuatro píxeles por lado y ponía a rodar toda la pantalla en horizontal.
    const html = renderToStaticMarkup(<TiraTotales><span>x</span></TiraTotales>);
    expect(html).toContain("-mx-3 px-3");
    expect(html).not.toContain("-mx-4");
  });

  it("el reparto se pide por parámetro, para que no compita con el de por defecto", () => {
    const html = renderToStaticMarkup(
      <TiraTotales columnas="sm:grid-cols-2 lg:grid-cols-4"><span>x</span></TiraTotales>
    );
    expect(html).toContain("sm:grid-cols-2");
    expect(html).not.toContain("sm:grid-cols-3");
  });

  it("la fila de dato nombra la cifra, que en una tarjeta no tiene cabecera que la rotule", () => {
    const html = renderToStaticMarkup(<FilaDato label="Saldo">$ 1.000</FilaDato>);
    expect(html).toContain("Saldo");
    expect(html).toContain("$ 1.000");
  });

  it("la casilla da un objetivo de 44 px, no un cuadrito de 16", () => {
    const html = renderToStaticMarkup(<Casilla checked onChange={() => {}}>Solo vencidas</Casilla>);
    expect(html).toContain("min-h-[44px]");
  });
});
