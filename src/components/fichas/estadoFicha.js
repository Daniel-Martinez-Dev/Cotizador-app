// Estado compartido por las fichas de fabricación (Abrigo, Sello, División Térmica).

export const ESTADO_LABEL = {
  borrador: "Borrador",
  en_produccion: "En producción",
  terminado: "Terminado",
};

export const ESTADO_CLS = {
  borrador: "bg-gray-100 text-gray-700 border-gray-200 dark:bg-gris-700 dark:text-gray-300 dark:border-gris-600",
  en_produccion: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/40 dark:text-blue-300 dark:border-blue-800",
  terminado: "bg-green-50 text-green-700 border-green-200 dark:bg-green-900/40 dark:text-green-300 dark:border-green-800",
};

// Color sólido del punto indicador (para badges y filtros).
export const ESTADO_DOT = {
  borrador: "bg-gray-400",
  en_produccion: "bg-blue-500",
  terminado: "bg-green-500",
};
