// src/templates/htmlTemplates.js

export function plantillaDivisionesTermicas(data) {
  const {
    cliente,
    contacto,
    nit,
    ciudad,
    fecha,
    numeroCotizacion,
    descripcion,
    especificacionesTecnicasHTML,
    tablaPreciosHTML,
    condicionesComercialesHTML,
    terminosYCondicionesHTML
  } = data;

  return `<!DOCTYPE html>
  <html lang="es">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Cotización Divisiones Térmicas</title>
    <style>${estilosBase()}</style>
  </head>
  <body>
    ${encabezado(cliente, contacto, nit, ciudad, fecha, numeroCotizacion, "DIVISIONES TÉRMICAS")}
    <div class="section"><div class="section-title">Descripción General</div><p>${descripcion}</p></div>
    <div class="section"><div class="section-title">Especificaciones Técnicas</div>${especificacionesTecnicasHTML}</div>
    <div class="section"><div class="section-title">Detalle de Precios</div>${tablaPreciosHTML}</div>
    <div class="section"><div class="section-title">Condiciones Comerciales</div>${condicionesComercialesHTML}</div>
    <div class="section"><div class="section-title">Términos y Condiciones Generales</div>${terminosYCondicionesHTML}</div>
    ${pieDePagina()}
  </body>
  </html>`;
}

export function plantillaPuertasRapidas(data) {
  const {
    cliente,
    contacto,
    nit,
    ciudad,
    fecha,
    numeroCotizacion,
    descripcion,
    especificacionesTecnicasHTML,
    tablaPreciosHTML,
    condicionesComercialesHTML,
    terminosYCondicionesHTML
  } = data;

  return `<!DOCTYPE html>
  <html lang="es">
  <head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Cotización Puertas Rápidas</title>
    <style>${estilosBase()}</style>
  </head>
  <body>
    ${encabezado(cliente, contacto, nit, ciudad, fecha, numeroCotizacion, "PUERTAS RÁPIDAS")}
    <div class="section"><div class="section-title">Descripción General</div><p>${descripcion}</p></div>
    <div class="section"><div class="section-title">Especificaciones Técnicas</div>${especificacionesTecnicasHTML}</div>
    <div class="section"><div class="section-title">Detalle de Precios</div>${tablaPreciosHTML}</div>
    <div class="section"><div class="section-title">Condiciones Comerciales</div>${condicionesComercialesHTML}</div>
    <div class="section"><div class="section-title">Términos y Condiciones Generales</div>${terminosYCondicionesHTML}</div>
    ${pieDePagina()}
  </body>
  </html>`;
}

export function plantillaAbrigosRetractiles(data) {
  const {
    cliente,
    contacto,
    nit,
    ciudad,
    fecha,
    numeroCotizacion,
    descripcion,
    especificacionesTecnicasHTML,
    tablaPreciosHTML,
    condicionesComercialesHTML,
    terminosYCondicionesHTML
  } = data;

  return `<!DOCTYPE html>
  <html lang="es">
  <head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Cotización Abrigos Retráctiles</title>
    <style>${estilosBase()}</style>
  </head>
  <body>
    ${encabezado(cliente, contacto, nit, ciudad, fecha, numeroCotizacion, "ABRIGOS RETRÁCTILES")}
    <div class="section"><div class="section-title">Descripción General</div><p>${descripcion}</p></div>
    <div class="section"><div class="section-title">Especificaciones Técnicas</div>${especificacionesTecnicasHTML}</div>
    <div class="section"><div class="section-title">Detalle de Precios</div>${tablaPreciosHTML}</div>
    <div class="section"><div class="section-title">Condiciones Comerciales</div>${condicionesComercialesHTML}</div>
    <div class="section"><div class="section-title">Términos y Condiciones Generales</div>${terminosYCondicionesHTML}</div>
    ${pieDePagina()}
  </body>
  </html>`;
}

export function plantillaAbrigosInflables(data) {
  const {
    cliente,
    contacto,
    nit,
    ciudad,
    fecha,
    numeroCotizacion,
    descripcion,
    especificacionesTecnicasHTML,
    tablaPreciosHTML,
    condicionesComercialesHTML,
    terminosYCondicionesHTML
  } = data;

  return `<!DOCTYPE html>
  <html lang="es">
  <head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Cotización Abrigos Inflables</title>
    <style>${estilosBase()}</style>
  </head>
  <body>
    ${encabezado(cliente, contacto, nit, ciudad, fecha, numeroCotizacion, "ABRIGOS INFLABLES")}
    <div class="section"><div class="section-title">Descripción General</div><p>${descripcion}</p></div>
    <div class="section"><div class="section-title">Especificaciones Técnicas</div>${especificacionesTecnicasHTML}</div>
    <div class="section"><div class="section-title">Detalle de Precios</div>${tablaPreciosHTML}</div>
    <div class="section"><div class="section-title">Condiciones Comerciales</div>${condicionesComercialesHTML}</div>
    <div class="section"><div class="section-title">Términos y Condiciones Generales</div>${terminosYCondicionesHTML}</div>
    ${pieDePagina()}
  </body>
  </html>`;
}

export function plantillaSellosAnden(data) {
  const {
    cliente,
    contacto,
    nit,
    ciudad,
    fecha,
    numeroCotizacion,
    descripcion,
    especificacionesTecnicasHTML,
    tablaPreciosHTML,
    condicionesComercialesHTML,
    terminosYCondicionesHTML
  } = data;

  return `<!DOCTYPE html>
  <html lang="es">
  <head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Cotización Sellos de Andén</title>
    <style>${estilosBase()}</style>
  </head>
  <body>
    ${encabezado(cliente, contacto, nit, ciudad, fecha, numeroCotizacion, "SELLOS DE ANDÉN")}
    <div class="section"><div class="section-title">Descripción General</div><p>${descripcion}</p></div>
    <div class="section"><div class="section-title">Especificaciones Técnicas</div>${especificacionesTecnicasHTML}</div>
    <div class="section"><div class="section-title">Detalle de Precios</div>${tablaPreciosHTML}</div>
    <div class="section"><div class="section-title">Condiciones Comerciales</div>${condicionesComercialesHTML}</div>
    <div class="section"><div class="section-title">Términos y Condiciones Generales</div>${terminosYCondicionesHTML}</div>
    ${pieDePagina()}
  </body>
  </html>`;
}

function estilosBase() {
  return `body { font-family: Arial, sans-serif; color: #1e293b; margin: 40px; background-color: #fff; }
    header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #0c4a6e; padding-bottom: 10px; margin-bottom: 20px; }
    .logo { height: 70px; }
    h1 { color: #0c4a6e; margin-bottom: 5px; }
    .section { margin-top: 20px; page-break-inside: avoid; }
    .section-title { font-weight: bold; color: #0c4a6e; margin-bottom: 5px; border-bottom: 1px solid #94a3b8; }
    table { width: 100%; border-collapse: collapse; margin-top: 10px; }
    th, td { border: 1px solid #94a3b8; padding: 8px; text-align: left; }
    th { background-color: #e0f2fe; color: #0c4a6e; }
    footer { margin-top: 60px; border-top: 1px solid #94a3b8; padding-top: 10px; font-size: 0.85em; text-align: center; color: #64748b; }`;
}

function encabezado(cliente, contacto, nit, ciudad, fecha, numeroCotizacion, titulo) {
  return `<header>
    <img src="https://ccservices.com.co/wp-content/uploads/2021/07/CCServices-Logo-web.png" alt="Logo" class="logo" />
    <div><strong>Fecha:</strong> ${fecha}<br /><strong>Cotización No.:</strong> ${numeroCotizacion}</div>
  </header>
  <h1>COTIZACIÓN DE ${titulo}</h1>
  <p><strong>Cliente:</strong> ${cliente}<br />
     <strong>Contacto:</strong> ${contacto}<br />
     <strong>NIT:</strong> ${nit}<br />
     <strong>Ciudad:</strong> ${ciudad}<br /></p>`;
}

function pieDePagina() {
  return `<footer>
    Cotización generada por COLD CHAIN SERVICES S.A.S. Carrera 4 #1-04, Subachoque, Cundinamarca. www.ccservices.com.co – Tel. 3008582709
  </footer>`;
}