import React from "react";
import { FaIndustry, FaCheckCircle, FaUndo } from "react-icons/fa";

// Botones de transición de estado, compartidos por las tres fichas de fabricación.
export default function EstadoActions({ estado, onCambiarEstado }) {
  return (
    <div className="flex flex-wrap gap-2 pt-3 border-t border-gray-200 dark:border-gris-600">
      {estado !== "en_produccion" && (
        <button onClick={() => onCambiarEstado("en_produccion")}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 active:scale-95 text-white text-xs font-medium shadow-sm transition">
          <FaIndustry className="text-[11px]" /> Pasar a producción
        </button>
      )}
      {estado !== "terminado" && (
        <button onClick={() => onCambiarEstado("terminado")}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-600 hover:bg-green-500 active:scale-95 text-white text-xs font-medium shadow-sm transition">
          <FaCheckCircle className="text-[11px]" /> Marcar terminada
        </button>
      )}
      {estado !== "borrador" && (
        <button onClick={() => onCambiarEstado("borrador")}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-200 hover:bg-gray-300 active:scale-95 dark:bg-gris-600 dark:hover:bg-gris-500 text-xs font-medium transition">
          <FaUndo className="text-[11px]" /> Volver a borrador
        </button>
      )}
    </div>
  );
}
