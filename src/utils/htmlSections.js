// src/utils/htmlSections.js

import { formatearPesos } from "./formatos";
import { EXTRAS_POR_DEFECTO } from "../data/precios"; // legacy fallback
import { getDescripcionGeneral, getLineaTabla, getEspecificacionesHTML, getExtrasPorTipo } from '../data/catalogoProductos';

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

// Pequeños helpers para construir HTML de texto/listas de forma consistente
const p = (text) => `<p>${text}</p>`;
const li = (text) => `<li>${text}</li>`;
const ulOpen = `<ul class="condiciones-compactas">`;

function generarDescripcion(cot) {
  const tipo = cot.productos[0]?.tipo;
  const descCatalogo = getDescripcionGeneral(tipo);
  if(descCatalogo) return `<p>${descCatalogo}</p>`;
  return "";
}

function generarEspecificaciones(cot) {
  const tipo = cot.productos[0]?.tipo;
  let raw = getEspecificacionesHTML(tipo);
  if(!raw) return '';
  raw = raw.replace(/<ul(?![^>]*condiciones-compactas)/gi, '<ul class="condiciones-compactas espec-compactas"');
  raw = raw.replace(/<li>(.*?)<br\s*\/?>(.*?)<\/li>/gi, (m, a, b) => `<li>${a.trim()} ${b.trim()}</li>`);
  raw = raw.replace(/<br\s*\/?>(\s*)/gi, ' ');
  raw = raw.replace(/\s{2,}/g, ' ');
  return raw;
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
    const anchoRaw = prod.ancho || prod.ancho_vano || "";
    const altoRaw = prod.alto || prod.alto_vano || "";
    const anchoVal = anchoRaw && !isNaN(anchoRaw) ? anchoRaw : "";
    const altoVal = altoRaw && !isNaN(altoRaw) ? altoRaw : "";
    let descripcionProducto = "";
    let medidasLinea = "";
    if(anchoVal || altoVal){
      if(anchoVal && altoVal){
        medidasLinea = `<br />${anchoVal}mm ancho * ${altoVal}mm alto.`;
      } else if(anchoVal){
        medidasLinea = `<br />${anchoVal}mm ancho.`;
      } else if(altoVal){
        medidasLinea = `<br />${altoVal}mm alto.`;
      }
    }
    // Usar catálogo central para línea base; fallback mantiene lógica personalizada
    descripcionProducto = getLineaTabla(prod, medidasLinea);
    if(!descripcionProducto){
      descripcionProducto = `${(prod.tipo === "Productos Personalizados" || prod.tipo === "Repuestos") ? (prod.nombrePersonalizado || prod.tipo) : prod.tipo}${medidasLinea}`;
    }

    if(prod.infoAdicional){
      const infoClean = String(prod.infoAdicional).trim();
      if(infoClean){
  // Salto de línea garantizado separado de medidas/base
  descripcionProducto += `<br />(${infoClean.replace(/[<>]/g,'')})`;
      }
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
  const listaExtras = getExtrasPorTipo(prod.tipo) || EXTRAS_POR_DEFECTO[prod.tipo] || [];
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

    // Extra automático para Cortina Thermofilm: MAX BULLET
    if(prod.tipo === 'Cortina Thermofilm' && prod.ancho){
      const anchoM = parseFloat(prod.ancho)/1000;
      const altoM = parseFloat(prod.alto)/1000;
      if(!isNaN(anchoM)){
        const bullets = ((anchoM + 0.10) / 0.6); // valor decimal exacto
        const precioUnitBullet = 35000;
        const totalBullets = precioUnitBullet * bullets;
        html += `
          <tr style="background-color:#f9f9f9;">
            <td style="border: 1px solid #ccc; padding: 8px; padding-left: 24px;">↳ MAX BULLET PLÁSTICO PARA MONTAJE (60cm de largo)</td>
            <td style="border: 1px solid #ccc; padding: 8px; text-align:center;">${bullets.toFixed(2)}</td>
            <td style="border: 1px solid #ccc; padding: 8px; text-align:right;">${formatearPesos(precioUnitBullet)}</td>
            <td style="border: 1px solid #ccc; padding: 8px; text-align:right;">${formatearPesos(totalBullets)}</td>
          </tr>`;
      }
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
    // No mostrar si el porcentaje es 0
    if (porcentaje <= 0) {
      // continuar sin agregar la fila
    } else {
    const subtotalBruto = cot.productos.reduce((acc, prod) => {
      const cantidad = parseInt(prod.cantidad) || 1;
      const precio = prod.precioUnitario || prod.precioCalculado || prod.precioEditado || prod.precioManual || 0;
      return acc + cantidad * precio;
    }, 0);
    const valorDescuento = subtotalBruto * (porcentaje / 100);
    // Estilos verdes para indicar un beneficio positivo para el cliente
    html += `
      <tr style="background-color:#f1fff1; color:#0a7a0a;">
        <td colspan="3" style="border: 1px solid #ccc; padding: 8px; text-align:right; font-weight:600;">
          Descuento general del ${porcentaje}%
        </td>
        <td style="border: 1px solid #ccc; padding: 8px; text-align:right; font-weight:600;">
          - ${formatearPesos(valorDescuento)}
        </td>
      </tr>
    `;
    }
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
  const liCond = (arr) => `<ul class='condiciones-compactas'>${arr.map(txt=>`<li>${txt}</li>`).join('')}</ul>`;
  // Condiciones específicas para Sello de Andén
  if (primerTipo === "Sello de Andén") {
    return `
      ${p('<strong>Condiciones Comerciales – Sellos de Andén</strong>')}
      ${p('<strong>Forma de pago:</strong> 50% de anticipo con la orden y 50% antes del despacho.')}
      ${p('<strong>Tiempo de entrega:</strong> 10 días hábiles a partir del anticipo confirmado.')}
      ${p('<strong>Vigencia de la oferta:</strong> 30 días calendario desde la fecha de emisión.')}
      ${p('<strong>Garantía:</strong> 12 meses contra defectos de fabricación.')}
      ${p('<strong>Incluye:</strong> Sello de andén según dimensiones, postes laterales, cortina y/o travesaño, y platinas de anclaje.')}
      ${p('<strong>No incluye (en caso de contratar instalación):</strong> Obra civil, adecuaciones del vano, topes de caucho, ni acompañamiento SYSO (estos se cotizan aparte en caso de ser requeridos).')}
      ${p('<strong>Condiciones de instalación:</strong>')}
      ${ulOpen}
        ${li('Vano terminado, nivelado y con la resistencia estructural adecuada.')}
        ${li('Libre de obstrucciones y con espacio suficiente para el montaje.')}
      </ul>
      ${p('<strong>Mantenimiento:</strong> Limpieza trimestral de lona, inspección de costuras y revisión de fijaciones.')}
      ${p('<strong>Observaciones:</strong> Cualquier variación en las medidas iniciales podrá generar ajustes en la oferta.')}
    `;
  }
  // Condiciones específicas para Abrigos Retráctiles (Estándar e Inflables)
  if (primerTipo === "Abrigo Retráctil Estándar" || primerTipo === "Abrigo Retráctil Inflable") {
    const tiempoEntrega = primerTipo === "Abrigo Retráctil Estándar"
      ? "10 días hábiles para Abrigo Retráctil Estándar."
      : "15 días hábiles para Abrigo Retráctil Inflable.";
    return `
      ${p('<strong>Condiciones Comerciales – Abrigos Retráctiles (Estándar e Inflables)</strong>')}
      ${p('<strong>Forma de pago:</strong> 50% de anticipo con la orden y 50% antes del despacho.')}
      ${p(`<strong>Tiempo de entrega:</strong> ${tiempoEntrega}`)}
      ${p('<strong>Vigencia de la oferta:</strong> 30 días calendario.')}
      ${p(`<strong>Garantía:</strong> 12 meses contra defectos de fabricación. No cubre desgaste por uso, cortes en lona, exposición a químicos no compatibles, golpes o falta de mantenimiento. ${primerTipo === "Abrigo Retráctil Inflable" ? "En el caso del abrigo inflable, la garantía tampoco cubre daños ocasionados por sobrecargas eléctricas, mala conexión del ventilador o variaciones de voltaje." : ""}`)}
      ${p('<strong>Incluye:</strong> Abrigo retráctil según modelo, estructura metálica, lona perimetral y bandas frontales.')}
      ${p('<strong>No incluye (en caso de contratar instalación):</strong> Obras civiles, canalizaciones, refuerzos de muro, sistemas eléctricos, ni acompañamiento SYSO, el cual deberá cotizarse por separado en caso de ser requerido.')}
      ${p('<strong>Condiciones de instalación:</strong>')}
      ${ulOpen}
        ${li('El vano debe estar terminado, libre de obstrucciones, nivelado y con resistencia estructural adecuada.')}
        ${li('Se recomienda verificar que no existan interferencias con estructuras, techos o bajantes de agua que afecten la correcta fijación del abrigo.')}
      </ul>
      ${p('<strong>Mantenimiento:</strong> Revisión e inspección visual trimestral de lona, costuras y fijaciones. Limpieza con productos compatibles.')}
    `;
  }
  if (primerTipo === "Puertas Rápidas") {
    const items = [
      (Boolean(cot.incluyeInstalacion) ? '<strong>ALCANCE:</strong> Esta oferta incluye <strong>SUMINISTRO e INSTALACIÓN</strong> según condiciones indicadas. El cliente debe garantizar condiciones de obra y energía adecuadas.' : '<strong>ALCANCE:</strong> Esta oferta corresponde exclusivamente a <strong>SUMINISTRO</strong> (NO incluye instalación). Si se requiere instalación, deberá solicitarse y cotizarse por separado.'),
      `<strong>Forma de pago:</strong> ${cot.formaPago || '50% de anticipo con la orden y 50% antes del despacho / instalación.'}`,
      `<strong>Tiempo de entrega:</strong> ${cot.tiempoEntrega || '15 días hábiles contados a partir de anticipo efectivo y confirmación de planos firmados.'}`,
      `<strong>Vigencia de la oferta:</strong> ${cot.vigencia || '30 días calendario desde la fecha de emisión.'}`,
      `<strong>Garantía:</strong> ${cot.garantia || '12 meses contra defectos de fabricación (motor y componentes electrónicos). Leer Términos y Condiciones.'}`,
      '<strong>Incluye:</strong> Puerta rápida enrollable según especificaciones, estructura autoportante, motor y tablero de control, elementos de seguridad y acceso descritos, manual básico de operación.',
      '<strong>No incluye:</strong> Acometida eléctrica hasta el punto de conexión, canalizaciones, adecuaciones civiles del vano, obras de refuerzo, sistemas de puesta a tierra, dispositivos adicionales no especificados.',
      '<strong>Condiciones de instalación:</strong> El vano debe estar terminado, nivelado y aplomado según planos, libre de obstrucciones y con resistencia estructural adecuada. Requiere suministro eléctrico definitivo (220V monofásico estable). Variaciones de voltaje invalidan la garantía. Requerimientos adicionales (cursos, SYSO, coordinadores) se cotizan aparte.',
      '<strong>Observaciones:</strong> El cliente designa responsable para capacitación básica. Solicitudes adicionales se cotizan aparte. Debe proveerse espacio seguro para almacenamiento temporal de equipos.'
    ];
    return liCond(items);
  }
  // Versión genérica como lista
  const incluyeInstalacion = Boolean(cot.incluyeInstalacion) || (Array.isArray(cot.productos) && cot.productos.some(p => p?.incluyeInstalacion || (Array.isArray(p?.extras) && p.extras.some(e => /instalación|instalacion/i.test(e)))));
  const alcance = incluyeInstalacion
    ? '<strong>ALCANCE:</strong> Esta oferta incluye <strong>SUMINISTRO e INSTALACIÓN</strong> según condiciones indicadas. El cliente debe garantizar condiciones de obra y energía adecuadas.'
    : '<strong>ALCANCE:</strong> Esta oferta corresponde exclusivamente a <strong>SUMINISTRO</strong> (NO incluye instalación). Si se requiere instalación, deberá solicitarse y cotizarse por separado.';
  const itemsGenericos = [
    alcance,
    `<strong>Forma de pago:</strong> ${cot.formaPago || '50% de anticipo contra orden de compra y 50% para retiro en planta.'}`,
    `<strong>Tiempo de entrega:</strong> ${cot.tiempoEntrega || '15 días hábiles contados a partir de anticipo efectivo.'}`,
    `<strong>Vigencia de la oferta:</strong> ${cot.vigencia || '30 días calendario desde la fecha de emisión.'}`,
    `<strong>Garantía:</strong> ${cot.garantia || '12 meses contra defectos de fabricación.'}`
  ];
  return liCond(itemsGenericos);
}

function generarTerminosGenerales(cot) {
  const items = [
    '<strong>ALCANCE DE LA OFERTA:</strong> Esta propuesta se basa en la información suministrada por el cliente. Se requiere aprobación firmada de planos antes de iniciar fabricación.',
    '<strong>INSTALACIÓN (OPCIONAL):</strong> El cliente puede ejecutar la instalación con su personal. Si la realiza COLD CHAIN SERVICES SAS, se limita a los equipos ofertados y condiciones adecuadas de acceso y seguridad.',
    '<strong>NO INCLUYE:</strong> Obras civiles, adecuaciones de vano, reforzamientos estructurales, cableado externo, acometidas eléctricas, canalizaciones, equipos de izaje, elementos de SISO del cliente ni personal de seguridad.',
    '<strong>TIEMPO DE ENTREGA:</strong> Inicia tras: (1) aprobación escrita oferta/planos, (2) recepción efectiva del anticipo y (3) disponibilidad de materiales. No contempla demoras por fuerza mayor, paros, cierres viales o retrasos logísticos.',
    '<strong>GARANTÍA:</strong> 12 meses por defectos de fabricación bajo uso y mantenimiento normales. Excluye daños por instalación inadecuada, golpes, mal uso, modificaciones no autorizadas, variaciones de voltaje, químicos no compatibles y desgaste normal. Componentes eléctricos/electrónicos solo si se especifica expresamente.',
    '<strong>MANTENIMIENTO Y PERIODICIDAD:</strong> Debe ejecutarse por personal calificado. Para conservar garantía se requiere al menos una visita preventiva documentada dentro del período; su ausencia la invalida.',
    '<strong>OBLIGACIONES DEL CONTRATANTE (si incluye instalación):</strong> Proveer acceso libre y seguro; vano/estructura terminados y nivelados; suministro eléctrico definitivo estable; informar protocolos de ingreso; resguardar equipos en sitio; cubrir costos de esperas por condiciones no idóneas; responder por daños por voltaje o manipulación de terceros.',
    '<strong>ACEPTACIÓN:</strong> La emisión de orden de compra y/o el pago del anticipo constituyen aceptación plena de estas condiciones.'
  ];
  return `<ul class='condiciones-compactas'>${items.map(i=>`<li>${i}</li>`).join('')}</ul>`;
}
