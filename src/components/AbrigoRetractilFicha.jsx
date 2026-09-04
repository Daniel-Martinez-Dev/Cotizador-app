import React from "react";
import toast from "react-hot-toast";
import { FaEdit, FaTrash, FaTimes } from "react-icons/fa";
import { calcularAbrigoRetractil } from "../modules/produccion/abrigo-retractil/calcular.js";
import {
  crearFichaAbrigoRetractil,
  actualizarFichaAbrigoRetractil,
} from "../utils/firebaseAbrigoRetractil";
import { fmtMm, fmtM2, fmtDec, fmtN } from "../utils/fichaFormat";
import EstadoControl from "./fichas/EstadoControl";
import { useQuote } from "../context/QuoteContext";
import { codigoFicha as codigoDeFicha } from "../utils/codigoFicha";
import IdentificacionFicha from "./fichas/IdentificacionFicha";
import ClienteSelector from "./fichas/ClienteSelector";
import { clienteDeFicha } from "../utils/clienteVinculo";
import { camposCotizacionFicha, cotizacionDeFicha } from "../utils/documentoVinculo";
import { conPrefillOrden } from "./fichas/prefillOrden";
import { valorNumerico, conDefectosNumericos } from "../utils/campoNumero";

// ─── Utilidades ───────────────────────────────────────────────────────────────

const hoy = () => new Date().toISOString().slice(0, 10);

const inputCls = "mt-1 w-full px-3 py-2 rounded border border-gray-300 dark:border-gris-600 bg-white dark:bg-gris-700 text-sm";
const labelCls = "text-xs text-gray-600 dark:text-gray-300";
const sectionTitleCls = "text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2";

const INITIAL_FORM = {
  codigoFicha:       "", // solo lectura: lo asigna el sistema al guardar
  numeroOrdenCompra: "",
  // Detalle libre para distinguir esta ficha de otra igual del mismo
  // pedido: "Zona 3", "Muelle 7". Opcional, ver fichas/IdentificacionFicha.
  nombreFicha:       "",
  cliente:           "",
  // Vínculo con la base de clientes del cotizador (empresas/{id}).
  // Ver utils/clienteVinculo.js.
  clienteId:         null,
  clienteNit:        "",
  clienteCiudad:     "",
  clienteAlias:      "",
  usarAlias:         false,
  // Cotización de la que salió el pedido. Opcional y solo de la oficina:
  // planta no ve cotizaciones. Ver utils/documentoVinculo.js.
  cotizacionId:      null,
  cotizacionNumero:  "",
  cantidad:          1,
  fechaOrden:        hoy(),
  fechaEntrega:      "",
  auxiliarEncargado: "TODOS",
  ancho:             "",
  alto:              "",
  travesanos:        910,
  color:             "NEGRO",
  acabado:           "PINTADO",
  llevaBanda:        true,
};

// Lo que vale un campo numérico que se dejó en blanco. El formulario admite ""
// para que se pueda borrar y reescribir sin pelear con un 0 (ver
// utils/campoNumero.js); el cálculo y lo que se guarda usan estos defectos, que
// además son los que se ven de placeholder.
const DEFECTOS_NUM = {
  cantidad:   1,
  travesanos: 910,
};

const conDefectos = (form) => conDefectosNumericos(form, DEFECTOS_NUM);

// ─── Componente principal ─────────────────────────────────────────────────────

export default function AbrigoRetractilFicha({ encargo, onEncargoAtendido, onGuardada }) {
  const { confirm } = useQuote();
  const [form, setForm]             = React.useState(INITIAL_FORM);
  const [loading, setLoading]       = React.useState(false);
  const [saving, setSaving]         = React.useState(false);
  const [search, setSearch]         = React.useState("");
  const [editingId, setEditingId]   = React.useState(null);
  const formRef = React.useRef(null);

  // ── Cálculo reactivo ─────────────────────────────────────────────────────

  const calculo = React.useMemo(
    () => calcularAbrigoRetractil(conDefectos(form)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [form.ancho, form.alto, form.travesanos, form.cantidad, form.llevaBanda, form.fechaOrden]
  );

  // Sincroniza fechaEntrega calculada cuando cambian ancho/alto/cantidad/fechaOrden
  // pero solo si el usuario no la ha editado manualmente
  const [fechaManual, setFechaManual] = React.useState(false);
  React.useEffect(() => {
    if (!fechaManual && calculo?.fechaEntrega) {
      setForm((p) => ({ ...p, fechaEntrega: calculo.fechaEntrega }));
    }
  }, [calculo?.fechaEntrega, fechaManual]);

  // ── Listado: resumen por estado + filtros ────────────────────────────────

  // ── Firebase ─────────────────────────────────────────────────────────────

  // ── Handlers ─────────────────────────────────────────────────────────────

  const set    = (field) => (e) => setForm((p) => ({ ...p, [field]: e.target.value }));

  // El selector devuelve nombre + id + NIT + ciudad juntos: la ficha no puede
  // quedar con el id de un cliente y el nombre de otro.
  const setCliente = (datos) => setForm((p) => ({ ...p, ...datos }));
  // El selector devuelve id + número juntos, o los dos vacíos al desvincular.
  const setCotizacion = (datos) => setForm((p) => ({ ...p, ...datos }));
  const setNum = (field) => (e) => setForm((p) => ({ ...p, [field]: valorNumerico(e.target.value) }));
  const setBool = (field) => (e) => setForm((p) => ({ ...p, [field]: e.target.value === "true" }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.ancho || !form.alto)
      return toast.error("Ancho y alto son requeridos");
    if (Number(form.ancho) <= 0 || Number(form.alto) <= 0)
      return toast.error("Las medidas deben ser mayores a 0");
    if (!calculo)
      return toast.error("Revisa las medidas (el descuento de travesaño es mayor al alto)");

    setSaving(true);
    try {
      // El vínculo con la cotización va normalizado también al editar: el
      // formulario lo manda dentro de este objeto y de aquí sale a Firestore.
      const datos = {
        ...conDefectos(form),
        ...camposCotizacionFicha(form),
        ancho: Number(form.ancho),
        alto: Number(form.alto),
      };
      if (editingId) {
        await actualizarFichaAbrigoRetractil(editingId, {
          ...datos,
          medidas:               calculo.medidas,
          materiaPrimaPorAbrigo: calculo.materiaPrimaPorAbrigo,
          materiaPrimaTotal:     calculo.materiaPrimaTotal,
          alistamiento:          calculo.alistamiento,
          despacho:              calculo.despacho,
        });
        toast.success("Ficha actualizada");
        setEditingId(null);
      } else {
        await crearFichaAbrigoRetractil(datos, calculo);
        toast.success("Ficha guardada");
      }
      setForm(INITIAL_FORM);
      onGuardada?.();
      setFechaManual(false);
    } catch (err) {
      console.error(err);
      toast.error(editingId ? "Error actualizando ficha" : "Error guardando ficha");
    } finally {
      setSaving(false);
    }
  };

  const handleEditar = (f) => {
    setForm({
      codigoFicha:       codigoDeFicha(f, "abrigoretractil"),
      numeroOrdenCompra: f.numeroOrdenCompra || "",
      nombreFicha:       f.nombreFicha || "",
      ...clienteDeFicha(f),
      ...cotizacionDeFicha(f),
      cantidad:          f.cantidad ?? DEFECTOS_NUM.cantidad,
      fechaOrden:        f.fechaOrden || hoy(),
      fechaEntrega:      f.fechaEntrega || "",
      auxiliarEncargado: f.auxiliarEncargado || "TODOS",
      ancho:             f.ancho ?? "",
      alto:              f.alto ?? "",
      travesanos:        f.travesanos ?? DEFECTOS_NUM.travesanos,
      color:             f.color || "NEGRO",
      acabado:           f.acabado || "PINTADO",
      llevaBanda:        f.llevaBanda !== false,
    });
    setFechaManual(true);
    setEditingId(f.id);
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  // Formulario en blanco. `prefill` llega cuando la ficha se crea desde un
  // pedido ya existente: hereda la orden de compra, el cliente y las fechas
  // para que caiga sola dentro del mismo grupo (ver prefillOrden.js).
  const nuevaFicha = (prefill) => {
    setEditingId(null);
    setForm(conPrefillOrden(INITIAL_FORM, prefill));
    // La entrega heredada del pedido manda sobre la que calcula la carga de
    // planta: el resto del pedido ya salió con esa fecha.
    setFechaManual(Boolean(prefill?.fechaEntrega));
  };

  const cancelarEdicion = () => nuevaFicha();

  // Órdenes es la lista de producción; desde allí se pide crear o editar una
  // ficha de este producto y ProduccionPage cambia de pestaña dejando el
  // encargo aquí. Se atiende una sola vez y se avisa para no repetirlo.
  React.useEffect(() => {
    if (!encargo) return;
    if (encargo.accion === "editar" && encargo.ficha) handleEditar(encargo.ficha);
    else nuevaFicha(encargo.prefill);
    onEncargoAtendido?.();
    // Lo que dispara esto es el encargo; handleEditar y nuevaFicha se
    // rehacen en cada render y meterlos aquí lo dispararía en bucle.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [encargo]);

  const med = calculo?.medidas;
  const mp  = calculo?.materiaPrimaPorAbrigo;
  const mpt = calculo?.materiaPrimaTotal;
  const ali = calculo?.alistamiento;
  const des = calculo?.despacho;
  const cant = Number(form.cantidad) || 1;

  return (
    <div className="space-y-5">

      {/* ── Fila superior: formulario + vista previa ── */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">

        {/* FORMULARIO */}
        <section ref={formRef} className="bg-white dark:bg-gris-800 border border-gray-200 dark:border-gris-700 rounded-lg p-4">
          <div className="font-medium text-sm mb-4">{editingId ? "Editar ficha — Abrigo Retráctil" : "Nueva ficha — Abrigo Retráctil"}</div>
          <form onSubmit={handleSubmit} className="space-y-4">

            {/* Identificación */}
            <IdentificacionFicha
              codigo={form.codigoFicha}
              ordenCompra={form.numeroOrdenCompra}
              onOrdenCompraChange={set("numeroOrdenCompra")}
              nombre={form.nombreFicha}
              onNombreChange={set("nombreFicha")}
              inputCls={inputCls}
              labelCls={labelCls}
              cotizacion={form}
              onCotizacionChange={setCotizacion}
            />
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Cantidad</label>
                <input type="number" min={1} step={1} value={form.cantidad}
                  onChange={setNum("cantidad")} placeholder={String(DEFECTOS_NUM.cantidad)}
                  className={inputCls} />
              </div>
              <div className="col-span-2">
                <ClienteSelector
                  value={form}
                  onChange={setCliente}
                  inputCls={inputCls}
                  labelCls={labelCls}
                />
              </div>
              <div>
                <label className={labelCls}>Fecha orden</label>
                <input type="date" value={form.fechaOrden}
                  onChange={(e) => { set("fechaOrden")(e); setFechaManual(false); }}
                  className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Fecha entrega</label>
                <input type="date" value={form.fechaEntrega}
                  onChange={(e) => { set("fechaEntrega")(e); setFechaManual(true); }}
                  className={inputCls} />
              </div>
              <div className="col-span-2">
                <label className={labelCls}>Auxiliar encargado</label>
                <input value={form.auxiliarEncargado} onChange={set("auxiliarEncargado")}
                  className={inputCls} placeholder="TODOS" />
              </div>
            </div>

            {/* Medidas del abrigo */}
            <div className="border-t border-gray-200 dark:border-gris-700 pt-4">
              <div className={sectionTitleCls}>Medidas del abrigo (mm)</div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className={labelCls}>Ancho total</label>
                  <input type="number" min={1} value={form.ancho}
                    onChange={set("ancho")}
                    className={`${inputCls} font-mono`} placeholder="ej: 3500" />
                </div>
                <div>
                  <label className={labelCls}>Alto</label>
                  <input type="number" min={1} value={form.alto}
                    onChange={set("alto")}
                    className={`${inputCls} font-mono`} placeholder="ej: 3600" />
                </div>
                <div>
                  <label className={labelCls}>Travesaños (mm)</label>
                  <input type="number" min={1} value={form.travesanos}
                    onChange={setNum("travesanos")} placeholder={String(DEFECTOS_NUM.travesanos)}
                    className={`${inputCls} font-mono`} />
                </div>
              </div>
            </div>

            {/* Opciones */}
            <div className="border-t border-gray-200 dark:border-gris-700 pt-4">
              <div className={sectionTitleCls}>Opciones</div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Color</label>
                  <input value={form.color} onChange={set("color")}
                    className={inputCls}
                    disabled={form.acabado === "GALVANIZADO"}
                    placeholder="NEGRO" />
                </div>
                <div>
                  <label className={labelCls}>Acabado</label>
                  <select value={form.acabado} onChange={set("acabado")} className={inputCls}>
                    <option value="PINTADO">PINTADO</option>
                    <option value="GALVANIZADO">GALVANIZADO</option>
                  </select>
                </div>
                <div className="col-span-2">
                  <label className={labelCls}>Banda PVC</label>
                  <select value={String(form.llevaBanda)} onChange={setBool("llevaBanda")} className={inputCls}>
                    <option value="true">SÍ — lleva banda PVC</option>
                    <option value="false">NO — sin banda PVC</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-1">
              {editingId && (
                <button type="button" onClick={cancelarEdicion}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded bg-gray-100 hover:bg-gray-200 dark:bg-gris-700 dark:hover:bg-gris-600 border border-gray-300 dark:border-gris-600 text-sm font-medium transition-colors">
                  <FaTimes className="text-xs" /> Cancelar edición
                </button>
              )}
              <button type="submit" disabled={saving || !calculo}
                className="px-5 py-2 rounded bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white text-sm font-medium transition-colors">
                {saving ? "Guardando…" : editingId ? "Guardar cambios" : "Guardar ficha"}
              </button>
            </div>
          </form>
        </section>

        {/* VISTA PREVIA */}
        <section className="bg-white dark:bg-gris-800 border border-gray-200 dark:border-gris-700 rounded-lg p-4 overflow-auto max-h-[700px]">
          <div className="font-medium text-sm mb-4">Vista previa</div>

          {!calculo ? (
            <div className="flex items-center justify-center h-48 text-sm text-gray-400 dark:text-gray-500">
              Ingresa ancho y alto para ver los cálculos
            </div>
          ) : (
            <div className="space-y-4 text-sm">

              {/* Medidas */}
              <div>
                <div className={sectionTitleCls}>Medidas estructurales (mm)</div>
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-gris-700 text-gray-500">
                      <th className="text-left py-1.5">Componente</th>
                      <th className="text-right py-1.5">Largo</th>
                      <th className="text-right py-1.5">Ancho</th>
                      <th className="text-right py-1.5">Cant.</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      ["Ancho luz (vano libre)", fmtMm(med.anchoLuz),       "—",                   "1"],
                      ["Lona perimetral",     fmtMm(med.loneaPerimetro),    "700",                 "1"],
                      ["Banda PVC lateral",   fmtMm(med.bandaLateralLargo), fmtMm(med.bandaLateralAncho), "2"],
                      ["Banda PVC superior",  fmtMm(med.bandaSuperiorLargo),fmtMm(med.bandaSuperiorAncho),"1"],
                      ["Largueros",           fmtMm(med.largueroLargo),     "—",                   fmtN(med.largueroCantidad)],
                      ["Travesaños",          fmtMm(med.travesanoLargo),    "—",                   fmtN(med.travesanoCantidad)],
                      ["Casitas",             fmtMm(med.casitasLargo),      "—",                   fmtN(med.casitasCantidad)],
                      ["Mangueras (rollos)",  "6000",                       "—",                   fmtN(med.manguerasCantidad)],
                    ].map(([name, l, a, c]) => (
                      <tr key={name} className="border-b border-gray-100 dark:border-gris-700/50">
                        <td className="py-1.5 font-medium">{name}</td>
                        <td className="text-right py-1.5 font-mono">{l}</td>
                        <td className="text-right py-1.5 font-mono">{a}</td>
                        <td className="text-right py-1.5 font-mono">{c}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Materia prima */}
              <div>
                <div className={sectionTitleCls}>Consumo de materia prima</div>
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-gris-700 text-gray-500">
                      <th className="text-left py-1.5">Insumo</th>
                      <th className="text-right py-1.5">Und</th>
                      <th className="text-right py-1.5">C/U</th>
                      {cant > 1 && <th className="text-right py-1.5">×{cant}</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { label: "Lona perimetral",     unit: "m²",  cu: fmtM2(mp.lonaPerimetral_m2),   tot: fmtM2(mpt.lonaPerimetral_m2) },
                      ...(form.llevaBanda ? [{ label: "Banda PVC", unit: "m²", cu: fmtM2(mp.bandaPVC_m2), tot: fmtM2(mpt.bandaPVC_m2) }] : []),
                      { label: "Tubería marco 2×1",   unit: "und", cu: fmtN(mp.tuberiaMarco_und),       tot: fmtN(mpt.tuberiaMarco_und) },
                      { label: "Tubería travesaños",  unit: "m",   cu: fmtDec(mp.tuberiaTravesanos_m),  tot: fmtDec(mpt.tuberiaTravesanos_m) },
                      { label: "Mangueras",           unit: "und", cu: fmtN(mp.mangueras_und),           tot: fmtN(mpt.mangueras_und) },
                      { label: "U doble 5×5",         unit: "und", cu: fmtN(mp.uDoble5x5_und),           tot: fmtN(mpt.uDoble5x5_und) },
                      { label: "Refuerzos platina",   unit: "und", cu: fmtN(mp.refuerzosPlatina_und),    tot: fmtN(mpt.refuerzosPlatina_und) },
                      { label: "Tubos ½\"",           unit: "und", cu: fmtN(mp.tubosMedia_und),           tot: fmtN(mpt.tubosMedia_und) },
                      { label: "Tuercas y arandelas", unit: "und", cu: fmtDec(mp.tuercasArandelas_und,1), tot: fmtN(mpt.tuercasArandelas_und) },
                    ].map(({ label, unit, cu, tot }) => (
                      <tr key={label} className="border-b border-gray-100 dark:border-gris-700/50">
                        <td className="py-1.5 font-medium">{label}</td>
                        <td className="text-right py-1.5 text-gray-500">{unit}</td>
                        <td className="text-right py-1.5 font-mono">{cu}</td>
                        {cant > 1 && <td className="text-right py-1.5 font-mono text-blue-600 dark:text-blue-400">{tot}</td>}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Alistamiento */}
              <div>
                <div className={sectionTitleCls}>Material a alistar</div>
                <table className="w-full text-xs">
                  <tbody>
                    {[
                      [`Mangueras largo=${fmtMm(ali.manguerasDimAncho)} mm`, `×${ali.manguerasCantAncho} und`],
                      [`Mangueras largo=${fmtMm(ali.manguerasDimAlto)} mm`,  `×${ali.manguerasCantAlto} und`],
                      ["Tornillos 3/8×2½\"",              `×${ali.tornillos38x25} und`],
                      ["Tornillos autorroscantes No10×¾", `×${ali.tornillosAutorroscantes} und`],
                    ].map(([label, val]) => (
                      <tr key={label} className="border-b border-gray-100 dark:border-gris-700/50">
                        <td className="py-1.5 font-medium">{label}</td>
                        <td className="text-right py-1.5 font-mono">{val}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Despacho - resumen */}
              <div>
                <div className={sectionTitleCls}>Control de despacho</div>
                <div className="flex items-center justify-between bg-blue-50 dark:bg-blue-900/20 rounded px-3 py-2">
                  <span className="text-xs font-medium">Peso total pedido</span>
                  <span className="font-mono font-bold text-blue-700 dark:text-blue-300">
                    {fmtDec(des.pesoTotalKg, 1)} kg
                  </span>
                </div>
              </div>

            </div>
          )}
        </section>
      </div>

    </div>
  );
}

// ─── Detalle expandido inline ─────────────────────────────────────────────────
export function FichaDetalleAbrigoRetractil({ ficha: f, numero, onCambiarEstado, onAgregarNota, onEditarEntrega, onEditarFirma, onVerFicha, onEditar, onEliminar }) {
  const med  = f.medidas               || {};
  const mp   = f.materiaPrimaPorAbrigo || {};
  const mpt  = f.materiaPrimaTotal     || {};
  const des  = f.despacho              || {};
  const cant = Number(f.cantidad)      || 1;

  const tarjetas = [
    { label: "Lona perimetral",   val: `${fmtMm(med.loneaPerimetro)} × 700`,                          color: "#1a3f8f" },
    { label: "Banda lateral ×2",  val: `${fmtMm(med.bandaLateralAncho)} × ${fmtMm(med.bandaLateralLargo)}`,  color: "#0891b2" },
    { label: "Banda superior ×1", val: `${fmtMm(med.bandaSuperiorAncho)} × ${fmtMm(med.bandaSuperiorLargo)}`, color: "#0d9488" },
    { label: `Largueros ×${fmtN(med.largueroCantidad)}`,  val: `${fmtMm(med.largueroLargo)} mm`,       color: "#be123c" },
    { label: `Travesaños ×${fmtN(med.travesanoCantidad)}`, val: `${fmtMm(med.travesanoLargo)} mm`,     color: "#7c3aed" },
    { label: `Casitas ×${fmtN(med.casitasCantidad)}`,      val: `${fmtMm(med.casitasLargo)} mm`,       color: "#d97706" },
    { label: "Mangueras",         val: `${fmtN(med.manguerasCantidad)} rollos 6000 mm`,                color: "#059669" },
  ];

  return (
    <div className="bg-gray-50 dark:bg-gris-700/60 rounded-xl p-4 space-y-4 text-xs border border-gray-200 dark:border-gris-600">
      <div className="flex items-center justify-between">
        <div>
          <span className="font-semibold text-sm text-gray-800 dark:text-gray-100">
            {f.cliente || "Sin cliente"}
          </span>
          <span className="ml-2 text-gray-400 font-mono">
            {f.ancho}×{f.alto} mm · ×{f.cantidad} und · travesaños {f.travesanos} mm
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={onVerFicha}
            className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium">
            Ver ficha
          </button>
          <button onClick={onEditar}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 dark:bg-gris-700 dark:hover:bg-gris-600 border border-gray-300 dark:border-gris-600 text-xs font-medium">
            <FaEdit className="text-[11px]" /> Editar
          </button>
          <button onClick={onEliminar}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-50 hover:bg-red-100 dark:bg-red-900/30 dark:hover:bg-red-900/50 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800 text-xs font-medium">
            <FaTrash className="text-[11px]" /> Eliminar
          </button>
        </div>
      </div>

      {/* Tarjetas de medidas */}
      <div>
        <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
          Medidas de corte
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
          {tarjetas.map(({ label, val, color }) => (
            <div key={label} style={{ border: `2px solid ${color}` }} className="rounded-lg overflow-hidden bg-white dark:bg-gris-800">
              <div style={{ background: color, color: "white" }} className="text-center text-[10px] font-bold uppercase py-1 px-1 leading-tight">
                {label}
              </div>
              <div className="p-2 text-center">
                <div style={{ color }} className="font-mono font-bold text-xs leading-snug">{val}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Materia prima compacta */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
        {[
          { label: "Lona",          val: fmtM2(mp.lonaPerimetral_m2), unit: "m²",  tot: fmtM2(mpt.lonaPerimetral_m2) },
          { label: "Banda PVC",     val: fmtM2(mp.bandaPVC_m2),       unit: "m²",  tot: fmtM2(mpt.bandaPVC_m2) },
          { label: "Tuercas",       val: fmtN(mp.tuercasArandelas_und),unit: "und", tot: fmtN(mpt.tuercasArandelas_und) },
          { label: "Peso total",    val: `${fmtDec(des.pesoTotalKg, 1)} kg`, unit: "", tot: "" },
        ].map(({ label, val, unit, tot }) => (
          <div key={label} className="bg-white dark:bg-gris-800 border border-gray-100 dark:border-gris-700 rounded-lg p-2">
            <div className="text-[9px] text-gray-400 leading-tight mb-1">{label}</div>
            <div className="font-mono font-bold text-gray-700 dark:text-gray-200 text-sm">{val}</div>
            {unit && <div className="text-[9px] text-gray-400">{unit} c/u</div>}
            {cant > 1 && tot && <div className="text-[9px] text-blue-500 font-mono mt-0.5">{tot} total</div>}
          </div>
        ))}
      </div>

      <EstadoControl
        ficha={f}
        onCambiarEstado={(estado, nota) => onCambiarEstado(f.id, estado, nota)}
        onAgregarNota={(texto) => onAgregarNota(f.id, texto)}
        onEditarEntrega={() => onEditarEntrega(f.id)}
        onEditarFirma={(etapa) => onEditarFirma(f.id, etapa)}
      />
    </div>
  );
}
