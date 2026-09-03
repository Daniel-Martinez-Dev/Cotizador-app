import React from "react";
import Badge from "../../components/ui/Badge";
import Button from "../../components/ui/Button";
import EmptyState from "../../components/ui/EmptyState";
import { formatCOP } from "../inventario/inventarioUtils";
import { Buscador, Card, Casilla, KPI, Money, Tabla, Td, Th, Tr } from "./ui";
import { RANGOS_MORA, etiquetaEstado, tonoEstado } from "../../modules/contabilidad/catalogos";
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

      <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
        {RANGOS_MORA.map((r) => {
          const valor = porRango[r.clave] || 0;
          const pct = Math.round((Math.abs(valor) / base) * 100);
          return (
            <div key={r.clave} className="rounded-lg border border-gray-200 dark:border-gris-700 px-2.5 py-2">
              <div className="flex items-center gap-1.5">
                <span className={`h-2 w-2 rounded-full ${COLOR_RANGO[r.clave] || "bg-gray-400"}`} aria-hidden="true" />
                <span className="text-[11px] text-gray-500 dark:text-gray-400 truncate">{r.label}</span>
              </div>
              <div className={`text-sm font-semibold tabular-nums mt-0.5 ${r.clave === "d90" ? "text-red-600 dark:text-red-400" : ""}`}>
                {formatCOP(valor)}
              </div>
              <div className="text-[10px] text-gray-400 dark:text-gray-500">{pct} %</div>
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

  const documentosDe = (cliente) =>
    cliente.documentos
      .filter((d) => !soloConSaldo || Math.abs(d.resumen.saldo) >= 1)
      .sort((a, b) => String(a.fecha).localeCompare(String(b.fecha)));

  if (cargando) return <EmptyState icon="⏳" title="Calculando la cartera…" />;

  return (
    <section className="grid gap-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
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
      </div>

      <EdadesCartera porRango={totales.porRango} total={totales.saldo} />

      <Card padding="p-3">
        <div className="flex flex-col md:flex-row md:items-center gap-3">
          <Buscador
            value={busqueda}
            onChange={setBusqueda}
            placeholder="Buscar cliente por nombre o NIT"
            className="flex-1"
          />
          <Casilla checked={soloConSaldo} onChange={(e) => setSoloConSaldo(e.target.checked)}>
            Solo con saldo pendiente
          </Casilla>
          <span className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
            {filtrados.length} de {clientes.length} clientes
          </span>
        </div>
      </Card>

      {!filtrados.length ? (
        <EmptyState
          icon="✅"
          title={soloConSaldo ? "Nadie debe nada" : "Sin clientes"}
          description={soloConSaldo ? "Ningún cliente tiene saldo pendiente con los filtros actuales." : undefined}
        />
      ) : (
        <Tabla className="max-h-[70vh] overflow-y-auto">
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
                                    <td className="py-1.5 pr-3 text-right"><Money valor={doc.resumen.saldo} fuerte /></td>
                                    <td className="py-1.5 pr-3">
                                      <Badge tone={tonoEstado(doc.resumen.estado)}>{etiquetaEstado(doc.resumen.estado)}</Badge>
                                    </td>
                                    <td className="py-1.5 pr-3">
                                      <div className="flex gap-1.5 justify-end">
                                        {onEditar && (
                                          <Button size="sm" variant="secondary" onClick={() => onEditar(doc)}>Editar</Button>
                                        )}
                                        <Button size="sm" variant="accent" onClick={() => onVerPagos(doc)}>Abonos</Button>
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
    </section>
  );
}
