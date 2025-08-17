// Datos de ejemplo para pruebas / seeding
// Empresas con contactos (nuevo modelo empresas + subcolección contactos)
export const sampleEmpresas = [
  {
    nombre: "Logistica Andina S.A.", nit: "800123001-1", ciudad: "Bogotá",
    contactos: [
      { nombre: "Carolina Mejía", email: "cmejia@logisticaandina.com", telefono: "3104552211" },
      { nombre: "Luis Rojas", email: "lrojas@logisticaandina.com", telefono: "3167789001" }
    ]
  },
  { nombre: "FrioIndustrial SAS", nit: "901556772-3", ciudad: "Medellín",
    contactos: [ { nombre: "Paula Vélez", email: "pvelez@frioindustrial.co", telefono: "3019987722" } ] },
  { nombre: "AgroBodega LTDA", nit: "900332110-5", ciudad: "Cali",
    contactos: [
      { nombre: "Oscar Valencia", email: "ovalencia@agrobodega.com", telefono: "3002201199" },
      { nombre: "Marta Díaz", email: "mdiaz@agrobodega.com", telefono: "3115600044" },
      { nombre: "Turnos Recepción", email: "recepcion@agrobodega.com", telefono: "" }
    ]
  },
  { nombre: "Puertas & Sellos del Caribe", nit: "812009334-9", ciudad: "Barranquilla",
    contactos: [ { nombre: "Jorge Jiménez", email: "jjimenez@psc.com.co", telefono: "3201118899" } ] },
  { nombre: "Distribuciones Frigoríficas del Norte", nit: "900778221-0", ciudad: "Bucaramanga",
    contactos: [ { nombre: "Soporte Compras", email: "compras@dfn.com.co", telefono: "" } ] },
  { nombre: "Alimentos Congelados Rivera", nit: "901004555-7", ciudad: "Bogotá",
    contactos: [
      { nombre: "Sara Blanco", email: "sblanco@acrivera.com", telefono: "3126600040" },
      { nombre: "Inventarios Frío", email: "inventarios@acrivera.com", telefono: "" }
    ]
  },
  { nombre: "Terminal Logístico Pacífico", nit: "900112300-2", ciudad: "Buenaventura",
    contactos: [ { nombre: "Henry Castillo", email: "hcastillo@tlpacifico.com", telefono: "3147700090" } ] },
  { nombre: "FrioCenter", nit: "830777199-8", ciudad: "Bogotá",
    contactos: [
      { nombre: "Compras General", email: "compras@friocenter.com", telefono: "" },
      { nombre: "Andrea Tovar", email: "atovar@friocenter.com", telefono: "3015507788" }
    ]
  },
  { nombre: "Cadena Fría Express", nit: "901770221-4", ciudad: "Medellín",
    contactos: [ { nombre: "Tatiana Murillo", email: "tmurillo@cfe.com.co", telefono: "3204450066" } ] },
  { nombre: "Almacenes Refrigerados Omega", nit: "900002211-6", ciudad: "Cali",
    contactos: [ { nombre: "Luis Pérez", email: "lperez@omega-frio.com", telefono: "3158800042" } ] },
  { nombre: "Centro Logístico Frío Altura", nit: "901900555-9", ciudad: "Bogotá",
    contactos: [
      { nombre: "Mesa Compras", email: "compras@frioaltura.com", telefono: "" },
      { nombre: "Camila León", email: "cleon@frioaltura.com", telefono: "3021198844" }
    ]
  },
  { nombre: "Bodegas Integradas Andinas", nit: "900556100-3", ciudad: "Duitama",
    contactos: [ { nombre: "Ricardo Peña", email: "rpena@bia.com.co", telefono: "3007780022" } ] },
  { nombre: "Operador Frigorífico Meta", nit: "901334221-1", ciudad: "Villavicencio",
    contactos: [ { nombre: "Sandra Rincón", email: "srincon@ofmeta.com", telefono: "3107700033" } ] },
  { nombre: "Red Fría Nacional", nit: "900667880-5", ciudad: "Bogotá",
    contactos: [
      { nombre: "Turno Noche", email: "noche@redfrianal.com", telefono: "" },
      { nombre: "Julio Torres", email: "jtorres@redfrianal.com", telefono: "3018897711" }
    ]
  },
  { nombre: "Clúster de Abastecimiento Centro", nit: "901560009-7", ciudad: "Ibagué",
    contactos: [ { nombre: "Patricia Gómez", email: "pgomez@clustercentro.co", telefono: "3106601122" } ] },
  { nombre: "Refrigeración Empresarial del Eje", nit: "900881122-0", ciudad: "Pereira",
    contactos: [ { nombre: "Centro Compras", email: "compras@ree.com.co", telefono: "" } ] },
  { nombre: "UltraCold Solutions", nit: "901001777-4", ciudad: "Bogotá",
    contactos: [
      { nombre: "Support Procurement", email: "proc@ultracold.co", telefono: "" },
      { nombre: "Nathalia Ruiz", email: "nruiz@ultracold.co", telefono: "3125509900" }
    ]
  },
  { nombre: "Plataforma Frigorífica Oriente", nit: "900220019-2", ciudad: "Cúcuta",
    contactos: [ { nombre: "Juan Cárdenas", email: "jcardenas@pforiente.com", telefono: "3007719922" } ] },
  { nombre: "Macro Depósitos Refrigerados", nit: "901112334-6", ciudad: "Bogotá",
    contactos: [ { nombre: "Lucía Herrera", email: "lherrera@macrodep.com", telefono: "3106667788" } ] },
  { nombre: "Andes Cold Hub", nit: "901772300-8", ciudad: "Manizales",
    contactos: [ { nombre: "Coordinación Compras", email: "compras@andescoldhub.com", telefono: "" } ] }
];

// Contactos sin empresa (legacy clientes)
export const sampleContactosSinEmpresa = [
  { nombre: "Carlos Ruiz", contacto: "Carlos Ruiz", email: "cruiz.freelance@correo.com", telefono: "3159001122", nit: "", ciudad: "" },
  { nombre: "Mariana Silva", contacto: "Mariana Silva", email: "msilva.indep@correo.com", telefono: "3208810044", nit: "", ciudad: "" },
  { nombre: "Proveedor Turno A", contacto: "Proveedor Turno A", email: "turnoA@turnoslog.com", telefono: "", nit: "", ciudad: "" },
  { nombre: "Luis Herrera", contacto: "Luis Herrera", email: "lherrera.freelance@correo.com", telefono: "3017782200", nit: "", ciudad: "" },
  { nombre: "Mesa Compras Externa", contacto: "Mesa Compras Externa", email: "comprasexterna@soporte.com", telefono: "", nit: "", ciudad: "" }
];
