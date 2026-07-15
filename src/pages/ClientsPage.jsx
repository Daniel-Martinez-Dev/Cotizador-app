// src/pages/ClientsPage.jsx
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { listarClientes, crearCliente, actualizarCliente, eliminarCliente } from '../utils/firebaseClients';
import { useQuote } from '../context/QuoteContext';
import { FaPlus, FaTrash, FaEdit, FaSave, FaTimes, FaSearch, FaUserCheck } from 'react-icons/fa';
import toast from 'react-hot-toast';
import EmptyState from '../components/ui/EmptyState';
import Button from '../components/ui/Button';

export default function ClientsPage() {
  const { clientes, setClientes, setClienteSeleccionado, confirm } = useQuote();
  const navigate = useNavigate();
  const [busqueda, setBusqueda] = useState('');
  const [cargando, setCargando] = useState(false);
  const [modoNuevo, setModoNuevo] = useState(false);
  const [editandoId, setEditandoId] = useState(null);
  const [form, setForm] = useState({ nombre:'', contacto:'', nit:'', ciudad:'', email:'', telefono:'' });

  useEffect(() => {
    if (clientes.length === 0) cargar();
  }, []);

  async function cargar() {
    setCargando(true);
    try {
      const lista = await listarClientes();
      setClientes(lista);
    } catch (e) {
      console.error(e);
      toast.error('Error cargando clientes');
    } finally { setCargando(false); }
  }

  function resetForm() {
    setForm({ nombre:'', contacto:'', nit:'', ciudad:'', email:'', telefono:'' });
  }

  async function handleCrear(e) {
    e.preventDefault();
    if (!form.nombre.trim()) { toast.error('Nombre requerido'); return; }
    try {
      const id = await crearCliente(form);
      setClientes(prev => [...prev, { id, ...form }].sort((a,b)=>a.nombre.localeCompare(b.nombre)) );
      toast.success('Cliente creado');
      resetForm();
      setModoNuevo(false);
    } catch (e) { console.error(e); toast.error('Error al crear'); }
  }

  function startEditar(c) {
    setEditandoId(c.id);
    setForm({ nombre:c.nombre||'', contacto:c.contacto||'', nit:c.nit||'', ciudad:c.ciudad||'', email:c.email||'', telefono:c.telefono||'' });
  }

  async function handleGuardarEdicion(id) {
    if (!form.nombre.trim()) { toast.error('Nombre requerido'); return; }
    try {
      await actualizarCliente(id, form);
      setClientes(prev => prev.map(c => c.id===id ? { ...c, ...form } : c).sort((a,b)=>a.nombre.localeCompare(b.nombre)) );
      toast.success('Actualizado');
      setEditandoId(null);
      resetForm();
    } catch (e) { console.error(e); toast.error('Error actualizando'); }
  }

  async function handleEliminar(id) {
    const ok = await confirm('¿Eliminar cliente?');
    if(!ok) return;
    try {
      await eliminarCliente(id);
      setClientes(prev => prev.filter(c=>c.id!==id));
      toast.success('Eliminado');
    } catch (e) { console.error(e); toast.error('Error eliminando'); }
  }

  const filtrados = clientes.filter(c => {
    const q = busqueda.toLowerCase();
    return [c.nombre, c.contacto, c.nit, c.ciudad, c.email, c.telefono].some(v => (v||'').toLowerCase().includes(q));
  });

  return (
  <div className="max-w-5xl mx-auto p-6 bg-white dark:bg-gris-900 shadow-md rounded-lg text-gray-900 dark:text-gray-100">
      <h1 className="text-2xl font-bold mb-4">Clientes</h1>
      <div className="mb-4">
        <button onClick={()=>navigate('/cotizar')} className="bg-gray-600 text-white px-3 py-1 rounded text-sm">← Volver al Cotizador</button>
      </div>
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="flex items-center gap-2 flex-1">
          <FaSearch className="text-gray-500" />
          <input value={busqueda} onChange={e=>setBusqueda(e.target.value)} placeholder="Buscar..." className="border p-2 rounded w-full" />
        </div>
        <Button variant="accent" className="flex items-center gap-2" onClick={()=>{ resetForm(); setModoNuevo(m=>!m); setEditandoId(null); }}>{modoNuevo? <FaTimes/>:<FaPlus/>}{modoNuevo? 'Cancelar':'Nuevo'}</Button>
        <Button variant="secondary" onClick={cargar}>Refrescar</Button>
      </div>

      {modoNuevo && (
  <form onSubmit={handleCrear} className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6 border p-4 rounded bg-gray-50 dark:bg-gris-800 dark:border-gris-700">
          {['nombre','contacto','nit','ciudad','email','telefono'].map(campo => (
            <div key={campo} className="flex flex-col">
              <label className="text-xs font-semibold uppercase text-gray-600 dark:text-gray-200">{campo}</label>
              <input value={form[campo]} onChange={e=>setForm(f=>({...f,[campo]:e.target.value}))} className="border rounded px-2 py-1 bg-white dark:bg-gris-700 dark:text-white dark:border-gris-600 placeholder-gray-400" />
            </div>
          ))}
          <div className="col-span-full flex gap-3">
            <Button type="submit" variant="primary" className="flex items-center gap-2"><FaSave/> Guardar</Button>
          </div>
        </form>
      )}

      {cargando ? (
        <EmptyState icon="⏳" title="Cargando..." />
      ) : filtrados.length === 0 ? (
        <EmptyState icon="🗂️" title="Sin resultados" />
      ) : (
        <>
          {/* Tabla (pantallas medianas y grandes) */}
          <div className="hidden sm:block overflow-x-auto">
            <table className="w-full text-sm border">
              <thead className="bg-gray-100">
                <tr>
                  <th className="border px-2 py-1">Nombre</th>
                  <th className="border px-2 py-1">Contacto</th>
                  <th className="border px-2 py-1">NIT</th>
                  <th className="border px-2 py-1">Ciudad</th>
                  <th className="border px-2 py-1">Email</th>
                  <th className="border px-2 py-1">Teléfono</th>
                  <th className="border px-2 py-1">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filtrados.map(c => (
                  <tr key={c.id} className="odd:bg-white even:bg-gray-50">
                    {editandoId === c.id ? (
                      <>
                        {['nombre','contacto','nit','ciudad','email','telefono'].map(campo => (
                          <td key={campo} className="border px-1 py-1">
                            <input value={form[campo]} onChange={e=>setForm(f=>({...f,[campo]:e.target.value}))} className="border rounded px-1 py-0.5 w-full text-xs" />
                          </td>
                        ))}
                        <td className="border px-1 py-1 flex gap-2">
                          <button onClick={()=>handleGuardarEdicion(c.id)} className="text-green-600" title="Guardar" aria-label="Guardar"><FaSave/></button>
                          <button onClick={()=>{ setEditandoId(null); resetForm(); }} className="text-gray-500" title="Cancelar" aria-label="Cancelar"><FaTimes/></button>
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="border px-2 py-1 font-medium">{c.nombre}</td>
                        <td className="border px-2 py-1">{c.contacto}</td>
                        <td className="border px-2 py-1">{c.nit}</td>
                        <td className="border px-2 py-1">{c.ciudad}</td>
                        <td className="border px-2 py-1">{c.email}</td>
                        <td className="border px-2 py-1">{c.telefono}</td>
                        <td className="border px-2 py-1 flex gap-2 text-base">
                          <button onClick={()=>{ setClienteSeleccionado(c); toast.success('Cliente seleccionado'); }} className="text-blue-600" title="Seleccionar" aria-label="Seleccionar cliente"><FaUserCheck/></button>
                          <button onClick={()=>startEditar(c)} className="text-yellow-600" title="Editar" aria-label="Editar cliente"><FaEdit/></button>
                          <button onClick={()=>handleEliminar(c.id)} className="text-red-600" title="Eliminar" aria-label="Eliminar cliente"><FaTrash/></button>
                        </td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Tarjetas (móvil) */}
          <div className="sm:hidden space-y-3">
            {filtrados.map(c => (
              <div key={c.id} className="border rounded-lg p-3 bg-white dark:bg-gris-800 dark:border-gris-700 shadow-sm">
                {editandoId === c.id ? (
                  <div className="space-y-2">
                    {['nombre','contacto','nit','ciudad','email','telefono'].map(campo => (
                      <div key={campo} className="flex flex-col">
                        <label className="text-[10px] font-semibold uppercase text-gray-500 dark:text-gray-400">{campo}</label>
                        <input value={form[campo]} onChange={e=>setForm(f=>({...f,[campo]:e.target.value}))} className="border rounded px-2 py-1 text-sm bg-white dark:bg-gris-700 dark:border-gris-600" />
                      </div>
                    ))}
                    <div className="flex gap-3 pt-1">
                      <button onClick={()=>handleGuardarEdicion(c.id)} className="text-green-600 flex items-center gap-1 text-sm" aria-label="Guardar"><FaSave/> Guardar</button>
                      <button onClick={()=>{ setEditandoId(null); resetForm(); }} className="text-gray-500 flex items-center gap-1 text-sm" aria-label="Cancelar"><FaTimes/> Cancelar</button>
                    </div>
                  </div>
                ) : (
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <div className="font-semibold text-sm">{c.nombre || '—'}</div>
                      <div className="flex gap-3 text-base shrink-0">
                        <button onClick={()=>{ setClienteSeleccionado(c); toast.success('Cliente seleccionado'); }} className="text-blue-600" aria-label="Seleccionar cliente"><FaUserCheck/></button>
                        <button onClick={()=>startEditar(c)} className="text-yellow-600" aria-label="Editar cliente"><FaEdit/></button>
                        <button onClick={()=>handleEliminar(c.id)} className="text-red-600" aria-label="Eliminar cliente"><FaTrash/></button>
                      </div>
                    </div>
                    <div className="mt-1 text-xs text-gray-600 dark:text-gray-300 space-y-0.5">
                      {c.contacto && <div>Contacto: {c.contacto}</div>}
                      {c.nit && <div>NIT: {c.nit}</div>}
                      {c.ciudad && <div>Ciudad: {c.ciudad}</div>}
                      {c.email && <div>Email: {c.email}</div>}
                      {c.telefono && <div>Teléfono: {c.telefono}</div>}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
