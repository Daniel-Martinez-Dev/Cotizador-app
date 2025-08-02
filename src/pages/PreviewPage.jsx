// src/pages/PreviewPage.jsx

import React, { useEffect, useState } from "react";
import { useQuote } from "../context/QuoteContext";
import { useNavigate } from "react-router-dom";
import { generarPDFReact } from "../utils/pdfReact";
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
      console.log("Productos recibidos en PreviewPage:", quoteData.productos);
      try {
        const generadas = generarSeccionesHTML(quoteData);
        setSecciones([generadas]);
        setEdiciones(generadas);
      } catch (error) {
        console.error("Error generando secciones HTML:", error);
      }
    }
  }, [quoteData]);

const estaEditando = quoteData?.modoEdicion === true;

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
    
    <div className="bg-white shadow-md rounded-2xl p-6 border border-gray-200">
      <h2 className="text-xl font-semibold text-gray-800 mb-4">{label}</h2>
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
            className="mt-4 bg-green-600 text-white px-4 py-2 rounded"
            onClick={handleGuardar}
          >Guardar</button>
        </>
      ) : (
        <div>
          <div className="mb-2 prose max-w-none" dangerouslySetInnerHTML={{ __html: ediciones[campo] || "" }} />
          <button
            className="mt-2 bg-blue-500 text-white px-4 py-2 rounded"
            onClick={() => handleEditar(campo)}
          >Editar</button>
        </div>
      )}
    </div>
  );
return (
  <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
    {estaEditando && (
      <div className="bg-yellow-100 border-l-4 border-yellow-600 text-yellow-800 px-4 py-3 mb-4 rounded shadow">
        <strong>Modo edición:</strong> Estás editando la cotización <span className="font-bold">#{quoteData.numero}</span>. Los cambios se sobrescribirán al generar el PDF.
      </div>
    )}

    <div className="bg-white shadow-md rounded-2xl p-6 border border-gray-200">
      <h1 className="text-2xl font-bold mb-4">Vista previa de la cotización</h1>
      <div>
        <span className="font-semibold">Cliente:</span> {nombreCliente || cliente}
      </div>
    </div>

      {renderCampo("Descripción del Producto", "descripcionHTML")}
      {renderCampo("Especificaciones Técnicas", "especificacionesHTML")}

      <div className="bg-white shadow-md rounded-2xl p-6 border border-gray-200 overflow-x-auto">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">Detalle de Precios</h2>
        <div dangerouslySetInnerHTML={{ __html: ediciones.tablaHTML }} />
      </div>

      {renderCampo("Condiciones Comerciales", "condicionesHTML")}
      {renderCampo("Términos y Condiciones Generales", "terminosHTML")}

      <div className="bg-white shadow-md rounded-2xl p-6 border border-gray-200 text-right">
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
          onClick={() => generarPDFReact({ ...quoteData, secciones: [ediciones] }, estaEditando)}
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
