import React from "react";
import toast from "react-hot-toast";
import { FaTimes, FaLayerGroup, FaExclamationTriangle } from "react-icons/fa";
import { useAuth } from "../../context/AuthContext";
import { asignarOrdenCompraFicha } from "../../utils/firebaseFichas";
import { claveFicha } from "../fichas/loteFichas";
import ListaFichasLote from "../fichas/ListaFichasLote";
import { fichasSinLaOC, planAgruparEnOC } from "./ordenesAgrupar";

// Juntar en un pedido las órdenes marcadas en la lista.
//
// Es la otra cosa que se hace con la selección de siempre: además de firmarlas
// y despacharlas de una vez, decirle a la app que van juntas. El tablero agrupa
// por el número de orden de compra del cliente (ver ordenesAgrupar.js), así que
// juntarlas es escribirles ese número a todas — y eso es exactamente lo que
// hace este botón, sin abrir seis veces el formulario del producto.
//
// Vive en producción y no en la barra del lote porque la planta no puede: sus
// reglas de Firestore solo la dejan tocar notas, estado, firmas y entrega.

const inputCls = "mt-1 w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gris-600 bg-white dark:bg-gris-900 text-sm";
const labelCls = "text-xs font-medium text-gray-600 dark:text-gray-300";
const avisoCls = "flex items-start gap-2 rounded-lg px-2.5 py-2 text-[11px]";

export default function AgruparEnOC({ fichas, onAplicar, onListo }) {
  const { user, profile } = useAuth();
  const lista = React.useMemo(() => (fichas || []).filter(Boolean), [fichas]);
  const plan = React.useMemo(() => planAgruparEnOC(lista), [lista]);

  const [abierto, setAbierto] = React.useState(false);
  const [numero, setNumero] = React.useState("");
  const [guardando, setGuardando] = React.useState(false);
  const [escribiendo, setEscribiendo] = React.useState(null);

  const yo = profile?.displayName || user?.displayName || user?.email || "";

  // El número que ya traen las fichas entra puesto: sumar una ficha suelta a un
  // pedido que ya existe es el caso corriente, y volver a teclear la OC es como
  // se tecleó distinto la primera vez.
  const abrir = () => {
    setNumero(plan.sugerida);
    setAbierto(true);
  };

  const confirmar = async () => {
    const valor = numero.trim();
    if (!valor) return toast.error("Escribe el número de la orden de compra");

    const pendientes = fichasSinLaOC(lista, valor);
    if (pendientes.length === 0) {
      setAbierto(false);
      toast.success("Las órdenes ya estaban en esa orden de compra");
      return;
    }

    setGuardando(true);
    const resultados = [];
    const fallidas = [];

    // De a una y en serie, como el resto de los lotes: son documentos de
    // colecciones distintas y así se sabe cuál quedó sin escribir si se cae la
    // red a mitad del pedido.
    for (const [i, f] of pendientes.entries()) {
      setEscribiendo({ actual: i + 1, total: pendientes.length });
      try {
        const { nota } = await asignarOrdenCompraFicha(f.tipo, f.id, {
          numeroOrdenCompra: valor,
          anterior: f.numeroOrdenCompra,
          autorNombre: yo,
          autorUid: user?.uid || "",
        });
        resultados.push({
          clave: claveFicha(f),
          id: f.id,
          nota,
          parche: { numeroOrdenCompra: valor },
        });
      } catch (e) {
        console.error(e);
        fallidas.push(f);
      }
    }

    setGuardando(false);
    setEscribiendo(null);

    if (fallidas.length > 0) {
      toast.error(`No se pudo agrupar ${fallidas.length} de ${pendientes.length} órdenes`);
    }
    if (resultados.length === 0) return; // el formulario queda abierto para reintentar
    if (fallidas.length === 0) toast.success(`${lista.length} órdenes en la OC ${valor}`);

    // Primero se cierra y después se avisa: limpiar la selección desmonta la
    // barra del lote, y con ella este formulario.
    setAbierto(false);
    onAplicar?.(resultados);
    onListo?.();
  };

  if (lista.length === 0) return null;

  return (
    <>
      <button
        type="button"
        onClick={abrir}
        title="Marcar estas órdenes como un mismo pedido del cliente"
        className="inline-flex items-center justify-center gap-1.5 min-h-[40px] px-3 rounded-lg border border-gray-300 dark:border-gris-600 bg-white dark:bg-gris-800 text-gray-700 dark:text-gray-200 text-xs font-semibold hover:bg-gray-50 dark:hover:bg-gris-700"
      >
        <FaLayerGroup className="text-[11px]" /> Agrupar en OC
      </button>

      {abierto && (
        <div className="fixed inset-0 z-[1000]">
          <div className="absolute inset-0 bg-black/50" onClick={guardando ? undefined : () => setAbierto(false)} />
          <div className="absolute inset-x-0 bottom-0 sm:inset-0 sm:flex sm:items-center sm:justify-center sm:p-4">
            <div className="w-full sm:max-w-lg bg-white dark:bg-gris-800 rounded-t-2xl sm:rounded-2xl border border-gray-200 dark:border-gris-700 shadow-xl max-h-[90vh] overflow-hidden flex flex-col">

              <div className="p-4 border-b border-gray-200 dark:border-gris-700 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-sm font-semibold inline-flex items-center gap-2">
                    <FaLayerGroup className="text-gray-500 dark:text-gray-400" />
                    Agrupar {lista.length} orden{lista.length === 1 ? "" : "es"} en una OC
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                    Quedan como un solo pedido del cliente
                  </div>
                </div>
                <button type="button" onClick={() => setAbierto(false)} disabled={guardando}
                  className="h-8 w-8 shrink-0 rounded border border-gray-300 dark:border-gris-600 bg-gray-50 dark:bg-gris-700 flex items-center justify-center disabled:opacity-40">
                  <FaTimes className="text-sm" />
                </button>
              </div>

              <div className="p-4 overflow-y-auto flex-1 space-y-4">
                <div>
                  <div className={`${labelCls} mb-1.5`}>Se agrupan estas órdenes</div>
                  <ListaFichasLote fichas={lista} />
                </div>

                <div>
                  <label className={labelCls} htmlFor="agrupar-oc">Número de orden de compra *</label>
                  <input
                    id="agrupar-oc"
                    value={numero}
                    onChange={(e) => setNumero(e.target.value)}
                    disabled={guardando || !plan.mismoCliente}
                    placeholder="4500-123456"
                    autoFocus
                    className={`${inputCls} font-mono`}
                  />
                  <p className="mt-1.5 text-[11px] text-gray-500 dark:text-gray-400">
                    Es el número con el que el cliente mandó el pedido. Las órdenes que lo
                    comparten salen como una sola tarjeta en el tablero y se firman y
                    despachan de una vez.
                  </p>
                </div>

                {/* Un pedido es de un solo cliente: la misma OC en dos clientes
                    distintos seguiría saliendo como dos tarjetas. */}
                {!plan.mismoCliente && (
                  <div className={`${avisoCls} bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300`}>
                    <FaExclamationTriangle className="mt-0.5 shrink-0" />
                    <span>
                      Hay órdenes de clientes distintos ({plan.clientes.join(", ")}). Un pedido es
                      de un solo cliente: deja marcadas solo las de uno.
                    </span>
                  </div>
                )}

                {plan.mismoCliente && plan.previas.length > 1 && (
                  <div className={`${avisoCls} bg-amber-50 dark:bg-amber-900/20 text-amber-800 dark:text-amber-300`}>
                    <FaExclamationTriangle className="mt-0.5 shrink-0" />
                    <span>
                      Vienen de {plan.previas.length} órdenes de compra distintas
                      ({plan.previas.join(", ")}). Todas quedan con el número que escribas.
                    </span>
                  </div>
                )}
              </div>

              <div className="p-4 border-t border-gray-200 dark:border-gris-700 flex gap-2">
                <button type="button" onClick={() => setAbierto(false)} disabled={guardando}
                  className="flex-1 py-2.5 rounded-lg border border-gray-300 dark:border-gris-600 bg-gray-50 dark:bg-gris-700 text-sm font-medium disabled:opacity-50">
                  Cancelar
                </button>
                <button type="button" onClick={confirmar}
                  disabled={guardando || !numero.trim() || !plan.mismoCliente}
                  className="flex-1 py-2.5 rounded-lg bg-gray-900 hover:bg-gray-800 dark:bg-white dark:text-gray-900 dark:hover:bg-gray-100 disabled:opacity-50 text-white text-sm font-semibold">
                  {escribiendo
                    ? `Agrupando ${escribiendo.actual}/${escribiendo.total}…`
                    : guardando ? "Guardando…" : `Agrupar (${lista.length})`}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
