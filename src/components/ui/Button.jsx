import React from "react";

// Botón de marca con variantes semánticas. Sustituye las clases de color
// repetidas (verde=principal, rojo=peligro, gris=secundario, azul=acento)
// que antes se reescribían en cada página.
const VARIANTS = {
  primary: "bg-green-600 hover:bg-green-500 text-white",
  secondary: "border border-gray-300 dark:border-gris-600 bg-gray-100 dark:bg-gris-700 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gris-600",
  danger: "bg-red-600 hover:bg-red-500 text-white",
  accent: "bg-blue-600 hover:bg-blue-500 text-white",
  brand: "bg-trafico text-black hover:opacity-90",
};

// Más alto en el teléfono que en el escritorio: con el dedo, un botón de 28 px
// se falla, y la sección de contabilidad se usa desde Android. Desde `sm` vuelve
// a la altura compacta, que es la que deja caber una fila de acciones dentro de
// una celda de tabla.
const SIZES = {
  sm: "px-3 py-2 sm:py-1.5 text-xs",
  md: "px-4 py-2.5 sm:py-2 text-sm",
};

export default function Button({ variant = "secondary", size = "md", className = "", ...props }) {
  return (
    <button
      type="button"
      className={`rounded font-medium shadow-sm focus:outline-none focus:ring-2 focus:ring-trafico/60 disabled:opacity-50 disabled:cursor-not-allowed transition-colors ${VARIANTS[variant] || VARIANTS.secondary} ${SIZES[size] || SIZES.md} ${className}`}
      {...props}
    />
  );
}
