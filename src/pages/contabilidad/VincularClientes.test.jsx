import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import VincularClientes from "./VincularClientes.jsx";

// Prueba de humo: que la pantalla se pinte y muestre lo que decide la
// vinculación. No hace falta jsdom —se renderiza a texto— y con eso alcanza
// para que un error de sintaxis o un campo renombrado no llegue a la oficina.

const doc = (extra = {}) => ({
  id: extra.id || "d1",
  tipo: "factura",
  numero: "J-1001",
  fecha: "2026-03-04",
  clienteNombre: "AXIONLOG",
  clienteNit: "",
  empresaId: "",
  neto: 1_000_000,
  resumen: { neto: 1_000_000, saldo: 400_000 },
  ...extra,
});

const pintar = (props) =>
  renderToStaticMarkup(
    <MemoryRouter>
      <VincularClientes
        liquidados={[]}
        empresas={[]}
        cargando={false}
        anio={2026}
        recargar={() => {}}
        {...props}
      />
    </MemoryRouter>
  );

describe("VincularClientes", () => {
  it("felicita cuando no hay nada suelto", () => {
    const html = pintar({ liquidados: [doc({ empresaId: "e1" })] });
    expect(html).toContain("Todas las facturas tienen su cliente");
  });

  it("agrupa lo suelto y ofrece la empresa que coincide por nombre", () => {
    const html = pintar({
      liquidados: [doc(), doc({ id: "d2" })],
      empresas: [{ id: "e1", nombre: "AXIONLOG", nit: "9001234567" }],
    });
    expect(html).toContain("Mismo nombre");
    expect(html).toContain("2 documentos");
    expect(html).toContain("Aplicar 1 sugerencias");
  });

  it("ofrece crear el cliente cuando no hay con quién casarlo", () => {
    const html = pintar({ liquidados: [doc({ clienteNombre: "Cliente nuevo" })] });
    expect(html).toContain("Crear cliente");
    expect(html).not.toContain("Aplicar");
  });

  it("cuenta el saldo que está quedando fuera de su cliente", () => {
    const html = pintar({ liquidados: [doc(), doc({ id: "d2", clienteNombre: "Otro" })] });
    expect(html).toContain("Saldo suelto");
    expect(html).toContain("2 clientes distintos");
  });

  it("avisa de los clientes que quedaron repetidos en la base", () => {
    const html = pintar({
      liquidados: [doc({ empresaId: "e1" })],
      empresas: [
        { id: "e1", nombre: "AXIONLOG COLOMBIA S.A.S.", nit: "9001234567" },
        { id: "e2", nombre: "AXIONLOG" },
      ],
    });
    expect(html).toContain("aparece repetido en la base");
    expect(html).toContain("Fusionar en Empresas");
  });

  it("no avisa de duplicados cuando la base está limpia", () => {
    const html = pintar({ empresas: [{ id: "e1", nombre: "Colanta" }, { id: "e2", nombre: "Alpina" }] });
    expect(html).not.toContain("Fusionar en Empresas");
  });
});
