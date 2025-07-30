// src/pages/PreviewPage.jsx

import React, { useEffect, useState } from "react";
import { useQuote } from "../context/QuoteContext";
import { useNavigate } from "react-router-dom";
import { generarPDF } from "../utils/pdf";
import { generarSeccionesHTML } from "../utils/htmlSections";
import ReactQuill from "react-quill";
import 'react-quill/dist/quill.snow.css';

export default function PreviewPage() {
  const { quoteData } = useQuote();
  const navigate = useNavigate();
  const [secciones, setSecciones] = useState([]);
  const [editando, setEditando] = useState(null);
  const [ediciones, setEdiciones] = useState({});

  useEffect(() => {
    if (quoteData?.productos) {
      try {
        const generadas = generarSeccionesHTML(quoteData);
        setSecciones([generadas]);
        setEdiciones(generadas);
      } catch (error) {
        console.error("Error generando secciones HTML:", error);
      }
    }
  }, [quoteData]);

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

  const { cliente, subtotal, iva, total, nombreCliente } = quoteData;

  const handleEditar = (campo) => {
    setEditando(campo);
  };

  const handleGuardar = () => {
    setEditando(null);
  };

  const renderCampo = (label, campo) => (
    <div className="mb-10">
      <h2 className="text-xl font-bold text-blue-900 mb-4 border-b pb-2 uppercase">{label}</h2>
      {editando === campo ? (
        <>
          <ReactQuill
            theme="snow"
            value={ediciones[campo] || ""}
            onChange={(value) => setEdiciones({ ...ediciones, [campo]: value })}
            modules={{
              toolbar: [
                [{ header: [1, 2, 3, false] }],
                ["bold", "italic", "underline"],
                [{ list: "ordered" }, { list: "bullet" }],
                ["link"],
                ["clean"]
              ]
            }}
            formats={[
              "header",
              "bold",
              "italic",
              "underline",
              "list",
              "bullet",
              "link"
            ]}
          />
          <button
            className="mt-2 bg-green-600 text-white px-4 py-1 rounded"
            onClick={handleGuardar}
          >Guardar</button>
        </>
      ) : (
        <div className="mb-4 whitespace-pre-wrap">
          <div dangerouslySetInnerHTML={{ __html: ediciones[campo] || "" }} />
          <button
            className="mt-2 bg-blue-500 text-white px-4 py-1 rounded"
            onClick={() => handleEditar(campo)}
          >Editar</button>
        </div>
      )}
    </div>
  );

  return (
    <div className="max-w-5xl mx-auto p-8 bg-white rounded-lg shadow-lg">
      <h1 className="text-2xl font-bold mb-6">Vista previa de la cotización</h1>
      <div className="mb-4">
        <span className="font-semibold">Cliente:</span> {nombreCliente || cliente}
      </div>

      {renderCampo("Descripción", "descripcionHTML")}
      {renderCampo("Especificaciones", "especificacionesHTML")}
      <div className="mb-10">
        <h2 className="text-xl font-bold text-blue-900 mb-4 border-b pb-2 uppercase">Detalle de precios</h2>
        <div dangerouslySetInnerHTML={{ __html: ediciones.tablaHTML }} />
      </div>
      {renderCampo("Condiciones Comerciales", "condicionesHTML")}
      {renderCampo("Términos Generales", "terminosHTML")}

      <div className="text-right mr-3 mb-6">
        <div>
          <span className="font-semibold">Subtotal: </span>
          {(subtotal || 0).toLocaleString("es-CO", { style: "currency", currency: "COP" })}
        </div>
        <div>
          <span className="font-semibold">IVA (19%): </span>
          {(iva || 0).toLocaleString("es-CO", { style: "currency", currency: "COP" })}
        </div>
        <div className="text-lg font-bold">
          Total: {(total || 0).toLocaleString("es-CO", { style: "currency", currency: "COP" })}
        </div>
      </div>

      <div className="flex flex-wrap gap-4">
        <button
          className="bg-blue-500 text-white px-4 py-2 rounded"
          onClick={() => navigate("/")}
        >
          Editar cotización
        </button>
        <button
          className="bg-green-700 text-white px-4 py-2 rounded"
          onClick={() => generarPDF({ ...quoteData, secciones: [ediciones] })}
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
