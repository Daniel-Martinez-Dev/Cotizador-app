import React, { useEffect, useState } from "react";
import { collection, getDocs, deleteDoc, doc } from "firebase/firestore";
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
  const [rangoFecha, setRangoFecha] = useState([null, null]);
  const [ordenarPor, setOrdenarPor] = useState("fecha");
  const [ordenAscendente, setOrdenAscendente] = useState(false);

  const [startDate, endDate] = rangoFecha;

  const navigate = useNavigate();
  const { setQuoteData } = useQuote();

  useEffect(() => {
    const fetchData = async () => {
      const querySnapshot = await getDocs(collection(db, "cotizaciones"));
      const datos = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setCotizaciones(datos);

      const clientes = [...new Set(datos.map(c => c.cliente).filter(Boolean))];
      setClientesUnicos(clientes);
    };
    fetchData();
  }, []);

  const filtrarCotizaciones = cotizaciones.filter(c => {
    const coincideCliente = filtroCliente ? c.cliente === filtroCliente : true;
    const coincideNumero = c.numero
      ?.toString()
      .toLowerCase()
      .includes(filtroNumero.toLowerCase());
    const coincideFecha = c.timestamp?.toDate
      ? !startDate ||
        !endDate ||
        (c.timestamp.toDate() >= startDate && c.timestamp.toDate() <= endDate)
      : true;

    return coincideCliente && coincideNumero && coincideFecha;
  });

  const cotizacionesOrdenadas = [...filtrarCotizaciones].sort((a, b) => {
    let valorA = ordenarPor === "numero" ? a.numero : a.timestamp?.toDate?.();
    let valorB = ordenarPor === "numero" ? b.numero : b.timestamp?.toDate?.();

    if (!valorA || !valorB) return 0;
    if (ordenAscendente) return valorA > valorB ? 1 : -1;
    return valorA < valorB ? 1 : -1;
  });

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
    <div className="max-w-6xl mx-auto p-6 bg-white shadow-md rounded-lg">
      <h1 className="text-2xl font-bold mb-4">Historial de Cotizaciones</h1>

      <div className="grid grid-cols-3 gap-4 mb-6 items-center">
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
              <th className="border px-4 py-2">Interacción</th>

            </tr>
          </thead>
          <tbody>
            {cotizacionesOrdenadas.map((cot) => (
              <tr key={cot.id} className="text-center">
                <td className="border px-4 py-2">{cot.numero}</td>
                <td className="border px-4 py-2">{cot.cliente}</td>
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
