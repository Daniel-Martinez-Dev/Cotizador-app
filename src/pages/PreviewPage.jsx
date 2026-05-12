// src/pages/PreviewPage.jsx
import React, { useEffect, useState, useMemo } from "react";
import { useQuote } from "../context/QuoteContext";
import { useNavigate } from "react-router-dom";
import { generarPDFReact } from "../utils/pdfReact";
import { generarSeccionesHTML, generarSeccionesPorProducto } from "../utils/htmlSections";
import { sanitizeHtml } from "../utils/sanitizeHtml";
import { obtenerEmpresaPorNIT, crearEmpresa, actualizarEmpresa, listarEmpresas, listarContactos, buscarContactoPorEmail, crearContacto, actualizarContacto } from "../utils/firebaseCompanies";
import toast from "react-hot-toast";
import ReactQuill from "react-quill-new";
import "react-quill-new/dist/quill.snow.css";
import imagenesPorProducto from "../data/imagenesPorProducto";

function generarTituloCompacto(productos) {
  if (!productos?.length) return "COTIZACIÓN";
  const tipos = productos.map(p => (p.tipo || "PRODUCTO").toUpperCase());
  if (tipos.length === 1) return `COTIZACIÓN DE ${tipos[0]}`;
  if (tipos.length === 2) return `COTIZACIÓN DE ${tipos[0]} Y ${tipos[1]}`;
  const resto = tipos.length - 2;
  return `COTIZACIÓN DE ${tipos[0]}, ${tipos[1]} Y ${resto} PRODUCTO${resto > 1 ? 'S' : ''} MÁS`;
}

export default function PreviewPage() {
  const { quoteData, setQuoteData,
    empresas, setEmpresas, empresaSeleccionada, setEmpresaSeleccionada, contactoSeleccionado, setContactoSeleccionado, confirm,
    setImagenSeleccionada, setImagenesSeleccionadas, productosOverride } = useQuote();
  const navigate = useNavigate();

  // --- Estado de edición por producto ---
  // [{tipo, descripcionHTML, especificacionesHTML}]
  const [edicionesPorProducto, setEdicionesPorProducto] = useState([]);
  // {condicionesHTML, terminosHTML}
  const [edicionesCompartidas, setEdicionesCompartidas] = useState({ condicionesHTML: "", terminosHTML: "" });
  // {scope: 'producto'|'compartido', index: number|null, campo: string} | null
  const [editando, setEditando] = useState(null);

  // --- Índice del producto cuyas condiciones se usan ---
  const [condicionesProductoIndex, setCondicionesProductoIndex] = useState(0);

  // --- Imágenes por producto ---
  // [{principal: key|null, adicionales: [key]}]
  const [imagenesPerProducto, setImagenesPerProducto] = useState([]);
  // [string|null] — base64 para preview de imagen principal de cada producto
  const [imagenesBase64Principal, setImagenesBase64Principal] = useState([]);
  const [imagenAmpliada, setImagenAmpliada] = useState(null);

  const [generandoPDF, setGenerandoPDF] = useState(false);
  const [tituloCotizacion, setTituloCotizacion] = useState("");
  const [editandoTitulo, setEditandoTitulo] = useState(false);

  // Limpiar contexto de imagen al desmontar (backward compat)
  useEffect(() => {
    return () => {
      setImagenSeleccionada(null);
      setImagenesSeleccionadas([]);
    };
  }, []);

  // --- Generar secciones por producto al cargar o cambiar quoteData ---
  useEffect(() => {
    if (!quoteData?.productos) return;
    try {
      const porProducto = generarSeccionesPorProducto(quoteData, productosOverride);
      setEdicionesPorProducto(porProducto.map(s => ({
        tipo: s.tipo,
        descripcionHTML: sanitizeHtml(s.descripcionHTML || ""),
        especificacionesHTML: sanitizeHtml(s.especificacionesHTML || ""),
      })));

      const compartidas = generarSeccionesHTML(quoteData, 0, productosOverride);
      setEdicionesCompartidas({
        condicionesHTML: sanitizeHtml(compartidas.condicionesHTML || ""),
        terminosHTML: sanitizeHtml(compartidas.terminosHTML || ""),
      });
      setCondicionesProductoIndex(0);
      setTituloCotizacion(generarTituloCompacto(quoteData.productos));
    } catch (e) {
      console.error("Error generando secciones HTML:", e);
    }
  }, [quoteData, productosOverride]);

  // --- Regenerar condicionesHTML al cambiar el índice del producto ---
  useEffect(() => {
    if (!quoteData?.productos) return;
    try {
      const compartidas = generarSeccionesHTML(quoteData, condicionesProductoIndex, productosOverride);
      setEdicionesCompartidas(prev => ({
        ...prev,
        condicionesHTML: sanitizeHtml(compartidas.condicionesHTML || ""),
      }));
    } catch (e) {
      console.error("Error regenerando condiciones:", e);
    }
  }, [condicionesProductoIndex]);

  // --- Inicializar imágenes por producto ---
  useEffect(() => {
    if (!quoteData?.productos) return;
    const perProd = quoteData.productos.map((prod) => {
      const nombreProd = prod.nombreSeleccionado || prod.tipo || "";
      const disponibles = Object.keys(imagenesPorProducto).filter(k =>
        k.toLowerCase().includes(nombreProd.toLowerCase())
      );
      return { principal: disponibles[0] || null, adicionales: [] };
    });
    setImagenesPerProducto(perProd);
    // Cargar previews base64
    Promise.all(perProd.map(p => p.principal ? Promise.resolve(imagenesPorProducto[p.principal]) : Promise.resolve(null)))
      .then(setImagenesBase64Principal);
  }, [quoteData?.productos?.length]);

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
  const [contactosEmpresa, setContactosEmpresa] = useState([]);
  const [cargandoEmpresas, setCargandoEmpresas] = useState(false);
  const [cargandoContactos, setCargandoContactos] = useState(false);
  const [showNuevaEmpresa, setShowNuevaEmpresa] = useState(false);
  const [showNuevoContacto, setShowNuevoContacto] = useState(false);
  const [nuevaEmpresa, setNuevaEmpresa] = useState({ nombre:"", nit:"", ciudad:"" });
  const [nuevoContacto, setNuevoContacto] = useState({ nombre:"", email:"", telefono:"" });

  useEffect(()=>{
    async function cargar(){
      if(empresas.length===0){
        setCargandoEmpresas(true);
        try { const lista = await listarEmpresas(); setEmpresas(lista); } catch(e){ console.error(e);} finally { setCargandoEmpresas(false);} }
    }
    cargar();
  }, []);

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

  const handleChangeCliente = (e) => {
    const { name, value } = e.target;
    setFormCliente((prev) => ({ ...prev, [name]: value }));
  };

  const guardarDatosCliente = async () => {
    const ok = await confirm('Se sobrescribirán los datos del cliente (empresa y/o contacto).\n¿Deseas continuar?');
    if(!ok) return;
    setQuoteData(prev => ({ ...prev, ...formCliente }));
    const nit = formCliente.clienteNIT?.trim();
    const nombreEmpresa = formCliente.nombreCliente?.trim();
    const ciudad = formCliente.clienteCiudad?.trim();
    const emailContacto = formCliente.clienteEmail?.trim();
    const telefonoContacto = formCliente.clienteTelefono?.trim();
    const nombreContacto = formCliente.clienteContacto?.trim();

    if(!nit){ toast.error('NIT requerido ahora'); return; }

    try {
      let empresa = await obtenerEmpresaPorNIT(nit);
      if(!empresa){
        const empresaId = await crearEmpresa({ nit, nombre: nombreEmpresa, ciudad });
        empresa = { id: empresaId, nit, nombre: nombreEmpresa, ciudad };
        toast.success("Empresa creada");
      } else {
        const cambios = {};
        if(nombreEmpresa && nombreEmpresa !== empresa.nombre) cambios.nombre = nombreEmpresa;
        if(ciudad && ciudad !== empresa.ciudad) cambios.ciudad = ciudad;
        if(Object.keys(cambios).length){ await actualizarEmpresa(empresa.id, cambios); }
      }

      let contacto = null;
      if(emailContacto){
        contacto = await buscarContactoPorEmail(empresa.id, emailContacto);
      }
      if(!contacto && nombreContacto){
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

  const formatCOP = (n) => (n || 0).toLocaleString("es-CO", { style: "currency", currency: "COP" });

  const completitud = useMemo(() => [
    { label: 'Datos del cliente', ok: !!formCliente.nombreCliente && !!formCliente.clienteNIT },
    { label: 'Descripción de productos', ok: edicionesPorProducto.some(e => e.descripcionHTML?.replace(/<[^>]*>/g,'').trim()) },
    { label: 'Especificaciones técnicas', ok: edicionesPorProducto.some(e => e.especificacionesHTML?.replace(/<[^>]*>/g,'').trim()) },
    { label: 'Imágenes', ok: imagenesPerProducto.some(p => p.principal) },
    { label: 'Condiciones comerciales', ok: !!(edicionesCompartidas.condicionesHTML?.replace(/<[^>]*>/g,'').trim()) },
  ], [formCliente, edicionesPorProducto, imagenesPerProducto, edicionesCompartidas]);
  const pct = Math.round(completitud.filter(c => c.ok).length / completitud.length * 100);

  // --- Render campo editable por producto ---
  const quillModules = {
    toolbar: [
      [{ header: [1, 2, 3, false] }],
      ["bold", "italic", "underline"],
      [{ list: "ordered" }, { list: "bullet" }],
      ["link"],
      ["clean"],
    ],
  };
  const quillFormats = ["header", "bold", "italic", "underline", "list", "bullet", "link"];

  const renderCampoProducto = (label, productoIdx, campo) => {
    const isEditing = editando?.scope === 'producto' && editando?.index === productoIdx && editando?.campo === campo;
    const value = edicionesPorProducto[productoIdx]?.[campo] || "";

    return (
      <div className="group relative bg-white shadow-md rounded-2xl p-6 border border-gray-200 force-light">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">{label}</h2>
        {isEditing ? (
          <div className="animate-fadeIn">
            <ReactQuill
              theme="snow"
              value={value}
              onChange={(v) => setEdicionesPorProducto(prev => {
                const next = [...prev];
                next[productoIdx] = { ...next[productoIdx], [campo]: sanitizeHtml(v) };
                return next;
              })}
              modules={quillModules}
              formats={quillFormats}
            />
            <button
              className="mt-4 bg-green-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-green-700 transition-colors"
              onClick={() => setEditando(null)}
            >
              Guardar
            </button>
          </div>
        ) : (
          <div>
            <div
              className="mb-3 prose max-w-none text-gray-700 overflow-x-auto"
              dangerouslySetInnerHTML={{ __html: sanitizeHtml(value) }}
            />
            <button
              className="mt-1 text-sm bg-blue-50 text-blue-600 border border-blue-200 px-3 py-1.5 rounded-lg flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-700 dark:hover:bg-blue-900/50"
              onClick={() => setEditando({ scope: 'producto', index: productoIdx, campo })}
            >
              ✏️ Editar sección
            </button>
          </div>
        )}
      </div>
    );
  };

  // --- Render campo editable compartido ---
  const renderCampoCompartido = (label, campo, headerExtra = null) => {
    const isEditing = editando?.scope === 'compartido' && editando?.campo === campo;
    const value = edicionesCompartidas[campo] || "";

    return (
      <div className="group relative bg-white shadow-md rounded-2xl p-6 border border-gray-200 force-light">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <h2 className="text-xl font-semibold text-gray-800">{label}</h2>
          {headerExtra}
        </div>
        {isEditing ? (
          <div className="animate-fadeIn">
            <ReactQuill
              theme="snow"
              value={value}
              onChange={(v) => setEdicionesCompartidas(prev => ({ ...prev, [campo]: sanitizeHtml(v) }))}
              modules={quillModules}
              formats={quillFormats}
            />
            <button
              className="mt-4 bg-green-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-green-700 transition-colors"
              onClick={() => setEditando(null)}
            >
              Guardar
            </button>
          </div>
        ) : (
          <div>
            <div
              className="mb-3 prose max-w-none text-gray-700 overflow-x-auto"
              dangerouslySetInnerHTML={{ __html: sanitizeHtml(value) }}
            />
            <button
              className="mt-1 text-sm bg-blue-50 text-blue-600 border border-blue-200 px-3 py-1.5 rounded-lg flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-700 dark:hover:bg-blue-900/50"
              onClick={() => setEditando({ scope: 'compartido', index: null, campo })}
            >
              ✏️ Editar sección
            </button>
          </div>
        )}
      </div>
    );
  };

  // --- Render selector de imágenes por producto ---
  const renderImagenesProducto = (idx, prod) => {
    const imgState = imagenesPerProducto[idx] || { principal: null, adicionales: [] };
    const todosKeys = Object.keys(imagenesPorProducto);
    if (todosKeys.length === 0) return null;

    const setPrincipal = (val) => {
      setImagenesPerProducto(prev => {
        const next = [...prev];
        next[idx] = { ...next[idx], principal: val || null };
        return next;
      });
      if (val) {
        Promise.resolve(imagenesPorProducto[val]).then(b64 => {
          setImagenesBase64Principal(prev => { const next = [...prev]; next[idx] = b64; return next; });
        });
      } else {
        setImagenesBase64Principal(prev => { const next = [...prev]; next[idx] = null; return next; });
      }
    };

    return (
      <div className="bg-white shadow-md rounded-2xl p-6 border border-gray-200 space-y-4 force-light">
        <h2 className="text-xl font-semibold text-gray-800">Imágenes — Producto {idx + 1}</h2>

        {/* Imagen principal */}
        <div>
          <label className="block mb-2 text-sm font-medium text-gray-700">Imagen principal</label>
          <select
            value={imgState.principal || ""}
            onChange={(e) => setPrincipal(e.target.value)}
            className="px-4 py-2 border rounded-lg w-full sm:w-auto text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50"
          >
            <option value="">— Sin imagen principal —</option>
            {todosKeys.map(k => (
              <option key={k} value={k}>{k}</option>
            ))}
          </select>
          {imagenesBase64Principal[idx] && (
            <div className="relative mt-3 inline-block group/img">
              <img
                src={imagenesBase64Principal[idx]}
                alt="principal"
                className="h-40 object-contain border rounded-xl cursor-zoom-in hover:shadow-md transition-shadow bg-gray-50 p-1"
                onClick={() => setImagenAmpliada(imagenesBase64Principal[idx])}
              />
              <span className="absolute top-2 left-2 bg-blue-600 text-white text-[10px] font-semibold px-2 py-0.5 rounded-full">Principal</span>
              <span className="absolute bottom-2 right-2 opacity-0 group-hover/img:opacity-100 transition-opacity bg-black/50 text-white text-[10px] px-2 py-0.5 rounded-full">🔍 Ampliar</span>
            </div>
          )}
        </div>

        {/* Imágenes adicionales */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium text-gray-700">Imágenes adicionales (máx 2)</label>
            <button
              type="button"
              disabled={imgState.adicionales.length >= 2}
              onClick={() => setImagenesPerProducto(prev => {
                const next = [...prev];
                next[idx] = { ...next[idx], adicionales: [...next[idx].adicionales, ""] };
                return next;
              })}
              className={`px-3 py-1.5 text-xs rounded-lg border font-medium transition-colors ${imgState.adicionales.length >= 2 ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed' : 'bg-blue-600 text-white border-blue-600 hover:bg-blue-700'}`}
            >+ Añadir</button>
          </div>
          {imgState.adicionales.length === 0 && (
            <p className="text-xs text-gray-500">No has agregado imágenes extra.</p>
          )}
          <div className="space-y-3">
            {imgState.adicionales.map((clave, aidx) => (
              <div key={aidx} className="flex items-center gap-2">
                <select
                  value={clave}
                  onChange={(e) => {
                    const val = e.target.value;
                    setImagenesPerProducto(prev => {
                      const next = [...prev];
                      const adicionales = [...next[idx].adicionales];
                      adicionales[aidx] = val;
                      next[idx] = { ...next[idx], adicionales };
                      return next;
                    });
                  }}
                  className="px-3 py-2 border rounded-lg flex-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                >
                  <option value="">— Seleccionar —</option>
                  {todosKeys.map(k => (
                    <option key={k} value={k}>{k}</option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => setImagenesPerProducto(prev => {
                    const next = [...prev];
                    next[idx] = { ...next[idx], adicionales: next[idx].adicionales.filter((_, i) => i !== aidx) };
                    return next;
                  })}
                  className="text-red-500 text-sm px-2 py-1.5 border border-red-200 rounded-lg hover:bg-red-50 transition-colors"
                >✕</button>
              </div>
            ))}
          </div>
        </div>

        {/* Preview imágenes adicionales */}
        {imgState.adicionales.filter(Boolean).length > 0 && (
          <div className="flex flex-row gap-4 pt-2 flex-wrap">
            {imgState.adicionales.filter(Boolean).map((clave, aidx) => (
              <div key={clave} className="relative flex flex-col items-center group/extra">
                <img
                  src={imagenesPorProducto[clave]}
                  alt={clave}
                  className="h-40 object-contain border rounded-xl w-36 bg-gray-50 p-1 cursor-zoom-in hover:shadow-md transition-shadow"
                  onClick={() => setImagenAmpliada(imagenesPorProducto[clave])}
                />
                <span className="absolute top-2 left-2 bg-gray-600 text-white text-[10px] font-semibold px-2 py-0.5 rounded-full">Extra {aidx + 1}</span>
                <span className="absolute bottom-2 right-2 opacity-0 group-hover/extra:opacity-100 transition-opacity bg-black/50 text-white text-[10px] px-2 py-0.5 rounded-full">🔍 Ampliar</span>
                <span className="mt-1.5 text-[10px] text-gray-500 text-center truncate w-36" title={clave}>{clave}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  // --- Generar PDF ---
  const handleGenerarPDF = async () => {
    if (generandoPDF) return;
    try {
      setGenerandoPDF(true);
      await new Promise((resolve) => setTimeout(resolve, 0));

      // Construir seccionesPorProducto con las ediciones del usuario
      const safePorProducto = edicionesPorProducto.map((ed, i) => ({
        tipo: quoteData.productos[i]?.tipo || "",
        descripcionHTML: sanitizeHtml(ed.descripcionHTML || ""),
        especificacionesHTML: sanitizeHtml(ed.especificacionesHTML || ""),
      }));

      // Tabla siempre regenerada desde quoteData (no editable)
      const { tablaHTML } = generarSeccionesHTML(quoteData, condicionesProductoIndex, productosOverride);

      const safeCompartidas = {
        tablaHTML,
        condicionesHTML: sanitizeHtml(edicionesCompartidas.condicionesHTML || ""),
        terminosHTML: sanitizeHtml(edicionesCompartidas.terminosHTML || ""),
      };

      await generarPDFReact(
        {
          ...quoteData,
          secciones: [safeCompartidas],
          seccionesPorProducto: safePorProducto,
          imagenesSeleccionadasPorProducto: imagenesPerProducto,
          tituloCotizacion: tituloCotizacion.trim() || generarTituloCompacto(quoteData.productos),
        },
        estaEditando
      );
    } catch (error) {
      console.error("Error generando PDF:", error);
      toast.error("No se pudo generar el PDF");
    } finally {
      setGenerandoPDF(false);
    }
  };

  const botonesAccion = (
    <>
      <button
        className="w-full bg-blue-600 text-white px-4 py-2.5 rounded-xl font-medium hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 text-sm"
        onClick={() => navigate("/cotizar")}
      >
        ✏️ Editar cotización
      </button>
      <button
        className={`w-full px-4 py-2.5 rounded-xl font-medium transition-colors flex items-center justify-center gap-2 text-sm ${
          generandoPDF ? "bg-green-500 cursor-not-allowed text-white" : "bg-green-700 text-white hover:bg-green-800"
        }`}
        onClick={handleGenerarPDF}
        disabled={generandoPDF}
      >
        {generandoPDF ? "⏳ Generando PDF..." : "⬇️ Descargar PDF"}
      </button>
      <button
        onClick={() => navigate("/historial")}
        className="w-full bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 px-4 py-2.5 rounded-xl font-medium hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors flex items-center justify-center gap-2 text-sm"
      >
        📋 Ver Historial
      </button>
    </>
  );

  const productos = quoteData?.productos || [];

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-28 lg:pb-8 text-gray-900 dark:text-gray-100 overflow-x-hidden">

      {/* Hero header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-2xl p-6 mb-6 shadow-lg">
        <div className="flex justify-between items-start gap-4">
          <div>
            <p className="text-blue-200 text-sm font-medium">Cotización</p>
            <h1 className="text-3xl font-bold mt-0.5">#{quoteData.numero || "—"}</h1>
            <p className="text-blue-100 mt-1 text-sm">{formCliente.nombreCliente || cliente || "Sin cliente asignado"}</p>
          </div>
          <span className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap mt-1 ${
            estaEditando ? 'bg-yellow-400 text-yellow-900' : 'bg-green-400 text-green-900'
          }`}>
            {estaEditando ? '✏️ Editando' : '✨ Nueva'}
          </span>
        </div>
        <p className="text-blue-200 text-sm mt-4">
          {new Date().toLocaleDateString('es-CO', { dateStyle: 'long' })}
        </p>
      </div>

      {/* Main grid: content + sticky sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-6 items-start">

        {/* LEFT: all sections */}
        <div className="space-y-6 min-w-0 overflow-x-hidden">

          {/* Título del PDF */}
          <div className="group relative bg-white shadow-md rounded-2xl p-6 border border-gray-200 force-light">
            <h2 className="text-xl font-semibold text-gray-800 mb-3">Título del PDF</h2>
            {editandoTitulo ? (
              <div className="animate-fadeIn space-y-3">
                <input
                  type="text"
                  value={tituloCotizacion}
                  onChange={(e) => setTituloCotizacion(e.target.value)}
                  className="w-full border rounded-lg px-3 py-2.5 text-sm font-semibold uppercase bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 tracking-wide"
                  placeholder="Título de la cotización..."
                  maxLength={200}
                />
                <p className="text-xs text-gray-400">{tituloCotizacion.length}/200 caracteres</p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setEditandoTitulo(false)}
                    className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-green-700 transition-colors"
                  >Guardar</button>
                  <button
                    onClick={() => { setTituloCotizacion(generarTituloCompacto(productos)); setEditandoTitulo(false); }}
                    className="bg-gray-100 text-gray-600 px-4 py-2 rounded-lg text-sm hover:bg-gray-200 transition-colors"
                  >Restaurar</button>
                </div>
              </div>
            ) : (
              <div>
                <div className="bg-[#152E4D] text-white text-center px-4 py-3 rounded-lg">
                  <p className="text-xs font-bold uppercase tracking-widest leading-snug">{tituloCotizacion || generarTituloCompacto(productos)}</p>
                </div>
                <button
                  className="mt-3 text-sm bg-blue-50 text-blue-600 border border-blue-200 px-3 py-1.5 rounded-lg flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-700"
                  onClick={() => setEditandoTitulo(true)}
                >
                  ✏️ Editar título
                </button>
              </div>
            )}
          </div>

          {/* Cliente */}
          <div className="group relative bg-white shadow-md rounded-2xl p-6 border border-gray-200 space-y-4 force-light">
            <h2 className="text-xl font-semibold text-gray-800">Datos del Cliente</h2>
            {!editandoCliente ? (
              <div className="text-sm space-y-1.5">
                <div><span className="font-semibold text-gray-700">Cliente:</span> <span className="text-gray-600">{formCliente.nombreCliente || cliente || "—"}</span></div>
                <div><span className="font-semibold text-gray-700">Contacto:</span> <span className="text-gray-600">{formCliente.clienteContacto || "—"}</span></div>
                <div><span className="font-semibold text-gray-700">NIT:</span> <span className="text-gray-600">{formCliente.clienteNIT || "—"}</span></div>
                <div><span className="font-semibold text-gray-700">Ciudad:</span> <span className="text-gray-600">{formCliente.clienteCiudad || "—"}</span></div>
                <div><span className="font-semibold text-gray-700">Email:</span> <span className="text-gray-600">{formCliente.clienteEmail || "—"}</span></div>
                <div><span className="font-semibold text-gray-700">Teléfono:</span> <span className="text-gray-600">{formCliente.clienteTelefono || "—"}</span></div>
                <button
                  onClick={() => setEditandoCliente(true)}
                  className="mt-3 text-sm bg-blue-50 text-blue-600 border border-blue-200 px-3 py-1.5 rounded-lg flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-700 dark:hover:bg-blue-900/50"
                >
                  ✏️ Editar datos cliente
                </button>
              </div>
            ) : (
              <div className="animate-fadeIn grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex flex-col">
                  <label className="text-xs font-semibold text-gray-800 mb-1">Nombre Cliente</label>
                  <input name="nombreCliente" value={formCliente.nombreCliente} onChange={handleChangeCliente} className="border rounded px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/60 transition text-sm" />
                </div>
                <div className="flex flex-col">
                  <label className="text-xs font-semibold text-gray-800 mb-1">Contacto</label>
                  <input name="clienteContacto" value={formCliente.clienteContacto} onChange={handleChangeCliente} className="border rounded px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/60 transition text-sm" />
                </div>
                <div className="flex flex-col">
                  <label className="text-xs font-semibold text-gray-800 mb-1">NIT</label>
                  <input name="clienteNIT" value={formCliente.clienteNIT} onChange={handleChangeCliente} className="border rounded px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/60 transition text-sm" />
                </div>
                <div className="flex flex-col">
                  <label className="text-xs font-semibold text-gray-800 mb-1">Ciudad</label>
                  <input name="clienteCiudad" value={formCliente.clienteCiudad} onChange={handleChangeCliente} className="border rounded px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/60 transition text-sm" />
                </div>
                <div className="flex flex-col">
                  <label className="text-xs font-semibold text-gray-800 mb-1">Email</label>
                  <input name="clienteEmail" value={formCliente.clienteEmail} onChange={handleChangeCliente} className="border rounded px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/60 transition text-sm" />
                </div>
                <div className="flex flex-col">
                  <label className="text-xs font-semibold text-gray-800 mb-1">Teléfono</label>
                  <input name="clienteTelefono" value={formCliente.clienteTelefono} onChange={handleChangeCliente} className="border rounded px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/60 transition text-sm" />
                </div>
                <div className="col-span-full flex gap-3 mt-1">
                  <button onClick={guardarDatosCliente} className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 text-sm transition-colors">Guardar</button>
                  <button onClick={() => setEditandoCliente(false)} className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 text-sm transition-colors dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600">Cancelar</button>
                </div>
              </div>
            )}
          </div>

          {/* ===== Sección por producto ===== */}
          {productos.map((prod, idx) => (
            <div key={idx} className="space-y-4">
              {/* Encabezado del producto */}
              <div className="flex items-center gap-3 px-1">
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-600 text-white text-sm font-bold shrink-0">
                  {idx + 1}
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">Producto {idx + 1}</p>
                  <p className="font-semibold text-gray-800 dark:text-gray-100">{prod.tipo}</p>
                </div>
              </div>

              {renderCampoProducto("Descripción del Producto", idx, "descripcionHTML")}
              {renderCampoProducto("Especificaciones Técnicas", idx, "especificacionesHTML")}
              {renderImagenesProducto(idx, prod)}
            </div>
          ))}

          {/* Detalle de Precios */}
          <div className="bg-white shadow-md rounded-2xl p-6 border border-gray-200 overflow-x-auto force-light">
            <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-100 mb-4">Detalle de Precios</h2>
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-gray-500 dark:bg-gray-900 dark:text-gray-300 uppercase text-xs">
                  <th className="text-left px-4 py-2.5 rounded-l-lg font-medium">Producto</th>
                  <th className="text-right px-4 py-2.5 font-medium">Cant.</th>
                  <th className="text-right px-4 py-2.5 rounded-r-lg font-medium">Precio</th>
                </tr>
              </thead>
              <tbody>
                {productos.map((p, i) => (
                  <tr key={i} className={`border-t border-gray-100 dark:border-gray-700 hover:bg-blue-50/30 dark:hover:bg-gray-800/60 transition-colors ${i % 2 !== 0 ? 'bg-gray-50/50 dark:bg-gray-800/40' : ''}`}>
                    <td className="px-4 py-3 font-medium text-gray-800 dark:text-gray-100">
                      {p.tipo}{p.ancho && p.alto ? ` · ${p.ancho}×${p.alto} mm` : ''}
                      {p.extras?.length > 0 && (
                        <span className="ml-2 text-xs text-gray-400 font-normal">+{p.extras.length} extras</span>
                      )}
                    </td>
                    <td className="text-right px-4 py-3 text-gray-600 dark:text-gray-300">{p.cantidad}</td>
                    <td className="text-right px-4 py-3 font-semibold text-gray-800 dark:text-gray-100">{formatCOP(p.precioCalculado)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-gray-200 dark:border-gray-600">
                  <td colSpan={2} className="text-right px-4 py-3 text-gray-500 dark:text-gray-300 text-sm">Subtotal</td>
                  <td className="text-right px-4 py-3 text-gray-700 dark:text-gray-100">{formatCOP(subtotal)}</td>
                </tr>
                <tr>
                  <td colSpan={2} className="text-right px-4 py-3 text-gray-500 dark:text-gray-300 text-sm">IVA (19%)</td>
                  <td className="text-right px-4 py-3 text-gray-700 dark:text-gray-100">{formatCOP(iva)}</td>
                </tr>
                <tr className="bg-green-50 dark:bg-green-900/25 rounded-b-lg">
                  <td colSpan={2} className="text-right px-4 py-3.5 font-bold text-green-700 dark:text-green-300">TOTAL</td>
                  <td className="text-right px-4 py-3.5 font-bold text-green-700 dark:text-green-300 text-base">{formatCOP(total)}</td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Condiciones comerciales con selector de producto */}
          {renderCampoCompartido(
            "Condiciones Comerciales",
            "condicionesHTML",
            productos.length > 1 ? (
              <div className="flex items-center gap-2">
                <label className="text-xs text-gray-500 whitespace-nowrap">Condiciones de:</label>
                <select
                  value={condicionesProductoIndex}
                  onChange={(e) => setCondicionesProductoIndex(Number(e.target.value))}
                  className="px-2 py-1.5 text-xs border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/50 bg-white"
                >
                  {productos.map((p, i) => (
                    <option key={i} value={i}>Prod. {i + 1}: {p.tipo}</option>
                  ))}
                </select>
              </div>
            ) : null
          )}

          {renderCampoCompartido("Términos y Condiciones Generales", "terminosHTML")}

        </div>

        {/* RIGHT: sticky sidebar (desktop only) */}
        <div className="hidden lg:block">
          <div className="sticky top-4 space-y-4">

            {/* Total */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-md border border-gray-200 dark:border-gray-700 p-5 text-center">
              <p className="text-xs text-gray-500 dark:text-gray-400 uppercase font-medium tracking-wide">Total Cotización</p>
              <p className="text-2xl font-bold text-green-600 dark:text-green-400 mt-1">{formatCOP(total)}</p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">IVA incluido</p>
            </div>

            {/* Estructura del PDF */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-md border border-gray-200 dark:border-gray-700 p-4">
              <p className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-3">Estructura del PDF</p>
              <div className="space-y-1.5">
                {productos.map((p, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-300">
                    <span className="text-blue-500 shrink-0">📄</span>
                    <span className="truncate"><span className="font-medium">Pág. {i + 1}:</span> {p.tipo}</span>
                  </div>
                ))}
                <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-300 pt-1 border-t border-gray-100 dark:border-gray-700 mt-1">
                  <span className="text-green-500 shrink-0">📊</span>
                  <span><span className="font-medium">Pág. {productos.length + 1}:</span> Tabla + Condiciones</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-300">
                  <span className="text-gray-400 shrink-0">📋</span>
                  <span><span className="font-medium">Pág. {productos.length + 2}+:</span> Términos</span>
                </div>
              </div>
            </div>

            {/* Checklist de completitud */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-md border border-gray-200 dark:border-gray-700 p-4">
              <div className="flex justify-between items-center mb-3">
                <p className="text-sm font-semibold text-gray-700 dark:text-gray-200">Completitud</p>
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${pct === 100 ? 'bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300' : 'bg-yellow-100 dark:bg-yellow-900/40 text-yellow-700 dark:text-yellow-300'}`}>
                  {pct}%
                </span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5 mb-3">
                <div
                  className={`h-1.5 rounded-full transition-all duration-500 ${pct === 100 ? 'bg-green-500' : 'bg-yellow-400'}`}
                  style={{ width: `${pct}%` }}
                />
              </div>
              <ul className="space-y-2">
                {completitud.map((item, i) => (
                  <li key={i} className="flex items-center gap-2 text-xs">
                    <span>{item.ok ? '✅' : '⚠️'}</span>
                    <span className={item.ok ? 'text-gray-600 dark:text-gray-300' : 'text-gray-500 dark:text-gray-400'}>{item.label}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Botones de acción */}
            <div className="space-y-2">
              {botonesAccion}
            </div>

          </div>
        </div>

      </div>

      {/* Mobile bottom bar */}
      <div className="fixed bottom-0 left-0 right-0 lg:hidden bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm border-t border-gray-200 dark:border-gray-700 px-4 py-3 flex gap-2 shadow-2xl z-40">
        <button
          className="flex-1 bg-blue-600 text-white px-3 py-2.5 rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors"
          onClick={() => navigate("/cotizar")}
        >
          ✏️ Editar
        </button>
        <button
          className={`flex-1 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
            generandoPDF ? "bg-green-500 cursor-not-allowed text-white" : "bg-green-700 text-white hover:bg-green-800"
          }`}
          onClick={handleGenerarPDF}
          disabled={generandoPDF}
        >
          {generandoPDF ? "⏳ PDF..." : "⬇️ PDF"}
        </button>
        <button
          onClick={() => navigate("/historial")}
          className="bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 px-3 py-2.5 rounded-xl text-sm font-medium hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
        >
          📋
        </button>
      </div>

      {/* Lightbox */}
      {imagenAmpliada && (
        <div
          className="fixed inset-0 bg-black/85 z-50 flex items-center justify-center p-4 cursor-pointer"
          onClick={() => setImagenAmpliada(null)}
        >
          <img
            src={imagenAmpliada}
            alt="Vista ampliada"
            className="max-h-[90vh] max-w-[90vw] rounded-xl shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
          <button
            className="absolute top-4 right-4 text-white text-xl bg-black/40 rounded-full w-10 h-10 flex items-center justify-center hover:bg-black/60 transition-colors"
            onClick={() => setImagenAmpliada(null)}
          >✕</button>
        </div>
      )}

    </div>
  );
}
