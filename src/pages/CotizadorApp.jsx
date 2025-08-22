import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { priceMatrices, CLIENTE_FACTORES, EXTRAS_POR_DEFECTO, buscarPrecio, buscarPrecioAbrigo, matrizPanamericana } from '../data/precios';
import { getPrecioProducto, getExtrasPorTipo, validarRangoProducto, getConfigProducto } from '../data/catalogoProductos';
import { PRODUCTOS_ACTIVOS } from '../data/catalogoProductos';
import { useQuote } from '../context/QuoteContext';
import { listarEmpresas, listarContactos, obtenerEmpresaPorNIT, crearEmpresa, crearContacto, buscarContactoPorEmail } from '../utils/firebaseCompanies';
import toast from 'react-hot-toast';

// Utilidades
const redondear5000 = v => Math.round(v / 5000) * 5000;
const aplicarAjuste = (v, tipo, p) => {
  if (!p || p === 0) return v;
  if (tipo === 'Descuento') return Math.round(v * (1 - p / 100));
  if (tipo === 'Incremento') return Math.round(v * (1 + p / 100));
  return v;
};
const getRangoIndex = (ranges, valor) => {
  for (let i = 0; i < ranges.length - 1; i++) if (valor > ranges[i] && valor <= ranges[i + 1]) return i;
  if (valor <= ranges[0]) return 0; return ranges.length - 2;
};
const crearProductoInicial = () => ({
  tipo: 'Divisiones Térmicas',
  cliente: 'Cliente Final Contado',
  ancho: '',
  alto: '',
  cantidad: 1,
  precioManual: '',
  extras: [],
  extrasCantidades: {},
  extrasPersonalizados: [],
  extrasPersonalizadosCant: {},
  componentes: [],
  nombrePersonalizado: '',
  infoAdicional: '', // Identificador libre (muelle, placa, etc.)
  mostrarAlerta: false,
  precioEditado: '',
  ajusteTipo: 'Incremento',
  ajusteValor: 0,
  conInstalacion: true, // para Cortina Thermofilm
});

export default function CotizadorApp(){
  const { quoteData, setQuoteData,
    empresas, setEmpresas, empresaSeleccionada, setEmpresaSeleccionada, contactoSeleccionado, setContactoSeleccionado,
    matricesOverride, extrasOverride, resetToken, setResetToken } = useQuote();
  const navigate = useNavigate();

  const [productos, setProductos] = useState([crearProductoInicial()]);
  const [cliente, setCliente] = useState('');
  const [extraInput, setExtraInput] = useState('');
  const [extraPrecioInput, setExtraPrecioInput] = useState('');
  const [alertas, setAlertas] = useState([]);
  const [ajusteTotalTipo, setAjusteTotalTipo] = useState('Descuento');
  const [ajusteTotalValor, setAjusteTotalValor] = useState(0);
  const [collapsed, setCollapsed] = useState([]);

  // Cargar empresas (nuevo modelo)
  useEffect(()=>{ (async()=>{ try { if(!empresas || empresas.length===0){ const le = await listarEmpresas(); setEmpresas(le); } } catch(e){ console.error(e); } })(); }, []);
  // Al seleccionar empresa cargar contactos
  const [contactosEmpresa, setContactosEmpresa] = useState([]);
  useEffect(()=>{ (async()=>{ if(empresaSeleccionada){ try { const lc = await listarContactos(empresaSeleccionada.id); setContactosEmpresa(lc);} catch(e){ console.error(e);} } else { setContactosEmpresa([]); setContactoSeleccionado(null);} })(); }, [empresaSeleccionada]);
  // Sincronizar nombre cliente mostrado con empresa/contacto/legacy
  useEffect(()=>{ if(empresaSeleccionada){ setCliente(empresaSeleccionada.nombre||''); } }, [empresaSeleccionada]);
  // Edición
  useEffect(()=>{ if(quoteData?.productos?.length){ setProductos(quoteData.productos); setCliente(quoteData.cliente||''); setAjusteTotalTipo(quoteData.ajusteGeneral?.tipo||'Descuento'); setAjusteTotalValor(quoteData.ajusteGeneral?.porcentaje||0);} }, []);
  // Cargar datos de empresa/contacto al entrar en modo edicion
  const clienteCargadoRef = useRef(false);
  useEffect(()=>{
    if(!quoteData?.modoEdicion || clienteCargadoRef.current) return;
    (async()=>{
      try {
        // Asegurar empresas cargadas
        if(!empresas || empresas.length===0){ const le = await listarEmpresas(); setEmpresas(le); }
        const empresaId = quoteData.empresaId;
        let empresaRef = null;
        if(empresaId){ empresaRef = (empresas && empresas.find(e=>e.id===empresaId)) || null; }
        if(!empresaRef && quoteData.empresaNIT){ empresaRef = await obtenerEmpresaPorNIT(quoteData.empresaNIT); }
        if(empresaRef){ setEmpresaSeleccionada(empresaRef); }
        // Cargar contacto si aplica
        if(empresaRef && quoteData.contactoId){
          try { const listaC = await listarContactos(empresaRef.id); setContactosEmpresa(listaC); const cont = listaC.find(c=> c.id===quoteData.contactoId); if(cont){ setContactoSeleccionado(cont); } } catch(e){ console.error(e); }
        } else if(empresaRef && quoteData.clienteContacto){
          try { const listaC = await listarContactos(empresaRef.id); setContactosEmpresa(listaC); const cont = listaC.find(c=> c.nombre?.toLowerCase() === quoteData.clienteContacto.toLowerCase()); if(cont){ setContactoSeleccionado(cont); } } catch(e){ console.error(e); }
        }
        // Fallback rellenar inputs si no se encontraron refs
        if(!empresaRef){
          setEmpresaNombreInput(quoteData.nombreCliente||'');
          setEmpresaNITInput(quoteData.empresaNIT||quoteData.clienteNIT||'');
          setEmpresaCiudadInput(quoteData.empresaCiudad||quoteData.clienteCiudad||'');
        }
        if(!quoteData.contactoId && quoteData.clienteContacto){ setContactoNombreInput(quoteData.clienteContacto); }
        if(quoteData.clienteEmail){ setContactoEmailInput(quoteData.clienteEmail); }
        if(quoteData.clienteTelefono){ setContactoTelInput(quoteData.clienteTelefono); }
      } catch(e){ console.error('Error cargando datos cliente edición', e); }
      finally { clienteCargadoRef.current = true; }
    })();
  }, [quoteData?.modoEdicion, quoteData?.empresaId, quoteData?.empresaNIT]);
  // Reset externo
  useEffect(()=>{ if(resetToken){ setProductos([crearProductoInicial()]); setCliente(''); setAjusteTotalTipo('Descuento'); setAjusteTotalValor(0); setQuoteData({}); setResetToken(null);} },[resetToken]);
  // Sincronizar collapsed
  useEffect(()=>{ setCollapsed(prev=> productos.map((_,i)=> prev[i]??false)); }, [productos.length]);
  // Alertas rango
  useEffect(()=>{ const nuevas=productos.map(p=> validarRangoProducto(p,{ matricesOverride })); setAlertas(nuevas); }, [productos, matricesOverride]);

  const handleAgregarProducto = ()=>{ setProductos(p=> [...p, crearProductoInicial()]); setAlertas(a=> [...a,false]); };
  const handleEliminarProducto = (i)=>{ setProductos(p=> p.filter((_,idx)=> idx!==i)); setAlertas(a=> a.filter((_,idx)=> idx!==i)); };
  const handleChangeProducto = (i,campo,valor)=>{ setProductos(p=> { const n=[...p]; n[i][campo]=valor; if(campo==='tipo'){ n[i].extras=[]; n[i].extrasCantidades={}; n[i].extrasPersonalizados=[]; n[i].extrasPersonalizadosCant={}; n[i].precioManual=''; n[i].precioEditado=''; n[i].componentes=[]; n[i].cliente='Cliente Final Contado'; } if(campo==='cliente'){ n[i].precioManual=''; n[i].precioEditado=''; } return n;}); };
  const handleToggleExtra = (i, extra)=>{
    setProductos(prev=> prev.map((prod, idx)=>{
      if(idx!==i) return prod;
      const lista = prod.extras || [];
      let nuevasExtras;
      let nuevasCantidades = { ...(prod.extrasCantidades||{}) };
      if(lista.includes(extra.nombre)){
        nuevasExtras = lista.filter(e=> e!==extra.nombre);
        // opcional: eliminar cantidad asociada
        delete nuevasCantidades[extra.nombre];
      } else {
        nuevasExtras = [...lista, extra.nombre];
        if(!nuevasCantidades[extra.nombre]) nuevasCantidades[extra.nombre]=1;
      }
      return { ...prod, extras: nuevasExtras, extrasCantidades: nuevasCantidades };
    }));
  };
  const handleChangeCantidadExtra = (ip, nombre, val)=> setProductos(p=>{ const n=[...p]; n[ip].extrasCantidades={...(n[ip].extrasCantidades||{}), [nombre]:val}; return n;});
  const handleAgregarExtraPersonalizado = (i)=>{
    if(!extraInput || !extraPrecioInput) return;
    setProductos(prev => prev.map((prod, idx)=>{
      if(idx!==i) return prod;
      const lista = prod.extrasPersonalizados ? [...prod.extrasPersonalizados] : [];
      lista.push({ nombre: extraInput, precio: parseInt(extraPrecioInput)||0 });
      const nuevoIndex = lista.length - 1; // index del que acabamos de agregar
      return {
        ...prod,
        extrasPersonalizados: lista,
        extrasPersonalizadosCant: { ...(prod.extrasPersonalizadosCant||{}), [nuevoIndex]: 1 }
      };
    }));
    setExtraInput('');
    setExtraPrecioInput('');
  };
  const handleEliminarExtraPersonalizado = (ip, idx)=> setProductos(p=>{ const n=[...p]; n[ip].extrasPersonalizados.splice(idx,1); const c={...(n[ip].extrasPersonalizadosCant||{})}; delete c[idx]; n[ip].extrasPersonalizadosCant=c; return n;});
  const handleChangeCantidadExtraPersonalizado = (ip, idx,val)=> setProductos(p=>{ const n=[...p]; n[ip].extrasPersonalizadosCant={...(n[ip].extrasPersonalizadosCant||{}), [idx]:val}; return n;});

  // Precios
  const calcularPrecio = (p,i)=>{ const {precioManual, precioEditado}=p; if(precioManual) return redondear5000(parseInt(precioManual)||0); if(precioEditado) return redondear5000(parseInt(precioEditado)||0); const r=getPrecioProducto(p,{ matricesOverride }); return r.ajustado; };
  const calcularSubtotalExtras = (p)=>{ const {tipo, cliente, extras=[], extrasCantidades={}, extrasPersonalizados=[], extrasPersonalizadosCant={}}=p; let subtotal=0; const lista=getExtrasPorTipo(tipo, extrasOverride); for(const nombre of extras){ const ex=lista.find(e=> e.nombre===nombre); if(ex){ const cant=parseInt(extrasCantidades[nombre])||1; subtotal += cant * (ex.precioDistribuidor || ex.precioCliente ? (cliente==='Distribuidor' ? (ex.precioDistribuidor||0) : (ex.precioCliente||0)) : (ex.precio||0)); } } for(const idx in extrasPersonalizados){ const ex=extrasPersonalizados[idx]; const cant=parseInt(extrasPersonalizadosCant[idx])||1; subtotal += cant*(ex.precio||0);} return redondear5000(subtotal); };

  // Estados para entradas libres (combobox)
  const [empresaNombreInput, setEmpresaNombreInput] = useState('');
  const [empresaNITInput, setEmpresaNITInput] = useState('');
  const [empresaCiudadInput, setEmpresaCiudadInput] = useState('');
  const [contactoNombreInput, setContactoNombreInput] = useState('');
  const [contactoEmailInput, setContactoEmailInput] = useState('');
  const [contactoTelInput, setContactoTelInput] = useState('');
  const [creandoEntidad, setCreandoEntidad] = useState(false);

  // Sincronizar inputs cuando se selecciona empresa/contacto
  useEffect(()=>{ 
    if(empresaSeleccionada){
      setEmpresaNombreInput(empresaSeleccionada.nombre||'');
      setEmpresaNITInput(empresaSeleccionada.nit||'');
      setEmpresaCiudadInput(empresaSeleccionada.ciudad||'');
    } else {
      // limpiar si se des-selecciona
      setEmpresaNombreInput('');
      setEmpresaNITInput('');
      setEmpresaCiudadInput('');
    }
    // al cambiar empresa limpiar contacto si no pertenece
    setContactoSeleccionado(null);
    setContactoNombreInput('');
    setContactoEmailInput('');
    setContactoTelInput('');
  }, [empresaSeleccionada]);
  useEffect(()=>{ 
    if(contactoSeleccionado){
      setContactoNombreInput(contactoSeleccionado.nombre||'');
      setContactoEmailInput(contactoSeleccionado.email||'');
      setContactoTelInput(contactoSeleccionado.telefono||'');
    }
  }, [contactoSeleccionado]);

  // Limpiar todo formulario de cliente al resetToken
  useEffect(()=>{ if(resetToken){
    setEmpresaSeleccionada(null);
    setContactoSeleccionado(null);
    setEmpresaNombreInput(''); setEmpresaNITInput(''); setEmpresaCiudadInput('');
    setContactoNombreInput(''); setContactoEmailInput(''); setContactoTelInput('');
  } }, [resetToken]);

  async function ensureEmpresaContacto(){
    // Si ya hay empresa seleccionada y contacto seleccionado, no hace falta crear (salvo cambios manuales detectados)
    // Intentar localizar empresa por NIT o nombre si no seleccionada
    const nitTrim = empresaNITInput.trim();
    const nombreEmpresaTrim = empresaNombreInput.trim();
    const ciudadTrim = empresaCiudadInput.trim();
    const nombreContTrim = contactoNombreInput.trim();
    const emailContTrim = contactoEmailInput.trim();
    const telContTrim = contactoTelInput.trim();

    // Eliminado soporte legacy de contacto sin empresa

    // Validación: no empresa sin contacto
    if((nitTrim || nombreEmpresaTrim) && !nombreContTrim && !emailContTrim && !contactoSeleccionado){
      toast.error('Debe ingresar datos de contacto');
      throw new Error('Contacto requerido');
    }

    let empresaRef = empresaSeleccionada;
    if(!empresaRef && nitTrim){
      const existente = await obtenerEmpresaPorNIT(nitTrim);
      if(existente){ empresaRef = existente; }
      else if(nombreEmpresaTrim){
        const id = await crearEmpresa({ nit: nitTrim, nombre: nombreEmpresaTrim, ciudad: ciudadTrim });
        toast.success('Empresa creada');
        const lista = await listarEmpresas(); setEmpresas(lista); empresaRef = lista.find(e=>e.id===id) || { id, nit:nitTrim, nombre:nombreEmpresaTrim, ciudad:ciudadTrim };
      } else {
        toast.error('Nombre empresa requerido');
        throw new Error('Nombre empresa requerido');
      }
    }
    if(!empresaRef && nombreEmpresaTrim && !nitTrim){
      // Crear empresa sin NIT (permitido?) -> se permite con NIT vacío
      const id = await crearEmpresa({ nit:'', nombre: nombreEmpresaTrim, ciudad: ciudadTrim });
      toast.success('Empresa creada');
      const lista = await listarEmpresas(); setEmpresas(lista); empresaRef = lista.find(e=>e.id===id) || { id, nit:'', nombre:nombreEmpresaTrim, ciudad:ciudadTrim };
    }
    if(empresaRef) setEmpresaSeleccionada(empresaRef);

    let contactoRef = contactoSeleccionado;
    if(empresaRef && !contactoRef && (nombreContTrim || emailContTrim)){
      let existente = null;
      if(emailContTrim){ existente = await buscarContactoPorEmail(empresaRef.id, emailContTrim); }
      if(!existente){
        const id = await crearContacto(empresaRef.id, { nombre: nombreContTrim || emailContTrim || 'Contacto', email: emailContTrim, telefono: telContTrim });
        toast.success('Contacto creado');
        const listaC = await listarContactos(empresaRef.id); setContactosEmpresa(listaC); existente = listaC.find(c=>c.id===id) || { id, nombre:nombreContTrim, email:emailContTrim, telefono:telContTrim };
      }
      contactoRef = existente;
    }
    if(contactoRef) setContactoSeleccionado(contactoRef);
  }

  const handleSubmit = async ()=>{
    setCreandoEntidad(true);
    try {
      await ensureEmpresaContacto();
    } catch(e){ console.error(e); toast.error('Error creando empresa/contacto'); }
    finally { setCreandoEntidad(false); }

    const productosCotizados = productos.map((p,i)=> ({...p, precioCalculado: calcularPrecio(p,i), subtotalExtras: calcularSubtotalExtras(p)}));
    let subtotal = productosCotizados.reduce((s,p)=> s + (p.precioCalculado||0)*(parseInt(p.cantidad)||1) + (p.subtotalExtras||0), 0);
    subtotal = redondear5000(aplicarAjuste(subtotal, ajusteTotalTipo, parseFloat(ajusteTotalValor)));
    const iva = Math.round(subtotal*0.19);
    const total = subtotal + iva;
    const cotizacion = {
      cliente, // alias libre
      empresaId: empresaSeleccionada?.id || null,
      empresaNIT: empresaSeleccionada?.nit || empresaNITInput.trim() || '',
      empresaCiudad: empresaSeleccionada?.ciudad || empresaCiudadInput || '',
      nombreCliente: empresaSeleccionada?.nombre || empresaNombreInput || cliente,
      contactoId: contactoSeleccionado?.id || null,
      clienteContacto: contactoSeleccionado?.nombre || contactoNombreInput || '',
      clienteNIT: empresaSeleccionada?.nit || empresaNITInput || '',
      clienteCiudad: empresaSeleccionada?.ciudad || empresaCiudadInput || '',
      clienteEmail: contactoSeleccionado?.email || contactoEmailInput || '',
      clienteTelefono: contactoSeleccionado?.telefono || contactoTelInput || '',
  clienteId: null,
      productos: productosCotizados,
      subtotal, iva, total,
      ajusteGeneral: { tipo: ajusteTotalTipo, porcentaje: parseFloat(ajusteTotalValor)||0 }
    };
    setQuoteData(prev=> ({...prev, ...cotizacion}));
    navigate('/preview');
  };

  // Preview en vivo
  const previewBruto = redondear5000(productos.reduce((s,p,i)=> s + calcularPrecio(p,i)*(parseInt(p.cantidad)||1) + calcularSubtotalExtras(p),0));
  const previewAjustado = redondear5000(aplicarAjuste(previewBruto, ajusteTotalTipo, parseFloat(ajusteTotalValor)||0));
  const previewIVA = Math.round(previewAjustado*0.19);
  const previewTotal = previewAjustado + previewIVA;

  return (
    <div className="max-w-7xl mx-auto p-4 lg:p-6 text-gray-900 dark:text-gray-100">
      {quoteData?.modoEdicion && (
        <div className="mb-4 p-4 rounded-md border border-yellow-400/40 bg-yellow-50 dark:bg-gris-800 dark:border-trafico/60 flex flex-col md:flex-row md:items-center md:justify-between gap-3 shadow-sm">
          <div>
            <p className="text-sm font-semibold tracking-wide">Editando cotización #{quoteData.numero || '—'}</p>
            <p className="text-[11px] mt-1 opacity-80">Al generar PDF o guardar, se sobrescribe la existente.</p>
          </div>
          <button type="button" onClick={()=>{ setQuoteData({}); setProductos([crearProductoInicial()]); setCliente(''); setAjusteTotalTipo('Descuento'); setAjusteTotalValor(0); }} className="inline-flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white text-xs font-medium px-3 py-2 rounded shadow">Salir modo edición</button>
        </div>
      )}
      <h1 className="text-2xl font-bold mb-4">Generar Cotización</h1>
      <div className="flex flex-col lg:flex-row gap-8">
        <div className="flex-1 space-y-6">
          <div className="p-4 rounded-lg border border-gray-200 dark:border-gris-700 bg-white dark:bg-gris-900 shadow-sm">
            {/* Empresa */}
            <div className="mb-4">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-2">Empresa</p>
              <div className="grid md:grid-cols-4 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-medium">Nombre Empresa</label>
                  <input list="listaEmpresas" value={empresaNombreInput} onChange={e=>{ const val=e.target.value; setEmpresaNombreInput(val); const emp=empresas.find(em=> em.nombre.toLowerCase()===val.toLowerCase()); if(emp){ setEmpresaSeleccionada(emp); setEmpresaNITInput(emp.nit||''); setEmpresaCiudadInput(emp.ciudad||''); } else { setEmpresaSeleccionada(null);} }} className="border p-2 rounded bg-white dark:bg-gris-800 dark:border-gris-600 text-sm" placeholder="Empresa (opcional)" />
                  <datalist id="listaEmpresas">{empresas.map(em=> <option key={em.id} value={em.nombre} />)}</datalist>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-medium">NIT</label>
                  <input value={empresaNITInput} onChange={e=> setEmpresaNITInput(e.target.value)} className="border p-2 rounded bg-white dark:bg-gris-800 dark:border-gris-600 text-sm" placeholder="NIT" />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-medium">Ciudad</label>
                  <input value={empresaCiudadInput} onChange={e=> setEmpresaCiudadInput(e.target.value)} className="border p-2 rounded bg-white dark:bg-gris-800 dark:border-gris-600 text-sm" placeholder="Ciudad" />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-medium">Alias / Referencia</label>
                  <input value={cliente} onChange={e=> setCliente(e.target.value)} className="border p-2 rounded bg-white dark:bg-gris-800 dark:border-gris-600 text-sm" placeholder="Alias interno (opcional)" />
                </div>
              </div>
            </div>
            <hr className="my-2 border-dashed border-gray-300 dark:border-gris-700" />
            {/* Contacto */}
            <div className="mb-2">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-2">Contacto</p>
              <div className="grid md:grid-cols-6 gap-3 items-start">
                <div className="flex flex-col gap-1 md:col-span-2">
                  <label className="text-[11px] font-medium">Nombre Contacto *</label>
                  <input list="listaContactos" value={contactoNombreInput} onChange={e=>{ const val=e.target.value; setContactoNombreInput(val); if(empresaSeleccionada){ const cont=contactosEmpresa.find(c=> c.nombre.toLowerCase()===val.toLowerCase()); if(cont){ setContactoSeleccionado(cont); setContactoEmailInput(cont.email||''); setContactoTelInput(cont.telefono||''); } else { setContactoSeleccionado(null);} } }} className="border p-2 rounded bg-white dark:bg-gris-800 dark:border-gris-600 text-sm" placeholder="Nombre Contacto" />
                  <datalist id="listaContactos">{contactosEmpresa.map(c=> <option key={c.id} value={c.nombre} />)}</datalist>
                </div>
                <div className="flex flex-col gap-1 md:col-span-3">
                  <label className="text-[11px] font-medium">Email</label>
                  <input value={contactoEmailInput} onChange={e=> setContactoEmailInput(e.target.value)} className="border p-2 rounded bg-white dark:bg-gris-800 dark:border-gris-600 text-sm" placeholder="email@dominio" />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-medium">Teléfono</label>
                  <input value={contactoTelInput} onChange={e=> setContactoTelInput(e.target.value)} className="border p-2 rounded bg-white dark:bg-gris-800 dark:border-gris-600 text-sm" placeholder="Teléfono" />
                </div>
                <div className="flex flex-col gap-1 md:col-span-2">
                  <button type="button" onClick={async ()=>{ setCreandoEntidad(true); try { await ensureEmpresaContacto(); } catch(e){ /* handled */ } finally { setCreandoEntidad(false);} }} className="mt-5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium px-4 py-2 rounded disabled:opacity-60 w-full" disabled={creandoEntidad}>{creandoEntidad? 'Validando...':'Validar / Crear'}</button>
                </div>
              </div>
            </div>
            <p className="text-[10px] text-gray-500 dark:text-gray-400 mb-2">Puede existir contacto sin empresa; si ingresa empresa debe incluir contacto. *Contacto obligatorio para crear.</p>
            <div className="flex flex-wrap gap-3 text-[11px] text-gray-600 dark:text-gray-400 border-t pt-2 border-dashed border-gray-300 dark:border-gris-700">
              {empresaSeleccionada && <span>Empresa: {empresaSeleccionada.nombre}{empresaSeleccionada.nit? ` (${empresaSeleccionada.nit})`:''}</span>}
              {contactoSeleccionado && <span>Contacto: {contactoSeleccionado.nombre}</span>}
              {contactoSeleccionado?.email && <span>{contactoSeleccionado.email}</span>}
            </div>
          </div>
          <div className="space-y-4">
            {productos.map((producto,i)=>{ const precioHeader=calcularPrecio(producto,i); const extrasHeader=calcularSubtotalExtras(producto); return (
              <div key={i} className="rounded-lg border border-gray-200 dark:border-gris-700 bg-white dark:bg-gris-900 shadow-sm overflow-hidden transition">
                <div className="flex items-start md:items-center justify-between gap-4 p-4 border-b border-gray-100 dark:border-gris-700">
                  <div className="min-w-0 flex-1">
                    <button type="button" onClick={()=> setCollapsed(c=> c.map((v,idx)=> idx===i ? !v : v))} className="text-left w-full group">
                      <div className="flex items-center gap-2">
                        <span className="inline-flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-semibold bg-indigo-600 text-white">{i+1}</span>
                        <h2 className="font-semibold text-sm md:text-base truncate">{producto.nombrePersonalizado || producto.tipo} {collapsed[i] && <span className="opacity-60 font-normal">(colapsado)</span>}</h2>
                      </div>
                      <div className="mt-1 text-[11px] md:text-xs flex flex-wrap gap-x-4 gap-y-1 text-gray-600 dark:text-gray-400">
                        <span>{producto.ancho && producto.alto ? `${producto.ancho}×${producto.alto} mm` : 'Sin medidas'}</span>
                        <span>Cliente: {producto.cliente}</span>
                        <span>Precio: {precioHeader.toLocaleString('es-CO',{style:'currency',currency:'COP',minimumFractionDigits:0})}</span>
                        {extrasHeader>0 && <span>Extras: ${extrasHeader.toLocaleString()}</span>}
                        <span>Cant: {producto.cantidad}</span>
                      </div>
                    </button>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <button onClick={()=> setCollapsed(c=> c.map((v,idx)=> idx===i ? !v : v))} className="text-xs px-2 py-1 rounded bg-gray-200 dark:bg-gris-700 hover:bg-gray-300 dark:hover:bg-gris-600">{collapsed[i] ? 'Expandir' : 'Colapsar'}</button>
                    <button onClick={()=> handleEliminarProducto(i)} className="text-xs px-2 py-1 rounded bg-red-600 text-white hover:bg-red-500">Eliminar</button>
                  </div>
                </div>
                {!collapsed[i] && (
                  <div className="p-4 space-y-4 text-sm">
                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="block text-xs font-semibold tracking-wide uppercase">Producto</label>
                        <select value={producto.tipo} onChange={e=> handleChangeProducto(i,'tipo', e.target.value)} className="w-full border p-2 rounded bg-white dark:bg-gris-800 dark:border-gris-600">
                          {[...PRODUCTOS_ACTIVOS, 'Productos Personalizados', 'Repuestos'].map(t=> <option key={t} value={t}>{t}</option>)}
                        </select>
                        {(producto.tipo==='Productos Personalizados'||producto.tipo==='Repuestos') && <p className="text-[11px] text-yellow-600 dark:text-trafico mt-1">Sin precio automático. Ingrese precio manual.</p>}
                        {(producto.tipo==='Productos Personalizados'||producto.tipo==='Repuestos') && (
                          <div className="mt-1"><input type="text" value={producto.nombrePersonalizado||''} onChange={e=>{ const n=[...productos]; n[i].nombrePersonalizado=e.target.value; setProductos(n);} } placeholder="Nombre personalizado" className="w-full border p-2 rounded bg-white dark:bg-gris-800 dark:border-gris-600" /></div>
                        )}
                      </div>
                      <div className="space-y-2">
                        <label className="block text-xs font-semibold tracking-wide uppercase">Tipo de Cliente</label>
                        <select value={producto.cliente} onChange={e=> handleChangeProducto(i,'cliente', e.target.value)} className="w-full border p-2 rounded bg-white dark:bg-gris-800 dark:border-gris-600">
                          {Object.keys(CLIENTE_FACTORES).concat(producto.tipo==='Divisiones Térmicas' ? ['Carrocerías Panamericana']:[]).map(t=> <option key={t} value={t}>{t}</option>)}
                        </select>
                      </div>
                      {getConfigProducto(producto.tipo)?.requiereMedidas && (
                        <div className="space-y-2"><label className="block text-xs font-semibold tracking-wide uppercase">Ancho (mm)</label><input type="number" value={producto.ancho} onChange={e=> handleChangeProducto(i,'ancho', e.target.value)} className="w-full border p-2 rounded bg-white dark:bg-gris-800 dark:border-gris-600" placeholder="Ancho" /></div>
                      )}
                      {getConfigProducto(producto.tipo)?.requiereMedidas && (
                        <div className="space-y-2"><label className="block text-xs font-semibold tracking-wide uppercase">Alto (mm)</label><input type="number" value={producto.alto} onChange={e=> handleChangeProducto(i,'alto', e.target.value)} className="w-full border p-2 rounded bg-white dark:bg-gris-800 dark:border-gris-600" placeholder="Alto" /></div>
                      )}
                      {producto.tipo === 'Semáforo para Muelles de Carga' && (
                        <div className="space-y-2"><label className="block text-xs font-semibold tracking-wide uppercase">Variante</label>
                          <select value={producto.varianteSemaforo||'sencillo'} onChange={e=> handleChangeProducto(i,'varianteSemaforo', e.target.value)} className="w-full border p-2 rounded bg-white dark:bg-gris-800 dark:border-gris-600">
                            <option value="sencillo">Semáforo Sencillo (1 semáforo)</option>
                            <option value="doble">Semáforo Doble (2 semáforos)</option>
                            <option value="doble_sensor">Semáforo Doble con Sensor</option>
                          </select>
                        </div>
                      )}
                      {producto.tipo === 'Lámpara Industrial' && (
                        <div className="space-y-2"><label className="block text-xs font-semibold tracking-wide uppercase">Modelo</label>
                          <input disabled value="LED 50W" className="w-full border p-2 rounded bg-gray-100 dark:bg-gris-800 dark:border-gris-700 text-gray-600 dark:text-gray-400" />
                        </div>
                      )}
                      {producto.tipo === 'Cortina Thermofilm' && (
                        <div className="space-y-2"><label className="block text-xs font-semibold tracking-wide uppercase">Instalación</label>
                          <select value={producto.conInstalacion? 'si':'no'} onChange={e=> handleChangeProducto(i,'conInstalacion', e.target.value==='si')} className="w-full border p-2 rounded bg-white dark:bg-gris-800 dark:border-gris-600">
                            <option value="si">Con instalación (180.000 / m²)</option>
                            <option value="no">Sin instalación (175.000 / m²)</option>
                          </select>
                        </div>
                      )}
                      <div className="space-y-2 md:col-span-2"><label className="block text-xs font-semibold tracking-wide uppercase">Información Adicional</label><input type="text" value={producto.infoAdicional||''} onChange={e=> handleChangeProducto(i,'infoAdicional', e.target.value)} className="w-full border p-2 rounded bg-white dark:bg-gris-800 dark:border-gris-600" placeholder="(Ej: Muelle 3, Placa 5, Zona Fría)" /></div>
                      <div className="space-y-2"><label className="block text-xs font-semibold tracking-wide uppercase">Cantidad</label><input type="number" value={producto.cantidad} onChange={e=> handleChangeProducto(i,'cantidad', e.target.value)} className="w-full border p-2 rounded bg-white dark:bg-gris-800 dark:border-gris-600" /></div>
                      <div className="space-y-2"><label className="block text-xs font-semibold tracking-wide uppercase">Precio Manual</label><input type="number" value={producto.precioManual} onChange={e=> handleChangeProducto(i,'precioManual', e.target.value)} className="w-full border p-2 rounded bg-white dark:bg-gris-800 dark:border-gris-600" placeholder="Opcional" /></div>
                      <div className="space-y-2"><label className="block text-xs font-semibold tracking-wide uppercase">Ajuste (%)</label><div className="flex gap-2"><select value={producto.ajusteTipo} onChange={e=> handleChangeProducto(i,'ajusteTipo', e.target.value)} className="border p-2 rounded bg-white dark:bg-gris-800 dark:border-gris-600 text-xs"><option value='Incremento'>Incremento</option><option value='Descuento'>Descuento</option></select><input type="number" value={producto.ajusteValor} onChange={e=> handleChangeProducto(i,'ajusteValor', e.target.value)} className="border p-2 rounded w-24 bg-white dark:bg-gris-800 dark:border-gris-600" placeholder="%" /></div></div>
                      {producto.tipo==='Sello de Andén' && (<div className="space-y-2 md:col-span-2"><label className="block text-xs font-semibold tracking-wide uppercase">Componentes Sello</label><div className="flex flex-wrap gap-4 text-xs">{['cortina','postes laterales','travesaño','sello completo'].map(comp=> (<label key={comp} className="inline-flex items-center gap-1"><input type="checkbox" checked={producto.componentes?.includes(comp)} onChange={()=>{ const nuevos=[...(producto.componentes||[])]; if(nuevos.includes(comp)){ nuevos.splice(nuevos.indexOf(comp),1);} else { nuevos.push(comp);} handleChangeProducto(i,'componentes', nuevos); }} /><span className="capitalize">{comp}</span></label>))}</div></div>)}
                    </div>
                    {alertas[i] && (<div className="p-3 bg-yellow-100 border border-yellow-300 text-yellow-800 rounded text-xs">Medidas fuera de rango. Ingrese un precio manual:<input type="number" className="w-full border p-2 rounded mt-2 bg-white dark:bg-gris-800 dark:border-gris-600" value={producto.precioEditado} placeholder="Precio manual" onChange={e=> handleChangeProducto(i,'precioEditado', e.target.value)} /></div>)}
                    <div className="space-y-3">
                      <div>
                        <label className="block text-xs font-semibold tracking-wide uppercase mb-1">Extras</label>
                        <div className="grid sm:grid-cols-2 gap-2">
                          {(((extrasOverride&&extrasOverride[producto.tipo])||EXTRAS_POR_DEFECTO[producto.tipo])||[]).map((extra,idx)=>{
                            const checked = producto.extras.includes(extra.nombre);
                            const precioMostrar = extra.precio !== undefined ? extra.precio : (producto.cliente==='Distribuidor' ? (extra.precioDistribuidor||0) : (extra.precioCliente||0));
                            return (
                              <label key={idx} className={`flex items-center gap-2 rounded border px-2 py-1 text-[11px] cursor-pointer transition ${checked?'bg-indigo-50 dark:bg-indigo-600/30 border-indigo-300 dark:border-indigo-500':'bg-white dark:bg-gris-800 border-gray-200 dark:border-gris-600 hover:border-indigo-300 dark:hover:border-indigo-400'}`}>
                                <input type="checkbox" className="scale-90" checked={checked} onChange={()=> handleToggleExtra(i, extra)} />
                                <span className="flex-1 truncate" title={extra.nombre}>{extra.nombre} $ {precioMostrar?.toLocaleString?.()}</span>
                                {checked && (
                                  <input
                                    type="number"
                                    min='1'
                                    className="w-14 border rounded p-1 text-right bg-white dark:bg-gris-900 dark:border-gris-600"
                                    value={producto.extrasCantidades[extra.nombre]||1}
                                    onChange={e=> handleChangeCantidadExtra(i, extra.nombre, e.target.value)}
                                  />
                                )}
                              </label>
                            );
                          })}
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-semibold tracking-wide uppercase mb-1">Extras Personalizados</label>
                        <div className="flex flex-wrap gap-2 mb-2">
                          <input type="text" placeholder="Nombre" className="flex-1 min-w-[160px] border p-2 rounded bg-white dark:bg-gris-800 dark:border-gris-600" value={extraInput} onChange={e=> setExtraInput(e.target.value)} />
                          <input type="number" placeholder="Precio" className="w-32 border p-2 rounded bg-white dark:bg-gris-800 dark:border-gris-600" value={extraPrecioInput} onChange={e=> setExtraPrecioInput(e.target.value)} />
                          <button type="button" onClick={()=> handleAgregarExtraPersonalizado(i)} className="px-3 py-2 rounded bg-blue-600 hover:bg-blue-700 text-white text-xs">Añadir</button>
                        </div>
                        <div className="space-y-1">
                          {(producto.extrasPersonalizados||[]).map((ex,idx)=>(<div key={idx} className="flex items-center justify-between text-[12px] bg-gray-50 dark:bg-gris-800 border border-gray-200 dark:border-gris-700 rounded px-2 py-1"><div className="flex flex-wrap gap-2"><span className="font-medium">{ex.nombre}</span><span>${ex.precio.toLocaleString()}</span><input type="number" min='1' className="w-16 border rounded p-1 text-right bg-white dark:bg-gris-900 dark:border-gris-600" value={producto.extrasPersonalizadosCant[idx]||1} onChange={e=> handleChangeCantidadExtraPersonalizado(i, idx, e.target.value)} /></div><button type="button" onClick={()=> handleEliminarExtraPersonalizado(i, idx)} className="text-red-600 text-xs hover:underline">Eliminar</button></div>))}
                        </div>
                      </div>
                    </div>
                    <div className="pt-2 border-t border-dashed border-gray-200 dark:border-gris-700 text-xs flex flex-wrap gap-x-6 gap-y-1"><span className="font-medium">Precio: {precioHeader.toLocaleString('es-CO',{style:'currency',currency:'COP',minimumFractionDigits:0})}</span><span>Extras: ${extrasHeader.toLocaleString()}</span><span>Total item: {(precioHeader*(parseInt(producto.cantidad)||1)+extrasHeader).toLocaleString('es-CO',{style:'currency',currency:'COP',minimumFractionDigits:0})}</span></div>
                  </div>
                )}
              </div>
            );})}
            <div><button onClick={handleAgregarProducto} className="mt-2 inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium px-4 py-2 rounded shadow focus:outline-none focus:ring-2 focus:ring-indigo-400">+ Agregar producto</button></div>
          </div>
        </div>
        <div className="w-full lg:w-80 xl:w-96 flex-shrink-0">
          <div className="lg:sticky lg:top-4 space-y-6">
            <div className="p-5 rounded-lg border border-gray-200 dark:border-gris-700 bg-white dark:bg-gris-900 shadow-sm">
              <h2 className="text-sm font-semibold tracking-wide uppercase mb-3 text-gray-600 dark:text-gray-300">Ajuste general</h2>
              <div className="flex items-center gap-3 mb-4">
                <select value={ajusteTotalTipo} onChange={e=> setAjusteTotalTipo(e.target.value)} className="border p-2 rounded bg-white dark:bg-gris-800 dark:border-gris-600 text-sm"><option value='Descuento'>Descuento</option><option value='Incremento'>Incremento</option></select>
                <input type="number" value={ajusteTotalValor} onChange={e=> setAjusteTotalValor(e.target.value)} placeholder="%" className="border p-2 rounded w-24 bg-white dark:bg-gris-800 dark:border-gris-600 text-sm" /><span className="text-xs">%</span>
              </div>
              <div className="text-xs space-y-1 font-mono">
                <div className="flex justify-between"><span>Bruto</span><span>{previewBruto.toLocaleString('es-CO',{style:'currency',currency:'COP',minimumFractionDigits:0})}</span></div>
                <div className="flex justify-between"><span>Ajustado</span><span>{previewAjustado.toLocaleString('es-CO',{style:'currency',currency:'COP',minimumFractionDigits:0})}</span></div>
                <div className="flex justify-between"><span>IVA (19%)</span><span>{previewIVA.toLocaleString('es-CO',{style:'currency',currency:'COP',minimumFractionDigits:0})}</span></div>
                <div className="flex justify-between text-sm pt-1 border-t border-gray-200 dark:border-gris-700 font-semibold"><span>Total</span><span>{previewTotal.toLocaleString('es-CO',{style:'currency',currency:'COP',minimumFractionDigits:0})}</span></div>
              </div>
              <button onClick={handleSubmit} className="w-full mt-4 bg-green-600 hover:bg-green-700 text-white py-2.5 rounded font-medium shadow focus:outline-none focus:ring-2 focus:ring-green-400">Generar Cotización</button>
            </div>
            <div className="p-4 rounded-lg border border-dashed border-gray-300 dark:border-gris-700 bg-gray-50 dark:bg-gris-800 text-[11px] leading-relaxed">
              <p className="mb-1 font-semibold text-gray-700 dark:text-gray-200">Tips de uso</p>
              <ul className="list-disc list-inside space-y-1">
                <li>Colapsa tarjetas para enfocarte en otro producto.</li>
                <li>El resumen se actualiza en tiempo real.</li>
                <li>Para precios fuera de rango ingresa un manual.</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


