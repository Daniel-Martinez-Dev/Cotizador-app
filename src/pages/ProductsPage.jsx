// src/pages/ProductsPage.jsx
import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { priceMatrices, matrizPanamericana, EXTRAS_POR_DEFECTO } from '../data/precios';
import { useQuote } from '../context/QuoteContext';
import { cargarMatricesConfig, cargarExtrasConfig, guardarMatricesConfig, guardarExtrasConfig } from '../utils/pricingConfigFirebase';
import toast from 'react-hot-toast';

// Etiquetas de rangos
function labelRango(ranges, i) {
  if (!ranges || ranges.length === 0) return '';
  if (i >= ranges.length - 1) return ranges[i] + '+';
  return `${ranges[i]} – ${ranges[i + 1]}`;
}

// Tabla sólo lectura
function TablaMatrizReadOnly({ titulo, matriz, anchoRanges = [], altoRanges = [] }) {
  if (!matriz || !Array.isArray(matriz)) return null;
  return (
    <div className="mb-4">
      <div className="overflow-x-auto border rounded dark:border-gris-700">
        <table className="text-xs md:text-sm w-full border-collapse">
          <thead className="bg-gray-50 dark:bg-gris-800">
            <tr>
              <th className="border px-2 py-1 bg-gray-50 dark:bg-gris-700">Alto / Ancho</th>
              {anchoRanges.slice(0, matriz[0].length).map((_, idx) => (
                <th key={idx} className="border px-2 py-1 bg-gray-50 dark:bg-gris-700 whitespace-nowrap">{labelRango(anchoRanges, idx)}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {matriz.map((fila, i) => (
              <tr key={i} className={i % 2 ? 'bg-gray-50 dark:bg-gris-800' : 'bg-white dark:bg-gris-900'}>
                <th className="border px-2 py-1 bg-gray-100 dark:bg-gris-700 font-medium whitespace-nowrap">{labelRango(altoRanges, i)}</th>
                {fila.map((val, j) => (
                  <td key={j} className="border px-2 py-1 text-right tabular-nums dark:border-gris-700">{val?.toLocaleString('es-CO')}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// Tabla editable (sólo visible en modo edición)
function TablaMatriz({ titulo, nombreProducto, matriz, anchoRanges = [], altoRanges = [], onCellChange, onApplyPercent }) {
  if (!matriz || !Array.isArray(matriz)) return null;
  return (
    <div className="mb-8">
      <h3 className="text-lg font-semibold mb-2">{titulo}</h3>
      <div className="flex gap-2 mb-2 text-xs">
        <input type="number" placeholder="%" className="border px-2 py-1 rounded w-20" onKeyDown={(e)=>{ if(e.key==='Enter'){ const val=parseFloat(e.currentTarget.value); if(!isNaN(val)) { onApplyPercent(val); e.currentTarget.value=''; } } }} />
        <button onClick={()=>{ const input = prompt('Aumento / reducción porcentual (ej 5 o -3):'); if(!input) return; const val=parseFloat(input); if(!isNaN(val)) onApplyPercent(val); }} className="bg-indigo-600 text-white px-2 py-1 rounded">Aplicar %</button>
      </div>
      <div className="overflow-x-auto border rounded dark:border-gris-700">
        <table className="text-xs md:text-sm w-full border-collapse">
          <thead className="bg-gray-50 dark:bg-gris-800">
            <tr>
              <th className="border px-2 py-1 bg-gray-50 dark:bg-gris-700">Alto / Ancho</th>
              {anchoRanges.slice(0, matriz[0].length).map((_, idx) => (
                <th key={idx} className="border px-2 py-1 bg-gray-50 dark:bg-gris-700 whitespace-nowrap">{labelRango(anchoRanges, idx)}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {matriz.map((fila, i) => (
              <tr key={i} className={i % 2 ? 'bg-gray-50 dark:bg-gris-800' : 'bg-white dark:bg-gris-900'}>
                <th className="border px-2 py-1 bg-gray-100 dark:bg-gris-700 font-medium whitespace-nowrap">{labelRango(altoRanges, i)}</th>
                {fila.map((val, j) => (
                  <td key={j} className="border px-1 py-1 text-right tabular-nums">
                    <input
                      type="number"
                      defaultValue={val}
                      onBlur={(e)=>{ const v=parseInt(e.target.value)||0; onCellChange(i,j,v); }}
                      className="w-20 border rounded px-1 py-0.5 text-right bg-white dark:bg-gris-800 dark:text-white dark:border-gris-600"
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function TablaSelloAnden({ datos }) {
  if (!datos) return null;
  const { base, medidaRanges } = datos;
  const labels = medidaRanges.slice(0, base.cortina.length).map((_, i) => labelRango(medidaRanges, i));
  const filas = [
    { nombre: 'Cortina', valores: base.cortina },
    { nombre: 'Postes Laterales', valores: base.postes },
    { nombre: 'Travesaño', valores: base.travesano },
    { nombre: 'Juego Completo', valores: base.completos }
  ];
  return (
    <div className="mb-8">
      <h3 className="text-lg font-semibold mb-2">Sello de Andén</h3>
      <div className="overflow-x-auto border rounded dark:border-gris-700">
        <table className="text-xs md:text-sm w-full border-collapse">
          <thead className="bg-gray-50 dark:bg-gris-800">
            <tr>
              <th className="border px-2 py-1 bg-gray-50 dark:bg-gris-700">Componente / Medida</th>
              {labels.map((l, i) => <th key={i} className="border px-2 py-1 bg-gray-50 dark:bg-gris-700 whitespace-nowrap">{l}</th>)}
            </tr>
          </thead>
          <tbody>
            {filas.map(f => (
              <tr key={f.nombre} className="odd:bg-white even:bg-gray-50 dark:odd:bg-gris-900 dark:even:bg-gris-800">
                <th className="border px-2 py-1 bg-gray-100 dark:bg-gris-700 font-medium whitespace-nowrap text-left">{f.nombre}</th>
                {f.valores.map((v,i)=>(<td key={i} className="border px-2 py-1 text-right tabular-nums dark:border-gris-700">{v?.toLocaleString('es-CO')}</td>))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// Extras editables
function ListaExtrasEditable({ producto, extras, onChange, confirm }) {
  const [nuevoNombre, setNuevoNombre] = useState('');
  const [nuevoPrecio, setNuevoPrecio] = useState('');
  if (!extras) extras = [];
  return (
    <div className="mb-6">
      <h4 className="font-medium text-sm mb-2">Extras ({producto})</h4>
      <table className="text-xs w-full border mb-2 dark:border-gris-700">
        <thead className="bg-gray-50 dark:bg-gris-800">
          <tr>
            <th className="border px-2 py-1 text-left dark:bg-gris-700">Nombre</th>
            <th className="border px-2 py-1 dark:bg-gris-700">Precio</th>
            <th className="border px-2 py-1 dark:bg-gris-700">Dist.</th>
            <th className="border px-2 py-1 dark:bg-gris-700">Cliente</th>
            <th className="border px-2 py-1 dark:bg-gris-700">Acciones</th>
          </tr>
        </thead>
        <tbody>
          {extras.length===0 && (
            <tr><td colSpan={5} className="text-center py-2 text-gray-500">Sin extras</td></tr>
          )}
          {extras.map((e,i)=>(
            <tr key={i} className="odd:bg-white even:bg-gray-50 dark:odd:bg-gris-900 dark:even:bg-gris-800">
              <td className="border px-1 py-1">
                <input defaultValue={e.nombre} className="w-full border rounded px-1 py-0.5 bg-white dark:bg-gris-800 dark:text-white dark:border-gris-600" onBlur={(ev)=>{ const nombre=ev.target.value||''; const copia=[...extras]; copia[i]={...copia[i], nombre}; onChange(copia); }} />
              </td>
              <td className="border px-1 py-1">
                <input type="number" defaultValue={e.precio||''} className="w-24 border rounded px-1 py-0.5 text-right bg-white dark:bg-gris-800 dark:text-white dark:border-gris-600" onBlur={(ev)=>{ const precio=parseInt(ev.target.value)||0; const copia=[...extras]; copia[i]={...copia[i], precio}; onChange(copia); }} />
              </td>
              <td className="border px-1 py-1">
                <input type="number" defaultValue={e.precioDistribuidor||''} className="w-24 border rounded px-1 py-0.5 text-right bg-white dark:bg-gris-800 dark:text-white dark:border-gris-600" onBlur={(ev)=>{ const v=parseInt(ev.target.value)||0; const copia=[...extras]; copia[i]={...copia[i], precioDistribuidor:v}; onChange(copia); }} />
              </td>
              <td className="border px-1 py-1">
                <input type="number" defaultValue={e.precioCliente||''} className="w-24 border rounded px-1 py-0.5 text-right bg-white dark:bg-gris-800 dark:text-white dark:border-gris-600" onBlur={(ev)=>{ const v=parseInt(ev.target.value)||0; const copia=[...extras]; copia[i]={...copia[i], precioCliente:v}; onChange(copia); }} />
              </td>
              <td className="border px-1 py-1 text-center">
                <button onClick={async()=>{ if(await confirm('Eliminar extra?')) { const copia=[...extras]; copia.splice(i,1); onChange(copia);} }} className="text-red-500 hover:text-red-400 text-xs">Eliminar</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="flex flex-wrap gap-2 items-end mb-2">
        <div className="flex flex-col">
          <label className="text-[10px] uppercase text-gray-500 dark:text-gray-300">Nombre</label>
          <input value={nuevoNombre} onChange={e=>setNuevoNombre(e.target.value)} className="border rounded px-2 py-1 text-xs bg-white dark:bg-gris-800 dark:text-white dark:border-gris-600" />
        </div>
        <div className="flex flex-col">
          <label className="text-[10px] uppercase text-gray-500 dark:text-gray-300">Precio</label>
          <input value={nuevoPrecio} onChange={e=>setNuevoPrecio(e.target.value)} type="number" className="border rounded px-2 py-1 text-xs w-28 bg-white dark:bg-gris-800 dark:text-white dark:border-gris-600" />
        </div>
        <button onClick={()=>{ if(!nuevoNombre) return; const copia=[...extras, { nombre:nuevoNombre, precio: parseInt(nuevoPrecio)||0 }]; onChange(copia); setNuevoNombre(''); setNuevoPrecio(''); }} className="bg-green-600 hover:bg-green-500 text-white px-3 py-1 rounded text-xs dark:bg-green-500 dark:hover:bg-green-400">Añadir Extra</button>
      </div>
    </div>
  );
}

// Extras sólo lectura
function ListaExtrasReadOnly({ extras }) {
  if (!extras || !extras.length) return <p className="text-xs text-gray-500 italic mb-4 dark:text-gray-400">Sin extras</p>;
  return (
    <ul className="list-disc list-inside text-xs space-y-0.5 mb-4">
      {extras.map((e,i)=>(
        <li key={i} className="flex flex-wrap gap-1">
          <span className="font-semibold text-gray-800 dark:text-white">{e.nombre}:</span>
          {e.precio && <span className="dark:text-gray-200">{e.precio.toLocaleString('es-CO')}</span>}
          {e.precioDistribuidor && <span className="dark:text-gray-300">Dist: {e.precioDistribuidor.toLocaleString('es-CO')}</span>}
          {e.precioCliente && <span className="dark:text-gray-300">Cliente: {e.precioCliente.toLocaleString('es-CO')}</span>}
        </li>
      ))}
    </ul>
  );
}

export default function ProductsPage() {
  const navigate = useNavigate();
  const { matricesOverride, setMatricesOverride, extrasOverride, setExtrasOverride, confirm } = useQuote();
  const [filtro, setFiltro] = useState('');
  const [editando, setEditando] = useState({}); // { nombreProducto: true/false }
  const productos = useMemo(() => Object.keys(priceMatrices), []);
  const filtrados = productos.filter(p => p.toLowerCase().includes(filtro.toLowerCase()));
  const [cargandoConfig, setCargandoConfig] = useState(false);
  const [guardando, setGuardando] = useState(false);

  // Cargar configuraciones guardadas (una vez)
  useEffect(()=>{
    let activo = true;
    (async ()=>{
      setCargandoConfig(true);
      try {
        const [mat, ext] = await Promise.all([cargarMatricesConfig(), cargarExtrasConfig()]);
        if (activo) {
          if (mat) setMatricesOverride(mat);
          if (ext) setExtrasOverride(ext);
        }
      } catch(e){ console.error(e); } finally { if(activo) setCargandoConfig(false); }
    })();
    return ()=>{ activo=false; };
  }, []);

  async function handleGuardarMatrices() {
    try {
      setGuardando(true);
      await guardarMatricesConfig(matricesOverride||{});
      toast.success('Matrices guardadas');
    } catch(e){ toast.error('Error guardando matrices'); } finally { setGuardando(false); }
  }
  async function handleGuardarExtras() {
    try {
      setGuardando(true);
      await guardarExtrasConfig(extrasOverride||{});
      toast.success('Extras guardados');
    } catch(e){ toast.error('Error guardando extras'); } finally { setGuardando(false); }
  }

  return (
  <div className="max-w-7xl mx-auto p-6 bg-white dark:bg-gris-900 shadow-md rounded-lg text-gray-900 dark:text-gray-100">
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <button onClick={()=>navigate('/')} className="bg-gray-600 text-white px-4 py-2 rounded text-sm">← Volver</button>
        <input placeholder="Buscar producto" value={filtro} onChange={e=>setFiltro(e.target.value)} className="border p-2 rounded flex-1" />
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
  <h1 className="text-2xl font-bold text-gray-900 dark:text-trafico">Catálogo y Matrices de Precios</h1>
        <div className="flex flex-wrap gap-2 text-sm">
          <button onClick={handleGuardarMatrices} disabled={guardando} className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white px-3 py-2 rounded">Guardar Matrices</button>
          <button onClick={handleGuardarExtras} disabled={guardando} className="bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white px-3 py-2 rounded">Guardar Extras</button>
        </div>
      </div>
      {cargandoConfig && <p className="text-xs text-gray-500 mb-4">Cargando configuración guardada...</p>}

      {filtrados.length === 0 && (
        <p className="text-sm text-gray-600">Sin coincidencias</p>
      )}

      {filtrados.map(nombre => {
        const override = matricesOverride?.[nombre];
        const datosBase = priceMatrices[nombre];
        const datos = override || datosBase;
        const esSello = nombre === 'Sello de Andén';
        const extrasBase = extrasOverride?.[nombre] || EXTRAS_POR_DEFECTO[nombre];
        const estaEditando = !!editando[nombre];
        return (
      <div key={nombre} className="mb-10 border-b-2 pb-6 border-gray-200 dark:border-trafico/70">
            <div className="flex flex-wrap items-center gap-4 mb-2">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">{nombre}</h2>
        {override && <span className="text-xs bg-indigo-600 text-white px-2 py-0.5 rounded">Modificada</span>}
              <button
                onClick={()=> setEditando(prev => ({ ...prev, [nombre]: !estaEditando }))}
                className={`text-xs px-3 py-1 rounded ${estaEditando ? 'bg-red-600 text-white hover:bg-red-500' : 'bg-indigo-600 text-white hover:bg-indigo-500'} dark:bg-gris-700 dark:hover:bg-gris-600`}
              >{estaEditando ? 'Cerrar edición' : 'Editar'}</button>
            </div>
            {!estaEditando && (
              <>
                {esSello ? <TablaSelloAnden datos={datos} /> : <TablaMatrizReadOnly titulo={`Matriz de ${nombre}`} matriz={datos.base} anchoRanges={datos.anchoRanges||[]} altoRanges={datos.altoRanges||[]} />}
                <ListaExtrasReadOnly extras={extrasBase} />
              </>
            )}
            {estaEditando && (
              <>
                {esSello ? (
                  <TablaSelloAnden datos={datos} />
                ) : (
                  <TablaMatriz
                    titulo={`Matriz de ${nombre}`}
                    nombreProducto={nombre}
                    matriz={datos.base}
                    anchoRanges={datos.anchoRanges||[]}
                    altoRanges={datos.altoRanges||[]}
                    onCellChange={(fila,col,valor)=>{
                      setMatricesOverride(prev=>{
                        const copia = { ...(prev||{}) };
                        const baseOriginal = copia[nombre]?.base || datos.base;
                        const nuevoBase = baseOriginal.map((r,i)=> r.map((c,j)=> (i===fila && j===col) ? valor : c));
                        copia[nombre] = { ...datos, base: nuevoBase };
                        return copia;
                      });
                    }}
                    onApplyPercent={async(pct)=>{
                      const ok = await confirm(`Aplicar ${pct}% a toda la matriz de ${nombre}?`);
                      if(!ok) return;
                      setMatricesOverride(prev=>{
                        const copia={...(prev||{})};
                        const baseOriginal = copia[nombre]?.base || datos.base;
                        const nuevoBase = baseOriginal.map(f=> f.map(v=> Math.round(v * (1 + pct/100))));
                        copia[nombre] = { ...datos, base: nuevoBase };
                        return copia;
                      });
                    }}
                  />
                )}
                <ListaExtrasEditable producto={nombre} extras={extrasBase} confirm={confirm} onChange={(lista)=>{
                  setExtrasOverride(prev=> ({ ...(prev||{}), [nombre]: lista }));
                }} />
              </>
            )}
            <div className="flex gap-2 text-xs mt-1">
              {override && <button onClick={async()=>{ if(await confirm('Revertir cambios de esta matriz?')){ setMatricesOverride(prev=>{ const c={...(prev||{})}; delete c[nombre]; return c; }); } }} className="bg-gray-300 px-2 py-1 rounded">Revertir matriz</button>}
              {extrasOverride?.[nombre] && <button onClick={async()=>{ if(await confirm('Revertir extras modificados?')){ setExtrasOverride(prev=>{ const c={...(prev||{})}; delete c[nombre]; return c; }); } }} className="bg-gray-300 px-2 py-1 rounded">Revertir extras</button>}
            </div>
          </div>
        );
      })}

      <div className="mt-12 border-t pt-8">
        {(() => {
          const nombre = 'Panamericana';
          const override = matricesOverride?.[nombre];
          const datos = override || matrizPanamericana; // misma estructura { base, anchoRanges, altoRanges }
          const estaEditando = !!editando[nombre];
          return (
            <div className="mb-6 border-b-2 pb-6 border-gray-200 dark:border-trafico/70">
              <div className="flex flex-wrap items-center gap-4 mb-2">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Divisiones Térmicas – Carrocerías Panamericana</h2>
                {override && <span className="text-xs bg-indigo-600 text-white px-2 py-0.5 rounded">Modificada</span>}
                <button
                  onClick={()=> setEditando(prev => ({ ...prev, [nombre]: !estaEditando }))}
                  className={`text-xs px-3 py-1 rounded ${estaEditando ? 'bg-red-600 text-white hover:bg-red-500' : 'bg-indigo-600 text-white hover:bg-indigo-500'} dark:bg-gris-700 dark:hover:bg-gris-600`}
                >{estaEditando ? 'Cerrar edición' : 'Editar'}</button>
              </div>
              {!estaEditando && (
                <TablaMatrizReadOnly titulo="Matriz Especial Panamericana" matriz={datos.base} anchoRanges={datos.anchoRanges} altoRanges={datos.altoRanges} />
              )}
              {estaEditando && (
                <TablaMatriz
                  titulo="Matriz Especial Panamericana"
                  nombreProducto={nombre}
                  matriz={datos.base}
                  anchoRanges={datos.anchoRanges}
                  altoRanges={datos.altoRanges}
                  onCellChange={(fila,col,valor)=>{
                    setMatricesOverride(prev=>{
                      const copia = { ...(prev||{}) };
                      const baseOriginal = copia[nombre]?.base || datos.base;
                      const nuevoBase = baseOriginal.map((r,i)=> r.map((c,j)=> (i===fila && j===col) ? valor : c));
                      copia[nombre] = { ...datos, base: nuevoBase };
                      return copia;
                    });
                  }}
                  onApplyPercent={async(pct)=>{
                    const ok = await confirm(`Aplicar ${pct}% a toda la matriz Panamericana?`);
                    if(!ok) return;
                    setMatricesOverride(prev=>{
                      const copia={...(prev||{})};
                      const baseOriginal = copia[nombre]?.base || datos.base;
                      const nuevoBase = baseOriginal.map(f=> f.map(v=> Math.round(v * (1 + pct/100))));
                      copia[nombre] = { ...datos, base: nuevoBase };
                      return copia;
                    });
                  }}
                />
              )}
              <div className="flex gap-2 text-xs mt-1">
                {override && <button onClick={async()=>{ if(await confirm('Revertir cambios de la matriz Panamericana?')){ setMatricesOverride(prev=>{ const c={...(prev||{})}; delete c[nombre]; return c; }); } }} className="bg-gray-300 px-2 py-1 rounded">Revertir matriz</button>}
              </div>
            </div>
          );
        })()}
      </div>

      <div className="mt-12 p-4 bg-yellow-50 dark:bg-gris-800 border border-yellow-200 dark:border-gris-700 rounded text-xs leading-relaxed">
        <h3 className="font-semibold mb-1 text-gray-900 dark:text-white">Notas</h3>
        <ul className="list-disc list-inside space-y-1">
          <li>Los cambios se mantienen sólo en memoria (contexto) hasta que recargues la página.</li>
          <li>Aplicar un porcentaje modifica cada celda: nuevo = redondeo( valor * (1 + pct/100) ).</li>
          <li>Puedes revertir una matriz o sus extras individualmente.</li>
        </ul>
      </div>
    </div>
  );
}
