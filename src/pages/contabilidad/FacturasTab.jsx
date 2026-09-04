import React from "react";
import toast from "react-hot-toast";
import Badge from "../../components/ui/Badge";
import Button from "../../components/ui/Button";
import EmptyState from "../../components/ui/EmptyState";
import { formatCOP } from "../inventario/inventarioUtils";
import {
  Aviso,
  BotonIcono,
  Buscador,
  Card,
  Casilla,
  Input,
  KPI,
  Modal,
  Money,
  Select,
  Tabla,
  Td,
  Th,
  TiraTotales,
  Tr,
} from "./ui";
import { IconoAbono, IconoAlerta, IconoAnular, IconoEditar, IconoReactivar } from "./iconos";
import FacturaDetalle from "./FacturaDetalle";
import {
  ESTADOS_PAGO,
  TIPOS_DOCUMENTO,
  TIPO_NOTA_CREDITO,
  TIPO_NOTA_DEBITO,
  esNotaCredito,
  etiquetaEstado,
  tonoEstado,
} from "../../modules/contabilidad/catalogos";
import { filtrarDocumentos, totalesDocumentos } from "../../modules/contabilidad/cartera";
import { anularDocumento, reactivarDocumento } from "../../utils/firebaseContabilidad";

const FILTROS_INICIALES = { busqueda: "", estado: "", tipo: "", soloVencidas: false, soloSinVincular: false };

// Fecha corta para la tabla: el año ya lo fija el selector de la sección.
const fechaCorta = (iso) => (iso ? `${iso.slice(8, 10)}/${iso.slice(5, 7)}` : "—");

const INSIGNIA_TIPO = {
  [TIPO_NOTA_CREDITO]: { tono: "purple", texto: "NC" },
  [TIPO_NOTA_DEBITO]: { tono: "info", texto: "ND" },
};

// Anular pide un motivo, así que no sirve ConfirmDialog: ese mete su mensaje
// dentro de un <p> y un input ahí dentro es HTML inválido.
function AnularDialog({ documento, motivo, onMotivo, onCancelar, onConfirmar }) {
  return (
    <Modal
      titulo={`Anular ${documento.numero || "documento"}`}
      subtitulo={documento.clienteNombre}
      ancho="max-w-md"
      onCerrar={onCancelar}
      pie={
        <>
          <Button variant="secondary" onClick={onCancelar}>Cancelar</Button>
          <Button variant="danger" onClick={onConfirmar}>Anular</Button>
        </>
      }
    >
      <div className="grid gap-3">
        <p className="text-sm text-gray-700 dark:text-gray-300">
          Deja de contar en ventas y en cartera, pero no se borra: una factura ya numerada tiene que
          seguir existiendo. Sus abonos se conservan.
        </p>
        <Input
          value={motivo}
          onChange={(e) => onMotivo(e.target.value)}
          placeholder="Motivo de la anulación"
          autoFocus
        />
      </div>
    </Modal>
  );
}

export default function FacturasTab({ liquidados, empresas, cargando, anio, recargar, onEditar, onVerPagos, onNueva }) {
  const [filtros, setFiltros] = React.useState(FILTROS_INICIALES);
  const [porAnular, setPorAnular] = React.useState(null);
  const [motivo, setMotivo] = React.useState("");
  const [filtrosAbiertos, setFiltrosAbiertos] = React.useState(false);
  const [verDetalle, setVerDetalle] = React.useState(null);

  const filtrados = React.useMemo(() => filtrarDocumentos(liquidados, filtros), [liquidados, filtros]);
  const totales = React.useMemo(() => totalesDocumentos(filtrados), [filtrados]);
  const sinVincular = React.useMemo(() => liquidados.filter((d) => !d.empresaId).length, [liquidados]);

  const cambiar = (campo, valor) => setFiltros((p) => ({ ...p, [campo]: valor }));
  const hayFiltro = React.useMemo(
    () => Object.keys(FILTROS_INICIALES).some((k) => filtros[k] !== FILTROS_INICIALES[k]),
    [filtros]
  );

  // El detalle se queda abierto entre recargas, así que hay que releer el
  // documento de la lista recién liquidada: si no, tras registrar un abono
  // seguiría enseñando el saldo viejo.
  const detalle = React.useMemo(
    () => (verDetalle ? liquidados.find((d) => d.id === verDetalle.id) || verDetalle : null),
    [liquidados, verDetalle]
  );

  const pedirAnulacion = (doc) => { setPorAnular(doc); setMotivo(""); };

  const confirmarAnulacion = async () => {
    try {
      await anularDocumento(porAnular.id, motivo);
      toast.success("Documento anulado.");
      setPorAnular(null);
      setMotivo("");
      recargar();
    } catch (e) {
      console.error("No se pudo anular", e);
      toast.error("No se pudo anular el documento.");
    }
  };

  const reactivar = async (doc) => {
    try {
      await reactivarDocumento(doc.id);
      toast.success("Documento reactivado.");
      recargar();
    } catch (e) {
      console.error("No se pudo reactivar", e);
      toast.error("No se pudo reactivar el documento.");
    }
  };

  // Las acciones van en símbolos y al comienzo de la fila: escritas ocupaban la
  // mitad del ancho de una tabla de doce columnas, y estaban al final, donde
  // hay que barrer la fila entera con la vista para llegar. El nombre de cada
  // una sigue en el `title` y en el `aria-label` (ver BotonIcono).
  const acciones = (doc) => (
    <div className="flex items-center gap-1">
      {!esNotaCredito(doc) ? (
        <BotonIcono titulo="Abonos" tono="bueno" onClick={() => onVerPagos(doc)}>
          <IconoAbono />
        </BotonIcono>
      ) : doc.resumen?.abonosIndebidos ? (
        <BotonIcono titulo="Abonos mal aplicados" tono="malo" onClick={() => onVerPagos(doc)}>
          <IconoAlerta />
        </BotonIcono>
      ) : (
        // Hueco del mismo ancho: sin él, el lápiz y el aspa de una nota
        // crédito se corren a la izquierda y dejan de coincidir con los de las
        // filas de arriba.
        <span className="inline-block h-9 w-9 sm:h-8 sm:w-8" aria-hidden="true" />
      )}
      <BotonIcono titulo="Editar" onClick={() => onEditar(doc)}>
        <IconoEditar />
      </BotonIcono>
      {doc.anulado ? (
        <BotonIcono titulo="Reactivar" onClick={() => reactivar(doc)}>
          <IconoReactivar />
        </BotonIcono>
      ) : (
        <BotonIcono titulo="Anular" tono="malo" onClick={() => pedirAnulacion(doc)}>
          <IconoAnular />
        </BotonIcono>
      )}
    </div>
  );

  // Pulsar la fila en cualquier parte abre el detalle. Es una comodidad del
  // ratón y del dedo, no la única forma de llegar: la fila sigue siendo una
  // fila —ponerle role="button" le quita a un lector de pantalla la cuenta de
  // filas de la tabla— y el camino con teclado es el nombre del cliente, que
  // va como botón de verdad y abre lo mismo.
  const alPulsarFila = (doc) => ({ onClick: () => setVerDetalle(doc) });

  const botonDetalle = (doc, className) => (
    <button
      type="button"
      onClick={(e) => { e.stopPropagation(); setVerDetalle(doc); }}
      title={doc.clienteNombre}
      className={`text-left hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-trafico rounded ${className}`}
    >
      {doc.clienteNombre || "—"}
    </button>
  );

  return (
    <section className="grid gap-4">
      <TiraTotales>
        <KPI titulo="Documentos" valor={totales.cantidad} detalle={hayFiltro ? `de ${liquidados.length} en ${anio}` : `Año ${anio}`} />
        <KPI titulo="Neto facturado" valor={<Money valor={totales.neto} cero="" />} compacto />
        <KPI titulo="Recaudado" valor={<Money valor={totales.abonado} cero="" />} tono="bueno" compacto />
        <KPI titulo="Por cobrar" valor={<Money valor={totales.saldo} cero="" />} tono={totales.saldo ? "aviso" : "bueno"} compacto />
        <KPI titulo="Subtotal" valor={<Money valor={totales.subtotal} cero="" />} compacto />
        <KPI titulo="IVA" valor={<Money valor={totales.iva} cero="" />} compacto />
      </TiraTotales>

      {sinVincular > 0 && !filtros.soloSinVincular && (
        <Aviso
          tono="aviso"
          titulo={`${sinVincular} documento${sinVincular === 1 ? "" : "s"} sin cliente vinculado`}
          acciones={
            <Button size="sm" variant="secondary" onClick={() => cambiar("soloSinVincular", true)}>
              Ver solo esos
            </Button>
          }
        >
          Su saldo se cuenta aparte del resto de la cartera de ese cliente. La pestaña <strong>Clientes</strong> los
          agrupa y los vincula en bloque.
        </Aviso>
      )}

      <Card padding="p-3">
        {/* El buscador siempre a la vista; lo demás, detrás de un botón en el
            teléfono. Desplegados, los dos selectores y las dos casillas ocupan
            media pantalla antes de que aparezca la primera factura, y de cada
            diez veces que se entra aquí nueve son a buscar un número. */}
        <div className="grid grid-cols-[1fr_auto] md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)] gap-2">
          <Buscador
            value={filtros.busqueda}
            onChange={(v) => cambiar("busqueda", v)}
            placeholder="Cliente, número, producto…"
          />
          <Button
            variant={hayFiltro ? "accent" : "secondary"}
            onClick={() => setFiltrosAbiertos((v) => !v)}
            aria-expanded={filtrosAbiertos}
            className="md:hidden whitespace-nowrap"
          >
            Filtros{hayFiltro ? " •" : ""}
          </Button>
          <Select
            value={filtros.estado}
            onChange={(e) => cambiar("estado", e.target.value)}
            aria-label="Estado de pago"
            className={filtrosAbiertos ? "col-span-2 md:col-span-1" : "hidden md:block"}
          >
            <option value="">Todos los estados</option>
            {ESTADOS_PAGO.map((e) => <option key={e.valor} value={e.valor}>{e.label}</option>)}
          </Select>
          <Select
            value={filtros.tipo}
            onChange={(e) => cambiar("tipo", e.target.value)}
            aria-label="Tipo de documento"
            className={filtrosAbiertos ? "col-span-2 md:col-span-1" : "hidden md:block"}
          >
            <option value="">Facturas y notas</option>
            {TIPOS_DOCUMENTO.map((t) => <option key={t.valor} value={t.valor}>{t.label}</option>)}
          </Select>
        </div>
        <div className={`mt-2 md:mt-3 flex-wrap items-center gap-x-4 gap-y-1 ${filtrosAbiertos ? "flex" : "hidden md:flex"}`}>
          <Casilla checked={filtros.soloVencidas} onChange={(e) => cambiar("soloVencidas", e.target.checked)}>
            Solo vencidas
          </Casilla>
          <Casilla checked={filtros.soloSinVincular} onChange={(e) => cambiar("soloSinVincular", e.target.checked)}>
            Solo sin cliente vinculado
          </Casilla>
          {hayFiltro && (
            <Button size="sm" variant="secondary" onClick={() => setFiltros(FILTROS_INICIALES)}>
              Quitar filtros
            </Button>
          )}
        </div>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-gray-500 dark:text-gray-400">
          <span>Pulsa una fila para ver el detalle completo.</span>
          <span>{filtrados.length} de {liquidados.length} documentos de {anio}</span>
        </div>
      </Card>

      {cargando ? (
        <EmptyState icon="⏳" title="Cargando facturas…" />
      ) : !liquidados.length ? (
        <EmptyState
          icon="🧾"
          title={`Sin facturas en ${anio}`}
          description="Registra la primera factura o trae el histórico desde la pestaña Importar."
          action={<Button variant="primary" onClick={onNueva}>Nueva factura</Button>}
        />
      ) : !filtrados.length ? (
        <EmptyState
          icon="🔎"
          title="Ningún documento coincide con el filtro"
          action={<Button variant="secondary" onClick={() => setFiltros(FILTROS_INICIALES)}>Quitar filtros</Button>}
        />
      ) : (
        <>
          <Tabla className="hidden lg:block max-h-[70vh] overflow-y-auto">
            <thead>
              <tr>
                <Th className="w-[8.5rem]"><span className="sr-only">Acciones</span></Th>
                <Th>Fecha</Th>
                <Th>Documento</Th>
                <Th>Cliente</Th>
                <Th>Concepto</Th>
                <Th align="right">Subtotal</Th>
                <Th align="right">IVA</Th>
                <Th align="right">Neto</Th>
                <Th align="right">Abonado</Th>
                <Th align="right">Saldo</Th>
                <Th>Estado</Th>
                <Th>Vence</Th>
              </tr>
            </thead>
            <tbody>
              {filtrados.map((doc) => {
                const { resumen } = doc;
                const insignia = INSIGNIA_TIPO[doc.tipo];
                const conceptos = (doc.items || []).map((i) => i.producto).filter(Boolean).join(", ");
                return (
                  <Tr
                    key={doc.id}
                    apagada={doc.anulado}
                    className="cursor-pointer"
                    {...alPulsarFila(doc)}
                  >
                    <Td className="py-1.5">{acciones(doc)}</Td>
                    <Td className="whitespace-nowrap text-gray-500 dark:text-gray-400">{fechaCorta(doc.fecha)}</Td>
                    <Td>
                      <div className="flex items-center gap-1.5">
                        <span className="font-medium text-gray-900 dark:text-gray-100">{doc.numero || "—"}</span>
                        {insignia && <Badge tone={insignia.tono}>{insignia.texto}</Badge>}
                      </div>
                    </Td>
                    <Td>
                      {botonDetalle(doc, "block font-medium max-w-[22ch] truncate")}
                      {!doc.empresaId && (
                        <div className="text-[10px] text-amber-600 dark:text-amber-400">Sin vincular</div>
                      )}
                    </Td>
                    <Td>
                      <div className="max-w-[24ch] truncate text-gray-600 dark:text-gray-300" title={conceptos}>
                        {conceptos || "—"}
                      </div>
                    </Td>
                    <Td align="right"><Money valor={resumen.subtotal} /></Td>
                    <Td align="right"><Money valor={resumen.iva} /></Td>
                    <Td align="right"><Money valor={resumen.neto} fuerte /></Td>
                    <Td align="right" className="text-emerald-600 dark:text-emerald-400"><Money valor={resumen.abonado} /></Td>
                    <Td align="right"><Money valor={resumen.saldo} fuerte /></Td>
                    <Td><Badge tone={tonoEstado(resumen.estado)}>{etiquetaEstado(resumen.estado)}</Badge></Td>
                    <Td className="whitespace-nowrap">
                      {resumen.vencimiento ? fechaCorta(resumen.vencimiento) : "—"}
                      {resumen.vencida && (
                        <div className="text-[10px] font-medium text-red-600 dark:text-red-400">{resumen.diasMora} d</div>
                      )}
                    </Td>
                  </Tr>
                );
              })}
            </tbody>
          </Tabla>

          {/* Tarjetas en pantallas angostas: la tabla de doce columnas no cabe.
              El saldo manda —es lo que se viene a mirar— y por eso va grande y
              solo; el neto y lo abonado quedan de contexto debajo. Las acciones
              van arriba, en el mismo sitio que en la tabla. */}
          <div className="lg:hidden grid gap-2">
            {filtrados.map((doc) => {
              const { resumen } = doc;
              const insignia = INSIGNIA_TIPO[doc.tipo];
              return (
                <Card
                  key={doc.id}
                  padding="p-3"
                  className={`cursor-pointer ${doc.anulado ? "opacity-50" : ""}`}
                  {...alPulsarFila(doc)}
                >
                  <div className="flex items-center justify-between gap-2">
                    {acciones(doc)}
                    <Badge tone={tonoEstado(resumen.estado)}>{etiquetaEstado(resumen.estado)}</Badge>
                  </div>

                  <div className="mt-2 min-w-0">
                    {botonDetalle(doc, "block w-full font-semibold text-[15px] leading-snug break-words")}
                    <div className="text-[11px] text-gray-500 dark:text-gray-400 flex items-center gap-1.5 flex-wrap mt-0.5">
                      {insignia && <Badge tone={insignia.tono}>{insignia.texto}</Badge>}
                      {doc.numero || "sin número"} · {doc.fecha || "sin fecha"}
                    </div>
                    {!doc.empresaId && (
                      <div className="text-[10px] text-amber-600 dark:text-amber-400 mt-0.5">Sin cliente vinculado</div>
                    )}
                  </div>

                  <div className="mt-2.5 flex items-end justify-between gap-3 border-t border-gray-100 dark:border-gris-700/60 pt-2.5">
                    <div className="text-[11px] text-gray-500 dark:text-gray-400 leading-relaxed">
                      <div>Neto <Money valor={resumen.neto} className="text-gray-800 dark:text-gray-100" /></div>
                      <div>
                        Abonado{" "}
                        <Money valor={resumen.abonado} className="text-emerald-600 dark:text-emerald-400" />
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-[10px] uppercase tracking-wider text-gray-500 dark:text-gray-400">Saldo</div>
                      <div className="text-lg font-bold tabular-nums leading-none mt-0.5">
                        <Money valor={resumen.saldo} cero="0" />
                      </div>
                    </div>
                  </div>

                  {resumen.vencida && (
                    <div className="mt-2 text-[11px] font-medium text-red-600 dark:text-red-400">
                      Vencida hace {resumen.diasMora} días ({resumen.vencimiento})
                    </div>
                  )}
                </Card>
              );
            })}
          </div>

          <div className="text-xs text-gray-500 dark:text-gray-400 sm:text-right">
            Total filtrado: <strong className="text-gray-900 dark:text-white">{formatCOP(totales.neto)}</strong> facturados ·{" "}
            <strong className="text-gray-900 dark:text-white">{formatCOP(totales.saldo)}</strong> por cobrar
          </div>
        </>
      )}

      {detalle && (
        <FacturaDetalle
          documento={detalle}
          documentos={liquidados}
          empresas={empresas}
          onCerrar={() => setVerDetalle(null)}
          onEditar={(doc) => { setVerDetalle(null); onEditar(doc); }}
          onVerPagos={(doc) => { setVerDetalle(null); onVerPagos(doc); }}
          onAnular={(doc) => { setVerDetalle(null); pedirAnulacion(doc); }}
          onReactivar={(doc) => { setVerDetalle(null); reactivar(doc); }}
        />
      )}

      {porAnular && (
        <AnularDialog
          documento={porAnular}
          motivo={motivo}
          onMotivo={setMotivo}
          onCancelar={() => setPorAnular(null)}
          onConfirmar={confirmarAnulacion}
        />
      )}
    </section>
  );
}
