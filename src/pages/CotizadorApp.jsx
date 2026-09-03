import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { priceMatrices, CLIENTE_FACTORES, EXTRAS_POR_DEFECTO, buscarPrecio, buscarPrecioAbrigo, matrizPanamericana, redondearPrecio, getPasoRedondeo } from '../data/precios';
import { getPrecioProducto, validarRangoProducto, getConfigProducto, getFactorCliente } from '../data/catalogoProductos';
import { PRODUCTOS_ACTIVOS } from '../data/catalogoProductos';
import { useQuote } from '../context/QuoteContext';
import { listarEmpresas, listarContactos, obtenerEmpresaPorNIT, resolverOCrearEmpresa, resolverOCrearContacto } from '../utils/firebaseCompanies';
import { waitForAuth, getAuthError } from '../firebase';
import toast from 'react-hot-toast';
import { numeroALetras } from '../utils/numeroALetras';
import Combobox from '../components/ui/Combobox';
import { calcularSubtotalExtras as sumarExtras, calcularTotales } from '../utils/totales';

import PageHeader from "../components/ui/PageHeader";
// Utilidades
// Pista de cliente: mostrar variación vs Cliente Final (baseline)
const obtenerPistaCliente = (clienteTipo) => {
  const base = CLIENTE_FACTORES['Cliente Final Contado'] || 1;
  const actual = CLIENTE_FACTORES[clienteTipo] || 1;
  const ratio = actual / base;
  const deltaPct = Math.round((ratio - 1) * 100);
  if (deltaPct === 0) return 'Cliente Final (base)';
  return `${clienteTipo} (${deltaPct > 0 ? '+' : ''}${deltaPct}%) vs Cliente Final`;
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
  // En blanco = sin ajuste. Un 0 escrito obliga a borrarlo antes de teclear.
  ajusteValor: '',
  conInstalacion: true, // para Cortina Thermofilm
});

export default function CotizadorApp(){
  const { quoteData, setQuoteData,
    empresas, setEmpresas, empresaSeleccionada, setEmpresaSeleccionada, contactoSeleccionado, setContactoSeleccionado,
    matricesOverride, extrasOverride, productosOverride,
    productosDB, resetToken, setResetToken, confirm } = useQuote();
  const navigate = useNavigate();

  const [productos, setProductos] = useState([crearProductoInicial()]);
  const [cliente, setCliente] = useState('');
  const [extrasInputs, setExtrasInputs] = useState({});
  const [alertas, setAlertas] = useState([]);
  const [ajusteTotalTipo, setAjusteTotalTipo] = useState('Descuento');
  const [ajusteTotalValor, setAjusteTotalValor] = useState('');
  const [collapsed, setCollapsed] = useState([]);

  // Cargar empresas (nuevo modelo)
  useEffect(()=>{ (async()=>{ try { await waitForAuth(); const err = getAuthError(); if(err==='auth/configuration-not-found' || err==='auth/operation-not-allowed'){ console.error('Anonymous Auth no está habilitada en Firebase.'); return; } if(!empresas || empresas.length===0){ const le = await listarEmpresas(); setEmpresas(le); } } catch(e){ console.error(e); } })(); }, []);
  // Al seleccionar empresa cargar contactos
  const [contactosEmpresa, setContactosEmpresa] = useState([]);
  useEffect(()=>{ (async()=>{ if(empresaSeleccionada){ try { await waitForAuth(); const lc = await listarContactos(empresaSeleccionada.id); setContactosEmpresa(lc);} catch(e){ console.error(e);} } else { setContactosEmpresa([]); setContactoSeleccionado(null);} })(); }, [empresaSeleccionada]);
  // Sincronizar nombre cliente mostrado con empresa/contacto/legacy
  useEffect(()=>{ if(empresaSeleccionada){ setCliente(empresaSeleccionada.nombre||''); } }, [empresaSeleccionada]);
  // Edición
  useEffect(()=>{
    if(quoteData?.productos?.length){
      setProductos(quoteData.productos);
      setCliente(quoteData.cliente||'');
      setAjusteTotalTipo(quoteData.ajusteGeneral?.tipo||'Descuento');
      setAjusteTotalValor(quoteData.ajusteGeneral?.porcentaje||0);
      if(quoteData.nombreCliente) setEmpresaNombreInput(quoteData.nombreCliente);
      if(quoteData.clienteNIT || quoteData.empresaNIT) setEmpresaNITInput(quoteData.clienteNIT || quoteData.empresaNIT || '');
      if(quoteData.clienteCiudad || quoteData.empresaCiudad) setEmpresaCiudadInput(quoteData.clienteCiudad || quoteData.empresaCiudad || '');
      if(quoteData.clienteContacto) setContactoNombreInput(quoteData.clienteContacto);
      if(quoteData.clienteEmail) setContactoEmailInput(quoteData.clienteEmail);
      if(quoteData.clienteTelefono) setContactoTelInput(quoteData.clienteTelefono);
    }
  }, [quoteData?._editToken]);
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
  useEffect(()=>{ if(resetToken){ setProductos([crearProductoInicial()]); setCliente(''); setAjusteTotalTipo('Descuento'); setAjusteTotalValor(''); setExtrasInputs({}); setQuoteData({}); setResetToken(null);} },[resetToken]);
  // Sincronizar collapsed
  useEffect(()=>{ setCollapsed(prev=> productos.map((_,i)=> prev[i]??false)); }, [productos.length]);
  // Alertas rango
  useEffect(()=>{ const nuevas=productos.map(p=> validarRangoProducto(p,{ matricesOverride, productosOverride })); setAlertas(nuevas); }, [productos, matricesOverride, productosOverride]);

  const handleAgregarProducto = ()=>{
    const baseCliente = productos[0]?.cliente || 'Cliente Final Contado';
    const newIndex = productos.length;
    const nuevoProducto = { ...crearProductoInicial(), cliente: baseCliente };
    setProductos(p=> [...p, nuevoProducto]);
    setAlertas(a=> [...a,false]);
    setCollapsed(prev => [...prev.map(() => true), false]);
    setTimeout(() => {
      document.getElementById(`producto-card-${newIndex}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 80);
  };
  const handleEliminarProducto = async (i)=>{
    const ok = await confirm('¿Eliminar este producto de la cotización?');
    if(!ok) return;
    setProductos(p=> p.filter((_,idx)=> idx!==i));
    setAlertas(a=> a.filter((_,idx)=> idx!==i));
    setExtrasInputs(prev=>{ const next={}; Object.entries(prev).forEach(([k,v])=>{ const ki=parseInt(k); if(ki<i) next[ki]=v; else if(ki>i) next[ki-1]=v; }); return next; });
  };
  const handleChangeProducto = (i,campo,valor)=>{ setProductos(p=> { const n=[...p]; n[i][campo]=valor; if(campo==='tipo'){ n[i].extras=[]; n[i].extrasCantidades={}; n[i].extrasPersonalizados=[]; n[i].extrasPersonalizadosCant={}; n[i].precioManual=''; n[i].precioEditado=''; n[i].componentes = valor === 'Sello de Andén' ? ['sello completo'] : []; n[i].cliente='Cliente Final Contado'; } if(campo==='cliente'){ n[i].precioManual=''; n[i].precioEditado=''; } return n;}); };
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
    const inp = extrasInputs[i] || {};
    if(!inp.nombre || !inp.precio) return;
    setProductos(prev => prev.map((prod, idx)=>{
      if(idx!==i) return prod;
      const lista = prod.extrasPersonalizados ? [...prod.extrasPersonalizados] : [];
      lista.push({ nombre: inp.nombre, precio: parseInt(inp.precio)||0 });
      const nuevoIndex = lista.length - 1;
      return {
        ...prod,
        extrasPersonalizados: lista,
        extrasPersonalizadosCant: { ...(prod.extrasPersonalizadosCant||{}), [nuevoIndex]: 1 }
      };
    }));
    setExtrasInputs(prev => ({ ...prev, [i]: { nombre: '', precio: '' } }));
  };
  const handleEliminarExtraPersonalizado = (ip, idx) => setProductos(p => p.map((prod, i) => {
    if (i !== ip) return prod;
    const lista = prod.extrasPersonalizados.filter((_, j) => j !== idx);
    const oldCant = prod.extrasPersonalizadosCant || {};
    const nuevaCant = {};
    lista.forEach((_, j) => { nuevaCant[j] = oldCant[j >= idx ? j + 1 : j] ?? 1; });
    return { ...prod, extrasPersonalizados: lista, extrasPersonalizadosCant: nuevaCant };
  }));
  const handleChangeCantidadExtraPersonalizado = (ip, idx,val)=> setProductos(p=>{ const n=[...p]; n[ip].extrasPersonalizadosCant={...(n[ip].extrasPersonalizadosCant||{}), [idx]:val}; return n;});

  // Precios
  const calcularPrecio = (p,i)=>{ const {precioManual, precioEditado}=p; if(precioManual) return redondearPrecio(parseInt(precioManual)||0, p.tipo); if(precioEditado) return redondearPrecio(parseInt(precioEditado)||0, p.tipo); const r=getPrecioProducto(p,{ matricesOverride, productosOverride }); return r.ajustado; };
  // Suma exacta de los extras: el redondeo a 5.000 es regla de precio del
  // producto, no de los extras, que se imprimen uno a uno en la tabla.
  const calcularSubtotalExtras = (p)=> sumarExtras(p, extrasOverride);

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
    }
    // Al des-seleccionar NO se borran los campos: normalmente ocurre porque el
    // usuario está corrigiendo el nombre a mano y borrarlos le impedía escribir.
    // El borrado real lo hace "Nueva cotización" (resetToken).
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

  // Deja lista la empresa y el contacto (creándolos si hacen falta) y DEVUELVE
  // ambos. Devolverlos es indispensable: quien llama necesita el id en el mismo
  // ciclo para guardarlo en la cotización, y el estado de React todavía no está
  // actualizado ahí (por eso una empresa recién creada quedaba con id nulo).
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
    if(!empresaRef && (nitTrim || nombreEmpresaTrim)){
      // Un único punto de alta (ver firebaseCompanies.resolverOCrearEmpresa):
      // busca por NIT en dígitos, por nombre y por alias antes de crear. Antes
      // solo se miraba el NIT tal cual, así que el mismo cliente escrito con
      // puntos —o sin NIT— entraba otra vez cada vez que se cotizaba.
      const { empresa, creada } = await resolverOCrearEmpresa(
        { nit: nitTrim, nombre: nombreEmpresaTrim, ciudad: ciudadTrim },
        { empresas }
      );
      if(!empresa){
        toast.error('Nombre empresa requerido');
        throw new Error('Nombre empresa requerido');
      }
      toast.success(creada ? 'Empresa creada' : `Cliente ya registrado: ${empresa.nombre}`);
      const lista = await listarEmpresas(); setEmpresas(lista);
      empresaRef = lista.find(e=>e.id===empresa.id) || empresa;
    }
    if(empresaRef) setEmpresaSeleccionada(empresaRef);

    let contactoRef = contactoSeleccionado;
    if(empresaRef && !contactoRef && (nombreContTrim || emailContTrim)){
      // El contacto también se busca por nombre y no solo por email: la mayoría
      // entra sin correo, y por eso cada cotización creaba de nuevo al mismo
      // agente de compras.
      const { contacto, creada } = await resolverOCrearContacto(
        empresaRef.id,
        { nombre: nombreContTrim, email: emailContTrim, telefono: telContTrim }
      );
      if(creada) toast.success('Contacto creado');
      const listaC = await listarContactos(empresaRef.id); setContactosEmpresa(listaC);
      contactoRef = listaC.find(c=>c.id===contacto?.id) || contacto;
    }
    if(contactoRef) setContactoSeleccionado(contactoRef);
    return { empresa: empresaRef || null, contacto: contactoRef || null };
  }

  const handleSubmit = async ()=>{
    // Validar productos con alerta sin precio manual
    const sinPrecio = productos.findIndex((p,i)=> alertas[i] && !p.precioEditado && !p.precioManual);
    if(sinPrecio >= 0){
      setCollapsed(prev=> prev.map((c,i)=> i===sinPrecio ? false : c));
      setTimeout(()=>{ document.getElementById(`producto-card-${sinPrecio}`)?.scrollIntoView({ behavior:'smooth', block:'center' }); }, 100);
      toast.error('Ingresa un precio manual para el producto con medidas fuera de rango');
      return;
    }
    setCreandoEntidad(true);
    let empresaRef = null, contactoRef = null, ensureOk = false;
    try {
      ({ empresa: empresaRef, contacto: contactoRef } = await ensureEmpresaContacto());
      ensureOk = true;
    } catch(e){ console.error(e); toast.error('Error creando empresa/contacto'); }
    finally { setCreandoEntidad(false); }
    if (!ensureOk) return;

    const productosCotizados = productos.map((p,i)=> ({...p, precioCalculado: calcularPrecio(p,i), subtotalExtras: calcularSubtotalExtras(p)}));
    const ajusteGeneral = { tipo: ajusteTotalTipo, porcentaje: parseFloat(ajusteTotalValor)||0 };
    const { subtotal, iva, total } = calcularTotales(productosCotizados, ajusteGeneral, { extrasOverride });
    const cotizacion = {
      cliente, // alias libre
      empresaId: empresaRef?.id || null,
      empresaNIT: empresaRef?.nit || empresaNITInput.trim() || '',
      empresaCiudad: empresaRef?.ciudad || empresaCiudadInput || '',
      nombreCliente: empresaRef?.nombre || empresaNombreInput || cliente,
      contactoId: contactoRef?.id || null,
      clienteContacto: contactoRef?.nombre || contactoNombreInput || '',
      clienteNIT: empresaRef?.nit || empresaNITInput || '',
      clienteCiudad: empresaRef?.ciudad || empresaCiudadInput || '',
      clienteEmail: contactoRef?.email || contactoEmailInput || '',
      clienteTelefono: contactoRef?.telefono || contactoTelInput || '',
      // Misma llave que guardan las fichas de fabricación en `clienteId`:
      // apunta a `empresas/{id}`, para poder cruzar cotizaciones y fichas del
      // mismo cliente (ver utils/clienteVinculo.js).
      clienteId: empresaRef?.id || null,
      productos: productosCotizados,
      subtotal, iva, total,
      ajusteGeneral
    };
    setQuoteData(prev=> ({...prev, ...cotizacion}));
    navigate('/preview');
  };

  // Opciones para los autocompletar de empresa/contacto
  const opcionesEmpresas = React.useMemo(()=> (empresas||[]).map(em=> ({
    id: em.id,
    label: em.nombre || '',
    sublabel: [em.nit, em.ciudad].filter(Boolean).join(' · '),
    data: em,
  })), [empresas]);
  const opcionesContactos = React.useMemo(()=> (contactosEmpresa||[]).map(c=> ({
    id: c.id,
    label: c.nombre || '',
    sublabel: [c.email, c.telefono].filter(Boolean).join(' · '),
    data: c,
  })), [contactosEmpresa]);

  // Preview en vivo
  // Mismo cálculo que al guardar, para que el panel y el PDF nunca difieran.
  const { bruto: previewBruto, subtotal: previewAjustado, iva: previewIVA, total: previewTotal } =
    calcularTotales(productos, { tipo: ajusteTotalTipo, porcentaje: parseFloat(ajusteTotalValor)||0 }, {
      extrasOverride,
      precioUnitario: (p,i)=> calcularPrecio(p,i),
    });

  return (
    <div className="max-w-7xl mx-auto p-4 lg:p-6 pb-24 md:pb-6 text-gray-900 dark:text-gray-100">
      {quoteData?.modoEdicion && (
        <div className="mb-4 flex items-center gap-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-300 dark:border-amber-700 rounded-xl p-3 shadow-sm">
          <span className="text-2xl flex-shrink-0">✏️</span>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-amber-800 dark:text-amber-300 text-sm">Modo edición — Cotización #{quoteData.numero || '—'}</p>
            <p className="text-xs text-amber-600 dark:text-amber-400">Al generar, se sobrescribirá la cotización existente.</p>
          </div>
          <button type="button" onClick={()=>{ setQuoteData({}); setProductos([crearProductoInicial()]); setCliente(''); setAjusteTotalTipo('Descuento'); setAjusteTotalValor(''); }} className="flex-shrink-0 text-xs text-amber-700 dark:text-amber-400 underline hover:no-underline whitespace-nowrap">Salir edición</button>
        </div>
      )}
      <PageHeader section="/cotizar" title="Generar Cotización" />
      <nav className="sticky top-16 z-10 -mx-4 lg:mx-0 mb-4 flex gap-2 overflow-x-auto bg-gray-50/95 dark:bg-gris-900/95 backdrop-blur px-4 lg:px-0 py-2 text-xs font-medium">
        {[
          { href: '#seccion-empresa', label: '1. Empresa' },
          { href: '#seccion-productos', label: '2. Productos' },
          { href: '#seccion-total', label: '3. Total' },
        ].map(s => (
          <a
            key={s.href}
            href={s.href}
            onClick={(e)=>{ e.preventDefault(); document.querySelector(s.href)?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }}
            className="px-3 py-1.5 rounded-full border border-gray-300 dark:border-gris-600 bg-white dark:bg-gris-800 hover:border-indigo-400 hover:text-indigo-600 dark:hover:text-indigo-400 whitespace-nowrap transition-colors"
          >{s.label}</a>
        ))}
      </nav>
      <div className="flex flex-col lg:flex-row gap-8">
        <div className="flex-1 space-y-6">
          <div id="seccion-empresa" className="p-4 rounded-lg border border-gray-200 dark:border-gris-700 bg-white dark:bg-gris-900 shadow-sm scroll-mt-32">
            {/* Empresa */}
            <div className="mb-4">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-2">Empresa</p>
              <div className="grid md:grid-cols-4 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-medium">Nombre Empresa</label>
                  <Combobox
                    value={empresaNombreInput}
                    options={opcionesEmpresas}
                    placeholder="Empresa (opcional)"
                    emptyText="Sin empresas que coincidan"
                    inputClassName="border p-2 rounded bg-white dark:bg-gris-800 dark:border-gris-600 text-sm"
                    onChange={val=>{ setEmpresaNombreInput(val); const emp=empresas.find(em=> (em.nombre||'').toLowerCase()===val.toLowerCase()); if(emp){ setEmpresaSeleccionada(emp); setEmpresaNITInput(emp.nit||''); setEmpresaCiudadInput(emp.ciudad||''); } else { setEmpresaSeleccionada(null);} }}
                    onSelect={op=>{ setEmpresaSeleccionada(op.data); setEmpresaNITInput(op.data.nit||''); setEmpresaCiudadInput(op.data.ciudad||''); }}
                  />
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
                  <Combobox
                    value={contactoNombreInput}
                    options={opcionesContactos}
                    placeholder="Nombre Contacto"
                    emptyText={empresaSeleccionada? 'Sin contactos que coincidan' : 'Selecciona una empresa para ver sus contactos'}
                    inputClassName="border p-2 rounded bg-white dark:bg-gris-800 dark:border-gris-600 text-sm"
                    onChange={val=>{ setContactoNombreInput(val); if(empresaSeleccionada){ const cont=contactosEmpresa.find(c=> (c.nombre||'').toLowerCase()===val.toLowerCase()); if(cont){ setContactoSeleccionado(cont); setContactoEmailInput(cont.email||''); setContactoTelInput(cont.telefono||''); } else { setContactoSeleccionado(null);} } }}
                    onSelect={op=>{ setContactoSeleccionado(op.data); setContactoEmailInput(op.data.email||''); setContactoTelInput(op.data.telefono||''); }}
                  />
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
                  <p className="text-[10px] text-gray-400 dark:text-gray-500">Opcional: revisa aquí si la empresa/contacto ya existen antes de seguir. Si no lo usas, "Generar Cotización" los valida y crea igual al final.</p>
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
          <div id="seccion-productos" className="space-y-4 scroll-mt-32">
            <div className="flex items-center justify-between">
              <p className="text-xs text-gray-500 dark:text-gray-400">{productos.length} {productos.length === 1 ? 'producto' : 'productos'}</p>
              <div className="flex gap-3 text-xs">
                <button type="button" onClick={()=> setCollapsed(productos.map(()=> false))} className="text-indigo-600 dark:text-indigo-400 hover:underline">Expandir todo</button>
                <span className="text-gray-300 dark:text-gris-600">|</span>
                <button type="button" onClick={()=> setCollapsed(productos.map(()=> true))} className="text-indigo-600 dark:text-indigo-400 hover:underline">Colapsar todo</button>
              </div>
            </div>
            {productos.length === 1 && !productos[0].ancho && !productos[0].alto && (
              <div className="p-4 border-2 border-dashed border-blue-200 dark:border-blue-800 rounded-xl text-center text-gray-500 dark:text-gray-400 bg-blue-50/50 dark:bg-blue-900/10">
                <p className="text-2xl mb-1">📋</p>
                <p className="font-medium text-sm">Configura tu primer producto</p>
                <p className="text-xs mt-0.5">Selecciona el tipo, ingresa las medidas y el sistema calculará el precio automáticamente.</p>
              </div>
            )}
            {productos.map((producto,i)=>{ const precioHeader=calcularPrecio(producto,i); const extrasHeader=calcularSubtotalExtras(producto); return (
              <div key={i} id={`producto-card-${i}`} className={`rounded-lg border bg-white dark:bg-gris-900 shadow-sm overflow-hidden transition border-l-4 ${alertas[i] ? 'border-l-amber-400 border-gray-200 dark:border-gris-700' : 'border-l-transparent border-gray-200 dark:border-gris-700'}`}>
                <div className="flex items-start md:items-center justify-between gap-4 p-4 border-b border-gray-100 dark:border-gris-700">
                  <div className="min-w-0 flex-1">
                    <button type="button" onClick={()=> setCollapsed(c=> c.map((v,idx)=> idx===i ? !v : v))} className="text-left w-full group">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="inline-flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-semibold bg-indigo-600 text-white flex-shrink-0">{i+1}</span>
                        <h2 className="font-semibold text-sm md:text-base truncate">{producto.nombrePersonalizado || producto.tipo}</h2>
                        {alertas[i] && (
                          <span className="inline-flex items-center gap-1 bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400 text-[10px] px-2 py-0.5 rounded-full flex-shrink-0">⚠ Precio requerido</span>
                        )}
                      </div>
                      <div className="mt-1 text-[11px] md:text-xs flex flex-wrap gap-x-4 gap-y-1 text-gray-600 dark:text-gray-400">
                        <span>{producto.ancho && producto.alto ? `${producto.ancho}×${producto.alto} mm` : 'Sin medidas'}</span>
                        <span>Cliente: {obtenerPistaCliente(producto.cliente)}</span>
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
                          {[...(productosDB.length > 0 ? productosDB.filter(p=>p.activo!==false).map(p=>p.etiqueta) : PRODUCTOS_ACTIVOS), 'Productos Personalizados', 'Repuestos'].map(t=> <option key={t} value={t}>{t}</option>)}
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
                      {producto.tipo === 'Semáforo para Muelles de Carga' && (() => {
                        const variantesDB = productosOverride['Semáforo para Muelles de Carga']?.variantes || getConfigProducto('Semáforo para Muelles de Carga')?.variantes || [];
                        return (
                          <div className="space-y-2"><label className="block text-xs font-semibold tracking-wide uppercase">Variante</label>
                            <select value={producto.varianteSemaforo||variantesDB[0]?.id||'sencillo'} onChange={e=> handleChangeProducto(i,'varianteSemaforo', e.target.value)} className="w-full border p-2 rounded bg-white dark:bg-gris-800 dark:border-gris-600">
                              {variantesDB.map(v => <option key={v.id} value={v.id}>{v.nombre} — ${(v.precio||0).toLocaleString('es-CO')}</option>)}
                            </select>
                          </div>
                        );
                      })()}
                      {producto.tipo === 'Lámpara Industrial' && (
                        <div className="space-y-2"><label className="block text-xs font-semibold tracking-wide uppercase">Modelo</label>
                          <input disabled value="LED 50W" className="w-full border p-2 rounded bg-gray-100 dark:bg-gris-800 dark:border-gris-700 text-gray-600 dark:text-gray-400" />
                        </div>
                      )}
                      {producto.tipo === 'Cortina Thermofilm' && (() => {
                        const dbT = productosOverride['Cortina Thermofilm'];
                        const precioConIns = (dbT?.precioPorM2ConInstalacion ?? 180000).toLocaleString('es-CO');
                        const precioSinIns = (dbT?.precioPorM2SinInstalacion ?? 175000).toLocaleString('es-CO');
                        return (
                          <div className="space-y-2"><label className="block text-xs font-semibold tracking-wide uppercase">Instalación</label>
                            <select value={producto.conInstalacion? 'si':'no'} onChange={e=> handleChangeProducto(i,'conInstalacion', e.target.value==='si')} className="w-full border p-2 rounded bg-white dark:bg-gris-800 dark:border-gris-600">
                              <option value="si">Con instalación ({precioConIns} / m²)</option>
                              <option value="no">Sin instalación ({precioSinIns} / m²)</option>
                            </select>
                          </div>
                        );
                      })()}
                      <div className="space-y-2 md:col-span-2"><label className="block text-xs font-semibold tracking-wide uppercase">Información Adicional</label><input type="text" value={producto.infoAdicional||''} onChange={e=> handleChangeProducto(i,'infoAdicional', e.target.value)} className="w-full border p-2 rounded bg-white dark:bg-gris-800 dark:border-gris-600" placeholder="(Ej: Muelle 3, Placa 5, Zona Fría)" /></div>
                      <div className="space-y-2"><label className="block text-xs font-semibold tracking-wide uppercase">Cantidad</label><input type="number" value={producto.cantidad} onChange={e=> handleChangeProducto(i,'cantidad', e.target.value)} className="w-full border p-2 rounded bg-white dark:bg-gris-800 dark:border-gris-600" /></div>
                      <div className="space-y-2">
                        <label className="block text-xs font-semibold tracking-wide uppercase">Precio Manual</label>
                        <input type="number" value={producto.precioManual} onChange={e=> handleChangeProducto(i,'precioManual', e.target.value)} className="w-full border p-2 rounded bg-white dark:bg-gris-800 dark:border-gris-600" placeholder="Opcional" />
                        <p className="text-[10px] text-gray-400 dark:text-gray-500">Si lo llenas, reemplaza cualquier otro precio (calculado o el del aviso de rango) para este producto.</p>
                      </div>
                      <div className="space-y-2">
                        <label className="block text-xs font-semibold tracking-wide uppercase">Ajuste (%) de este producto</label>
                        <div className="flex gap-2"><select value={producto.ajusteTipo} onChange={e=> handleChangeProducto(i,'ajusteTipo', e.target.value)} className="border p-2 rounded bg-white dark:bg-gris-800 dark:border-gris-600 text-xs"><option value='Incremento'>Incremento</option><option value='Descuento'>Descuento</option></select><input type="number" value={producto.ajusteValor} onChange={e=> handleChangeProducto(i,'ajusteValor', e.target.value)} className="border p-2 rounded w-24 bg-white dark:bg-gris-800 dark:border-gris-600" placeholder="0" /></div>
                        <p className="text-[10px] text-gray-400 dark:text-gray-500">Solo afecta este producto. El "Ajuste general" del panel derecho se suma aparte, sobre el total de la cotización.</p>
                      </div>
                      {producto.tipo==='Sello de Andén' && (
                        <div className="space-y-2 md:col-span-2">
                          <label className="block text-xs font-semibold tracking-wide uppercase">Componentes Sello</label>
                          <div className="flex flex-wrap gap-4 text-xs">
                            {['cortina','postes laterales','travesaño','sello completo'].map(comp=> {
                              const componentesActuales = producto.componentes || [];
                              const tieneSelloCompleto = componentesActuales.includes('sello completo');
                              const checked = componentesActuales.includes(comp);

                              return (
                                <label
                                  key={comp}
                                  className="inline-flex items-center gap-1"
                                >
                                  <input
                                    type="checkbox"
                                    checked={checked}
                                    onChange={()=>{
                                      const actuales = [...(producto.componentes || [])];

                                      if (comp === 'sello completo') {
                                        if (actuales.includes('sello completo')) {
                                          // Desmarcar sello completo, conservar travesaño si estaba
                                          handleChangeProducto(i, 'componentes', actuales.filter(c => c !== 'sello completo'));
                                        } else {
                                          // Marcar sello completo: quitar cortina y postes por separado, conservar travesaño
                                          const base = actuales.filter(c => c !== 'cortina' && c !== 'postes laterales');
                                          handleChangeProducto(i, 'componentes', [...base, 'sello completo']);
                                        }
                                        return;
                                      }

                                      // cortina/postes por separado: quitar 'sello completo'
                                      const sinCompleto = (comp === 'cortina' || comp === 'postes laterales')
                                        ? actuales.filter(c => c !== 'sello completo')
                                        : actuales; // travesaño no quita 'sello completo'
                                      const nuevos = sinCompleto.includes(comp)
                                        ? sinCompleto.filter(c => c !== comp)
                                        : [...sinCompleto, comp];
                                      handleChangeProducto(i, 'componentes', nuevos);
                                    }}
                                  />
                                  <span className="capitalize">{comp}</span>
                                </label>
                              );
                            })}
                          </div>
                          {/* Desglose de precio por componente.
                              Las líneas llevan el factor del tipo de cliente y el total es el
                              precio que realmente se cobra: mostrar los valores crudos de la
                              matriz hacía que el chip y la tabla impresa dijeran cifras
                              distintas para todo cliente que no fuera Distribuidor. */}
                          {producto.ancho && producto.alto && (producto.componentes||[]).length > 0 && (()=>{
                            const dbMat = productosOverride?.['Sello de Andén']?.matrizComponentes;
                            const mat = dbMat || priceMatrices['Sello de Andén'];
                            const ranges = mat.medidaRanges;
                            const iAncho = getRangoIndex(ranges, parseInt(producto.ancho));
                            const iAlto  = getRangoIndex(ranges, parseInt(producto.alto));
                            const comps  = producto.componentes || [];
                            const factor = getFactorCliente(producto.tipo, producto.cliente);
                            const linea  = (nombre, val) => ({ nombre, val: Math.round((val||0) * factor) });
                            const lineas = [];
                            if(comps.includes('sello completo')){
                              lineas.push(linea('Cortina', mat.base.cortina?.[iAncho]));
                              lineas.push(linea('Postes',  mat.base.postes?.[iAlto]));
                            } else {
                              if(comps.includes('cortina'))          lineas.push(linea('Cortina', mat.base.cortina?.[iAncho]));
                              if(comps.includes('postes laterales')) lineas.push(linea('Postes',  mat.base.postes?.[iAlto]));
                            }
                            if(comps.includes('travesaño')) lineas.push(linea('Travesaño', mat.base.travesano?.[iAncho]));
                            if(!lineas.length) return null;
                            const suma  = lineas.reduce((s,l)=>s+l.val, 0);
                            const total = calcularPrecio(producto, i);
                            // El total puede no ser la suma exacta: se redondea a 5.000, y el
                            // precio manual o el ajuste % del producto tienen prioridad.
                            const nota = (producto.precioManual || producto.precioEditado)
                              ? 'precio manual'
                              : (parseFloat(producto.ajusteValor) ? `${producto.ajusteTipo?.toLowerCase()} ${producto.ajusteValor}%` : (total !== suma ? `redondeado a ${getPasoRedondeo(producto.tipo).toLocaleString('es-CO')}` : ''));
                            const fmt = v => `${(v/1000).toLocaleString('es-CO')}k`;
                            return (
                              <div className="mt-2 rounded bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800 px-3 py-2 text-[11px] font-mono flex flex-wrap items-center gap-x-1.5 gap-y-1 text-gray-600 dark:text-gray-300">
                                {lineas.map((l,idx)=>(
                                  <React.Fragment key={idx}>
                                    {idx>0 && <span className="text-gray-400 dark:text-gray-500">+</span>}
                                    <span><span className="text-indigo-500 dark:text-indigo-400">{l.nombre}</span> {fmt(l.val)}</span>
                                  </React.Fragment>
                                ))}
                                <span className="text-gray-400 dark:text-gray-500">=</span>
                                <span className="font-semibold text-gray-800 dark:text-gray-100">{total.toLocaleString('es-CO',{style:'currency',currency:'COP',minimumFractionDigits:0})}</span>
                                <span className="text-gray-400 dark:text-gray-500">· {producto.cliente}{nota ? ` · ${nota}` : ''}</span>
                              </div>
                            );
                          })()}
                        </div>
                      )}
                    </div>
                    {alertas[i] && (
                      <div className="p-3 bg-yellow-100 border border-yellow-300 text-yellow-800 rounded text-xs">
                        Medidas fuera de rango: el sistema no puede calcular un precio automático para este producto. Ingresa un precio aquí, o usa el campo "Precio Manual" de arriba (ese siempre tiene prioridad).
                        <input type="number" className="w-full border p-2 rounded mt-2 bg-white dark:bg-gris-800 dark:border-gris-600" value={producto.precioEditado} placeholder="Precio para medidas fuera de rango" onChange={e=> handleChangeProducto(i,'precioEditado', e.target.value)} disabled={!!producto.precioManual} />
                        {producto.precioManual && <p className="mt-1 text-[10px] text-yellow-700">Deshabilitado: ya hay un "Precio Manual" definido arriba y ese es el que se usará.</p>}
                      </div>
                    )}
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
                          <input type="text" placeholder="Nombre" className="flex-1 min-w-[160px] border p-2 rounded bg-white dark:bg-gris-800 dark:border-gris-600" value={extrasInputs[i]?.nombre||''} onChange={e=> setExtrasInputs(prev=>({...prev,[i]:{...(prev[i]||{}),nombre:e.target.value}}))} />
                          <input type="number" placeholder="Precio" className="w-32 border p-2 rounded bg-white dark:bg-gris-800 dark:border-gris-600" value={extrasInputs[i]?.precio||''} onChange={e=> setExtrasInputs(prev=>({...prev,[i]:{...(prev[i]||{}),precio:e.target.value}}))} />
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
            <button type="button" onClick={handleAgregarProducto} className="w-full mt-1 py-3 border-2 border-dashed border-gray-300 dark:border-gris-600 rounded-xl text-gray-500 dark:text-gray-400 hover:border-indigo-400 hover:text-indigo-600 dark:hover:border-indigo-500 dark:hover:text-indigo-400 transition-colors flex items-center justify-center gap-2 font-medium text-sm">
              <span className="text-base leading-none">+</span> Agregar otro producto
            </button>
          </div>
        </div>
        <div className="w-full lg:w-80 xl:w-96 flex-shrink-0">
          <div className="lg:sticky lg:top-4 space-y-6">
            <div id="seccion-total" className="p-5 rounded-lg border border-gray-200 dark:border-gris-700 bg-white dark:bg-gris-900 shadow-sm scroll-mt-32">
              {productos.length > 0 && (
                <div className="mb-4">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500 mb-2">Detalle</p>
                  <div className="space-y-1">
                    {productos.map((p,i)=>{
                      const precio = calcularPrecio(p,i);
                      const extras = calcularSubtotalExtras(p);
                      const lineTotal = precio * (parseInt(p.cantidad)||1) + extras;
                      return (
                        <div key={i} className="flex justify-between text-xs text-gray-600 dark:text-gray-400">
                          <span className="truncate max-w-[60%]">{p.nombrePersonalizado || p.tipo || `Producto ${i+1}`}{parseInt(p.cantidad)>1 && <span className="text-gray-400 dark:text-gray-500"> ×{p.cantidad}</span>}</span>
                          <span className="font-mono tabular-nums">{lineTotal.toLocaleString('es-CO',{style:'currency',currency:'COP',minimumFractionDigits:0})}</span>
                        </div>
                      );
                    })}
                  </div>
                  <div className="border-t border-gray-200 dark:border-gris-700 mt-2 pt-1" />
                </div>
              )}
              <div className="rounded-lg bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800 p-3 mb-4">
                <h2 className="text-sm font-semibold tracking-wide uppercase mb-1 text-indigo-700 dark:text-indigo-300">Ajuste general</h2>
                <p className="text-[10px] text-indigo-500 dark:text-indigo-400 mb-3">Se suma sobre el subtotal de toda la cotización, después de los ajustes por producto (no los reemplaza).</p>
                <div className="flex items-center gap-3">
                  <select value={ajusteTotalTipo} onChange={e=> setAjusteTotalTipo(e.target.value)} className="border p-2 rounded bg-white dark:bg-gris-800 dark:border-gris-600 text-sm"><option value='Descuento'>Descuento</option><option value='Incremento'>Incremento</option></select>
                  <input type="number" value={ajusteTotalValor} onChange={e=> setAjusteTotalValor(e.target.value)} placeholder="0" className="border p-2 rounded w-24 bg-white dark:bg-gris-800 dark:border-gris-600 text-sm" /><span className="text-xs">%</span>
                </div>
              </div>
              <div className="text-xs space-y-1 font-mono">
                <div className="flex justify-between"><span>Bruto</span><span>{previewBruto.toLocaleString('es-CO',{style:'currency',currency:'COP',minimumFractionDigits:0})}</span></div>
                <div className="flex justify-between"><span>Ajustado</span><span>{previewAjustado.toLocaleString('es-CO',{style:'currency',currency:'COP',minimumFractionDigits:0})}</span></div>
                <div className="flex justify-between"><span>IVA (19%)</span><span>{previewIVA.toLocaleString('es-CO',{style:'currency',currency:'COP',minimumFractionDigits:0})}</span></div>
                <div className="flex justify-between text-sm pt-1 border-t border-gray-200 dark:border-gris-700 font-semibold"><span>Total</span><span>{previewTotal.toLocaleString('es-CO',{style:'currency',currency:'COP',minimumFractionDigits:0})}</span></div>
                <div className="mt-2 pt-2 border-t border-dashed border-gray-200 dark:border-gris-700">
                  <p className="text-[10px] uppercase tracking-wide text-gray-400 dark:text-gray-500 mb-0.5">Son:</p>
                  <p className="text-[11px] font-semibold text-gray-700 dark:text-gray-300 leading-tight">{numeroALetras(previewTotal)}</p>
                </div>
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
      {/* Barra fija de resumen en móvil */}
      <div className="block md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-gris-900 border-t border-gray-200 dark:border-gris-700 px-4 py-3 flex items-center justify-between shadow-lg">
        <div>
          <p className="text-[10px] text-gray-500 dark:text-gray-400">Total estimado</p>
          <p className="text-base font-bold text-green-600 dark:text-green-400">{previewTotal.toLocaleString('es-CO',{style:'currency',currency:'COP',minimumFractionDigits:0})}</p>
        </div>
        <button type="button" onClick={handleSubmit} disabled={creandoEntidad} className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-semibold disabled:opacity-60">
          {creandoEntidad ? 'Procesando...' : 'Generar →'}
        </button>
      </div>
    </div>
  );
}


