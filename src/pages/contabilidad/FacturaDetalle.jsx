import React from "react";
import toast from "react-hot-toast";
import Badge from "../../components/ui/Badge";
import Button from "../../components/ui/Button";
import { formatCOP } from "../inventario/inventarioUtils";
import { Aviso, Card, KPI, Modal, Money, Seccion, Tabla, Td, Th, Tr } from "./ui";
import {
  DESTINO_DOCUMENTO,
  TIPOS_DOCUMENTO,
  TIPO_NOTA_CREDITO,
  UNIDADES,
  esNotaCredito,
  etiquetaEstado,
  tonoEstado,
} from "../../modules/contabilidad/catalogos";
import { aNumero, netoDocumento, redondear, subtotalItem } from "../../modules/contabilidad/calculos";
import { claveCliente } from "../../modules/contabilidad/cartera";
import { listarPagosDeDocumento } from "../../utils/firebaseContabilidad";

// Lo que un abono le aplicó a este documento: no es su valor, porque una misma
// transferencia puede estar cubriendo varias facturas.
const aplicadoAqui = (pago, documentoId) =>
  redondear((pago.aplicaciones || [])
    .filter((a) => a.id === documentoId && (a.tipo || DESTINO_DOCUMENTO) === DESTINO_DOCUMENTO)
    .reduce((acc, a) => acc + aNumero(a.valor), 0));

const etiquetaUnidad = (valor) => UNIDADES.find((u) => u.valor === valor)?.label || valor || "";
const etiquetaTipo = (tipo) => TIPOS_DOCUMENTO.find((t) => t.valor === tipo)?.label || "Documento";

/** Rótulo arriba y dato abajo. Es la ficha de un campo que aquí no se edita. */
function Dato({ label, children, className = "" }) {
  return (
    <div className={`min-w-0 ${className}`}>
      <div className="text-[10px] font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">{label}</div>
      <div className="text-sm text-gray-900 dark:text-gray-100 break-words">{children ?? "—"}</div>
    </div>
  );
}

function LineaTotal({ label, children, fuerte = false, className = "" }) {
  return (
    <div className={`flex items-baseline justify-between gap-4 ${className}`}>
      <span className={fuerte ? "font-semibold" : "text-gray-600 dark:text-gray-300"}>{label}</span>
      <span className={fuerte ? "text-lg font-bold tabular-nums text-gray-900 dark:text-white" : ""}>{children}</span>
    </div>
  );
}

/**
 * Detalle de una factura: lo que antes obligaba a abrir el formulario de
 * edición para mirar, con el riesgo de guardar algo sin querer.
 *
 * Se abre pulsando la fila en cualquier parte, y reúne en una sola pantalla lo
 * que estaba repartido entre tres: los datos del documento, sus conceptos, la
 * liquidación, sus abonos —que vivían solo en el modal de abonos—, el cliente
 * con el resto de su cartera del año, y los vínculos con cotización y fichas.
 */
export default function FacturaDetalle({
  documento,
  documentos = [],
  empresas = [],
  onCerrar,
  onEditar,
  onVerPagos,
  onAnular,
  onReactivar,
}) {
  const [pagos, setPagos] = React.useState([]);
  const [cargandoPagos, setCargandoPagos] = React.useState(true);

  React.useEffect(() => {
    let vigente = true;
    setCargandoPagos(true);
    listarPagosDeDocumento(documento.id)
      .then((lista) => { if (vigente) setPagos(lista); })
      .catch((e) => {
        console.error("No se pudieron cargar los abonos", e);
        if (vigente) toast.error("No se pudieron cargar los abonos de esta factura.");
      })
      .finally(() => { if (vigente) setCargandoPagos(false); });
    return () => { vigente = false; };
  }, [documento.id]);

  const resumen = documento.resumen || {};
  const nota = esNotaCredito(documento);
  const empresa = documento.empresaId ? empresas.find((e) => e.id === documento.empresaId) : null;

  // Notas crédito que descuentan de esta factura, y —si lo que se está mirando
  // es una nota— la factura que anula.
  const notasAplicadas = React.useMemo(
    () => documentos.filter((d) => d.tipo === TIPO_NOTA_CREDITO && !d.anulado && d.docAfectadoId === documento.id),
    [documentos, documento.id]
  );
  const facturaAfectada = React.useMemo(
    () => (documento.docAfectadoId ? documentos.find((d) => d.id === documento.docAfectadoId) : null),
    [documentos, documento.docAfectadoId]
  );

  // El resto de la cartera del mismo cliente en el año que se está mirando: es
  // la pregunta que sigue siempre a "¿cuánto debe esta factura?".
  const delCliente = React.useMemo(() => {
    const clave = claveCliente(documento);
    const suyos = documentos.filter((d) => claveCliente(d) === clave && !d.anulado);
    return {
      cantidad: suyos.length,
      saldo: redondear(suyos.reduce((acc, d) => acc + (d.resumen?.aporteSaldo || 0), 0)),
      vencido: redondear(suyos.filter((d) => d.resumen?.vencida).reduce((acc, d) => acc + (d.resumen?.saldo || 0), 0)),
    };
  }, [documentos, documento]);

  const items = documento.items || [];
  const retenciones = (resumen.retenciones || []).filter((r) => r.valor);

  return (
    <Modal
      titulo={`${etiquetaTipo(documento.tipo)} ${documento.numero || "sin número"}`}
      subtitulo={`${documento.clienteNombre || "sin cliente"} · ${documento.fecha || "sin fecha"}`}
      ancho="max-w-4xl"
      onCerrar={onCerrar}
      insignia={
        <>
          <Badge tone={tonoEstado(resumen.estado)}>{etiquetaEstado(resumen.estado)}</Badge>
          {documento.anulado && <Badge tone="danger">Anulado</Badge>}
          {!documento.empresaId && <Badge tone="warning">Sin vincular</Badge>}
        </>
      }
      pie={
        <>
          {/* Lo que se viene a mirar, arriba del todo en el teléfono: el pie se
              apila al revés y esta línea queda por encima de los botones. */}
          <div className="order-first sm:order-none sm:mr-auto flex items-baseline justify-between sm:block text-sm text-gray-600 dark:text-gray-300">
            <span>{nota ? "Descuenta" : "Saldo"}</span>
            <strong className="text-lg sm:text-base text-gray-900 dark:text-white sm:ml-1 tabular-nums">
              <Money valor={nota ? resumen.credito : resumen.saldo} cero="0" />
            </strong>
          </div>
          <Button variant="secondary" onClick={onCerrar}>Cerrar</Button>
          {documento.anulado ? (
            <Button variant="secondary" onClick={() => onReactivar?.(documento)}>Reactivar</Button>
          ) : (
            <Button variant="danger" onClick={() => onAnular?.(documento)}>Anular</Button>
          )}
          {!nota && <Button variant="accent" onClick={() => onVerPagos?.(documento)}>Abonos</Button>}
          <Button variant="primary" onClick={() => onEditar?.(documento)}>Editar</Button>
        </>
      }
    >
      <div className="grid gap-4">
        <div className={`grid grid-cols-2 ${resumen.acreditado > 0 ? "sm:grid-cols-4" : "sm:grid-cols-3"} gap-2`}>
          <KPI titulo="Neto" valor={<Money valor={resumen.neto} cero="0" />} compacto />
          <KPI titulo="Abonado" valor={<Money valor={resumen.abonado} cero="0" />} tono="bueno" compacto />
          {resumen.acreditado > 0 && (
            <KPI titulo="Notas crédito" valor={<Money valor={resumen.acreditado} />} tono="info" compacto />
          )}
          <KPI
            titulo={nota ? "Descuenta" : "Saldo"}
            valor={<Money valor={nota ? resumen.credito : resumen.saldo} cero="0" />}
            tono={resumen.vencida ? "malo" : resumen.saldo ? "aviso" : "bueno"}
            detalle={resumen.vencida ? `Vencida hace ${resumen.diasMora} días` : ""}
            compacto
          />
        </div>

        {documento.anulado && (
          <Aviso tono="malo" titulo="Documento anulado">
            No cuenta en ventas ni en cartera, pero sigue existiendo: una factura ya numerada no se borra.
            {documento.motivoAnulacion ? <> Motivo: <strong>{documento.motivoAnulacion}</strong>.</> : null}
          </Aviso>
        )}

        {/* ── Cliente ──────────────────────────────────────────────────── */}
        <Seccion titulo="Cliente">
          <div className="grid gap-3">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <Dato label="Nombre" className="col-span-2">{documento.clienteNombre || "—"}</Dato>
              <Dato label="NIT">{documento.clienteNit || empresa?.nit || "—"}</Dato>
              <Dato label="Alias">{empresa?.alias || "—"}</Dato>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 border-t border-gray-100 dark:border-gris-700/60 pt-3">
              <Dato label="Documentos del año">{delCliente.cantidad}</Dato>
              <Dato label="Saldo del cliente"><Money valor={delCliente.saldo} cero="0" /></Dato>
              <Dato label="Vencido del cliente">
                <span className={delCliente.vencido ? "text-red-600 dark:text-red-400" : ""}>
                  <Money valor={delCliente.vencido} cero="0" />
                </span>
              </Dato>
            </div>
            {!documento.empresaId && (
              <Aviso tono="aviso" titulo="Sin cliente vinculado">
                Su saldo se cuenta aparte del resto de la cartera de este cliente. Se arregla desde
                <strong> Editar</strong>, o en bloque desde la pestaña <strong>Clientes</strong>.
              </Aviso>
            )}
          </div>
        </Seccion>

        {/* ── Documento ────────────────────────────────────────────────── */}
        <Seccion titulo="Documento">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            <Dato label="Tipo">{etiquetaTipo(documento.tipo)}</Dato>
            <Dato label="Número">{documento.numero || "—"}</Dato>
            <Dato label="Fecha">{documento.fecha || "—"}</Dato>
            <Dato label="Año contable">{documento.periodoContable || "—"}</Dato>
            <Dato label="Plazo">{documento.plazoDias != null ? `${documento.plazoDias} días` : "—"}</Dato>
            <Dato label="Vence">{nota ? "No vence" : resumen.vencimiento || "—"}</Dato>
            <Dato label="Mora">
              {resumen.vencida ? (
                <span className="text-red-600 dark:text-red-400 font-medium">{resumen.diasMora} días</span>
              ) : (
                "Al día"
              )}
            </Dato>
            <Dato label="Estado">{etiquetaEstado(resumen.estado)}</Dato>
            {documento.observaciones && (
              <Dato label="Observaciones" className="col-span-2 sm:col-span-3 lg:col-span-4">
                {documento.observaciones}
              </Dato>
            )}
          </div>
          {facturaAfectada && (
            <Aviso tono="info" className="mt-3">
              {nota ? "Anula" : "Reajusta"} la factura <strong>{facturaAfectada.numero || "sin número"}</strong>
              {" "}({facturaAfectada.fecha} · {formatCOP(netoDocumento(facturaAfectada))}).
            </Aviso>
          )}
        </Seccion>

        {/* ── Conceptos ────────────────────────────────────────────────── */}
        <Seccion titulo="Conceptos" descripcion={`${items.length} línea${items.length === 1 ? "" : "s"}`}>
          {!items.length ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">Este documento no tiene conceptos.</p>
          ) : (
            <>
              <Tabla className="hidden sm:block">
                <thead>
                  <tr>
                    <Th>Producto</Th>
                    <Th align="right">Cantidad</Th>
                    <Th>Unidad</Th>
                    <Th align="right">Valor unitario</Th>
                    <Th align="right">Subtotal</Th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, idx) => (
                    <Tr key={idx}>
                      <Td>
                        <div className="font-medium text-gray-900 dark:text-gray-100">{item.producto || "—"}</div>
                        {item.descripcion && (
                          <div className="text-[11px] text-gray-500 dark:text-gray-400">{item.descripcion}</div>
                        )}
                      </Td>
                      <Td align="right" className="tabular-nums">{aNumero(item.cantidad)}</Td>
                      <Td>{etiquetaUnidad(item.unidad)}</Td>
                      <Td align="right"><Money valor={item.valorUnitario} cero="0" /></Td>
                      <Td align="right"><Money valor={subtotalItem(item)} cero="0" fuerte /></Td>
                    </Tr>
                  ))}
                </tbody>
              </Tabla>

              {/* Cinco columnas no caben en el teléfono y el subtotal quedaba
                  fuera de pantalla, que es lo que se viene a comprobar. */}
              <div className="sm:hidden grid gap-2">
                {items.map((item, idx) => (
                  <Card key={idx} padding="p-2.5" className="bg-gray-50 dark:bg-gris-900/40">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-sm font-medium break-words">{item.producto || "—"}</div>
                        <div className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
                          {aNumero(item.cantidad)} {etiquetaUnidad(item.unidad)} × {formatCOP(item.valorUnitario)}
                        </div>
                      </div>
                      <div className="text-sm font-semibold tabular-nums shrink-0">
                        <Money valor={subtotalItem(item)} cero="0" />
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </>
          )}
        </Seccion>

        {/* ── Liquidación y abonos ─────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Seccion titulo="Liquidación">
            <div className="grid gap-2 text-sm">
              <LineaTotal label="Subtotal"><Money valor={resumen.subtotal} cero="0" /></LineaTotal>
              <LineaTotal label={`IVA (${resumen.ivaPorcentaje ?? 0} %)`}>
                <Money valor={resumen.iva} cero="0" />
              </LineaTotal>
              {retenciones.map((ret) => (
                <LineaTotal key={ret.codigo} label={ret.nombre} className="text-red-600 dark:text-red-400 pl-2">
                  <span className="tabular-nums">− {formatCOP(ret.valor)}</span>
                </LineaTotal>
              ))}
              <LineaTotal label="Neto" fuerte className="border-t border-gray-200 dark:border-gris-700 pt-2.5 mt-1">
                {formatCOP(resumen.neto || 0)}
              </LineaTotal>
              {resumen.acreditado > 0 && (
                <LineaTotal label="Notas crédito aplicadas" className="text-purple-600 dark:text-purple-400">
                  <span className="tabular-nums">− {formatCOP(resumen.acreditado)}</span>
                </LineaTotal>
              )}
              {!nota && (
                <>
                  <LineaTotal label="Abonado" className="text-emerald-600 dark:text-emerald-400">
                    <span className="tabular-nums">− {formatCOP(resumen.abonado || 0)}</span>
                  </LineaTotal>
                  <LineaTotal label="Saldo" fuerte className="border-t border-gray-200 dark:border-gris-700 pt-2.5 mt-1">
                    {formatCOP(resumen.saldo || 0)}
                  </LineaTotal>
                </>
              )}
            </div>
            {notasAplicadas.length > 0 && (
              <div className="mt-3 border-t border-gray-100 dark:border-gris-700/60 pt-3 grid gap-1">
                <div className="text-[10px] font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  Notas crédito que la descuentan
                </div>
                {notasAplicadas.map((nc) => (
                  <div key={nc.id} className="flex items-baseline justify-between gap-3 text-sm">
                    <span className="truncate">{nc.numero || "sin número"} · {nc.fecha}</span>
                    <Money valor={netoDocumento(nc)} />
                  </div>
                ))}
              </div>
            )}
          </Seccion>

          <Seccion
            titulo="Abonos"
            descripcion={nota ? "Una nota crédito no se cobra" : `${pagos.length} registrado${pagos.length === 1 ? "" : "s"}`}
            acciones={
              !nota ? (
                <Button size="sm" variant="secondary" onClick={() => onVerPagos?.(documento)}>Registrar</Button>
              ) : null
            }
          >
            {cargandoPagos ? (
              <p className="text-sm text-gray-500 dark:text-gray-400">Cargando abonos…</p>
            ) : !pagos.length ? (
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {nota
                  ? "Correcto: su valor descuenta de la factura que anula."
                  : "Esta factura no tiene ningún pago registrado."}
              </p>
            ) : (
              <div className="grid gap-1.5">
                {pagos.map((pago) => {
                  const otras = (pago.aplicaciones || []).filter((a) => a.id !== documento.id).length;
                  return (
                    <div
                      key={pago.id}
                      className="flex items-start justify-between gap-3 rounded-lg bg-gray-50 dark:bg-gris-900/40 px-2.5 py-2"
                    >
                      <div className="min-w-0">
                        <div className="text-sm">{pago.fecha || "sin fecha"}</div>
                        <div className="text-[11px] text-gray-500 dark:text-gray-400">
                          {pago.bancoNombre || "sin banco"}
                          {pago.referencia ? ` · ${pago.referencia}` : ""}
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <Money valor={aplicadoAqui(pago, documento.id)} cero="0" fuerte />
                        {otras > 0 && (
                          <div className="text-[10px] text-blue-600 dark:text-blue-400">
                            de {formatCOP(pago.valor)} · {otras + 1} documentos
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            {nota && resumen.abonosIndebidos && (
              <Aviso tono="malo" titulo="Abonos mal aplicados" className="mt-3">
                Esta nota crédito tiene abonos aplicados de antes. Quítalos desde <strong>Abonos</strong> y esa
                plata vuelve a quedar como anticipo del cliente.
              </Aviso>
            )}
          </Seccion>
        </div>

        {/* ── Vínculos ─────────────────────────────────────────────────── */}
        {(documento.cotizacionNumero || documento.fichas?.length) ? (
          <Seccion titulo="Vínculos" descripcion="De dónde salió y qué fichas cubre">
            <div className="grid gap-3">
              {documento.cotizacionNumero && (
                <Dato label="Cotización">N.º {documento.cotizacionNumero}</Dato>
              )}
              {documento.fichas?.length > 0 && (
                <div>
                  <div className="text-[10px] font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1">
                    {documento.fichas.length} ficha{documento.fichas.length === 1 ? "" : "s"} de fabricación
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {documento.fichas.map((f) => (
                      <Badge key={`${f.tipo}-${f.id}`} tone="neutral">
                        {f.codigo || f.id}
                        {f.ordenProduccion ? ` · OP ${f.ordenProduccion}` : ""}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </Seccion>
        ) : null}
      </div>
    </Modal>
  );
}
