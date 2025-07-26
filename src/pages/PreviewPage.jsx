// src/pages/PreviewPage.jsx

import React, { useState } from "react";
import { useQuote } from "../context/QuoteContext";
import { useNavigate } from "react-router-dom";
import { generarSeccionesHTML } from "../utils/htmlSections";
import { generarPDF } from "../utils/pdf";
import EditableSection from "../components/EditableSection";
import parse from "html-react-parser";

export default function PreviewPage() {
  const { quoteData } = useQuote();
  const navigate = useNavigate();

  if (!quoteData || !quoteData.productos) {
    return (
      <div className="p-8">
        <h2 className="text-2xl">No hay cotización para mostrar</h2>
        <button
          onClick={() => navigate("/")}
          className="mt-4 bg-blue-500 text-white px-4 py-2 rounded"
        >
          Volver
        </button>
      </div>
    );
  }

  // Generar HTML por secciones
  const secciones = generarSeccionesHTML(quoteData);

  const [descripcionHTML, setDescripcionHTML] = useState(secciones.descripcionHTML);
  const [especificacionesHTML, setEspecificacionesHTML] = useState(secciones.especificacionesHTML);
  const [tablaHTML, setTablaHTML] = useState(secciones.tablaHTML);
  const [condicionesHTML, setCondicionesHTML] = useState(secciones.condicionesHTML);
  const [terminosHTML, setTerminosHTML] = useState(secciones.terminosHTML);

  const handleDescargarPDF = () => {
    generarPDF({
      ...quoteData,
      descripcionHTML,
      especificacionesHTML,
      tablaHTML,
      condicionesHTML,
      terminosHTML
    });
  };

  return (
    <div className="max-w-5xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Vista previa de la cotización</h1>

      <EditableSection
        title="1. Descripción General"
        html={descripcionHTML}
        openByDefault={false}
        onChange={setDescripcionHTML}
        displayContent={parse(descripcionHTML)}
      />

      <EditableSection
        title="2. Especificaciones Técnicas"
        html={especificacionesHTML}
        openByDefault={false}
        onChange={setEspecificacionesHTML}
        displayContent={parse(especificacionesHTML)}
      />

      <EditableSection
        title="3. Detalle de Precios"
        html={tablaHTML}
        openByDefault={true}
        onChange={setTablaHTML}
        displayContent={parse(tablaHTML)}
      />

      <EditableSection
        title="4. Condiciones Comerciales"
        html={condicionesHTML}
        openByDefault={false}
        onChange={setCondicionesHTML}
        displayContent={parse(condicionesHTML)}
      />

      <EditableSection
        title="5. Términos y Condiciones Generales"
        html={terminosHTML}
        openByDefault={false}
        onChange={setTerminosHTML}
        displayContent={parse(terminosHTML)}
      />

      <div className="flex gap-4 mt-6">
        <button
          className="bg-blue-500 text-white px-4 py-2 rounded"
          onClick={() => navigate("/")}
        >
          Editar cotización
        </button>
        <button
          className="bg-green-700 text-white px-4 py-2 rounded"
          onClick={handleDescargarPDF}
        >
          Descargar PDF
        </button>
        <button
          onClick={() => navigate("/historial")}
          className="bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700"
        >
          Ver Historial
        </button>
      </div>
    </div>
  );
}
