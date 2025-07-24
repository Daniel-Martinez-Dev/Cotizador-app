import React, { useEffect, useState } from "react";
import { db } from "../firebase";
import { collection, getDocs, orderBy, query } from "firebase/firestore";
import { useNavigate } from "react-router-dom";

export default function HistorialPage() {
  const [cotizaciones, setCotizaciones] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    async function cargar() {
      const q = query(collection(db, "cotizaciones"), orderBy("timestamp", "desc"));
      const snapshot = await getDocs(q);
      const datos = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setCotizaciones(datos);
    }
    cargar();
  }, []);

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Historial de Cotizaciones</h1>
      <table className="min-w-full border">
        <thead className="bg-gray-100">
          <tr>
            <th className="border px-4 py-2">#</th>
            <th className="border px-4 py-2">Cliente</th>
            <th className="border px-4 py-2">Fecha</th>
            <th className="border px-4 py-2">Total</th>
          </tr>
        </thead>
        <tbody>
          {cotizaciones.map((coti) => (
            <tr key={coti.id} className="border-t">
              <td className="px-4 py-2">{coti.numero}</td>
              <td className="px-4 py-2">{coti.nombreCliente || coti.cliente}</td>
              <td className="px-4 py-2">{new Date(coti.timestamp?.seconds * 1000).toLocaleDateString("es-CO")}</td>
              <td className="px-4 py-2 text-right">
                {coti.total?.toLocaleString("es-CO", {
                  style: "currency",
                  currency: "COP",
                })}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <button
        onClick={() => navigate("/")}
        className="mt-6 bg-blue-600 text-white px-4 py-2 rounded"
      >
        Volver
      </button>
    </div>
  );
}
