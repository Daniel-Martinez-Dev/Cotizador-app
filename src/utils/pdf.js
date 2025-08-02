// src/utils/pdf.js

import html2pdf from "html2pdf.js";
import { getNextQuoteNumber } from "./quoteNumberFirebase";
import { guardarCotizacionEnFirebase } from "./firebaseQuotes";
import toast from "react-hot-toast";
import { generarSeccionesHTML } from "./htmlSections"; // ✅ con llaves
import { getDocs, query, collection, where } from "firebase/firestore"; // ya debes tener importado db

export async function generarPDF(cotizacion) {
  const {
    productos,
    nombreCliente,
    cliente,
    secciones = [],
    subtotal,
    iva,
    total
  } = cotizacion;

  // 👇 obtenemos la primera (y única) sección editada
  const {
    descripcionHTML = "",
    especificacionesHTML = "",
    tablaHTML = "",
    condicionesHTML = "",
    terminosHTML = ""
  } = secciones[0] || {};

  const cotizacionNum = await getNextQuoteNumber();
  const fecha = new Date().toLocaleDateString("es-CO").replace(/\//g, "-");
  const nombreArchivo = `Cotizacion#${cotizacionNum}_${(nombreCliente || cliente || "Cliente").replace(/\s/g, "_")}_${fecha}.pdf`;

  try {
    // Verificar si ya existe una cotización con ese número
    const existe = await getDocs(
      query(collection(db, "cotizaciones"), where("numero", "==", cotizacionNum))
    );

    if (!existe.empty) {
      toast.error(`Ya existe la cotización #${cotizacionNum}. No se guardó duplicado.`);
    } else {
      await guardarCotizacionEnFirebase(cotizacion, cotizacionNum);
      toast.success(`Cotización #${cotizacionNum} guardada`);
    }
  } catch (error) {
    toast.error("Error al guardar la cotización");
  } 

  const container = document.createElement("div");
  container.style.padding = "30px";
  container.style.fontFamily = "Arial, sans-serif";
  container.innerHTML = `
    <div style="font-family:'Segoe UI', sans-serif; max-width:800px; margin:0 auto; font-size:14px; color:#333;">
      <div style="text-align:right; font-size:12px;">
        <strong>Fecha:</strong> ${fecha}<br/>
        <strong>Cotización No.:</strong> ${cotizacionNum}
      </div>

      <h2 style="color:#1a3357; font-size:20px; border-bottom:2px solid #1a3357; padding-bottom:4px; margin-top:20px;">
        COTIZACIÓN DE ${productos?.[0]?.tipo?.toUpperCase() || 'PRODUCTOS'}
      </h2>

      <p><strong>Cliente:</strong> ${nombreCliente || cliente}</p>
      <p><strong>Contacto:</strong> _________________________</p>
      <p><strong>NIT:</strong> _________________________</p>
      <p><strong>Ciudad:</strong> _________________________</p>

      <div style="margin-top:30px;">
        <h3 style="color:#1a3357; border-bottom:1px solid #ccc; padding-bottom:4px;">Descripción General</h3>
        ${descripcionHTML}
      </div>

      <div style="margin-top:30px;">
        <h3 style="color:#1a3357; border-bottom:1px solid #ccc; padding-bottom:4px;">Especificaciones Técnicas</h3>
        ${especificacionesHTML}
      </div>

      <div style="margin-top:30px;">
        <h3 style="color:#1a3357; border-bottom:1px solid #ccc; padding-bottom:4px;">Detalle de Precios</h3>
        ${tablaHTML}
      </div>

      <div style="margin-top:30px;">
        <h3 style="color:#1a3357; border-bottom:1px solid #ccc; padding-bottom:4px;">Condiciones Comerciales</h3>
        ${condicionesHTML}
      </div>

      <div style="margin-top:30px;">
        <h3 style="color:#1a3357; border-bottom:1px solid #ccc; padding-bottom:4px;">Términos y Condiciones Generales</h3>
        ${terminosHTML}
      </div>

      <div style="text-align:center; font-size:10px; color:#999; margin-top:40px;">
        Cotización generada por COLD CHAIN SERVICES S.A.S. Carrera 4 #1-04, Subachoque, Cundinamarca.<br/>
        www.ccservices.com.co – Tel. 3008582709 – comercial@ccservices.com.co
      </div>
    </div>
  `;

  html2pdf()
    .from(container)
    .set({
      margin: 0.5,
      filename: nombreArchivo,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2 },
      jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' }
    })
    .save();
}

