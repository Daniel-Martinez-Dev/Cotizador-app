// src/pages/PreviewPage.jsx
import React, { useEffect, useState } from "react";
import { useQuote } from "../context/QuoteContext";
import { useNavigate } from "react-router-dom";
import { generarPDFReact } from "../utils/pdfReact";
import { generarSeccionesHTML } from "../utils/htmlSections";
import ReactQuill from "react-quill";
import "react-quill/dist/quill.snow.css";
import imagenesPorProducto from "../data/imagenesPorProducto";

export default function PreviewPage() {
  const { quoteData, setQuoteData, clienteSeleccionado } = useQuote();
  const navigate = useNavigate();
  const [secciones, setSecciones] = useState([]);
  const [editando, setEditando] = useState(null);
  const [ediciones, setEdiciones] = useState({});
const { imagenSeleccionada, setImagenSeleccionada } = useQuote();
  const [imagenBase64, setImagenBase64] = useState("");

  const producto = quoteData?.productos?.[0];
  const nombreProducto = producto?.nombreSeleccionado || producto?.tipo || "";
  const imagenesDisponibles = Object.entries(imagenesPorProducto).filter(([key]) =>
    key.toLowerCase().includes(nombreProducto.toLowerCase())
  );

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

    if (imagenesDisponibles.length > 0) {
      const primera = imagenesDisponibles[0][0];
      setImagenSeleccionada(primera);
      cargarImagen(primera);
    }
  }, [quoteData]);

  const cargarImagen = async (clave) => {
    const promesa = imagenesPorProducto[clave];
    const base64 = await promesa;
    setImagenBase64(base64);
  };

  const estaEditando = quoteData?.modoEdicion === true;
  const { cliente, subtotal, iva, total, nombreCliente, clienteContacto, clienteNIT, clienteCiudad, clienteEmail, clienteTelefono } = quoteData;
  const [editandoCliente, setEditandoCliente] = useState(false);
  const [formCliente, setFormCliente] = useState({
    nombreCliente: nombreCliente || "",
    clienteContacto: clienteContacto || "",
    clienteNIT: clienteNIT || "",
    clienteCiudad: clienteCiudad || "",
    clienteEmail: clienteEmail || "",
    clienteTelefono: clienteTelefono || "",
  });
  useEffect(()=>{
    if(clienteSeleccionado){
      setFormCliente(f=>({
        ...f,
        nombreCliente: clienteSeleccionado.nombre || f.nombreCliente,
        clienteContacto: clienteSeleccionado.contacto || f.clienteContacto,
        clienteNIT: clienteSeleccionado.nit || f.clienteNIT,
        clienteCiudad: clienteSeleccionado.ciudad || f.clienteCiudad,
        clienteEmail: clienteSeleccionado.email || f.clienteEmail,
        clienteTelefono: clienteSeleccionado.telefono || f.clienteTelefono,
      }));
    }
  }, [clienteSeleccionado]);

  const handleChangeCliente = (e) => {
    const { name, value } = e.target;
    setFormCliente((prev) => ({ ...prev, [name]: value }));
  };

  const guardarDatosCliente = () => {
    setQuoteData(prev => ({ ...prev, ...formCliente }));
    setEditandoCliente(false);
  };

  const handleEditar = (campo) => setEditando(campo);
  const handleGuardar = () => setEditando(null);

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
                ["clean"],
              ],
            }}
            formats={["header", "bold", "italic", "underline", "list", "bullet", "link"]}
          />
          <button
            className="mt-4 bg-green-600 text-white px-4 py-2 rounded"
            onClick={handleGuardar}
          >
            Guardar
          </button>
        </>
      ) : (
        <div>
          <div
            className="mb-2 prose max-w-none"
            dangerouslySetInnerHTML={{ __html: ediciones[campo] || "" }}
          />
          <button
            className="mt-2 bg-blue-500 text-white px-4 py-2 rounded"
            onClick={() => handleEditar(campo)}
          >
            Editar
          </button>
        </div>
      )}
    </div>
  );

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {estaEditando && (
        <div className="bg-yellow-100 border-l-4 border-yellow-600 text-yellow-800 px-4 py-3 mb-4 rounded shadow">
          <strong>Modo edición:</strong> Estás editando la cotización{" "}
          <span className="font-bold">#{quoteData.numero}</span>. Los cambios se sobrescribirán
          al generar el PDF.
        </div>
      )}

      <div className="bg-white shadow-md rounded-2xl p-6 border border-gray-200 space-y-4">
        <h1 className="text-2xl font-bold">Vista previa de la cotización</h1>
        {!editandoCliente ? (
          <div className="text-sm sm:text-base space-y-1">
            <div><span className="font-semibold">Cliente:</span> {formCliente.nombreCliente || cliente || "—"}</div>
            <div><span className="font-semibold">Contacto:</span> {formCliente.clienteContacto || "—"}</div>
            <div><span className="font-semibold">NIT:</span> {formCliente.clienteNIT || "—"}</div>
            <div><span className="font-semibold">Ciudad:</span> {formCliente.clienteCiudad || "—"}</div>
            <div><span className="font-semibold">Email:</span> {formCliente.clienteEmail || "—"}</div>
            <div><span className="font-semibold">Teléfono:</span> {formCliente.clienteTelefono || "—"}</div>
            <button
              onClick={() => setEditandoCliente(true)}
              className="mt-3 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
            >Editar Datos Cliente</button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex flex-col">
              <label className="text-xs font-semibold text-gray-600">Nombre Cliente</label>
              <input name="nombreCliente" value={formCliente.nombreCliente} onChange={handleChangeCliente} className="border rounded px-3 py-2" />
            </div>
            <div className="flex flex-col">
              <label className="text-xs font-semibold text-gray-600">Contacto</label>
              <input name="clienteContacto" value={formCliente.clienteContacto} onChange={handleChangeCliente} className="border rounded px-3 py-2" />
            </div>
            <div className="flex flex-col">
              <label className="text-xs font-semibold text-gray-600">NIT</label>
              <input name="clienteNIT" value={formCliente.clienteNIT} onChange={handleChangeCliente} className="border rounded px-3 py-2" />
            </div>
            <div className="flex flex-col">
              <label className="text-xs font-semibold text-gray-600">Ciudad</label>
              <input name="clienteCiudad" value={formCliente.clienteCiudad} onChange={handleChangeCliente} className="border rounded px-3 py-2" />
            </div>
            <div className="flex flex-col">
              <label className="text-xs font-semibold text-gray-600">Email</label>
              <input name="clienteEmail" value={formCliente.clienteEmail} onChange={handleChangeCliente} className="border rounded px-3 py-2" />
            </div>
            <div className="flex flex-col">
              <label className="text-xs font-semibold text-gray-600">Teléfono</label>
              <input name="clienteTelefono" value={formCliente.clienteTelefono} onChange={handleChangeCliente} className="border rounded px-3 py-2" />
            </div>
            <div className="col-span-full flex gap-3 mt-2">
              <button onClick={guardarDatosCliente} className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700">Guardar</button>
              <button onClick={() => { setEditandoCliente(false); setFormCliente(prev=>({...prev})); }} className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600">Cancelar</button>
            </div>
          </div>
        )}
      </div>

      {renderCampo("Descripción del Producto", "descripcionHTML")}
      {renderCampo("Especificaciones Técnicas", "especificacionesHTML")}

      {imagenesDisponibles.length > 0 && (
        <div className="bg-white shadow-md rounded-2xl p-6 border border-gray-200 text-center">
          <label className="block mb-2 font-medium text-gray-700">Selecciona una imagen:</label>
          <select
            value={imagenSeleccionada || ""}
            onChange={(e) => {
              setImagenSeleccionada(e.target.value);
              cargarImagen(e.target.value);
            }}
            className="mb-4 px-4 py-2 border rounded"
          >
            {imagenesDisponibles.map(([key]) => (
              <option key={key} value={key}>
                {key}
              </option>
            ))}
          </select>
          {imagenBase64 && (
            <div>
              <img
                src={imagenBase64}
                alt="Producto"
                className="max-w-xs mx-auto border rounded"
              />
              <p className="mt-2 text-sm text-gray-500">Imagen referencial del producto</p>
            </div>
          )}
        </div>
      )}

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
          onClick={() =>
            generarPDFReact(
              { ...quoteData, secciones: [ediciones], imagenSeleccionada },
              estaEditando
            )
          }
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
