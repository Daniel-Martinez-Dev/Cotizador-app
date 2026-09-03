import React from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import Badge from "../../components/ui/Badge";
import Button from "../../components/ui/Button";
import Combobox from "../../components/ui/Combobox";
import ConfirmDialog from "../../components/ui/ConfirmDialog";
import EmptyState from "../../components/ui/EmptyState";
import { Aviso, Buscador, Card, Casilla, KPI, Money, claseControl } from "./ui";
import {
  POR_HERMANA,
  agruparSinVincular,
  etiquetaMotivo,
  resumenVinculacion,
} from "../../modules/contabilidad/vinculacion";
import { vincularDocumentos } from "../../utils/firebaseContabilidad";
import { resolverOCrearEmpresa } from "../../utils/firebaseCompanies";
import { agruparDuplicados } from "../../utils/empresaIdentidad";

const normalizar = (t) =>
  String(t ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

const tonoMotivo = (motivo) =>
  motivo === "nit" ? "success" : motivo === POR_HERMANA ? "info" : "warning";

/**
 * Vincular las facturas con la base de clientes.
 *
 * El libro de Excel guardaba el cliente como texto libre en cada fila, así que
 * al migrar quedan facturas colgando de un nombre y no de una empresa. Mientras
 * eso siga así, la cartera de ese cliente está partida en dos: una parte suma
 * bajo la empresa y otra bajo el nombre suelto, y ninguna de las dos es la
 * deuda real.
 *
 * Esta pantalla existe porque arreglarlo factura por factura eran 300 modales.
 * Agrupa por cliente, propone con quién unir cada grupo y lo aplica de una.
 */
export default function ClientesTab({ liquidados, empresas, cargando, anio, recargar }) {
  const navigate = useNavigate();
  const [verDuplicados, setVerDuplicados] = React.useState(false);
  const [busqueda, setBusqueda] = React.useState("");
  const [soloConSaldo, setSoloConSaldo] = React.useState(false);
  const [manual, setManual] = React.useState({}); // clave de grupo -> empresa elegida a mano
  const [trabajando, setTrabajando] = React.useState("");
  const [confirmarLote, setConfirmarLote] = React.useState(false);

  const resumen = React.useMemo(() => resumenVinculacion(liquidados), [liquidados]);
  const grupos = React.useMemo(
    () => agruparSinVincular(liquidados, empresas),
    [liquidados, empresas]
  );

  const filtrados = React.useMemo(() => {
    const termino = normalizar(busqueda);
    return grupos.filter((g) => {
      if (soloConSaldo && Math.abs(g.saldo) < 1) return false;
      if (!termino) return true;
      return normalizar(`${g.nombre} ${g.nit} ${g.variantes.join(" ")}`).includes(termino);
    });
  }, [grupos, busqueda, soloConSaldo]);

  const conSugerencia = React.useMemo(() => grupos.filter((g) => g.sugerida), [grupos]);

  const opcionesEmpresa = React.useMemo(
    () => empresas.map((e) => ({ id: e.id, label: e.nombre, sublabel: e.nit || e.alias || "", empresa: e })),
    [empresas]
  );

  // Clientes repetidos en la base. Al importar se dio de alta con el nombre
  // corto del Excel a clientes que ya existían con su razón social completa
  // ("AXIONLOG" contra "AXIONLOG COLOMBIA S.A.S."), y quedaron dos fichas del
  // mismo cliente con su cartera partida. Aquí solo se avisan: fusionar borra
  // una empresa, es de administrador y vive en la pantalla de Empresas.
  const duplicados = React.useMemo(() => agruparDuplicados(empresas), [empresas]);

  const aplicar = async (grupo, empresa) => {
    if (!empresa?.id) return;
    setTrabajando(grupo.clave);
    try {
      const n = await vincularDocumentos(grupo.documentos.map((d) => d.id), empresa);
      toast.success(`${n} documento${n === 1 ? "" : "s"} vinculado${n === 1 ? "" : "s"} a ${empresa.nombre}.`);
      recargar();
    } catch (e) {
      console.error("No se pudo vincular", e);
      toast.error("No se pudieron vincular los documentos.");
    } finally {
      setTrabajando("");
    }
  };

  // Dar de alta al cliente con el nombre y el NIT que traía la factura. Pasa
  // por resolverOCrearEmpresa y no por crearEmpresa a secas para no duplicar:
  // entre que se cargó esta pantalla y se pulsa el botón, el cliente pudo
  // haberse creado desde una cotización.
  const crearYVincular = async (grupo) => {
    setTrabajando(grupo.clave);
    try {
      const { empresa, creada } = await resolverOCrearEmpresa({ nombre: grupo.nombre, nit: grupo.nit });
      if (!empresa) { toast.error("Falta el nombre del cliente."); return; }
      const n = await vincularDocumentos(grupo.documentos.map((d) => d.id), empresa);
      toast.success(`${creada ? "Cliente creado" : "Cliente ya existía"}: ${n} documento${n === 1 ? "" : "s"} vinculado${n === 1 ? "" : "s"}.`);
      recargar();
    } catch (e) {
      console.error("No se pudo crear el cliente", e);
      toast.error("No se pudo crear el cliente.");
    } finally {
      setTrabajando("");
    }
  };

  const aplicarTodas = async () => {
    setConfirmarLote(false);
    setTrabajando("lote");
    let hechos = 0;
    try {
      for (const grupo of conSugerencia) {
        hechos += await vincularDocumentos(grupo.documentos.map((d) => d.id), grupo.sugerida);
      }
      toast.success(`${hechos} documentos vinculados en ${conSugerencia.length} clientes.`);
      recargar();
    } catch (e) {
      console.error("No se pudieron aplicar las sugerencias", e);
      toast.error(`Se vincularon ${hechos} documentos y luego falló. Vuelve a intentar.`);
      recargar();
    } finally {
      setTrabajando("");
    }
  };

  if (cargando) return <EmptyState icon="⏳" title="Revisando los clientes…" />;

  return (
    <section className="grid gap-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
        <KPI titulo="Documentos vinculados" valor={`${resumen.vinculados} / ${resumen.total}`} detalle={`Año ${anio}`} tono="bueno" />
        <KPI titulo="Sin vincular" valor={resumen.sinVincular} detalle={`${resumen.clientes} clientes distintos`} tono={resumen.sinVincular ? "aviso" : "neutral"} />
        <KPI titulo="Saldo suelto" valor={<Money valor={resumen.saldo} cero="" />} detalle="Cartera que no suma con su cliente" tono={resumen.saldo ? "malo" : "neutral"} />
        <KPI titulo="Con sugerencia" valor={conSugerencia.length} detalle="Listos para vincular de una" tono="info" />
      </div>

      <Aviso tono="info" titulo="Por qué importa">
        Una factura sin cliente vinculado cuenta su saldo aparte del resto de la cartera de esa misma
        empresa, aunque el nombre se parezca. Vincularla no cambia ni un peso del documento: solo lo
        cuelga del cliente correcto y unifica el nombre con el que aparece en toda la app.
      </Aviso>

      {duplicados.length > 0 && (
        <Aviso
          tono="aviso"
          titulo={`${duplicados.length} cliente${duplicados.length === 1 ? "" : "s"} aparece${duplicados.length === 1 ? "" : "n"} repetido${duplicados.length === 1 ? "" : "s"} en la base`}
          acciones={
            <div className="flex gap-2">
              <Button size="sm" variant="secondary" onClick={() => setVerDuplicados((v) => !v)}>
                {verDuplicados ? "Ocultar" : "Ver cuáles"}
              </Button>
              <Button size="sm" variant="accent" onClick={() => navigate("/empresas")}>
                Fusionar en Empresas
              </Button>
            </div>
          }
        >
          Al importar se creó un cliente nuevo para nombres que ya existían escritos de otra forma.
          Mientras estén separados, su cartera se cuenta en dos. Al fusionarlos, sus facturas, abonos,
          fichas y cotizaciones pasan a la empresa que se conserva.
          {verDuplicados && (
            <ul className="mt-2 grid gap-1.5">
              {duplicados.slice(0, 30).map((g) => (
                <li key={g.clave} className="flex flex-wrap items-baseline gap-x-2">
                  <Badge tone={g.certeza === "alta" ? "danger" : "warning"}>
                    {g.certeza === "alta" ? "Seguro" : "Revisar"}
                  </Badge>
                  <span className="font-medium">{g.empresas.map((e) => e.nombre).join("  ·  ")}</span>
                  <span className="opacity-70">({g.motivos.join(", ")})</span>
                </li>
              ))}
              {duplicados.length > 30 && (
                <li className="opacity-70">… y {duplicados.length - 30} más.</li>
              )}
            </ul>
          )}
        </Aviso>
      )}

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
            {filtrados.length} de {grupos.length}
          </span>
          {conSugerencia.length > 0 && (
            <Button
              variant="primary"
              onClick={() => setConfirmarLote(true)}
              disabled={Boolean(trabajando)}
            >
              {trabajando === "lote" ? "Vinculando…" : `Aplicar ${conSugerencia.length} sugerencias`}
            </Button>
          )}
        </div>
      </Card>

      {!grupos.length ? (
        <EmptyState
          icon="🔗"
          title="Todas las facturas tienen su cliente"
          description={`Los ${resumen.total} documentos de ${anio} están vinculados a la base de clientes.`}
        />
      ) : !filtrados.length ? (
        <EmptyState icon="🔎" title="Ningún cliente coincide con el filtro" />
      ) : (
        <div className="grid gap-2">
          {filtrados.map((grupo) => {
            const elegida = manual[grupo.clave] || null;
            const ocupado = trabajando === grupo.clave || trabajando === "lote";
            return (
              <Card key={grupo.clave} padding="p-3.5" className="grid gap-3">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-semibold text-sm text-gray-900 dark:text-white truncate">{grupo.nombre}</div>
                    <div className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
                      {grupo.nit ? `NIT ${grupo.nit}` : "Sin NIT"} · {grupo.cantidad} documento{grupo.cantidad === 1 ? "" : "s"}
                    </div>
                    {grupo.variantes.length > 1 && (
                      <div className="text-[11px] text-gray-400 dark:text-gray-500 mt-1">
                        También escrito: {grupo.variantes.slice(1).join(" · ")}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-5 text-right shrink-0">
                    <div>
                      <div className="text-[10px] uppercase tracking-wider text-gray-500 dark:text-gray-400">Facturado</div>
                      <div className="text-sm"><Money valor={grupo.neto} /></div>
                    </div>
                    <div>
                      <div className="text-[10px] uppercase tracking-wider text-gray-500 dark:text-gray-400">Saldo</div>
                      <div className={`text-sm ${Math.abs(grupo.saldo) >= 1 ? "text-amber-600 dark:text-amber-400" : ""}`}>
                        <Money valor={grupo.saldo} fuerte />
                      </div>
                    </div>
                  </div>
                </div>

                {grupo.sugerida ? (
                  <div className="flex flex-wrap items-center gap-2 rounded-lg bg-gray-50 dark:bg-gris-900/50 px-3 py-2">
                    <Badge tone={tonoMotivo(grupo.motivo)}>{etiquetaMotivo(grupo.motivo)}</Badge>
                    <span className="text-sm text-gray-700 dark:text-gray-200 min-w-0 truncate">
                      → <strong>{grupo.sugerida.nombre}</strong>
                      {grupo.sugerida.nit && <span className="text-gray-500 dark:text-gray-400"> · {grupo.sugerida.nit}</span>}
                    </span>
                    <Button
                      size="sm"
                      variant="primary"
                      className="ml-auto"
                      disabled={ocupado}
                      onClick={() => aplicar(grupo, grupo.sugerida)}
                    >
                      {ocupado ? "…" : "Vincular"}
                    </Button>
                  </div>
                ) : (
                  <div className="grid gap-2">
                    {grupo.posibles.length > 0 && (
                      <Aviso tono="aviso" titulo="Se parece a un cliente que ya existe">
                        {grupo.posibles.map((p) => p.empresa.nombre).join(" · ")}. No se vinculan solos porque
                        pueden ser empresas distintas de verdad; elige abajo si es alguno.
                      </Aviso>
                    )}
                    <div className="flex flex-col sm:flex-row gap-2">
                      <Combobox
                        value={elegida?.nombre || ""}
                        onChange={(v) => setManual((p) => ({ ...p, [grupo.clave]: v ? { nombre: v } : null }))}
                        onSelect={(op) => setManual((p) => ({ ...p, [grupo.clave]: op.empresa }))}
                        options={opcionesEmpresa}
                        placeholder="Buscar el cliente en la base…"
                        className="flex-1"
                        inputClassName={claseControl}
                      />
                      <Button
                        variant="accent"
                        disabled={!elegida?.id || ocupado}
                        onClick={() => aplicar(grupo, elegida)}
                      >
                        Vincular
                      </Button>
                      <Button variant="secondary" disabled={ocupado} onClick={() => crearYVincular(grupo)}>
                        Crear cliente
                      </Button>
                    </div>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {confirmarLote && (
        <ConfirmDialog
          title={`Vincular ${conSugerencia.length} clientes`}
          message={
            `Se colgarán de su empresa los documentos de ${conSugerencia.length} clientes ` +
            `(${conSugerencia.reduce((a, g) => a + g.cantidad, 0)} en total) y su nombre pasará a ser el de la base.\n\n` +
            "No cambia ningún valor de las facturas ni de los abonos. Se puede volver a cambiar el cliente factura por factura."
          }
          confirmLabel="Vincular"
          onConfirm={aplicarTodas}
          onCancel={() => setConfirmarLote(false)}
        />
      )}
    </section>
  );
}
