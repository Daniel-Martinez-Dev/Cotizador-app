import React from "react";
import Badge from "../../components/ui/Badge";
import Button from "../../components/ui/Button";
import EmptyState from "../../components/ui/EmptyState";
import { formatCOP } from "../inventario/inventarioUtils";
import { Buscador, Card, Casilla, FilaDato, KPI, Money, Tabla, Td, Th, TiraTotales, Tr } from "./ui";
import { RANGOS_MORA, esNotaCredito, etiquetaEstado, tonoEstado } from "../../modules/contabilidad/catalogos";
import { construirCartera } from "../../modules/contabilidad/cartera";
import { hoyISO } from "../../modules/contabilidad/calculos";

const normalizar = (t) =>
  String(t ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

// Del más sano al más viejo. El color va con el riesgo, no con el orden.
const COLOR_RANGO = {
  corriente: "bg-emerald-500",
  d1_30: "bg-lime-500",
  d31_60: "bg-amber-500",
  d61_90: "bg-orange-500",
  d90: "bg-red-500",
};

/**
 * Barra de edades de cartera. Antes eran cinco cuadritos con cifras sueltas y
 * no se veía la proporción; el dato que importa de esta tabla es justo ese:
 * cuánto del saldo está sano y cuánto lleva meses.
 */
function EdadesCartera({ porRango, total }) {
  const base = Math.max(1, Math.abs(total) || 0);
  return (
    <Card padding="p-3.5">
      <div className="flex items-baseline justify-between mb-2.5">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Edades de cartera</h3>
        <span className="text-[11px] text-gray-500 dark:text-gray-400">Sobre {formatCOP(total)} por cobrar</span>
      </div>

      <div className="flex h-2.5 rounded-full overflow-hidden bg-gray-100 dark:bg-gris-900 mb-3" role="img" aria-label="Distribución del saldo por antigüedad">
        {RANGOS_MORA.map((r) => {
          const valor = Math.abs(porRango[r.clave] || 0);
          if (!valor) return null;
          return (
            <div
              key={r.clave}
              className={COLOR_RANGO[r.clave] || "bg-gray-400"}
              style={{ width: `${(valor / base) * 100}%` }}
              title={`${r.label}: ${formatCOP(porRango[r.clave] || 0)}`}
            />
          );
        })}
      </div>

      {/* En el teléfono los cinco rangos van en lista: puestos en dos columnas,
          una cifra en pesos no cabe y se partía en dos renglones. */}
      <div className="grid gap-1.5 sm:grid-cols-3 md:grid-cols-5 sm:gap-2">
        {RANGOS_MORA.map((r) => {
          const valor = porRango[r.clave] || 0;
          const pct = Math.round((Math.abs(valor) / base) * 100);
          const rojo = r.clave === "d90" ? "text-red-600 dark:text-red-400" : "";
          return (
            <div
              key={r.clave}
              className="flex items-center justify-between gap-2 rounded-lg border border-gray-200 dark:border-gris-700 px-2.5 py-2 sm:block"
            >
              <div className="flex items-center gap-1.5 min-w-0">
                <span className={`h-2 w-2 shrink-0 rounded-full ${COLOR_RANGO[r.clave] || "bg-gray-400"}`} aria-hidden="true" />
                <span className="text-[11px] text-gray-500 dark:text-gray-400 truncate">{r.label}</span>
              </div>
              <div className="text-right sm:text-left shrink-0">
                <div className={`text-sm font-semibold tabular-nums sm:mt-0.5 ${rojo}`}>{formatCOP(valor)}</div>
                <div className="text-[10px] text-gray-400 dark:text-gray-500">{pct} %</div>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

export default function CarteraTab({ documentos, pagos, saldosIniciales, cargando, onVerPagos, onEditar }) {
  const [busqueda, setBusqueda] = React.useState("");
  const [soloConSaldo, setSoloConSaldo] = React.useState(true);
  const [abierto, setAbierto] = React.useState(null);

  // Se calcula cada vez, nunca se guarda. La hoja ESTADO DE CUENTA del Excel
  // era una tabla dinámica congelada, y por eso mostraba saldos de clientes que
  // ya habían pagado.
  const { clientes, totales } = React.useMemo(
    () => construirCartera(documentos, pagos, { saldosIniciales, hoy: hoyISO() }),
    [documentos, pagos, saldosIniciales]
  );

  const filtrados = React.useMemo(() => {
    const termino = normalizar(busqueda);
    return clientes.filter((c) => {
      if (soloConSaldo && c.saldado) return false;
      if (!termino) return true;
      return normalizar(`${c.nombre} ${c.nit}`).includes(termino);
    });
  }, [clientes, busqueda, soloConSaldo]);

  // Se filtra y se muestra por `aporteSaldo` —lo que la fila le pone al saldo
  // del cliente— y no por el saldo del documento: así las filas cuadran con el
  // total de arriba. Una nota crédito que ya anuló su factura aporta cero y no
  // tiene por qué aparecer; una nota suelta aporta su valor en negativo, que es
  // lo que explica por qué el cliente debe menos.
  const documentosDe = (cliente) =>
    cliente.documentos
      .filter((d) => !soloConSaldo || Math.abs(d.resumen.aporteSaldo) >= 1)
      .sort((a, b) => String(a.fecha).localeCompare(String(b.fecha)));

  if (cargando) return <EmptyState icon="⏳" title="Calculando la cartera…" />;

  return (
    <section className="grid gap-4">
      <TiraTotales columnas="sm:grid-cols-2 lg:grid-cols-4">
        <KPI
          titulo="Por cobrar"
          valor={<Money valor={totales.saldo} cero="" />}
          detalle={`${totales.clientesConSaldo} clientes con saldo`}
        />
        <KPI
          titulo="Vencido"
          valor={<Money valor={totales.vencido} cero="" />}
          tono={totales.vencido ? "malo" : "bueno"}
          detalle="Pasado el plazo de pago"
        />
        <KPI
          titulo="Facturado"
          valor={<Money valor={totales.neto} cero="" />}
          detalle={`Recaudado ${formatCOP(totales.abonado)}`}
        />
        <KPI
          titulo="Anticipos sin aplicar"
          valor={<Money valor={totales.anticipos || 0} cero="" />}
          tono={totales.anticipos ? "info" : "neutral"}
          detalle="Abonos que aún no se imputan a una factura"
        />
      </TiraTotales>

      <EdadesCartera porRango={totales.porRango} total={totales.saldo} />

      <Card padding="p-3">
        <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-3">
          <Buscador
            value={busqueda}
            onChange={setBusqueda}
            placeholder="Buscar cliente por nombre o NIT"
            className="flex-1"
          />
          <div className="flex items-center justify-between gap-3">
            <Casilla checked={soloConSaldo} onChange={(e) => setSoloConSaldo(e.target.checked)}>
              Solo con saldo pendiente
            </Casilla>
            <span className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
              {filtrados.length} de {clientes.length}
            </span>
          </div>
        </div>
      </Card>

      {!filtrados.length ? (
        <EmptyState
          icon="✅"
          title={soloConSaldo ? "Nadie debe nada" : "Sin clientes"}
          description={soloConSaldo ? "Ningún cliente tiene saldo pendiente con los filtros actuales." : undefined}
        />
      ) : (
        <Tabla className="hidden lg:block max-h-[70vh] overflow-y-auto">
          <thead>
            <tr>
              <Th>Cliente</Th>
              <Th align="right">Facturado</Th>
              <Th align="right">Abonado</Th>
              <Th align="right">Saldo 2025 y anteriores</Th>
              <Th align="right">Anticipos</Th>
              <Th align="right">Saldo total</Th>
              <Th align="right">Vencido</Th>
              <Th align="right">Documentos</Th>
            </tr>
          </thead>
          <tbody>
            {filtrados.map((cliente) => {
              const expandido = abierto === cliente.clave;
              const detalle = documentosDe(cliente);
              return (
                <React.Fragment key={cliente.clave}>
                  <Tr className={expandido ? "bg-gray-50 dark:bg-gris-700/40" : ""}>
                    <Td>
                      <div className="font-medium text-gray-900 dark:text-gray-100">{cliente.nombre}</div>
                      <div className="text-[11px] text-gray-500 dark:text-gray-400">
                        {cliente.nit || "sin NIT"}
                        {!cliente.empresaId && <span className="text-amber-600 dark:text-amber-400"> · sin vincular</span>}
                      </div>
                    </Td>
                    <Td align="right"><Money valor={cliente.neto} /></Td>
                    <Td align="right" className="text-emerald-600 dark:text-emerald-400"><Money valor={cliente.abonado} /></Td>
                    <Td align="right"><Money valor={cliente.saldoInicial} /></Td>
                    <Td align="right" className="text-blue-600 dark:text-blue-400"><Money valor={cliente.anticipos} /></Td>
                    <Td align="right"><Money valor={cliente.saldo} fuerte /></Td>
                    <Td align="right" className={cliente.vencido ? "text-red-600 dark:text-red-400 font-medium" : ""}>
                      <Money valor={cliente.vencido} />
                    </Td>
                    <Td align="right">
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => setAbierto(expandido ? null : cliente.clave)}
                        aria-expanded={expandido}
                      >
                        {expandido ? "Ocultar" : `Ver ${detalle.length}`}
                      </Button>
                    </Td>
                  </Tr>

                  {expandido && (
                    <tr className="bg-gray-50 dark:bg-gris-900/40">
                      <td colSpan={8} className="px-3 py-3">
                        {cliente.saldoInicial > 0 && (
                          <div className="mb-2 text-[11px] text-gray-600 dark:text-gray-300">
                            Incluye {formatCOP(cliente.saldoInicial)} de saldo traído de años anteriores, que no
                            corresponde a ninguna factura de este año.
                          </div>
                        )}
                        {!detalle.length ? (
                          <div className="text-[11px] text-gray-500 dark:text-gray-400">Sin documentos pendientes.</div>
                        ) : (
                          <div className="rounded-lg border border-gray-200 dark:border-gris-700 bg-white dark:bg-gris-800 overflow-x-auto">
                            <table className="w-full text-[11px]">
                              <thead>
                                <tr className="text-left text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gris-700">
                                  <th className="py-1.5 px-3 font-semibold">Documento</th>
                                  <th className="py-1.5 pr-3 font-semibold">Fecha</th>
                                  <th className="py-1.5 pr-3 font-semibold">Vence</th>
                                  <th className="py-1.5 pr-3 font-semibold text-right">Neto</th>
                                  <th className="py-1.5 pr-3 font-semibold text-right">Abonado</th>
                                  <th className="py-1.5 pr-3 font-semibold text-right">Saldo</th>
                                  <th className="py-1.5 pr-3 font-semibold">Estado</th>
                                  <th className="py-1.5 pr-3 font-semibold text-right">Acciones</th>
                                </tr>
                              </thead>
                              <tbody>
                                {detalle.map((doc) => (
                                  <tr key={doc.id} className="border-t border-gray-100 dark:border-gris-700/60">
                                    <td className="py-1.5 px-3 font-medium">{doc.numero || "—"}</td>
                                    <td className="py-1.5 pr-3 whitespace-nowrap">{doc.fecha || "—"}</td>
                                    <td className="py-1.5 pr-3 whitespace-nowrap">
                                      {doc.resumen.vencimiento || "—"}
                                      {doc.resumen.vencida && (
                                        <span className="text-red-600 dark:text-red-400"> ({doc.resumen.diasMora} d)</span>
                                      )}
                                    </td>
                                    <td className="py-1.5 pr-3 text-right"><Money valor={doc.resumen.neto} /></td>
                                    <td className="py-1.5 pr-3 text-right"><Money valor={doc.resumen.abonado} /></td>
                                    <td className="py-1.5 pr-3 text-right"><Money valor={doc.resumen.aporteSaldo} fuerte /></td>
                                    <td className="py-1.5 pr-3">
                                      <Badge tone={tonoEstado(doc.resumen.estado)}>{etiquetaEstado(doc.resumen.estado)}</Badge>
                                    </td>
                                    <td className="py-1.5 pr-3">
                                      <div className="flex gap-1.5 justify-end">
                                        {onEditar && (
                                          <Button size="sm" variant="secondary" onClick={() => onEditar(doc)}>Editar</Button>
                                        )}
                                        {!esNotaCredito(doc) && (
                                          <Button size="sm" variant="accent" onClick={() => onVerPagos(doc)}>Abonos</Button>
                                        )}
                                      </div>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </Tabla>
      )}

      {/* Cartera en el teléfono. Esta pestaña no tenía versión angosta: eran
          ocho columnas dentro de un scroll horizontal, así que el saldo —lo
          único que se viene a mirar aquí— quedaba fuera de la pantalla y había
          que arrastrar la tabla para verlo. Ahora cada cliente es una tarjeta
          con el saldo en grande, y al abrirla salen sus documentos. */}
      {filtrados.length > 0 && (
        <div className="lg:hidden grid gap-2">
          {filtrados.map((cliente) => {
            const expandido = abierto === cliente.clave;
            const detalle = documentosDe(cliente);
            return (
              <Card key={cliente.clave} padding="p-0" className="overflow-hidden">
                <button
                  type="button"
                  onClick={() => setAbierto(expandido ? null : cliente.clave)}
                  aria-expanded={expandido}
                  className="w-full text-left p-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="font-semibold text-[15px] leading-snug break-words">{cliente.nombre}</div>
                      <div className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
                        {cliente.nit || "sin NIT"}
                        {!cliente.empresaId && <span className="text-amber-600 dark:text-amber-400"> · sin vincular</span>}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-[10px] uppercase tracking-wider text-gray-500 dark:text-gray-400">Saldo</div>
                      <div className="text-lg font-bold tabular-nums leading-none mt-0.5">
                        <Money valor={cliente.saldo} cero="0" />
                      </div>
                      {cliente.vencido > 0 && (
                        <div className="text-[11px] font-medium text-red-600 dark:text-red-400 mt-1">
                          {formatCOP(cliente.vencido)} vencido
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="mt-2 border-t border-gray-100 dark:border-gris-700/60 pt-1.5">
                    <FilaDato label="Facturado"><Money valor={cliente.neto} /></FilaDato>
                    <FilaDato label="Abonado">
                      <Money valor={cliente.abonado} className="text-emerald-600 dark:text-emerald-400" />
                    </FilaDato>
                    {cliente.saldoInicial > 0 && (
                      <FilaDato label="Saldo de años anteriores"><Money valor={cliente.saldoInicial} /></FilaDato>
                    )}
                    {cliente.anticipos > 0 && (
                      <FilaDato label="Anticipos">
                        <Money valor={cliente.anticipos} className="text-blue-600 dark:text-blue-400" />
                      </FilaDato>
                    )}
                  </div>

                  <div className="mt-2 text-xs font-medium text-blue-600 dark:text-blue-400">
                    {expandido ? "Ocultar documentos" : `Ver ${detalle.length} documento${detalle.length === 1 ? "" : "s"}`}
                  </div>
                </button>

                {expandido && (
                  <div className="border-t border-gray-200 dark:border-gris-700 bg-gray-50 dark:bg-gris-900/40 p-3 grid gap-2">
                    {cliente.saldoInicial > 0 && (
                      <div className="text-[11px] text-gray-600 dark:text-gray-300">
                        Incluye {formatCOP(cliente.saldoInicial)} traído de años anteriores, que no corresponde
                        a ninguna factura de este año.
                      </div>
                    )}
                    {!detalle.length ? (
                      <div className="text-[11px] text-gray-500 dark:text-gray-400">Sin documentos pendientes.</div>
                    ) : (
                      detalle.map((doc) => (
                        <div
                          key={doc.id}
                          className="rounded-lg border border-gray-200 dark:border-gris-700 bg-white dark:bg-gris-800 p-2.5"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <div className="font-medium text-sm">{doc.numero || "—"}</div>
                              <div className="text-[11px] text-gray-500 dark:text-gray-400">
                                {doc.fecha || "—"}
                                {doc.resumen.vencimiento && ` · vence ${doc.resumen.vencimiento}`}
                                {doc.resumen.vencida && (
                                  <span className="text-red-600 dark:text-red-400"> ({doc.resumen.diasMora} d)</span>
                                )}
                              </div>
                            </div>
                            <Badge tone={tonoEstado(doc.resumen.estado)}>{etiquetaEstado(doc.resumen.estado)}</Badge>
                          </div>
                          <div className="mt-1.5 flex items-end justify-between gap-3">
                            <div className="text-[11px] text-gray-500 dark:text-gray-400 leading-relaxed">
                              <div>Neto <Money valor={doc.resumen.neto} className="text-gray-800 dark:text-gray-100" /></div>
                              <div>
                                Abonado{" "}
                                <Money valor={doc.resumen.abonado} className="text-emerald-600 dark:text-emerald-400" />
                              </div>
                            </div>
                            <div className="text-right shrink-0">
                              <div className="text-[10px] uppercase tracking-wider text-gray-500 dark:text-gray-400">Saldo</div>
                              <div className="text-base font-bold tabular-nums leading-none mt-0.5">
                                <Money valor={doc.resumen.aporteSaldo} cero="0" />
                              </div>
                            </div>
                          </div>
                          <div className="mt-2 flex gap-1.5 [&>button]:flex-1">
                            {onEditar && (
                              <Button size="sm" variant="secondary" onClick={() => onEditar(doc)}>Editar</Button>
                            )}
                            {!esNotaCredito(doc) && (
                              <Button size="sm" variant="accent" onClick={() => onVerPagos(doc)}>Abonos</Button>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </section>
  );
}
