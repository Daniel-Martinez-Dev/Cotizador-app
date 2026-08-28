import { FichaDetalle as DivisionDetalle } from "../DivisionTermicaFicha";
import { FichaDetalleSello } from "../SelloAndenFicha";
import { FichaDetalleAbrigoRetractil } from "../AbrigoRetractilFicha";
import { FichaDetalle as PuertaRapidaDetalle } from "../PuertaRapidaFicha";
import { FichaDetalle as PuertaSeccionalDetalle } from "../PuertaSeccionalFicha";
import { FichaBasicaDetalle } from "../FichaBasicaFicha";

// El detalle expandido de cada producto — medidas de corte, consumo, opciones —
// vive en su propia línea de producto porque es lo único que no se puede
// generalizar: una división térmica se describe con panel/icopor/funda y una
// puerta rápida con otra cosa.
//
// El listado de órdenes lo elige por tipo, igual que ya hace `impresionPorTipo`
// con la ficha imprimible. Los seis comparten la misma firma de props, así que
// desde fuera se usan sin saber cuál es.
const DETALLES = {
  division: DivisionDetalle,
  sello: FichaDetalleSello,
  abrigoretractil: FichaDetalleAbrigoRetractil,
  puertarapida: PuertaRapidaDetalle,
  puertaseccional: PuertaSeccionalDetalle,
  general: FichaBasicaDetalle,
};

export function getDetalleComponent(tipo) {
  return DETALLES[tipo] || null;
}

// Resumen de una línea para la tarjeta del tablero: lo que distingue esta orden
// de otra del mismo cliente. Devuelve "" cuando el producto no tiene medidas
// que quepan en una línea.
export function resumenCorto(f) {
  if (!f) return "";
  const mm = (a, b) => (a && b ? `${a}×${b}` : "");
  switch (f.tipo) {
    case "division":        return mm(f.anchoVehiculo, f.altoVehiculo);
    case "sello":           return mm(f.anchoVano, f.altoVano);
    case "abrigoretractil": return mm(f.ancho, f.alto);
    case "puertarapida":    return mm(f.anchoVano, f.altoVano);
    case "puertaseccional": return mm(f.anchoVano, f.altoVano);
    case "general":         return (f.items || []).length ? `${f.items.length} ítem(s)` : "";
    default:                return "";
  }
}
