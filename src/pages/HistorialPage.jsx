// src/pages/HistorialPage.jsx
import React, { useEffect, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../firebase";
import { useNavigate } from "react-router-dom";
import { useQuote } from "../context/QuoteContext";

export default function HistorialPage() {
  const [cotizaciones, setCotizaciones] = useState([]);
  const [filtroCliente, setFiltroCliente] = useState("");
  const [filtroNumero, setFiltroNumero] = useState("");
  const [filtroFecha, setFiltroFecha] = useState("");
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

  const cotizacionesFiltradas = cotizaciones.filter(c => {
    const coincideCliente = c.cliente
      .toLowerCase()
      .includes(filtroCliente.toLowerCase());
    const coincideNumero = c.numero
      ?.toString()
      .toLowerCase()
      .includes(filtroNumero.toLowerCase());
    const coincideFecha = filtroFecha
    ? (
        cot.timestamp?.toDate?.() &&
        cot.timestamp.toDate().toLocaleDateString("es-CO") === filtroFecha
        )
    : true;
    return coincideCliente && coincideNumero && coincideFecha;
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
        <input
          type="text"
          placeholder="Filtrar por fecha (dd/mm/aaaa)"
          value={filtroFecha}
          onChange={(e) => setFiltroFecha(e.target.value)}
          className="border p-2 rounded"
        />
      </div>

      {cotizacionesFiltradas.length === 0 ? (
        <p>No se encontraron cotizaciones.</p>
      ) : (
        <table className="w-full table-auto border">
          <thead className="bg-gray-100">
            <tr>
              <th className="border px-4 py-2">#</th>
              <th className="border px-4 py-2">Cliente</th>
              <th className="border px-4 py-2">Fecha</th>
              <th className="border px-4 py-2">Total</th>
              <th className="border px-4 py-2">Ver</th>
            </tr>
          </thead>
          <tbody>
            {cotizacionesFiltradas.map((cot, index) => (
              <tr key={cot.id} className="text-center">
                <td className="border px-4 py-2">{cot.numero}</td>
                <td className="border px-4 py-2">{cot.cliente}</td>
                <td className="border px-4 py-2">
                    {cot.timestamp && typeof cot.timestamp.toDate === "function"
                    ? cot.timestamp.toDate().toLocaleDateString("es-CO")
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
