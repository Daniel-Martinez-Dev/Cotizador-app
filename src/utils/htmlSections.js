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

    html += `
      <tr style="font-weight: bold;">
        <td style="border: 1px solid #ccc; padding: 8px;">
          ${(prod.tipo === "Productos Personalizados" || prod.tipo === "Repuestos")
            ? `${prod.nombrePersonalizado || prod.tipo}`
            : prod.tipo} (${prod.ancho}x${prod.alto})
        </td>
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
          html += `
            <tr style="background-color:#eaeaea;">
              <td style="border: 1px solid #ccc; padding: 8px; padding-left: 24px;">↳ ${extra.nombre} (Personalizado)</td>
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
      <tr style="font-weight:bold; background-color: #d7ecff;">
        <td colspan="3" style="border: 1px solid #ccc; padding: 14px; text-align:right;">Total</td>
        <td style="border: 1px solid #ccc; padding: 12px; text-align:right;"><strong>${formatearPesos(cot.total)}</strong></td>
      </tr>
    </tbody>
  </table>`;

  html = html.replace(/(<br\s*\/?>\s*){2,}/gi, '<br />');

  return `<div style="page-break-before: always;">${html}</div>`;
}



function generarCondicionesComerciales(cot) {
  return `
  <p><strong>Forma de pago: </strong> ${cot.formaPago || "50% de anticipo contra orden de compra y 50% para retiro en planta."}<br />
  <strong>Tiempo de entrega: </strong> ${cot.tiempoEntrega || "15 días hábiles contados a partir de anticipo efectivo."}<br />
  <strong>Vigencia de la oferta: </strong> ${cot.vigencia || "30 días calendario desde la fecha de emisión."}<br />
  <strong>Garantía: </strong> ${cot.garantia || "12 meses contra defectos de fabricación."}</p>`;
}

function generarTerminosGenerales(cot) {
  return `
    <p>
      Esta oferta se basa en la información suministrada por el cliente. Para concretar un acuerdo, es indispensable contar con planos y fotografías proporcionadas por el cliente. No se podrá iniciar el diseño o fabricación de equipos sin la aprobación previa de los planos o dibujos enviados por el cliente y firmados.<br>
      <strong>INSTALACIÓN:</strong> El servicio de instalación es opcional. El cliente puede instalar directamente los equipos. En caso de requerir instalación por parte de COLD CHAIN SERVICES SAS, esta incluirá únicamente la instalación de los equipos contratados.<br>
      <strong>  NO INCLUYE:</strong> Acondicionamientos de vano, obras civiles o eléctricas, acometidas eléctricas u otros trabajos ajenos, suministro de SISO o personal de seguridad.<br>
      <strong>TIEMPO DE ENTREGA:</strong> 
      Sujeto a disponibilidad de planta, previa aprobación de las condiciones, recibido de anticipo y diligenciamiento de formato. No se incluyen demoras por fuerza mayor, paros, derrumbes, escasez de materiales o transporte.<br>
      <strong>GARANTÍA:</strong> Los equipos cuentan con garantía limitada cubriendo defectos de fabricación bajo condiciones normales de uso. No cubre daños por instalación deficiente, manipulación indebida, descargas eléctricas, picos de voltaje o mal uso. Tampoco cubre partes eléctricas, tarjetas, controles inalámbricos, motores o componentes electrónicos, a menos que se indique expresamente. COLD CHAIN SERVICES SAS no se hace responsable de cambios de elementos de nuestros productos por parte del cliente sin previa autorización.<br>
      <strong>MANTENIMIENTO Y PERIODICIDAD:</strong> Los mantenimientos deben ser realizados por personal calificado. Durante el período de garantía, el cliente debe garantizar al menos una visita anual. Si se incumple, se invalida la garantía. En caso de falla, el cliente deberá presentar soportes, informes o reportes técnicos válidos.<br>
      <strong>OBLIGACIONES DEL CONTRATANTE:</strong> Aplica cuando se incluye instalación del producto, por tanto, el contratante deberá:
    </p>
    <ul>
      <li>Informar con antelación los requisitos de ingreso a la obra, tanto para el personal técnico como para la entrega del producto.</li>
      <li>Asegurarse que el área de instalación esté completamente despejada, libre de obstáculos y con acceso habilitado para el ingreso de equipos y personal.</li>
      <li>Garantizar que los pisos, techos y estructuras de la obra estén completamente terminados antes de la instalación, con el fin de permitir una instalación segura y válida para efectos de garantía.</li>
      <li>Suministrar una acometida eléctrica definitiva que cumpla con el voltaje indicado en la cotización emitida por COLD CHAIN SERVICES SAS.</li>
      <li>En caso de no contar con acometida definitiva, esto no será motivo válido para rechazar la recepción del producto ni la firma del acta de entrega. El cliente u obra será el único responsable de garantizar la estabilidad del voltaje requerido.</li>
      <li>Si se presentan daños en los motores o accesorios eléctricos debido a variaciones de voltaje, COLD CHAIN SERVICES SAS no asumirá responsabilidad alguna y los costos de reparación serán asumidos por el cliente.</li>
    </ul>
  `;
}
