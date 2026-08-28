import React from "react";
import { seccionDe } from "../layout/navSections";

// Encabezado común a todas las secciones de oficina. Repite el ícono y el
// nombre que la barra superior muestra para esa sección, así que al entrar se
// confirma dónde estás; antes cada página resolvía su título por su cuenta
// (unas con text-2xl bold, otras con text-xl semibold) y ninguna se parecía a
// la anterior.
//
// Uso típico:  <PageHeader section="/produccion" actions={<Button …/>} />
// `title`, `icon` y `description` sobreescriben lo que trae la sección, y
// `description={null}` lo deja sin bajada.
export default function PageHeader({
  section,
  icon,
  title,
  description,
  actions,
  children,
  className = "",
}) {
  const meta = section ? seccionDe(section) : null;
  const Icon = icon || meta?.icon;
  const titulo = title || meta?.label || "";
  const bajada = description === undefined ? meta?.desc : description;

  return (
    <div
      className={`flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between pb-4 mb-5 border-b border-gray-200 dark:border-gris-700 ${className}`}
    >
      <div className="flex items-start gap-3 min-w-0">
        {Icon && (
          <span className="shrink-0 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-trafico/15 ring-1 ring-trafico/40 text-gray-900 dark:text-trafico">
            <Icon className="text-lg" />
          </span>
        )}
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-semibold text-gray-900 dark:text-white leading-tight">{titulo}</h1>
          {bajada && <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">{bajada}</p>}
          {children}
        </div>
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2 sm:justify-end shrink-0">{actions}</div>}
    </div>
  );
}
