// Estado compartido por las fichas de fabricación (Abrigo, Sello, División
// Térmica, Puerta Rápida y Ficha Básica).

import { FaPauseCircle, FaIndustry, FaCheckCircle, FaTruck } from "react-icons/fa";

// Orden del flujo: borrador → en producción → terminada → entregada. Se puede
// saltar o retroceder a cualquiera, pero este es el orden en que se dibujan.
export const ESTADOS_FICHA = ["borrador", "en_produccion", "terminado", "entregado"];

export const ESTADO_LABEL = {
  borrador: "Borrador",
  en_produccion: "En producción",
  terminado: "Terminada",
  entregado: "Entregada",
};

// Etiqueta corta para controles estrechos (el segmentado de cuatro pastillas).
export const ESTADO_LABEL_CORTO = {
  borrador: "Borrador",
  en_produccion: "Producción",
  terminado: "Terminada",
  entregado: "Entregada",
};

export const ESTADO_ICON = {
  borrador: FaPauseCircle,
  en_produccion: FaIndustry,
  terminado: FaCheckCircle,
  entregado: FaTruck,
};

export const ESTADO_CLS = {
  borrador: "bg-gray-100 text-gray-700 border-gray-200 dark:bg-gris-700 dark:text-gray-300 dark:border-gris-600",
  en_produccion: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/40 dark:text-blue-300 dark:border-blue-800",
  terminado: "bg-green-50 text-green-700 border-green-200 dark:bg-green-900/40 dark:text-green-300 dark:border-green-800",
  entregado: "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-900/40 dark:text-purple-300 dark:border-purple-800",
};

// Color sólido del punto indicador (para badges y filtros).
export const ESTADO_DOT = {
  borrador: "bg-gray-400",
  en_produccion: "bg-blue-500",
  terminado: "bg-green-500",
  entregado: "bg-purple-500",
};

// Pastilla seleccionada del control segmentado: color pleno, para que se lea de
// un vistazo en qué estado está la ficha sin tener que buscar el badge.
export const ESTADO_ACTIVO_CLS = {
  borrador: "bg-gray-600 text-white shadow-sm",
  en_produccion: "bg-blue-600 text-white shadow-sm",
  terminado: "bg-green-600 text-white shadow-sm",
  entregado: "bg-purple-600 text-white shadow-sm",
};

// Tarjetas de resumen/filtro del listado de fichas guardadas (ver EstadoResumen).
export const ESTADO_RESUMEN = {
  borrador:      { label: "Borrador",      tone: "text-gray-500 dark:text-gray-300",     ring: "border-gray-200 dark:border-gris-600" },
  en_produccion: { label: "En producción", tone: "text-blue-700 dark:text-blue-300",     ring: "border-blue-200 dark:border-blue-800" },
  terminado:     { label: "Terminadas",    tone: "text-green-700 dark:text-green-300",   ring: "border-green-200 dark:border-green-800" },
  entregado:     { label: "Entregadas",    tone: "text-purple-700 dark:text-purple-300", ring: "border-purple-200 dark:border-purple-800" },
};

// "entregado" no se marca a mano como los demás: exige la firma de quién
// revisó y aprobó, la fecha de entrega, y admite placas y registro fotográfico
// (ver EntregaModal). "terminado" exige la firma del alistado (ver FirmaModal);
// las dos etapas viven en firmasFicha.js.
export const ESTADO_REQUIERE_ENTREGA = "entregado";

export const esEstadoValido = (estado) => ESTADOS_FICHA.includes(estado);

export const normalizarEstado = (estado) => (esEstadoValido(estado) ? estado : "borrador");
