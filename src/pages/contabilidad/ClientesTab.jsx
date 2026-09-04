import React from "react";
import Badge from "../../components/ui/Badge";
import Button from "../../components/ui/Button";
import EmptyState from "../../components/ui/EmptyState";
import { formatCOP } from "../inventario/inventarioUtils";
import { Aviso, Buscador, Campo, Card, Casilla, InputDinero, InputNumero, KPI, Money, Select, Tabla, Td, Th, TiraTotales, Tr } from "./ui";
import { Anillo, BarrasMes, BarrasRanking, Medidor } from "./graficas";
import ClienteDetalle from "./ClienteDetalle";
import VincularClientes from "./VincularClientes";
import { liquidarDocumentos } from "../../modules/contabilidad/cartera";
import { anioDe, hoyISO, periodoContable } from "../../modules/contabilidad/calculos";
import {
  ETIQUETA_NIVEL,
  METAS_DISTRIBUIDOR,
  NIVEL_LISTO,
  ORDENES,
  TONO_NIVEL,
  candidatosDistribuidor,
  construirPanelClientes,
  ejeMeses,
  filtrarClientes,
  nombreMes,
  ordenarClientes,
  rankingProductos,
  seriePorMes,
  serieSobreEje,
  totalesPanel,
} from "../../modules/contabilidad/clientes";
import { listarDocumentos, listarPagos } from "../../utils/firebaseContabilidad";

// Tablero de clientes.
//
// La sección responde por año porque así se declara y así se cobra, pero un
// cliente no se mide en un año: se mide en el tiempo que lleva comprando. Por
// eso esta pestaña trae su propio histórico completo —son ~340 facturas, una
// sola lectura— y deja elegir el periodo aparte del selector de la cabecera.
//
// Todo lo de aquí se calcula al vuelo desde las facturas y los abonos: no hay
// ni un dato de cliente guardado que pueda quedar desactualizado, que es lo que
// pasaba con la hoja de resumen del Excel.

const fechaCorta = (iso) => (iso ? `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(2, 4)}` : "—");

const TOPE_RANKING = 8;

// Cuántos candidatos se muestran antes de "ver todos". Seis caben sin que la
// lista de clientes quede fuera de pantalla.
const TOPE_CANDIDATOS = 6;

const anioDePago = (pago) => Math.trunc(Number(pago?.periodoContable)) || anioDe(pago?.fecha);

function ChipFiltro({ children, onQuitar }) {
  return (
    <button
      type="button"
      onClick={onQuitar}
      className="inline-flex items-center gap-1.5 rounded-full bg-gray-100 dark:bg-gris-700 px-2.5 py-1 text-[11px] font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gris-600"
    >
      {children}
      <span aria-hidden="true">✕</span>
      <span className="sr-only">Quitar filtro</span>
    </button>
  );
}

/**
 * Panel de candidatos a distribuidor de un producto.
 *
 * El puntaje es discutible a propósito: las metas se editan aquí mismo, porque
 * el volumen que justifica una distribución no es el mismo para una puerta
 * rápida que para un sello de andén.
 */
function PanelDistribuidor({ clientes, productos, producto, onProducto, metas, onMetas, onAbrir }) {
  const [ajustando, setAjustando] = React.useState(false);
  const [todos, setTodos] = React.useState(false);

  const candidatos = React.useMemo(
    () => candidatosDistribuidor(clientes, producto, metas),
    [clientes, producto, metas]
  );
  const visibles = todos ? candidatos : candidatos.slice(0, TOPE_CANDIDATOS);
  const listos = candidatos.filter((c) => c.evaluacion.nivel === NIVEL_LISTO).length;

  const cambiarMeta = (campo, valor) => onMetas({ ...metas, [campo]: Math.max(0, Number(valor) || 0) });

  return (
    <Card padding="p-3.5" className="grid gap-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Candidatos a distribuidor</h3>
          <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
            Quién compra suficiente de un producto, vuelve por él y paga. El precio de distribuidor es un 13 % menos
            que el de cliente final, así que el puntaje pesa el volumen contra el comportamiento de pago.
          </p>
        </div>
        <Button size="sm" variant="secondary" onClick={() => setAjustando((v) => !v)} aria-expanded={ajustando}>
          {ajustando ? "Listo" : "Ajustar criterios"}
        </Button>
      </div>

      <Select value={producto} onChange={(e) => onProducto(e.target.value)} aria-label="Producto a distribuir">
        {productos.map((p) => (
          <option key={p.producto} value={p.producto}>
            {p.producto} — {formatCOP(p.valor)}
          </option>
        ))}
      </Select>

      {ajustando && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 rounded-lg bg-gray-50 dark:bg-gris-900/50 p-2.5">
          <Campo label="Compras del producto">
            <InputDinero value={metas.valor} onChange={(v) => cambiarMeta("valor", v)} />
          </Campo>
          <Campo label="Facturas del producto">
            <InputNumero value={metas.facturas} onChange={(e) => cambiarMeta("facturas", e.target.value)} />
          </Campo>
          <Campo label="Meses con compras">
            <InputNumero value={metas.meses} onChange={(e) => cambiarMeta("meses", e.target.value)} />
          </Campo>
          <Campo label="Mora máxima (días)">
            <InputNumero value={metas.moraMaxima} onChange={(e) => cambiarMeta("moraMaxima", e.target.value)} />
          </Campo>
          <Campo label="Peso del producto (%)">
            <InputNumero value={metas.participacion} onChange={(e) => cambiarMeta("participacion", e.target.value)} />
          </Campo>
          <div className="flex items-end">
            <Button size="sm" variant="secondary" onClick={() => onMetas(METAS_DISTRIBUIDOR)} className="w-full">
              Volver a lo de fábrica
            </Button>
          </div>
        </div>
      )}

      {!candidatos.length ? (
        <p className="text-xs text-gray-500 dark:text-gray-400 py-3 text-center">
          Ningún cliente compró este producto en el periodo.
        </p>
      ) : (
        <>
          <div className="text-[11px] text-gray-500 dark:text-gray-400">
            {candidatos.length} cliente{candidatos.length === 1 ? "" : "s"} compran este producto
            {listos > 0 && <> · <strong className="text-emerald-600 dark:text-emerald-400">{listos} listo{listos === 1 ? "" : "s"}</strong></>}
          </div>
          <ul className="grid gap-1.5">
            {visibles.map(({ cliente, evaluacion }) => (
              <li key={cliente.clave}>
                <button
                  type="button"
                  onClick={() => onAbrir(cliente)}
                  className="w-full text-left rounded-lg border border-gray-200 dark:border-gris-700 px-2.5 py-2 hover:bg-gray-50 dark:hover:bg-gris-700/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-trafico/60"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-gray-900 dark:text-white truncate">{cliente.nombre}</div>
                      <div className="text-[10px] text-gray-500 dark:text-gray-400">
                        {formatCOP(evaluacion.valor)} · {evaluacion.facturas} factura{evaluacion.facturas === 1 ? "" : "s"} ·{" "}
                        {evaluacion.participacion} % de sus compras
                      </div>
                    </div>
                    <Badge tone={TONO_NIVEL[evaluacion.nivel]}>{ETIQUETA_NIVEL[evaluacion.nivel]}</Badge>
                  </div>
                  <Medidor
                    puntaje={evaluacion.puntaje}
                    tono={TONO_NIVEL[evaluacion.nivel]}
                    etiqueta={evaluacion.reparos[0] || "Cumple todos los criterios"}
                    className="mt-1.5"
                  />
                </button>
              </li>
            ))}
          </ul>
          {candidatos.length > TOPE_CANDIDATOS && (
            <Button size="sm" variant="secondary" onClick={() => setTodos((v) => !v)}>
              {todos ? "Ver solo los primeros" : `Ver los ${candidatos.length}`}
            </Button>
          )}
        </>
      )}
    </Card>
  );
}

export default function ClientesTab({ documentos, pagos, empresas, cargando, anio, recargar, onEditar, onVerPagos }) {
  const [vista, setVista] = React.useState("tablero");
  const [periodo, setPeriodo] = React.useState(""); // "" = todo el histórico
  const [busqueda, setBusqueda] = React.useState("");
  const [orden, setOrden] = React.useState("facturado");
  const [soloConSaldo, setSoloConSaldo] = React.useState(false);
  const [mes, setMes] = React.useState("");
  const [producto, setProducto] = React.useState("");
  const [abierto, setAbierto] = React.useState("");
  const [metas, setMetas] = React.useState(METAS_DISTRIBUIDOR);
  const [historico, setHistorico] = React.useState({ cargando: true, error: null, listo: false, documentos: [], pagos: [] });

  // El histórico se trae una sola vez y aparte del año de la cabecera. Sin él,
  // "ventas totales" de un cliente serían las de un año y la frecuencia de
  // compra no se podría medir.
  const traerHistorico = React.useCallback(async () => {
    setHistorico((p) => ({ ...p, cargando: true, error: null }));
    try {
      const [docs, abonos] = await Promise.all([listarDocumentos({}), listarPagos({})]);
      setHistorico({ cargando: false, error: null, listo: true, documentos: docs, pagos: abonos });
    } catch (e) {
      console.error("No se pudo traer el histórico de clientes", e);
      setHistorico({ cargando: false, error: e, listo: false, documentos: [], pagos: [] });
    }
  }, []);

  React.useEffect(() => { traerHistorico(); }, [traerHistorico]);

  // Mientras llega el histórico —y si falla— la pestaña funciona con lo que la
  // sección ya tiene cargado del año. Es un tablero menos rico, pero se ve al
  // instante: esperar en blanco a una segunda lectura para mostrar lo que ya
  // está en memoria es el tipo de espera que hace que nadie entre a la pantalla.
  //
  // Va memorizado y no calculado al vuelo porque de aquí cuelga la liquidación
  // de todo el histórico: si la fuente cambiara de identidad en cada render, se
  // volverían a liquidar 340 documentos con cada letra que se escriba en el
  // buscador.
  const fuente = React.useMemo(
    () => (historico.listo
      ? { documentos: historico.documentos, pagos: historico.pagos }
      : { documentos: documentos || [], pagos: pagos || [] }),
    [historico, documentos, pagos]
  );

  const anios = React.useMemo(() => {
    const vistos = new Set(fuente.documentos.map((d) => periodoContable(d)).filter(Boolean));
    return [...vistos].sort((a, b) => b - a);
  }, [fuente.documentos]);

  const enPeriodo = React.useMemo(() => {
    if (!periodo) return fuente;
    const a = Number(periodo);
    return {
      documentos: fuente.documentos.filter((d) => periodoContable(d) === a),
      pagos: fuente.pagos.filter((p) => anioDePago(p) === a),
    };
  }, [fuente, periodo]);

  // Una sola liquidación para las dos vistas de la pestaña: el tablero y la de
  // vincular tienen que estar mirando exactamente los mismos documentos.
  const { liquidadosPeriodo, panel } = React.useMemo(() => {
    const hoy = hoyISO();
    const liquidados = liquidarDocumentos(enPeriodo.documentos, enPeriodo.pagos, hoy);
    return { liquidadosPeriodo: liquidados, panel: construirPanelClientes(liquidados, enPeriodo.pagos, empresas, { hoy }) };
  }, [enPeriodo, empresas]);

  // El eje sale del panel completo y no de lo filtrado: si cambiara con cada
  // filtro, las barras saltarían de escala y no se podrían comparar dos
  // clientes seguidos.
  const eje = React.useMemo(
    () => ejeMeses(panel.porMes, { anio: periodo ? Number(periodo) : null }),
    [panel.porMes, periodo]
  );

  const filtrados = React.useMemo(
    () => ordenarClientes(filtrarClientes(panel.clientes, { busqueda, producto, mes, soloConSaldo }), orden),
    [panel.clientes, busqueda, producto, mes, soloConSaldo, orden]
  );

  const totales = React.useMemo(() => totalesPanel(filtrados), [filtrados]);
  const productosFiltrados = React.useMemo(() => rankingProductos(filtrados), [filtrados]);
  const serie = React.useMemo(() => {
    const porMes = Object.fromEntries(seriePorMes(filtrados).map((p) => [p.mes, p.valor]));
    return serieSobreEje(eje, porMes);
  }, [filtrados, eje]);

  // El producto del panel de distribuidores es el mismo que filtra la tabla:
  // un tablero con dos selectores de producto que no se hablan confunde más de
  // lo que ayuda. Sin elegir ninguno se toma el que más vende.
  const productoElegido = producto || panel.productos[0]?.producto || "";
  const abiertoCliente = panel.clientes.find((c) => c.clave === abierto) || null;

  const sinVincular = React.useMemo(
    () => enPeriodo.documentos.filter((d) => !d.empresaId).length,
    [enPeriodo.documentos]
  );

  const etiquetaPeriodo = periodo ? `Año ${periodo}` : historico.listo ? "Todo el histórico" : `Año ${anio}`;
  const hayFiltro = Boolean(busqueda || producto || mes || soloConSaldo);
  const limpiar = () => { setBusqueda(""); setProducto(""); setMes(""); setSoloConSaldo(false); };

  if (vista === "vincular") {
    return (
      <VincularClientes
        liquidados={liquidadosPeriodo}
        empresas={empresas}
        cargando={historico.cargando}
        anio={anio}
        periodo={etiquetaPeriodo}
        recargar={() => { recargar?.(); traerHistorico(); }}
        onVolver={() => setVista("tablero")}
      />
    );
  }

  if (!panel.clientes.length) {
    if (cargando || historico.cargando) {
      return <EmptyState icon="⏳" title="Reuniendo el histórico de clientes…" description="Se lee una sola vez por visita." />;
    }
    return (
      <EmptyState
        icon="👥"
        title={`Sin clientes con facturas en ${etiquetaPeriodo.toLowerCase()}`}
        description="El tablero se arma con las facturas y los abonos: registra la primera factura o trae el histórico desde la pestaña Importar."
      />
    );
  }

  return (
    <section className="grid gap-4">
      {historico.error && (
        <Aviso
          tono="aviso"
          titulo="No se pudo traer el histórico completo"
          acciones={<Button size="sm" variant="secondary" onClick={traerHistorico}>Reintentar</Button>}
        >
          El tablero está mostrando solo lo que la sección tiene cargado del año {anio}.
        </Aviso>
      )}

      {sinVincular > 0 && (
        <Aviso
          tono="aviso"
          titulo={`${sinVincular} documento${sinVincular === 1 ? "" : "s"} sin cliente vinculado`}
          acciones={<Button size="sm" variant="accent" onClick={() => setVista("vincular")}>Vincular ahora</Button>}
        >
          Sus ventas se cuentan como un cliente aparte, así que las cifras de este tablero se quedan cortas para ese
          cliente y sobra una fila que no existe.
        </Aviso>
      )}

      <TiraTotales columnas="sm:grid-cols-3 xl:grid-cols-6">
        <KPI
          titulo="Clientes"
          valor={filtrados.length}
          detalle={hayFiltro ? `de ${panel.clientes.length}` : `${totales.activos} con facturas`}
        />
        <KPI titulo="Ventas" valor={<Money valor={totales.facturado} cero="" />} detalle={etiquetaPeriodo} compacto />
        <KPI titulo="Recaudado" valor={<Money valor={totales.abonado} cero="" />} tono="bueno" compacto />
        <KPI titulo="Por cobrar" valor={<Money valor={totales.saldo} cero="" />} tono={totales.saldo ? "aviso" : "bueno"} compacto />
        <KPI titulo="Vencido" valor={<Money valor={totales.vencido} cero="" />} tono={totales.vencido ? "malo" : "bueno"} compacto />
        <KPI titulo="Ticket promedio" valor={<Money valor={totales.ticket} cero="" />} detalle={`${totales.facturas} facturas`} compacto />
      </TiraTotales>

      <Card padding="p-3">
        <div className="grid gap-2 md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)]">
          <Buscador value={busqueda} onChange={setBusqueda} placeholder="Cliente, NIT, ciudad…" />
          <Select value={periodo} onChange={(e) => { setPeriodo(e.target.value); setMes(""); }} aria-label="Periodo">
            <option value="">Todo el histórico</option>
            {anios.map((a) => <option key={a} value={a}>Año {a}</option>)}
          </Select>
          <Select value={orden} onChange={(e) => setOrden(e.target.value)} aria-label="Ordenar por">
            {ORDENES.map((o) => <option key={o.valor} value={o.valor}>{o.label}</option>)}
          </Select>
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1.5">
          {historico.cargando && (
            <span className="text-[11px] text-gray-500 dark:text-gray-400">
              Mostrando {anio}; trayendo el histórico completo…
            </span>
          )}
          <Casilla checked={soloConSaldo} onChange={(e) => setSoloConSaldo(e.target.checked)}>
            Solo con saldo pendiente
          </Casilla>
          {mes && <ChipFiltro onQuitar={() => setMes("")}>Mes: {nombreMes(mes)} {mes.slice(0, 4)}</ChipFiltro>}
          {producto && <ChipFiltro onQuitar={() => setProducto("")}>Producto: {producto}</ChipFiltro>}
          {hayFiltro && (
            <Button size="sm" variant="secondary" onClick={limpiar}>Quitar filtros</Button>
          )}
        </div>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card padding="p-3.5">
          <BarrasMes
            serie={serie}
            seleccion={mes}
            onSeleccionar={setMes}
            titulo="Ventas por mes"
            detalle="Pulsa un mes para dejar en la tabla solo quienes compraron ese mes"
          />
        </Card>

        <Card padding="p-3.5">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-1">Qué se vende</h3>
          <p className="text-[11px] text-gray-500 dark:text-gray-400 mb-3">
            Pulsa un producto para filtrar el tablero y evaluarlo como distribución.
          </p>
          <Anillo
            partes={productosFiltrados.slice(0, 6).map((p) => ({ clave: p.producto, etiqueta: p.producto, valor: p.valor }))}
            total={productosFiltrados.reduce((a, p) => a + Math.abs(p.valor), 0)}
            centro={formatCOP(totales.facturado)}
            subcentro={`${productosFiltrados.length} producto${productosFiltrados.length === 1 ? "" : "s"}`}
            seleccion={producto}
            onSeleccionar={setProducto}
          />
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card padding="p-3.5">
          <BarrasRanking
            titulo={`Clientes que más compran${producto ? ` — ${producto}` : ""}`}
            detalle="Pulsa uno para ver su ficha"
            items={filtrados.slice(0, TOPE_RANKING).map((c) => ({
              clave: c.clave,
              etiqueta: c.nombre,
              valor: c.facturado,
              detalle: `${c.participacion} % de las ventas · ${c.facturas} factura${c.facturas === 1 ? "" : "s"}`,
            }))}
            onSeleccionar={setAbierto}
            seleccion={abierto}
            vacio="Ningún cliente coincide con el filtro"
          />
        </Card>

        <PanelDistribuidor
          clientes={panel.clientes}
          productos={panel.productos}
          producto={productoElegido}
          onProducto={setProducto}
          metas={metas}
          onMetas={setMetas}
          onAbrir={(c) => setAbierto(c.clave)}
        />
      </div>

      {!filtrados.length ? (
        <EmptyState
          icon="🔎"
          title="Ningún cliente coincide con el filtro"
          action={<Button variant="secondary" onClick={limpiar}>Quitar filtros</Button>}
        />
      ) : (
        <>
          <Tabla className="hidden lg:block max-h-[70vh] overflow-y-auto">
            <thead>
              <tr>
                <Th>Cliente</Th>
                <Th align="right">Ventas</Th>
                <Th align="right">%</Th>
                <Th align="center">Facturas</Th>
                <Th align="right">Ticket</Th>
                <Th>Qué compra</Th>
                <Th align="right">Saldo</Th>
                <Th align="right">Vencido</Th>
                <Th align="center">Paga a</Th>
                <Th align="center">Última</Th>
              </tr>
            </thead>
            <tbody>
              {filtrados.map((c) => (
                <Tr key={c.clave} className="cursor-pointer" onClick={() => setAbierto(c.clave)}>
                  <Td>
                    <div className="font-medium text-gray-900 dark:text-gray-100 max-w-[26ch] truncate" title={c.nombre}>
                      {c.nombre}
                    </div>
                    <div className="text-[10px] text-gray-500 dark:text-gray-400">
                      {c.nit || "sin NIT"}{c.ciudad ? ` · ${c.ciudad}` : ""}
                      {!c.vinculado && <span className="text-amber-600 dark:text-amber-400"> · sin vincular</span>}
                    </div>
                  </Td>
                  <Td align="right"><Money valor={c.facturado} fuerte /></Td>
                  <Td align="right" className="text-gray-500 dark:text-gray-400 tabular-nums">{c.participacion}</Td>
                  <Td align="center" className="tabular-nums">{c.facturas}</Td>
                  <Td align="right"><Money valor={c.ticket} /></Td>
                  <Td>
                    <div className="max-w-[20ch] truncate text-gray-600 dark:text-gray-300" title={c.productos.map((p) => p.producto).join(", ")}>
                      {c.productoPrincipal || "—"}
                    </div>
                  </Td>
                  <Td align="right"><Money valor={c.saldo} /></Td>
                  <Td align="right" className={c.vencido ? "text-red-600 dark:text-red-400" : ""}>
                    <Money valor={c.vencido} />
                  </Td>
                  <Td align="center" className="tabular-nums whitespace-nowrap">
                    {c.diasPago == null ? "—" : `${c.diasPago} d`}
                    {c.moraPromedio > 0 && (
                      <div className="text-[10px] text-amber-600 dark:text-amber-400">+{c.moraPromedio} mora</div>
                    )}
                  </Td>
                  <Td align="center" className="whitespace-nowrap text-gray-500 dark:text-gray-400">
                    {fechaCorta(c.ultimaCompra)}
                  </Td>
                </Tr>
              ))}
            </tbody>
          </Tabla>

          {/* Tarjetas en pantallas angostas: la tabla de diez columnas no cabe.
              Manda lo que se compra —es un tablero comercial, no de cobro— y el
              saldo queda de contexto al lado. */}
          <div className="lg:hidden grid gap-2">
            {filtrados.map((c) => (
              <Card key={c.clave} padding="p-3">
                <button type="button" onClick={() => setAbierto(c.clave)} className="w-full text-left">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="font-semibold text-[15px] leading-snug text-gray-900 dark:text-white break-words">
                        {c.nombre}
                      </div>
                      <div className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
                        {c.facturas} factura{c.facturas === 1 ? "" : "s"} · {c.productoPrincipal || "sin detalle"}
                      </div>
                    </div>
                    {!c.vinculado && <Badge tone="warning">Sin vincular</Badge>}
                  </div>

                  <div className="mt-2.5 flex items-end justify-between gap-3 border-t border-gray-100 dark:border-gris-700/60 pt-2.5">
                    <div>
                      <div className="text-[10px] uppercase tracking-wider text-gray-500 dark:text-gray-400">Ventas</div>
                      <div className="text-lg font-bold tabular-nums leading-none mt-0.5">
                        <Money valor={c.facturado} cero="0" />
                      </div>
                      <div className="text-[10px] text-gray-500 dark:text-gray-400 mt-1">
                        {c.participacion} % del total · última {fechaCorta(c.ultimaCompra)}
                      </div>
                    </div>
                    <div className="text-right shrink-0 text-[11px] text-gray-500 dark:text-gray-400 leading-relaxed">
                      <div>Saldo <Money valor={c.saldo} className="text-gray-800 dark:text-gray-100" /></div>
                      {c.vencido > 0 && (
                        <div className="text-red-600 dark:text-red-400">Vencido <Money valor={c.vencido} /></div>
                      )}
                      {c.diasPago != null && <div>Paga a {c.diasPago} d</div>}
                    </div>
                  </div>
                </button>
              </Card>
            ))}
          </div>

          <div className="text-xs text-gray-500 dark:text-gray-400 sm:text-right">
            {filtrados.length} de {panel.clientes.length} clientes ·{" "}
            <strong className="text-gray-900 dark:text-white">{formatCOP(totales.facturado)}</strong> facturados ·{" "}
            <strong className="text-gray-900 dark:text-white">{formatCOP(totales.saldo)}</strong> por cobrar
          </div>
        </>
      )}

      {abiertoCliente && (
        <ClienteDetalle
          cliente={abiertoCliente}
          eje={eje}
          metas={metas}
          periodo={etiquetaPeriodo}
          onCerrar={() => setAbierto("")}
          onEditar={onEditar ? (doc) => { setAbierto(""); onEditar(doc); } : null}
          onVerPagos={onVerPagos ? (doc) => { setAbierto(""); onVerPagos(doc); } : null}
        />
      )}
    </section>
  );
}
