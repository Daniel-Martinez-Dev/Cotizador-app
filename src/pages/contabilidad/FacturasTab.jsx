import React from "react";
import toast from "react-hot-toast";
import Badge from "../../components/ui/Badge";
import Button from "../../components/ui/Button";
import EmptyState from "../../components/ui/EmptyState";
import { formatCOP } from "../inventario/inventarioUtils";
import {
  Aviso,
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
  Tr,
} from "./ui";
import {
  ESTADOS_PAGO,
  TIPOS_DOCUMENTO,
  TIPO_NOTA_CREDITO,
  TIPO_NOTA_DEBITO,
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

export default function FacturasTab({ liquidados, cargando, anio, recargar, onEditar, onVerPagos, onNueva }) {
  const [filtros, setFiltros] = React.useState(FILTROS_INICIALES);
  const [porAnular, setPorAnular] = React.useState(null);
  const [motivo, setMotivo] = React.useState("");

  const filtrados = React.useMemo(() => filtrarDocumentos(liquidados, filtros), [liquidados, filtros]);
  const totales = React.useMemo(() => totalesDocumentos(filtrados), [filtrados]);
  const sinVincular = React.useMemo(() => liquidados.filter((d) => !d.empresaId).length, [liquidados]);

  const cambiar = (campo, valor) => setFiltros((p) => ({ ...p, [campo]: valor }));
  const hayFiltro = React.useMemo(
    () => Object.keys(FILTROS_INICIALES).some((k) => filtros[k] !== FILTROS_INICIALES[k]),
    [filtros]
  );

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

  const acciones = (doc) => (
    <div className="flex flex-wrap gap-1.5 justify-end">
      <Button size="sm" variant="secondary" onClick={() => onEditar(doc)}>Editar</Button>
      <Button size="sm" variant="accent" onClick={() => onVerPagos(doc)}>Abonos</Button>
      {doc.anulado ? (
        <Button size="sm" variant="secondary" onClick={() => reactivar(doc)}>Reactivar</Button>
      ) : (
        <Button size="sm" variant="danger" onClick={() => { setPorAnular(doc); setMotivo(""); }}>Anular</Button>
      )}
    </div>
  );

  return (
    <section className="grid gap-4">
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-2">
        <KPI titulo="Documentos" valor={totales.cantidad} detalle={hayFiltro ? `de ${liquidados.length} en ${anio}` : `Año ${anio}`} />
        <KPI titulo="Subtotal" valor={<Money valor={totales.subtotal} cero="" />} compacto />
        <KPI titulo="IVA" valor={<Money valor={totales.iva} cero="" />} compacto />
        <KPI titulo="Neto facturado" valor={<Money valor={totales.neto} cero="" />} compacto />
        <KPI titulo="Recaudado" valor={<Money valor={totales.abonado} cero="" />} tono="bueno" compacto />
        <KPI titulo="Por cobrar" valor={<Money valor={totales.saldo} cero="" />} tono={totales.saldo ? "aviso" : "bueno"} compacto />
      </div>

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
        <div className="grid grid-cols-1 md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)] gap-2">
          <Buscador
            value={filtros.busqueda}
            onChange={(v) => cambiar("busqueda", v)}
            placeholder="Cliente, número, producto u observación"
          />
          <Select value={filtros.estado} onChange={(e) => cambiar("estado", e.target.value)} aria-label="Estado de pago">
            <option value="">Todos los estados</option>
            {ESTADOS_PAGO.map((e) => <option key={e.valor} value={e.valor}>{e.label}</option>)}
          </Select>
          <Select value={filtros.tipo} onChange={(e) => cambiar("tipo", e.target.value)} aria-label="Tipo de documento">
            <option value="">Facturas y notas</option>
            {TIPOS_DOCUMENTO.map((t) => <option key={t.valor} value={t.valor}>{t.label}</option>)}
          </Select>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
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
          <span className="ml-auto text-xs text-gray-500 dark:text-gray-400">
            {filtrados.length} de {liquidados.length} documentos de {anio}
          </span>
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
                <Th align="right">Acciones</Th>
              </tr>
            </thead>
            <tbody>
              {filtrados.map((doc) => {
                const { resumen } = doc;
                const insignia = INSIGNIA_TIPO[doc.tipo];
                const conceptos = (doc.items || []).map((i) => i.producto).filter(Boolean).join(", ");
                return (
                  <Tr key={doc.id} apagada={doc.anulado}>
                    <Td className="whitespace-nowrap text-gray-500 dark:text-gray-400">{fechaCorta(doc.fecha)}</Td>
                    <Td>
                      <div className="flex items-center gap-1.5">
                        <span className="font-medium text-gray-900 dark:text-gray-100">{doc.numero || "—"}</span>
                        {insignia && <Badge tone={insignia.tono}>{insignia.texto}</Badge>}
                      </div>
                    </Td>
                    <Td>
                      <button
                        type="button"
                        onClick={() => onEditar(doc)}
                        className="text-left font-medium max-w-[22ch] truncate hover:underline focus:outline-none focus:underline"
                        title={doc.clienteNombre}
                      >
                        {doc.clienteNombre || "—"}
                      </button>
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
                    <Td align="right">{acciones(doc)}</Td>
                  </Tr>
                );
              })}
            </tbody>
          </Tabla>

          {/* Tarjetas en pantallas angostas: la tabla de doce columnas no cabe. */}
          <div className="lg:hidden grid gap-2">
            {filtrados.map((doc) => {
              const { resumen } = doc;
              const insignia = INSIGNIA_TIPO[doc.tipo];
              return (
                <Card key={doc.id} padding="p-3" className={doc.anulado ? "opacity-50" : ""}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="font-medium text-sm truncate">{doc.clienteNombre || "—"}</div>
                      <div className="text-[11px] text-gray-500 dark:text-gray-400 flex items-center gap-1.5 flex-wrap">
                        {insignia && <Badge tone={insignia.tono}>{insignia.texto}</Badge>}
                        {doc.numero || "sin número"} · {doc.fecha || "sin fecha"}
                      </div>
                      {!doc.empresaId && (
                        <div className="text-[10px] text-amber-600 dark:text-amber-400 mt-0.5">Sin cliente vinculado</div>
                      )}
                    </div>
                    <Badge tone={tonoEstado(resumen.estado)}>{etiquetaEstado(resumen.estado)}</Badge>
                  </div>
                  <div className="mt-2.5 grid grid-cols-3 gap-2 text-xs">
                    <div>
                      <div className="text-[10px] uppercase tracking-wider text-gray-500 dark:text-gray-400">Neto</div>
                      <Money valor={resumen.neto} />
                    </div>
                    <div>
                      <div className="text-[10px] uppercase tracking-wider text-gray-500 dark:text-gray-400">Abonado</div>
                      <Money valor={resumen.abonado} className="text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <div>
                      <div className="text-[10px] uppercase tracking-wider text-gray-500 dark:text-gray-400">Saldo</div>
                      <Money valor={resumen.saldo} fuerte />
                    </div>
                  </div>
                  {resumen.vencida && (
                    <div className="mt-2 text-[11px] text-red-600 dark:text-red-400">
                      Vencida hace {resumen.diasMora} días ({resumen.vencimiento})
                    </div>
                  )}
                  <div className="mt-2.5">{acciones(doc)}</div>
                </Card>
              );
            })}
          </div>

          <div className="text-xs text-gray-500 dark:text-gray-400 text-right">
            Total filtrado: <strong className="text-gray-900 dark:text-white">{formatCOP(totales.neto)}</strong> facturados ·{" "}
            <strong className="text-gray-900 dark:text-white">{formatCOP(totales.saldo)}</strong> por cobrar
          </div>
        </>
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
