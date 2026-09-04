import React from "react";
import toast from "react-hot-toast";
import { FaThLarge, FaTable, FaLayerGroup } from "react-icons/fa";
import { listarTodasFichasProduccion, eliminarFichaProduccion } from "../../utils/firebaseFichas";
import { getImpresionComponent } from "../fichas/impresionPorTipo";
import useEstadoFicha from "../fichas/useEstadoFicha";
import useSeleccionFichas from "../fichas/useSeleccionFichas";
import BarraLoteFichas from "../fichas/BarraLoteFichas";
import { aplicarResultadosLote } from "../fichas/loteFichas";
import EmptyState from "../ui/EmptyState";
import { useQuote } from "../../context/QuoteContext";
import OrdenesFiltros from "./OrdenesFiltros";
import OrdenesMetricas from "./OrdenesMetricas";
import OrdenesTablero from "./OrdenesTablero";
import OrdenesTabla from "./OrdenesTabla";
import { useNavigate } from "react-router-dom";
import OrdenDetallePanel from "./OrdenDetallePanel";
import OrdenCompraPanel from "./OrdenCompraPanel";
import NuevaFichaMenu from "./NuevaFichaMenu";
import AgruparEnOC from "./AgruparEnOC";
import {
  FILTROS_INICIALES, claveHoy, clientesDe, filtrar, indexar, metricas, ordenar,
} from "./ordenesFiltrar";
import { agruparPorOrdenCompra } from "./ordenesAgrupar";
import { clienteDeFicha } from "../../utils/clienteVinculo";
import { cotizacionDeFicha } from "../../utils/documentoVinculo";

// Pantalla de entrada de Producción: todas las órdenes de las seis líneas de
// producto, en un tablero por estado o en tabla. Es donde se ve qué hay en
// planta y donde se actúa sobre ello — cambiar estado, firmar el alistado,
// registrar la entrega, editar o borrar la ficha.
//
// Las pestañas de producto quedaron solo como formulario: mantener una lista
// por producto significaba seis copias del mismo listado, con peores filtros
// que este y sin forma de ver dos productos a la vez.
//
// El filtrado es en memoria a propósito: las 6 colecciones ya se traen enteras
// (tope de 200 por línea, ver listarTodasFichasProduccion) y cruzarlas en
// Firestore exigiría un índice por cada combinación de filtros.
//
// Las casillas de cada orden son para cerrar un pedido completo de una vez: un
// mismo cliente suele tener la puerta, el sello y el abrigo en órdenes
// distintas, y se alistan y despachan juntos (ver BarraLoteFichas).
//
// Cuando esas órdenes vienen de la misma orden de compra del cliente ni
// siquiera hay que buscarlas: se pintan como una sola tarjeta que las contiene
// (ver ordenesAgrupar.js). Se puede apagar con el interruptor "Agrupar por OC"
// para ver la lista plana de fichas.
//
// Y cuando no vienen juntas —la ficha entró antes de que llegara el número, o
// se tecleó distinto— se marcan igual que para firmarlas y se juntan con
// "Agrupar en OC", que les escribe la misma orden de compra a todas (ver
// AgruparEnOC.jsx).

const VISTAS = [
  { key: "tablero", label: "Tablero", icon: FaThLarge },
  { key: "tabla",   label: "Tabla",   icon: FaTable },
];

export default function OrdenesProduccionList({ onNuevaFicha, onEditarFicha }) {
  const { confirm } = useQuote();
  const navigate = useNavigate();
  const [fichas, setFichas] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [filtros, setFiltros] = React.useState(FILTROS_INICIALES);
  const [printFicha, setPrintFicha] = React.useState(null);
  const [detalleId, setDetalleId] = React.useState(null);
  const [grupoClave, setGrupoClave] = React.useState(null);
  const [vista, setVista] = React.useState(() => {
    try { return localStorage.getItem("ordenesVista") === "tabla" ? "tabla" : "tablero"; } catch { return "tablero"; }
  });
  const [agrupar, setAgrupar] = React.useState(() => {
    try { return localStorage.getItem("ordenesAgrupar") !== "no"; } catch { return true; }
  });

  // "Hoy" se congela por render de la lista: si se recalculara en cada tarjeta,
  // una sesión abierta a medianoche mostraría dos días distintos a la vez.
  const hoy = React.useMemo(() => claveHoy(), [fichas]);

  const cambiarVista = (key) => {
    setVista(key);
    try { localStorage.setItem("ordenesVista", key); } catch {}
  };

  const cambiarAgrupar = (valor) => {
    setAgrupar(valor);
    setGrupoClave(null);
    try { localStorage.setItem("ordenesAgrupar", valor ? "si" : "no"); } catch {}
  };

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      setFichas(await listarTodasFichasProduccion());
    } catch (e) {
      console.error(e);
      toast.error("No se pudieron cargar las órdenes");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => { load(); }, [load]);

  // Sin tipo fijo: la lista mezcla las seis colecciones y cada ficha trae el
  // suyo, así que el hook lo saca de la ficha.
  const { cambiarEstado, agregarNota, editarEntrega, editarFirma, modales } =
    useEstadoFicha(null, fichas, setFichas);

  const indexadas = React.useMemo(() => indexar(fichas), [fichas]);
  const clientes = React.useMemo(() => clientesDe(fichas), [fichas]);
  const resumen = React.useMemo(() => metricas(fichas, hoy), [fichas, hoy]);
  const visibles = React.useMemo(
    () => ordenar(filtrar(indexadas, filtros, hoy), filtros.ordenamiento),
    [indexadas, filtros, hoy]
  );

  // Los pedidos se arman sobre lo que ya se ve: si un filtro dejó fuera dos de
  // las tres fichas de la orden de compra, el grupo no puede decir que están.
  const entradas = React.useMemo(
    () => (agrupar ? agruparPorOrdenCompra(visibles) : visibles),
    [visibles, agrupar]
  );

  // La selección sigue siendo de fichas —el lote firma y entrega fichas—; el
  // grupo solo es la forma de marcarlas todas de un golpe.
  const seleccion = useSeleccionFichas(visibles, { modoInicial: true });

  const { estaSeleccionada: fichaSeleccionada, estanSeleccionadas, alternar, alternarVarias } = seleccion;

  const estaSeleccionada = React.useCallback(
    (e) => (e.esGrupo ? estanSeleccionadas(e.fichas) : fichaSeleccionada(e)),
    [estanSeleccionadas, fichaSeleccionada]
  );

  const alternarSeleccion = React.useCallback(
    (e) => (e.esGrupo ? alternarVarias(e.fichas) : alternar(e)),
    [alternarVarias, alternar]
  );

  const detalle = React.useMemo(
    () => fichas.find((f) => f.id === detalleId) || null,
    [fichas, detalleId]
  );

  // El pedido abierto se relee de las entradas en cada render para que refleje
  // al instante el cambio de estado o la firma de una de sus fichas.
  const grupo = React.useMemo(
    () => (grupoClave ? entradas.find((e) => e.esGrupo && e.clave === grupoClave) || null : null),
    [entradas, grupoClave]
  );

  const cambiarFiltros = (parcial) => setFiltros((p) => ({ ...p, ...parcial }));

  const eliminar = async (f) => {
    const ok = await confirm(
      `¿Eliminar la ficha de ${f.cliente || "este cliente"}? Esta acción no se puede deshacer.`
    );
    if (!ok) return;
    try {
      await eliminarFichaProduccion(f.tipo, f.id);
      setFichas((prev) => prev.filter((x) => x.id !== f.id));
      setDetalleId(null);
      toast.success("Ficha eliminada");
    } catch (err) {
      console.error(err);
      toast.error("Error eliminando ficha");
    }
  };

  const editar = (f) => {
    setDetalleId(null);
    setGrupoClave(null);
    onEditarFicha?.(f);
  };

  // Sumar una línea al pedido abierto. El formulario del producto arranca con
  // la orden de compra, el cliente y las fechas del pedido ya puestos: es la
  // única forma de que la ficha nueva caiga sola dentro del mismo grupo — si
  // hay que volver a teclear la OC, tarde o temprano se teclea distinto y la
  // ficha se queda suelta en el tablero.
  const agregarAlPedido = (tipo) => {
    if (!grupo) return;
    const [primera] = grupo.fichas;
    setGrupoClave(null);
    onNuevaFicha?.(tipo, {
      numeroOrdenCompra: grupo.numeroOrdenCompra,
      ...clienteDeFicha(primera),
      // Y la cotización del pedido: las líneas de una misma orden de compra
      // salieron de la misma cotización. Si la primera no tenía, no hereda
      // nada (conPrefillOrden ignora lo vacío).
      ...cotizacionDeFicha(primera),
      fechaOrden: primera.fechaOrden || "",
      fechaEntrega: primera.fechaEntrega || "",
    });
  };

  const ImpresionComponent = printFicha ? getImpresionComponent(printFicha.tipo) : null;
  const VistaActual = vista === "tabla" ? OrdenesTabla : OrdenesTablero;

  const accionesLista = {
    hoy,
    onAbrir: (e) => (e.esGrupo ? setGrupoClave(e.clave) : setDetalleId(e.id)),
    onCambiarEstado: cambiarEstado,
    onVerFicha: setPrintFicha,
    estaSeleccionada,
    onSeleccionar: alternarSeleccion,
    onSeleccionarTodas: (todas) => (todas ? seleccion.todas() : seleccion.limpiar()),
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex rounded-lg border border-gray-300 dark:border-gris-600 overflow-hidden">
          {VISTAS.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              type="button"
              onClick={() => cambiarVista(key)}
              aria-pressed={vista === key}
              className={`inline-flex items-center gap-1.5 px-3 h-9 text-sm font-medium transition ${
                vista === key
                  ? "bg-gray-900 text-white dark:bg-white dark:text-gray-900"
                  : "bg-white dark:bg-gris-800 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gris-700"
              }`}
            >
              <Icon className="text-[11px]" /> {label}
            </button>
          ))}
        </div>

        {/* Agrupar por orden de compra: una tarjeta por pedido del cliente en
            vez de una por ficha. Se puede apagar para ver la lista plana. */}
        <button
          type="button"
          onClick={() => cambiarAgrupar(!agrupar)}
          aria-pressed={agrupar}
          title="Juntar en una sola tarjeta las fichas de la misma orden de compra"
          className={`inline-flex items-center gap-1.5 px-3 h-9 rounded-lg border text-sm font-medium transition ${
            agrupar
              ? "border-gray-900 bg-gray-900 text-white dark:border-white dark:bg-white dark:text-gray-900"
              : "border-gray-300 dark:border-gris-600 bg-white dark:bg-gris-800 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gris-700"
          }`}
        >
          <FaLayerGroup className="text-[11px]" /> Agrupar por OC
        </button>

        <NuevaFichaMenu onElegir={(tipo) => onNuevaFicha?.(tipo)} />
      </div>

      <OrdenesMetricas metricas={resumen} filtros={filtros} onFiltrar={cambiarFiltros} />

      <OrdenesFiltros
        filtros={filtros}
        onCambiar={cambiarFiltros}
        onLimpiar={() => setFiltros(FILTROS_INICIALES)}
        clientes={clientes}
        conteoPorEstado={resumen.porEstado}
        total={fichas.length}
        mostrados={visibles.length}
        loading={loading}
        onRecargar={load}
      />

      {loading ? (
        <div className="text-sm opacity-60 py-10 text-center">Cargando órdenes…</div>
      ) : visibles.length === 0 ? (
        <div className="bg-white dark:bg-gris-800 border border-gray-200 dark:border-gris-700 rounded-xl p-4">
          <EmptyState
            icon="🔍"
            title={fichas.length === 0 ? "Aún no hay órdenes" : "Ninguna orden coincide"}
            description={
              fichas.length === 0
                ? "Crea la primera con el botón «Nueva ficha»."
                : "Prueba con otros filtros o limpia la búsqueda."
            }
          />
        </div>
      ) : vista === "tabla" ? (
        <div className="bg-white dark:bg-gris-800 border border-gray-200 dark:border-gris-700 rounded-xl p-4">
          <VistaActual ordenes={entradas} {...accionesLista} />
        </div>
      ) : (
        <VistaActual ordenes={entradas} {...accionesLista} />
      )}

      <BarraLoteFichas
        fichas={seleccion.seleccionadas}
        onAplicar={(resultados) => setFichas((prev) => aplicarResultadosLote(prev, resultados))}
        onLimpiar={seleccion.limpiar}
        extras={
          <AgruparEnOC
            fichas={seleccion.seleccionadas}
            onAplicar={(resultados) => setFichas((prev) => aplicarResultadosLote(prev, resultados))}
            onListo={seleccion.limpiar}
          />
        }
      />

      {/* El pedido va antes que el detalle a propósito: los dos son paneles a
          la misma altura, así que al entrar a una ficha desde el pedido el
          detalle queda encima y al cerrarlo se vuelve al pedido. */}
      <OrdenCompraPanel
        grupo={grupo}
        tapado={Boolean(detalle || printFicha)}
        onCerrar={() => setGrupoClave(null)}
        onAbrirFicha={(f) => setDetalleId(f.id)}
        onVerFicha={setPrintFicha}
        onCambiarEstado={cambiarEstado}
        onAgregarFicha={agregarAlPedido}
        onAplicarLote={(resultados) => setFichas((prev) => aplicarResultadosLote(prev, resultados))}
      />

      <OrdenDetallePanel
        ficha={detalle}
        onCerrar={() => setDetalleId(null)}
        onVerCotizacion={(f) => navigate("/historial", { state: { numeroCotizacion: f.cotizacionNumero || "" } })}
        onCambiarEstado={cambiarEstado}
        onAgregarNota={agregarNota}
        onEditarEntrega={editarEntrega}
        onEditarFirma={editarFirma}
        onVerFicha={() => detalle && setPrintFicha(detalle)}
        onEditar={() => detalle && editar(detalle)}
        onEliminar={() => detalle && eliminar(detalle)}
      />

      {printFicha && ImpresionComponent && (
        <ImpresionComponent
          ficha={printFicha}
          numero={printFicha.ordenProduccion}
          onClose={() => setPrintFicha(null)}
        />
      )}

      {modales}
    </div>
  );
}
