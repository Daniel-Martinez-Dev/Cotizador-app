// src/utils/htmlSections.js

import { formatearPesos } from "./formatos";
import { EXTRAS_POR_DEFECTO } from "../data/precios";

export function generarSeccionesHTML(cotizacion) {
  const descripcionHTML = generarDescripcion(cotizacion);
  const especificacionesHTML = generarEspecificaciones(cotizacion);
  const tablaHTML = generarTablaPrecios(cotizacion);
  const condicionesHTML = generarCondicionesComerciales(cotizacion);
  const terminosHTML = generarTerminosGenerales(cotizacion);

  return {
    descripcionHTML,
    especificacionesHTML,
    tablaHTML,
    condicionesHTML,
    terminosHTML
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
    <table style="width:100%; border-collapse: collapse; font-size: 14px;">
      <thead>
        <tr style="background-color: #f2f2f2;">
          <th style="border: 1px solid #ccc; padding: 8px; text-align:left;">Producto</th>
          <th style="border: 1px solid #ccc; padding: 8px; text-align:center;">Cantidad</th>
          <th style="border: 1px solid #ccc; padding: 8px; text-align:right;">Precio Unitario</th>
          <th style="border: 1px solid #ccc; padding: 8px; text-align:right;">Subtotal</th>
        </tr>
      </thead>
      <tbody>
  `;

    cot.productos.forEach((prod) => {
      const cantidad = parseInt(prod.cantidad) || 1;
      const precio = prod.precioCalculado || prod.precioEditado || prod.precioManual || 0;
      const subtotal = cantidad * precio;

      html += `
        <tr>
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
                  <td style="border: 1px solid #ccc; padding: 8px;">↳ ${nombreExtra}</td>
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
              <tr style="background-color:#f4f4f4;">
                <td style="border: 1px solid #ccc; padding: 8px;">↳ ${extra.nombre} (Personalizado)</td>
                <td style="border: 1px solid #ccc; padding: 8px; text-align:center;">${cantidadExtra}</td>
                <td style="border: 1px solid #ccc; padding: 8px; text-align:right;">${formatearPesos(extra.precio)}</td>
                <td style="border: 1px solid #ccc; padding: 8px; text-align:right;">${formatearPesos(totalExtra)}</td>
              </tr>
            `;
          }
        });
      }
    });

  html += `
      <tr style="font-weight:bold;">
        <td colspan="3" style="border: 1px solid #ccc; padding: 8px; text-align:right;">Subtotal</td>
        <td style="border: 1px solid #ccc; padding: 8px; text-align:right;">${formatearPesos(cot.subtotal)}</td>
      </tr>
      <tr style="font-weight:bold;">
        <td colspan="3" style="border: 1px solid #ccc; padding: 8px; text-align:right;">IVA (19%)</td>
        <td style="border: 1px solid #ccc; padding: 8px; text-align:right;">${formatearPesos(cot.iva)}</td>
      </tr>
      <tr style="font-weight:bold; background-color: #e6f7ff;">
        <td colspan="3" style="border: 1px solid #ccc; padding: 8px; text-align:right;">Total</td>
        <td style="border: 1px solid #ccc; padding: 8px; text-align:right;"><strong>${formatearPesos(cot.total)}</strong></td>
      </tr>
    </tbody>
  </table>`;

  return html;
}





function generarCondicionesComerciales(cot) {
  return `<p><strong>Forma de pago:</strong> ${cot.formaPago || "50% de anticipo contra orden de compra y 50% para retiro en planta."}<br />
  <strong>Tiempo de entrega:</strong> ${cot.tiempoEntrega || "15 días hábiles contados a partir de anticipo efectivo."}<br />
  <strong>Vigencia de la oferta:</strong> ${cot.vigencia || "30 días calendario desde la fecha de emisión."}<br />
  <strong>Garantía:</strong> ${cot.garantia || "6 meses contra defectos de fabricación."}</p>`;
}

function generarTerminosGenerales(cot) {
  return cot.terminosTexto || `<p><strong>Instalación:</strong> Opcional. No incluye obras civiles, eléctricas, ni personal SISO. El cliente debe informar con antelación cualquier requisito de ingreso especial o capacitación. El incumplimiento implicará costos adicionales.</p>
  <p><strong>Garantía:</strong> No aplica si el producto es manipulado por terceros, sufre daños eléctricos, no se realiza mantenimiento o se modifica sin autorización. Requiere mantenimiento por personal autorizado.</p>
  <p><strong>Obligaciones del cliente:</strong> Tener área de instalación lista, conexión eléctrica adecuada, acceso libre y firmar acta de entrega incluso sin conexión.</p>`;
}
