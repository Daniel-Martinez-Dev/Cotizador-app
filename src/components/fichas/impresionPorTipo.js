import FichaImpresionDivision from "../FichaImpresionDivision";
import FichaImpresionSello from "../FichaImpresionSello";
import FichaImpresionAbrigoRetractil from "../FichaImpresionAbrigoRetractil";
import FichaImpresionPuertaRapida from "../FichaImpresionPuertaRapida";
import FichaImpresionGeneral from "../FichaImpresionGeneral";

// Ficha imprimible que corresponde a cada tipo de orden. Las claves son las
// mismas de FICHA_TIPOS (utils/firebaseFichas.js). Lo usan el listado de
// órdenes del panel de producción y el detalle de ficha del panel de planta.
export const IMPRESION_POR_TIPO = {
  division:        FichaImpresionDivision,
  sello:           FichaImpresionSello,
  abrigoretractil: FichaImpresionAbrigoRetractil,
  puertarapida:    FichaImpresionPuertaRapida,
  general:         FichaImpresionGeneral,
};

export function getImpresionComponent(tipo) {
  return IMPRESION_POR_TIPO[tipo] || null;
}
