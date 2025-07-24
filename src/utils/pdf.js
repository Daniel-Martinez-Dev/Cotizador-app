import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { EXTRAS_POR_DEFECTO } from "../data/precios";
import { getNextQuoteNumber } from "./quoteNumber";

// Formato de moneda colombiano
function formatearPesos(valor) {
  return valor.toLocaleString("es-CO", {
    style: "currency",
    currency: "COP",
    minimumFractionDigits: 0
  });
}

// Arma la tabla igual a la preview
function construirFilasPDF(productos) {
  const filas = [];
  productos.forEach((prod, idx) => {
    const itemNum = idx + 1;
    // Producto principal
    filas.push([
      `${itemNum}`,
      construirDescripcionPDF(prod),
      parseInt(prod.cantidad) || 1,
      formatearPesos(prod.precioCalculado || 0),
      formatearPesos((prod.precioCalculado || 0) * (parseInt(prod.cantidad) || 1))
    ]);
    // Extras por defecto
    let subIdx = 1;
    if (prod.extras && prod.extras.length > 0) {
      prod.extras.forEach((e) => {
        const listaExtras = EXTRAS_POR_DEFECTO[prod.tipo] || [];
        let precioExtraUnit = 0;
        const encontrado = listaExtras.find((ex) => ex.nombre === e);
        if (encontrado) {
          if (encontrado.precio !== undefined) {
            precioExtraUnit = encontrado.precio;
          } else if (prod.cliente === "Distribuidor") {
            precioExtraUnit = encontrado.precioDistribuidor || 0;
          } else {
            precioExtraUnit = encontrado.precioCliente || 0;
          }
        }
        const cant = prod.extrasCantidades?.[e] || 1;
        filas.push([
          `${itemNum}.${subIdx}`,
          e,
          cant,
          formatearPesos(precioExtraUnit),
          formatearPesos(precioExtraUnit * cant)
        ]);
        subIdx++;
      });
    }
    // Extras personalizados
    if (prod.extrasPersonalizados && prod.extrasPersonalizados.length > 0) {
      prod.extrasPersonalizados.forEach((ex, j) => {
        const cant = prod.extrasPersonalizadosCant?.[j] || 1;
        filas.push([
          `${itemNum}.${subIdx}`,
          ex.nombre,
          cant,
          formatearPesos(ex.precio),
          formatearPesos(ex.precio * cant)
        ]);
        subIdx++;
      });
    }
  });
  return filas;
}

function construirDescripcionPDF(prod) {
  let desc = prod.tipo;
  if (prod.ancho && prod.alto) desc += ` (${prod.ancho} x ${prod.alto} mm)`;
  if (
    prod.cliente &&
    prod.cliente !== "Distribuidor" &&
    prod.cliente !== "Carrocerías Panamericana"
  )
    desc += ` / Cliente: ${prod.cliente}`;
  if (prod.cliente === "Carrocerías Panamericana") desc += " / Panamericana";
  if (
    prod.tipo === "Sello de Andén" &&
    prod.componentes &&
    prod.componentes.length > 0
  ) {
    desc += " / Componentes: ";
    desc += prod.componentes
      .map((comp) => comp.charAt(0).toUpperCase() + comp.slice(1))
      .join(", ");
  }
  // Solo mostrar descuento
  if (
    prod.ajusteTipo === "Descuento" &&
    prod.ajusteValor &&
    Number(prod.ajusteValor) !== 0
  ) {
    desc += ` / Ajuste Descuento: ${prod.ajusteValor}%`;
  }
  if (prod.precioManual)
    desc += ` / Precio manual: ${formatearPesos(parseInt(prod.precioManual))}`;
  else if (prod.precioEditado)
    desc += ` / Precio fuera de rango: ${formatearPesos(
      parseInt(prod.precioEditado)
    )}`;
  return desc;
}

export function generarPDF(cotizacion) {
  const {
    nombreCliente,
    cliente,
    productos,
    subtotal,
    iva,
    total,
  } = cotizacion;

  const doc = new jsPDF();
  const cotizacionNum = getNextQuoteNumber();
  const fecha = new Date().toLocaleDateString("es-CO");

  // Encabezado
  doc.setFontSize(18);
  doc.setTextColor(26, 51, 87);
  doc.text(`Cotización #${cotizacionNum}`, 14, 18);
  doc.setFontSize(12);
  doc.setTextColor(40, 40, 40);
  doc.text(`Cliente: ${nombreCliente || cliente}`, 14, 28);
  doc.text(`Fecha: ${fecha}`, 14, 35);

  // Espacio
  doc.setFontSize(12);
  doc.setTextColor(80, 80, 80);
  doc.text("Detalle de productos y servicios:", 14, 45);

  // Tabla
  autoTable(doc, {
    startY: 48,
    head: [
      [
        "Ítem #",
        "Descripción",
        "Cantidad",
        "Precio unitario",
        "Subtotal"
      ]
    ],
    body: construirFilasPDF(productos),
    headStyles: { fillColor: [26, 51, 87], textColor: 255, fontStyle: 'bold', fontSize: 11 },
    bodyStyles: {
      fontSize: 10,
      textColor: 40,
      halign: 'right'
    },
    columnStyles: {
      0: { halign: 'center', cellWidth: 16 },
      1: { halign: 'left', cellWidth: 82 },
      2: { halign: 'center', cellWidth: 22 },
      3: { halign: 'right', cellWidth: 32 },
      4: { halign: 'right', cellWidth: 32 }
    },
    didParseCell: (data) => {
      if (
        data.section === 'body' &&
        data.row.index > 0 &&
        data.row.raw[0]?.includes('.')
      ) {
        // Sub-ítem: extras → color suave
        data.cell.styles.fillColor = [220, 235, 250];
        data.cell.styles.fontSize = 9;
      }
    }
  });

  // Totales
  let finalY = doc.lastAutoTable.finalY || 58;
  doc.setFontSize(12);
  doc.setTextColor(33, 37, 41);
  doc.text(
    `Subtotal: ${formatearPesos(subtotal)}`,
    150,
    finalY + 10,
    { align: "right" }
  );
  doc.text(
    `IVA (19%): ${formatearPesos(iva)}`,
    150,
    finalY + 18,
    { align: "right" }
  );
  doc.setFontSize(13);
  doc.setTextColor(26, 51, 87);
  doc.text(
    `TOTAL: ${formatearPesos(total)}`,
    150,
    finalY + 27,
    { align: "right" }
  );

  // Pie de página (opcional: personaliza a tu empresa)
  doc.setFontSize(10);
  doc.setTextColor(120, 120, 120);
  doc.text(
    "CC Services Colombia S.A.S. | www.ccservices.com.co | comercial@ccservices.com.co",
    14,
    285
  );

  // Guardar PDF con nombre formal
  const nombreArchivo = `Cotizacion#${cotizacionNum}_${(nombreCliente || cliente || "Cliente").replace(/\s/g, "_")}_${fecha.replace(/\//g, "-")}.pdf`;
  doc.save(nombreArchivo);
}
