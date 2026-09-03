import React from "react";
import toast from "react-hot-toast";
import Button from "../../components/ui/Button";
import Combobox from "../../components/ui/Combobox";
import Badge from "../../components/ui/Badge";
import { formatCOP } from "../inventario/inventarioUtils";
import { PRODUCTOS_ACTIVOS } from "../../data/catalogoProductos";
import {
  Aviso,
  Campo,
  Casilla,
  Input,
  InputNumero,
  Modal,
  Money,
  Seccion,
  Select,
  claseControl,
} from "./ui";
import {
  IVA_POR_DEFECTO,
  PLAZO_POR_DEFECTO,
  RETENCIONES_POR_DEFECTO,
  TIPOS_DOCUMENTO,
  TIPO_FACTURA,
  TIPO_NOTA_CREDITO,
  TIPO_NOTA_DEBITO,
  UNIDADES,
  UNIDAD_POR_DEFECTO,
} from "../../modules/contabilidad/catalogos";
import {
  aNumero,
  anioDe,
  calcularDocumento,
  hoyISO,
  subtotalItem,
  sumarDias,
} from "../../modules/contabilidad/calculos";
import { actualizarDocumento, buscarPorNumero, crearDocumento } from "../../utils/firebaseContabilidad";
import { buscarPosiblesDuplicados, resolverEmpresa } from "../../utils/empresaIdentidad";
import { resolverOCrearEmpresa } from "../../utils/firebaseCompanies";

const itemVacio = () => ({ producto: "", descripcion: "", cantidad: 1, unidad: UNIDAD_POR_DEFECTO, valorUnitario: 0 });

// Estado inicial del formulario. Una factura nueva nace con la fecha de hoy y
// el plazo configurado; una que se edita, con lo que tenga guardado.
function estadoInicial(documento, config) {
  const plazo = config?.plazoPorDefecto ?? PLAZO_POR_DEFECTO;
  const base = {
    tipo: TIPO_FACTURA,
    numero: "",
    fecha: hoyISO(),
    plazoDias: plazo,
    fechaVencimiento: sumarDias(hoyISO(), plazo),
    periodoContable: anioDe(hoyISO()),
    empresaId: "",
    clienteNombre: "",
    clienteNit: "",
    items: [itemVacio()],
    ivaPorcentaje: config?.ivaPorDefecto ?? IVA_POR_DEFECTO,
    retenciones: [],
    docAfectadoId: "",
    observaciones: "",
  };
  if (!documento) return base;
  return {
    ...base,
    ...documento,
    periodoContable: documento.periodoContable || anioDe(documento.fecha) || base.periodoContable,
    items: documento.items?.length ? documento.items.map((i) => ({ ...i })) : [itemVacio()],
    retenciones: (documento.retenciones || []).map((r) => ({ ...r })),
  };
}

const esNota = (tipo) => tipo === TIPO_NOTA_CREDITO || tipo === TIPO_NOTA_DEBITO;

export default function FacturaModal({ modo, documento, empresas, documentos, config, onCerrar, onGuardado }) {
  const [form, setForm] = React.useState(() => estadoInicial(documento, config));
  const [guardando, setGuardando] = React.useState(false);
  const [creandoCliente, setCreandoCliente] = React.useState(false);
  const [repetido, setRepetido] = React.useState(null);
  const [errores, setErrores] = React.useState({});

  const editar = (campo, valor) => {
    setForm((p) => ({ ...p, [campo]: valor }));
    setErrores((p) => (p[campo] ? { ...p, [campo]: null } : p));
  };

  // Cambiar la fecha o el plazo recalcula el vencimiento; escribirlo a mano lo
  // fija (hay clientes que negocian una fecha puntual). El periodo contable
  // sigue a la fecha solo mientras nadie lo haya movido a mano.
  const cambiarFecha = (fecha) => setForm((p) => ({
    ...p,
    fecha,
    fechaVencimiento: fecha ? sumarDias(fecha, p.plazoDias) : "",
    periodoContable: p.periodoContable === anioDe(p.fecha) ? anioDe(fecha) || p.periodoContable : p.periodoContable,
  }));

  const cambiarPlazo = (plazo) => setForm((p) => {
    const dias = Math.max(0, Math.trunc(aNumero(plazo)));
    return { ...p, plazoDias: dias, fechaVencimiento: p.fecha ? sumarDias(p.fecha, dias) : "" };
  });

  const retencionesDisponibles = (config?.retenciones?.length ? config.retenciones : RETENCIONES_POR_DEFECTO)
    .filter((r) => r.activa !== false);

  const liquidacion = React.useMemo(() => calcularDocumento(form), [form]);

  const opcionesEmpresa = React.useMemo(
    // `id` y no el nombre como llave: la base tiene clientes duplicados con
    // el mismo nombre (ver empresaIdentidad.js) y React los colapsaría.
    () => empresas.map((e) => ({ id: e.id, label: e.nombre, sublabel: e.nit || e.alias || "", empresa: e })),
    [empresas]
  );

  const empresaVinculada = React.useMemo(
    () => (form.empresaId ? empresas.find((e) => e.id === form.empresaId) : null),
    [empresas, form.empresaId]
  );

  // Clientes que se le parecen. No vinculan solos —"Andina S.A.S." y
  // "Andina Ltda." pueden ser empresas distintas— pero avisar antes de crear
  // un duplicado es la mitad del trabajo de esta pantalla.
  const parecidos = React.useMemo(() => {
    if (form.empresaId || !form.clienteNombre.trim()) return [];
    return buscarPosiblesDuplicados({ nombre: form.clienteNombre, nit: form.clienteNit }, empresas).slice(0, 3);
  }, [empresas, form.empresaId, form.clienteNombre, form.clienteNit]);

  const opcionesProducto = React.useMemo(() => {
    const usados = new Set();
    for (const d of documentos || []) for (const i of d.items || []) if (i.producto) usados.add(i.producto);
    return [...new Set([...PRODUCTOS_ACTIVOS, ...usados])].map((p) => ({ label: p }));
  }, [documentos]);

  // Facturas del mismo cliente a las que puede apuntar una nota.
  const facturasDelCliente = React.useMemo(() => {
    if (!esNota(form.tipo)) return [];
    return (documentos || []).filter(
      (d) => d.tipo === TIPO_FACTURA && !d.anulado && d.id !== form.id &&
        (form.empresaId ? d.empresaId === form.empresaId : d.clienteNombre === form.clienteNombre)
    );
  }, [documentos, form.tipo, form.empresaId, form.clienteNombre, form.id]);

  const elegirEmpresa = (op) => {
    const empresa = op?.empresa;
    if (!empresa) return;
    setForm((p) => ({ ...p, empresaId: empresa.id, clienteNombre: empresa.nombre, clienteNit: empresa.nit || "" }));
    setErrores((p) => ({ ...p, clienteNombre: null }));
  };

  // Si se escribió el nombre sin elegir de la lista, se intenta reconocer al
  // cliente con el mismo criterio que usa el resto de la app (NIT en dígitos,
  // nombre o alias). Sin esto la factura queda sin vincular y su cartera se
  // separa de la del mismo cliente.
  const escribirCliente = (nombre) => {
    setForm((p) => {
      const { empresa } = resolverEmpresa({ nombre, nit: p.clienteNit }, empresas);
      return empresa
        ? { ...p, clienteNombre: nombre, empresaId: empresa.id, clienteNit: p.clienteNit || empresa.nit || "" }
        : { ...p, clienteNombre: nombre, empresaId: "" };
    });
    setErrores((p) => ({ ...p, clienteNombre: null }));
  };

  const escribirNit = (nit) => {
    setForm((p) => {
      if (p.empresaId) return { ...p, clienteNit: nit };
      const { empresa } = resolverEmpresa({ nombre: p.clienteNombre, nit }, empresas);
      return empresa
        ? { ...p, clienteNit: nit, empresaId: empresa.id, clienteNombre: empresa.nombre }
        : { ...p, clienteNit: nit };
    });
  };

  const desvincular = () => setForm((p) => ({ ...p, empresaId: "" }));

  // Alta del cliente desde aquí: la alternativa era abandonar la factura a
  // medio llenar, irse a Empresas, crearlo y volver a empezar.
  const crearCliente = async () => {
    const nombre = form.clienteNombre.trim();
    if (!nombre) { setErrores((p) => ({ ...p, clienteNombre: "Escribe el nombre antes de crearlo." })); return; }
    setCreandoCliente(true);
    try {
      const { empresa, creada } = await resolverOCrearEmpresa({ nombre, nit: form.clienteNit }, { empresas });
      if (!empresa) { toast.error("No se pudo crear el cliente."); return; }
      setForm((p) => ({ ...p, empresaId: empresa.id, clienteNombre: empresa.nombre, clienteNit: empresa.nit || p.clienteNit }));
      toast.success(creada ? `Cliente "${empresa.nombre}" creado y vinculado.` : `Ya existía: vinculado a "${empresa.nombre}".`);
    } catch (e) {
      console.error("No se pudo crear el cliente", e);
      toast.error("No se pudo crear el cliente.");
    } finally {
      setCreandoCliente(false);
    }
  };

  const cambiarItem = (idx, campo, valor) => setForm((p) => ({
    ...p,
    items: p.items.map((it, i) => (i === idx ? { ...it, [campo]: valor } : it)),
  }));

  const agregarItem = () => setForm((p) => ({ ...p, items: [...p.items, itemVacio()] }));
  const quitarItem = (idx) => setForm((p) => ({
    ...p,
    items: p.items.length > 1 ? p.items.filter((_, i) => i !== idx) : p.items,
  }));

  const alternarRetencion = (ret) => setForm((p) => {
    const puesta = p.retenciones.find((r) => r.codigo === ret.codigo);
    if (puesta) return { ...p, retenciones: p.retenciones.filter((r) => r.codigo !== ret.codigo) };
    return { ...p, retenciones: [...p.retenciones, { ...ret, valor: 0 }] };
  });

  const cambiarValorRetencion = (codigo, valor) => setForm((p) => ({
    ...p,
    retenciones: p.retenciones.map((r) => (r.codigo === codigo ? { ...r, valor: aNumero(valor) } : r)),
  }));

  // El número repetido casi siempre es la misma factura digitada dos veces, así
  // que se avisa apenas se sale del campo — no al guardar, cuando ya se perdió
  // el tiempo de llenar todo lo demás.
  const revisarNumero = async () => {
    const numero = String(form.numero || "").trim();
    if (!numero) { setRepetido(null); return; }
    try {
      const otros = (await buscarPorNumero(numero, form.tipo)).filter((d) => d.id !== form.id);
      setRepetido(otros.length ? otros[0] : null);
    } catch (e) {
      console.error("No se pudo verificar el número", e);
    }
  };

  // Documento traído del Excel. Su valor unitario se dedujo dividiendo el
  // subtotal entre la cantidad, así que al recalcular el neto puede moverse
  // unos centavos. Mientras la diferencia sea ruido de redondeo se conserva el
  // neto declarado; si alguien cambió de verdad un concepto, manda el cálculo.
  const importado = Boolean(documento?.loteImportacion || documento?.origen === "migracion" || documento?.origen === "importacion");
  const netoDeclarado = aNumero(documento?.neto);
  const conservaNeto = importado && netoDeclarado > 0 && Math.abs(liquidacion.neto - netoDeclarado) < 1;

  const guardar = async (e) => {
    e.preventDefault();
    const fallos = {};
    if (!form.clienteNombre.trim()) fallos.clienteNombre = "Falta el cliente.";
    if (!form.fecha) fallos.fecha = "Falta la fecha.";
    if (!form.items.some((i) => subtotalItem(i) !== 0)) fallos.items = "Agrega al menos un concepto con valor.";
    setErrores(fallos);
    if (Object.keys(fallos).length) {
      toast.error(Object.values(fallos)[0]);
      return;
    }

    setGuardando(true);
    try {
      if (modo === "editar" && form.id) {
        await actualizarDocumento(form.id, form, { netoImportado: conservaNeto });
        toast.success("Documento actualizado.");
      } else {
        await crearDocumento(form);
        toast.success(form.tipo === TIPO_NOTA_CREDITO ? "Nota crédito registrada." : "Documento registrado.");
      }
      onGuardado();
    } catch (err) {
      console.error("No se pudo guardar el documento", err);
      toast.error("No se pudo guardar. Revisa la conexión.");
    } finally {
      setGuardando(false);
    }
  };

  const etiquetaTipo = TIPOS_DOCUMENTO.find((t) => t.valor === form.tipo)?.label || "Documento";

  return (
    <Modal
      onSubmit={guardar}
      onCerrar={onCerrar}
      titulo={modo === "editar" ? `Editar ${etiquetaTipo.toLowerCase()}` : "Nuevo documento"}
      subtitulo={
        modo === "editar"
          ? `${form.numero || "sin número"} · ${form.clienteNombre || "sin cliente"}`
          : "Factura de venta, nota crédito o nota débito"
      }
      insignia={
        <>
          {form.cotizacionNumero && <Badge tone="info">Cotización {form.cotizacionNumero}</Badge>}
          {importado && <Badge tone="neutral">Migrado del Excel</Badge>}
          {form.anulado && <Badge tone="danger">Anulado</Badge>}
        </>
      }
      pie={
        <>
          <div className="mr-auto text-sm text-gray-600 dark:text-gray-300">
            Neto a pagar <strong className="text-base text-gray-900 dark:text-white ml-1"><Money valor={liquidacion.neto} cero="" /></strong>
          </div>
          <Button variant="secondary" onClick={onCerrar}>Cancelar</Button>
          <Button type="submit" variant="primary" disabled={guardando}>
            {guardando ? "Guardando…" : modo === "editar" ? "Guardar cambios" : "Registrar documento"}
          </Button>
        </>
      }
    >
      <div className="grid gap-4">
        {/* ── Cliente ────────────────────────────────────────────────────── */}
        <Seccion
          titulo="Cliente"
          descripcion="Vincularlo a la base de empresas es lo que hace que su cartera se sume en un solo saldo."
        >
          <div className="grid gap-3">
            <div className="grid grid-cols-1 md:grid-cols-[2fr_1fr] gap-3">
              <Campo label="Nombre o NIT" requerido error={errores.clienteNombre}>
                <Combobox
                  value={form.clienteNombre}
                  onChange={escribirCliente}
                  onSelect={elegirEmpresa}
                  options={opcionesEmpresa}
                  placeholder="Escribe para buscar en la base de clientes…"
                  inputClassName={claseControl}
                />
              </Campo>
              <Campo label="NIT">
                <Input value={form.clienteNit} onChange={(e) => escribirNit(e.target.value)} placeholder="900.123.456-7" />
              </Campo>
            </div>

            {empresaVinculada ? (
              <div className="flex flex-wrap items-center gap-2 rounded-lg border border-emerald-300 dark:border-emerald-500/40 bg-emerald-50 dark:bg-emerald-900/20 px-3 py-2 text-xs">
                <Badge tone="success">Vinculado</Badge>
                <span className="text-emerald-900 dark:text-emerald-200 min-w-0 truncate">
                  <strong>{empresaVinculada.nombre}</strong>
                  {empresaVinculada.nit && <span className="opacity-70"> · {empresaVinculada.nit}</span>}
                  {empresaVinculada.alias && <span className="opacity-70"> · alias {empresaVinculada.alias}</span>}
                </span>
                <Button size="sm" variant="secondary" className="ml-auto" onClick={desvincular}>
                  Desvincular
                </Button>
              </div>
            ) : (
              <Aviso
                tono="aviso"
                titulo="Sin vincular"
                acciones={
                  <Button size="sm" variant="accent" onClick={crearCliente} disabled={creandoCliente || !form.clienteNombre.trim()}>
                    {creandoCliente ? "Creando…" : "Crear y vincular"}
                  </Button>
                }
              >
                {parecidos.length ? (
                  <>
                    Se parece a {parecidos.map((p) => p.empresa.nombre).join(", ")}. Si es alguno de esos,
                    elígelo en la lista de arriba en vez de crear un cliente nuevo.
                  </>
                ) : (
                  <>El saldo de este documento se contará aparte del resto de la cartera de este cliente.</>
                )}
              </Aviso>
            )}
          </div>
        </Seccion>

        {/* ── Documento ──────────────────────────────────────────────────── */}
        <Seccion titulo="Documento">
          <div className="grid gap-3">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
              <Campo label="Tipo">
                <Select value={form.tipo} onChange={(e) => editar("tipo", e.target.value)}>
                  {TIPOS_DOCUMENTO.map((t) => <option key={t.valor} value={t.valor}>{t.label}</option>)}
                </Select>
              </Campo>
              <Campo label="Número" hint="El de la resolución DIAN">
                <Input value={form.numero} onChange={(e) => editar("numero", e.target.value)} onBlur={revisarNumero} placeholder="J-1024" />
              </Campo>
              <Campo label="Fecha" requerido error={errores.fecha}>
                <Input type="date" value={form.fecha} onChange={(e) => cambiarFecha(e.target.value)} />
              </Campo>
              <Campo label="Plazo (días)">
                <InputNumero min={0} value={form.plazoDias} onChange={(e) => cambiarPlazo(e.target.value)} />
              </Campo>
              <Campo label="Vence" hint="Editable si se negoció otra fecha">
                <Input type="date" value={form.fechaVencimiento} onChange={(e) => editar("fechaVencimiento", e.target.value)} />
              </Campo>
              <Campo label="Año contable" hint="En qué año se reporta">
                <InputNumero
                  min={2000}
                  max={2100}
                  value={form.periodoContable}
                  onChange={(e) => editar("periodoContable", Math.trunc(aNumero(e.target.value)))}
                />
              </Campo>
            </div>

            {form.periodoContable !== anioDe(form.fecha) && Boolean(form.fecha) && (
              <Aviso tono="info">
                Fechado en {anioDe(form.fecha)} pero reportado en {form.periodoContable}: solo aparecerá
                al mirar el año {form.periodoContable}.
              </Aviso>
            )}

            {repetido && (
              <Aviso tono="aviso" titulo="Número repetido">
                Ya existe un documento con el número <strong>{repetido.numero}</strong> ({repetido.clienteNombre},
                {" "}{repetido.fecha}). Revisa que no lo estés digitando dos veces.
              </Aviso>
            )}

            {esNota(form.tipo) && (
              <Campo
                label={form.tipo === TIPO_NOTA_CREDITO ? "Factura que corrige" : "Factura que reajusta"}
                hint={
                  form.tipo === TIPO_NOTA_CREDITO
                    ? "Si se deja vacía, la nota resta del saldo general del cliente"
                    : "La nota débito cobra de más sobre una factura ya emitida"
                }
              >
                <Select value={form.docAfectadoId} onChange={(e) => editar("docAfectadoId", e.target.value)}>
                  <option value="">(ninguna en particular)</option>
                  {facturasDelCliente.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.numero || "(sin número)"} · {f.fecha} · {formatCOP(f.resumen?.neto ?? f.neto)}
                    </option>
                  ))}
                </Select>
              </Campo>
            )}
          </div>
        </Seccion>

        {/* ── Conceptos ──────────────────────────────────────────────────── */}
        <Seccion
          titulo="Conceptos"
          descripcion={`${form.items.length} línea${form.items.length === 1 ? "" : "s"} · subtotal ${formatCOP(liquidacion.subtotal)}`}
          acciones={<Button size="sm" variant="secondary" onClick={agregarItem}>+ Concepto</Button>}
        >
          <div className="grid gap-2">
            {/* Encabezado de columnas una sola vez, no repetido en cada fila. */}
            <div className="hidden md:grid grid-cols-[2fr_0.7fr_0.8fr_1.1fr_1.1fr_auto] gap-2 px-1 text-[10px] font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
              <span>Producto</span>
              <span className="text-right">Cantidad</span>
              <span>Unidad</span>
              <span className="text-right">Valor unitario</span>
              <span className="text-right">Subtotal</span>
              <span className="w-8" />
            </div>

            {form.items.map((item, idx) => (
              <div
                key={idx}
                className="grid grid-cols-2 md:grid-cols-[2fr_0.7fr_0.8fr_1.1fr_1.1fr_auto] gap-2 items-center rounded-lg bg-gray-50 dark:bg-gris-900/40 md:bg-transparent md:dark:bg-transparent p-2 md:p-0"
              >
                <Combobox
                  value={item.producto}
                  onChange={(v) => cambiarItem(idx, "producto", v)}
                  onSelect={(op) => cambiarItem(idx, "producto", op.label)}
                  options={opcionesProducto}
                  placeholder="Concepto"
                  className="col-span-2 md:col-span-1"
                  inputClassName={claseControl}
                />
                <InputNumero
                  step="0.01"
                  value={item.cantidad}
                  onChange={(e) => cambiarItem(idx, "cantidad", aNumero(e.target.value))}
                  aria-label={`Cantidad del concepto ${idx + 1}`}
                />
                <Select
                  value={item.unidad}
                  onChange={(e) => cambiarItem(idx, "unidad", e.target.value)}
                  aria-label={`Unidad del concepto ${idx + 1}`}
                >
                  {UNIDADES.map((u) => <option key={u.valor} value={u.valor}>{u.label}</option>)}
                </Select>
                <InputNumero
                  step="0.01"
                  value={item.valorUnitario}
                  onChange={(e) => cambiarItem(idx, "valorUnitario", aNumero(e.target.value))}
                  aria-label={`Valor unitario del concepto ${idx + 1}`}
                />
                <div className="h-9 px-3 flex items-center justify-end text-sm font-medium rounded-md bg-gray-100 dark:bg-gris-900 text-gray-800 dark:text-gray-100">
                  <Money valor={subtotalItem(item)} cero="0" />
                </div>
                <button
                  type="button"
                  onClick={() => quitarItem(idx)}
                  disabled={form.items.length === 1}
                  aria-label={`Quitar concepto ${idx + 1}`}
                  className="h-9 w-8 inline-flex items-center justify-center rounded-md text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-gray-400 focus:outline-none focus:ring-2 focus:ring-trafico/50"
                >
                  ✕
                </button>
              </div>
            ))}
            {errores.items && <div className="text-[11px] text-red-600 dark:text-red-400">{errores.items}</div>}
          </div>
        </Seccion>

        {/* ── Impuestos y total ──────────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Seccion titulo="Retenciones que aplica el cliente" descripcion="Se restan del neto a pagar">
            <div className="grid gap-2">
              <Campo label="IVA (%)" className="max-w-[8rem] mb-1">
                <InputNumero
                  min={0}
                  step="0.01"
                  value={form.ivaPorcentaje}
                  onChange={(e) => editar("ivaPorcentaje", aNumero(e.target.value))}
                />
              </Campo>
              {retencionesDisponibles.map((ret) => {
                const puesta = form.retenciones.find((r) => r.codigo === ret.codigo);
                const calculada = liquidacion.retenciones.find((r) => r.codigo === ret.codigo);
                return (
                  <div
                    key={ret.codigo}
                    className={`flex items-center gap-2 rounded-lg px-2 py-1.5 transition-colors ${puesta ? "bg-gray-100 dark:bg-gris-900/60" : ""}`}
                  >
                    <Casilla checked={Boolean(puesta)} onChange={() => alternarRetencion(ret)} className="flex-1 min-w-0">
                      <span className="truncate">{ret.nombre}</span>
                      <span className="text-[11px] text-gray-500 dark:text-gray-400 ml-1">
                        {ret.base === "manual" ? "(valor digitado)" : `(${ret.porcentaje} % sobre ${ret.base === "iva" ? "el IVA" : "el subtotal"})`}
                      </span>
                    </Casilla>
                    {puesta && ret.base === "manual" ? (
                      // El ancho va en el contenedor: la w-full del control
                      // gana a una w-32 en la misma especificidad.
                      <div className="w-32 shrink-0">
                        <InputNumero
                          step="0.01"
                          value={puesta.valor || 0}
                          onChange={(e) => cambiarValorRetencion(ret.codigo, e.target.value)}
                          aria-label={`Valor de ${ret.nombre}`}
                        />
                      </div>
                    ) : (
                      <span className="w-32 text-right text-xs tabular-nums text-gray-600 dark:text-gray-300">
                        {puesta ? formatCOP(calculada?.valor || 0) : "—"}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </Seccion>

          <Seccion titulo="Liquidación">
            <div className="grid gap-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-300">Subtotal</span>
                <Money valor={liquidacion.subtotal} cero="0" />
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-300">IVA ({liquidacion.ivaPorcentaje} %)</span>
                <Money valor={liquidacion.iva} cero="0" />
              </div>
              <div className="flex justify-between text-red-600 dark:text-red-400">
                <span>Retenciones</span>
                <span className="tabular-nums">− {formatCOP(liquidacion.totalRetenciones)}</span>
              </div>
              <div className="flex justify-between items-baseline border-t border-gray-200 dark:border-gris-700 pt-2.5 mt-1">
                <span className="font-semibold">Neto a pagar</span>
                <span className="text-lg font-bold tabular-nums text-gray-900 dark:text-white">
                  {formatCOP(liquidacion.neto)}
                </span>
              </div>

              {form.tipo === TIPO_NOTA_CREDITO && (
                <Aviso tono="info" className="mt-1">
                  Al ser nota crédito, este valor <strong>resta</strong> de la cartera del cliente.
                </Aviso>
              )}
              {form.tipo === TIPO_NOTA_DEBITO && (
                <Aviso tono="info" className="mt-1">
                  La nota débito <strong>suma</strong> a la cartera igual que una factura, y admite abonos.
                </Aviso>
              )}
              {conservaNeto && (
                <Aviso tono="aviso" className="mt-1">
                  Se conservará el neto declarado en el Excel ({formatCOP(netoDeclarado)}). Si cambias un
                  concepto, pasará a mandar el cálculo.
                </Aviso>
              )}
            </div>
          </Seccion>
        </div>

        <Campo label="Observaciones">
          <Input
            value={form.observaciones}
            onChange={(e) => editar("observaciones", e.target.value)}
            placeholder="Orden de compra, remisión, acuerdo de pago…"
          />
        </Campo>
      </div>
    </Modal>
  );
}
