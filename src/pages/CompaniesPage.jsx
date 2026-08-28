import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuote } from '../context/QuoteContext';
import { listarEmpresas, listarContactos, crearEmpresa, actualizarEmpresa, eliminarEmpresa, crearContacto, actualizarContacto, eliminarContacto } from '../utils/firebaseCompanies';
import { validateNIT, validateEmail, validateText } from '../utils/validateInput';
import { FaPlus, FaTrash, FaEdit, FaSave, FaTimes, FaSearch, FaBuilding, FaUser, FaSync, FaLink, FaClone, FaExclamationTriangle } from 'react-icons/fa';
import toast from 'react-hot-toast';
import { waitForAuth, getAuthError } from '../firebase';
import EmptyState from '../components/ui/EmptyState';
import Button from '../components/ui/Button';
import HistorialCliente from '../components/clientes/HistorialCliente';
import { useAuth } from '../context/AuthContext';
import { calcularVinculacionPendiente, aplicarVinculacion, fusionarEmpresas, contarRelacionesEmpresa } from '../utils/firebaseClienteVinculo';
import { resolverEmpresa, buscarPosiblesDuplicados, resolverContacto, agruparDuplicados, planFusion } from '../utils/empresaIdentidad';

import PageHeader from "../components/ui/PageHeader";
// Ficha de una empresa en el formulario. `alias` es la abreviación con la que
// se conoce al cliente en planta: los nombres legales largos no caben en la
// orden de producción, y es lo que la gente reconoce (ver clienteVinculo.js).
const EMPRESA_VACIA = { nombre:'', alias:'', nit:'', ciudad:'', direccion:'', telefonoGeneral:'', emailGeneral:'' };
const CONTACTO_VACIO = { nombre:'', cargo:'', email:'', telefono:'' };

const etiquetaEmpresa = (e) => [e?.nombre, e?.nit && `NIT ${e.nit}`, e?.ciudad].filter(Boolean).join(' · ');

export default function CompaniesPage(){
  const { empresas, setEmpresas, setEmpresaSeleccionada, setContactoSeleccionado, confirm } = useQuote();
  const { hasRole } = useAuth();
  const puedeVincular = hasRole('admin') || hasRole('produccion');
  const puedeFusionar = hasRole('admin'); // fusionar borra la duplicada (ver firestore.rules)
  const navigate = useNavigate();
  const [cargando, setCargando] = useState(false);
  const [busqueda, setBusqueda] = useState('');
  const [modoNuevaEmpresa, setModoNuevaEmpresa] = useState(false);
  const [modoNuevoContactoEmpresa, setModoNuevoContactoEmpresa] = useState(null); // empresaId
  const [editEmpresaId, setEditEmpresaId] = useState(null);
  const [editContactoId, setEditContactoId] = useState(null);
  const [contactosCache, setContactosCache] = useState({}); // empresaId -> contactos
  const [historialAbierto, setHistorialAbierto] = useState(null); // empresaId
  const [vinculando, setVinculando] = useState(false);
  const [panelDuplicados, setPanelDuplicados] = useState(false);
  const [principalPorGrupo, setPrincipalPorGrupo] = useState({}); // clave grupo -> empresaId
  const [seleccion, setSeleccion] = useState({});   // clave grupo -> marcado para fusionar
  const [excluidas, setExcluidas] = useState({});   // clave grupo -> { empresaId: fuera de la fusión }
  const [fusionando, setFusionando] = useState(false);
  const [progreso, setProgreso] = useState(null);   // { hechos, total, fase }

  // Formularios
  const [formEmpresa, setFormEmpresa] = useState(EMPRESA_VACIA);
  const [formEmpresaEdit, setFormEmpresaEdit] = useState(EMPRESA_VACIA);
  const sanitizeNIT = (nit)=> (nit||'').toString().replace(/["“”]/g,'');
  const [formContacto, setFormContacto] = useState(CONTACTO_VACIO);
  const [formContactoEdit, setFormContactoEdit] = useState(CONTACTO_VACIO);

  useEffect(()=>{ if(empresas.length===0) cargarEmpresas(); }, []);

  async function cargarEmpresas(){
    setCargando(true);
    try {
      await waitForAuth();
      const err = getAuthError();
      if (err === 'auth/configuration-not-found' || err === 'auth/operation-not-allowed') {
        console.error('Anonymous Auth no está habilitada en Firebase.');
        setCargando(false);
        return;
      }
  const lista = await listarEmpresas();
  // normaliza NIT en estado UI
  setEmpresas(lista.map(e=> ({ ...e, nit: sanitizeNIT(e.nit) })));
    } catch(e){ console.error(e); toast.error('Error cargando empresas'); } finally { setCargando(false); }
  }

  // Engancha a su empresa las fichas viejas, las que guardaron el cliente como
  // texto suelto antes de que existiera el vínculo. Primero se calcula el plan
  // y se muestra el conteo: vincular a la empresa equivocada es peor que dejar
  // la ficha suelta, así que solo entran los nombres con una única coincidencia.
  async function vincularFichasAntiguas(){
    setVinculando(true);
    try {
      // Sin la lista de empresas cargada no habría con qué emparejar y el
      // resultado sería un falso "ya está todo vinculado".
      const lista = empresas.length > 0 ? empresas : await listarEmpresas();
      if (lista.length === 0){ toast.error('No hay empresas para vincular'); return; }
      if (empresas.length === 0) setEmpresas(lista);
      const plan = await calcularVinculacionPendiente(lista);
      if (plan.totalVincular === 0){
        toast(plan.totalSinCoincidencia > 0
          ? `Nada que vincular. ${plan.totalSinCoincidencia} ficha(s) tienen un cliente que no está en esta lista.`
          : 'Todas las fichas ya están vinculadas');
        return;
      }
      const ok = await confirm(
        `Se vincularán ${plan.totalVincular} ficha(s) a su cliente.` +
        (plan.totalSinCoincidencia > 0
          ? ` Quedarán ${plan.totalSinCoincidencia} sin vincular porque su cliente no aparece en la lista o hay dos empresas con el mismo nombre.`
          : '')
      );
      if(!ok) return;
      const n = await aplicarVinculacion(plan);
      toast.success(`${n} ficha(s) vinculadas`);
    } catch(e){ console.error(e); toast.error('Error vinculando fichas'); }
    finally { setVinculando(false); }
  }

  async function toggleContactos(empresa){
    if(contactosCache[empresa.id]){ // ya cargado -> colapsar
      setContactosCache(c=>{ const n={...c}; delete n[empresa.id]; return n; });
      return;
    }
    try {
      const lista = await listarContactos(empresa.id);
      setContactosCache(c=> ({ ...c, [empresa.id]: lista }));
    } catch(e){ console.error(e); toast.error('Error cargando contactos'); }
  }

  // Validación común a crear y editar. Devuelve el registro limpio o null.
  function limpiarEmpresa(form){
    const datos = {
      nombre: form.nombre.trim(),
      alias: form.alias.trim(),
      nit: form.nit.trim(),
      ciudad: form.ciudad.trim(),
      direccion: form.direccion.trim(),
      telefonoGeneral: form.telefonoGeneral.trim(),
      emailGeneral: form.emailGeneral.trim(),
    };
    if(!validateText(datos.nombre, 1, 200)){ toast.error('Nombre inválido (1-200 caracteres)'); return null; }
    if(datos.alias && !validateText(datos.alias, 1, 40)){ toast.error('Alias inválido (máx 40 caracteres)'); return null; }
    if(datos.nit && !validateNIT(datos.nit)){ toast.error('NIT inválido (9-11 dígitos)'); return null; }
    if(datos.ciudad && !validateText(datos.ciudad, 1, 100)){ toast.error('Ciudad inválida (máx 100 caracteres)'); return null; }
    if(datos.direccion && !validateText(datos.direccion, 1, 200)){ toast.error('Dirección inválida (máx 200 caracteres)'); return null; }
    if(datos.emailGeneral && !validateEmail(datos.emailGeneral)){ toast.error('Email inválido'); return null; }
    return datos;
  }

  // Antes de guardar se compara contra toda la base: coincidencia exacta de
  // NIT, nombre o alias se rechaza —es el duplicado que se quiere evitar— y un
  // parecido se avisa, pero se deja pasar si el usuario confirma (dos empresas
  // del mismo grupo pueden llamarse casi igual y ser distintas de verdad).
  async function pasaControlDuplicados(datos, empresaId = null){
    const { empresa, motivo } = resolverEmpresa({ ...datos, id: empresaId }, empresas);
    if(empresa){
      const porQue = { nit:'el mismo NIT', nombre:'el mismo nombre', alias:'el mismo alias' }[motivo] || 'los mismos datos';
      toast.error(`Ya existe una empresa con ${porQue}: ${etiquetaEmpresa(empresa)}`);
      return false;
    }
    const parecidas = buscarPosiblesDuplicados({ ...datos, id: empresaId }, empresas);
    if(parecidas.length > 0){
      return confirm(
        `Se parece a ${parecidas.length === 1 ? 'una empresa que ya existe' : `${parecidas.length} empresas que ya existen`}:\n` +
        parecidas.slice(0,3).map(({empresa:e})=> `· ${etiquetaEmpresa(e)}`).join('\n') +
        '\n\n¿Guardar de todas formas como empresa aparte?'
      );
    }
    return true;
  }

  async function handleCrearEmpresa(e){
    e.preventDefault();
    const datos = limpiarEmpresa(formEmpresa);
    if(!datos) return;
    if(!(await pasaControlDuplicados(datos))) return;
    try {
      const id = await crearEmpresa(datos);
      setEmpresas(prev=> [...prev, { id, ...datos }].sort((a,b)=> a.nombre.localeCompare(b.nombre)) );
      toast.success('Empresa creada');
      setFormEmpresa(EMPRESA_VACIA);
      setModoNuevaEmpresa(false);
    } catch(e){ console.error(e); toast.error('Error creando'); }
  }

  function startEditarEmpresa(emp){
    setEditEmpresaId(emp.id);
    setFormEmpresaEdit({
      nombre: emp.nombre||'', alias: emp.alias||'', nit: sanitizeNIT(emp.nit)||'', ciudad: emp.ciudad||'',
      direccion: emp.direccion||'', telefonoGeneral: emp.telefonoGeneral||'', emailGeneral: emp.emailGeneral||'',
    });
  }
  async function guardarEdicionEmpresa(empId){
    const datos = limpiarEmpresa(formEmpresaEdit);
    if(!datos) return;
    // Al editar también hay que mirar el resto de la base: cambiar un NIT o un
    // nombre puede convertir este registro en el duplicado de otro.
    if(!(await pasaControlDuplicados(datos, empId))) return;
    try {
      await actualizarEmpresa(empId, datos);
      setEmpresas(prev => prev.map(e=> e.id===empId? { ...e, ...datos }: e).sort((a,b)=> a.nombre.localeCompare(b.nombre)) );
      toast.success('Empresa actualizada');
      setEditEmpresaId(null);
    } catch(e){ console.error(e); toast.error('Error actualizando'); }
  }
  // Borrar un cliente deja huérfanas sus fichas y cotizaciones: siguen
  // apuntando a un id que ya no existe y desaparecen de su historial. Por eso
  // se cuenta antes y se dice en el aviso; para el caso de dos registros del
  // mismo cliente lo correcto es fusionar, no borrar.
  async function eliminarEmpresaAccion(emp){
    let aviso = `¿Eliminar "${emp.nombre}" y sus contactos?`;
    try {
      const { fichas, cotizaciones } = await contarRelacionesEmpresa(emp.id);
      if(fichas || cotizaciones){
        aviso += `\n\nQuedarían sin cliente ${fichas} ficha(s) y ${cotizaciones} cotización(es).` +
                 '\nSi es un duplicado, usa "Revisar duplicados" para fusionarlo en lugar de borrarlo.';
      }
    } catch(e){ console.error(e); }
    const ok = await confirm(aviso);
    if(!ok) return;
    try { await eliminarEmpresa(emp.id); setEmpresas(prev=> prev.filter(e=> e.id!==emp.id)); toast.success('Eliminada'); }
    catch(e){ console.error(e); toast.error('Error eliminando'); }
  }

  function startNuevoContacto(empresaId){
    setModoNuevoContactoEmpresa(empresaId);
    setFormContacto(CONTACTO_VACIO);
  }
  function limpiarContacto(form){
    const datos = {
      nombre: form.nombre.trim(), cargo: form.cargo.trim(),
      email: form.email.trim(), telefono: form.telefono.trim(),
    };
    if(!validateText(datos.nombre, 1, 200)){ toast.error('Nombre inválido (1-200 caracteres)'); return null; }
    if(datos.cargo && !validateText(datos.cargo, 1, 100)){ toast.error('Cargo inválido (máx 100 caracteres)'); return null; }
    if(datos.email && !validateEmail(datos.email)){ toast.error('Email inválido'); return null; }
    if(datos.telefono && !validateText(datos.telefono, 10, 20)){ toast.error('Teléfono inválido (10-20 caracteres)'); return null; }
    return datos;
  }
  // El contacto se compara por email y también por nombre: sin esto último, el
  // mismo agente de compras entraba otra vez cada vez que se escribía sin correo.
  function contactoRepetido(lista, datos, contactoId = null){
    const { contacto, motivo } = resolverContacto({ ...datos, id: contactoId }, lista);
    if(!contacto) return false;
    toast.error(`Ese contacto ya existe con ${motivo === 'email' ? 'el mismo email' : 'el mismo nombre'}: ${contacto.nombre}`);
    return true;
  }
  async function handleCrearContacto(e, empresaId){
    e.preventDefault();
    const datos = limpiarContacto(formContacto);
    if(!datos) return;
    try {
      // La caché puede estar sin cargar (el contacto se crea desde la tarjeta
      // colapsada), así que se trae la lista antes de comparar.
      const lista = await listarContactos(empresaId);
      setContactosCache(c=> ({ ...c, [empresaId]: lista }));
      if(contactoRepetido(lista, datos)) return;
      await crearContacto(empresaId, datos);
      toast.success('Contacto creado');
      const actualizada = await listarContactos(empresaId);
      setContactosCache(c=> ({ ...c, [empresaId]: actualizada }));
      setModoNuevoContactoEmpresa(null);
    } catch(e){ console.error(e); toast.error('Error creando contacto'); }
  }
  function startEditarContacto(empresaId, contacto){
    setEditContactoId(contacto.id);
    setFormContactoEdit({
      nombre: contacto.nombre||'', cargo: contacto.cargo||'',
      email: contacto.email||'', telefono: contacto.telefono||'',
    });
  }
  async function guardarEdicionContacto(empresaId, contactoId){
    const datos = limpiarContacto(formContactoEdit);
    if(!datos) return;
    if(contactoRepetido(contactosCache[empresaId] || [], datos, contactoId)) return;
    try {
      await actualizarContacto(empresaId, contactoId, datos);
      const lista = await listarContactos(empresaId);
      setContactosCache(c=> ({ ...c, [empresaId]: lista }));
      toast.success('Contacto actualizado');
      setEditContactoId(null);
    } catch(e){ console.error(e); toast.error('Error actualizando contacto'); }
  }
  async function eliminarContactoAccion(empresaId, contactoId){
    const ok = await confirm('¿Eliminar contacto?');
    if(!ok) return;
    try { await eliminarContacto(empresaId, contactoId); const lista = await listarContactos(empresaId); setContactosCache(c=> ({ ...c, [empresaId]: lista })); toast.success('Eliminado'); } catch(e){ console.error(e); toast.error('Error eliminando'); }
  }

  // ─── Duplicados ya guardados ──────────────────────────────────────────────
  const grupos = useMemo(()=> (panelDuplicados ? agruparDuplicados(empresas) : []), [panelDuplicados, empresas]);

  // Al abrir el panel quedan marcados los grupos seguros —los que coinciden en
  // NIT, nombre o alias exactos— y sin marcar las simples sospechas: son las
  // que hay que mirar una por una antes de fusionar nada.
  useEffect(()=>{
    if(!panelDuplicados){ setSeleccion({}); setExcluidas({}); return; }
    setSeleccion(Object.fromEntries(grupos.filter(g=> g.certeza==='alta').map(g=> [g.clave, true])));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [panelDuplicados]);

  // Qué se conserva y qué se elimina en un grupo, según lo marcado (ver
  // planFusion en empresaIdentidad.js).
  const planDeGrupo = (grupo)=> planFusion(grupo.empresas, {
    principalId: principalPorGrupo[grupo.clave],
    excluidas: excluidas[grupo.clave] || {},
  });

  const planes = useMemo(
    ()=> grupos.filter(g=> seleccion[g.clave]).map(g=> ({ grupo: g, ...(planDeGrupo(g) || {}) })).filter(p=> p.principal),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [grupos, seleccion, excluidas, principalPorGrupo]
  );
  const aEliminar = planes.reduce((n,p)=> n + p.otras.length, 0);

  const marcarTodos = (filtro)=> setSeleccion(Object.fromEntries(grupos.filter(filtro).map(g=> [g.clave, true])));
  const alternarGrupo = (clave)=> setSeleccion(s=> ({ ...s, [clave]: !s[clave] }));
  const alternarEmpresa = (clave, empresaId)=> setExcluidas(x=>{
    const grupo = { ...(x[clave] || {}) };
    if(grupo[empresaId]) delete grupo[empresaId]; else grupo[empresaId] = true;
    return { ...x, [clave]: grupo };
  });

  // Fusiona de una sola vez todos los grupos marcados. Se ejecutan en serie:
  // cada fusión hace sus propias lecturas y escrituras, y en serie el progreso
  // es real y un error deja claro dónde se quedó.
  async function fusionarSeleccionados(){
    if(planes.length === 0){ toast.error('No hay grupos marcados'); return; }
    setFusionando(true);
    try {
      setProgreso({ hechos: 0, total: planes.length, fase: 'contando' });
      const conteos = await Promise.all(planes.flatMap(p=> p.otras.map(e=> contarRelacionesEmpresa(e.id))));
      const fichas = conteos.reduce((n,c)=> n+c.fichas, 0);
      const cotizaciones = conteos.reduce((n,c)=> n+c.cotizaciones, 0);
      const detalle = planes.slice(0, 8)
        .map(p=> `· Se conserva "${p.principal.nombre}" (se eliminan ${p.otras.length})`).join('\n');
      const ok = await confirm(
        `Se fusionan ${planes.length} grupo(s): quedan ${planes.length} empresa(s) y se eliminan ${aEliminar}.\n\n` +
        detalle + (planes.length > 8 ? `\n· … y ${planes.length - 8} grupo(s) más` : '') +
        `\n\nSe reasignan ${fichas} ficha(s) y ${cotizaciones} cotización(es), y los contactos pasan a la empresa que se conserva.` +
        '\nEl nombre que ya salió impreso en cada ficha no cambia. Esto no se puede deshacer.'
      );
      if(!ok) return;

      const total = { empresas: 0, fichas: 0, cotizaciones: 0, contactos: 0 };
      let fallidos = 0;
      for (const [i, plan] of planes.entries()) {
        setProgreso({ hechos: i, total: planes.length, fase: 'fusionando' });
        try {
          const r = await fusionarEmpresas(plan.principal, plan.otras);
          total.empresas += r.empresasBorradas;
          total.fichas += r.fichasMovidas;
          total.cotizaciones += r.cotizacionesMovidas;
          total.contactos += r.contactosMovidos;
        } catch(e){ console.error('Error fusionando', plan.principal?.nombre, e); fallidos++; }
      }
      toast.success(
        `${total.empresas} empresa(s) eliminada(s) · ${total.contactos} contacto(s), ` +
        `${total.fichas} ficha(s) y ${total.cotizaciones} cotización(es) reasignadas`
      );
      if(fallidos) toast.error(`${fallidos} grupo(s) no se pudieron fusionar. Revisa la lista.`);
      setSeleccion({});
      setExcluidas({});
      await cargarEmpresas();
    } catch(e){ console.error(e); toast.error('Error fusionando'); }
    finally { setFusionando(false); setProgreso(null); }
  }

  const filtradas = useMemo(()=> empresas.filter(e=>{
    const q = busqueda.toLowerCase();
    return [e.nombre, e.alias, e.nit, e.ciudad].some(v=> (v||'').toLowerCase().includes(q));
  }).sort((a,b)=> (a.nombre||'').localeCompare(b.nombre||'')), [empresas, busqueda]);

  const campoCls = 'border rounded px-2 py-1 bg-white dark:bg-gris-700 dark:text-white';
  const etiquetaCls = 'text-[10px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400';

  const camposEmpresa = (form, setter) => (
    <>
      <div className="flex flex-col sm:col-span-2"><label className={etiquetaCls}>Nombre</label>
        <input value={form.nombre} onChange={e=>setter(f=>({...f,nombre:e.target.value}))} className={campoCls} /></div>
      <div className="flex flex-col"><label className={etiquetaCls}>Alias (sale en la orden)</label>
        <input value={form.alias} onChange={e=>setter(f=>({...f,alias:e.target.value}))} placeholder="Ej. CI ANDINA"
          title="Abreviación con la que el cliente sale en las órdenes de producción" className={`${campoCls} uppercase`} /></div>
      <div className="flex flex-col"><label className={etiquetaCls}>NIT</label>
        <input value={form.nit} onChange={e=>setter(f=>({...f,nit:e.target.value}))} className={campoCls} /></div>
      <div className="flex flex-col"><label className={etiquetaCls}>Ciudad</label>
        <input value={form.ciudad} onChange={e=>setter(f=>({...f,ciudad:e.target.value}))} className={campoCls} /></div>
      <div className="flex flex-col sm:col-span-2"><label className={etiquetaCls}>Dirección</label>
        <input value={form.direccion} onChange={e=>setter(f=>({...f,direccion:e.target.value}))} className={campoCls} /></div>
      <div className="flex flex-col"><label className={etiquetaCls}>Teléfono</label>
        <input value={form.telefonoGeneral} onChange={e=>setter(f=>({...f,telefonoGeneral:e.target.value}))} className={campoCls} /></div>
      <div className="flex flex-col"><label className={etiquetaCls}>Email</label>
        <input value={form.emailGeneral} onChange={e=>setter(f=>({...f,emailGeneral:e.target.value}))} className={campoCls} /></div>
    </>
  );

  return (
    <div className="max-w-6xl mx-auto p-6 bg-white dark:bg-gris-900 rounded-lg shadow text-gray-900 dark:text-gray-100">
      <PageHeader section="/empresas" title="Empresas & Contactos" />
      <div className="flex flex-col sm:flex-row flex-wrap gap-3 mb-4">
        <div className="flex items-center gap-2 flex-1 min-w-[200px] border rounded px-2 bg-white dark:bg-gris-800">
          <FaSearch className="text-gray-500" />
          <input value={busqueda} onChange={e=>setBusqueda(e.target.value)} placeholder="Buscar por nombre, alias, NIT o ciudad..." className="bg-transparent flex-1 py-2 outline-none text-sm" />
        </div>
        <Button variant="accent" className="flex items-center gap-2" onClick={()=> setModoNuevaEmpresa(m=>!m)}>{modoNuevaEmpresa? <FaTimes/>:<FaPlus/>}{modoNuevaEmpresa? 'Cancelar':'Nueva Empresa'}</Button>
        <Button variant="secondary" className="flex items-center gap-2" onClick={cargarEmpresas}><FaSync className={cargando? 'animate-spin':''}/> Refrescar</Button>
        {puedeFusionar && (
          <Button variant="secondary" className="flex items-center gap-2" onClick={()=> setPanelDuplicados(v=>!v)}>
            <FaClone/> {panelDuplicados? 'Ocultar duplicados':'Revisar duplicados'}
          </Button>
        )}
        {puedeVincular && (
          <Button variant="secondary" className="flex items-center gap-2" onClick={vincularFichasAntiguas} disabled={vinculando}>
            <FaLink/> {vinculando? 'Vinculando…':'Vincular fichas antiguas'}
          </Button>
        )}
      </div>

      {panelDuplicados && (
        <div className="mb-6 border rounded-lg bg-amber-50 dark:bg-gris-800 dark:border-gris-700">
          {/* Barra de acción pegada arriba: con muchos grupos, el botón de
              fusionar tiene que seguir a la vista mientras se revisa la lista. */}
          <div className="sticky top-0 z-10 rounded-t-lg border-b border-amber-200 dark:border-gris-700 bg-amber-50 dark:bg-gris-800 p-4">
            <div className="font-semibold text-sm flex items-center gap-2 mb-2">
              <FaExclamationTriangle className="text-amber-600"/>
              {grupos.length === 0 ? 'Sin duplicados detectados' : `${grupos.length} posible(s) duplicado(s)`}
            </div>
            {grupos.length > 0 && (
              <>
                <p className="text-xs text-gray-600 dark:text-gray-400 mb-3">
                  Marca los grupos y fusiónalos de una sola vez. En cada uno se conserva el registro con el punto azul y los demás ceden sus contactos, fichas y cotizaciones. Lo que ya salió impreso en una ficha no cambia.
                </p>
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <button type="button" className="text-indigo-600 hover:underline" onClick={()=> marcarTodos(()=> true)}>Marcar todos</button>
                  <span className="text-gray-300">|</span>
                  <button type="button" className="text-indigo-600 hover:underline" onClick={()=> marcarTodos(g=> g.certeza==='alta')}>Solo los seguros</button>
                  <span className="text-gray-300">|</span>
                  <button type="button" className="text-indigo-600 hover:underline" onClick={()=> setSeleccion({})}>Ninguno</button>
                  <span className="ml-auto text-gray-600 dark:text-gray-400">
                    {planes.length === 0 ? 'Nada marcado' : `${planes.length} grupo(s) · se eliminan ${aEliminar} registro(s)`}
                  </span>
                  <Button variant="primary" size="sm" disabled={planes.length===0 || fusionando} onClick={fusionarSeleccionados}>
                    {progreso
                      ? (progreso.fase === 'contando' ? 'Revisando…' : `Fusionando ${progreso.hechos + 1} de ${progreso.total}…`)
                      : 'Fusionar marcados'}
                  </Button>
                </div>
              </>
            )}
          </div>

          <div className="space-y-3 p-4">
            {grupos.map(grupo => {
              const fuera = excluidas[grupo.clave] || {};
              const plan = planDeGrupo(grupo);
              const marcado = Boolean(seleccion[grupo.clave]);
              return (
                <div key={grupo.clave} className={`border rounded bg-white dark:bg-gris-700 dark:border-gris-600 p-3 text-xs ${marcado ? 'ring-2 ring-blue-500' : ''}`}>
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <input type="checkbox" checked={marcado} onChange={()=> alternarGrupo(grupo.clave)}
                      className="accent-blue-600" aria-label="Marcar este grupo para fusionar" />
                    <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${grupo.certeza==='alta' ? 'bg-red-100 text-red-800' : 'bg-amber-100 text-amber-800'}`}>
                      {grupo.certeza==='alta' ? 'Es el mismo cliente' : 'Puede ser el mismo'}
                    </span>
                    <span className="text-gray-600 dark:text-gray-400">{grupo.motivos.join(' · ')}</span>
                    {marcado && !plan && <span className="text-red-600">Deja al menos dos empresas dentro del grupo</span>}
                  </div>
                  <div className="space-y-1">
                    {grupo.empresas.map(emp => {
                      const dentro = !fuera[emp.id];
                      const esPrincipal = dentro && plan?.principal?.id === emp.id;
                      return (
                        <div key={emp.id} className={`flex items-start gap-2 ${dentro ? '' : 'opacity-40'}`}>
                          {/* Desmarcar una empresa la deja fuera de la fusión: el
                              agrupado por parecido puede meter un cliente ajeno. */}
                          <input type="checkbox" checked={dentro} onChange={()=> alternarEmpresa(grupo.clave, emp.id)}
                            className="mt-0.5 accent-gray-500" aria-label={`Incluir ${emp.nombre} en la fusión`} />
                          <input type="radio" name={`principal-${grupo.clave}`} checked={esPrincipal} disabled={!dentro}
                            onChange={()=> setPrincipalPorGrupo(p=> ({...p, [grupo.clave]: emp.id}))}
                            className="mt-0.5 accent-blue-600" aria-label={`Conservar ${emp.nombre}`} />
                          <span className="min-w-0">
                            <span className="font-medium">{emp.nombre}</span>
                            {emp.alias && <span className="ml-1 text-gray-500">({emp.alias})</span>}
                            {esPrincipal && <span className="ml-2 text-[10px] font-semibold text-blue-600">se conserva</span>}
                            <span className="block text-[10px] text-gray-500 dark:text-gray-400">
                              {[emp.nit && `NIT ${emp.nit}`, emp.ciudad, emp.direccion].filter(Boolean).join(' · ') || 'Sin más datos'}
                            </span>
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {modoNuevaEmpresa && (
        <form onSubmit={handleCrearEmpresa} className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-6 border p-4 rounded bg-gray-50 dark:bg-gris-800 dark:border-gris-700 text-sm">
          {camposEmpresa(formEmpresa, setFormEmpresa)}
          <div className="flex items-end sm:col-span-4"><Button type="submit" variant="primary" className="flex items-center gap-2"><FaSave/> Guardar</Button></div>
        </form>
      )}

      <div className="space-y-4">
        {filtradas.length===0 && (
          <EmptyState icon="🏢" title="Sin resultados" />
        )}
        {filtradas.map(emp => {
          const contactos = contactosCache[emp.id];
          return (
            <div key={emp.id} className="border rounded-lg bg-white dark:bg-gris-800 dark:border-gris-700 shadow-sm">
              <div className="p-4 flex flex-col sm:flex-row sm:items-start gap-4 justify-between">
                <div className="flex-1 min-w-0">
                  {editEmpresaId===emp.id ? (
                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-sm">
                      {camposEmpresa(formEmpresaEdit, setFormEmpresaEdit)}
                      <div className="flex items-end gap-3 sm:col-span-4">
                        <Button type="button" variant="primary" size="sm" className="flex items-center gap-1" onClick={()=>guardarEdicionEmpresa(emp.id)}><FaSave/> Guardar</Button>
                        <Button type="button" variant="secondary" size="sm" className="flex items-center gap-1" onClick={()=> setEditEmpresaId(null)}><FaTimes/> Cancelar</Button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <div className="font-medium text-sm flex flex-wrap items-center gap-2">
                        <FaBuilding className="text-gray-400" /> {emp.nombre}
                        {emp.alias && (
                          <span className="px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-800 dark:bg-gris-700 dark:text-indigo-300 text-[10px] font-semibold tracking-wide"
                            title="Alias: así sale el cliente en las órdenes de producción">{emp.alias}</span>
                        )}
                        <span className="text-xs font-normal text-gray-500 dark:text-gray-400">{sanitizeNIT(emp.nit)}</span>
                      </div>
                      <div className="text-xs text-gray-600 dark:text-gray-400 flex flex-wrap gap-3">
                        {[emp.ciudad, emp.direccion, emp.telefonoGeneral, emp.emailGeneral].filter(Boolean).map((dato,i)=> <span key={i}>{dato}</span>)}
                      </div>
                      <div className="text-xs flex flex-wrap gap-3">
                        <button type="button" className="text-indigo-600 hover:underline" onClick={()=>{ setEmpresaSeleccionada(emp); toast.success('Empresa seleccionada'); navigate('/cotizar'); }}>Usar en cotización</button>
                        <button type="button" className="text-indigo-600 hover:underline" onClick={()=> toggleContactos(emp)}>{contactos? 'Ocultar contactos':'Ver contactos'}</button>
                        <button type="button" className="text-indigo-600 hover:underline" onClick={()=> setHistorialAbierto(id=> id===emp.id ? null : emp.id)}>{historialAbierto===emp.id? 'Ocultar fichas y cotizaciones':'Ver fichas y cotizaciones'}</button>
                      </div>
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-4 text-base">
                  {editEmpresaId!==emp.id && <button onClick={()=> startEditarEmpresa(emp)} className="text-yellow-600" title="Editar" aria-label="Editar empresa"><FaEdit/></button>}
                  <button onClick={()=> eliminarEmpresaAccion(emp)} className="text-red-600" title="Eliminar" aria-label="Eliminar empresa"><FaTrash/></button>
                  <button onClick={()=> startNuevoContacto(emp.id)} className="text-blue-600 text-sm flex items-center gap-1" title="Nuevo contacto" aria-label="Nuevo contacto"><FaUser/>+</button>
                </div>
              </div>
              {historialAbierto===emp.id && <HistorialCliente empresa={emp} />}
              {modoNuevoContactoEmpresa===emp.id && (
                <form onSubmit={e=>handleCrearContacto(e, emp.id)} className="px-4 pb-4">
                  <div className="grid grid-cols-1 sm:grid-cols-5 gap-3 text-xs bg-gray-50 dark:bg-gris-700 p-3 rounded">
                    <input placeholder="Nombre" value={formContacto.nombre} onChange={e=>setFormContacto(v=>({...v,nombre:e.target.value}))} className="border rounded px-2 py-1" />
                    <input placeholder="Cargo" value={formContacto.cargo} onChange={e=>setFormContacto(v=>({...v,cargo:e.target.value}))} className="border rounded px-2 py-1" />
                    <input placeholder="Email" value={formContacto.email} onChange={e=>setFormContacto(v=>({...v,email:e.target.value}))} className="border rounded px-2 py-1" />
                    <input placeholder="Teléfono" value={formContacto.telefono} onChange={e=>setFormContacto(v=>({...v,telefono:e.target.value}))} className="border rounded px-2 py-1" />
                    <div className="flex items-center gap-2">
                      <Button type="submit" variant="primary" size="sm" className="flex items-center gap-1"><FaSave/> Guardar</Button>
                      <Button type="button" variant="secondary" size="sm" onClick={()=> setModoNuevoContactoEmpresa(null)} aria-label="Cancelar"><FaTimes/></Button>
                    </div>
                  </div>
                </form>
              )}
              {contactos && contactos.length>0 && (
                <div className="px-4 pb-4 space-y-2 text-xs">
                  {contactos.map(cont => (
                    <div key={cont.id} className="flex items-center justify-between bg-gray-50 dark:bg-gris-700 rounded px-3 py-2">
                      {editContactoId===cont.id ? (
                        <div className="flex-1 grid grid-cols-1 sm:grid-cols-5 gap-2">
                          <input value={formContactoEdit.nombre} onChange={e=>setFormContactoEdit(v=>({...v,nombre:e.target.value}))} placeholder="Nombre" className="border rounded px-1 py-0.5" />
                          <input value={formContactoEdit.cargo} onChange={e=>setFormContactoEdit(v=>({...v,cargo:e.target.value}))} placeholder="Cargo" className="border rounded px-1 py-0.5" />
                          <input value={formContactoEdit.email} onChange={e=>setFormContactoEdit(v=>({...v,email:e.target.value}))} placeholder="Email" className="border rounded px-1 py-0.5" />
                          <input value={formContactoEdit.telefono} onChange={e=>setFormContactoEdit(v=>({...v,telefono:e.target.value}))} placeholder="Teléfono" className="border rounded px-1 py-0.5" />
                          <div className="flex gap-2">
                            <button type="button" onClick={()=> guardarEdicionContacto(emp.id, cont.id)} className="text-green-600" title="Guardar" aria-label="Guardar"><FaSave/></button>
                            <button type="button" onClick={()=> setEditContactoId(null)} className="text-gray-500" title="Cancelar" aria-label="Cancelar"><FaTimes/></button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="flex-1 min-w-0 pr-3 space-y-0.5">
                            <div className="font-medium flex flex-wrap items-center gap-2"><FaUser className="text-gray-400" /> {cont.nombre} {cont.cargo && <span className="text-gray-500 font-normal">· {cont.cargo}</span>} {cont.email && <span className="text-gray-500 font-normal">({cont.email})</span>}</div>
                            <div className="flex flex-wrap gap-3 text-[10px] text-gray-600 dark:text-gray-400">
                              {cont.telefono && <span>{cont.telefono}</span>}
                              <button type="button" className="text-indigo-600 hover:underline" onClick={()=>{ setEmpresaSeleccionada(emp); setContactoSeleccionado(cont); toast.success('Contacto seleccionado'); navigate('/cotizar'); }}>Usar en cotización</button>
                            </div>
                          </div>
                          <div className="flex items-center gap-3 text-sm">
                            <button onClick={()=> startEditarContacto(emp.id, cont)} className="text-yellow-600" title="Editar" aria-label="Editar contacto"><FaEdit/></button>
                            <button onClick={()=> eliminarContactoAccion(emp.id, cont.id)} className="text-red-600" title="Eliminar" aria-label="Eliminar contacto"><FaTrash/></button>
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              )}
              {contactos && contactos.length===0 && (
                <div className="px-4 pb-4 text-[11px] opacity-70">Sin contactos</div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
