import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import AppHeader from "./AppHeader.jsx";
import AppSidebar from "./AppSidebar.jsx";
import { gruposVisibles, seccionDe, seccionesVisibles } from "./navSections.js";

const TODO = { canProduccion: true, canInventario: true, isAdminUser: true };

const HEADER = {
  permisos: TODO,
  user: { email: "alguien@ccs.com" },
  profile: { displayName: "Ana" },
  dark: false,
  onToggleTheme: () => {},
  onSignOut: () => {},
  onNuevaCotizacion: () => {},
  quoteData: {},
  onSalirEdicion: () => {},
  requireLogin: true,
};

const header = (ruta, props = {}) =>
  renderToStaticMarkup(
    <MemoryRouter initialEntries={[ruta]}>
      <AppHeader {...HEADER} {...props} />
    </MemoryRouter>
  );

const lateral = (activaTo, props = {}) =>
  renderToStaticMarkup(
    <MemoryRouter>
      <AppSidebar permisos={TODO} activaTo={activaTo} colapsado={false} onToggle={() => {}} {...props} />
    </MemoryRouter>
  );

describe("menú lateral", () => {
  it("agrupa las secciones por lo que se hace con ellas", () => {
    const grupos = gruposVisibles(TODO);
    const porTitulo = Object.fromEntries(grupos.map((g) => [g.titulo, g.secciones.map((s) => s.to)]));
    expect(porTitulo[null]).toEqual(["/dashboard"]);
    expect(porTitulo["Cotizaciones"]).toEqual(["/cotizar", "/productos", "/historial", "/empresas"]);
    expect(porTitulo["Operación"]).toEqual(["/produccion", "/inventario"]);
    expect(porTitulo["Administración"]).toEqual(["/usuarios"]);
  });

  it("manda Administración al pie y no a la lista principal", () => {
    const admin = gruposVisibles(TODO).find((g) => g.titulo === "Administración");
    expect(admin.alPie).toBe(true);
    expect(gruposVisibles(TODO).filter((g) => g.alPie)).toHaveLength(1);
  });

  it("marca como activa solo la sección en la que se está", () => {
    const html = lateral("/produccion");
    const activas = html.match(/<a[^>]*aria-current="page"[^>]*>/g) || [];
    expect(activas).toHaveLength(1);
    expect(activas[0]).toContain('href="/produccion"');
  });

  it("mantiene la sección activa dentro de rutas hijas", () => {
    expect(seccionDe("/produccion/orden/123")?.label).toBe("Producción");
    expect(seccionDe("/dashboard")?.label).toBe("Inicio");
    expect(seccionDe("/ruta-que-no-existe")).toBeNull();
  });

  it("oculta las secciones sin permiso y descarta el grupo que queda vacío", () => {
    const solos = { canProduccion: false, canInventario: false, isAdminUser: false };
    const grupos = gruposVisibles(solos);
    expect(grupos.map((g) => g.titulo)).not.toContain("Administración");
    expect(grupos.map((g) => g.titulo)).not.toContain("Operación");
    const html = lateral("/cotizar", { permisos: solos });
    expect(html).not.toContain('href="/usuarios"');
    expect(html).not.toContain('href="/produccion"');
    expect(html).toContain('href="/historial"');
  });

  it("colapsado deja el ícono y el nombre pasa al tooltip", () => {
    const html = lateral("/cotizar", { colapsado: true });
    expect(html).toContain('title="Cotizar"');
    expect(html).not.toContain(">Cotizaciones<");
    expect(html).toContain('href="/cotizar"');
  });

  it("da a cada sección un ícono y una descripción", () => {
    const todas = seccionesVisibles(TODO);
    expect(todas).toHaveLength(8);
    todas.forEach((s) => {
      expect(s.icon, `${s.label} sin ícono`).toBeTruthy();
      expect(s.desc, `${s.label} sin descripción`).toBeTruthy();
    });
  });
});

describe("barra superior", () => {
  it("ya no lleva las secciones: de eso se encarga el lateral", () => {
    const html = header("/produccion");
    expect(html).not.toContain('href="/historial"');
    expect(html).not.toContain('href="/empresas"');
  });

  it("no gasta ancho de barra en el correo ni en el atajo a planta", () => {
    // Ambos viven dentro del menú del avatar, que se despliega al hacer clic.
    // El correo puede seguir como tooltip del avatar, pero no como texto: eso
    // era lo que se comía ~250 px de la barra.
    const html = header("/dashboard");
    expect(html).not.toContain(">alguien@ccs.com<");
    expect(html).toContain('title="alguien@ccs.com"');
    expect(html).not.toContain('href="/planta"');
  });

  it("nombra la sección actual para quien no tiene lateral (móvil)", () => {
    expect(header("/inventario")).toContain(">Inventario<");
  });

  it("solo ofrece Nueva cotización dentro de Cotizar", () => {
    // Es la acción principal de esa sección, no de la app: en Producción o
    // Inventario no hay nada que iniciar.
    expect(header("/cotizar")).toContain("Nueva cotización");
    expect(header("/produccion")).not.toContain("Nueva cotización");
    expect(header("/dashboard")).not.toContain("Nueva cotización");
  });

  it("avisa del modo edición con el número de la cotización", () => {
    const html = header("/cotizar", { quoteData: { modoEdicion: true, numero: 412 } });
    expect(html).toContain("Editando #412");
  });
});
