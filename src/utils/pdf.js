// src/utils/pdf.js
import jsPDF from "jspdf";
import html2pdf from "html2pdf.js";
import { getNextQuoteNumber } from "./quoteNumberFirebase";
import { guardarCotizacionEnFirebase } from "./firebaseQuotes";
import toast from "react-hot-toast";
import {
  plantillaDivisionesTermicas,
  plantillaPuertasRapidas,
  plantillaAbrigosRetractiles,
  plantillaAbrigosInflables,
  plantillaSellosAnden
} from "../templates/htmlTemplates";

function generarHTML(producto, datos) {
  switch (producto) {
    case "Divisiones Térmicas":
      return plantillaDivisionesTermicas(datos);
    case "Puertas Rápidas":
      return plantillaPuertasRapidas(datos);
    case "Abrigo Retráctil Estándar":
      return plantillaAbrigosRetractiles(datos);
    case "Abrigo Retráctil Inflable":
      return plantillaAbrigosInflables(datos);
    case "Sello de Andén":
      return plantillaSellosAnden(datos);
    default:
      return "<p>Error: Producto no soportado.</p>";
  }
}

export async function generarPDF(cotizacion) {
  const cotizacionNum = await getNextQuoteNumber();
  const fecha = new Date().toLocaleDateString("es-CO");

  try {
    await guardarCotizacionEnFirebase(cotizacion, cotizacionNum);
    toast.success(`Cotización #${cotizacionNum} guardada`);
  } catch (error) {
    toast.error("Error al guardar la cotización");
  }

  const productoPrincipal = cotizacion.productos?.[0]?.tipo || "";

  const datosHTML = {
    cliente: cotizacion.nombreCliente || cotizacion.cliente,
    contacto: cotizacion.contacto || "",
    nit: cotizacion.nit || "",
    ciudad: cotizacion.ciudad || "",
    fecha,
    numeroCotizacion: cotizacionNum,
    descripcion: cotizacion.descripcionHTML || "",
    especificacionesTecnicasHTML: cotizacion.especificacionesHTML || "",
    tablaPreciosHTML: cotizacion.tablaHTML || "",
    condicionesComercialesHTML: cotizacion.condicionesHTML || "",
    terminosYCondicionesHTML: cotizacion.terminosHTML || "",
  };

  const htmlCompleto = generarHTML(productoPrincipal, datosHTML);

  const opt = {
    margin: 10,
    filename: `Cotizacion#${cotizacionNum}_${(cotizacion.nombreCliente || cotizacion.cliente || "Cliente").replace(/\s/g, "_")}_${fecha.replace(/\//g, "-")}.pdf`,
    image: { type: "jpeg", quality: 0.98 },
    html2canvas: { scale: 2 },
    jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
    pagebreak: { mode: ["avoid-all"] },
  };

  html2pdf().set(opt).from(htmlCompleto).save();
}
