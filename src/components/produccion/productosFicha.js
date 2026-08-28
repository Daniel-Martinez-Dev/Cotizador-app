import { FaSnowflake, FaWarehouse, FaExpandArrowsAlt, FaBolt, FaThLarge, FaClipboardList } from "react-icons/fa";
import { FICHA_TIPOS } from "../../utils/firebaseFichas";

// Ícono y color por línea de producto, para el menú de "Nueva ficha", los
// filtros y las tarjetas del tablero. Vive aquí y no en FICHA_TIPOS porque ese
// registro es de acceso a datos y no debería depender de react-icons.
//
// `tab` es la clave de la pestaña de ProduccionPage, que no siempre coincide
// con el tipo de ficha: las fichas básicas se guardan como "general" pero su
// pestaña se llama "fichas".
const META = {
  division:        { icon: FaSnowflake,        tab: "division",        tono: "text-sky-600 dark:text-sky-400" },
  sello:           { icon: FaWarehouse,        tab: "sello",           tono: "text-amber-600 dark:text-amber-400" },
  abrigoretractil: { icon: FaExpandArrowsAlt,  tab: "abrigoretractil", tono: "text-violet-600 dark:text-violet-400" },
  puertarapida:    { icon: FaBolt,             tab: "puertarapida",    tono: "text-emerald-600 dark:text-emerald-400" },
  puertaseccional: { icon: FaThLarge,          tab: "puertaseccional", tono: "text-rose-600 dark:text-rose-400" },
  general:         { icon: FaClipboardList,    tab: "fichas",          tono: "text-gray-500 dark:text-gray-400" },
};

export const PRODUCTOS = Object.entries(FICHA_TIPOS).map(([tipo, cfg]) => ({
  tipo,
  label: cfg.label,
  ...META[tipo],
}));

export const productoDe = (tipo) => PRODUCTOS.find((p) => p.tipo === tipo) || null;

// Pestaña de ProduccionPage donde se crea o edita una ficha de este tipo.
export const tabDeTipo = (tipo) => META[tipo]?.tab || "ordenes";
