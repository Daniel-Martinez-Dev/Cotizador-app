import React, { useEffect, useState } from "react";
import { collection, getDocs, deleteDoc, doc, updateDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase";
import { useNavigate } from "react-router-dom";
import { useQuote } from "../context/QuoteContext";
import { FaSortUp, FaSortDown, FaEdit, FaTrash, FaEye } from "react-icons/fa";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

export default function HistorialPage() {
  const [cotizaciones, setCotizaciones] = useState([]);
  const [clientesUnicos, setClientesUnicos] = useState([]);
  const [filtroCliente, setFiltroCliente] = useState("");
  const [filtroNumero, setFiltroNumero] = useState("");
  const [filtroProducto, setFiltroProducto] = useState("");
  const [productosUnicos, setProductosUnicos] = useState([]);
  const [rangoFecha, setRangoFecha] = useState([null, null]);
  const [ordenarPor, setOrdenarPor] = useState("fecha");
  const [ordenAscendente, setOrdenAscendente] = useState(false);
  const [filtroEstado, setFiltroEstado] = useState("");
  const estados = [
    'COTIZACIÓN ENVIADA',
    'SEGUIMIENTO 1',
    'SEGUIMIENTO 2',
    'NEGOCIACIÓN',
    'APROBADA / PEND. PAGO',
    'VENDIDA',
    'CANCELADA'
  ];

  const [startDate, endDate] = rangoFecha;

  const navigate = useNavigate();
  const { setQuoteData } = useQuote();

  useEffect(() => {
    const fetchData = async () => {
      const querySnapshot = await getDocs(collection(db, "cotizaciones"));
      const datos = querySnapshot.docs.map(doc => {
        const d = doc.data();
        return {
          id: doc.id,
          ...d,
          estadoSeguimiento: d.estadoSeguimiento || 'COTIZACIÓN ENVIADA',
          estadoFecha: d.estadoFecha || d.estadoCambio || d.timestamp || null // fallback
        };
      });
      setCotizaciones(datos);

      const clientes = [...new Set(datos.map(c => c.nombreCliente || c.cliente).filter(Boolean))];
      setClientesUnicos(clientes);

      const productos = [...new Set(datos.map(c => {
        const p = c.productos?.[0];
        return p ? (p.nombrePersonalizado || p.tipo || '') : null;
      }).filter(Boolean))].sort((a,b)=>a.localeCompare(b));
      setProductosUnicos(productos);
    };
    fetchData();
  }, []);

  const filtrarCotizaciones = cotizaciones.filter(c => {
  const nombreMostrar = c.nombreCliente || c.cliente;
  const coincideCliente = filtroCliente ? nombreMostrar === filtroCliente : true;
  const primerProducto = c.productos?.[0];
  const nombreProducto = primerProducto ? (primerProducto.nombrePersonalizado || primerProducto.tipo || '') : '';
  const coincideProducto = filtroProducto ? nombreProducto === filtroProducto : true;
  const coincideEstado = filtroEstado ? c.estadoSeguimiento === filtroEstado : true;
    const coincideNumero = c.numero
      ?.toString()
      .toLowerCase()
      .includes(filtroNumero.toLowerCase());
    const coincideFecha = c.timestamp?.toDate
      ? !startDate ||
        !endDate ||
        (c.timestamp.toDate() >= startDate && c.timestamp.toDate() <= endDate)
      : true;

  return coincideCliente && coincideNumero && coincideFecha && coincideProducto && coincideEstado;
  });

  const cotizacionesOrdenadas = [...filtrarCotizaciones].sort((a, b) => {
    let valorA = ordenarPor === "numero" ? a.numero : a.timestamp?.toDate?.();
    let valorB = ordenarPor === "numero" ? b.numero : b.timestamp?.toDate?.();

    if (!valorA || !valorB) return 0;
    if (ordenAscendente) return valorA > valorB ? 1 : -1;
    return valorA < valorB ? 1 : -1;
  });

  const claseEstado = (estado) => {
    switch(estado){
      case 'COTIZACIÓN ENVIADA': return 'bg-slate-100 text-slate-700 border-slate-300';
      case 'SEGUIMIENTO 1': return 'bg-indigo-100 text-indigo-700 border-indigo-300';
      case 'SEGUIMIENTO 2': return 'bg-purple-100 text-purple-700 border-purple-300';
      case 'NEGOCIACIÓN': return 'bg-amber-100 text-amber-700 border-amber-300';
      case 'APROBADA / PEND. PAGO': return 'bg-sky-100 text-sky-700 border-sky-300';
      case 'VENDIDA': return 'bg-green-100 text-green-700 border-green-300';
      case 'CANCELADA': return 'bg-red-100 text-red-700 border-red-300';
      default: return 'bg-gray-100 text-gray-700 border-gray-300';
    }
  };

  const manejarEditar = (cotizacion) => {
    setQuoteData({
      ...cotizacion,
      modoEdicion: true,
      idDocumentoFirebase: cotizacion.id
    });
    navigate("/preview");
  };
  const manejarVer = (cotizacion) => {
    const { id, ...datos } = cotizacion;
    setQuoteData(datos); // sin modoEdicion
    navigate("/preview");
  };
  const manejarEliminar = async (cotizacion) => {
    if (!window.confirm(`¿Eliminar la cotización #${cotizacion.numero}?`)) return;

    try {
      await deleteDoc(doc(db, "cotizaciones", cotizacion.id));
      setCotizaciones(prev => prev.filter(c => c.id !== cotizacion.id));
      alert("Cotización eliminada correctamente.");
    } catch (error) {
      console.error("Error al eliminar cotización:", error);
      alert("Ocurrió un error al eliminar la cotización.");
    }
  };
  const iconoOrden = (campo) => {
    if (ordenarPor !== campo) return null;
    return ordenAscendente ? <FaSortUp className="inline" /> : <FaSortDown className="inline" />;
  };

  return (
    <div className="max-w-7xl mx-auto p-6 bg-white shadow-md rounded-lg">
      <h1 className="text-2xl font-bold mb-4">Historial de Cotizaciones</h1>

  <div className="grid grid-cols-6 gap-4 mb-6 items-center">
        <select
          value={filtroCliente}
          onChange={(e) => setFiltroCliente(e.target.value)}
          className="border p-2 rounded"
        >
          <option value="">Todos los clientes</option>
          {clientesUnicos.map((cliente, index) => (
            <option key={index} value={cliente}>{cliente}</option>
          ))}
        </select>

        <input
          type="text"
          placeholder="Filtrar por número"
          value={filtroNumero}
          onChange={(e) => setFiltroNumero(e.target.value)}
          className="border p-2 rounded"
        />

        <select
          value={filtroProducto}
          onChange={(e)=>setFiltroProducto(e.target.value)}
          className="border p-2 rounded"
        >
          <option value="">Todos los productos</option>
          {productosUnicos.map((p,i)=>(<option key={i} value={p}>{p}</option>))}
        </select>

        <select
          value={filtroEstado}
          onChange={(e)=>setFiltroEstado(e.target.value)}
          className="border p-2 rounded"
        >
          <option value="">Todos los estados</option>
          {estados.map(es => <option key={es} value={es}>{es}</option>)}
        </select>

        <DatePicker
          selectsRange
          startDate={startDate}
          endDate={endDate}
          onChange={(update) => setRangoFecha(update)}
          isClearable
          placeholderText="Filtrar por rango de fecha"
          className="border p-2 rounded w-full"
          dateFormat="dd/MM/yyyy"
        />
        <button
          onClick={()=>{ setFiltroCliente(''); setFiltroNumero(''); setFiltroProducto(''); setFiltroEstado(''); setRangoFecha([null,null]); }}
          className="bg-gray-500 text-white px-3 py-2 rounded text-sm"
        >Limpiar</button>
      </div>
      {cotizacionesOrdenadas.length === 0 ? (
        <p>No se encontraron cotizaciones.</p>
      ) : (
        <table className="w-full table-auto border">
          <thead className="bg-gray-100">
            <tr>
              <th
                className="border px-4 py-2 cursor-pointer"
                onClick={() => {
                  setOrdenarPor("numero");
                  setOrdenAscendente(!ordenAscendente);
                }}
              >
                #
                {iconoOrden("numero")}
              </th>
              <th className="border px-4 py-2">Cliente</th>
              <th className="border px-4 py-2">Producto</th>
              <th
                className="border px-4 py-2 cursor-pointer"
                onClick={() => {
                  setOrdenarPor("fecha");
                  setOrdenAscendente(!ordenAscendente);
                }}
              >
                Fecha
                {iconoOrden("fecha")}
              </th>
              <th className="border px-4 py-2">Total</th>
              <th className="border px-4 py-2">Último Cambio</th>
              <th className="border px-4 py-2">Estado</th>
              <th className="border px-4 py-2">Interacción</th>

            </tr>
          </thead>
          <tbody>
            {cotizacionesOrdenadas.map((cot) => (
              <tr key={cot.id} className="text-center">
                <td className="border px-4 py-2">{cot.numero}</td>
                <td className="border px-4 py-2">{cot.nombreCliente || cot.cliente}</td>
                <td className="border px-4 py-2">{cot.productos?.[0]?.tipo || '-'}</td>
                <td className="border px-4 py-2">
                  {cot.timestamp?.toDate
                    ? cot.timestamp.toDate().toLocaleDateString("es-CO")
                    : "Sin fecha"}
                </td>
                <td className="border px-4 py-2">
                  {cot.total?.toLocaleString("es-CO", {
                    style: "currency",
                    currency: "COP",
                    minimumFractionDigits: 0
                  })}
                </td>
                <td className="border px-4 py-2 text-xs">
                  {cot.estadoFecha?.toDate ? cot.estadoFecha.toDate().toLocaleDateString('es-CO') : '—'}
                </td>
                <td className="border px-2 py-2">
                  <select
                    value={cot.estadoSeguimiento}
                    onChange={async (e)=>{
                      const nuevo = e.target.value;
                      try {
                        await updateDoc(doc(db, 'cotizaciones', cot.id), { estadoSeguimiento: nuevo, estadoFecha: serverTimestamp() });
                        setCotizaciones(prev => prev.map(c => c.id === cot.id ? { ...c, estadoSeguimiento: nuevo, estadoFecha: { toDate: ()=> new Date() } } : c));
                      } catch(err){
                        console.error('Error actualizando estado', err);
                        alert('No se pudo actualizar el estado');
                      }
                    }}
                    className={`text-[10px] sm:text-xs border rounded px-2 py-1 font-medium whitespace-nowrap ${claseEstado(cot.estadoSeguimiento)}`}
                  >
                    {estados.map(es => <option key={es} value={es}>{es}</option>)}
                  </select>
                </td>
                <td className="border px-4 py-2 space-x-2">
                  <button
                    onClick={() => manejarVer(cot)}
                    className="text-blue-600 hover:text-blue-800"
                    title="Ver"
                  >
                    <FaEye />
                  </button>
                  <button
                    onClick={() => manejarEditar(cot)}
                    className="text-yellow-500 hover:text-yellow-600"
                    title="Editar"
                  >
                    <FaEdit />
                  </button>
                  <button
                    onClick={() => manejarEliminar(cot)}
                    className="text-red-600 hover:text-red-800"
                    title="Eliminar"
                  >
                    <FaTrash />
                  </button>
                </td>                
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <button
        onClick={() => navigate("/")}
        className="mt-6 bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700"
      >
        ← Volver al Cotizador
      </button>
    
    </div>
  );
}
