// src/pages/HistorialPage.jsx
import React, { useEffect, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../firebase";
import { useNavigate } from "react-router-dom";
import { useQuote } from "../context/QuoteContext";
import { FaSortUp, FaSortDown } from "react-icons/fa";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

export default function HistorialPage() {
  const [cotizaciones, setCotizaciones] = useState([]);
  const [filtroCliente, setFiltroCliente] = useState("");
  const [filtroNumero, setFiltroNumero] = useState("");
  const [fechaInicio, setFechaInicio] = useState(null);
  const [fechaFin, setFechaFin] = useState(null);
  const [ordenCampo, setOrdenCampo] = useState("timestamp");
  const [ordenAscendente, setOrdenAscendente] = useState(false);
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
    };
    fetchData();
  }, []);

  const iconoOrden = (campo) => {
    if (ordenCampo !== campo) return null;
    return ordenAscendente ? <FaSortUp /> : <FaSortDown />;
  };

    const cotizacionesFiltradas = cotizaciones.filter((c) => {
    const coincideCliente = c.cliente?.toLowerCase().includes(filtroCliente.toLowerCase());
    const coincideNumero = c.numero?.toString().includes(filtroNumero);

    let coincideRangoFecha = true;
    if (fechaInicio || fechaFin) {
        const fechaCot = c.timestamp?.toDate?.();
        if (!fechaCot) return false;
        coincideRangoFecha =
        (!fechaInicio || fechaCot >= fechaInicio) &&
        (!fechaFin || fechaCot <= fechaFin);
    }

    return coincideCliente && coincideNumero && coincideRangoFecha;
    })
    .sort((a, b) => {
      const valorA =
        ordenCampo === "timestamp"
          ? a.timestamp?.toDate()?.getTime() || 0
          : a.numero || 0;
      const valorB =
        ordenCampo === "timestamp"
          ? b.timestamp?.toDate()?.getTime() || 0
          : b.numero || 0;

      return ordenAscendente ? valorA - valorB : valorB - valorA;
    });

  const manejarVer = (cotizacion) => {
    setQuoteData(cotizacion);
    navigate("/preview");
  };

  return (
    <div className="max-w-5xl mx-auto p-6 bg-white shadow-md rounded-lg">
      <h1 className="text-2xl font-bold mb-4">Historial de Cotizaciones</h1>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <input
          type="text"
          placeholder="Filtrar por cliente"
          value={filtroCliente}
          onChange={(e) => setFiltroCliente(e.target.value)}
          className="border p-2 rounded"
        />
        <input
          type="text"
          placeholder="Filtrar por número"
          value={filtroNumero}
          onChange={(e) => setFiltroNumero(e.target.value)}
          className="border p-2 rounded"
        />
        <div className="flex items-center gap-2">
        <DatePicker
            selected={fechaInicio}
            onChange={(date) => setFechaInicio(date)}
            selectsStart
            startDate={fechaInicio}
            endDate={fechaFin}
            placeholderText="Fecha inicio"
            className="border p-2 rounded"
            dateFormat="dd/MM/yyyy"
        />
        <DatePicker
            selected={fechaFin}
            onChange={(date) => setFechaFin(date)}
            selectsEnd
            startDate={fechaInicio}
            endDate={fechaFin}
            minDate={fechaInicio}
            placeholderText="Fecha fin"
            className="border p-2 rounded"
            dateFormat="dd/MM/yyyy"
        />
        </div>
      </div>

      {cotizacionesFiltradas.length === 0 ? (
        <p>No se encontraron cotizaciones.</p>
      ) : (
        <table className="w-full table-auto border">
          <thead className="bg-gray-100">
            <tr className="text-left">
              <th
                className="border px-4 py-2 cursor-pointer"
                onClick={() => {
                  setOrdenCampo("numero");
                  setOrdenAscendente((prev) =>
                    ordenCampo === "numero" ? !prev : true
                  );
                }}
              >
                #
                {iconoOrden("numero")}
              </th>
              <th className="border px-4 py-2">Cliente</th>
              <th
                className="border px-4 py-2 cursor-pointer"
                onClick={() => {
                  setOrdenCampo("timestamp");
                  setOrdenAscendente((prev) =>
                    ordenCampo === "timestamp" ? !prev : true
                  );
                }}
              >
                Fecha
                {iconoOrden("timestamp")}
              </th>
              <th className="border px-4 py-2">Total</th>
              <th className="border px-4 py-2">Ver</th>
            </tr>
          </thead>
          <tbody>
            {cotizacionesFiltradas.map((cot) => (
              <tr key={cot.id} className="text-center">
                <td className="border px-4 py-2">{cot.numero}</td>
                <td className="border px-4 py-2">{cot.cliente}</td>
                <td className="border px-4 py-2">
                  {cot.timestamp?.toDate
                    ? cot.timestamp.toDate().toLocaleDateString("es-CO", {
                        day: "2-digit",
                        month: "2-digit",
                        year: "numeric"
                      })
                    : "Sin fecha"}
                </td>
                <td className="border px-4 py-2">
                  {cot.total.toLocaleString("es-CO", {
                    style: "currency",
                    currency: "COP",
                    minimumFractionDigits: 0
                  })}
                </td>
                <td className="border px-4 py-2">
                  <button
                    onClick={() => manejarVer(cot)}
                    className="bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600"
                  >
                    Ver
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
