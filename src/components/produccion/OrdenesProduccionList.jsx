import React from "react";
import toast from "react-hot-toast";
import { FaThLarge, FaTable } from "react-icons/fa";
import { listarTodasFichasProduccion, eliminarFichaProduccion } from "../../utils/firebaseFichas";
import { getImpresionComponent } from "../fichas/impresionPorTipo";
import useEstadoFicha from "../fichas/useEstadoFicha";
import EmptyState from "../ui/EmptyState";
import { useQuote } from "../../context/QuoteContext";
import OrdenesFiltros from "./OrdenesFiltros";
import OrdenesMetricas from "./OrdenesMetricas";
import OrdenesTablero from "./OrdenesTablero";
import OrdenesTabla from "./OrdenesTabla";
import OrdenDetallePanel from "./OrdenDetallePanel";
import NuevaFichaMenu from "./NuevaFichaMenu";
import {
  FILTROS_INICIALES, claveHoy, clientesDe, filtrar, indexar, metricas, ordenar,
} from "./ordenesFiltrar";

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

const VISTAS = [
  { key: "tablero", label: "Tablero", icon: FaThLarge },
  { key: "tabla",   label: "Tabla",   icon: FaTable },
];

export default function OrdenesProduccionList({ onNuevaFicha, onEditarFicha }) {
  const { confirm } = useQuote();
  const [fichas, setFichas] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [filtros, setFiltros] = React.useState(FILTROS_INICIALES);
  const [printFicha, setPrintFicha] = React.useState(null);
  const [detalleId, setDetalleId] = React.useState(null);
  const [vista, setVista] = React.useState(() => {
    try { return localStorage.getItem("ordenesVista") === "tabla" ? "tabla" : "tablero"; } catch { return "tablero"; }
  });

  // "Hoy" se congela por render de la lista: si se recalculara en cada tarjeta,
  // una sesión abierta a medianoche mostraría dos días distintos a la vez.
  const hoy = React.useMemo(() => claveHoy(), [fichas]);

  const cambiarVista = (key) => {
    setVista(key);
    try { localStorage.setItem("ordenesVista", key); } catch {}
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

  const detalle = React.useMemo(
    () => fichas.find((f) => f.id === detalleId) || null,
    [fichas, detalleId]
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
    onEditarFicha?.(f);
  };

  const ImpresionComponent = printFicha ? getImpresionComponent(printFicha.tipo) : null;
  const VistaActual = vista === "tabla" ? OrdenesTabla : OrdenesTablero;

  const accionesLista = {
    hoy,
    onAbrir: (f) => setDetalleId(f.id),
    onCambiarEstado: cambiarEstado,
    onVerFicha: setPrintFicha,
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
          <VistaActual ordenes={visibles} {...accionesLista} />
        </div>
      ) : (
        <VistaActual ordenes={visibles} {...accionesLista} />
      )}

      <OrdenDetallePanel
        ficha={detalle}
        onCerrar={() => setDetalleId(null)}
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
