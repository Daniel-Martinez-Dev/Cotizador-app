// src/pages/PreviewPage.jsx
import React, { useEffect, useState } from "react";
import { useQuote } from "../context/QuoteContext";
import { useNavigate } from "react-router-dom";
import { generarPDFReact } from "../utils/pdfReact";
import { generarSeccionesHTML } from "../utils/htmlSections";
import { obtenerEmpresaPorNIT, crearEmpresa, actualizarEmpresa, listarEmpresas, listarContactos, buscarContactoPorEmail, crearContacto, actualizarContacto } from "../utils/firebaseCompanies";
import toast from "react-hot-toast";
import ReactQuill from "react-quill";
import "react-quill/dist/quill.snow.css";
import imagenesPorProducto from "../data/imagenesPorProducto";

export default function PreviewPage() {
  const { quoteData, setQuoteData,
    empresas, setEmpresas, empresaSeleccionada, setEmpresaSeleccionada, contactoSeleccionado, setContactoSeleccionado, confirm } = useQuote();
  const navigate = useNavigate();
  const [secciones, setSecciones] = useState([]);
  const [editando, setEditando] = useState(null);
  const [ediciones, setEdiciones] = useState({});
const { imagenSeleccionada, setImagenSeleccionada, imagenesSeleccionadas, setImagenesSeleccionadas } = useQuote();
  const [imagenBase64, setImagenBase64] = useState("");

  // Cleanup al desmontar (volver al menú) para evitar persistencia de imágenes previas
  useEffect(() => {
    return () => {
      setImagenSeleccionada(null);
      setImagenesSeleccionadas([]);
    };
  }, []);

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
  }, [quoteData]);

  // Cambios de producto -> recargar imagen principal filtrada y limpiar extras
  useEffect(() => {
    if (imagenesDisponibles.length > 0) {
      const primera = imagenesDisponibles[0][0];
      setImagenSeleccionada(primera);
      setImagenesSeleccionadas([]); // limpiar extras
      cargarImagen(primera);
    } else {
      setImagenSeleccionada(null);
      setImagenesSeleccionadas([]);
      setImagenBase64("");
    }
  }, [nombreProducto]);

  const cargarImagen = async (clave) => {
    const promesa = imagenesPorProducto[clave];
    if (!promesa) return;
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
  // Estado local para contactos de la empresa seleccionada
  const [contactosEmpresa, setContactosEmpresa] = useState([]);
  const [cargandoEmpresas, setCargandoEmpresas] = useState(false);
  const [cargandoContactos, setCargandoContactos] = useState(false);
  // Formularios rápidos
  const [showNuevaEmpresa, setShowNuevaEmpresa] = useState(false);
  const [showNuevoContacto, setShowNuevoContacto] = useState(false);
  const [nuevaEmpresa, setNuevaEmpresa] = useState({ nombre:"", nit:"", ciudad:"" });
  const [nuevoContacto, setNuevoContacto] = useState({ nombre:"", email:"", telefono:"" });

  // Cargar empresas al entrar si no están
  useEffect(()=>{
    async function cargar(){
      if(empresas.length===0){
        setCargandoEmpresas(true);
        try { const lista = await listarEmpresas(); setEmpresas(lista); } catch(e){ console.error(e);} finally { setCargandoEmpresas(false);} }
    }
    cargar();
  }, []);

  // Cuando cambia la empresa seleccionada -> cargar contactos
  useEffect(()=>{
    async function cargarContactos(){
      if(!empresaSeleccionada){ setContactosEmpresa([]); return; }
      setCargandoContactos(true);
      try { const lista = await listarContactos(empresaSeleccionada.id); setContactosEmpresa(lista); }
      catch(e){ console.error(e); }
      finally { setCargandoContactos(false); }
    }
    cargarContactos();
  }, [empresaSeleccionada]);

  // Actualizar form cuando seleccionamos empresa
  useEffect(()=>{
    if(empresaSeleccionada){
      setFormCliente(f=>({
        ...f,
        nombreCliente: empresaSeleccionada.nombre || f.nombreCliente,
        clienteNIT: empresaSeleccionada.nit || f.clienteNIT,
        clienteCiudad: empresaSeleccionada.ciudad || f.clienteCiudad,
      }));
    }
  }, [empresaSeleccionada]);

  // Actualizar form cuando seleccionamos contacto
  useEffect(()=>{
    if(contactoSeleccionado){
      setFormCliente(f=>({
        ...f,
        clienteContacto: contactoSeleccionado.nombre || f.clienteContacto,
        clienteEmail: contactoSeleccionado.email || f.clienteEmail,
        clienteTelefono: contactoSeleccionado.telefono || f.clienteTelefono,
      }));
    }
  }, [contactoSeleccionado]);
  // Legacy clienteSeleccionado removido

  const handleChangeCliente = (e) => {
    const { name, value } = e.target;
    setFormCliente((prev) => ({ ...prev, [name]: value }));
  };

  const guardarDatosCliente = async () => {
    const ok = await confirm('Se sobrescribirán los datos del cliente (empresa y/o contacto).\n¿Deseas continuar?');
    if(!ok) return;
    // Persistencia con nuevo modelo Empresa/Contacto basado en NIT + email contacto.
    setQuoteData(prev => ({ ...prev, ...formCliente }));
    const nit = formCliente.clienteNIT?.trim();
    const nombreEmpresa = formCliente.nombreCliente?.trim();
    const ciudad = formCliente.clienteCiudad?.trim();
    const emailContacto = formCliente.clienteEmail?.trim();
    const telefonoContacto = formCliente.clienteTelefono?.trim();
    const nombreContacto = formCliente.clienteContacto?.trim();

  if(!nit){ toast.error('NIT requerido ahora'); return; }

    try {
      // Empresa por NIT
      let empresa = await obtenerEmpresaPorNIT(nit);
      if(!empresa){
        const empresaId = await crearEmpresa({ nit, nombre: nombreEmpresa, ciudad });
        empresa = { id: empresaId, nit, nombre: nombreEmpresa, ciudad };
        toast.success("Empresa creada");
      } else {
        // Posible actualización de nombre/ciudad
        const cambios = {};
        if(nombreEmpresa && nombreEmpresa !== empresa.nombre) cambios.nombre = nombreEmpresa;
        if(ciudad && ciudad !== empresa.ciudad) cambios.ciudad = ciudad;
        if(Object.keys(cambios).length){ await actualizarEmpresa(empresa.id, cambios); }
      }

      // Contacto: buscamos por email si hay email, si no por nombre (simple)
      let contacto = null;
      if(emailContacto){
        contacto = await buscarContactoPorEmail(empresa.id, emailContacto);
      }
      if(!contacto && nombreContacto){
        // Cargar contactos y buscar coincidencia por nombre
        const listaC = await listarContactos(empresa.id);
        contacto = listaC.find(c=> c.nombre?.toLowerCase() === nombreContacto.toLowerCase());
      }
      if(!contacto){
        const contactoId = await crearContacto(empresa.id, { nombre: nombreContacto, email: emailContacto, telefono: telefonoContacto });
        contacto = { id: contactoId, nombre: nombreContacto, email: emailContacto, telefono: telefonoContacto };
  toast.success("Contacto creado");
      } else {
        const cambiosC = {};
        if(nombreContacto && nombreContacto !== contacto.nombre) cambiosC.nombre = nombreContacto;
        if(emailContacto && emailContacto !== contacto.email) cambiosC.email = emailContacto;
        if(telefonoContacto && telefonoContacto !== contacto.telefono) cambiosC.telefono = telefonoContacto;
        if(Object.keys(cambiosC).length){ await actualizarContacto(empresa.id, contacto.id, cambiosC); }
  toast.success("Contacto actualizado (sobrescrito)");
      }

      // Actualizar caches en contexto
      const listaEmp = await listarEmpresas();
      setEmpresas(listaEmp);
      setEmpresaSeleccionada(listaEmp.find(e=> e.id===empresa.id) || empresa);
      setContactoSeleccionado(contacto);

    } catch(e){
      console.error("Error guardando empresa/contacto", e);
      toast.error("Error guardando empresa/contacto");
    } finally {
      setEditandoCliente(false);
    }
  };

  const handleEditar = (campo) => setEditando(campo);
  const handleGuardar = () => setEditando(null);

  const renderCampo = (label, campo) => (
    <div className="bg-white shadow-md rounded-2xl p-6 border border-gray-200 force-light">
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
  <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6 text-gray-900 dark:text-gray-100">
      {estaEditando && (
        <div className="bg-yellow-100 border-l-4 border-yellow-600 text-yellow-800 px-4 py-3 mb-4 rounded shadow">
          <strong>Modo edición:</strong> Estás editando la cotización {""}
          <span className="font-bold">#{quoteData.numero}</span>. Los cambios se sobrescribirán al generar el PDF.
        </div>
      )}

  <div className="bg-white shadow-md rounded-2xl p-6 border border-gray-200 space-y-4 force-light">
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
              <label className="text-xs font-semibold text-gray-800 dark:text-gray-900">Nombre Cliente</label>
              <input name="nombreCliente" value={formCliente.nombreCliente} onChange={handleChangeCliente} className="border rounded px-3 py-2 bg-white dark:bg-gris-800 dark:border-gris-600 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/60 transition" />
            </div>
            <div className="flex flex-col">
              <label className="text-xs font-semibold text-gray-800 dark:text-gray-900">Contacto</label>
              <input name="clienteContacto" value={formCliente.clienteContacto} onChange={handleChangeCliente} className="border rounded px-3 py-2 bg-white dark:bg-gris-800 dark:border-gris-600 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/60 transition" />
            </div>
            <div className="flex flex-col">
              <label className="text-xs font-semibold text-gray-800 dark:text-gray-900">NIT</label>
              <input name="clienteNIT" value={formCliente.clienteNIT} onChange={handleChangeCliente} className="border rounded px-3 py-2 bg-white dark:bg-gris-800 dark:border-gris-600 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/60 transition" />
            </div>
            <div className="flex flex-col">
              <label className="text-xs font-semibold text-gray-800 dark:text-gray-900">Ciudad</label>
              <input name="clienteCiudad" value={formCliente.clienteCiudad} onChange={handleChangeCliente} className="border rounded px-3 py-2 bg-white dark:bg-gris-800 dark:border-gris-600 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/60 transition" />
            </div>
            <div className="flex flex-col">
              <label className="text-xs font-semibold text-gray-800 dark:text-gray-900">Email</label>
              <input name="clienteEmail" value={formCliente.clienteEmail} onChange={handleChangeCliente} className="border rounded px-3 py-2 bg-white dark:bg-gris-800 dark:border-gris-600 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/60 transition" />
            </div>
            <div className="flex flex-col">
              <label className="text-xs font-semibold text-gray-800 dark:text-gray-900">Teléfono</label>
              <input name="clienteTelefono" value={formCliente.clienteTelefono} onChange={handleChangeCliente} className="border rounded px-3 py-2 bg-white dark:bg-gris-800 dark:border-gris-600 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/60 transition" />
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
  <div className="bg-white shadow-md rounded-2xl p-6 border border-gray-200 space-y-4 force-light">
          <h2 className="text-xl font-semibold text-gray-800 mb-2">Imágenes</h2>
          <div>
            <label className="block mb-2 text-sm font-medium text-gray-800">Imagen principal (según categoría)</label>
            <select
              value={imagenSeleccionada || ""}
              onChange={(e)=>{ setImagenSeleccionada(e.target.value); cargarImagen(e.target.value); }}
              className="px-4 py-2 border rounded w-full sm:w-auto"
            >
              {imagenesDisponibles.map(([key]) => (
                <option key={key} value={key}>{key}</option>
              ))}
            </select>
            {imagenBase64 && (
              <img src={imagenBase64} alt="principal" className="mt-3 max-h-40 object-contain border rounded" />
            )}
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-gray-800">Imágenes adicionales (máx 2)</label>
              <button
                type="button"
                disabled={imagenesSeleccionadas.length >= 2}
                onClick={() => setImagenesSeleccionadas(prev => [...prev, ""])}
                className={`px-3 py-1.5 text-sm rounded border ${imagenesSeleccionadas.length >=2 ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed':'bg-blue-600 text-white border-blue-600 hover:bg-blue-700'}`}
              >+ Añadir</button>
            </div>
            {imagenesSeleccionadas.length === 0 && (
              <p className="text-xs text-gray-600">No has agregado imágenes extra.</p>
            )}
            <div className="space-y-3">
              {imagenesSeleccionadas.map((clave, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <select
                    value={clave}
                    onChange={(e)=>{
                      const val = e.target.value;
                      setImagenesSeleccionadas(prev => prev.map((c,i)=> i===idx ? val : c));
                    }}
                    className="px-3 py-2 border rounded flex-1"
                  >
                    <option value="">-- Seleccionar --</option>
                    {Object.keys(imagenesPorProducto).map(k => (
                      <option key={k} value={k}>{k}</option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={()=> setImagenesSeleccionadas(prev => prev.filter((_,i)=> i!==idx))}
                    className="text-red-600 text-sm px-2 py-1 border border-red-300 rounded hover:bg-red-50"
                  >✕</button>
                </div>
              ))}
            </div>
          </div>

          {imagenesSeleccionadas.filter(Boolean).length > 0 && (
            <div className="flex flex-row gap-4 pt-2 flex-wrap">
              {imagenesSeleccionadas.filter(Boolean).map(clave => (
                <div key={clave} className="flex flex-col items-center w-32">
                  <img src={imagenesPorProducto[clave]} alt={clave} className="h-24 object-contain border rounded w-full bg-white" />
                  <span className="mt-1 text-[10px] text-gray-600 text-center truncate w-full" title={clave}>{clave}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

  <div className="bg-white shadow-md rounded-2xl p-6 border border-gray-200 overflow-x-auto force-light">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">Detalle de Precios</h2>
        <div dangerouslySetInnerHTML={{ __html: ediciones.tablaHTML }} />
      </div>

  {renderCampo("Condiciones Comerciales", "condicionesHTML")}
  {renderCampo("Términos y Condiciones Generales", "terminosHTML")}

  <div className="bg-white shadow-md rounded-2xl p-6 border border-gray-200 text-right force-light">
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
              { ...quoteData, secciones: [ediciones], imagenSeleccionada, imagenesSeleccionadas: imagenesSeleccionadas.filter(Boolean).slice(0,2) },
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
