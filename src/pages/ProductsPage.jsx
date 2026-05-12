import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuote } from '../context/QuoteContext';
import { useAuth } from '../context/AuthContext';
import { guardarProducto, subirFotoProducto, sembrarProductos, migrarCondicionesComerciales, cargarTerminos, guardarTerminos } from '../utils/firebaseProductos';
import { generarTerminosGeneralesHTML } from '../utils/htmlSections';
import RichTextEditor from '../components/RichTextEditor';
import 'react-quill-new/dist/quill.snow.css';
import toast from 'react-hot-toast';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function labelRango(ranges, i) {
  if (!ranges || ranges.length === 0) return '';
  if (i >= ranges.length - 1) return ranges[i] + '+';
  return `${ranges[i]} – ${ranges[i + 1]}`;
}

function formatCOP(v) {
  if (!v && v !== 0) return '–';
  return v.toLocaleString('es-CO');
}

// ─── Tabla matriz sólo lectura ────────────────────────────────────────────────

function TablaMatrizReadOnly({ matriz, anchoRanges = [], altoRanges = [] }) {
  if (!matriz || !Array.isArray(matriz)) return null;
  return (
    <div className="overflow-x-auto border rounded dark:border-gris-700">
      <table className="text-xs w-full border-collapse">
        <thead className="bg-gray-50 dark:bg-gris-800">
          <tr>
            <th className="border px-2 py-1 bg-gray-100 dark:bg-gris-700">Alto / Ancho</th>
            {anchoRanges.slice(0, matriz[0]?.length).map((_, idx) => (
              <th key={idx} className="border px-2 py-1 bg-gray-50 dark:bg-gris-700 whitespace-nowrap">{labelRango(anchoRanges, idx)}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {matriz.map((fila, i) => (
            <tr key={i} className={i % 2 ? 'bg-gray-50 dark:bg-gris-800' : 'bg-white dark:bg-gris-900'}>
              <th className="border px-2 py-1 bg-gray-100 dark:bg-gris-700 font-medium whitespace-nowrap">{labelRango(altoRanges, i)}</th>
              {fila.map((val, j) => (
                <td key={j} className="border px-2 py-1 text-right tabular-nums dark:border-gris-700">{formatCOP(val)}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Tabla Sello de Andén sólo lectura ───────────────────────────────────────

function TablaSelloAndenReadOnly({ datos }) {
  if (!datos) return null;
  const { base, medidaRanges } = datos;
  const labels = medidaRanges.slice(0, base.cortina.length).map((_, i) => labelRango(medidaRanges, i));
  const filas = [
    { nombre: 'Cortina', valores: base.cortina },
    { nombre: 'Postes Laterales', valores: base.postes },
    { nombre: 'Travesaño', valores: base.travesano },
    { nombre: 'Juego Completo', valores: base.completos },
  ];
  return (
    <div className="overflow-x-auto border rounded dark:border-gris-700">
      <table className="text-xs w-full border-collapse">
        <thead className="bg-gray-50 dark:bg-gris-800">
          <tr>
            <th className="border px-2 py-1 bg-gray-100 dark:bg-gris-700">Componente / Medida</th>
            {labels.map((l, i) => <th key={i} className="border px-2 py-1 bg-gray-50 dark:bg-gris-700 whitespace-nowrap">{l}</th>)}
          </tr>
        </thead>
        <tbody>
          {filas.map(f => (
            <tr key={f.nombre} className="odd:bg-white even:bg-gray-50 dark:odd:bg-gris-900 dark:even:bg-gris-800">
              <th className="border px-2 py-1 bg-gray-100 dark:bg-gris-700 font-medium text-left">{f.nombre}</th>
              {f.valores.map((v, i) => <td key={i} className="border px-2 py-1 text-right tabular-nums dark:border-gris-700">{formatCOP(v)}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Tabla matriz editable ────────────────────────────────────────────────────

function TablaMatrizEditable({ matriz, anchoRanges = [], altoRanges = [], onCellChange, onApplyPercent }) {
  if (!matriz || !Array.isArray(matriz)) return null;
  return (
    <div>
      <div className="flex gap-2 mb-2 items-center">
        <span className="text-xs text-gray-500">Ajuste %:</span>
        <input
          type="number"
          placeholder="ej. 5 o -3"
          className="border px-2 py-1 rounded w-24 text-xs dark:bg-gris-800 dark:border-gris-600 dark:text-white"
          onKeyDown={e => { if (e.key === 'Enter') { const v = parseFloat(e.currentTarget.value); if (!isNaN(v)) { onApplyPercent(v); e.currentTarget.value = ''; } } }}
        />
        <span className="text-xs text-gray-400">Enter para aplicar</span>
      </div>
      <div className="overflow-x-auto border rounded dark:border-gris-700">
        <table className="text-xs w-full border-collapse">
          <thead className="bg-gray-50 dark:bg-gris-800">
            <tr>
              <th className="border px-2 py-1 bg-gray-100 dark:bg-gris-700">Alto / Ancho</th>
              {anchoRanges.slice(0, matriz[0]?.length).map((_, idx) => (
                <th key={idx} className="border px-2 py-1 bg-gray-50 dark:bg-gris-700 whitespace-nowrap">{labelRango(anchoRanges, idx)}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {matriz.map((fila, i) => (
              <tr key={i} className={i % 2 ? 'bg-gray-50 dark:bg-gris-800' : 'bg-white dark:bg-gris-900'}>
                <th className="border px-2 py-1 bg-gray-100 dark:bg-gris-700 font-medium whitespace-nowrap">{labelRango(altoRanges, i)}</th>
                {fila.map((val, j) => (
                  <td key={j} className="border px-1 py-1 text-right">
                    <input
                      type="number"
                      defaultValue={val}
                      key={`${i}-${j}-${val}`}
                      onBlur={e => { const v = parseInt(e.target.value) || 0; onCellChange(i, j, v); }}
                      className="w-24 border rounded px-1 py-0.5 text-right text-xs bg-white dark:bg-gris-800 dark:text-white dark:border-gris-600"
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

// ─── Editor Sello de Andén ────────────────────────────────────────────────────

function TablaSelloAndenEditable({ datos, onChange }) {
  if (!datos) return null;
  const { base, medidaRanges } = datos;
  const labels = medidaRanges.slice(0, base.cortina.length).map((_, i) => labelRango(medidaRanges, i));
  const claves = [
    { key: 'cortina', label: 'Cortina' },
    { key: 'postes', label: 'Postes Laterales' },
    { key: 'travesano', label: 'Travesaño' },
    { key: 'completos', label: 'Juego Completo' },
  ];
  const handleChange = (clave, idx, valor) => {
    const nuevoBase = { ...base };
    nuevoBase[clave] = [...nuevoBase[clave]];
    nuevoBase[clave][idx] = valor;
    onChange({ base: nuevoBase, medidaRanges });
  };
  return (
    <div className="overflow-x-auto border rounded dark:border-gris-700">
      <table className="text-xs w-full border-collapse">
        <thead className="bg-gray-50 dark:bg-gris-800">
          <tr>
            <th className="border px-2 py-1 bg-gray-100 dark:bg-gris-700">Componente / Medida</th>
            {labels.map((l, i) => <th key={i} className="border px-2 py-1 bg-gray-50 dark:bg-gris-700 whitespace-nowrap">{l}</th>)}
          </tr>
        </thead>
        <tbody>
          {claves.map(({ key, label }) => (
            <tr key={key} className="odd:bg-white even:bg-gray-50 dark:odd:bg-gris-900 dark:even:bg-gris-800">
              <th className="border px-2 py-1 bg-gray-100 dark:bg-gris-700 font-medium text-left">{label}</th>
              {base[key].map((v, i) => (
                <td key={i} className="border px-1 py-1">
                  <input
                    type="number"
                    defaultValue={v}
                    key={`${key}-${i}-${v}`}
                    onBlur={e => handleChange(key, i, parseInt(e.target.value) || 0)}
                    className="w-24 border rounded px-1 py-0.5 text-right text-xs bg-white dark:bg-gris-800 dark:text-white dark:border-gris-600"
                  />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Lista extras editable ────────────────────────────────────────────────────

function ListaExtrasEditable({ extras = [], onChange, confirm: confirmFn }) {
  const [nuevoNombre, setNuevoNombre] = useState('');
  const [nuevoPrecio, setNuevoPrecio] = useState('');
  return (
    <div>
      <div className="overflow-x-auto mb-2">
        <table className="text-xs w-full border dark:border-gris-700">
          <thead className="bg-gray-50 dark:bg-gris-800">
            <tr>
              <th className="border px-2 py-1 text-left dark:bg-gris-700">Nombre</th>
              <th className="border px-2 py-1 dark:bg-gris-700">Precio</th>
              <th className="border px-2 py-1 dark:bg-gris-700">Dist.</th>
              <th className="border px-2 py-1 dark:bg-gris-700">Cliente</th>
              <th className="border px-2 py-1 dark:bg-gris-700"></th>
            </tr>
          </thead>
          <tbody>
            {extras.length === 0 && (
              <tr><td colSpan={5} className="text-center py-2 text-gray-400">Sin extras</td></tr>
            )}
            {extras.map((e, i) => (
              <tr key={i} className="odd:bg-white even:bg-gray-50 dark:odd:bg-gris-900 dark:even:bg-gris-800">
                <td className="border px-1 py-1">
                  <input defaultValue={e.nombre} key={e.nombre}
                    className="w-full border rounded px-1 py-0.5 bg-white dark:bg-gris-800 dark:text-white dark:border-gris-600"
                    onBlur={ev => { const copia = [...extras]; copia[i] = { ...copia[i], nombre: ev.target.value }; onChange(copia); }} />
                </td>
                <td className="border px-1 py-1">
                  <input type="number" defaultValue={e.precio || ''} key={`p-${i}-${e.precio}`}
                    className="w-24 border rounded px-1 py-0.5 text-right bg-white dark:bg-gris-800 dark:text-white dark:border-gris-600"
                    onBlur={ev => { const copia = [...extras]; copia[i] = { ...copia[i], precio: parseInt(ev.target.value) || 0 }; onChange(copia); }} />
                </td>
                <td className="border px-1 py-1">
                  <input type="number" defaultValue={e.precioDistribuidor || ''} key={`d-${i}`}
                    className="w-24 border rounded px-1 py-0.5 text-right bg-white dark:bg-gris-800 dark:text-white dark:border-gris-600"
                    onBlur={ev => { const v = parseInt(ev.target.value) || undefined; const copia = [...extras]; copia[i] = { ...copia[i], precioDistribuidor: v }; onChange(copia); }} />
                </td>
                <td className="border px-1 py-1">
                  <input type="number" defaultValue={e.precioCliente || ''} key={`c-${i}`}
                    className="w-24 border rounded px-1 py-0.5 text-right bg-white dark:bg-gris-800 dark:text-white dark:border-gris-600"
                    onBlur={ev => { const v = parseInt(ev.target.value) || undefined; const copia = [...extras]; copia[i] = { ...copia[i], precioCliente: v }; onChange(copia); }} />
                </td>
                <td className="border px-1 py-1 text-center">
                  <button onClick={async () => { if (await confirmFn('¿Eliminar este extra?')) { const copia = [...extras]; copia.splice(i, 1); onChange(copia); } }}
                    className="text-red-500 hover:text-red-400 text-xs px-1">✕</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex flex-wrap gap-2 items-end">
        <div className="flex flex-col gap-0.5">
          <label className="text-[10px] text-gray-500 dark:text-gray-400">Nombre</label>
          <input value={nuevoNombre} onChange={e => setNuevoNombre(e.target.value)}
            className="border rounded px-2 py-1 text-xs dark:bg-gris-800 dark:text-white dark:border-gris-600" />
        </div>
        <div className="flex flex-col gap-0.5">
          <label className="text-[10px] text-gray-500 dark:text-gray-400">Precio</label>
          <input type="number" value={nuevoPrecio} onChange={e => setNuevoPrecio(e.target.value)}
            className="border rounded px-2 py-1 text-xs w-28 dark:bg-gris-800 dark:text-white dark:border-gris-600" />
        </div>
        <button onClick={() => {
          if (!nuevoNombre) return;
          onChange([...extras, { nombre: nuevoNombre, precio: parseInt(nuevoPrecio) || 0 }]);
          setNuevoNombre(''); setNuevoPrecio('');
        }} className="bg-green-600 hover:bg-green-500 text-white px-3 py-1 rounded text-xs">+ Añadir</button>
      </div>
    </div>
  );
}

// ─── Lista extras sólo lectura ────────────────────────────────────────────────

function ListaExtrasReadOnly({ extras }) {
  if (!extras || !extras.length) return <p className="text-xs text-gray-400 italic">Sin extras</p>;
  return (
    <ul className="space-y-1">
      {extras.map((e, i) => (
        <li key={i} className="text-xs flex flex-wrap gap-2">
          <span className="font-medium text-gray-800 dark:text-white">{e.nombre}</span>
          {e.precio > 0 && <span className="text-gray-600 dark:text-gray-300">$ {formatCOP(e.precio)}</span>}
          {e.precioDistribuidor > 0 && <span className="text-gray-500 dark:text-gray-400">Dist: $ {formatCOP(e.precioDistribuidor)}</span>}
          {e.precioCliente > 0 && <span className="text-gray-500 dark:text-gray-400">Cliente: $ {formatCOP(e.precioCliente)}</span>}
        </li>
      ))}
    </ul>
  );
}

// ─── Galería de fotos (vista pública) ────────────────────────────────────────

function GaleriaFotos({ fotos }) {
  const [idx, setIdx] = useState(0);
  if (!fotos || fotos.length === 0) {
    return (
      <div className="w-full h-48 bg-gray-100 dark:bg-gris-800 flex items-center justify-center rounded-t-lg">
        <span className="text-4xl opacity-30">📦</span>
      </div>
    );
  }
  const urls = fotos;
  return (
    <div className="relative w-full h-48 bg-black rounded-t-lg overflow-hidden">
      <img src={urls[idx]} alt="" className="w-full h-full object-contain" />
      {urls.length > 1 && (
        <>
          <button onClick={e => { e.stopPropagation(); setIdx((idx - 1 + urls.length) % urls.length); }}
            className="absolute left-1 top-1/2 -translate-y-1/2 bg-black/50 text-white rounded-full w-7 h-7 flex items-center justify-center text-sm hover:bg-black/80">‹</button>
          <button onClick={e => { e.stopPropagation(); setIdx((idx + 1) % urls.length); }}
            className="absolute right-1 top-1/2 -translate-y-1/2 bg-black/50 text-white rounded-full w-7 h-7 flex items-center justify-center text-sm hover:bg-black/80">›</button>
          <div className="absolute bottom-1 left-0 right-0 flex justify-center gap-1">
            {urls.map((_, i) => (
              <button key={i} onClick={e => { e.stopPropagation(); setIdx(i); }}
                className={`w-1.5 h-1.5 rounded-full ${i === idx ? 'bg-white' : 'bg-white/50'}`} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ─── Editor de fotos (admin) ──────────────────────────────────────────────────

function EditorFotos({ fotos, productoId, onChange, confirm: confirmFn }) {
  const inputRef = useRef();
  const [subiendo, setSubiendo] = useState(false);
  const [urlManual, setUrlManual] = useState('');

  const handleFiles = async (files) => {
    setSubiendo(true);
    try {
      const nuevas = [];
      for (const file of Array.from(files)) {
        if (!file.type.startsWith('image/')) continue;
        const url = await subirFotoProducto(productoId, file);
        nuevas.push(url);
      }
      onChange([...fotos, ...nuevas]);
      toast.success(`${nuevas.length} foto(s) subida(s)`);
    } catch (e) {
      console.error(e);
      toast.error(e.message || 'Error subiendo fotos');
    } finally {
      setSubiendo(false);
    }
  };

  const handleEliminar = async (i) => {
    if (!await confirmFn('¿Quitar esta foto del producto?')) return;
    const nuevas = [...fotos];
    nuevas.splice(i, 1);
    onChange(nuevas);
  };

  const handleAgregarUrl = () => {
    const url = urlManual.trim();
    if (!url) return;
    onChange([...fotos, url]);
    setUrlManual('');
  };

  return (
    <div className="space-y-4">
      {/* Fotos actuales */}
      {fotos.length > 0 && (
        <div className="flex flex-wrap gap-3">
          {fotos.map((url, i) => (
            <div key={i} className="relative group">
              <img src={url} alt="" className="w-24 h-24 object-cover rounded border dark:border-gris-600" />
              <button onClick={() => handleEliminar(i)}
                className="absolute top-0.5 right-0.5 bg-red-600 text-white rounded-full w-5 h-5 text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">✕</button>
            </div>
          ))}
        </div>
      )}

      {/* Subir archivo */}
      <div
        onDragOver={e => e.preventDefault()}
        onDrop={e => { e.preventDefault(); handleFiles(e.dataTransfer.files); }}
        onClick={() => inputRef.current?.click()}
        className="border-2 border-dashed border-gray-300 dark:border-gris-600 rounded-lg p-5 text-center cursor-pointer hover:border-indigo-400 transition-colors"
      >
        {subiendo
          ? <span className="text-sm text-gray-500">Subiendo a Cloudinary...</span>
          : <span className="text-sm text-gray-500 dark:text-gray-400">Arrastra imágenes aquí o haz clic para seleccionar</span>
        }
        <input ref={inputRef} type="file" accept="image/*" multiple className="hidden"
          onChange={e => handleFiles(e.target.files)} />
      </div>

      {/* Agregar por URL */}
      <div className="flex gap-2 items-center">
        <input
          value={urlManual}
          onChange={e => setUrlManual(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleAgregarUrl()}
          placeholder="O pega una URL de imagen..."
          className="flex-1 border rounded px-3 py-2 text-sm dark:bg-gris-800 dark:border-gris-600 dark:text-white"
        />
        <button onClick={handleAgregarUrl}
          className="bg-gray-600 hover:bg-gray-500 text-white px-3 py-2 rounded text-sm">
          Agregar URL
        </button>
      </div>
    </div>
  );
}

// ─── Panel de edición admin (modal) ──────────────────────────────────────────

function PanelEdicion({ producto, onClose, onGuardado, confirm: confirmFn }) {
  const [fotos, setFotos] = useState(producto.fotos || []);
  const [descripcion, setDescripcion] = useState(producto.descripcionGeneral || '');
  const [specs, setSpecs] = useState(producto.especificacionesHTML || '');
  const [condiciones, setCondiciones] = useState(producto.condicionesComerciales || '');
  const [extras, setExtras] = useState(producto.extras || []);
  const [guardando, setGuardando] = useState(false);

  // Estado editable para precio/matriz según tipo
  const [matriz, setMatriz] = useState(producto.matriz ? { ...producto.matriz, base: producto.matriz.base.map(r => [...r]) } : null);
  const [matrizComponentes, setMatrizComponentes] = useState(producto.matrizComponentes || null);
  const [variantes, setVariantes] = useState(producto.variantes || []);
  const [precioFijo, setPrecioFijo] = useState(producto.precioFijo || '');
  const [precioPorM2Con, setPrecioPorM2Con] = useState(producto.precioPorM2ConInstalacion || '');
  const [precioPorM2Sin, setPrecioPorM2Sin] = useState(producto.precioPorM2SinInstalacion || '');

  const handleCellChange = useCallback((i, j, val) => {
    setMatriz(prev => {
      const base = prev.base.map((r, ri) => ri === i ? r.map((c, ci) => ci === j ? val : c) : [...r]);
      return { ...prev, base };
    });
  }, []);

  const handleApplyPercent = useCallback((pct) => {
    setMatriz(prev => {
      const factor = 1 + pct / 100;
      const base = prev.base.map(r => r.map(v => Math.round(v * factor / 5000) * 5000));
      return { ...prev, base };
    });
  }, []);

  const handleGuardar = async () => {
    setGuardando(true);
    try {
      const data = {
        fotos,
        descripcionGeneral: descripcion,
        especificacionesHTML: specs,
        condicionesComerciales: condiciones,
        extras,
      };
      if (matriz) data.matriz = matriz;
      if (matrizComponentes) data.matrizComponentes = matrizComponentes;
      if (variantes.length) data.variantes = variantes;
      if (precioFijo !== '') data.precioFijo = parseInt(precioFijo) || 0;
      if (precioPorM2Con !== '') data.precioPorM2ConInstalacion = parseInt(precioPorM2Con) || 0;
      if (precioPorM2Sin !== '') data.precioPorM2SinInstalacion = parseInt(precioPorM2Sin) || 0;
      await guardarProducto(producto.id, data);
      toast.success('Producto guardado');
      await onGuardado();
      onClose();
    } catch (e) {
      console.error(e);
      toast.error('Error guardando producto');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative ml-auto w-full max-w-3xl h-full bg-white dark:bg-gris-900 shadow-xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b dark:border-gris-700 bg-gray-50 dark:bg-gris-800 flex-shrink-0">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">Editar: {producto.nombre}</h2>
          <div className="flex gap-2">
            <button onClick={handleGuardar} disabled={guardando}
              className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white px-4 py-2 rounded text-sm font-medium">
              {guardando ? 'Guardando...' : 'Guardar'}
            </button>
            <button onClick={onClose} className="bg-gray-200 dark:bg-gris-700 hover:bg-gray-300 dark:hover:bg-gris-600 text-gray-700 dark:text-gray-200 px-3 py-2 rounded text-sm">✕</button>
          </div>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-8">

          {/* Fotos */}
          <section>
            <h3 className="text-sm font-semibold mb-3 text-gray-700 dark:text-gray-200 uppercase tracking-wide">Fotos</h3>
            <EditorFotos fotos={fotos} productoId={producto.id} onChange={setFotos} confirm={confirmFn} />
          </section>

          {/* Descripción */}
          <section>
            <h3 className="text-sm font-semibold mb-2 text-gray-700 dark:text-gray-200 uppercase tracking-wide">Descripción general</h3>
            <textarea value={descripcion} onChange={e => setDescripcion(e.target.value)} rows={4}
              className="w-full border rounded p-3 text-sm dark:bg-gris-800 dark:border-gris-600 dark:text-white resize-y" />
          </section>

          {/* Especificaciones */}
          <section>
            <h3 className="text-sm font-semibold mb-2 text-gray-700 dark:text-gray-200 uppercase tracking-wide">Especificaciones técnicas</h3>
            <RichTextEditor value={specs} onChange={setSpecs} />
          </section>

          {/* Condiciones comerciales */}
          <section>
            <h3 className="text-sm font-semibold mb-2 text-gray-700 dark:text-gray-200 uppercase tracking-wide">Condiciones comerciales</h3>
            <p className="text-xs text-gray-400 mb-2">Condiciones específicas de este producto (entrega, garantía, forma de pago, etc.).</p>
            <RichTextEditor value={condiciones} onChange={setCondiciones} />
          </section>

          {/* Precios según tipo */}
          {producto.tipoCalculo === 'matriz' && matriz && (
            <section>
              <h3 className="text-sm font-semibold mb-3 text-gray-700 dark:text-gray-200 uppercase tracking-wide">Matriz de precios</h3>
              <TablaMatrizEditable
                matriz={matriz.base}
                anchoRanges={matriz.anchoRanges}
                altoRanges={matriz.altoRanges}
                onCellChange={handleCellChange}
                onApplyPercent={handleApplyPercent}
              />
              {producto.matrizPanamericana && (
                <div className="mt-6">
                  <h4 className="text-xs font-semibold mb-2 text-gray-500 dark:text-gray-400 uppercase">Matriz Carrocerías Panamericana</h4>
                  <TablaMatrizReadOnly
                    matriz={producto.matrizPanamericana.base}
                    anchoRanges={producto.matrizPanamericana.anchoRanges}
                    altoRanges={producto.matrizPanamericana.altoRanges}
                  />
                  <p className="text-xs text-gray-400 mt-1">La edición de esta matriz estará disponible próximamente.</p>
                </div>
              )}
            </section>
          )}

          {producto.tipoCalculo === 'componentes' && matrizComponentes && (
            <section>
              <h3 className="text-sm font-semibold mb-3 text-gray-700 dark:text-gray-200 uppercase tracking-wide">Precios por componente</h3>
              <TablaSelloAndenEditable datos={matrizComponentes} onChange={setMatrizComponentes} />
            </section>
          )}

          {producto.tipoCalculo === 'especial' && variantes.length > 0 && (
            <section>
              <h3 className="text-sm font-semibold mb-3 text-gray-700 dark:text-gray-200 uppercase tracking-wide">Variantes y precios</h3>
              <div className="space-y-2">
                {variantes.map((v, i) => (
                  <div key={v.id} className="flex gap-3 items-start">
                    <span className="text-xs text-gray-600 dark:text-gray-300 flex-1 pt-2">{v.nombre}</span>
                    <div className="flex flex-col gap-0.5">
                      <label className="text-[10px] text-gray-400">Precio</label>
                      <input type="number" defaultValue={v.precio} key={`${v.id}-${v.precio}`}
                        className="border rounded px-2 py-1 text-xs w-32 text-right dark:bg-gris-800 dark:border-gris-600 dark:text-white"
                        onBlur={e => { const copia = [...variantes]; copia[i] = { ...copia[i], precio: parseInt(e.target.value) || 0 }; setVariantes(copia); }} />
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {producto.tipoCalculo === 'especial' && producto.precioFijo !== undefined && (
            <section>
              <h3 className="text-sm font-semibold mb-2 text-gray-700 dark:text-gray-200 uppercase tracking-wide">Precio fijo</h3>
              <input type="number" value={precioFijo} onChange={e => setPrecioFijo(e.target.value)}
                className="border rounded px-3 py-2 text-sm w-48 dark:bg-gris-800 dark:border-gris-600 dark:text-white" />
            </section>
          )}

          {producto.precioPorM2ConInstalacion !== undefined && (
            <section>
              <h3 className="text-sm font-semibold mb-2 text-gray-700 dark:text-gray-200 uppercase tracking-wide">Precio por m²</h3>
              <div className="flex gap-4 flex-wrap">
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-gray-500">Con instalación ($/m²)</label>
                  <input type="number" value={precioPorM2Con} onChange={e => setPrecioPorM2Con(e.target.value)}
                    className="border rounded px-3 py-2 text-sm w-40 dark:bg-gris-800 dark:border-gris-600 dark:text-white" />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-gray-500">Sin instalación ($/m²)</label>
                  <input type="number" value={precioPorM2Sin} onChange={e => setPrecioPorM2Sin(e.target.value)}
                    className="border rounded px-3 py-2 text-sm w-40 dark:bg-gris-800 dark:border-gris-600 dark:text-white" />
                </div>
              </div>
            </section>
          )}

          {/* Extras */}
          <section>
            <h3 className="text-sm font-semibold mb-3 text-gray-700 dark:text-gray-200 uppercase tracking-wide">Extras</h3>
            <ListaExtrasEditable extras={extras} onChange={setExtras} confirm={confirmFn} />
          </section>
        </div>
      </div>
    </div>
  );
}

// ─── Ficha popup de producto (solo lectura) ───────────────────────────────────

const TABS = ['Descripción', 'Especificaciones', 'Precios', 'Extras', 'Condiciones'];

function FichaProducto({ producto, onClose }) {
  const [tab, setTab] = useState('Descripción');

  const chipColor = {
    'matriz': 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300',
    'componentes': 'bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-300',
    'especial': 'bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300',
  }[producto.tipoCalculo] || '';
  const chipLabel = { 'matriz': 'Matriz', 'componentes': 'Componentes', 'especial': 'Especial' }[producto.tipoCalculo] || '';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white dark:bg-gris-900 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-start justify-between px-6 py-4 border-b dark:border-gris-700 bg-gray-50 dark:bg-gris-800 flex-shrink-0">
          <div className="flex-1 min-w-0 pr-4">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white leading-snug">{producto.nombre}</h2>
              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0 ${chipColor}`}>{chipLabel}</span>
            </div>
          </div>
          <button onClick={onClose}
            className="bg-gray-200 dark:bg-gris-700 hover:bg-gray-300 dark:hover:bg-gris-600 text-gray-700 dark:text-gray-200 w-8 h-8 rounded-full flex items-center justify-center text-sm shrink-0">
            ✕
          </button>
        </div>

        {/* Galería */}
        {producto.fotos?.length > 0 && (
          <div className="flex-shrink-0 h-56 bg-black">
            <GaleriaFotos fotos={producto.fotos} />
          </div>
        )}

        {/* Tabs */}
        <div className="flex border-b dark:border-gris-700 overflow-x-auto flex-shrink-0 bg-white dark:bg-gris-900">
          {TABS.map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-4 py-2.5 text-xs font-medium whitespace-nowrap border-b-2 transition-colors ${tab === t
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}>
              {t}
            </button>
          ))}
        </div>

        {/* Contenido */}
        <div className="flex-1 overflow-y-auto p-6">
          {tab === 'Descripción' && (
            <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
              {producto.descripcionGeneral || 'Sin descripción.'}
            </p>
          )}
          {tab === 'Especificaciones' && (
            <div
              className="prose prose-sm dark:prose-invert max-w-none text-xs"
              dangerouslySetInnerHTML={{ __html: producto.especificacionesHTML || '<p>Sin especificaciones.</p>' }}
            />
          )}
          {tab === 'Precios' && (
            <div className="space-y-4">
              {producto.tipoCalculo === 'matriz' && producto.matriz && (
                <TablaMatrizReadOnly
                  matriz={producto.matriz.base}
                  anchoRanges={producto.matriz.anchoRanges}
                  altoRanges={producto.matriz.altoRanges}
                />
              )}
              {producto.tipoCalculo === 'componentes' && producto.matrizComponentes && (
                <TablaSelloAndenReadOnly datos={producto.matrizComponentes} />
              )}
              {producto.tipoCalculo === 'especial' && producto.variantes?.length > 0 && (
                <table className="text-xs w-full border dark:border-gris-700">
                  <thead><tr className="bg-gray-50 dark:bg-gris-800">
                    <th className="border px-2 py-1 text-left dark:bg-gris-700">Variante</th>
                    <th className="border px-2 py-1 dark:bg-gris-700">Precio</th>
                  </tr></thead>
                  <tbody>
                    {producto.variantes.map((v, i) => (
                      <tr key={i} className="odd:bg-white even:bg-gray-50 dark:odd:bg-gris-900 dark:even:bg-gris-800">
                        <td className="border px-2 py-1 dark:border-gris-700">{v.nombre}</td>
                        <td className="border px-2 py-1 text-right tabular-nums dark:border-gris-700">$ {formatCOP(v.precio)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
              {producto.tipoCalculo === 'especial' && producto.precioFijo !== undefined && !producto.variantes?.length && (
                <p className="text-sm font-semibold">$ {formatCOP(producto.precioFijo)}</p>
              )}
              {producto.precioPorM2ConInstalacion !== undefined && (
                <div className="space-y-1 text-xs">
                  <p><span className="font-medium">Con instalación:</span> $ {formatCOP(producto.precioPorM2ConInstalacion)} / m²</p>
                  <p><span className="font-medium">Sin instalación:</span> $ {formatCOP(producto.precioPorM2SinInstalacion)} / m²</p>
                </div>
              )}
            </div>
          )}
          {tab === 'Extras' && <ListaExtrasReadOnly extras={producto.extras} />}
          {tab === 'Condiciones' && (
            producto.condicionesComerciales
              ? <div className="prose prose-sm dark:prose-invert max-w-none text-xs" dangerouslySetInnerHTML={{ __html: producto.condicionesComerciales }} />
              : <p className="text-xs text-gray-400 italic">Sin condiciones comerciales registradas.</p>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Card de producto ─────────────────────────────────────────────────────────

function ProductCard({ producto, isAdmin, onEditar, onVerDetalle }) {
  const chipColor = {
    'matriz': 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300',
    'componentes': 'bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-300',
    'especial': 'bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300',
  }[producto.tipoCalculo] || '';

  const chipLabel = { 'matriz': 'Matriz', 'componentes': 'Componentes', 'especial': 'Especial' }[producto.tipoCalculo] || '';

  return (
    <div className="bg-white dark:bg-gris-800 border border-gray-200 dark:border-gris-700 rounded-xl shadow-sm overflow-hidden flex flex-col">
      {/* Foto */}
      <GaleriaFotos fotos={producto.fotos} />

      {/* Info principal */}
      <div className="p-4 flex-1 flex flex-col">
        <div className="flex items-start justify-between gap-2 mb-2">
          <h3 className="font-bold text-gray-900 dark:text-white text-base leading-snug">{producto.nombre}</h3>
          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0 ${chipColor}`}>{chipLabel}</span>
        </div>

        {producto.descripcionGeneral && (
          <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed line-clamp-3 mb-3">
            {producto.descripcionGeneral}
          </p>
        )}

        <div className="mt-auto flex gap-2 pt-2">
          <button onClick={() => onVerDetalle(producto)}
            className="flex-1 text-sm py-2 rounded-lg border border-gray-300 dark:border-gris-600 hover:bg-gray-50 dark:hover:bg-gris-700 text-gray-700 dark:text-gray-200 transition-colors">
            Ver detalle
          </button>
          {isAdmin && (
            <button onClick={() => onEditar(producto)}
              className="px-3 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium">
              Editar
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Página principal ─────────────────────────────────────────────────────────

export default function ProductsPage() {
  const navigate = useNavigate();
  const { productosDB, productosLoading, recargarProductos, confirm } = useQuote();
  const { isMainAdmin, hasRole } = useAuth();
  const esAdmin = isMainAdmin || hasRole('admin');

  const [filtro, setFiltro] = useState('');
  const [productoEditando, setProductoEditando] = useState(null);
  const [fichaProducto, setFichaProducto] = useState(null);
  const [sembrando, setSembrando] = useState(false);
  const [migrandoCondiciones, setMigrandoCondiciones] = useState(false);
  const [modalTerminos, setModalTerminos] = useState(false);
  const [terminosHTML, setTerminosHTML] = useState('');
  const [guardandoTerminos, setGuardandoTerminos] = useState(false);

  useEffect(() => {
    if (!esAdmin) return;
    cargarTerminos().then(html => {
      setTerminosHTML(html || generarTerminosGeneralesHTML());
    });
  }, [esAdmin]);

  const filtrados = productosDB.filter(p =>
    p.activo !== false && p.nombre.toLowerCase().includes(filtro.toLowerCase())
  );

  const handleMigrarCondiciones = async () => {
    if (!await confirm('¿Actualizar las condiciones comerciales en todos los productos de Firestore?')) return;
    setMigrandoCondiciones(true);
    try {
      await migrarCondicionesComerciales();
      toast.success('Condiciones comerciales actualizadas');
      await recargarProductos();
    } catch (e) {
      console.error(e);
      toast.error('Error: ' + e.message);
    } finally {
      setMigrandoCondiciones(false);
    }
  };

  const handleGuardarTerminos = async () => {
    setGuardandoTerminos(true);
    try {
      await guardarTerminos(terminosHTML);
      toast.success('Términos guardados');
      setModalTerminos(false);
    } catch (e) {
      toast.error('Error al guardar: ' + e.message);
    } finally {
      setGuardandoTerminos(false);
    }
  };

  const handleSembrar = async () => {
    if (!await confirm('¿Migrar los datos del catálogo hardcodeado a Firestore? Esto crea los 10 productos con sus precios y extras.')) return;
    setSembrando(true);
    try {
      await sembrarProductos();
      toast.success('Catálogo migrado correctamente');
      await recargarProductos();
    } catch (e) {
      console.error(e);
      toast.error('Error al migrar: ' + e.message);
    } finally {
      setSembrando(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6 items-start sm:items-center">
        <button onClick={() => navigate('/cotizar')}
          className="bg-gray-600 hover:bg-gray-500 text-white px-4 py-2 rounded text-sm shrink-0">
          ← Volver
        </button>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-trafico flex-1">Catálogo de Productos</h1>
        {esAdmin && !productosLoading && productosDB.length === 0 && (
          <button onClick={handleSembrar} disabled={sembrando}
            className="bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white px-4 py-2 rounded text-sm font-medium">
            {sembrando ? 'Migrando...' : 'Migrar datos iniciales'}
          </button>
        )}
        {esAdmin && !productosLoading && productosDB.length > 0 && (
          <button onClick={handleMigrarCondiciones} disabled={migrandoCondiciones}
            className="bg-teal-600 hover:bg-teal-500 disabled:opacity-50 text-white px-4 py-2 rounded text-sm font-medium">
            {migrandoCondiciones ? 'Actualizando...' : 'Migrar condiciones'}
          </button>
        )}
        {esAdmin && (
          <button onClick={() => setModalTerminos(true)}
            className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded text-sm font-medium">
            Términos y condiciones
          </button>
        )}
      </div>

      {/* Buscador */}
      <div className="mb-6">
        <input
          placeholder="Buscar producto..."
          value={filtro}
          onChange={e => setFiltro(e.target.value)}
          className="border rounded-lg px-4 py-2.5 text-sm w-full max-w-sm dark:bg-gris-800 dark:border-gris-600 dark:text-white"
        />
      </div>

      {/* Estado de carga */}
      {productosLoading && (
        <div className="text-center py-16 text-gray-400">
          <div className="text-3xl mb-2">⏳</div>
          <p className="text-sm">Cargando catálogo...</p>
        </div>
      )}

      {/* Sin productos migrados */}
      {!productosLoading && productosDB.length === 0 && (
        <div className="text-center py-16 border-2 border-dashed border-gray-200 dark:border-gris-700 rounded-xl">
          <div className="text-4xl mb-3">📦</div>
          <h2 className="text-lg font-semibold text-gray-700 dark:text-gray-200 mb-1">Catálogo vacío</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
            {esAdmin
              ? 'Usa el botón "Migrar datos iniciales" para cargar el catálogo de productos a la base de datos.'
              : 'El catálogo aún no ha sido configurado. Contacta al administrador.'}
          </p>
        </div>
      )}

      {/* Grid de cards */}
      {!productosLoading && filtrados.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filtrados.map(producto => (
            <ProductCard
              key={producto.id}
              producto={producto}
              isAdmin={esAdmin}
              onEditar={setProductoEditando}
              onVerDetalle={setFichaProducto}
            />
          ))}
        </div>
      )}

      {/* Sin resultados de búsqueda */}
      {!productosLoading && productosDB.length > 0 && filtrados.length === 0 && (
        <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-8">
          Sin coincidencias para "{filtro}"
        </p>
      )}

      {/* Ficha popup de producto */}
      {fichaProducto && (
        <FichaProducto producto={fichaProducto} onClose={() => setFichaProducto(null)} />
      )}

      {/* Panel de edición admin */}
      {productoEditando && (
        <PanelEdicion
          producto={productoEditando}
          onClose={() => setProductoEditando(null)}
          onGuardado={recargarProductos}
          confirm={confirm}
        />
      )}

      {/* Modal: Términos y condiciones generales */}
      {modalTerminos && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 overflow-y-auto py-8 px-4">
          <div className="bg-white dark:bg-gris-900 rounded-xl shadow-2xl w-full max-w-3xl flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b dark:border-gris-700">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">Términos y Condiciones Generales</h2>
              <button onClick={() => setModalTerminos(false)} className="text-gray-400 hover:text-gray-700 dark:hover:text-white text-xl font-bold">✕</button>
            </div>
            <div className="p-6 flex-1 min-h-0">
              <p className="text-xs text-gray-400 mb-3">Este texto se incluye en todas las propuestas. Puedes personalizarlo con formato enriquecido.</p>
              <RichTextEditor value={terminosHTML} onChange={setTerminosHTML} />
            </div>
            <div className="px-6 py-4 border-t dark:border-gris-700 flex justify-end gap-3">
              <button onClick={() => setModalTerminos(false)}
                className="px-4 py-2 rounded border border-gray-300 dark:border-gris-600 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gris-800">
                Cancelar
              </button>
              <button onClick={handleGuardarTerminos} disabled={guardandoTerminos}
                className="px-5 py-2 rounded bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm font-medium">
                {guardandoTerminos ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
