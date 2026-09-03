import React from "react";
import toast from "react-hot-toast";
import Button from "../../components/ui/Button";
import Badge from "../../components/ui/Badge";
import { formatCOP } from "../inventario/inventarioUtils";
import { PLAZO_POR_DEFECTO, TIPO_NOTA_CREDITO, TIPO_NOTA_DEBITO } from "../../modules/contabilidad/catalogos";
import { importarMigracion } from "../../modules/contabilidad/importarMigracion";
import { importarMigracionLote } from "../../utils/firebaseContabilidad";
import { resolverEmpresa } from "../../utils/empresaIdentidad";
import { resolverOCrearEmpresa } from "../../utils/firebaseCompanies";

function Dato({ titulo, valor, tono = "" }) {
  return (
    <div className="rounded border border-gray-200 dark:border-gris-700 px-3 py-2">
      <div className="text-[11px] uppercase tracking-wide text-gray-500 dark:text-gray-400">{titulo}</div>
      <div className={`text-sm font-semibold mt-0.5 ${tono}`}>{valor}</div>
    </div>
  );
}

// El cuadre contra los totales que declara el propio archivo. Es la única
// prueba de que no se perdió ni se duplicó nada por el camino; si falla, no se
// importa.
function Cuadre({ cuadre, resumen }) {
  const filas = [
    ["Documentos", resumen.documentos, resumen.control.documentos, cuadre.documentos, false],
    ["Abonos", resumen.pagos, resumen.control.pagos, cuadre.pagos, false],
    ["Neto facturado", resumen.sumaNeto, resumen.control.suma_neto_a_pagar, cuadre.neto, true],
    ["Total abonado", resumen.sumaPagos, resumen.control.suma_pagos, cuadre.pagosValor, true],
    ["Saldos de 2025", resumen.sumaSaldos, resumen.control.suma_saldos_iniciales_2025, cuadre.saldos, true],
  ];
  const todo = Object.values(cuadre).every(Boolean);
  return (
    <div className={`rounded-lg border p-3 ${todo
      ? "border-emerald-300 dark:border-emerald-500/50 bg-emerald-50 dark:bg-gris-800"
      : "border-red-300 dark:border-red-500/50 bg-red-50 dark:bg-gris-800"}`}>
      <div className="text-sm font-medium mb-2">
        {todo ? "✔ Cuadra con los totales del Excel" : "✕ No cuadra con los totales del Excel"}
      </div>
      <table className="w-full text-xs">
        <thead>
          <tr className="text-left text-gray-500 dark:text-gray-400">
            <th className="py-1 pr-3">Concepto</th>
            <th className="py-1 pr-3 text-right">Leído</th>
            <th className="py-1 pr-3 text-right">Declarado en el archivo</th>
            <th className="py-1"></th>
          </tr>
        </thead>
        <tbody>
          {filas.map(([label, leido, control, ok, plata]) => (
            <tr key={label} className="border-t border-gray-200/60 dark:border-gris-700/60">
              <td className="py-1 pr-3">{label}</td>
              <td className="py-1 pr-3 text-right tabular-nums">{plata ? formatCOP(leido) : leido}</td>
              <td className="py-1 pr-3 text-right tabular-nums">{plata ? formatCOP(control ?? 0) : (control ?? "—")}</td>
              <td className="py-1">{ok ? "✔" : <span className="text-red-600 dark:text-red-400 font-semibold">✕</span>}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/**
 * Importación del JSON de migración del libro de Excel.
 *
 * Toda la lectura y la reimputación son puras (modules/contabilidad/
 * importarMigracion.js); esta pantalla solo enseña lo que salió, cruza los
 * clientes contra la base de empresas y confirma.
 */
export default function ImportarMigracion({ texto, empresas, onImportado, onDescartar }) {
  const [plazo, setPlazo] = React.useState(PLAZO_POR_DEFECTO);
  const [crearFaltantes, setCrearFaltantes] = React.useState(true);
  const [guardando, setGuardando] = React.useState(false);
  const [progreso, setProgreso] = React.useState({ hechos: 0, total: 0 });

  const analisis = React.useMemo(() => importarMigracion(texto, { plazoDias: plazo }), [texto, plazo]);

  // Cada cliente del archivo contra la base de empresas, con el mismo criterio
  // que usa el resto de la app.
  const vinculos = React.useMemo(() => {
    const mapa = new Map();
    for (const c of analisis.clientes || []) {
      const { empresa } = resolverEmpresa({ nombre: c.nombre }, empresas);
      mapa.set(c.id, { nombre: c.nombre, empresa: empresa || null });
    }
    return mapa;
  }, [analisis.clientes, empresas]);

  const reconocidos = [...vinculos.values()].filter((v) => v.empresa).length;
  const nuevos = vinculos.size - reconocidos;
  const r = analisis.resumen;
  const cuadraTodo = r && Object.values(r.cuadre).every(Boolean);

  const confirmar = async () => {
    setGuardando(true);
    setProgreso({ hechos: 0, total: 0 });
    try {
      // Los clientes se resuelven antes del lote: crear una empresa a mitad de
      // la escritura dejaría media migración vinculada y la otra media no.
      const empresaPorCliente = new Map();
      for (const [cid, { nombre, empresa }] of vinculos) {
        if (empresa) { empresaPorCliente.set(cid, empresa.id); continue; }
        if (!crearFaltantes) continue;
        const { id } = await resolverOCrearEmpresa({ nombre }, { empresas });
        if (id) empresaPorCliente.set(cid, id);
      }

      const res = await importarMigracionLote(
        { documentos: analisis.documentos, saldos: analisis.saldos, pagos: analisis.pagos },
        { empresaPorCliente, onProgreso: (hechos, total) => setProgreso({ hechos, total }) }
      );
      if (res.sinDestino.length) {
        console.warn("Aplicaciones sin destino", res.sinDestino);
      }
      toast.success(`Migrados ${res.documentos} documentos, ${res.saldos} saldos y ${res.pagos} abonos.`);
      onImportado?.(res);
    } catch (e) {
      console.error("Falló la migración", e);
      toast.error("Falló la migración. Revisa la consola y vuelve a intentarlo.");
    } finally {
      setGuardando(false);
    }
  };

  if (!analisis.ok) {
    return (
      <div className="rounded-lg border border-red-300 dark:border-red-500/50 bg-red-50 dark:bg-gris-800 p-4">
        <div className="text-sm font-medium text-red-700 dark:text-red-400">No se pudo leer el archivo</div>
        <div className="text-xs text-red-700 dark:text-red-300 mt-1">{analisis.error}</div>
        <div className="mt-3"><Button variant="secondary" onClick={onDescartar}>Descartar</Button></div>
      </div>
    );
  }

  const conAvisos = analisis.documentos.filter((d) => d.avisos.length);

  return (
    <div className="grid gap-4">
      <div className="rounded-lg border border-gray-200 dark:border-gris-700 bg-white dark:bg-gris-800 p-4 grid gap-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <span className="text-sm font-medium">Migración del libro {r.periodo}</span>
            <Badge tone="info" className="ml-2">JSON</Badge>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs text-gray-500 dark:text-gray-400" htmlFor="plazo-mig">Plazo (días)</label>
            <input
              id="plazo-mig" type="number" min={0} value={plazo}
              onChange={(e) => setPlazo(Math.max(0, Number(e.target.value) || 0))}
              className="w-20 px-2 py-1 text-sm rounded border border-gray-300 dark:border-gris-600 bg-white dark:bg-gris-700"
            />
            <Button variant="secondary" size="sm" onClick={onDescartar} disabled={guardando}>Descartar</Button>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-7 gap-2">
          <Dato titulo="Facturas" valor={r.facturas} />
          <Dato titulo="Notas crédito" valor={r.notasCredito} />
          <Dato titulo="Notas débito" valor={r.notasDebito} />
          <Dato titulo="Saldos 2025" valor={r.saldos} />
          <Dato titulo="Abonos" valor={r.pagos} />
          <Dato titulo="Clientes" valor={r.clientes} />
          <Dato titulo="Advertencias" valor={r.avisos} tono={r.avisos ? "text-amber-600 dark:text-amber-400" : ""} />
        </div>
      </div>

      <Cuadre cuadre={r.cuadre} resumen={r} />

      {/* Reimputación: lo que cambia frente al Excel. */}
      <div className="rounded-lg border border-gray-200 dark:border-gris-700 bg-white dark:bg-gris-800 p-4 grid gap-2">
        <div className="text-sm font-medium">Reparto de los abonos</div>
        <p className="text-xs text-gray-600 dark:text-gray-300">
          En el Excel el abono consolidado se anotaba sobre una sola factura. Aquí cada uno se aplica a lo que el
          cliente debe, de lo más viejo a lo más nuevo: el saldo por cliente no cambia y ninguna factura queda con
          más plata encima de la que vale.
        </p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          <Dato titulo="Repartido" valor={formatCOP(r.imputacion.repartido)} />
          <Dato
            titulo="Anticipos sin aplicar"
            valor={formatCOP(r.imputacion.sobrante)}
            tono={r.imputacion.sobrante ? "text-blue-600 dark:text-blue-400" : ""}
          />
          <Dato titulo="Abonos que cubren varias facturas" valor={r.imputacion.conVariasFacturas} />
          <Dato titulo="Notas crédito enlazadas" valor={`${r.enlaces.enlazadas} de ${r.notasCredito}`} />
        </div>
      </div>

      {(r.enlaces.ambiguas.length > 0 || r.enlaces.sinEnlace.length > 0) && (
        <div className="rounded-lg border border-amber-300 dark:border-amber-500/50 bg-amber-50 dark:bg-gris-800 p-3">
          <div className="text-sm font-medium text-amber-800 dark:text-amber-400 mb-1">
            Notas crédito que quedan sin enlazar ({r.enlaces.ambiguas.length + r.enlaces.sinEnlace.length})
          </div>
          <p className="text-xs text-amber-800 dark:text-amber-300 mb-2">
            Se importan igual y descuentan del saldo del cliente; solo no quedan colgadas de una factura concreta.
            Colgarlas de la equivocada sería peor. Se pueden enlazar a mano después.
          </p>
          <ul className="text-xs text-amber-800 dark:text-amber-300 grid gap-0.5">
            {r.enlaces.ambiguas.map((a) => (
              <li key={a.nota}>{a.nota}: coinciden {a.candidatas.length} facturas ({a.candidatas.join(", ")})</li>
            ))}
            {r.enlaces.sinEnlace.map((n) => <li key={n}>{n}: ninguna factura del cliente coincide con su valor</li>)}
          </ul>
        </div>
      )}

      <div className="rounded-lg border border-gray-200 dark:border-gris-700 bg-white dark:bg-gris-800 p-4 grid gap-2">
        <div className="text-sm font-medium">Clientes</div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          <Dato titulo="Ya existen en Empresas" valor={reconocidos} />
          <Dato titulo="Nuevos" valor={nuevos} tono={nuevos ? "text-amber-600 dark:text-amber-400" : ""} />
        </div>
        {nuevos > 0 && (
          <label className="flex items-start gap-2 text-xs">
            <input type="checkbox" checked={crearFaltantes} onChange={(e) => setCrearFaltantes(e.target.checked)} className="mt-0.5" />
            <span>
              Crear en la base de empresas los {nuevos} clientes que no se reconocieron. Sin esto sus facturas
              quedan sin vincular y su cartera no se suma con la del mismo cliente.
            </span>
          </label>
        )}
      </div>

      {conAvisos.length > 0 && (
        <details className="rounded-lg border border-gray-200 dark:border-gris-700 bg-white dark:bg-gris-800 p-3">
          <summary className="text-sm font-medium cursor-pointer">
            Advertencias por documento ({conAvisos.length}) — se importan igual
          </summary>
          <ul className="text-xs text-gray-600 dark:text-gray-300 grid gap-0.5 mt-2 max-h-56 overflow-y-auto">
            {conAvisos.map((d) => (
              <li key={d.claveOrigen}>
                <span className="font-medium">{d.numero || d.claveOrigen}</span>
                {d.filaExcel ? ` (fila ${d.filaExcel})` : ""}: {d.avisos.join(" ")}
              </li>
            ))}
          </ul>
        </details>
      )}

      <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gris-700 bg-white dark:bg-gris-800">
        <table className="w-full text-xs">
          <thead>
            <tr className="text-left text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gris-700">
              <th className="py-2 px-3">Fila</th>
              <th className="py-2 pr-3">Documento</th>
              <th className="py-2 pr-3">Fecha</th>
              <th className="py-2 pr-3">Cliente</th>
              <th className="py-2 pr-3">Concepto</th>
              <th className="py-2 pr-3 text-right">Neto</th>
            </tr>
          </thead>
          <tbody>
            {analisis.documentos.slice(0, 25).map((d) => (
              <tr key={d.claveOrigen} className="border-t border-gray-200/60 dark:border-gris-700/60">
                <td className="py-2 px-3">{d.filaExcel ?? "—"}</td>
                <td className="py-2 pr-3">
                  {d.numero}
                  {d.tipo === TIPO_NOTA_CREDITO && <div><Badge tone="purple">Nota crédito</Badge></div>}
                  {d.tipo === TIPO_NOTA_DEBITO && <div><Badge tone="warning">Nota débito</Badge></div>}
                </td>
                <td className="py-2 pr-3 whitespace-nowrap">{d.fecha || "—"}</td>
                <td className="py-2 pr-3">
                  <div className="max-w-[26ch] truncate" title={d.clienteNombre}>{d.clienteNombre}</div>
                  {!vinculos.get(d.clienteOrigenId)?.empresa && (
                    <span className="text-[10px] text-amber-600 dark:text-amber-400">
                      {crearFaltantes ? "se creará" : "sin vincular"}
                    </span>
                  )}
                </td>
                <td className="py-2 pr-3"><div className="max-w-[24ch] truncate">{d.items[0]?.producto}</div></td>
                <td className="py-2 pr-3 text-right whitespace-nowrap">{formatCOP(d.neto)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {analisis.documentos.length > 25 && (
          <div className="px-3 py-2 text-[11px] text-gray-500 dark:text-gray-400 border-t border-gray-200 dark:border-gris-700">
            Se muestran 25 de {analisis.documentos.length}. Se importarán todos.
          </div>
        )}
      </div>

      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        {guardando && progreso.total > 0 && (
          <div className="flex-1">
            <div className="h-2 rounded-full bg-gray-200 dark:bg-gris-700 overflow-hidden">
              <div
                className="h-full bg-trafico transition-[width] duration-150"
                style={{ width: `${Math.round((progreso.hechos / progreso.total) * 100)}%` }}
              />
            </div>
            <div className="text-[11px] text-gray-500 dark:text-gray-400 mt-1">
              Guardando {progreso.hechos} de {progreso.total}…
            </div>
          </div>
        )}
        {!cuadraTodo && (
          <div className="text-xs text-red-600 dark:text-red-400">
            No se importa mientras el cuadre no dé: revisa el archivo.
          </div>
        )}
        <Button variant="primary" onClick={confirmar} disabled={guardando || !cuadraTodo} className="md:ml-auto">
          {guardando ? "Migrando…" : `Migrar ${r.documentos} documentos, ${r.saldos} saldos y ${r.pagos} abonos`}
        </Button>
      </div>
    </div>
  );
}
