import React from "react";
import { firmaDeEtapa } from "../../utils/firmasFicha";
import { aplicarResultadosLote, fichasAbiertas } from "./loteFichas";
import FirmaModal from "./FirmaModal";
import EntregaModal from "./EntregaModal";

// Cerrar varias órdenes con un solo formulario: firmar el alistado de todas y
// registrar un despacho único.
//
// El flujo vive aquí y no en la barra de selección porque hay dos sitios que lo
// necesitan con la misma letra pequeña: la barra que aparece al marcar órdenes
// sueltas (BarraLoteFichas) y el pedido completo de una orden de compra
// (OrdenCompraPanel), donde las fichas ya vienen dadas y no hay nada que marcar.
//
// "Firmar y entregar" encadena las dos etapas cuando hace falta —igual que el
// cambio de estado de una sola ficha (ver useEstadoFicha)—: si alguna de las
// órdenes nunca se alistó, primero pide esa firma para ellas y después el
// despacho de todas. Es el caso normal del pedido que se termina y se despacha
// el mismo día.
//
// Las órdenes ya entregadas nunca entran: reabrir una entrega cerrada es una
// corrección, y eso se hace de a una desde el detalle.
export default function useFlujoLote(fichas, { onAplicar, onListo } = {}) {
  const [flujo, setFlujo] = React.useState(null);

  const paraEntregar = React.useMemo(() => fichasAbiertas(fichas), [fichas]);
  // Firmar el alistado de una ficha que ya lo tiene es corregir evidencia
  // cerrada: en planta las reglas de Firestore lo rechazan, así que el lote
  // solo toma las que aún no están firmadas.
  const paraTerminar = React.useMemo(
    () => paraEntregar.filter((f) => !firmaDeEtapa(f, "alistado")),
    [paraEntregar]
  );

  const cerrarFlujo = () => setFlujo(null);

  const terminar = () => {
    if (paraTerminar.length === 0) return;
    setFlujo({ paso: "firma", fichas: paraTerminar });
  };

  const entregar = () => {
    if (paraEntregar.length === 0) return;
    const faltaFirma = paraEntregar.filter((f) => !firmaDeEtapa(f, "alistado"));
    if (faltaFirma.length > 0) {
      setFlujo({ paso: "firma", fichas: faltaFirma, siguiente: paraEntregar });
    } else {
      setFlujo({ paso: "entrega", fichas: paraEntregar });
    }
  };

  const firmaLista = (resultados) => {
    onAplicar?.(resultados);
    // Encadenado: la entrega sigue sobre las mismas fichas, ya con la firma del
    // alistado puesta, para que el formulario no la vuelva a pedir. Si alguna
    // firma falló —se cayó la red a mitad del lote— esa orden se queda fuera de
    // la entrega: cerrarla igual la dejaría entregada sin quién la alistó, y
    // eso sale en blanco en la ficha impresa.
    if (flujo?.siguiente) {
      const firmadas = aplicarResultadosLote(flujo.siguiente, resultados)
        .filter((f) => firmaDeEtapa(f, "alistado"));
      if (firmadas.length > 0) {
        setFlujo({ paso: "entrega", fichas: firmadas });
        return;
      }
    }
    setFlujo(null);
  };

  const entregaLista = (resultados) => {
    onAplicar?.(resultados);
    setFlujo(null);
    onListo?.();
  };

  const modales = (
    <>
      {flujo?.paso === "firma" && (
        <FirmaModal fichas={flujo.fichas} onClose={cerrarFlujo} onDone={firmaLista} />
      )}
      {flujo?.paso === "entrega" && (
        <EntregaModal fichas={flujo.fichas} onClose={cerrarFlujo} onDone={entregaLista} />
      )}
    </>
  );

  return { paraTerminar, paraEntregar, terminar, entregar, enCurso: Boolean(flujo), modales };
}
