import React from "react";
import toast from "react-hot-toast";
import Button from "../../components/ui/Button";
import Badge from "../../components/ui/Badge";
import EmptyState from "../../components/ui/EmptyState";
import { formatCOP } from "../inventario/inventarioUtils";
import { PLAZO_POR_DEFECTO, TIPO_NOTA_CREDITO } from "../../modules/contabilidad/catalogos";
import { importarFact } from "../../modules/contabilidad/importarFact";
import { repararJsonDeExcel } from "../../modules/contabilidad/importarMigracion";
import ImportarMigracion from "./ImportarMigracion";
import { eliminarLoteImportacion, importarLote } from "../../utils/firebaseContabilidad";
import { resolverEmpresa } from "../../utils/empresaIdentidad";
import { resolverOCrearEmpresa } from "../../utils/firebaseCompanies";
import { Campo, InputNumero, Seccion, claseControl } from "./ui";

const PASOS = [
  "El JSON de migración (con clientes, documentos, pagos y saldos ya normalizados), o",
  "la hoja FACT guardada como CSV (Archivo → Guardar como → CSV UTF-8).",
  "Sube el archivo o pega su contenido: se reconoce solo cuál de los dos es.",
  "Revisa la vista previa; nada se guarda hasta que confirmes.",
];

// El JSON de migración se reconoce por su forma, no por la extensión: el
// archivo suele llegar pegado desde una celda de Excel y ni siquiera es JSON
// válido hasta que se repara (ver repararJsonDeExcel).
function esMigracion(texto) {
  const limpio = repararJsonDeExcel(texto).trimStart();
  if (!limpio.startsWith("{")) return false;
  try {
    const datos = JSON.parse(limpio);
    return Array.isArray(datos?.documentos) && Boolean(datos?.catalogos || datos?.totales_control);
  } catch {
    return false;
  }
}

function Dato({ titulo, valor, tono = "" }) {
  return (
    <div className="rounded border border-gray-200 dark:border-gris-700 px-3 py-2">
      <div className="text-[11px] uppercase tracking-wide text-gray-500 dark:text-gray-400">{titulo}</div>
      <div className={`text-sm font-semibold mt-0.5 ${tono}`}>{valor}</div>
    </div>
  );
}

/**
 * Importación de la hoja FACT. La lectura y la interpretación son puras (ver
 * modules/contabilidad/importarFact.js); esta pantalla solo enseña lo que salió
 * y cruza los clientes contra la base de empresas antes de escribir nada.
 */
export default function ImportarTab({ empresas, onImportado }) {
  const [texto, setTexto] = React.useState("");
  const [plazo, setPlazo] = React.useState(PLAZO_POR_DEFECTO);
  const [crearFaltantes, setCrearFaltantes] = React.useState(true);
  const [guardando, setGuardando] = React.useState(false);
  const [progreso, setProgreso] = React.useState({ hechos: 0, total: 0 });
  // Último lote guardado, para poder deshacerlo si el archivo venía con las
  // columnas corridas o con el año equivocado. Sobrevive a un F5 porque el
  // error casi siempre se nota al mirar la pestaña de Facturas.
  const [ultimoLote, setUltimoLote] = React.useState(() => {
    try { return JSON.parse(localStorage.getItem("contabilidadUltimoLote") || "null"); } catch { return null; }
  });
  const inputArchivo = React.useRef(null);

  const migracion = React.useMemo(() => (texto.trim() ? esMigracion(texto) : false), [texto]);

  const analisis = React.useMemo(
    () => (texto.trim() && !migracion ? importarFact(texto, { plazoDias: plazo }) : null),
    [texto, plazo, migracion]
  );

  // Cada cliente del archivo contra la base de empresas, con el mismo criterio
  // que usa el resto de la app. Lo que no se reconoce se crea (o se deja sin
  // vincular, si se prefiere revisarlo a mano después).
  const vinculos = React.useMemo(() => {
    if (!analisis) return new Map();
    const nombres = new Set([
      ...analisis.documentos.map((d) => d.clienteNombre),
      ...analisis.saldosIniciales.map((s) => s.clienteNombre),
    ].filter(Boolean));
    const mapa = new Map();
    for (const nombre of nombres) {
      const { empresa, motivo } = resolverEmpresa({ nombre }, empresas);
      mapa.set(nombre, { empresa: empresa || null, motivo });
    }
    return mapa;
  }, [analisis, empresas]);

  const reconocidos = [...vinculos.values()].filter((v) => v.empresa).length;
  const nuevos = vinculos.size - reconocidos;

  const leerArchivo = async (archivo) => {
    if (!archivo) return;
    try {
      setTexto(await archivo.text());
    } catch (e) {
      console.error("No se pudo leer el archivo", e);
      toast.error("No se pudo leer el archivo.");
    }
  };

  const limpiar = () => {
    setTexto("");
    setProgreso({ hechos: 0, total: 0 });
    if (inputArchivo.current) inputArchivo.current.value = "";
  };

  const confirmar = async () => {
    if (!analisis?.documentos.length && !analisis?.saldosIniciales.length) return;
    setGuardando(true);
    setProgreso({ hechos: 0, total: 0 });
    try {
      // Los clientes se resuelven antes del lote: crear una empresa en mitad de
      // la escritura dejaría la mitad de las facturas vinculadas y la otra no.
      const porNombre = new Map();
      for (const [nombre, { empresa }] of vinculos) {
        if (empresa) { porNombre.set(nombre, empresa.id); continue; }
        if (!crearFaltantes) continue;
        const { id } = await resolverOCrearEmpresa({ nombre }, { empresas });
        if (id) porNombre.set(nombre, id);
      }

      const conEmpresa = (fila) => ({ ...fila, empresaId: porNombre.get(fila.clienteNombre) || "" });

      const resultado = await importarLote(
        {
          documentos: analisis.documentos.map(conEmpresa),
          saldosIniciales: analisis.saldosIniciales.map(conEmpresa),
        },
        { onProgreso: (hechos, total) => setProgreso({ hechos, total }) }
      );

      const lote = {
        id: resultado.loteImportacion,
        documentos: resultado.documentos,
        saldosIniciales: resultado.saldosIniciales,
        fecha: new Date().toLocaleString("es-CO"),
      };
      setUltimoLote(lote);
      try { localStorage.setItem("contabilidadUltimoLote", JSON.stringify(lote)); } catch {}
      toast.success(`Importados ${resultado.documentos} documentos y ${resultado.saldosIniciales} saldos.`);
      limpiar();
      onImportado?.();
    } catch (e) {
      console.error("Falló la importación", e);
      toast.error("Falló la importación. Revisa la consola y vuelve a intentarlo.");
    } finally {
      setGuardando(false);
    }
  };

  const deshacer = async () => {
    if (!ultimoLote?.id) return;
    setGuardando(true);
    setProgreso({ hechos: 0, total: 0 });
    try {
      const { borrados } = await eliminarLoteImportacion(ultimoLote.id, {
        onProgreso: (hechos, total) => setProgreso({ hechos, total }),
      });
      setUltimoLote(null);
      try { localStorage.removeItem("contabilidadUltimoLote"); } catch {}
      toast.success(`Se deshizo la importación: ${borrados} registros eliminados.`);
      onImportado?.();
    } catch (e) {
      console.error("No se pudo deshacer la importación", e);
      toast.error("No se pudo deshacer la importación.");
    } finally {
      setGuardando(false);
    }
  };

  const resumen = analisis?.resumen;

  return (
    <section className="grid gap-4">
      {ultimoLote && (
        <div className="rounded-lg border border-emerald-300 dark:border-emerald-500/50 bg-emerald-50 dark:bg-gris-800 p-3 flex flex-col md:flex-row md:items-center gap-3">
          <div className="flex-1 text-xs text-emerald-900 dark:text-emerald-300">
            Última importación: {ultimoLote.documentos} documentos y {ultimoLote.saldosIniciales} saldos, el {ultimoLote.fecha}.
            Si el archivo venía mal, se puede deshacer completa —solo borra lo que entró en esa carga—.
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => {
              setUltimoLote(null);
              try { localStorage.removeItem("contabilidadUltimoLote"); } catch {}
            }} disabled={guardando}>
              Está bien
            </Button>
            <Button variant="danger" onClick={deshacer} disabled={guardando}>
              {guardando ? "Deshaciendo…" : "Deshacer importación"}
            </Button>
          </div>
        </div>
      )}

      <Seccion titulo="Traer el histórico desde el libro de Excel" descripcion="Se aceptan dos formatos.">
        <div className="grid gap-3">
          <ol className="text-xs text-gray-600 dark:text-gray-300 list-decimal pl-5 grid gap-1">
            {PASOS.map((paso) => <li key={paso}>{paso}</li>)}
          </ol>

          <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-3 items-start">
            <Campo label="Archivo (JSON o CSV)">
              <input
                ref={inputArchivo}
                type="file"
                accept=".json,.csv,text/csv,application/json,text/plain"
                onChange={(e) => leerArchivo(e.target.files?.[0])}
                className="text-xs file:mr-3 file:h-9 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-medium file:bg-gray-100 dark:file:bg-gris-700 file:text-gray-700 dark:file:text-gray-200 hover:file:bg-gray-200 dark:hover:file:bg-gris-600 file:cursor-pointer"
              />
            </Campo>
            <div className={`w-40 ${migracion ? "hidden" : ""}`}>
              <Campo
                label="Plazo de pago (días)"
                hint="El Excel no tenía vencimiento; se calcula desde la fecha de cada factura."
              >
                <InputNumero
                  min={0}
                  value={plazo}
                  onChange={(e) => setPlazo(Math.max(0, Number(e.target.value) || 0))}
                />
              </Campo>
            </div>
          </div>

          <Campo label="O pega aquí el contenido">
            <textarea
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              rows={5}
              placeholder={'{"meta": … }   o   MES;FECHA;CLIENTE;No. FACT;…'}
              className={`${claseControl} h-auto py-2 font-mono text-[11px] leading-relaxed`}
            />
          </Campo>
        </div>
      </Seccion>

      {migracion ? (
        <ImportarMigracion
          texto={texto}
          empresas={empresas}
          onDescartar={limpiar}
          onImportado={(res) => {
            const lote = { id: res.loteImportacion, documentos: res.documentos + res.saldos,
              saldosIniciales: res.saldos, fecha: new Date().toLocaleString("es-CO") };
            setUltimoLote(lote);
            try { localStorage.setItem("contabilidadUltimoLote", JSON.stringify(lote)); } catch {}
            limpiar();
            onImportado?.();
          }}
        />
      ) : !analisis ? (
        <EmptyState icon="📥" title="Sin archivo cargado" description="Sube el archivo o pega su contenido para ver la vista previa." />
      ) : (
        <>
          <div className="rounded-lg border border-gray-200 dark:border-gris-700 bg-white dark:bg-gris-800 p-4 grid gap-3">
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-medium">Vista previa</span>
              <Button variant="secondary" size="sm" onClick={limpiar} disabled={guardando}>Descartar</Button>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-6 gap-2">
              <Dato titulo="Facturas" valor={resumen.facturas} />
              <Dato titulo="Notas crédito" valor={resumen.notasCredito} />
              <Dato titulo="Abonos" valor={resumen.pagos} />
              <Dato titulo="Saldos anteriores" valor={resumen.saldosIniciales} />
              <Dato titulo="Neto facturado" valor={formatCOP(resumen.totalNeto)} />
              <Dato titulo="Total abonado" valor={formatCOP(resumen.totalPagos)} />
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              <Dato titulo="Clientes reconocidos" valor={reconocidos} />
              <Dato
                titulo="Clientes nuevos"
                valor={nuevos}
                tono={nuevos ? "text-amber-600 dark:text-amber-400" : ""}
              />
              <Dato titulo="Filas ignoradas" valor={resumen.filasIgnoradas} />
              <Dato titulo="Errores" valor={resumen.errores} tono={resumen.errores ? "text-red-600 dark:text-red-400" : ""} />
            </div>

            {resumen.conMasDeTresPagos > 0 && (
              <div className="text-xs rounded border border-emerald-300 dark:border-emerald-500/50 bg-emerald-50 dark:bg-gris-700 text-emerald-800 dark:text-emerald-300 px-3 py-2">
                {resumen.conMasDeTresPagos} documento(s) traen más de tres abonos: en el Excel no cabían.
              </div>
            )}

            {nuevos > 0 && (
              <label className="flex items-start gap-2 text-xs">
                <input
                  type="checkbox"
                  checked={crearFaltantes}
                  onChange={(e) => setCrearFaltantes(e.target.checked)}
                  className="mt-0.5"
                />
                <span>
                  Crear en la base de empresas los {nuevos} clientes que no se reconocieron. Si lo dejas sin
                  marcar, esas facturas quedan sin vincular y su cartera no se suma con la del mismo cliente.
                </span>
              </label>
            )}
          </div>

          {resumen.errores > 0 && (
            <div className="rounded-lg border border-red-300 dark:border-red-500/50 bg-red-50 dark:bg-gris-800 p-3">
              <div className="text-sm font-medium text-red-700 dark:text-red-400 mb-1">
                Filas que no se van a importar
              </div>
              <ul className="text-xs text-red-700 dark:text-red-300 grid gap-0.5 max-h-40 overflow-y-auto">
                {analisis.errores.map((e, i) => (
                  <li key={`${e.fila}-${i}`}>Fila {e.fila}: {e.mensaje}</li>
                ))}
              </ul>
            </div>
          )}

          {resumen.avisos > 0 && (
            <div className="rounded-lg border border-amber-300 dark:border-amber-500/50 bg-amber-50 dark:bg-gris-800 p-3">
              <div className="text-sm font-medium text-amber-800 dark:text-amber-400 mb-1">
                Advertencias ({resumen.avisos}) — se importan igual
              </div>
              <ul className="text-xs text-amber-800 dark:text-amber-300 grid gap-0.5 max-h-40 overflow-y-auto">
                {analisis.documentos.filter((d) => d.avisos.length).slice(0, 50).map((d) => (
                  <li key={d._fila}>Fila {d._fila} ({d.numero || "sin número"}): {d.avisos.join(" ")}</li>
                ))}
              </ul>
            </div>
          )}

          {analisis.documentos.length > 0 && (
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
                    <th className="py-2 pr-3 text-right">Abonos</th>
                  </tr>
                </thead>
                <tbody>
                  {analisis.documentos.slice(0, 25).map((d) => {
                    const vinculo = vinculos.get(d.clienteNombre);
                    return (
                      <tr key={d._fila} className="border-t border-gray-200/60 dark:border-gris-700/60">
                        <td className="py-2 px-3">{d._fila}</td>
                        <td className="py-2 pr-3">
                          {d.numero || "—"}
                          {d.tipo === TIPO_NOTA_CREDITO && <div><Badge tone="purple">Nota crédito</Badge></div>}
                        </td>
                        <td className="py-2 pr-3 whitespace-nowrap">{d.fecha || "—"}</td>
                        <td className="py-2 pr-3">
                          <div className="max-w-[24ch] truncate" title={d.clienteNombre}>{d.clienteNombre}</div>
                          {!vinculo?.empresa && (
                            <span className="text-[10px] text-amber-600 dark:text-amber-400">
                              {crearFaltantes ? "se creará" : "sin vincular"}
                            </span>
                          )}
                        </td>
                        <td className="py-2 pr-3">
                          <div className="max-w-[22ch] truncate">{d.items[0]?.producto || "—"}</div>
                        </td>
                        <td className="py-2 pr-3 text-right whitespace-nowrap">{formatCOP(d.neto)}</td>
                        <td className="py-2 pr-3 text-right">{d.pagos.length}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {analisis.documentos.length > 25 && (
                <div className="px-3 py-2 text-[11px] text-gray-500 dark:text-gray-400 border-t border-gray-200 dark:border-gris-700">
                  Se muestran 25 de {analisis.documentos.length} documentos. Se importarán todos.
                </div>
              )}
            </div>
          )}

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
            <Button
              variant="primary"
              onClick={confirmar}
              disabled={guardando || (!resumen.documentos && !resumen.saldosIniciales)}
              className="md:ml-auto"
            >
              {guardando
                ? "Importando…"
                : `Importar ${resumen.documentos} documentos y ${resumen.saldosIniciales} saldos`}
            </Button>
          </div>
        </>
      )}
    </section>
  );
}
