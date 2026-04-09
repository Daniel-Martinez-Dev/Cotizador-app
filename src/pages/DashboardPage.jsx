import React from "react";
import { Link, useLocation } from "react-router-dom";
import { ENABLE_INVENTARIO, ENABLE_PRODUCCION } from "../utils/featureFlags";

function Card({ title, desc, to, enabled }) {
  const base = "block rounded-lg border p-5 transition-colors";
  const cls = enabled
    ? "bg-white dark:bg-gris-800 border-gray-200 dark:border-gris-700 hover:border-trafico"
    : "bg-gray-100 dark:bg-gris-800/40 border-gray-200 dark:border-gris-700 opacity-60 cursor-not-allowed";

  const inner = (
    <div>
      <div className="font-semibold text-gray-900 dark:text-white">{title}</div>
      <div className="text-sm text-gray-600 dark:text-gray-300 mt-1">{desc}</div>
    </div>
  );

  if (!enabled) return <div className={`${base} ${cls}`}>{inner}</div>;
  return (
    <Link to={to} className={`${base} ${cls}`}>
      {inner}
    </Link>
  );
}

export default function DashboardPage() {
  const location = useLocation();
  const denied = location.state?.denied;
  const disabled = location.state?.disabled;

  return (
    <div className="max-w-5xl mx-auto px-4">
      <h1 className="text-xl font-semibold">Secciones</h1>
      {denied && (
        <div className="mt-3 text-sm rounded border border-yellow-300 bg-yellow-50 text-yellow-900 dark:bg-gris-800 dark:border-trafico dark:text-trafico px-3 py-2">
          No tienes permisos para: <span className="font-medium">{denied}</span>
        </div>
      )}
      {disabled && (
        <div className="mt-3 text-sm rounded border border-yellow-300 bg-yellow-50 text-yellow-900 dark:bg-gris-800 dark:border-gris-700 dark:text-gray-100 px-3 py-2">
          Sección deshabilitada temporalmente.
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-5">
        <Card
          title="Cotizador"
          desc="Crear cotizaciones y PDFs"
          to="/"
          enabled={true}
        />
        {ENABLE_PRODUCCION && (
          <Card
            title="Producción"
            desc="Órdenes en producción y fichas de fabricación"
            to="/produccion"
            enabled={true}
          />
        )}
        {ENABLE_INVENTARIO && (
          <Card
            title="Inventario"
            desc="Materia prima, proveedores y tiempos de entrega"
            to="/inventario"
            enabled={true}
          />
        )}
      </div>
    </div>
  );
}
