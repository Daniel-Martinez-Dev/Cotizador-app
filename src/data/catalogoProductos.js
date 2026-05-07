// Catálogo centralizado de productos
// Permite agregar nuevos productos en un solo lugar (descripción PDF, línea en tabla, etc.)
import { priceMatrices, EXTRAS_POR_DEFECTO, EXTRAS_UNIVERSALES, buscarPrecio, buscarPrecioAbrigo, matrizPanamericana, CLIENTE_FACTORES } from './precios';

// Definición base por etiqueta (coincide con claves existentes en priceMatrices / EXTRAS_POR_DEFECTO)
// Para cada producto se puede definir:
//  descripcionGeneral: texto para la sección "Descripción General" del PDF
//  lineaTabla: (producto, medidasLinea) => string base (sin infoAdicional todavía)
//  tipoCalculo: 'matriz' | 'componentes' | 'especial'
//  especificacionesHTML: HTML (li list) para sección especificaciones
//  getPrecioBase?: función personalizada para cálculo (si no es matriz directa)
//  requiereMedidas: boolean (si necesita ancho/alto para precio)
//  extrasKey?: clave para reutilizar extras de EXTRAS_POR_DEFECTO si difiere del nombre
//  notas: opcional

const PRODUCT_CATALOG = {
  'Divisiones Térmicas': {
    tipoCalculo: 'matriz',
    requiereMedidas: true,
    extrasKey: 'Divisiones Térmicas',
    descripcionGeneral: 'Enviamos para su consideración nuestra propuesta para el suministro de divisiones térmicas fabricadas a la medida, diseñadas para optimizar el aislamiento en vehículos de transporte refrigerado. Permiten transportar productos a diferentes temperaturas y separar cargas para evitar contaminación cruzada.',
    lineaTabla: (p, medidasLinea) => `DIVISIÓN TÉRMICA PARA VEHÍCULO CON MEDIDAS INTERNAS DE ${medidasLinea}`,
    especificacionesHTML: `
      <div>
        <h4>Descripción general</h4>
        <ul>
          <li>Optimiza el aislamiento en vehículos refrigerados para conservar la cadena de frío.</li>
        </ul>
        <h4>Materiales</h4>
        <ul>
          <li><strong>Aislantes:</strong> Núcleo de poliuretano, poliestireno extruido y/o polietileno expandido.</li>
          <li><strong>Cubierta:</strong> Lona PVC 700 g/m² impermeable y lavable, resistente a UV.</li>
          <li><strong>Protección inferior:</strong> Lámina plástica antifricción 3 mm.</li>
          <li><strong>Fijación:</strong> Reatas de nylon de alta resistencia + tornillería con tuercas de seguridad.</li>
          <li><strong>Estructura interna:</strong> Soportes livianos para fácil manipulación sin perder rigidez.</li>
        </ul>
        <h4>Beneficios</h4>
        <ul>
          <li>Segrega zonas frías de zonas templadas.</li>
          <li>Reduce la pérdida de frío y el consumo energético.</li>
          <li>Evita la mezcla de olores entre cargas.</li>
          <li>Diseño liviano y ergonómico para el operario.</li>
        </ul>
      </div>`
  },
  'Puertas Rápidas': {
    tipoCalculo: 'matriz',
  requiereMedidas: true,
  extrasKey: 'Puertas Rápidas',
    descripcionGeneral: 'Enviamos para su consideración nuestra propuesta para la fabricación e instalación de puertas rápidas enrollables automatizadas para mejorar la eficiencia operativa, reducir la pérdida energética y facilitar el flujo logístico.',
    lineaTabla: (p, medidasLinea) => `PUERTA RÁPIDA PARA VANO DE${medidasLinea}`,
    especificacionesHTML: `
      <div>
        <h4>Motorización y control</h4>
        <ul>
          <li>Servomotor de 0.75 kW con control “American Power” (o equivalente). Caja de control con apertura, cierre y paro de emergencia, instalada al interior de la puerta.</li>
          <li>Freno electrónico incorporado, encoder digital para posicionamiento preciso y cierre automático con temporizador ajustable.</li>
          <li>Sistema de control preajustado y probado en fábrica; en sitio solo se configuran sentido de giro y finales de carrera. Motor y encoder con terminales de seguridad tipo militar.</li>
          <li>Capacidad de servicio: hasta 2.000 ciclos/día.</li>
        </ul>
        <h4>Estructura y cortina</h4>
        <ul>
          <li>Estructura autoportante, cubre-rollo y guarda de motor en acero inoxidable.</li>
          <li>Lona PVC 900 g/m² color azul, doble cara con resina plástica, que garantiza impermeabilidad, sellabilidad, resistencia UV, protección biocida anti-hongos, propiedad ignífuga (retarda la propagación del fuego) y resistencia a agentes químicos.</li>
          <li>Franja transparente en PVC 1,5 mm de espesor × 60 cm de ancho para visibilidad.</li>
          <li>Cortavientos y zócalo de aluminio 6063 (reparación simple: se reemplaza solo el tramo afectado).</li>
        </ul>
        <h4>Seguridad y operación</h4>
        <ul>
          <li>Cortina óptica (barrera fotoeléctrica) en un costado para detección de presencia en el paso de la puerta. (Si se requiere en ambos lados, adicionar $1’100.000 + IVA.)</li>
          <li>Sistema “airbag” en el zócalo: ante impacto en la parte inferior, se acciona y restituye la cortina.</li>
        </ul>
        <h4>Accesorios y opciones</h4>
        <ul>
          <li>Radar de apertura en un costado. (Si se requiere en ambos lados, adicionar $250.000 + IVA.)</li>
          <li>Control remoto para operación (opcional).</li>
          <li>Transformador de 220 V bifásica a 220 V monofásica (opcional): $480.000 + IVA. Opción con caja metálica para almacenamiento: $580.000 + IVA.</li>
          <li>UPS 3 kVA para operación temporal ante fallas de energía (opcional): $1.400.000 + IVA.</li>
        </ul>
        <h4>Requisitos eléctricos</h4>
        <ul>
          <li>Alimentación requerida: 220 V monofásica (línea de 220 V de sistema 440 V, neutro y tierra). Si no se dispone de este tipo de energía, se sugiere instalar el transformador indicado.</li>
        </ul>
        <h4>Condiciones de garantía</h4>
        <ul>
          <li>La instalación debe cumplir estrictamente las condiciones de alimentación descritas. En caso de no cumplirlas al momento de la instalación, la garantía queda sin efecto y la puesta en marcha se realiza bajo exclusiva responsabilidad del cliente.</li>
        </ul>
      </div>`
  },
  'Puertas Seccionales': {
    tipoCalculo: 'matriz',
    requiereMedidas: true,
    extrasKey: 'Puertas Seccionales',
    factorBaseCliente: 'Cliente Final Contado',
    descripcionGeneral: 'Enviamos para su consideración nuestra propuesta para la venta e instalación de puertas seccionales automatizadas, fabricadas con paneles tipo sándwich con aislamiento de poliuretano, ideales para accesos industriales y de bodegas.',
    lineaTabla: (p, medidasLinea) => `PUERTA SECCIONAL${medidasLinea}`,
    especificacionesHTML: `
      <div>
        <h4>Elementos incluidos</h4>
        <ul>
          <li>Panel tipo sándwich de 4 cm en acero galvanizado con aislamiento de poliuretano.</li>
          <li>Ventana de polipropileno en uno de los paneles.</li>
          <li>Sistema de rieles.</li>
          <li>Freno de seguridad de guayas.</li>
          <li>Ménsula paracaídas.</li>
          <li>Sistema de bolsa de aire para retroceso de la puerta ante golpes en la parte inferior.</li>
          <li>Motor con 7 metros de cadena.</li>
          <li>Caja de control.</li>
          <li>Control remoto opcional sin costo adicional.</li>
          <li>Sistema de herrajes para un correcto funcionamiento de la puerta; contiene bisagras, tornillería, rodachinas, entre otros.</li>
        </ul>
      </div>`
  },
  'Abrigo Retráctil Estándar': {
    tipoCalculo: 'matriz',
  requiereMedidas: true,
  extrasKey: 'Abrigo Retráctil Estándar',
    descripcionGeneral: 'Enviamos para su consideración nuestra propuesta para la fabricación de abrigos aislantes retráctiles con bandas de PVC de alta resistencia para muelles de carga, minimizando la pérdida de frío y protegiendo el ambiente interno.',
    lineaTabla: (p, medidasLinea) => `ABRIGO RETRÁCTIL PARA MUELLE DE CARGA${medidasLinea}`,
    especificacionesHTML: `
      <div>
        <h4>Materiales</h4>
        <ul>
          <li>Estructura metálica elaborada con tubería de 2×1" calibre 16 unida con soldadura MIG y protegida de la intemperie con pintura electrostática.</li>
          <li>Travesaños elaborados en tubería de 1¼" calibre 16 protegidos de la intemperie con pintura electrostática.</li>
          <li>Cortinas laterales en banda de PVC de 3 mm.</li>
          <li>Cortina superior en banda de PVC de 3 mm.</li>
          <li>Sistema retráctil para evitar daños en la estructura por golpes de los vehículos, el cual se logra mediante un marco fijo y uno suspendido sujeto por la lona y los travesaños.</li>
          <li>Soportes y refuerzos elaborados en acero Cold Rolled protegido de la intemperie mediante pintura electrostática.</li>
          <li>Elementos de anclaje y sujeción galvanizados que ayudan a proteger contra la corrosión.</li>
          <li>Ángulos en acero galvanizado que ayudan a sujetar la lona a la estructura y dan mejor presentación al abrigo.</li>
        </ul>
      </div>`
  },
  'Abrigo Retráctil Inflable': {
    tipoCalculo: 'matriz',
  requiereMedidas: true,
  extrasKey: 'Abrigo Retráctil Inflable',
    descripcionGeneral: 'Enviamos para su consideración nuestra propuesta para el suministro de abrigo inflable tipo burbuja para zonas de cargue, ofreciendo máxima eficiencia de sellado mediante sistema neumático y lona resistente.',
    lineaTabla: (p, medidasLinea) => `ABRIGO RETRÁCTIL INFLABLE PARA MUELLE DE CARGA${medidasLinea}`,
    especificacionesHTML: `
      <div>
        <h4>Materiales</h4>
        <ul>
          <li>Estructura metálica elaborada con tubería de 2×1" calibre 16 unida con soldadura MIG y protegida de la intemperie mediante pintura electrostática.</li>
          <li>Travesaños elaborados en tubería de 1¼" calibre 16 protegidos de la intemperie mediante pintura electrostática.</li>
          <li>Cortinas frontales laterales con banda 3 mm elaborada en PVC reforzada con doble malla de fibra de poliéster, 40 cm de ancho.</li>
          <li>Cortina frontal superior con lona 3 mm elaborada en PVC reforzada con doble malla de fibra de poliéster, 60 cm de ancho.</li>
          <li>Sistema retráctil para evitar daños en la estructura por golpes de los vehículos, el cual se logra mediante un marco fijo y uno suspendido sujeto por la lona y los travesaños.</li>
          <li>Soportes y refuerzos elaborados en acero Cold Rolled protegido de la intemperie mediante pintura electrostática.</li>
          <li>Elementos de anclaje y sujeción galvanizados que ayudan a proteger contra la corrosión.</li>
          <li>Ángulos en acero galvanizado que ayudan a sujetar la banda a la estructura y dan mejor presentación al abrigo, protegidos de la intemperie con pintura electrostática.</li>
          <li>Ventilador centrífugo de 680 W a 3600 RPM con su respectivo arrancador.</li>
          <li>Cortinas inflables laterales y superior elaboradas en lona PVC 700 g/m² de trama cerrada, que brinda mayor resistencia al rasgado. La cortina superior al inflarse se proyecta 110 cm y las laterales 80 cm.</li>
        </ul>
      </div>`
  },
  'Sello de Andén': {
    tipoCalculo: 'componentes',
  requiereMedidas: true,
  extrasKey: 'Sello de Andén',
    descripcionGeneral: 'Enviamos para su consideración nuestra propuesta para la fabricación de sello de andén compuesto por cortina superior y postes laterales, asegurando sellado térmico y protección en puntos de cargue y descargue.',
    lineaTabla: (p, medidasLinea) => `SELLO DE ANDÉN PARA MUELLE DE${medidasLinea}`,
    especificacionesHTML: `
      <div>
        <h4>Materiales y construcción</h4>
        <ul>
          <li>Recubrimiento en lona PVC de 700 g/m² con mayor resistencia al rasgado gracias a su mayor número de hilos por centímetro cuadrado. Para la confección del sello, la lona es unida por medio de ultra frecuencia con un traslape del 50%, lo que garantiza mayor duración y resistencia al desgarre respecto a otros métodos de unión (costura).</li>
          <li>Espuma densidad 23 (de 25 cm de ancho), que brinda el soporte necesario para garantizar el sellado contra el vehículo y permite una fácil recuperación de la forma original del sello una vez el vehículo es retirado del muelle.</li>
          <li>Velcro y demás elementos de confección de primera calidad, que brindan estabilidad a través del tiempo evitando el deterioro prematuro del sello.</li>
          <li>Cortina en lona PVC de 700 g/m² con caída de 80 cm.</li>
          <li>Base en madera.</li>
        </ul>
        <p>El diseño y confección de nuestros sellos permite separar fácilmente la superficie de contacto con los vehículos, facilitando las labores de mantenimiento y limpieza sin necesidad de desmontar el sello del muelle de carga. Se disponen hasta 5 capas de lona que protegen la espuma de daños ocasionados por vehículos con partes cortantes. La lona y espuma utilizadas permiten el uso en diferentes condiciones de temperatura sin que se afecte su desempeño.</p>
      </div>`,
    getPrecioBase: (p)=>{ // cálculo por componentes
      const {ancho, alto, componentes=[]} = p;
      if(!ancho || !alto) return { precio:null, fueraDeRango:false };
      const matriz = priceMatrices['Sello de Andén'];
      const ranges = matriz.medidaRanges;
      // Reutilizar lógica simple
      let total=0; if(componentes.includes('sello completo')) total=matriz.base.completos[1]||0; else { if(componentes.includes('cortina')) total+=matriz.base.cortina[1]||0; if(componentes.includes('postes laterales')) total+=matriz.base.postes[1]||0; if(componentes.includes('travesaño')) total+=matriz.base.travesano[1]||0; }
      return { precio: total, fueraDeRango:false };
    }
  },
  'Semáforo para Muelles de Carga': {
    tipoCalculo: 'especial',
    requiereMedidas: false,
    descripcionGeneral: 'Enviamos para su consideración nuestra propuesta para el suministro de sistemas de señalización luminosa (semáforos) para operaciones de cargue y descargue en muelles, mejorando la seguridad operativa y el flujo logístico.',
    variantes: [
      { id: 'sencillo', nombre: 'SEMÁFORO SENCILLO PARA MUELLE DE CARGA (UNA CAJA DE CONTROL Y UN SEMÁFORO)', precio: 570000 },
      { id: 'doble', nombre: 'SEMÁFORO DOBLE PARA MUELLE DE CARGA (UNA CAJA DE CONTROL Y DOS SEMÁFOROS)', precio: 870000 },
      { id: 'doble_sensor', nombre: 'SEMÁFORO DOBLE PARA MUELLE DE CARGA CON SENSOR DE MASAS (UNA CAJA DE CONTROL, DOS SEMÁFOROS Y EL SENSOR)', precio: 970000 }
    ],
    lineaTabla: (p) => {
      const v = PRODUCT_CATALOG['Semáforo para Muelles de Carga'].variantes.find(v=> v.id === p.varianteSemaforo) || PRODUCT_CATALOG['Semáforo para Muelles de Carga'].variantes[0];
      return v.nombre;
    },
    especificacionesHTML: `
      <div>
        <h4>Aplicación y operación</h4>
        <ul>
          <li>Control visual de ingreso / salida de vehículos.</li>
          <li>Indicadores LED rojo/verde de alto brillo.</li>
          <li>Variante con sensor de masas (opcional).</li>
        </ul>
        <h4>Características eléctricas</h4>
        <ul>
          <li><strong>Alimentación:</strong> 80–240 VAC (caja de control 110V).</li>
          <li><strong>Caja de control:</strong> Termoplástica IP65 con muletilla.</li>
        </ul>
        <h4>Instalación</h4>
        <ul>
          <li>Montaje en pared o estructura metálica.</li>
          <li>Listo para fijación con anclajes estándar.</li>
        </ul>
        <h4>Ambiente</h4>
        <ul>
          <li>Apto para exteriores: protección contra polvo y salpicaduras.</li>
        </ul>
      </div>` ,
    getPrecioBase: (p) => {
      const lista = PRODUCT_CATALOG['Semáforo para Muelles de Carga'].variantes;
      const v = lista.find(v=> v.id === p.varianteSemaforo) || lista[0];
      return { precio: v.precio, fueraDeRango: false };
    }
  },
  'Lámpara Industrial': {
    tipoCalculo: 'especial',
    requiereMedidas: false,
    descripcionGeneral: 'Enviamos para su consideración nuestra propuesta para el suministro de una lámpara industrial para muelle de carga con reflector LED de 50 W, diseñada para brindar iluminación dirigida y segura dentro de vehículos durante operaciones de cargue y descargue.',
    lineaTabla: () => 'LÁMPARA INDUSTRIAL PARA MUELLE DE CARGA',
    especificacionesHTML: `
      <div>
        <h4>Componentes</h4>
        <ul>
          <li><strong>Reflector LED:</strong> 50 W (≈2.100 lm), 100–240 VAC.</li>
          <li><strong>Brazo articulado:</strong> Acero cuadrado 1½” cal.16 con refuerzos.</li>
          <li><strong>Mango:</strong> Para orientación ergonómica hacia el interior del vehículo.</li>
        </ul>
        <h4>Seguridad</h4>
        <ul>
          <li>Polo a tierra para protección del usuario.</li>
        </ul>
        <h4>Aplicación</h4>
        <ul>
          <li>Iluminación durante operaciones de cargue en zonas internas de camiones.</li>
        </ul>
        <h4>Instalación</h4>
        <ul>
          <li>Montaje fijo en pared / estructura (sin instalación ni flete).</li>
        </ul>
      </div>` ,
    getPrecioBase: () => ({ precio: 590000, fueraDeRango: false })
  },
  'Canastilla de Seguridad': {
    tipoCalculo: 'especial',
    requiereMedidas: false,
    descripcionGeneral: 'Enviamos para su consideración nuestra propuesta para el suministro de canastilla de seguridad estándar para montacargas, diseñada para labores de limpieza, mantenimiento y toma de producto en niveles superiores, bajo criterios de seguridad estructural.',
    lineaTabla: () => 'CANASTILLA DE SEGURIDAD ESTÁNDAR PARA MONTACARGA',
    especificacionesHTML: `
      <div>
        <h4>Estructura</h4>
        <ul>
          <li><strong>Base:</strong> 1,0 × 1,2 m tubo cuadrado/rectangular cal.16 con guías CR cal.12.</li>
          <li><strong>Piso:</strong> Lámina tipo alfajor cal.12 soldada MIG.</li>
          <li><strong>Lateral:</strong> 1,1 m altura tubo 1” con doble puerta (pasador 1/2” + tranca externa).</li>
          <li><strong>Panel posterior:</strong> 2 m tubo 1” con malla de seguridad.</li>
        </ul>
        <h4>Seguridad y acabado</h4>
        <ul>
          <li><strong>Enganche:</strong> Certificado (1,22 m alto × 1,02 m ancho).</li>
          <li><strong>Acabado:</strong> Pintura electrostática amarilla.</li>
          <li><strong>Certificaciones:</strong> Ensayos mecánicos, ficha técnica, certificado de calidad, placa normativa (Res. 4272/2021).</li>
        </ul>
        <h4>Aplicación</h4>
        <ul>
          <li>Elevación segura de personal para mantenimiento y logística interna.</li>
          <li>Diseño verificable con la normativa vigente (Res. 4272/2021).</li>
        </ul>
      </div>` ,
    getPrecioBase: () => ({ precio: 5410000, fueraDeRango: false })
  },
  'Cortina Thermofilm': {
    tipoCalculo: 'especial',
    requiereMedidas: true,
    descripcionGeneral: 'Enviamos para su consideración nuestra propuesta para el suministro e instalación (opcional) de cortina Thermofilm transparente reforzada para control ambiental y separación física, incluyendo abrazaderas y elementos de fijación según dimensionamiento.',
    lineaTabla: (p, medidasLinea) => {
      const ancho = p.ancho ? `${p.ancho}mm` : '';
      const alto = p.alto ? `${p.alto}mm` : '';
      return `CORTINA THERMOFILM TRANSPARENTE REFORZADA (${ancho && alto ? `${ancho} ANCHO * ${alto} ALTO` : ''}${ancho && !alto ? ancho : ''}${alto && !ancho ? alto : ''})`;
    },
    especificacionesHTML: `
      <div>
        <h4>Material y diseño</h4>
        <ul>
          <li>Bandas de Thermofilm transparente reforzado, 20 cm de ancho × 2 mm de espesor.</li>
          <li>Incluye traslapes de 10 cm en ancho y alto.</li>
        </ul>
        <h4>Montaje</h4>
        <ul>
          <li>Abrazadera plástica cada 60 cm aproximadamente.</li>
          <li>Opción con o sin instalación (precio $/m² variable).</li>
        </ul>
        <h4>Aplicación</h4>
        <ul>
          <li>Control de temperatura, polvo y partículas en vanos logísticos.</li>
        </ul>
        <h4>Extras</h4>
        <ul>
          <li>Transporte y/o andamio disponibles como extra adicional según aplique.</li>
        </ul>
      </div>` ,
    getPrecioBase: (p) => {
      const { ancho, alto, conInstalacion } = p;
      if(!ancho || !alto) return { precio:null, fueraDeRango:false };
      const anchoM = parseFloat(ancho)/1000;
      const altoM = parseFloat(alto)/1000;
      if(isNaN(anchoM)||isNaN(altoM)) return { precio:null, fueraDeRango:false };
      const area = (anchoM + 0.10) * (altoM + 0.10); // m2 compensada
      const precioM2 = conInstalacion ? 180000 : 175000;
      const film = area * precioM2;
      // Film únicamente; bullets se tratarán como extra automático externo
      return { precio: film, fueraDeRango:false };
    }
  }
};

export const PRODUCTOS_ACTIVOS = Object.keys(PRODUCT_CATALOG);

export function getDescripcionGeneral(etiqueta){
  return PRODUCT_CATALOG[etiqueta]?.descripcionGeneral || '';
}

export function getLineaTabla(producto, medidasLinea){
  const etiqueta = producto?.tipo;
  if (PRODUCT_CATALOG[etiqueta]?.lineaTabla) return PRODUCT_CATALOG[etiqueta].lineaTabla(producto, medidasLinea);
  // Personalizados / Repuestos
  if(etiqueta === 'Productos Personalizados' || etiqueta === 'Repuestos'){
    return `${producto.nombrePersonalizado || etiqueta}${medidasLinea}`;
  }
  return `${etiqueta || 'Producto'}${medidasLinea}`;
}

// Punto de extensión futuro: getPrecio(producto) -> permitir precios especiales sin tocar otras capas.
export function getConfigProducto(etiqueta){
  return PRODUCT_CATALOG[etiqueta] || null;
}

export function getEspecificacionesHTML(etiqueta){
  return PRODUCT_CATALOG[etiqueta]?.especificacionesHTML || `<p>No se han definido especificaciones técnicas para este producto.</p>`;
}

// ===== EXTRAS CENTRALIZADOS =====
export function getExtrasPorTipo(etiqueta, extrasOverride){
  const cfg = getConfigProducto(etiqueta);
  const key = cfg?.extrasKey || etiqueta;
  if(extrasOverride && extrasOverride[etiqueta]) return extrasOverride[etiqueta];
  const propios = EXTRAS_POR_DEFECTO[key] || [];
  // Combinar extras propios con universales (evitar duplicados por nombre)
  const byName = new Map();
  [...propios, ...EXTRAS_UNIVERSALES].forEach(e => { if(e && e.nombre) byName.set(e.nombre.toLowerCase(), e); });
  return Array.from(byName.values());
}

// ===== VALIDACIÓN MEDIDAS / RANGO =====
function estaFueraDeRangoMatriz(matriz, ancho, alto, usarAbrigo){
  if(!matriz) return true;
  const a = parseInt(ancho), h = parseInt(alto);
  if(isNaN(a)||isNaN(h)) return true;
  if(usarAbrigo){
    const r = buscarPrecioAbrigo(matriz, a, h); return r.fueraDeRango;
  }
  const r = buscarPrecio(matriz, a, h); return r.fueraDeRango;
}

export function validarRangoProducto(producto, { matricesOverride } = {}){
  const { tipo, ancho, alto, cliente } = producto;
  const cfg = getConfigProducto(tipo);
  if(!cfg?.requiereMedidas) return false;
  if(!ancho || !alto) return false;
  if(tipo==='Divisiones Térmicas' && cliente==='Carrocerías Panamericana'){
    const r = buscarPrecio(matrizPanamericana, parseInt(ancho), parseInt(alto)); return r.fueraDeRango;
  }
  if(tipo==='Sello de Andén') return false; // componentes fijos
  if(tipo==='Abrigo Retráctil Estándar'){
    const matriz = (matricesOverride && matricesOverride[tipo]) || priceMatrices[tipo];
    return estaFueraDeRangoMatriz(matriz, ancho, alto, true);
  }
  const matriz = (matricesOverride && matricesOverride[tipo]) || priceMatrices[tipo];
  return estaFueraDeRangoMatriz(matriz, ancho, alto, false);
}

// ===== CÁLCULO CENTRALIZADO DE PRECIOS =====
const redondear5000 = v => Math.round(v / 5000) * 5000;
const aplicarAjuste = (v, tipo, p) => {
  if (!p || p === 0) return v;
  if (tipo === 'Descuento') return Math.round(v * (1 - p / 100));
  if (tipo === 'Incremento') return Math.round(v * (1 + p / 100));
  return v;
};

export function getPrecioProducto(producto, { matricesOverride } = {}){
  const { tipo, ancho, alto, cliente, ajusteTipo, ajusteValor } = producto;
  const cfg = getConfigProducto(tipo);
  let base=0; let fuera=false;

  const getFactorCliente = () => {
    const factor = CLIENTE_FACTORES[cliente] || 1;
    const baselineKey = cfg?.factorBaseCliente;
    if (!baselineKey) return factor;
    const baseline = CLIENTE_FACTORES[baselineKey] || 1;
    if (!baseline) return factor;
    return factor / baseline;
  };
  // Productos con función personalizada (componentes o especial / fijos)
  if(cfg?.getPrecioBase){
    // Si requiere medidas pero faltan, retornar vacío
    if(cfg.requiereMedidas && (!ancho || !alto)) return { base:0, ajustado:0, fueraDeRango:false };
    const r = cfg.getPrecioBase(producto);
    base = r.precio||0; fuera = r.fueraDeRango;
  } else if(tipo==='Divisiones Térmicas' && cliente==='Carrocerías Panamericana'){
    const r = buscarPrecio(matrizPanamericana, parseInt(ancho), parseInt(alto));
    base = r.precio||0; fuera = r.fueraDeRango;
  } else if(tipo==='Abrigo Retráctil Estándar'){
    const matriz = (matricesOverride && matricesOverride[tipo]) || priceMatrices[tipo];
    const r = buscarPrecioAbrigo(matriz, parseInt(ancho), parseInt(alto));
    base = r.precio||0; fuera = r.fueraDeRango;
    if(!fuera){ base = Math.round(base * getFactorCliente()); }
  } else if(tipo==='Abrigo Retráctil Inflable'){
    // Para abrigos retráctiles (inflable), el precio no varía por tipo de cliente
    const matriz = (matricesOverride && matricesOverride[tipo]) || priceMatrices[tipo];
    const r = buscarPrecioAbrigo(matriz, parseInt(ancho), parseInt(alto));
    base = r.precio||0; fuera = r.fueraDeRango;
    if(!fuera){ base = Math.round(base * getFactorCliente()); }
  } else {
    if(!ancho || !alto) return { base:0, ajustado:0, fueraDeRango:false };
    const matriz = (matricesOverride && matricesOverride[tipo]) || priceMatrices[tipo];
    if(!matriz) return { base:0, ajustado:0, fueraDeRango:false };
    const r = buscarPrecio(matriz, parseInt(ancho), parseInt(alto));
    base = r.precio||0; fuera = r.fueraDeRango;
    if(!fuera){ base = Math.round(base * getFactorCliente()); }
  }
  if(fuera) return { base:0, ajustado:0, fueraDeRango:true };
  let ajustado = aplicarAjuste(base, ajusteTipo, parseFloat(ajusteValor)||0);
  return { base: redondear5000(base), ajustado: redondear5000(ajustado), fueraDeRango:false };
}

// Re-export (opcional) para centralizar importaciones futuras
export { priceMatrices, EXTRAS_POR_DEFECTO };
