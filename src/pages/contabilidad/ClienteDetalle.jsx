import React from "react";
import Badge from "../../components/ui/Badge";
import Button from "../../components/ui/Button";
import { formatCOP } from "../inventario/inventarioUtils";
import { Card, FilaDato, KPI, Modal, Money, Tabla, Td, Th, TiraTotales, Tr } from "./ui";
import { Anillo, BarraFactor, BarrasMes, Medidor } from "./graficas";
import { esNotaCredito, etiquetaEstado, tonoEstado } from "../../modules/contabilidad/catalogos";
import {
  ETIQUETA_NIVEL,
  TONO_NIVEL,
  cantidadLegible,
  evaluarDistribuidor,
  serieSobreEje,
} from "../../modules/contabilidad/clientes";

// Ficha de un cliente: todo lo que la app sabe de él en una sola ventana.
//
// Antes esto había que armarlo a mano: filtrar la tabla de facturas por su
// nombre, sumar a ojo, abrir la cartera para ver el saldo y no había manera de
// saber qué le compra ni cómo paga. Son las cuatro preguntas que se hacen antes
// de darle un precio distinto.

const fechaCorta = (iso) => (iso ? `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(2, 4)}` : "—");

// Cómo paga, en una frase. "Paga a 47 días con 17 de mora" dice más que tres
// porcentajes sueltos, y es como se habla del cliente en la oficina.
function frasePago(cliente) {
  if (!cliente.valorPagado) return "Todavía no tiene abonos registrados.";
  const partes = [`Paga a ${cliente.diasPago} días de emitida la factura`];
  if (cliente.moraPromedio > 0) partes.push(`${cliente.moraPromedio} días después del vencimiento`);
  else partes.push("antes del vencimiento");
  partes.push(`${cliente.puntualidad} % de lo abonado llegó a tiempo`);
  return `${partes.join(" · ")}.`;
}

/** Tarjeta de candidatura a distribuidor de un producto. */
function TarjetaDistribuidor({ cliente, linea, metas }) {
  const producto = linea.producto;
  const ev = evaluarDistribuidor(cliente, producto, metas);
  const cantidad = cantidadLegible(linea);
  return (
    <Card padding="p-3" className="grid gap-2.5">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="text-sm font-semibold text-gray-900 dark:text-white truncate" title={producto}>{producto}</div>
          <div className="text-[11px] text-gray-500 dark:text-gray-400">
            {formatCOP(ev.valor)} · {ev.facturas} factura{ev.facturas === 1 ? "" : "s"}
            {cantidad && ` · ${cantidad}`} · {ev.participacion} % de sus compras
          </div>
        </div>
        <Badge tone={TONO_NIVEL[ev.nivel]}>{ETIQUETA_NIVEL[ev.nivel]}</Badge>
      </div>

      <Medidor puntaje={ev.puntaje} tono={TONO_NIVEL[ev.nivel]} etiqueta="sobre 100" />

      <div className="grid gap-1.5">
        {ev.factores.map((f) => (
          <BarraFactor key={f.clave} label={f.label} valor={f.valor} />
        ))}
        <BarraFactor
          label="Confianza de pago"
          valor={ev.pago.valor}
          detalle={
            ev.pago.sinHistoria
              ? "Sin abonos registrados: no suma ni resta."
              : `Multiplica el puntaje por ${ev.pago.multiplicador.toFixed(2).replace(".", ",")}`
          }
        />
      </div>

      {ev.reparos.length > 0 && (
        <ul className="text-[11px] text-gray-600 dark:text-gray-300 grid gap-0.5 list-disc pl-4">
          {ev.reparos.map((r) => <li key={r}>{r}</li>)}
        </ul>
      )}

      <div className="text-[11px] text-gray-500 dark:text-gray-400 border-t border-gray-100 dark:border-gris-700 pt-2">
        Pasarlo a precio de distribuidor sobre lo que compró costaría{" "}
        <strong className="text-gray-800 dark:text-gray-100">{formatCOP(ev.costoDescuento)}</strong> de margen.
      </div>
    </Card>
  );
}

export default function ClienteDetalle({ cliente, eje = [], metas, periodo, onCerrar, onEditar, onVerPagos }) {
  if (!cliente) return null;

  const serie = serieSobreEje(eje, cliente.porMes);
  const documentos = [...cliente.documentos].sort((a, b) => String(b.fecha).localeCompare(String(a.fecha)));
  // Solo se evalúan como distribuible los productos con peso: proponerle una
  // distribución de algo que compró una vez por 300.000 pesos es ruido.
  const evaluables = cliente.productos.filter((p) => p.valor > 0).slice(0, 4);

  const subtitulo = [cliente.nit && `NIT ${cliente.nit}`, cliente.ciudad, cliente.alias && `Alias ${cliente.alias}`]
    .filter(Boolean)
    .join(" · ");

  return (
    <Modal
      titulo={cliente.nombre}
      subtitulo={subtitulo || "Sin datos de identificación"}
      insignia={!cliente.vinculado ? <Badge tone="warning">Sin vincular</Badge> : null}
      ancho="max-w-5xl"
      onCerrar={onCerrar}
      pie={<Button variant="secondary" onClick={onCerrar}>Cerrar</Button>}
    >
      <div className="grid gap-4">
        <TiraTotales columnas="sm:grid-cols-3 lg:grid-cols-6">
          <KPI titulo="Ventas" valor={<Money valor={cliente.facturado} cero="" />} detalle={periodo} compacto />
          <KPI titulo="Facturas" valor={cliente.facturas} detalle={cliente.notas ? `${cliente.notas} nota(s) crédito` : ""} compacto />
          <KPI titulo="Ticket promedio" valor={<Money valor={cliente.ticket} cero="" />} compacto />
          <KPI titulo="Recaudado" valor={<Money valor={cliente.abonado} cero="" />} tono="bueno" detalle={cliente.recaudo != null ? `${cliente.recaudo} % de lo facturado` : ""} compacto />
          <KPI titulo="Saldo" valor={<Money valor={cliente.saldo} cero="" />} tono={Math.abs(cliente.saldo) >= 1 ? "aviso" : "bueno"} compacto />
          <KPI titulo="Vencido" valor={<Money valor={cliente.vencido} cero="" />} tono={cliente.vencido ? "malo" : "bueno"} compacto />
        </TiraTotales>

        <div className="grid gap-4 lg:grid-cols-2">
          <Card padding="p-3.5">
            <BarrasMes serie={serie} titulo="Cuándo compra" detalle={periodo} alto="h-28" />
          </Card>

          <Card padding="p-3.5">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Qué compra</h3>
            {cliente.productos.length ? (
              <Anillo
                partes={cliente.productos.slice(0, 6).map((p) => ({ clave: p.producto, etiqueta: p.producto, valor: p.valor }))}
                total={cliente.productos.reduce((a, p) => a + Math.abs(p.valor), 0)}
                centro={formatCOP(cliente.facturado)}
                subcentro={`${cliente.facturas} factura${cliente.facturas === 1 ? "" : "s"}`}
                tamano={116}
              />
            ) : (
              <p className="text-xs text-gray-500 dark:text-gray-400">Sus facturas no traen detalle de producto.</p>
            )}
          </Card>
        </div>

        <Card padding="p-3.5" className="grid gap-2">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Cómo paga</h3>
          <p className="text-xs text-gray-600 dark:text-gray-300">{frasePago(cliente)}</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-4">
            <FilaDato label="Primera compra">{fechaCorta(cliente.primeraCompra)}</FilaDato>
            <FilaDato label="Última compra">{fechaCorta(cliente.ultimaCompra)}</FilaDato>
            <FilaDato label="Cada">{cliente.frecuenciaDias != null ? `${cliente.frecuenciaDias} días` : "—"}</FilaDato>
            <FilaDato label="Sin comprar">{cliente.diasSinComprar != null ? `${cliente.diasSinComprar} días` : "—"}</FilaDato>
            {cliente.anticipos > 0 && (
              <FilaDato label="Anticipos"><Money valor={cliente.anticipos} /></FilaDato>
            )}
          </div>
        </Card>

        <section className="grid gap-2">
          <div>
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">¿Puede ser distribuidor?</h3>
            <p className="text-[11px] text-gray-500 dark:text-gray-400">
              Un producto por tarjeta, con el puntaje y lo que le falta. El precio de distribuidor es un 13 % menos que el de
              cliente final: el puntaje mide si el volumen y el pago lo compensan.
            </p>
          </div>
          {evaluables.length ? (
            <div className="grid gap-2 sm:grid-cols-2">
              {evaluables.map((p) => (
                <TarjetaDistribuidor key={p.producto} cliente={cliente} linea={p} metas={metas} />
              ))}
            </div>
          ) : (
            <p className="text-xs text-gray-500 dark:text-gray-400">Sin productos con qué evaluarlo.</p>
          )}
        </section>

        <section className="grid gap-2">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
            Sus documentos ({documentos.length})
          </h3>
          <Tabla className="hidden sm:block max-h-72 overflow-y-auto">
            <thead>
              <tr>
                <Th>Fecha</Th>
                <Th>Documento</Th>
                <Th>Concepto</Th>
                <Th align="right">Neto</Th>
                <Th align="right">Abonado</Th>
                <Th align="right">Saldo</Th>
                <Th>Estado</Th>
                {(onEditar || onVerPagos) && <Th align="right">Acciones</Th>}
              </tr>
            </thead>
            <tbody>
              {documentos.map((doc) => (
                <Tr key={doc.id}>
                  <Td className="whitespace-nowrap text-gray-500 dark:text-gray-400">{fechaCorta(doc.fecha)}</Td>
                  <Td className="font-medium">{doc.numero || "—"}</Td>
                  <Td>
                    <div className="max-w-[22ch] truncate text-gray-600 dark:text-gray-300">
                      {(doc.items || []).map((i) => i.producto).filter(Boolean).join(", ") || "—"}
                    </div>
                  </Td>
                  <Td align="right"><Money valor={doc.resumen?.neto} /></Td>
                  <Td align="right" className="text-emerald-600 dark:text-emerald-400"><Money valor={doc.resumen?.abonado} /></Td>
                  <Td align="right"><Money valor={doc.resumen?.aporteSaldo} fuerte /></Td>
                  <Td><Badge tone={tonoEstado(doc.resumen?.estado)}>{etiquetaEstado(doc.resumen?.estado)}</Badge></Td>
                  {(onEditar || onVerPagos) && (
                    <Td align="right">
                      <div className="flex gap-1.5 justify-end">
                        {onEditar && <Button size="sm" variant="secondary" onClick={() => onEditar(doc)}>Editar</Button>}
                        {onVerPagos && !esNotaCredito(doc) && (
                          <Button size="sm" variant="accent" onClick={() => onVerPagos(doc)}>Abonos</Button>
                        )}
                      </div>
                    </Td>
                  )}
                </Tr>
              ))}
            </tbody>
          </Tabla>

          {/* En el teléfono la tabla de ocho columnas no cabe: cada documento
              va como una fila de tarjeta con lo que se viene a mirar. */}
          <div className="sm:hidden grid gap-1.5">
            {documentos.map((doc) => (
              <Card key={doc.id} padding="p-2.5">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-gray-900 dark:text-white">{doc.numero || "—"}</div>
                    <div className="text-[11px] text-gray-500 dark:text-gray-400">{doc.fecha}</div>
                  </div>
                  <Badge tone={tonoEstado(doc.resumen?.estado)}>{etiquetaEstado(doc.resumen?.estado)}</Badge>
                </div>
                <div className="mt-1.5 flex items-baseline justify-between gap-3 text-xs">
                  <span className="text-gray-500 dark:text-gray-400">Neto <Money valor={doc.resumen?.neto} /></span>
                  <span className="font-semibold">Saldo <Money valor={doc.resumen?.aporteSaldo} cero="0" /></span>
                </div>
                {(onEditar || onVerPagos) && (
                  <div className="mt-2 flex gap-1.5 [&>button]:flex-1">
                    {onEditar && <Button size="sm" variant="secondary" onClick={() => onEditar(doc)}>Editar</Button>}
                    {onVerPagos && !esNotaCredito(doc) && (
                      <Button size="sm" variant="accent" onClick={() => onVerPagos(doc)}>Abonos</Button>
                    )}
                  </div>
                )}
              </Card>
            ))}
          </div>
        </section>
      </div>
    </Modal>
  );
}
