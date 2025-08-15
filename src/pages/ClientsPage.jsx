// src/pages/ClientsPage.jsx
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { listarClientes, crearCliente, actualizarCliente, eliminarCliente } from '../utils/firebaseClients';
import { useQuote } from '../context/QuoteContext';
import { FaPlus, FaTrash, FaEdit, FaSave, FaTimes, FaSearch, FaUserCheck } from 'react-icons/fa';
import toast from 'react-hot-toast';

export default function ClientsPage() {
  const { clientes, setClientes, setClienteSeleccionado } = useQuote();
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
    if (!window.confirm('¿Eliminar cliente?')) return;
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
    <div className="max-w-5xl mx-auto p-6 bg-white shadow-md rounded-lg">
      <h1 className="text-2xl font-bold mb-4">Clientes</h1>
      <div className="mb-4">
        <button onClick={()=>navigate('/')} className="bg-gray-600 text-white px-3 py-1 rounded text-sm">← Volver al Cotizador</button>
      </div>
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="flex items-center gap-2 flex-1">
          <FaSearch className="text-gray-500" />
          <input value={busqueda} onChange={e=>setBusqueda(e.target.value)} placeholder="Buscar..." className="border p-2 rounded w-full" />
        </div>
        <button onClick={()=>{ resetForm(); setModoNuevo(m=>!m); setEditandoId(null); }} className="bg-blue-600 text-white px-4 py-2 rounded flex items-center gap-2">{modoNuevo? <FaTimes/>:<FaPlus/>}{modoNuevo? 'Cancelar':'Nuevo'}</button>
        <button onClick={cargar} className="bg-gray-500 text-white px-4 py-2 rounded">Refrescar</button>
      </div>

      {modoNuevo && (
        <form onSubmit={handleCrear} className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6 border p-4 rounded bg-gray-50">
          {['nombre','contacto','nit','ciudad','email','telefono'].map(campo => (
            <div key={campo} className="flex flex-col">
              <label className="text-xs font-semibold uppercase text-gray-600">{campo}</label>
              <input value={form[campo]} onChange={e=>setForm(f=>({...f,[campo]:e.target.value}))} className="border rounded px-2 py-1" />
            </div>
          ))}
          <div className="col-span-full flex gap-3">
            <button type="submit" className="bg-green-600 text-white px-4 py-2 rounded flex items-center gap-2"><FaSave/> Guardar</button>
          </div>
        </form>
      )}

      <div className="overflow-x-auto">
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
            {cargando ? (
              <tr><td colSpan={7} className="text-center py-4">Cargando...</td></tr>
            ) : filtrados.length === 0 ? (
              <tr><td colSpan={7} className="text-center py-4">Sin resultados</td></tr>
            ) : filtrados.map(c => (
              <tr key={c.id} className="odd:bg-white even:bg-gray-50">
                {editandoId === c.id ? (
                  <>
                    {['nombre','contacto','nit','ciudad','email','telefono'].map(campo => (
                      <td key={campo} className="border px-1 py-1">
                        <input value={form[campo]} onChange={e=>setForm(f=>({...f,[campo]:e.target.value}))} className="border rounded px-1 py-0.5 w-full text-xs" />
                      </td>
                    ))}
                    <td className="border px-1 py-1 flex gap-2">
                      <button onClick={()=>handleGuardarEdicion(c.id)} className="text-green-600" title="Guardar"><FaSave/></button>
                      <button onClick={()=>{ setEditandoId(null); resetForm(); }} className="text-gray-500" title="Cancelar"><FaTimes/></button>
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
                      <button onClick={()=>{ setClienteSeleccionado(c); toast.success('Cliente seleccionado'); }} className="text-blue-600" title="Seleccionar"><FaUserCheck/></button>
                      <button onClick={()=>startEditar(c)} className="text-yellow-600" title="Editar"><FaEdit/></button>
                      <button onClick={()=>handleEliminar(c.id)} className="text-red-600" title="Eliminar"><FaTrash/></button>
                    </td>
                  </>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
