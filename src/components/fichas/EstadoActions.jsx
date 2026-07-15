import React from "react";

// Botones de transición de estado, compartidos por las tres fichas de fabricación.
export default function EstadoActions({ estado, onCambiarEstado }) {
  return (
    <div className="flex flex-wrap gap-2 pt-1 border-t border-gray-200 dark:border-gris-600">
      {estado !== "en_produccion" && (
        <button onClick={() => onCambiarEstado("en_produccion")}
          className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium">
          Pasar a producción
        </button>
      )}
      {estado !== "terminado" && (
        <button onClick={() => onCambiarEstado("terminado")}
          className="px-3 py-1.5 rounded-lg bg-green-600 hover:bg-green-500 text-white text-xs font-medium">
          Marcar terminada
        </button>
      )}
      {estado !== "borrador" && (
        <button onClick={() => onCambiarEstado("borrador")}
          className="px-3 py-1.5 rounded-lg bg-gray-200 hover:bg-gray-300 dark:bg-gris-600 dark:hover:bg-gris-500 text-xs font-medium">
          Volver a borrador
        </button>
      )}
    </div>
  );
}
