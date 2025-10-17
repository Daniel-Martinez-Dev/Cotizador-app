import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuote } from '../context/QuoteContext';
import { listarEmpresas, listarContactos, crearEmpresa, actualizarEmpresa, eliminarEmpresa, crearContacto, actualizarContacto, eliminarContacto, obtenerEmpresaPorNIT, buscarContactoPorEmail } from '../utils/firebaseCompanies';
import { FaPlus, FaTrash, FaEdit, FaSave, FaTimes, FaSearch, FaBuilding, FaUser, FaSync } from 'react-icons/fa';
import toast from 'react-hot-toast';
import { waitForAuth, getAuthError } from '../firebase';

export default function CompaniesPage(){
  const { empresas, setEmpresas, setEmpresaSeleccionada, setContactoSeleccionado, confirm } = useQuote();
  const navigate = useNavigate();
  const [cargando, setCargando] = useState(false);
  const [busqueda, setBusqueda] = useState('');
  const [modoNuevaEmpresa, setModoNuevaEmpresa] = useState(false);
  const [modoNuevoContactoEmpresa, setModoNuevoContactoEmpresa] = useState(null); // empresaId
  const [editEmpresaId, setEditEmpresaId] = useState(null);
  const [editContactoId, setEditContactoId] = useState(null);
  const [contactosCache, setContactosCache] = useState({}); // empresaId -> contactos

  // Formularios
  const [formEmpresa, setFormEmpresa] = useState({ nombre:'', nit:'', ciudad:'' });
  const [formEmpresaEdit, setFormEmpresaEdit] = useState({ nombre:'', nit:'', ciudad:'' });
  const sanitizeNIT = (nit)=> (nit||'').toString().replace(/["“”]/g,'');
  const [formContacto, setFormContacto] = useState({ nombre:'', email:'', telefono:'' });
  const [formContactoEdit, setFormContactoEdit] = useState({ nombre:'', email:'', telefono:'' });

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

  async function handleCrearEmpresa(e){
    e.preventDefault();
    if(!formEmpresa.nombre.trim()){ toast.error('Nombre requerido'); return; }
    if(formEmpresa.nit){
      const existe = await obtenerEmpresaPorNIT(sanitizeNIT(formEmpresa.nit.trim()));
      if(existe){ toast.error('NIT ya registrado'); return; }
    }
    try {
  const id = await crearEmpresa({ ...formEmpresa, nit: sanitizeNIT(formEmpresa.nit) });
      setEmpresas(prev=> [...prev, { id, ...formEmpresa }].sort((a,b)=> a.nombre.localeCompare(b.nombre)) );
      toast.success('Empresa creada');
      setFormEmpresa({ nombre:'', nit:'', ciudad:'' });
      setModoNuevaEmpresa(false);
    } catch(e){ console.error(e); toast.error('Error creando'); }
  }

  function startEditarEmpresa(emp){
    setEditEmpresaId(emp.id);
  setFormEmpresaEdit({ nombre:emp.nombre||'', nit:sanitizeNIT(emp.nit)||'', ciudad:emp.ciudad||'' });
  }
  async function guardarEdicionEmpresa(empId){
    if(!formEmpresaEdit.nombre.trim()){ toast.error('Nombre requerido'); return; }
    try {
  const payload = { ...formEmpresaEdit, nit: sanitizeNIT(formEmpresaEdit.nit) };
  await actualizarEmpresa(empId, payload);
  setEmpresas(prev => prev.map(e=> e.id===empId? { ...e, ...payload }: e).sort((a,b)=> a.nombre.localeCompare(b.nombre)) );
      toast.success('Empresa actualizada');
      setEditEmpresaId(null);
    } catch(e){ console.error(e); toast.error('Error actualizando'); }
  }
  async function eliminarEmpresaAccion(empId){
    const ok = await confirm('¿Eliminar empresa? (no borra contactos subcolección manualmente)');
    if(!ok) return;
    try { await eliminarEmpresa(empId); setEmpresas(prev=> prev.filter(e=> e.id!==empId)); toast.success('Eliminada'); } catch(e){ console.error(e); toast.error('Error eliminando'); }
  }

  function startNuevoContacto(empresaId){
    setModoNuevoContactoEmpresa(empresaId);
    setFormContacto({ nombre:'', email:'', telefono:'' });
  }
  async function handleCrearContacto(e, empresaId){
    e.preventDefault();
    if(!formContacto.nombre.trim()){ toast.error('Nombre contacto requerido'); return; }
    let existente = null;
    if(formContacto.email){ existente = await buscarContactoPorEmail(empresaId, formContacto.email.trim()); if(existente){ toast.error('Email ya existe'); return; } }
    try {
      await crearContacto(empresaId, formContacto);
      toast.success('Contacto creado');
      const lista = await listarContactos(empresaId);
      setContactosCache(c=> ({ ...c, [empresaId]: lista }));
      setModoNuevoContactoEmpresa(null);
    } catch(e){ console.error(e); toast.error('Error creando contacto'); }
  }
  function startEditarContacto(empresaId, contacto){
    setEditContactoId(contacto.id);
    setFormContactoEdit({ nombre: contacto.nombre||'', email: contacto.email||'', telefono: contacto.telefono||'' });
  }
  async function guardarEdicionContacto(empresaId, contactoId){
    if(!formContactoEdit.nombre.trim()){ toast.error('Nombre requerido'); return; }
    try {
      await actualizarContacto(empresaId, contactoId, formContactoEdit);
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

  const filtradas = useMemo(()=> empresas.filter(e=>{
    const q = busqueda.toLowerCase();
    return [e.nombre, e.nit, e.ciudad].some(v=> (v||'').toLowerCase().includes(q));
  }).sort((a,b)=> a.nombre.localeCompare(b.nombre)), [empresas, busqueda]);

  return (
    <div className="max-w-6xl mx-auto p-6 bg-white dark:bg-gris-900 rounded-lg shadow text-gray-900 dark:text-gray-100">
      <h1 className="text-2xl font-bold mb-4 flex items-center gap-2"><FaBuilding/> Empresas & Contactos</h1>
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="flex items-center gap-2 flex-1 border rounded px-2 bg-white dark:bg-gris-800">
          <FaSearch className="text-gray-500" />
          <input value={busqueda} onChange={e=>setBusqueda(e.target.value)} placeholder="Buscar empresa..." className="bg-transparent flex-1 py-2 outline-none text-sm" />
        </div>
        <button onClick={()=> setModoNuevaEmpresa(m=>!m)} className="bg-blue-600 text-white px-4 py-2 rounded flex items-center gap-2 text-sm">{modoNuevaEmpresa? <FaTimes/>:<FaPlus/>}{modoNuevaEmpresa? 'Cancelar':'Nueva Empresa'}</button>
        <button onClick={cargarEmpresas} className="bg-gray-500 text-white px-4 py-2 rounded flex items-center gap-2 text-sm"><FaSync className={cargando? 'animate-spin':''}/> Refrescar</button>
      </div>

      {modoNuevaEmpresa && (
        <form onSubmit={handleCrearEmpresa} className="grid grid-cols-1 sm:grid-cols-5 gap-4 mb-6 border p-4 rounded bg-gray-50 dark:bg-gris-800 dark:border-gris-700 text-sm">
          <div className="flex flex-col"><label className="text-xs font-semibold uppercase">Nombre</label><input value={formEmpresa.nombre} onChange={e=>setFormEmpresa(f=>({...f,nombre:e.target.value}))} className="border rounded px-2 py-1 bg-white dark:bg-gris-700 dark:text-white" /></div>
          <div className="flex flex-col"><label className="text-xs font-semibold uppercase">NIT</label><input value={formEmpresa.nit} onChange={e=>setFormEmpresa(f=>({...f,nit:e.target.value}))} className="border rounded px-2 py-1 bg-white dark:bg-gris-700" /></div>
            <div className="flex flex-col"><label className="text-xs font-semibold uppercase">Ciudad</label><input value={formEmpresa.ciudad} onChange={e=>setFormEmpresa(f=>({...f,ciudad:e.target.value}))} className="border rounded px-2 py-1 bg-white dark:bg-gris-700" /></div>
          <div className="flex items-end"><button type="submit" className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded flex items-center gap-2 text-sm"><FaSave/> Guardar</button></div>
        </form>
      )}

      <div className="space-y-4">
        {filtradas.length===0 && (
          <div className="text-center py-10 text-sm opacity-70">Sin resultados</div>
        )}
        {filtradas.map(emp => {
          const contactos = contactosCache[emp.id];
          return (
            <div key={emp.id} className="border rounded-lg bg-white dark:bg-gris-800 dark:border-gris-700 shadow-sm">
              <div className="p-4 flex flex-col sm:flex-row sm:items-center gap-4 justify-between">
                <div className="flex-1 min-w-0">
                  {editEmpresaId===emp.id ? (
                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 text-sm">
                      <input value={formEmpresaEdit.nombre} onChange={e=>setFormEmpresaEdit(v=>({...v,nombre:e.target.value}))} className="border rounded px-2 py-1" />
                      <input value={formEmpresaEdit.nit} onChange={e=>setFormEmpresaEdit(v=>({...v,nit:e.target.value}))} className="border rounded px-2 py-1" />
                      <input value={formEmpresaEdit.ciudad} onChange={e=>setFormEmpresaEdit(v=>({...v,ciudad:e.target.value}))} className="border rounded px-2 py-1" />
                      <div className="flex gap-2">
                        <button type="button" onClick={()=>guardarEdicionEmpresa(emp.id)} className="text-green-600" title="Guardar"><FaSave/></button>
                        <button type="button" onClick={()=> setEditEmpresaId(null)} className="text-gray-500" title="Cancelar"><FaTimes/></button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <div className="font-medium text-sm flex items-center gap-2"><FaBuilding className="text-gray-400" /> {emp.nombre} <span className="text-xs font-normal text-gray-500 dark:text-gray-400">{sanitizeNIT(emp.nit)}</span></div>
                      <div className="text-xs text-gray-600 dark:text-gray-400 flex flex-wrap gap-3">
                        {emp.ciudad && <span>{emp.ciudad}</span>}
                        <span className="cursor-pointer text-indigo-600" onClick={()=>{ setEmpresaSeleccionada(emp); toast.success('Empresa seleccionada'); navigate('/'); }}>Usar en cotización</span>
                        <span className="cursor-pointer text-indigo-600" onClick={()=> toggleContactos(emp)}>{contactos? 'Ocultar contactos':'Ver contactos'}</span>
                      </div>
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-4 text-base">
                  {editEmpresaId!==emp.id && <button onClick={()=> startEditarEmpresa(emp)} className="text-yellow-600" title="Editar"><FaEdit/></button>}
                  <button onClick={()=> eliminarEmpresaAccion(emp.id)} className="text-red-600" title="Eliminar"><FaTrash/></button>
                  <button onClick={()=> startNuevoContacto(emp.id)} className="text-blue-600 text-sm flex items-center gap-1" title="Nuevo contacto"><FaUser/>+</button>
                </div>
              </div>
              {modoNuevoContactoEmpresa===emp.id && (
                <form onSubmit={e=>handleCrearContacto(e, emp.id)} className="px-4 pb-4">
                  <div className="grid grid-cols-1 sm:grid-cols-5 gap-3 text-xs bg-gray-50 dark:bg-gris-700 p-3 rounded">
                    <input placeholder="Nombre" value={formContacto.nombre} onChange={e=>setFormContacto(v=>({...v,nombre:e.target.value}))} className="border rounded px-2 py-1" />
                    <input placeholder="Email" value={formContacto.email} onChange={e=>setFormContacto(v=>({...v,email:e.target.value}))} className="border rounded px-2 py-1" />
                    <input placeholder="Teléfono" value={formContacto.telefono} onChange={e=>setFormContacto(v=>({...v,telefono:e.target.value}))} className="border rounded px-2 py-1" />
                    <div className="flex items-center gap-2">
                      <button type="submit" className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded flex items-center gap-1"><FaSave/> Guardar</button>
                      <button type="button" onClick={()=> setModoNuevoContactoEmpresa(null)} className="bg-gray-400 hover:bg-gray-500 text-white px-3 py-1 rounded"><FaTimes/></button>
                    </div>
                  </div>
                </form>
              )}
              {contactos && contactos.length>0 && (
                <div className="px-4 pb-4 space-y-2 text-xs">
                  {contactos.map(cont => (
                    <div key={cont.id} className="flex items-center justify-between bg-gray-50 dark:bg-gris-700 rounded px-3 py-2">
                      {editContactoId===cont.id ? (
                        <div className="flex-1 grid grid-cols-1 sm:grid-cols-4 gap-2">
                          <input value={formContactoEdit.nombre} onChange={e=>setFormContactoEdit(v=>({...v,nombre:e.target.value}))} className="border rounded px-1 py-0.5" />
                          <input value={formContactoEdit.email} onChange={e=>setFormContactoEdit(v=>({...v,email:e.target.value}))} className="border rounded px-1 py-0.5" />
                          <input value={formContactoEdit.telefono} onChange={e=>setFormContactoEdit(v=>({...v,telefono:e.target.value}))} className="border rounded px-1 py-0.5" />
                          <div className="flex gap-2">
                            <button type="button" onClick={()=> guardarEdicionContacto(emp.id, cont.id)} className="text-green-600" title="Guardar"><FaSave/></button>
                            <button type="button" onClick={()=> setEditContactoId(null)} className="text-gray-500" title="Cancelar"><FaTimes/></button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="flex-1 min-w-0 pr-3 space-y-0.5">
                            <div className="font-medium flex flex-wrap items-center gap-2"><FaUser className="text-gray-400" /> {cont.nombre} {cont.email && <span className="text-gray-500 font-normal">({cont.email})</span>}</div>
                            <div className="flex flex-wrap gap-3 text-[10px] text-gray-600 dark:text-gray-400">
                              {cont.telefono && <span>{cont.telefono}</span>}
                              <span className="cursor-pointer text-indigo-600" onClick={()=>{ setEmpresaSeleccionada(emp); setContactoSeleccionado(cont); toast.success('Contacto seleccionado'); navigate('/'); }}>Usar en cotización</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-3 text-sm">
                            <button onClick={()=> startEditarContacto(emp.id, cont)} className="text-yellow-600" title="Editar"><FaEdit/></button>
                            <button onClick={()=> eliminarContactoAccion(emp.id, cont.id)} className="text-red-600" title="Eliminar"><FaTrash/></button>
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                  {contactos.length===0 && <div className="text-[11px] opacity-70">Sin contactos</div>}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
