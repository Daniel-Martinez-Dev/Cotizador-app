import React from "react";

// Pastilla de estado genérica. Sustituye los distintos sistemas de color
// reinventados por página (tipoCalculo en Productos, stock en Inventario, etc.).
const TONES = {
  neutral: "bg-gray-100 text-gray-700 dark:bg-gris-700 dark:text-gray-300",
  info: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  success: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300",
  warning: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
  danger: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
  purple: "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300",
};

export default function Badge({ tone = "neutral", children, className = "" }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold whitespace-nowrap ${TONES[tone] || TONES.neutral} ${className}`}>
      {children}
    </span>
  );
}
