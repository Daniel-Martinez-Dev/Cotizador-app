import {
  FaHome,
  FaFileInvoiceDollar,
  FaIndustry,
  FaBoxes,
  FaThLarge,
  FaHistory,
  FaBuilding,
  FaUsersCog,
  FaCalculator,
} from "react-icons/fa";

// Fuente única de las secciones de la interfaz de oficina. La consumen la
// barra superior (pestañas de escritorio y menú móvil) y el encabezado de cada
// página (PageHeader), para que el ícono y el nombre que se ven arriba sean
// exactamente los mismos que se ven dentro de la sección.
//
// `permiso` marca las secciones que dependen de un rol o de un feature flag;
// quién puede verlas lo decide AppShell, que ya conoce los permisos.
export const NAV_SECTIONS = [
  {
    to: "/dashboard",
    label: "Inicio",
    icon: FaHome,
    desc: "Accesos rápidos a los módulos disponibles según tus permisos.",
  },
  {
    to: "/cotizar",
    label: "Cotizar",
    icon: FaFileInvoiceDollar,
    desc: "Arma la cotización, calcula el total y genera el PDF.",
  },
  {
    to: "/produccion",
    label: "Producción",
    icon: FaIndustry,
    desc: "Fichas técnicas por producto y órdenes en planta.",
    permiso: "produccion",
  },
  {
    to: "/inventario",
    label: "Inventario",
    icon: FaBoxes,
    desc: "Materia prima, proveedores y movimientos de almacén.",
    permiso: "inventario",
  },
  {
    to: "/contabilidad",
    label: "Contabilidad",
    icon: FaCalculator,
    desc: "Facturas, abonos y cartera por cliente.",
    permiso: "contabilidad",
  },
  {
    to: "/productos",
    label: "Productos",
    icon: FaThLarge,
    desc: "Catálogo, precios y condiciones comerciales.",
  },
  {
    to: "/historial",
    label: "Historial",
    icon: FaHistory,
    desc: "Cotizaciones emitidas, su estado y seguimiento.",
  },
  {
    to: "/empresas",
    label: "Empresas",
    icon: FaBuilding,
    desc: "Clientes, contactos y datos de facturación.",
  },
  {
    to: "/usuarios",
    label: "Usuarios",
    icon: FaUsersCog,
    desc: "Solicitudes de acceso, roles y pre-registro.",
    permiso: "admin",
  },
];

// Las secciones no son ocho cosas sueltas: cuatro son el ciclo de una
// cotización (armarla, consultar el catálogo, buscarla después, y el cliente al
// que va), y dos son la operación de planta. El lateral las muestra agrupadas
// así; "Administración" va al pie y separado porque no es trabajo del día.
//
// Producción e Inventario no se despliegan aquí: cada una ya trae sus propias
// pestañas dentro de la página (las fichas por producto, los materiales y
// proveedores), y duplicarlas en el lateral sería el mismo menú dos veces.
export const NAV_GRUPOS = [
  { titulo: null, rutas: ["/dashboard"] },
  { titulo: "Cotizaciones", rutas: ["/cotizar", "/productos", "/historial", "/empresas"] },
  { titulo: "Operación", rutas: ["/produccion", "/inventario", "/contabilidad"] },
  { titulo: "Administración", rutas: ["/usuarios"], alPie: true },
];

function filtro({ canProduccion, canInventario, canContabilidad, isAdminUser }) {
  const permitido = {
    produccion: canProduccion,
    inventario: canInventario,
    contabilidad: canContabilidad,
    admin: isAdminUser,
  };
  return (s) => !s.permiso || permitido[s.permiso];
}

// Secciones que el usuario actual puede ver, en el orden del menú.
export function seccionesVisibles(permisos) {
  return NAV_SECTIONS.filter(filtro(permisos));
}

// Lo mismo, pero agrupado para el lateral. Un grupo que se queda sin secciones
// visibles (Administración para quien no es admin) no se devuelve: si no, se
// vería el título de un grupo vacío.
export function gruposVisibles(permisos) {
  const puedeVer = filtro(permisos);
  const porRuta = new Map(NAV_SECTIONS.map((s) => [s.to, s]));
  return NAV_GRUPOS
    .map((g) => ({ ...g, secciones: g.rutas.map((r) => porRuta.get(r)).filter(Boolean).filter(puedeVer) }))
    .filter((g) => g.secciones.length > 0);
}

// Sección a la que pertenece una ruta. Acepta rutas hijas (/produccion/algo)
// para que el encabezado y la pestaña activa no se pierdan al navegar dentro.
export function seccionDe(pathname = "") {
  return (
    NAV_SECTIONS.find((s) => s.to === pathname) ||
    NAV_SECTIONS.find((s) => pathname.startsWith(`${s.to}/`)) ||
    null
  );
}
