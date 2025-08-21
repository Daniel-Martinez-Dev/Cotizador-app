import React, { useEffect, useState, useCallback } from "react";
import { collection, getDocs, deleteDoc, doc, updateDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase";
import { useNavigate } from "react-router-dom";
import { useQuote } from "../context/QuoteContext";
import { FaSortUp, FaSortDown, FaEdit, FaTrash, FaEye, FaRegCommentDots } from "react-icons/fa";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

export default function HistorialPage() {
  const [cotizaciones, setCotizaciones] = useState([]);
  const [clientesUnicos, setClientesUnicos] = useState([]);
  const [productosUnicos, setProductosUnicos] = useState([]);

  const [filtroCliente, setFiltroCliente] = useState("");
  const [filtroNumero, setFiltroNumero] = useState("");
  const [filtroProducto, setFiltroProducto] = useState("");
  const [filtroEstado, setFiltroEstado] = useState("");
  const [rangoFecha, setRangoFecha] = useState([null, null]);
  const [ordenarPor, setOrdenarPor] = useState("fecha"); // "numero" | "fecha" | "total"
  const [ordenAscendente, setOrdenAscendente] = useState(false);
  const [paginaActual, setPaginaActual] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const estados = [
    "COTIZACIÓN ENVIADA",
    "SEGUIMIENTO 1",
    "SEGUIMIENTO 2",
    "NEGOCIACIÓN",
    "APROBADA / PEND. PAGO",
    "VENDIDA",
    "CANCELADA"
  ];

  const [startDate, endDate] = rangoFecha;
  const navigate = useNavigate();
  const { setQuoteData, confirm } = useQuote();

  // Fetch inicial
  useEffect(() => {
    (async () => {
      const snap = await getDocs(collection(db, "cotizaciones"));
      const datos = snap.docs.map(d => {
        const data = d.data();
        return {
          id: d.id,
            ...data,
          estadoSeguimiento: data.estadoSeguimiento || "COTIZACIÓN ENVIADA",
          estadoFecha: data.estadoFecha || data.estadoCambio || data.timestamp || null
        };
      });
      setCotizaciones(datos);
      setClientesUnicos([...new Set(datos.map(c => c.nombreCliente || c.cliente).filter(Boolean))].sort());
      setProductosUnicos([
        ...new Set(
          datos
            .map(c => c.productos?.[0])
            .filter(Boolean)
            .map(p => p.nombrePersonalizado || p.tipo || "")
            .filter(Boolean)
        )
      ].sort());
    })();
  }, []);

  // Helpers
  const iconoOrden = useCallback(
    campo => {
      if (ordenarPor !== campo) return null;
      return ordenAscendente ? (
        <FaSortUp className="inline ml-1" />
      ) : (
        <FaSortDown className="inline ml-1" />
      );
    },
    [ordenarPor, ordenAscendente]
  );

  const claseEstado = estado => {
    // En modo claro mantiene pasteles; en oscuro usa fondos oscuros tintados + alto contraste
    switch (estado) {
      case "COTIZACIÓN ENVIADA":
        return "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 dark:ring-1 dark:ring-blue-500/50";
      case "SEGUIMIENTO 1":
        return "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300 dark:ring-1 dark:ring-indigo-500/50";
      case "SEGUIMIENTO 2":
        return "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300 dark:ring-1 dark:ring-purple-500/50";
      case "NEGOCIACIÓN":
        return "bg-yellow-100 text-yellow-700 dark:bg-trafico/25 dark:text-trafico dark:ring-1 dark:ring-trafico/60";
      case "APROBADA / PEND. PAGO":
        return "bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300 dark:ring-1 dark:ring-teal-500/50";
      case "VENDIDA":
        return "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300 dark:ring-1 dark:ring-green-500/50";
      case "CANCELADA":
        return "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300 dark:ring-1 dark:ring-red-500/50";
      default:
        return "bg-gray-100 text-gray-700 dark:bg-gris-800 dark:text-gray-300 dark:ring-1 dark:ring-gray-500/40";
    }
  };

  // Filtro
  const filtradas = cotizaciones.filter(c => {
    const nombreCliente = c.nombreCliente || c.cliente || "";
    const primerProd = c.productos?.[0];
    const nombreProducto = primerProd ? (primerProd.nombrePersonalizado || primerProd.tipo || "") : "";
    const coincideCliente = filtroCliente ? nombreCliente === filtroCliente : true;
    const coincideProducto = filtroProducto ? nombreProducto === filtroProducto : true;
    const coincideEstado = filtroEstado ? c.estadoSeguimiento === filtroEstado : true;

    // Filtro número: si el input son solo dígitos -> coincidencia exacta; si no, substring
    let coincideNumero = true;
    if (filtroNumero) {
      const valor = c.numero?.toString() || "";
      if (/^\d+$/.test(filtroNumero.trim())) {
        coincideNumero = valor === filtroNumero.trim();
      } else {
        coincideNumero = valor.toLowerCase().includes(filtroNumero.toLowerCase());
      }
    }

    // Filtro fecha: normalizamos a día para evitar duplicados por hora y permitir un solo extremo
    let coincideFecha = true;
    if (startDate || endDate) {
      const ts = c.timestamp?.toDate?.();
      if (!ts) {
        coincideFecha = false; // si no hay fecha y se aplica filtro, excluimos
      } else {
        const dia = new Date(ts.getFullYear(), ts.getMonth(), ts.getDate()).getTime();
        const min = startDate ? new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate()).getTime() : -Infinity;
        const max = endDate ? new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate()).getTime() : Infinity;
        coincideFecha = dia >= min && dia <= max;
      }
    }

    return coincideCliente && coincideProducto && coincideEstado && coincideNumero && coincideFecha;
  });

  // Orden
  const ordenadas = [...filtradas].sort((a, b) => {
    let aVal, bVal;
    if (ordenarPor === "numero") {
      aVal = a.numero || 0;
      bVal = b.numero || 0;
    } else if (ordenarPor === "total") {
      aVal = a.total || 0;
      bVal = b.total || 0;
    } else { // fecha
      aVal = a.timestamp?.toDate?.() || 0;
      bVal = b.timestamp?.toDate?.() || 0;
    }
    if (aVal === bVal) return 0;
    if (ordenAscendente) return aVal > bVal ? 1 : -1;
    return aVal < bVal ? 1 : -1;
  });

  // Paginación
  const totalRegistros = ordenadas.length;
  const totalPaginas = Math.max(1, Math.ceil(totalRegistros / pageSize));
  const inicio = (paginaActual - 1) * pageSize;
  const fin = inicio + pageSize;
  const paginaDatos = ordenadas.slice(inicio, fin);

  // Reset página ante cambios
  useEffect(() => {
    setPaginaActual(1);
  }, [filtroCliente, filtroNumero, filtroProducto, filtroEstado, startDate, endDate, ordenarPor, ordenAscendente, pageSize]);
  // Ajustar si la página supera
  useEffect(() => {
    if (paginaActual > totalPaginas) setPaginaActual(totalPaginas);
  }, [totalPaginas, paginaActual]);

  // Acciones
  const manejarVer = cot => {
    setQuoteData(cot);
    navigate("/preview");
  };
  const manejarEditar = cot => {
    // Marca modo edición para mostrar aviso en el formulario
    setQuoteData({ ...cot, modoEdicion: true });
    navigate("/");
  };
  const manejarEliminar = async cot => {
    if (!(await confirm("¿Eliminar la cotización #" + cot.numero + "?"))) return;
    try {
      await deleteDoc(doc(db, "cotizaciones", cot.id));
      setCotizaciones(prev => prev.filter(c => c.id !== cot.id));
    } catch (e) {
      console.error("Error eliminando", e);
      alert("No se pudo eliminar");
    }
  };

  // Paginación UI helpers
  const PageButton = ({ label, onClick, disabled, active }) => (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`min-w-[32px] h-8 px-2 text-xs rounded border transition-colors ${
        active
          ? 'bg-trafico text-black border-trafico'
          : disabled
            ? 'bg-gray-100 text-gray-400 border-gray-200 dark:bg-gris-800 dark:text-gris-500 dark:border-gris-700'
            : 'bg-gray-200 hover:bg-gray-300 border-gray-300 dark:bg-gris-800 dark:hover:bg-gris-700 dark:border-gris-600 dark:text-gray-200'
      }`}
    >{label}</button>
  );

  const renderPageNumbers = () => {
    if (totalPaginas <= 7) {
      return Array.from({ length: totalPaginas }, (_, i) => (
        <PageButton key={i + 1} label={i + 1} onClick={() => setPaginaActual(i + 1)} active={paginaActual === i + 1} />
      ));
    }
    const items = [];
    const add = (p) => items.push(
      <PageButton key={p} label={p} onClick={() => setPaginaActual(p)} active={paginaActual === p} />
    );
    add(1);
    if (paginaActual > 3) items.push(<span key="i1" className="px-1">…</span>);
    const start = Math.max(2, paginaActual - 1);
    const end = Math.min(totalPaginas - 1, paginaActual + 1);
    for (let p = start; p <= end; p++) add(p);
    if (paginaActual < totalPaginas - 2) items.push(<span key="i2" className="px-1">…</span>);
    add(totalPaginas);
    return items;
  };

  return (
  <div className="max-w-7xl mx-auto p-6 bg-white dark:bg-gris-900 shadow rounded">      
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-4 flex-wrap">
          <button onClick={() => navigate('/')} className="bg-gray-600 text-white px-3 py-1.5 rounded text-sm hover:bg-gray-700">← Volver</button>
          <h1 className="text-2xl font-bold">Historial de Cotizaciones</h1>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <span className="text-gray-600">Registros: {totalRegistros}</span>
          <select value={pageSize} onChange={e=>setPageSize(parseInt(e.target.value)||20)} className="border rounded px-2 py-1">
            {[10,20,50,100].map(sz=> <option key={sz} value={sz}>{sz}/pág</option>)}
          </select>
        </div>
      </div>

      {/* Filtros */}
      <div className="grid grid-cols-1 md:grid-cols-6 gap-3 mb-6 text-xs md:text-sm">
        <select value={filtroCliente} onChange={e=>setFiltroCliente(e.target.value)} className="border p-2 rounded">
          <option value="">Todos los clientes</option>
          {clientesUnicos.map(c=> <option key={c} value={c}>{c}</option>)}
        </select>
        <input value={filtroNumero} onChange={e=>setFiltroNumero(e.target.value)} placeholder="Filtrar #" className="border p-2 rounded" />
        <select value={filtroProducto} onChange={e=>setFiltroProducto(e.target.value)} className="border p-2 rounded">
          <option value="">Todos los productos</option>
          {productosUnicos.map(p=> <option key={p} value={p}>{p}</option>)}
        </select>
        <select value={filtroEstado} onChange={e=>setFiltroEstado(e.target.value)} className="border p-2 rounded">
          <option value="">Todos los estados</option>
          {estados.map(es => <option key={es} value={es}>{es}</option>)}
        </select>
        <DatePicker
          selectsRange
          startDate={startDate}
          endDate={endDate}
          onChange={r=>setRangoFecha(r)}
          isClearable
          placeholderText="Rango fecha"
          className="border p-2 rounded w-full"
          dateFormat="dd/MM/yyyy"
        />
        <button onClick={()=>{ setFiltroCliente(''); setFiltroNumero(''); setFiltroProducto(''); setFiltroEstado(''); setRangoFecha([null,null]); }} className="bg-gray-500 text-white px-3 py-2 rounded text-sm">Limpiar</button>
      </div>

      {/* Tabla */}
      {ordenadas.length === 0 ? (
        <p className="text-sm text-gray-600">No se encontraron cotizaciones.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full table-auto border text-xs md:text-sm dark:border-gray-700">
            <thead className="bg-gray-100 dark:bg-gris-800">
              <tr>
                <th className="border px-2 py-2 cursor-pointer" onClick={()=>{ setOrdenarPor('numero'); setOrdenAscendente(o=>ordenarPor==='numero' ? !o : true); }}># {iconoOrden('numero')}</th>
                <th className="border px-2 py-2">Cliente</th>
                <th className="border px-2 py-2">Producto</th>
                <th className="border px-2 py-2 cursor-pointer" onClick={()=>{ setOrdenarPor('fecha'); setOrdenAscendente(o=>ordenarPor==='fecha' ? !o : false); }}>Fecha {iconoOrden('fecha')}</th>
                <th
                  className="border px-2 py-2 cursor-pointer"
                  onClick={()=>{ setOrdenarPor('total'); setOrdenAscendente(o=> ordenarPor==='total' ? !o : false); }}
                >Total {iconoOrden('total')}</th>
                <th className="border px-2 py-2">Último Cambio</th>
                <th className="border px-2 py-2">Estado</th>
                <th className="border px-2 py-2">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {paginaDatos.map(c => (
                <tr key={c.id} className="text-center hover:bg-gray-50 dark:hover:bg-gray-800">
                  <td className="border px-2 py-1">{c.numero}</td>
                  <td className="border px-2 py-1">{c.nombreCliente || c.cliente}</td>
                  <td className="border px-2 py-1">{c.productos?.[0]?.nombrePersonalizado || c.productos?.[0]?.tipo || '-'}</td>
                  <td className="border px-2 py-1">{c.timestamp?.toDate ? c.timestamp.toDate().toLocaleDateString('es-CO') : '—'}</td>
                  <td className="border px-2 py-1">{c.total?.toLocaleString('es-CO',{ style:'currency', currency:'COP', minimumFractionDigits:0 })}</td>
                  <td className="border px-2 py-1">{c.estadoFecha?.toDate ? c.estadoFecha.toDate().toLocaleDateString('es-CO') : '—'}</td>
                  <td className="border px-2 py-1">
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-1">
                        <select
                          value={c.estadoSeguimiento}
                          onChange={async e=>{
                            const nuevo = e.target.value;
                            try {
                              await updateDoc(doc(db,'cotizaciones', c.id), { estadoSeguimiento: nuevo, estadoFecha: serverTimestamp() });
                              setCotizaciones(prev=> prev.map(x=> x.id===c.id ? { ...x, estadoSeguimiento:nuevo, estadoFecha:{ toDate:()=> new Date() } } : x));
                            } catch(err){
                              console.error(err);
                              alert('No se pudo actualizar');
                            }
                          }}
                          className={`flex-1 text-[10px] md:text-xs border rounded px-2 py-1 font-semibold transition-colors border-gray-300 dark:border-gris-600 focus:outline-none focus:ring-2 focus:ring-trafico/50 ${claseEstado(c.estadoSeguimiento)}`}
                        >
                          {estados.map(es=> <option key={es} value={es}>{es}</option>)}
                        </select>
                        <button
                          onClick={async ()=>{
                            const nota = window.prompt('Nota / acuerdo con el cliente:', c.notaEstado || '');
                            if(nota===null) return; // cancelado
                            try {
                              await updateDoc(doc(db,'cotizaciones', c.id), { notaEstado: nota, notaEstadoFecha: serverTimestamp() });
                              setCotizaciones(prev=> prev.map(x=> x.id===c.id ? { ...x, notaEstado: nota, notaEstadoFecha:{ toDate:()=> new Date() } } : x));
                            } catch(err){
                              console.error(err);
                              alert('No se pudo guardar la nota');
                            }
                          }}
                          title={c.notaEstado ? `Nota: ${c.notaEstado}` : 'Agregar nota'}
                          className={`p-1 rounded border text-xs transition-colors focus:outline-none focus:ring-2 focus:ring-trafico/50 ${c.notaEstado
                            ? 'bg-green-100 text-green-700 border-green-300 hover:bg-green-200 dark:bg-green-600 dark:text-white dark:border-green-400 dark:hover:bg-green-500'
                            : 'bg-gray-100 text-gray-600 border-gray-300 hover:bg-gray-200 dark:bg-gris-700 dark:text-gray-200 dark:border-gris-500 dark:hover:bg-gris-600'}`}
                        >
                          <FaRegCommentDots />
                        </button>
                      </div>
                      {c.notaEstado && (
                        <div className="text-[9px] md:text-[10px] leading-tight text-left line-clamp-2 max-w-[120px]" title={c.notaEstado}>
                          {c.notaEstado}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="border px-2 py-1 space-x-2 whitespace-nowrap">
                    <button onClick={()=>manejarVer(c)} className="text-blue-600 hover:text-blue-800" title="Ver"><FaEye /></button>
                    <button onClick={()=>manejarEditar(c)} className="text-yellow-500 hover:text-yellow-600" title="Editar"><FaEdit /></button>
                    <button onClick={()=>manejarEliminar(c)} className="text-red-600 hover:text-red-800" title="Eliminar"><FaTrash /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Paginación */}
      {totalRegistros > pageSize && (
  <div className="mt-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <div className="text-gray-600">Mostrando {totalRegistros === 0 ? 0 : (inicio + 1)}–{Math.min(fin, totalRegistros)} de {totalRegistros}</div>
          <div className="flex items-center gap-1 flex-wrap">
            <PageButton label="«" onClick={()=>setPaginaActual(1)} disabled={paginaActual===1} />
            <PageButton label="‹" onClick={()=>setPaginaActual(p=>Math.max(1,p-1))} disabled={paginaActual===1} />
            {renderPageNumbers()}
            <PageButton label="›" onClick={()=>setPaginaActual(p=>Math.min(totalPaginas,p+1))} disabled={paginaActual===totalPaginas} />
            <PageButton label="»" onClick={()=>setPaginaActual(totalPaginas)} disabled={paginaActual===totalPaginas} />
          </div>
        </div>
      )}
    </div>
  );
}
