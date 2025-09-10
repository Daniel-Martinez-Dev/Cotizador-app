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
    descripcionGeneral: 'Propuesta para el suministro de divisiones térmicas fabricadas a la medida, diseñadas para optimizar el aislamiento en vehículos de transporte refrigerado. Permiten transportar productos a diferentes temperaturas y separar cargas para evitar contaminación cruzada.',
    lineaTabla: (p, medidasLinea) => `DIVISIÓN TÉRMICA PARA VEHÍCULO CON MEDIDAS INTERNAS DE ${medidasLinea}`,
    especificacionesHTML: `
      <p>Las divisiones térmicas de <strong>Cold Chain Services</strong> están diseñadas para mejorar la eficiencia térmica en vehículos de transporte refrigerado, garantizando el control de temperatura y la conservación de los productos.</p>
      <ul>
        <li><strong>Aislantes térmicos:</strong> Núcleo en poliuretano, poliestireno extruido y/o polietileno expandido, seleccionados según el nivel de aislamiento requerido.</li>
        <li><strong>Cubierta exterior:</strong> Lona en PVC de 700 gr/m², impermeable, resistente a rayos UV y de fácil limpieza.</li>
        <li><strong>Protección inferior:</strong> Lámina plástica antifricción de 3 mm que protege la base y facilita el desplazamiento de mercancías.</li>
        <li><strong>Sistemas de fijación:</strong> Reatas de nylon tipo militar de alta resistencia y tornillería con tuercas de seguridad.</li>
        <li><strong>Estructura interna:</strong> Materiales de soporte livianos que facilitan la manipulación sin comprometer la resistencia.</li>
      </ul>
      <p><strong>Beneficios:</strong></p>
      <ul>
        <li>Separación efectiva de zonas frías y templadas dentro del vehículo.</li>
        <li>Reducción de pérdida de frío y consumo energético del sistema de refrigeración.</li>
        <li>Prevención de mezcla de olores entre diferentes tipos de carga.</li>
        <li>Diseño ergonómico y de bajo peso para fácil manipulación por parte del operario.</li>
      </ul>`
  },
  'Puertas Rápidas': {
    tipoCalculo: 'matriz',
  requiereMedidas: true,
  extrasKey: 'Puertas Rápidas',
    descripcionGeneral: 'Propuesta para la fabricación e instalación de puertas rápidas enrollables automatizadas para mejorar eficiencia operativa, reducir pérdida energética y facilitar el flujo logístico.',
    lineaTabla: (p, medidasLinea) => `PUERTA RÁPIDA PARA VANO DE${medidasLinea}`,
    especificacionesHTML: `
      <div>
        <h4>Motorización y control</h4>
        <ul>
          <li>Servomotor de <strong>1,5 kW</strong> con control <strong>“American Power”</strong> (o equivalente). Caja de control con <strong>apertura, cierre y paro de emergencia</strong>, instalada al interior de la puerta.</li>
          <li><strong>Freno electrónico</strong> incorporado.</li>
          <li><strong>Encoder digital</strong> para posicionamiento preciso.</li>
          <li><strong>Cierre automático</strong> con temporizador <strong>ajustable</strong>.</li>
          <li>Sistema de control <strong>preajustado y probado en fábrica</strong>; en sitio solo se configuran <strong>sentido de giro</strong> y <strong>finales de carrera</strong>. Motor y encoder con <strong>terminales de seguridad tipo militar</strong>.</li>
        </ul>
        <h4>Estructura y cortina</h4>
        <ul>
          <li><strong>Estructura autoportante</strong> en <strong>acero inoxidable</strong>.</li>
          <li><strong>Cubre-rollo</strong> y <strong>guarda de motor</strong> en acero inoxidable.</li>
          <li><strong>Lona PVC 900 g/m²</strong> color azul, doble cara con resina plástica, que garantiza <strong>impermeabilidad</strong>, <strong>sellabilidad</strong>, <strong>resistencia UV</strong>, <strong>protección biocida</strong> anti-hongos, propiedad <strong>ignífuga</strong> (retarda la propagación del fuego) y <strong>resistencia a agentes químicos</strong>.</li>
          <li><strong>Franja transparente</strong> en PVC <strong>1,5 mm</strong> de espesor x <strong>60 cm</strong> de ancho para visibilidad.</li>
          <li><strong>Cortaviento de aluminio</strong> que une los paños de lona (reparación simple: se reemplaza solo el tramo afectado).</li>
        </ul>
        <h4>Seguridad y operación</h4>
        <ul>
          <li><strong>Cortina óptica (barrera fotoeléctrica)</strong> en un costado para detección de presencia en el paso de la puerta. <em>(Si se requiere en ambos lados, adicionar <strong>$1’100.000 + IVA</strong>.)</em></li>
          <li><strong>Sistema “airbag” en zócalo</strong>: ante impacto en la parte baja, se acciona y restituye la cortina.</li>
          <li><strong>Radar de apertura</strong> en un costado. <em>(Si se requiere en ambos lados, adicionar <strong>$250.000 + IVA</strong>.)</em></li>
          <li><strong>Velocidad de operación ajustable:</strong> <strong>0,6 m/s</strong>.</li>
          <li><strong>Capacidad de servicio:</strong> hasta <strong>2.000 ciclos/día</strong>.</li>
        </ul>
        <h4>Accesorios y opciones</h4>
        <ul>
          <li><strong>Control remoto</strong> para operación (opcional).</li>
          <li><strong>Transformador</strong> de <strong>220 V bifásica a 220 V monofásica</strong> (opcional): <strong>$480.000 + IVA</strong>. Opción con <strong>caja metálica</strong> para almacenamiento: <strong>$580.000 + IVA</strong>.</li>
          <li><strong>UPS 3 kVA</strong> para operación temporal ante fallas de energía (opcional): <strong>$1.400.000 + IVA</strong>.</li>
        </ul>
        <h4>Requisitos eléctricos</h4>
        <ul>
          <li><strong>Alimentación requerida:</strong> <strong>220 V monofásica</strong> (línea de 220 V de sistema 440 V, <strong>neutro</strong> y <strong>tierra</strong>). Si no se dispone de este tipo de energía, se sugiere instalar el <strong>transformador</strong> indicado.</li>
        </ul>
        <h4>Condiciones de garantía</h4>
        <ul>
          <li>La instalación debe cumplir <strong>estrictamente</strong> las condiciones de alimentación descritas. En caso de no cumplirlas al momento de la instalación, <strong>la garantía queda sin efecto</strong> y la puesta en marcha se realiza <strong>bajo exclusiva responsabilidad del cliente</strong>.</li>
        </ul>
      </div>`
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
