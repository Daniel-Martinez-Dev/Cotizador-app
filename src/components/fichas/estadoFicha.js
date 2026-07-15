// Estado compartido por las fichas de fabricación (Abrigo, Sello, División Térmica).

export const ESTADO_LABEL = {
  borrador: "Borrador",
  en_produccion: "En producción",
  terminado: "Terminado",
};

export const ESTADO_CLS = {
  borrador: "bg-gray-100 text-gray-700 dark:bg-gris-700 dark:text-gray-300",
  en_produccion: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  terminado: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300",
};
