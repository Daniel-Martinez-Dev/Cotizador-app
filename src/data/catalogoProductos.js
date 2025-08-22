// Catálogo centralizado de productos
// Permite agregar nuevos productos en un solo lugar (descripción PDF, línea en tabla, etc.)
import { priceMatrices, EXTRAS_POR_DEFECTO, buscarPrecio, buscarPrecioAbrigo, matrizPanamericana, CLIENTE_FACTORES } from './precios';

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
    descripcionGeneral: 'Propuesta para el suministro de divisiones térmicas fabricadas a la medida, diseñadas para control ambiental y logística en vehículos o áreas industriales, utilizando materiales de alta durabilidad y fácil mantenimiento.',
    lineaTabla: (p, medidasLinea) => `DIVISIÓN TÉRMICA PARA VEHÍCULO CON MEDIDAS INTERNAS DE${medidasLinea}`,
    especificacionesHTML: `
      <ul>
        <li><strong>Material:</strong> Cortinas de PVC flexibles de alta resistencia.</li>
        <li><strong>Diseño:</strong> Modular, ajustable a diferentes medidas.</li>
        <li><strong>Instalación:</strong> Fácil montaje con guías superiores y refuerzo lateral.</li>
        <li><strong>Aplicaciones:</strong> Separación de ambientes, control térmico y reducción de partículas.</li>
      </ul>`
  },
  'Puertas Rápidas': {
    tipoCalculo: 'matriz',
  requiereMedidas: true,
  extrasKey: 'Puertas Rápidas',
    descripcionGeneral: 'Propuesta para la fabricación e instalación de puertas rápidas enrollables automatizadas para mejorar eficiencia operativa, reducir pérdida energética y facilitar el flujo logístico.',
    lineaTabla: (p, medidasLinea) => `PUERTA RÁPIDA PARA VANO DE${medidasLinea}`,
    especificacionesHTML: `
        <ul>
          <li><strong>Motor:</strong> Servomotor 0.75 KW con control “American Power”.</li>
          <li><strong>Estructura:</strong> Autoportante en acero inoxidable.</li>
          <li><strong>Lona:</strong> 900 g/m² PVC azul, anti-UV, antifúngica, ignífuga.</li>
          <li><strong>Cortina transparente:</strong> PVC 1.5 mm, 60 cm ancho.</li>
          <li><strong>Ciclos:</strong> Hasta 2000 ciclos/día, velocidad hasta 0.6 m/s.</li>
          <li><strong>Seguridad:</strong> Cortina óptica, airbag inferior, freno electrónico.</li>
          <li><strong>Alimentación:</strong> 220V monofásica estable (requisito de garantía).</li>
        </ul>`
  },
  'Abrigo Retráctil Estándar': {
    tipoCalculo: 'matriz',
  requiereMedidas: true,
  extrasKey: 'Abrigo Retráctil Estándar',
    descripcionGeneral: 'Propuesta para la fabricación de abrigos aislantes retráctiles con bandas de PVC de alta resistencia para muelles de carga, minimizando la pérdida de frío y protegiendo el ambiente interno.',
    lineaTabla: (p, medidasLinea) => `Abrigo Retráctil para muelle de carga${medidasLinea}`,
    especificacionesHTML: `
        <ul>
          <li><strong>Estructura:</strong> Marco de acero con sistema retráctil manual.</li>
          <li><strong>Bandas:</strong> PVC resistente con propiedades térmicas.</li>
          <li><strong>Fijación:</strong> Incluye anclajes y perfiles metálicos.</li>
          <li><strong>Sellado:</strong> Minimiza transferencia térmica en el punto de cargue.</li>
        </ul>`
  },
  'Abrigo Retráctil Inflable': {
    tipoCalculo: 'matriz',
  requiereMedidas: true,
  extrasKey: 'Abrigo Retráctil Inflable',
    descripcionGeneral: 'Propuesta para suministro de abrigo inflable tipo burbuja para zonas de cargue, ofreciendo máxima eficiencia de sellado mediante sistema neumático y lona resistente.',
    lineaTabla: (p, medidasLinea) => `Abrigo Retráctil Inflable para muelle de carga${medidasLinea}`,
    especificacionesHTML: `
        <ul>
          <li><strong>Tipo:</strong> Inflable tipo burbuja.</li>
          <li><strong>Sistema:</strong> Cámaras neumáticas para sellado hermético.</li>
          <li><strong>Material:</strong> Lona PVC alta resistencia, antiflama y UV.</li>
          <li><strong>Extras:</strong> Almohadillas, topes, instalación (opcionales).</li>
        </ul>`
  },
  'Sello de Andén': {
    tipoCalculo: 'componentes',
  requiereMedidas: true,
  extrasKey: 'Sello de Andén',
    descripcionGeneral: 'Propuesta para fabricación de sello de andén compuesto por cortina superior y postes laterales, asegurando sellado térmico y protección en puntos de cargue y descargue.',
    lineaTabla: (p, medidasLinea) => `SELLO DE ANDÉN PARA MUELLE DE${medidasLinea}`,
    especificacionesHTML: `
        <ul>
          <li><strong>Componentes:</strong> Cortina superior, postes laterales, opción travesaño.</li>
          <li><strong>Materiales:</strong> Lona resistente y marco reforzado.</li>
          <li><strong>Medidas:</strong> Según rangos definidos.</li>
          <li><strong>Instalación:</strong> Superficie preparada y nivelada.</li>
        </ul>`,
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
    descripcionGeneral: 'Propuesta para el suministro de sistemas de señalización luminosa (semáforos) para operaciones de cargue y descargue en muelles, mejorando la seguridad operativa y flujo logístico.',
    variantes: [
      { id: 'sencillo', nombre: 'SEMÁFORO SENCILLO PARA MUELLE DE CARGA (UNA CAJA DE CONTROL Y UN SEMÁFORO)', precio: 560000 },
      { id: 'doble', nombre: 'SEMÁFORO DOBLE PARA MUELLE DE CARGA (UNA CAJA DE CONTROL Y DOS SEMÁFOROS)', precio: 850000 },
      { id: 'doble_sensor', nombre: 'SEMÁFORO DOBLE PARA MUELLE DE CARGA CON SENSOR DE MASAS (UNA CAJA DE CONTROL, DOS SEMÁFOROS Y EL SENSOR)', precio: 950000 }
    ],
    lineaTabla: (p) => {
      const v = PRODUCT_CATALOG['Semáforo para Muelles de Carga'].variantes.find(v=> v.id === p.varianteSemaforo) || PRODUCT_CATALOG['Semáforo para Muelles de Carga'].variantes[0];
      return v.nombre;
    },
    especificacionesHTML: `
      <ul>
        <li><strong>Aplicación:</strong> Control visual de ingreso / salida de vehículos en muelles de carga.</li>
        <li><strong>Alimentación:</strong> 110V con caja de control.</li>
        <li><strong>Montaje:</strong> Sobre superficie o estructura metálica (no incluida si no se especifica).</li>
        <li><strong>Indicadores:</strong> Leds de alto brillo rojo/verde, visibles en ambiente industrial.</li>
        <li><strong>Opcional:</strong> Sensor de masas para activación automática (variante con sensor).</li>
  <li><strong>Luces LED bicolor:</strong> Con indicador interno.</li>
  <li><strong>Colores:</strong> Verde y rojo de alta visibilidad.</li>
  <li><strong>Rango de operación eléctrica:</strong> 80–240 VAC amplia tolerancia.</li>
  <li><strong>Caja de control:</strong> Termoplástica con muletilla, grado de protección IP65.</li>
  <li><strong>Ambiente:</strong> Adecuado para trabajo en exteriores (protección contra polvo y salpicaduras).</li>
  <li><strong>Instalación:</strong> Listo para montaje en pared (soportes / anclajes estándar).</li>
      </ul>` ,
    getPrecioBase: (p) => {
      const lista = PRODUCT_CATALOG['Semáforo para Muelles de Carga'].variantes;
      const v = lista.find(v=> v.id === p.varianteSemaforo) || lista[0];
      return { precio: v.precio, fueraDeRango: false };
    }
  },
  'Lámpara Industrial': {
    tipoCalculo: 'especial',
    requiereMedidas: false,
    descripcionGeneral: 'Propuesta para el suministro de lámpara industrial para muelle de carga con reflector LED de 50W, diseñada para brindar iluminación dirigida y segura dentro de vehículos durante operaciones de cargue y descargue.',
    lineaTabla: () => 'LÁMPARA INDUSTRIAL PARA MUELLE DE CARGA',
    especificacionesHTML: `
      <ul>
        <li><strong>Reflector LED:</strong> 50W tipo “tableta”, 2100 lúmenes, 100–240 VAC.</li>
        <li><strong>Estructura:</strong> Brazo ecualizable en tubo de acero cuadrado 1½” cal. 16 con refuerzos en ángulos de 1½” y 1”.</li>
        <li><strong>Operación:</strong> Permite orientar la luz al interior del vehículo de forma ergonómica.</li>
        <li><strong>Mango de sujeción:</strong> Facilita el direccionamiento preciso de la iluminación.</li>
        <li><strong>Seguridad eléctrica:</strong> Polo a tierra para protección del usuario frente a descargas.</li>
        <li><strong>Aplicación:</strong> Iluminación de zona de cargue y espacios internos de camiones.</li>
        <li><strong>Instalación:</strong> Para montaje fijo en pared / estructura (sin instalación ni flete incluidos).</li>
      </ul>` ,
    getPrecioBase: () => ({ precio: 580000, fueraDeRango: false })
  },
  'Canastilla de Seguridad': {
    tipoCalculo: 'especial',
    requiereMedidas: false,
    descripcionGeneral: 'Propuesta para el suministro de CANASTILLA DE SEGURIDAD ESTÁNDAR para montacargas, diseñada para labores de limpieza, mantenimiento y toma de producto en niveles superiores cumpliendo criterios de seguridad estructural.',
    lineaTabla: () => 'CANASTILLA DE SEGURIDAD ESTÁNDAR PARA MONTACARGA',
    especificacionesHTML: `
      <ul>
        <li><strong>Base:</strong> Doble de 1,0 m × 1,2 m en tubo cuadrado/rectangular calibre 16 con guías inferiores en lámina CR calibre 12 para uñas del montacargas.</li>
        <li><strong>Piso:</strong> Lámina tipo alfajor calibre 12 soldada mediante proceso MIG.</li>
        <li><strong>Estructura lateral:</strong> 1,1 m de altura en tubo 1” agua negra con uniones y dobleces soldados (MIG); doble puerta: una con pasador 1/2”, otra tranca hacia el exterior.</li>
        <li><strong>Estructura adicional:</strong> Panel de 2 m en tubo 1” con malla de seguridad para lado contra el montacargas que evita atrapamientos.</li>
        <li><strong>Enganche de seguridad:</strong> Certificado a 1,22 m de altura y 1,02 m de ancho para acople seguro.</li>
        <li><strong>Acabado:</strong> Pintura electrostática color amarillo.</li>
        <li><strong>Certificaciones entregadas:</strong> Ensayos mecánicos del sistema de enganche y punto de anclaje, ficha técnica, certificado de calidad y garantía, placa de identificación con advertencias (norma Res. 4272 de 2021).</li>
        <li><strong>Aplicación:</strong> Operaciones seguras de elevación de personal en tareas de mantenimiento y logística interna.</li>
        <li><strong>Nota comparativa:</strong> Se recomienda verificar diseño, estructura y tipo de enganche contra oferentes alternos (Res. 4272 de 2021).</li>
      </ul>` ,
    getPrecioBase: () => ({ precio: 5410000, fueraDeRango: false })
  },
  'Cortina Thermofilm': {
    tipoCalculo: 'especial',
    requiereMedidas: true,
    descripcionGeneral: 'Propuesta para el suministro e instalación (opcional) de cortina Thermofilm transparente reforzada para control ambiental y separación física, incluyendo refuerzos y elementos de fijación (max bullets) según dimensionamiento.',
    lineaTabla: (p, medidasLinea) => {
      const ancho = p.ancho ? `${p.ancho}mm` : '';
      const alto = p.alto ? `${p.alto}mm` : '';
      return `CORTINA THERMOFILM TRANSPARENTE REFORZADA (${ancho && alto ? `${ancho} ANCHO * ${alto} ALTO` : ''}${ancho && !alto ? ancho : ''}${alto && !ancho ? alto : ''})`;
    },
    especificacionesHTML: `
      <ul>
        <li><strong>Material:</strong> Thermofilm transparente reforzado de 20 cm de ancho por banda y 2 mm de espesor.</li>
        <li><strong>Dimensionamiento:</strong> Se adicionan 10 cm a ancho y alto para cálculo de área y traslapes.</li>
        <li><strong>Fijación:</strong> Uso de max bullet plástico para montaje (60 cm separación).</li>
        <li><strong>Instalación:</strong> Opción con o sin instalación (precio m² variable).</li>
        <li><strong>Aplicación:</strong> Control de temperatura, polvo y paso de partículas en vanos logísticos.</li>
        <li><strong>Opcional:</strong> Transporte / andamio se cotiza como extra personalizado si aplica.</li>
      </ul>` ,
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
  return EXTRAS_POR_DEFECTO[key] || [];
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
  } else {
    if(!ancho || !alto) return { base:0, ajustado:0, fueraDeRango:false };
    const matriz = (matricesOverride && matricesOverride[tipo]) || priceMatrices[tipo];
    if(!matriz) return { base:0, ajustado:0, fueraDeRango:false };
    const r = buscarPrecio(matriz, parseInt(ancho), parseInt(alto));
    base = r.precio||0; fuera = r.fueraDeRango;
    if(!fuera){ base = Math.round(base * (CLIENTE_FACTORES[cliente] || 1)); }
  }
  if(fuera) return { base:0, ajustado:0, fueraDeRango:true };
  let ajustado = aplicarAjuste(base, ajusteTipo, parseFloat(ajusteValor)||0);
  return { base: redondear5000(base), ajustado: redondear5000(ajustado), fueraDeRango:false };
}

// Re-export (opcional) para centralizar importaciones futuras
export { priceMatrices, EXTRAS_POR_DEFECTO };
