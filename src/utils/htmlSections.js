// src/utils/htmlSections.js

import { formatearPesos } from "./formatos";
import { EXTRAS_POR_DEFECTO } from "../data/precios";

export function generarSeccionesHTML(cotizacion) {
  const descripcionHTML = generarDescripcion(cotizacion);
  const especificacionesHTML = generarEspecificaciones(cotizacion);

  // Inserta salto de página antes de la tabla
  const tablaHTML = `
    <div style="page-break-before: always;"></div>
    ${generarTablaPrecios(cotizacion)}
  `;

  const condicionesHTML = generarCondicionesComerciales(cotizacion);

  // Inserta salto de página antes de los términos generales
  const terminosHTML = `
    <div style="page-break-before: always;"></div>
    ${generarTerminosGenerales(cotizacion)}
  `;

  return {
    descripcionHTML,
    especificacionesHTML,
    tablaHTML,
    condicionesHTML,
    terminosHTML,
  };
}

function generarDescripcion(cot) {
  switch (cot.productos[0].tipo) {
    case "Divisiones Térmicas":
      return `<p>Propuesta para el suministro de divisiones térmicas fabricadas a la medida, diseñadas para control ambiental en áreas industriales. Fabricadas con materiales de alta calidad que garantizan durabilidad, fácil mantenimiento y eficiencia en el aislamiento térmico.</p>`;
    case "Puertas Rápidas":
      return `<p>Propuesta para la fabricación e instalación de puertas rápidas enrollables automatizadas, para mejorar la eficiencia operativa, reducir pérdida energética y facilitar el flujo logístico en áreas de alto tránsito.</p>`;
    case "Abrigo Retráctil Estándar":
      return `<p>Propuesta para la fabricación de abrigos aislantes con sistema retráctil y bandas de PVC de alta resistencia para muelles de carga, con el fin de minimizar pérdida de frío y proteger el ambiente interno.</p>`;
    case "Abrigo Retráctil Inflable":
      return `<p>Propuesta para suministro de abrigo inflable tipo burbuja para zonas de cargue, que ofrece máxima eficiencia de sellado mediante sistema neumático y lona resistente a condiciones extremas.</p>`;
    case "Sello de Andén":
      return `<p>Propuesta para fabricación de sello de andén, compuesto por cortina superior y postes laterales, que aseguran sellado térmico y protección en los puntos de cargue y descargue.</p>`;
    default:
      return "";
  }
}

function generarEspecificaciones(cot) {
  switch (cot.productos[0]?.tipo) {
    case "Puertas Rápidas":
      return `
        <ul>
          <li><strong>Motor:</strong> Servomotor 0.75 KW con control “American Power” y caja con sistema de apertura, cierre y parada de emergencia instalada internamente.</li>
          <li><strong>Estructura:</strong> Autoportante en acero inoxidable.</li>
          <li><strong>Lona:</strong> 900 g/m² en color azul, recubierta en PVC por ambas caras, impermeable, sellable, anti-UV, antifúngica, ignífuga y resistente a químicos.</li>
          <li><strong>Cortina:</strong> Transparente de PVC, 1.5 mm de espesor, 60 cm de ancho.</li>
          <li><strong>Cierre automático:</strong> Temporizador ajustable, hasta 2000 ciclos/día, velocidad ajustable de 0.6 m/s.</li>
          <li><strong>Seguridad:</strong> Cortina óptica, airbag inferior, freno electrónico, encoder digital, radar y control remoto opcional.</li>
          <li><strong>Fuente:</strong> 220V monofásica, transformador opcional si no está disponible. El incumplimiento de esta condición invalida la garantía.</li>
        </ul>`;

    case "Sello de Andén":
      return `
        <ul>
          <li><strong>Componentes:</strong> Cortina superior, postes laterales, opción de travesaño horizontal.</li>
          <li><strong>Materiales:</strong> Lona resistente, marco estructural reforzado.</li>
          <li><strong>Medidas:</strong> Según rangos preestablecidos (ancho y alto).</li>
          <li><strong>Instalación:</strong> Puede incluirse, se requiere superficie preparada.</li>
          <li><strong>Adicionales:</strong> Topes en caucho opcionales, disponibles por par.</li>
        </ul>`;

    case "Abrigo Retráctil Estándar":
      return `
        <ul>
          <li><strong>Estructura:</strong> Marco de acero con sistema retráctil manual de fácil operación.</li>
          <li><strong>Bandas:</strong> PVC resistente con propiedades térmicas y antiviento.</li>
          <li><strong>Fijación:</strong> Incluye anclajes y perfiles metálicos de soporte.</li>
          <li><strong>Sellado:</strong> Cobertura frontal para evitar ingreso de calor o humedad en el punto de cargue.</li>
        </ul>`;

    case "Abrigo Retráctil Inflable":
      return `
        <ul>
          <li><strong>Tipo:</strong> Inflable tipo burbuja, 3400 x 3400 mm.</li>
          <li><strong>Funcionamiento:</strong> Sistema neumático que infla las cámaras laterales para sellado hermético del andén.</li>
          <li><strong>Material:</strong> Lona en PVC de alta resistencia con recubrimiento antiflama y protección UV.</li>
          <li><strong>Extras:</strong> Opción de almohadillas, topes en caucho y servicio de instalación en Bogotá.</li>
        </ul>`;

    case "Divisiones Térmicas":
      return `
        <ul>
          <li><strong>Material:</strong> Cortinas de PVC flexibles de alta resistencia.</li>
          <li><strong>Diseño:</strong> Modular, ajustable a diferentes medidas.</li>
          <li><strong>Instalación:</strong> Fácil montaje con guías superiores y refuerzo lateral.</li>
          <li><strong>Aplicaciones:</strong> Separación de ambientes, control térmico y reducción de partículas.</li>
        </ul>`;

    default:
      return `<p>No se han definido especificaciones técnicas para este producto.</p>`;
  }
}

function generarTablaPrecios(cot) {
  let html = `
    <table style="width:100%; border-collapse: collapse; font-size: 13px;">
      <thead>
        <tr style="background-color: #1a3357; color: white;">
          <th style="border: 1px solid #ccc; padding: 10px; text-align:left;">Producto</th>
          <th style="border: 1px solid #ccc; padding: 10px; text-align:center;">Cantidad</th>
          <th style="border: 1px solid #ccc; padding: 10px; text-align:right;">Precio Unitario</th>
          <th style="border: 1px solid #ccc; padding: 10px; text-align:right;">Subtotal</th>
        </tr>
      </thead>
      <tbody>
  `;

  cot.productos.forEach((prod) => {
    const cantidad = parseInt(prod.cantidad) || 1;
    const precio = prod.precioUnitario || prod.precioCalculado || prod.precioEditado || prod.precioManual || 0;
    const subtotal = cantidad * precio;

    // Descripción detallada solicitada por tipo con salto de línea antes de las medidas
    const ancho = prod.ancho || prod.ancho_vano || "-";
    const alto = prod.alto || prod.alto_vano || "-";
    let descripcionProducto = "";
    const medidasLinea = `<br />${ancho}mm ancho * ${alto}mm alto.`; // siempre en segunda línea
    switch (prod.tipo) {
      case "Puertas Rápidas":
        descripcionProducto = `Puerta Rápida Enrrollable${medidasLinea}`;
        break;
      case "Divisiones Térmicas":
        descripcionProducto = `División Térmica o Mampara para vehículo${medidasLinea}`;
        break;
      case "Abrigo Retráctil Estándar":
        descripcionProducto = `Abrigo Retráctil para muelle de carga${medidasLinea}`;
        break;
      case "Abrigo Retráctil Inflable":
        descripcionProducto = `Abrigo Retráctil Inflable para muelle de carga${medidasLinea}`;
        break;
      case "Sello de Andén":
        descripcionProducto = `Sello de Andén para muelle de carga${medidasLinea}`;
        break;
      default:
        descripcionProducto = `${(prod.tipo === "Productos Personalizados" || prod.tipo === "Repuestos") ? (prod.nombrePersonalizado || prod.tipo) : prod.tipo}${medidasLinea}`;
    }

    html += `
      <tr style="font-weight: bold;">
        <td style="border: 1px solid #ccc; padding: 8px;">${descripcionProducto}</td>
        <td style="border: 1px solid #ccc; padding: 8px; text-align:center;">${cantidad}</td>
        <td style="border: 1px solid #ccc; padding: 8px; text-align:right;">${formatearPesos(precio)}</td>
        <td style="border: 1px solid #ccc; padding: 8px; text-align:right;">${formatearPesos(subtotal)}</td>
      </tr>
    `;

    // === Mostrar solo si es un DESCUENTO ===
    if (prod.ajuste && prod.ajuste.tipo === "Descuento") {
      const porcentaje = parseFloat(prod.ajuste.porcentaje) || 0;
      const valorDescuento = subtotal * (porcentaje / 100);

      html += `
        <tr style="background-color:#fff4f4; color: #c00;">
          <td colspan="3" style="border: 1px solid #ccc; padding: 8px; text-align:right;">- Descuento del ${porcentaje}%</td>
          <td style="border: 1px solid #ccc; padding: 8px; text-align:right;">- ${formatearPesos(valorDescuento)}</td>
        </tr>
      `;
    }

    // === Extras por defecto ===
    const listaExtras = EXTRAS_POR_DEFECTO[prod.tipo] || [];
    if (Array.isArray(prod.extras)) {
      prod.extras.forEach((nombreExtra) => {
        const encontrado = listaExtras.find((e) => e.nombre === nombreExtra);
        if (encontrado) {
          const cantidadExtra = parseInt(prod.extrasCantidades?.[nombreExtra]) || 1;
          let precioExtra = 0;
          if (encontrado.precioDistribuidor != null && encontrado.precioCliente != null) {
            precioExtra = cot.cliente === "Distribuidor" ? encontrado.precioDistribuidor : encontrado.precioCliente;
          } else {
            precioExtra = encontrado.precio;
          }
          const totalExtra = precioExtra * cantidadExtra;

          if (!isNaN(precioExtra)) {
            html += `
              <tr style="background-color:#f9f9f9;">
                <td style="border: 1px solid #ccc; padding: 8px; padding-left: 24px;">↳ ${nombreExtra}</td>
                <td style="border: 1px solid #ccc; padding: 8px; text-align:center;">${cantidadExtra}</td>
                <td style="border: 1px solid #ccc; padding: 8px; text-align:right;">${formatearPesos(precioExtra)}</td>
                <td style="border: 1px solid #ccc; padding: 8px; text-align:right;">${formatearPesos(totalExtra)}</td>
              </tr>
            `;
          }
        }
      });
    }

    // === Extras personalizados ===
    if (Array.isArray(prod.extrasPersonalizados)) {
      prod.extrasPersonalizados.forEach((extra, idx) => {
        const cantidadExtra = parseInt(prod.extrasPersonalizadosCant?.[idx]) || 1;
        const totalExtra = extra.precio * cantidadExtra;

        if (extra?.nombre && !isNaN(extra.precio)) {
          // Mismo estilo que los otros extras y sin la etiqueta "(Personalizado)"
          html += `
            <tr style="background-color:#f9f9f9;">
              <td style="border: 1px solid #ccc; padding: 8px; padding-left: 24px;">↳ ${extra.nombre}</td>
              <td style="border: 1px solid #ccc; padding: 8px; text-align:center;">${cantidadExtra}</td>
              <td style="border: 1px solid #ccc; padding: 8px; text-align:right;">${formatearPesos(extra.precio)}</td>
              <td style="border: 1px solid #ccc; padding: 8px; text-align:right;">${formatearPesos(totalExtra)}</td>
            </tr>
          `;
        }
      });
    }
  });

  // === Mostrar descuento general si existe ===
  if (cot.ajusteGeneral && cot.ajusteGeneral.tipo === "Descuento") {
    const porcentaje = parseFloat(cot.ajusteGeneral.porcentaje) || 0;
    const subtotalBruto = cot.productos.reduce((acc, prod) => {
      const cantidad = parseInt(prod.cantidad) || 1;
      const precio = prod.precioUnitario || prod.precioCalculado || prod.precioEditado || prod.precioManual || 0;
      return acc + cantidad * precio;
    }, 0);
    const valorDescuento = subtotalBruto * (porcentaje / 100);

    html += `
      <tr style="background-color:#fff4f4; color: #c00;">
        <td colspan="3" style="border: 1px solid #ccc; padding: 8px; text-align:right;">
          Descuento general del ${porcentaje}%
        </td>
        <td style="border: 1px solid #ccc; padding: 8px; text-align:right;">
          - ${formatearPesos(valorDescuento)}
        </td>
      </tr>
    `;
  }

  // === Subtotal, IVA y Total ===
  html += `
      <tr style="font-weight:bold; background-color:#eaeaea;">
        <td colspan="3" style="border: 1px solid #ccc; padding: 10px; text-align:right;">Subtotal</td>
        <td style="border: 1px solid #ccc; padding: 10px; text-align:right;">${formatearPesos(cot.subtotal)}</td>
      </tr>
      <tr style="font-weight:bold; background-color:#eaeaea;">
        <td colspan="3" style="border: 1px solid #ccc; padding: 10px; text-align:right;">IVA (19%)</td>
        <td style="border: 1px solid #ccc; padding: 10px; text-align:right;">${formatearPesos(cot.iva)}</td>
      </tr>
  <tr style="font-weight:bold; background-color: #d7ecff; font-size:16px;">
        <td colspan="3" style="border: 1px solid #ccc; padding: 10px; text-align:right;">Total</td>
        <td style="border: 1px solid #ccc; padding: 12px; text-align:right;"><strong>${formatearPesos(cot.total)}</strong></td>
      </tr>
    </tbody>
  </table>`;

  html = html.replace(/(<br\s*\/?>\s*){2,}/gi, '<br />');

  return `<div style="page-break-before: always;">${html}</div>`;
}



function generarCondicionesComerciales(cot) {
  const primerTipo = cot.productos?.[0]?.tipo || "";

  // Condiciones específicas para Puertas Rápidas
  if (primerTipo === "Puertas Rápidas") {
    // TODO: Reemplazar el bloque abajo con el texto EXACTO suministrado por el usuario para "Condiciones Comerciales" de Puertas Rápidas.
    // El formato admite etiquetas HTML básicas (<p>, <ul>, <li>, <strong>, <br />) que ya son soportadas por el parser PDF.
    return `
      <p><strong>Forma de pago:</strong> ${cot.formaPago || "50% de anticipo con la orden y 50% antes del despacho / instalación."}<br />
      <strong>Tiempo de entrega:</strong> ${cot.tiempoEntrega || "15 días hábiles contados a partir de anticipo efectivo y confirmación de planos firmados."}<br />
      <strong>Vigencia de la oferta:</strong> ${cot.vigencia || "30 días calendario desde la fecha de emisión."}<br />
      <strong>Garantía:</strong> ${cot.garantia || "12 meses contra defectos de fabricación (motor y componentes electrónicos). No cubre instalación no autorizada, modificación de cableado, golpes, cortes en lona por uso indebido, exposición a químicos no compatibles, sobrecargas eléctricas o falta de mantenimiento documentado."}<br />
      <strong>Incluye:</strong> Puerta rápida enrollable según especificaciones, estructura autoportante, motor y tablero de control, elementos de seguridad y acceso descritos, manual básico de operación.<br />
      <strong>No incluye:</strong> Acometida eléctrica hasta el punto de conexión, canalizaciones, adecuaciones civiles del vano, obras de refuerzo, sistemas de puesta a tierra, dispositivos adicionales no especificados.<br />
      <strong>Condiciones de instalación:</strong> El vano debe estar terminado, nivelado y aplomado según planos, libre de obstrucciones y con resistencia estructural adecuada. Se requiere suministro eléctrico definitivo (220V monofásico estable) antes de programar la instalación. Variaciones de voltaje que afecten el equipo invalidan la garantía. Si el cliente requiere cursos, capacitaciones, personal SYSO, técnicos o coordinadores, deberán informarse antes para incluirlos en el precio; de no hacerlo, se facturarán por separado.<br />
      <p><strong>Observaciones:</strong> El cliente debe designar un responsable para recibir la capacitación básica de operación. Elementos adicionales solicitados posteriormente serán cotizados por separado. El cliente debe proveer un espacio seguro para el almacenamiento de los equipos durante la instalación.</p>
    `;
  }


  // Condiciones genéricas (otros productos)
  return `
  <p><strong>Forma de pago: </strong> ${cot.formaPago || "50% de anticipo contra orden de compra y 50% para retiro en planta."}<br />
  <strong>Tiempo de entrega: </strong> ${cot.tiempoEntrega || "15 días hábiles contados a partir de anticipo efectivo."}<br />
  <strong>Vigencia de la oferta: </strong> ${cot.vigencia || "30 días calendario desde la fecha de emisión."}<br />
  <strong>Garantía: </strong> ${cot.garantia || "12 meses contra defectos de fabricación."}</p>`;
}

function generarTerminosGenerales(cot) {return `
  <p><strong>ALCANCE DE LA OFERTA:</strong> Esta propuesta se basa en la información suministrada por el cliente. Para formalizar el suministro es indispensable recibir planos o fotografías claras del área y su aprobación firmada antes de iniciar fabricación.</p>
  <p><strong>INSTALACIÓN (OPCIONAL):</strong> El cliente puede ejecutar la instalación con su propio personal. Si contrata la instalación con COLD CHAIN SERVICES SAS, esta se limita exclusivamente a los equipos ofertados y en condiciones adecuadas de acceso y seguridad.</p>
  <p><strong>NO INCLUYE:</strong> Obras civiles, adecuaciones de vano, reforzamientos estructurales, cableado externo, acometidas eléctricas, canalizaciones, equipos de izaje, elementos de SISO del cliente ni personal de seguridad.</p>
  <p><strong>TIEMPO DE ENTREGA:</strong> Contado a partir de: (1) aprobación escrita de la oferta y planos, (2) recepción efectiva del anticipo y (3) disponibilidad de materiales. No contempla demoras ajenas como fuerza mayor, paros, cierres viales, escasez o retrasos logísticos.</p>
  <p><strong>GARANTÍA:</strong> 12 meses por defectos de fabricación bajo uso y mantenimiento normales. Excluye daños por instalación inadecuada, golpes, mal uso, modificaciones no autorizadas, picos o variaciones de voltaje, exposición a agentes químicos no compatibles y desgaste normal. No cubre componentes eléctricos/electrónicos (motores, tarjetas, controles, sensores) salvo que se especifique expresamente.</p>
  <p><strong>MANTENIMIENTO Y PERIODICIDAD:</strong> Debe ser realizado por personal calificado. Para conservar la garantía se requiere al menos una visita preventiva documentada durante el período de cobertura. La ausencia de soportes anula la garantía.</p>
  <p><strong>OBLIGACIONES DEL CONTRATANTE (si incluye instalación):</strong></p>
  <ul>
    <li>Proveer acceso libre, seguro y despejado al área de trabajo.</li>
    <li>Entregar vano / estructura terminada, nivelada y sin interferencias antes de la visita.</li>
    <li>Asegurar suministro eléctrico definitivo y estable con el voltaje especificado.</li>
    <li>Informar con anticipación protocolos de ingreso, inducciones o permisos especiales.</li>
    <li>Resguardar los equipos y materiales entregados en sitio hasta su instalación.</li>
    <li>Asumir costos de esperas o reprogramaciones causadas por condiciones no idóneas del área.</li>
    <li>Responder por daños ocasionados por variaciones de voltaje o manipulación de terceros.</li>
  </ul>
  <p><strong>ACEPTACIÓN:</strong> La emisión de orden de compra y/o el pago del anticipo se consideran aceptación plena de estas condiciones.</p>
`;
}
