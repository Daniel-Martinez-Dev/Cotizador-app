import React from "react";
import { Link, useLocation } from "react-router-dom";
import { ENABLE_INVENTARIO, ENABLE_PRODUCCION } from "../utils/featureFlags";
import { useAuth } from "../context/AuthContext";

function Card({ title, desc, to, enabled, icon, tone }) {
  const base = "group relative block overflow-hidden rounded-2xl border px-5 py-5 transition";
  const cls = enabled
    ? "bg-white/90 dark:bg-gris-900/80 border-gray-200/80 dark:border-gris-700/80 hover:-translate-y-1 hover:shadow-xl"
    : "bg-gray-100 dark:bg-gris-800/40 border-gray-200 dark:border-gris-700 opacity-60 cursor-not-allowed";
  const accent = tone || "from-sky-500/15 via-sky-400/10 to-transparent";

  const inner = (
    <div className="relative">
      <div className={`absolute -top-10 -right-10 h-24 w-24 rounded-full bg-gradient-to-br ${accent}`} />
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="h-11 w-11 rounded-xl border border-gray-200/80 dark:border-gris-700/70 bg-white/80 dark:bg-gris-800/70 flex items-center justify-center text-lg">
            {icon}
          </div>
          <div>
            <div className="font-semibold text-gray-900 dark:text-white" style={{ fontFamily: '"Space Grotesk", "Segoe UI", sans-serif' }}>{title}</div>
            <div className="text-sm text-gray-600 dark:text-gray-300 mt-1 max-w-[22ch]">{desc}</div>
          </div>
        </div>
        {enabled ? (
          <span className="text-[10px] uppercase tracking-wide text-emerald-600 dark:text-emerald-300">Activo</span>
        ) : (
          <span className="text-[10px] uppercase tracking-wide text-gray-400">Bloqueado</span>
        )}
      </div>
      <div className="mt-5 flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
        <span>Acceder al módulo</span>
        <span className={`text-base transition ${enabled ? 'group-hover:translate-x-1' : ''}`}>→</span>
      </div>
    </div>
  );

  if (!enabled) return <div className={`${base} ${cls}`}>{inner}</div>;
  return <Link to={to} className={`${base} ${cls}`}>{inner}</Link>;
}

export default function DashboardPage() {
  const location = useLocation();
  const denied = location.state?.denied;
  const disabled = location.state?.disabled;
  const { hasRole, isMainAdmin } = useAuth();

  const isAdmin = isMainAdmin || hasRole("admin");
  const showProduccion = ENABLE_PRODUCCION && (isAdmin || hasRole("produccion"));
  const showInventario = ENABLE_INVENTARIO && (isAdmin || hasRole("inventario"));

  return (
    <div className="relative">
      <div className="absolute inset-0 -z-10 bg-gradient-to-br from-slate-50 via-white to-sky-50 dark:from-[#0b1220] dark:via-[#0f172a] dark:to-[#0a0f1f]" />
      <div className="absolute -top-24 left-1/2 -z-10 h-64 w-64 -translate-x-1/2 rounded-full bg-[radial-gradient(circle_at_center,rgba(34,113,179,0.16),transparent_60%)]" />
      <div className="max-w-6xl mx-auto px-4 pb-10 pt-6">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.35em] text-gray-400 dark:text-gray-500">Panel principal</p>
            <h1 className="text-2xl md:text-3xl font-semibold text-gray-900 dark:text-white" style={{ fontFamily: '"Space Grotesk", "Segoe UI", sans-serif' }}>Inicio</h1>
            <p className="text-sm text-gray-600 dark:text-gray-300 mt-2 max-w-xl">
              Accede rápido a los módulos disponibles según tus permisos.
            </p>
          </div>
          <div className="rounded-2xl border border-gray-200/80 dark:border-gris-700/80 bg-white/80 dark:bg-gris-900/70 px-4 py-3 text-xs text-gray-500 dark:text-gray-300">
            Estado del sistema: <span className="text-emerald-600 dark:text-emerald-300 font-medium">Operativo</span>
          </div>
        </div>

        {denied && (
          <div className="mt-4 text-sm rounded-xl border border-amber-300/80 bg-amber-50 text-amber-900 dark:bg-gris-800 dark:border-trafico dark:text-trafico px-4 py-3">
            No tienes permisos para: <span className="font-medium">{denied}</span>
          </div>
        )}
        {disabled && (
          <div className="mt-4 text-sm rounded-xl border border-amber-300/80 bg-amber-50 text-amber-900 dark:bg-gris-800 dark:border-gris-700 dark:text-gray-100 px-4 py-3">
            Sección deshabilitada temporalmente.
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
          <Card
            title="Cotizador"
            desc="Crear cotizaciones y PDFs"
            to="/cotizar"
            enabled={true}
            icon="🧾"
            tone="from-sky-500/20 via-sky-400/10 to-transparent"
          />
          <Card
            title="Producción"
            desc="Órdenes en producción y fichas de fabricación"
            to="/produccion"
            enabled={showProduccion}
            icon="🏭"
            tone="from-amber-500/20 via-amber-400/10 to-transparent"
          />
          <Card
            title="Inventario"
            desc="Materia prima, proveedores y tiempos de entrega"
            to="/inventario"
            enabled={showInventario}
            icon="📦"
            tone="from-emerald-500/20 via-emerald-400/10 to-transparent"
          />
        </div>
      </div>
    </div>
  );
}
