import React from "react";
import { FaTimes, FaCheckCircle, FaTruck, FaLayerGroup } from "react-icons/fa";
import { firmaDeEtapa } from "../../utils/firmasFicha";
import { aplicarResultadosLote, fichasAbiertas } from "./loteFichas";
import FirmaModal from "./FirmaModal";
import EntregaModal from "./EntregaModal";

// Barra de acciones del lote: aparece cuando hay órdenes seleccionadas y cierra
// todas de una vez con un solo formulario.
//
// "Firmar y entregar" encadena las dos etapas cuando hace falta —igual que el
// cambio de estado de una sola ficha (ver useEstadoFicha)—: si alguna de las
// órdenes nunca se alistó, primero pide esa firma para ellas y después el
// despacho de todas. Es el caso normal del pedido que se termina y se despacha
// el mismo día.
//
// Las órdenes ya entregadas nunca entran: reabrir una entrega cerrada es una
// corrección, y eso se hace de a una desde el detalle.
export default function BarraLoteFichas({ fichas, onAplicar, onLimpiar, anclaje = "bottom-0" }) {
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
    onLimpiar?.();
  };

  return (
    <>
      {fichas.length > 0 && !flujo && (
        <div className={`fixed inset-x-0 ${anclaje} z-[60] px-3 pb-3 pointer-events-none`}>
          <div className="pointer-events-auto mx-auto max-w-3xl rounded-xl border border-gray-300 dark:border-gris-600 bg-white dark:bg-gris-800 shadow-2xl p-2.5 flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-2 text-xs font-semibold px-1.5">
              <FaLayerGroup className="text-gray-500 dark:text-gray-400" />
              {fichas.length} orden{fichas.length === 1 ? "" : "es"}
            </span>

            <button
              type="button"
              onClick={onLimpiar}
              aria-label="Quitar selección"
              className="h-8 w-8 inline-flex items-center justify-center rounded-lg border border-gray-300 dark:border-gris-600 text-gray-500 dark:text-gray-400"
            >
              <FaTimes className="text-xs" />
            </button>

            <div className="ml-auto flex flex-1 sm:flex-none gap-2">
              {paraTerminar.length > 0 && (
                <button
                  type="button"
                  onClick={terminar}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 min-h-[40px] px-3 rounded-lg bg-green-600 hover:bg-green-500 text-white text-xs font-semibold"
                >
                  <FaCheckCircle className="text-[11px]" /> Firmar y terminar ({paraTerminar.length})
                </button>
              )}
              {paraEntregar.length > 0 && (
                <button
                  type="button"
                  onClick={entregar}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 min-h-[40px] px-3 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold"
                >
                  <FaTruck className="text-[11px]" /> Firmar y entregar ({paraEntregar.length})
                </button>
              )}
            </div>

            {paraEntregar.length === 0 && (
              <span className="text-[11px] text-gray-500 dark:text-gray-400 w-full">
                Las órdenes ya entregadas se corrigen una por una desde su detalle.
              </span>
            )}
          </div>
        </div>
      )}

      {flujo?.paso === "firma" && (
        <FirmaModal fichas={flujo.fichas} onClose={cerrarFlujo} onDone={firmaLista} />
      )}

      {flujo?.paso === "entrega" && (
        <EntregaModal fichas={flujo.fichas} onClose={cerrarFlujo} onDone={entregaLista} />
      )}
    </>
  );
}
