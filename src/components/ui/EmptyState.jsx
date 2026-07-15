import React from "react";

// Estado vacío/carga consistente. Antes cada página mostraba "Cargando..."/
// "Sin resultados" con su propio formato (texto plano en unas, emoji en otras).
export default function EmptyState({ icon = "📭", title, description, action }) {
  return (
    <div className="text-center py-10 px-4">
      <div className="text-3xl mb-2" aria-hidden="true">{icon}</div>
      {title && <div className="text-sm font-medium text-gray-600 dark:text-gray-300">{title}</div>}
      {description && <div className="text-xs text-gray-400 dark:text-gray-500 mt-1">{description}</div>}
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}
