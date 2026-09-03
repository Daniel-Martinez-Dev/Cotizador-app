// src/pages/PreviewPage.jsx
import React, { useEffect, useState, useMemo, useRef } from "react";
import { useQuote } from "../context/QuoteContext";
import { useNavigate } from "react-router-dom";
import { generarPDFReact, entregarPDFBlob } from "../utils/pdfReact";
import { generarSeccionesHTML, generarSeccionesPorProducto } from "../utils/htmlSections";
import { sanitizeHtml } from "../utils/sanitizeHtml";
import { isoHoyMasDias, textoVigenciaDesdeISO, reemplazarVigenciaEnHTML, VIGENCIA_DIAS_POR_DEFECTO } from "../utils/vigencia";
import { actualizarEmpresa, listarEmpresas, listarContactos, resolverOCrearEmpresa, resolverOCrearContacto, actualizarContacto } from "../utils/firebaseCompanies";
import toast from "react-hot-toast";
import ReactQuill from "react-quill-new";
import "react-quill-new/dist/quill.snow.css";
import imagenesPorProducto, { CATEGORIAS_IMAGENES, CATEGORIA_POR_TIPO } from "../data/imagenesPorProducto";
import {
  resolverImagenCotizacion,
  esImagenPropia,
  etiquetaImagen,
  subirImagenCotizacion,
  archivosDeEvento,
} from "../utils/imagenesCotizacion";
import { numeroALetras } from "../utils/numeroALetras";
import { getExtrasDetalle } from "../utils/totales";
import VistaPreviaPDF, { soportaVistaPreviaPDF } from "../components/cotizacion/VistaPreviaPDF";
import AjustesMaquetacionPDF from "../components/cotizacion/AjustesMaquetacionPDF";
import { crearTema } from "../utils/pdfTheme";
import { cargarAjustesPDF } from "../utils/pdfLayoutConfig";
import { peekNextQuoteNumber } from "../utils/quoteNumberFirebase";

// Selector de imágenes: catálogo por categorías + fotos propias.
//
// Antes mostraba las 36 imágenes del catálogo en una sola rejilla, así que para
// elegir la foto de una división térmica había que pasar por encima de
// semáforos y carros jaula. Ahora abre en la categoría del producto que se está
// cotizando y se puede arrastrar una foto que no esté en el catálogo.
function ImagePickerGrid({ selectedKey, onSelect, allowEmpty = true, tipoProducto, propias = [], onSubir }) {
  const categoriaInicial = CATEGORIA_POR_TIPO[tipoProducto] || "todas";
  const [categoria, setCategoria] = useState(categoriaInicial);
  const [arrastrando, setArrastrando] = useState(false);
  const [subiendo, setSubiendo] = useState(false);
  const inputRef = useRef(null);

  // Si la imagen elegida no está en la categoría abierta, no se vería marcada;
  // se salta a la categoría que la contiene para no dar la impresión de que se
  // perdió la selección.
  useEffect(() => {
    if (!selectedKey || esImagenPropia(selectedKey)) return;
    const dueña = CATEGORIAS_IMAGENES.find((c) => c.claves.includes(selectedKey));
    if (dueña) setCategoria(dueña.id);
  }, [selectedKey]);

  const pestañas = useMemo(() => {
    const conImagenes = CATEGORIAS_IMAGENES
      .map((c) => ({ ...c, claves: c.claves.filter((k) => imagenesPorProducto[k]) }))
      .filter((c) => c.claves.length > 0);
    const propia = propias.length > 0
      ? [{ id: "propias", etiqueta: "Mis imágenes", claves: propias }]
      : [];
    const todas = conImagenes.flatMap((c) => c.claves);
    return [
      ...propia,
      ...conImagenes,
      { id: "todas", etiqueta: "Todas", claves: [...propias, ...todas] },
    ];
  }, [propias]);

  const activa = pestañas.find((c) => c.id === categoria) || pestañas[pestañas.length - 1];

  const procesar = async (archivos) => {
    if (!archivos.length || !onSubir) return;
    setSubiendo(true);
    try {
      await onSubir(archivos);
      setCategoria("propias");
    } finally {
      setSubiendo(false);
    }
  };

  return (
    <div className="space-y-2">
      {/* Pestañas de categoría */}
      <div className="flex flex-wrap gap-1.5">
        {pestañas.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => setCategoria(c.id)}
            className={`px-2.5 py-1 text-[11px] rounded-full border font-medium transition-colors ${
              activa?.id === c.id
                ? "bg-blue-600 text-white border-blue-600"
                : "bg-white text-gray-600 border-gray-200 hover:border-blue-300 hover:text-blue-600"
            }`}
          >
            {c.etiqueta} <span className="opacity-60">{c.claves.length}</span>
          </button>
        ))}
      </div>

      {/* Rejilla + zona de arrastre */}
      <div
        onDragOver={(e) => { if (onSubir) { e.preventDefault(); setArrastrando(true); } }}
        onDragLeave={() => setArrastrando(false)}
        onDrop={(e) => {
          if (!onSubir) return;
          e.preventDefault();
          setArrastrando(false);
          procesar(archivosDeEvento(e));
        }}
        className={`relative grid grid-cols-4 sm:grid-cols-6 gap-2 max-h-56 overflow-y-auto p-2 border-2 rounded-lg transition-colors ${
          arrastrando ? "border-blue-500 border-dashed bg-blue-50" : "border-gray-200 bg-gray-50"
        }`}
      >
        {allowEmpty && (
          <button
            type="button"
            onClick={() => onSelect("")}
            title="Sin imagen"
            className={`aspect-square rounded-lg border-2 flex items-center justify-center text-[9px] text-gray-400 text-center leading-tight p-1 transition-colors ${!selectedKey ? 'border-blue-500 ring-2 ring-blue-200' : 'border-gray-200 hover:border-gray-300'}`}
          >
            — Ninguna —
          </button>
        )}

        {(activa?.claves || []).map((k) => (
          <button
            key={k}
            type="button"
            onClick={() => onSelect(k)}
            title={etiquetaImagen(k)}
            aria-label={etiquetaImagen(k)}
            className={`relative aspect-square rounded-lg overflow-hidden border-2 transition-colors ${selectedKey === k ? 'border-blue-500 ring-2 ring-blue-200' : 'border-gray-200 hover:border-blue-300'}`}
          >
            <img src={resolverImagenCotizacion(k)} alt={etiquetaImagen(k)} className="w-full h-full object-cover" />
            {esImagenPropia(k) && (
              <span className="absolute top-0.5 left-0.5 bg-emerald-600 text-white text-[8px] font-bold px-1 rounded">
                propia
              </span>
            )}
          </button>
        ))}

        {onSubir && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={subiendo}
            title="Añadir una imagen propia"
            className="aspect-square rounded-lg border-2 border-dashed border-gray-300 flex flex-col items-center justify-center text-[9px] text-gray-500 hover:border-blue-400 hover:text-blue-600 transition-colors disabled:opacity-50"
          >
            <span className="text-base leading-none">{subiendo ? "⏳" : "+"}</span>
            <span className="mt-0.5 leading-tight text-center px-1">{subiendo ? "Subiendo" : "Añadir"}</span>
          </button>
        )}

        {arrastrando && (
          <div className="absolute inset-0 flex items-center justify-center bg-blue-50/90 rounded-lg pointer-events-none">
            <p className="text-xs font-semibold text-blue-700">Suelta la imagen aquí</p>
          </div>
        )}
      </div>

      {onSubir && (
        <>
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            className="hidden"
            onChange={(e) => { procesar(archivosDeEvento(e)); e.target.value = ""; }}
          />
          <p className="text-[10px] text-gray-400">
            Arrastra una imagen aquí o pulsa «Añadir» para usar una foto que no esté en el catálogo.
          </p>
        </>
      )}
    </div>
  );
}

// Interruptor de "incluir esta sección en el PDF".
function SwitchSeccion({ activo, onCambiar, id }) {
  return (
    <label htmlFor={id} className="flex items-center gap-2 cursor-pointer shrink-0" title={activo ? "Se incluye en el PDF" : "No se incluye en el PDF"}>
      <span className={`text-[11px] font-medium ${activo ? "text-gray-600" : "text-gray-400"}`}>
        {activo ? "En el PDF" : "Excluida"}
      </span>
      <span className="relative inline-flex">
        <input
          id={id}
          type="checkbox"
          checked={activo}
          onChange={(e) => onCambiar(e.target.checked)}
          className="peer sr-only"
        />
        <span className="w-9 h-5 rounded-full bg-gray-300 peer-checked:bg-blue-600 transition-colors peer-focus-visible:ring-2 peer-focus-visible:ring-blue-500/50" />
        <span className="absolute left-0.5 top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform peer-checked:translate-x-4" />
      </span>
    </label>
  );
}

function generarTituloCompacto(productos) {
  if (!productos?.length) return "COTIZACIÓN";
  const tipos = [...new Set(productos.map(p => (p.tipo || "PRODUCTO").toUpperCase()))];
  if (tipos.length === 1) return `COTIZACIÓN DE ${tipos[0]}`;
  if (tipos.length === 2) return `COTIZACIÓN DE ${tipos[0]} Y ${tipos[1]}`;
  const resto = tipos.length - 2;
  return `COTIZACIÓN DE ${tipos[0]}, ${tipos[1]} Y ${resto} TIPO${resto > 1 ? 'S' : ''} MÁS`;
}

export default function PreviewPage() {
  const { quoteData, setQuoteData,
    empresas, setEmpresas, empresaSeleccionada, setEmpresaSeleccionada, contactoSeleccionado, setContactoSeleccionado, confirm,
    setImagenSeleccionada, setImagenesSeleccionadas, productosOverride, extrasOverride } = useQuote();
  const navigate = useNavigate();

  // --- Estado de edición por producto ---
  // [{tipo, descripcionHTML, especificacionesHTML}]
  const [edicionesPorProducto, setEdicionesPorProducto] = useState([]);
  // {condicionesHTML, terminosHTML}
  const [edicionesCompartidas, setEdicionesCompartidas] = useState({ condicionesHTML: "", terminosHTML: "" });
  // {scope: 'producto'|'compartido', index: number|null, campo: string} | null
  const [editando, setEditando] = useState(null);
  // true si el usuario cambió texto/imágenes/título en esta vista que aún no
  // se han incluido en ningún PDF generado (ver handleEditarCotizacion más abajo).
  const [hayEdicionesSinGuardar, setHayEdicionesSinGuardar] = useState(false);

  // --- Índice del producto cuyas condiciones se usan ---
  const [condicionesProductoIndex, setCondicionesProductoIndex] = useState(0);

  // --- Vigencia de la oferta ---
  // Se inicializa una sola vez (al abrir la vista previa) para que guardar
  // datos del cliente u otros cambios de quoteData no la reviertan.
  const [vigenciaFecha, setVigenciaFecha] = useState(
    () => quoteData?.vigenciaFecha || isoHoyMasDias(VIGENCIA_DIAS_POR_DEFECTO)
  );
  const [vigenciaTextoLibre, setVigenciaTextoLibre] = useState(() => quoteData?.vigenciaTextoLibre || "");
  const [usarVigenciaLibre, setUsarVigenciaLibre] = useState(() => Boolean(quoteData?.vigenciaTextoLibre));
  const vigenciaFinal = useMemo(() => {
    const libre = vigenciaTextoLibre.trim();
    if (usarVigenciaLibre && libre) return libre.replace(/\.\s*$/, "");
    return textoVigenciaDesdeISO(vigenciaFecha) || textoVigenciaDesdeISO(isoHoyMasDias(VIGENCIA_DIAS_POR_DEFECTO));
  }, [usarVigenciaLibre, vigenciaTextoLibre, vigenciaFecha]);

  // --- Imágenes por producto ---
  // [{principal: key|null, adicionales: [key]}]
  const [imagenesPerProducto, setImagenesPerProducto] = useState([]);
  // [string|null] — base64 para preview de imagen principal de cada producto
  const [imagenesBase64Principal, setImagenesBase64Principal] = useState([]);
  const [imagenAmpliada, setImagenAmpliada] = useState(null);
  // URLs de fotos que subió el usuario en esta cotización. Se guardan aparte del
  // catálogo para poder ofrecerlas en la pestaña "Mis imágenes" de cualquiera de
  // los productos, no solo del que las subió.
  const [imagenesPropias, setImagenesPropias] = useState([]);

  // Qué secciones entran en el PDF. Una cotización básica no siempre necesita
  // descripción, especificaciones o términos; excluirlas aquí no borra el texto
  // escrito, solo deja de imprimirlo, así que se puede volver a activar.
  // { productos: [{descripcion, especificaciones, imagenes}], condiciones, terminos, firmas }
  const [seccionesIncluidas, setSeccionesIncluidas] = useState({
    productos: [],
    condiciones: true,
    terminos: true,
    firmas: true,
  });

  const incluyeProducto = (idx, campo) =>
    seccionesIncluidas.productos[idx]?.[campo] !== false;

  const cambiarSeccionProducto = (idx, campo, valor) => {
    setHayEdicionesSinGuardar(true);
    setSeccionesIncluidas((prev) => {
      const productos = [...prev.productos];
      productos[idx] = { ...(productos[idx] || {}), [campo]: valor };
      return { ...prev, productos };
    });
  };

  const cambiarSeccionCompartida = (campo, valor) => {
    setHayEdicionesSinGuardar(true);
    setSeccionesIncluidas((prev) => ({ ...prev, [campo]: valor }));
  };

  const subirImagenes = async (archivos) => {
    const subidas = [];
    for (const archivo of archivos) {
      try {
        subidas.push(await subirImagenCotizacion(archivo));
      } catch (e) {
        console.error("Error subiendo imagen de cotización:", e);
        toast.error(e.message || "No se pudo subir la imagen");
      }
    }
    if (subidas.length) {
      setHayEdicionesSinGuardar(true);
      setImagenesPropias((prev) => [...subidas, ...prev.filter((u) => !subidas.includes(u))]);
      toast.success(subidas.length === 1 ? "Imagen añadida" : `${subidas.length} imágenes añadidas`);
    }
    return subidas;
  };
  useEffect(() => {
    if (!imagenAmpliada) return;
    const onKeyDown = (e) => { if (e.key === "Escape") setImagenAmpliada(null); };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [imagenAmpliada]);

  const [generandoPDF, setGenerandoPDF] = useState(false);
  const [tituloCotizacion, setTituloCotizacion] = useState("");
  const [editandoTitulo, setEditandoTitulo] = useState(false);

  // --- Maquetación del PDF ---
  // Los ajustes llegan de localStorage al instante y de Firestore cuando la red
  // responde. El tema resultante se le pasa TANTO al preview COMO a la
  // descarga, que es lo que garantiza que lo que se ve sea lo que sale.
  const [ajustesPDF, setAjustesPDF] = useState({});
  // Si el usuario ya movió algo, no pisarlo cuando llegue la respuesta de red.
  const hayCambiosLocales = useRef(false);
  useEffect(() => {
    const local = cargarAjustesPDF({
      onRemoto: (remoto) => setAjustesPDF((actual) => (hayCambiosLocales.current ? actual : remoto)),
    });
    setAjustesPDF((actual) => (hayCambiosLocales.current ? actual : local));
  }, []);
  const temaPDF = useMemo(() => crearTema(ajustesPDF), [ajustesPDF]);

  const cambiarAjustesPDF = (nuevos) => {
    hayCambiosLocales.current = true;
    setAjustesPDF(nuevos);
  };
  const restaurarAjustesPDF = () => {
    hayCambiosLocales.current = true;
    setAjustesPDF({});
  };
  // La ventana de ajustes flota sobre la página (y sobre el visor a pantalla
  // completa), así que su visibilidad se controla desde aquí.
  const [ajustesAbiertos, setAjustesAbiertos] = useState(false);
  const [tokenRefresco, setTokenRefresco] = useState(0);

  // Número provisional para el encabezado y el pie del preview. Se LEE, no se
  // reserva: reservarlo aquí dejaría huecos en la numeración en cada re-render.
  const [numeroPreview, setNumeroPreview] = useState(null);
  useEffect(() => {
    if (quoteData?.numero) { setNumeroPreview(quoteData.numero); return; }
    let vigente = true;
    peekNextQuoteNumber().then((n) => { if (vigente && n != null) setNumeroPreview(n); });
    return () => { vigente = false; };
  }, [quoteData?.numero]);

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

      const compartidas = generarSeccionesHTML({ ...quoteData, vigencia: vigenciaFinal }, 0, productosOverride);
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
      const compartidas = generarSeccionesHTML({ ...quoteData, vigencia: vigenciaFinal }, condicionesProductoIndex, productosOverride);
      setEdicionesCompartidas(prev => ({
        ...prev,
        condicionesHTML: sanitizeHtml(compartidas.condicionesHTML || ""),
      }));
    } catch (e) {
      console.error("Error regenerando condiciones:", e);
    }
  }, [condicionesProductoIndex]);

  // --- Propagar la vigencia a las condiciones ya escritas/editadas ---
  // Reescribe solo la línea "Vigencia de la oferta" para no perder los demás
  // ajustes que el usuario haya hecho en el editor.
  useEffect(() => {
    setEdicionesCompartidas(prev => {
      const actualizado = reemplazarVigenciaEnHTML(prev.condicionesHTML || "", vigenciaFinal);
      if (actualizado === prev.condicionesHTML) return prev;
      return { ...prev, condicionesHTML: actualizado };
    });
  }, [vigenciaFinal]);

  // --- Inicializar imágenes por producto ---
  useEffect(() => {
    if (!quoteData?.productos) return;
    // Si la cotización viene guardada con imágenes elegidas, se respetan; solo
    // se autoselecciona una del catálogo cuando no hay nada guardado. Sin esto,
    // reabrir una cotización descartaba la foto propia que se había subido.
    const guardadas = Array.isArray(quoteData.imagenesSeleccionadasPorProducto)
      ? quoteData.imagenesSeleccionadasPorProducto
      : [];

    const perProd = quoteData.productos.map((prod, i) => {
      const guardada = guardadas[i];
      if (guardada && (guardada.principal || guardada.adicionales?.length)) {
        return { principal: guardada.principal || null, adicionales: guardada.adicionales || [] };
      }
      const nombreProd = prod.nombreSeleccionado || prod.tipo || "";
      const disponibles = Object.keys(imagenesPorProducto).filter(k =>
        k.toLowerCase().includes(nombreProd.toLowerCase())
      );
      return { principal: disponibles[0] || null, adicionales: [] };
    });
    setImagenesPerProducto(perProd);
    setImagenesBase64Principal(perProd.map(p => resolverImagenCotizacion(p.principal)));

    // Las fotos propias guardadas vuelven a la pestaña "Mis imágenes" para
    // poder reutilizarlas en los demás productos.
    const propiasGuardadas = perProd
      .flatMap(p => [p.principal, ...(p.adicionales || [])])
      .filter(esImagenPropia);
    if (propiasGuardadas.length) {
      setImagenesPropias(prev => [...new Set([...propiasGuardadas, ...prev])]);
    }

    // Restaurar qué secciones llevaba la cotización guardada.
    const guardadasPorProd = Array.isArray(quoteData.seccionesPorProducto) ? quoteData.seccionesPorProducto : [];
    setSeccionesIncluidas({
      productos: quoteData.productos.map((_, i) => ({
        descripcion: guardadasPorProd[i]?.incluirDescripcion !== false,
        especificaciones: guardadasPorProd[i]?.incluirEspecificaciones !== false,
        imagenes: guardadasPorProd[i]?.incluirImagenes !== false,
      })),
      condiciones: quoteData.incluirSecciones?.condiciones !== false,
      terminos: quoteData.incluirSecciones?.terminos !== false,
      firmas: quoteData.incluirSecciones?.firmas !== false,
    });
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

    // Si no hay datos de empresa, solo guardar en quoteData y cerrar
    if(!nit && !nombreEmpresa) {
      setEditandoCliente(false);
      return;
    }

    try {
      // Se busca la empresa por NIT, nombre y alias antes de crear nada (ver
      // firebaseCompanies.resolverOCrearEmpresa). Antes solo se buscaba por NIT
      // exacto: un cliente sin NIT se volvía a crear cada vez que se guardaban
      // sus datos desde esta pantalla, y de ahí salía buena parte de los
      // duplicados.
      const { empresa, creada } = await resolverOCrearEmpresa(
        { nit: nit || '', nombre: nombreEmpresa, ciudad },
        { empresas }
      );
      if(!empresa){ setEditandoCliente(false); return; }
      if(creada) toast.success("Empresa creada");

      // Sobre una empresa que ya existía, esta pantalla sí corrige nombre y
      // ciudad: el usuario acaba de confirmar que quiere sobrescribirlos.
      if(!creada){
        const cambios = {};
        if(nombreEmpresa && nombreEmpresa !== empresa.nombre) cambios.nombre = nombreEmpresa;
        if(ciudad && ciudad !== empresa.ciudad) cambios.ciudad = ciudad;
        if(Object.keys(cambios).length){ await actualizarEmpresa(empresa.id, cambios); }
      }

      const { contacto, creada: contactoCreado } = await resolverOCrearContacto(
        empresa.id,
        { nombre: nombreContacto, email: emailContacto, telefono: telefonoContacto }
      );
      if(contacto){
        if(contactoCreado) toast.success("Contacto creado");
        else {
          const cambiosC = {};
          if(nombreContacto && nombreContacto !== contacto.nombre) cambiosC.nombre = nombreContacto;
          if(emailContacto && emailContacto !== contacto.email) cambiosC.email = emailContacto;
          if(telefonoContacto && telefonoContacto !== contacto.telefono) cambiosC.telefono = telefonoContacto;
          if(Object.keys(cambiosC).length){
            await actualizarContacto(empresa.id, contacto.id, cambiosC);
            toast.success("Contacto actualizado (sobrescrito)");
          }
        }
      }

      const listaEmp = await listarEmpresas();
      setEmpresas(listaEmp);
      setEmpresaSeleccionada(listaEmp.find(e=> e.id===empresa.id) || empresa);
      if(contacto) setContactoSeleccionado(contacto);

    } catch(e){
      console.error("Error guardando empresa/contacto", e);
      toast.error("Error guardando empresa/contacto");
    } finally {
      setEditandoCliente(false);
    }
  };

  const formatCOP = (n) => (n || 0).toLocaleString("es-CO", { style: "currency", currency: "COP" });

  // Una sección excluida a propósito no es algo pendiente, así que sale de la
  // lista: si no, una cotización básica nunca llegaría al 100 %.
  const completitud = useMemo(() => {
    const algunProductoIncluye = (campo) =>
      edicionesPorProducto.some((_, i) => seccionesIncluidas.productos[i]?.[campo] !== false);

    return [
      { label: 'Datos del cliente', ok: !!formCliente.nombreCliente && !!formCliente.clienteNIT },
      algunProductoIncluye('descripcion') && { label: 'Descripción de productos', ok: edicionesPorProducto.some(e => e.descripcionHTML?.replace(/<[^>]*>/g,'').trim()) },
      algunProductoIncluye('especificaciones') && { label: 'Especificaciones técnicas', ok: edicionesPorProducto.some(e => e.especificacionesHTML?.replace(/<[^>]*>/g,'').trim()) },
      algunProductoIncluye('imagenes') && { label: 'Imágenes', ok: imagenesPerProducto.some(p => p.principal) },
      seccionesIncluidas.condiciones !== false && { label: 'Condiciones comerciales', ok: !!(edicionesCompartidas.condicionesHTML?.replace(/<[^>]*>/g,'').trim()) },
    ].filter(Boolean);
  }, [formCliente, edicionesPorProducto, imagenesPerProducto, edicionesCompartidas, seccionesIncluidas]);
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

  const renderCampoProducto = (label, productoIdx, campo, claveSeccion) => {
    const isEditing = editando?.scope === 'producto' && editando?.index === productoIdx && editando?.campo === campo;
    const value = edicionesPorProducto[productoIdx]?.[campo] || "";
    const incluida = incluyeProducto(productoIdx, claveSeccion);

    return (
      <div className={`group relative bg-white shadow-md rounded-2xl p-6 border force-light transition-colors ${incluida ? 'border-gray-200' : 'border-dashed border-gray-300'}`}>
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <h2 className={`text-xl font-semibold ${incluida ? 'text-gray-800' : 'text-gray-400 line-through'}`}>{label}</h2>
          <SwitchSeccion
            id={`sw-prod-${productoIdx}-${claveSeccion}`}
            activo={incluida}
            onCambiar={(v) => cambiarSeccionProducto(productoIdx, claveSeccion, v)}
          />
        </div>
        {!incluida ? (
          <p className="text-sm text-gray-400">
            Esta sección no saldrá en el PDF. El texto se conserva por si la vuelves a activar.
          </p>
        ) : isEditing ? (
          <div className="animate-fadeIn">
            <ReactQuill
              theme="snow"
              value={value}
              onChange={(v) => { setHayEdicionesSinGuardar(true); setEdicionesPorProducto(prev => {
                const next = [...prev];
                next[productoIdx] = { ...next[productoIdx], [campo]: sanitizeHtml(v) };
                return next;
              }); }}
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
              📝 Editar texto
            </button>
          </div>
        )}
      </div>
    );
  };

  // --- Render campo editable compartido ---
  const renderCampoCompartido = (label, campo, headerExtra = null, claveSeccion = null) => {
    const isEditing = editando?.scope === 'compartido' && editando?.campo === campo;
    const value = edicionesCompartidas[campo] || "";
    const incluida = claveSeccion ? seccionesIncluidas[claveSeccion] !== false : true;

    return (
      <div className={`group relative bg-white shadow-md rounded-2xl p-6 border force-light transition-colors ${incluida ? 'border-gray-200' : 'border-dashed border-gray-300'}`}>
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <h2 className={`text-xl font-semibold ${incluida ? 'text-gray-800' : 'text-gray-400 line-through'}`}>{label}</h2>
          <div className="flex flex-wrap items-center gap-3">
            {incluida && headerExtra}
            {claveSeccion && (
              <SwitchSeccion
                id={`sw-${claveSeccion}`}
                activo={incluida}
                onCambiar={(v) => cambiarSeccionCompartida(claveSeccion, v)}
              />
            )}
          </div>
        </div>
        {!incluida ? (
          <p className="text-sm text-gray-400">
            Esta sección no saldrá en el PDF. El texto se conserva por si la vuelves a activar.
          </p>
        ) : isEditing ? (
          <div className="animate-fadeIn">
            <ReactQuill
              theme="snow"
              value={value}
              onChange={(v) => { setHayEdicionesSinGuardar(true); setEdicionesCompartidas(prev => ({ ...prev, [campo]: sanitizeHtml(v) })); }}
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
              📝 Editar texto
            </button>
          </div>
        )}
      </div>
    );
  };

  // --- Render selector de imágenes por producto ---
  const renderImagenesProducto = (idx, prod) => {
    const imgState = imagenesPerProducto[idx] || { principal: null, adicionales: [] };
    const incluidas = incluyeProducto(idx, "imagenes");
    if (Object.keys(imagenesPorProducto).length === 0) return null;

    const setPrincipal = (val) => {
      setHayEdicionesSinGuardar(true);
      setImagenesPerProducto(prev => {
        const next = [...prev];
        next[idx] = { ...next[idx], principal: val || null };
        return next;
      });
      const fuente = val ? resolverImagenCotizacion(val) : null;
      setImagenesBase64Principal(prev => { const next = [...prev]; next[idx] = fuente; return next; });
    };

    return (
      <div className={`bg-white shadow-md rounded-2xl p-6 border space-y-4 force-light transition-colors ${incluidas ? 'border-gray-200' : 'border-dashed border-gray-300'}`}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className={`text-xl font-semibold ${incluidas ? 'text-gray-800' : 'text-gray-400 line-through'}`}>
            Imágenes — Producto {idx + 1}
          </h2>
          <SwitchSeccion
            id={`sw-prod-${idx}-imagenes`}
            activo={incluidas}
            onCambiar={(v) => cambiarSeccionProducto(idx, "imagenes", v)}
          />
        </div>

        {!incluidas && (
          <p className="text-sm text-gray-400">
            Las imágenes no saldrán en el PDF. La selección se conserva por si la vuelves a activar.
          </p>
        )}

        {incluidas && (
          <>
          {/* Imagen principal */}
          <div>
            <label className="block mb-2 text-sm font-medium text-gray-700">Imagen principal</label>
            <ImagePickerGrid
              selectedKey={imgState.principal || ""}
              onSelect={setPrincipal}
              tipoProducto={prod?.tipo}
              propias={imagenesPropias}
              onSubir={subirImagenes}
            />
            {imagenesBase64Principal[idx] && (
              <div className="relative mt-3 inline-block group/img">
                <img
                  src={imagenesBase64Principal[idx]}
                  alt="principal"
                  className="h-40 object-contain rounded-xl cursor-zoom-in hover:shadow-md transition-shadow"
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
                onClick={() => { setHayEdicionesSinGuardar(true); setImagenesPerProducto(prev => {
                  const next = [...prev];
                  next[idx] = { ...next[idx], adicionales: [...next[idx].adicionales, ""] };
                  return next;
                }); }}
                className={`px-3 py-1.5 text-xs rounded-lg border font-medium transition-colors ${imgState.adicionales.length >= 2 ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed' : 'bg-blue-600 text-white border-blue-600 hover:bg-blue-700'}`}
              >+ Añadir</button>
            </div>
            {imgState.adicionales.length === 0 && (
              <p className="text-xs text-gray-500">No has agregado imágenes extra.</p>
            )}
            <div className="space-y-3">
              {imgState.adicionales.map((clave, aidx) => (
                <div key={aidx} className="flex items-start gap-2">
                  <div className="flex-1">
                    <ImagePickerGrid
                      tipoProducto={prod?.tipo}
                      propias={imagenesPropias}
                      onSubir={subirImagenes}
                      selectedKey={clave}
                      onSelect={(val) => {
                        setHayEdicionesSinGuardar(true);
                        setImagenesPerProducto(prev => {
                          const next = [...prev];
                          const adicionales = [...next[idx].adicionales];
                          adicionales[aidx] = val;
                          next[idx] = { ...next[idx], adicionales };
                          return next;
                        });
                      }}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => { setHayEdicionesSinGuardar(true); setImagenesPerProducto(prev => {
                      const next = [...prev];
                      next[idx] = { ...next[idx], adicionales: next[idx].adicionales.filter((_, i) => i !== aidx) };
                      return next;
                    }); }}
                    aria-label="Quitar imagen adicional"
                    title="Quitar imagen adicional"
                    className="text-red-500 text-sm px-2 py-1.5 border border-red-200 rounded-lg hover:bg-red-50 transition-colors shrink-0"
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
                    src={resolverImagenCotizacion(clave)}
                    alt={etiquetaImagen(clave)}
                    className="h-40 object-contain rounded-xl w-36 cursor-zoom-in hover:shadow-md transition-shadow"
                    onClick={() => setImagenAmpliada(resolverImagenCotizacion(clave))}
                  />
                  <span className="absolute top-2 left-2 bg-gray-600 text-white text-[10px] font-semibold px-2 py-0.5 rounded-full">Extra {aidx + 1}</span>
                  <span className="absolute bottom-2 right-2 opacity-0 group-hover/extra:opacity-100 transition-opacity bg-black/50 text-white text-[10px] px-2 py-0.5 rounded-full">🔍 Ampliar</span>
                  <span className="mt-1.5 text-[10px] text-gray-500 text-center truncate w-36" title={etiquetaImagen(clave)}>{etiquetaImagen(clave)}</span>
                </div>
              ))}
            </div>
          )}
          </>
        )}
      </div>
    );
  };

  // --- Generar PDF ---
  // Cachea el blob ya guardado en esta sesión para que "Imprimir" y "Descargar"
  // puedan reutilizarlo sin volver a guardar la cotización dos veces en Firestore.
  const pdfCacheRef = useRef(null);
  // Si el usuario edita contenido o mueve la maquetación después de generar el
  // PDF, invalidar el caché para que la próxima descarga/impresión lo refleje.
  useEffect(() => {
    pdfCacheRef.current = null;
  }, [edicionesPorProducto, edicionesCompartidas, imagenesPerProducto, tituloCotizacion, vigenciaFinal, temaPDF]);

  // Payload único de la cotización: lo consumen la vista previa y la descarga,
  // así el PDF que se ve y el que se guarda no pueden divergir.
  const payloadCotizacion = useMemo(() => {
    if (!quoteData?.productos) return null;

    const safePorProducto = edicionesPorProducto.map((ed, i) => ({
      tipo: quoteData.productos[i]?.tipo || "",
      descripcionHTML: sanitizeHtml(ed.descripcionHTML || ""),
      especificacionesHTML: sanitizeHtml(ed.especificacionesHTML || ""),
      // Se manda el texto siempre y aparte la bandera: así excluir una sección
      // no borra lo escrito y volver a activarla lo recupera tal cual.
      incluirDescripcion: seccionesIncluidas.productos[i]?.descripcion !== false,
      incluirEspecificaciones: seccionesIncluidas.productos[i]?.especificaciones !== false,
      incluirImagenes: seccionesIncluidas.productos[i]?.imagenes !== false,
    }));

    // Tabla siempre regenerada desde quoteData (no editable)
    const { tablaHTML } = generarSeccionesHTML({ ...quoteData, vigencia: vigenciaFinal }, condicionesProductoIndex, productosOverride);

    return {
      ...quoteData,
      secciones: [{
        tablaHTML,
        condicionesHTML: sanitizeHtml(edicionesCompartidas.condicionesHTML || ""),
        terminosHTML: sanitizeHtml(edicionesCompartidas.terminosHTML || ""),
      }],
      seccionesPorProducto: safePorProducto,
      imagenesSeleccionadasPorProducto: imagenesPerProducto,
      tituloCotizacion: tituloCotizacion.trim() || generarTituloCompacto(quoteData.productos),
      incluirSecciones: {
        condiciones: seccionesIncluidas.condiciones !== false,
        terminos: seccionesIncluidas.terminos !== false,
        firmas: seccionesIncluidas.firmas !== false,
      },
      vigencia: vigenciaFinal,
      vigenciaFecha: usarVigenciaLibre && vigenciaTextoLibre.trim() ? "" : vigenciaFecha,
      vigenciaTextoLibre: usarVigenciaLibre ? vigenciaTextoLibre.trim() : "",
    };
  }, [quoteData, edicionesPorProducto, edicionesCompartidas, imagenesPerProducto,
      tituloCotizacion, vigenciaFinal, vigenciaFecha, vigenciaTextoLibre, usarVigenciaLibre,
      condicionesProductoIndex, productosOverride, seccionesIncluidas]);

  const handleGenerarPDF = async (mode = 'download') => {
    if (generandoPDF) return;
    try {
      setGenerandoPDF(true);

      if (pdfCacheRef.current) {
        await entregarPDFBlob(pdfCacheRef.current.blob, pdfCacheRef.current.nombreArchivo, mode);
        return;
      }

      if (!payloadCotizacion) return;

      await new Promise((resolve) => setTimeout(resolve, 0));

      await generarPDFReact(
        payloadCotizacion,
        estaEditando,
        { mode, theme: temaPDF, onBlobReady: (r) => { pdfCacheRef.current = r; } }
      );
    } catch (error) {
      console.error("Error generando PDF:", error);
      toast.error("No se pudo generar el PDF");
    } finally {
      setGenerandoPDF(false);
    }
  };

  const handleEditarCotizacion = async () => {
    if (pdfCacheRef.current === null && hayEdicionesSinGuardar) {
      const ok = await confirm('Tienes cambios de texto o imágenes en esta vista previa que aún no se han incluido en ningún PDF generado. Si editas la cotización ahora, se perderán.\n¿Deseas continuar?');
      if (!ok) return;
    }
    navigate("/cotizar");
  };

  const botonesAccion = (
    <>
      <button
        className="w-full bg-blue-600 text-white px-4 py-2.5 rounded-xl font-medium hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 text-sm"
        onClick={handleEditarCotizacion}
      >
        🧮 Editar precios y productos
      </button>
      <button
        className={`w-full px-4 py-2.5 rounded-xl font-medium transition-colors flex items-center justify-center gap-2 text-sm ${
          generandoPDF ? "bg-green-500 cursor-not-allowed text-white" : "bg-green-700 text-white hover:bg-green-800"
        }`}
        onClick={() => handleGenerarPDF('download')}
        disabled={generandoPDF}
      >
        {generandoPDF ? "⏳ Generando PDF..." : "⬇️ Descargar PDF"}
      </button>
      <button
        className="w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 px-4 py-2.5 rounded-xl font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors flex items-center justify-center gap-2 text-sm disabled:opacity-60 disabled:cursor-not-allowed"
        onClick={() => handleGenerarPDF('print')}
        disabled={generandoPDF}
      >
        🖨️ Imprimir
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

  // El preview se pinta con pdf.js sobre canvas, así que funciona igual en
  // Safari, en Chromium y en el WebView de Android. En pantallas pequeñas sigue
  // sin mostrarse por maquetación (la columna derecha es lg:block).
  const mostrarVistaPrevia = soportaVistaPreviaPDF() && Boolean(payloadCotizacion);

  return (
    <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-28 lg:pb-8 text-gray-900 dark:text-gray-100 overflow-x-hidden">

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

      {/* Main grid: editores a la izquierda, PDF real a la derecha */}
      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(420px,46%)] gap-6 items-start">

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
                  onChange={(e) => { setHayEdicionesSinGuardar(true); setTituloCotizacion(e.target.value); }}
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
                  🏷️ Editar título
                </button>
              </div>
            )}
          </div>

          {/* Vigencia de la oferta */}
          <div className="bg-white shadow-md rounded-2xl p-6 border border-gray-200 space-y-4 force-light">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-xl font-semibold text-gray-800">Vigencia de la Oferta</h2>
              <span className="text-xs text-gray-500">Se aplica al encabezado, la tabla de precios y las condiciones</span>
            </div>

            {!usarVigenciaLibre ? (
              <div className="space-y-3">
                <div className="flex flex-wrap items-center gap-3">
                  <label htmlFor="vigencia-fecha" className="text-xs font-semibold text-gray-800">Válida hasta</label>
                  <input
                    id="vigencia-fecha"
                    type="date"
                    value={vigenciaFecha}
                    min={isoHoyMasDias(0)}
                    onChange={(e) => { setHayEdicionesSinGuardar(true); setVigenciaFecha(e.target.value); }}
                    className="border rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                  />
                </div>
                <div className="flex flex-wrap gap-2">
                  {[15, 30, 45, 60].map((dias) => {
                    const activo = vigenciaFecha === isoHoyMasDias(dias);
                    return (
                      <button
                        key={dias}
                        type="button"
                        onClick={() => { setHayEdicionesSinGuardar(true); setVigenciaFecha(isoHoyMasDias(dias)); }}
                        className={`px-3 py-1.5 text-xs rounded-lg border font-medium transition-colors ${activo ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-blue-600 border-blue-200 hover:bg-blue-50'}`}
                      >
                        {dias} días
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : (
              <input
                type="text"
                value={vigenciaTextoLibre}
                onChange={(e) => { setHayEdicionesSinGuardar(true); setVigenciaTextoLibre(e.target.value); }}
                placeholder="Ej: 30 días calendario a partir de la fecha de esta oferta"
                maxLength={160}
                className="w-full border rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
              />
            )}

            <label className="flex items-center gap-2 text-xs text-gray-600">
              <input
                type="checkbox"
                checked={usarVigenciaLibre}
                onChange={(e) => { setHayEdicionesSinGuardar(true); setUsarVigenciaLibre(e.target.checked); }}
              />
              Usar texto personalizado en lugar de una fecha
            </label>

            <div className="rounded-lg bg-blue-50 border border-blue-100 px-3 py-2">
              <p className="text-xs text-gray-600">
                En el PDF aparecerá: <strong className="text-gray-800">Vigencia: {vigenciaFinal}</strong>
              </p>
            </div>
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
                  👤 Editar datos del cliente
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
          {(() => {
            const tiposVistos = new Set();
            return productos.map((prod, idx) => {
              const esNuevoTipo = !tiposVistos.has(prod.tipo);
              if (esNuevoTipo) tiposVistos.add(prod.tipo);
              return (
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

                  {esNuevoTipo && renderCampoProducto("Descripción del Producto", idx, "descripcionHTML", "descripcion")}
                  {esNuevoTipo && renderCampoProducto("Especificaciones Técnicas", idx, "especificacionesHTML", "especificaciones")}
                  {esNuevoTipo && renderImagenesProducto(idx, prod)}
                </div>
              );
            });
          })()}

          {/* Detalle de Precios */}
          <div className="bg-white shadow-md rounded-2xl p-6 border border-gray-200 overflow-x-auto force-light">
            <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-100 mb-4">Detalle de Precios</h2>
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-gray-500 dark:bg-gray-900 dark:text-gray-300 uppercase text-xs">
                  <th className="text-left px-4 py-2.5 rounded-l-lg font-medium">Producto</th>
                  <th className="text-right px-4 py-2.5 font-medium">Cant.</th>
                  <th className="text-right px-4 py-2.5 rounded-r-lg font-medium">Subtotal</th>
                </tr>
              </thead>
              <tbody>
                {productos.map((p, i) => {
                  const extrasDetalle = getExtrasDetalle(p, extrasOverride);
                  return (
                    <React.Fragment key={i}>
                      <tr className={`border-t border-gray-100 dark:border-gray-700 hover:bg-blue-50/30 dark:hover:bg-gray-800/60 transition-colors ${i % 2 !== 0 ? 'bg-gray-50/50 dark:bg-gray-800/40' : ''}`}>
                        <td className="px-4 py-3 font-medium text-gray-800 dark:text-gray-100">
                          {p.tipo}{p.ancho && p.alto ? ` · ${p.ancho}×${p.alto} mm` : ''}
                        </td>
                        <td className="text-right px-4 py-3 text-gray-600 dark:text-gray-300">{p.cantidad}</td>
                        <td className="text-right px-4 py-3 font-semibold text-gray-800 dark:text-gray-100">{formatCOP(p.precioCalculado * (parseInt(p.cantidad) || 1))}</td>
                      </tr>
                      {extrasDetalle.map((ex, exIdx) => (
                        <tr key={`${i}-extra-${exIdx}`} className="bg-gray-50/70 dark:bg-gray-800/30 text-xs">
                          <td className="pl-8 pr-4 py-1.5 text-gray-500 dark:text-gray-400">↳ {ex.nombre}</td>
                          <td className="text-right px-4 py-1.5 text-gray-500 dark:text-gray-400">{Number.isInteger(ex.cantidad) ? ex.cantidad : ex.cantidad.toFixed(2)}</td>
                          <td className="text-right px-4 py-1.5 text-gray-500 dark:text-gray-400">{formatCOP(ex.total)}</td>
                        </tr>
                      ))}
                    </React.Fragment>
                  );
                })}
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
                  <td colSpan={2} className="text-right px-4 py-3.5 font-bold text-green-700 dark:text-green-300">TOTAL COP$</td>
                  <td className="text-right px-4 py-3.5 font-bold text-green-700 dark:text-green-300 text-base">{formatCOP(total)}</td>
                </tr>
              </tfoot>
            </table>
            <p className="mt-2 text-[10px] italic text-gray-400 dark:text-gray-500">
              Son: <strong className="text-gray-600 dark:text-gray-300 not-italic">{numeroALetras(total)}</strong>
            </p>
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
            ) : null,
            "condiciones"
          )}

          {renderCampoCompartido("Términos y Condiciones Generales", "terminosHTML", null, "terminos")}

          {/* Secciones del PDF que no tienen texto editable y por eso no
              aparecen como tarjeta más arriba. */}
          <div className="bg-white shadow-md rounded-2xl p-6 border border-gray-200 force-light">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Otras secciones del PDF</h2>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0">
                <p className={`font-medium ${seccionesIncluidas.firmas !== false ? 'text-gray-700' : 'text-gray-400 line-through'}`}>
                  Aceptación de cotización
                </p>
                <p className="text-xs text-gray-500 mt-0.5">
                  Las dos casillas de firma y sello al final del documento.
                </p>
              </div>
              <SwitchSeccion
                id="sw-firmas"
                activo={seccionesIncluidas.firmas !== false}
                onCambiar={(v) => cambiarSeccionCompartida("firmas", v)}
              />
            </div>
          </div>

        </div>

        {/* RIGHT: PDF real + acciones (solo escritorio) */}
        <div className="hidden lg:block">
          <div className="sticky top-4 space-y-4">

            {/* Vista previa fiel: es el mismo documento que se descarga */}
            {mostrarVistaPrevia && (
              <VistaPreviaPDF
                cotizacion={payloadCotizacion}
                numeroCotizacion={numeroPreview ?? "—"}
                theme={temaPDF}
                tokenRefresco={tokenRefresco}
                acciones={
                  <button
                    type="button"
                    onClick={() => setAjustesAbiertos((v) => !v)}
                    aria-pressed={ajustesAbiertos}
                    title="Ajustes de maquetación"
                    className={`px-2 py-1 text-xs rounded-lg border transition-colors ${
                      ajustesAbiertos
                        ? "bg-blue-600 text-white border-blue-600"
                        : "border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                    }`}
                  >⚙︎ Ajustes</button>
                }
              />
            )}

            {mostrarVistaPrevia && !quoteData?.numero && numeroPreview != null && (
              <p className="text-[11px] text-gray-500 dark:text-gray-400 px-1 -mt-2">
                El número #{numeroPreview} es provisional: se reserva al descargar el PDF.
              </p>
            )}

            {/* Botones de acción */}
            <div className="space-y-2">
              {botonesAccion}
            </div>

            {/* Total */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-md border border-gray-200 dark:border-gray-700 p-5 text-center">
              <p className="text-xs text-gray-500 dark:text-gray-400 uppercase font-medium tracking-wide">Total Cotización</p>
              <p className="text-2xl font-bold text-green-600 dark:text-green-400 mt-1">{formatCOP(total)}</p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">IVA incluido</p>
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

          </div>
        </div>

      </div>

      {/* Mobile bottom bar */}
      <div className="fixed bottom-0 left-0 right-0 lg:hidden bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm border-t border-gray-200 dark:border-gray-700 px-4 py-3 flex gap-2 shadow-2xl z-40">
        <button
          className="flex-1 bg-blue-600 text-white px-3 py-2.5 rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors"
          onClick={handleEditarCotizacion}
        >
          🧮 Precios
        </button>
        <button
          className={`flex-1 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
            generandoPDF ? "bg-green-500 cursor-not-allowed text-white" : "bg-green-700 text-white hover:bg-green-800"
          }`}
          onClick={() => handleGenerarPDF('download')}
          disabled={generandoPDF}
        >
          {generandoPDF ? "⏳ PDF..." : "⬇️ PDF"}
        </button>
        <button
          onClick={() => handleGenerarPDF('print')}
          disabled={generandoPDF}
          aria-label="Imprimir"
          title="Imprimir"
          className="bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 px-3 py-2.5 rounded-xl text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-60"
        >
          🖨️
        </button>
        <button
          onClick={() => navigate("/historial")}
          aria-label="Ver historial"
          title="Ver historial"
          className="bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 px-3 py-2.5 rounded-xl text-sm font-medium hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
        >
          📋
        </button>
      </div>

      {/* Ventana flotante de ajustes: se monta fuera de la rejilla para poder
          arrastrarla por toda la pantalla y quedar por encima del visor a
          pantalla completa. */}
      {mostrarVistaPrevia && ajustesAbiertos && (
        <AjustesMaquetacionPDF
          ajustes={ajustesPDF}
          onCambiar={cambiarAjustesPDF}
          onRestaurar={restaurarAjustesPDF}
          onCerrar={() => setAjustesAbiertos(false)}
          onActualizar={() => setTokenRefresco((n) => n + 1)}
        />
      )}

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
            aria-label="Cerrar imagen ampliada"
            title="Cerrar (Esc)"
          >✕</button>
        </div>
      )}

    </div>
  );
}
