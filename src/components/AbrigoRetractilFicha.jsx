import React from "react";
import toast from "react-hot-toast";
import {
  FaEdit, FaTrash, FaTimes, FaSearch, FaSyncAlt, FaEye, FaChevronRight,
  FaInbox
} from "react-icons/fa";
import { calcularAbrigoRetractil } from "../modules/produccion/abrigo-retractil/calcular.js";
import {
  crearFichaAbrigoRetractil,
  listarFichasAbrigoRetractil,
  actualizarFichaAbrigoRetractil,
  eliminarFichaAbrigoRetractil,
} from "../utils/firebaseAbrigoRetractil";
import FichaImpresionAbrigoRetractil from "./FichaImpresionAbrigoRetractil";
import { fmtMm, fmtM2, fmtDec, fmtN } from "../utils/fichaFormat";
import EstadoBadge from "./fichas/EstadoBadge";
import EstadoControl from "./fichas/EstadoControl";
import useEstadoFicha from "./fichas/useEstadoFicha";
import EstadoResumen from "./fichas/EstadoResumen";
import { useQuote } from "../context/QuoteContext";
import { codigoFicha as codigoDeFicha } from "../utils/codigoFicha";
import IdentificacionFicha from "./fichas/IdentificacionFicha";
import ClienteSelector from "./fichas/ClienteSelector";
import { clienteDeFicha } from "../utils/clienteVinculo";

// ─── Utilidades ───────────────────────────────────────────────────────────────

const hoy = () => new Date().toISOString().slice(0, 10);

const inputCls = "mt-1 w-full px-3 py-2 rounded border border-gray-300 dark:border-gris-600 bg-white dark:bg-gris-700 text-sm";
const labelCls = "text-xs text-gray-600 dark:text-gray-300";
const sectionTitleCls = "text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2";

const INITIAL_FORM = {
  codigoFicha:       "", // solo lectura: lo asigna el sistema al guardar
  numeroOrdenCompra: "",
  cliente:           "",
  // Vínculo con la base de clientes del cotizador (empresas/{id}).
  // Ver utils/clienteVinculo.js.
  clienteId:         null,
  clienteNit:        "",
  clienteCiudad:     "",
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

// ─── Componente principal ─────────────────────────────────────────────────────

export default function AbrigoRetractilFicha() {
  const { confirm } = useQuote();
  const [form, setForm]             = React.useState(INITIAL_FORM);
  const [fichas, setFichas]         = React.useState([]);
  const [loading, setLoading]       = React.useState(false);
  const [saving, setSaving]         = React.useState(false);
  const [selectedId, setSelectedId] = React.useState(null);
  const [printFicha, setPrintFicha] = React.useState(null);
  const [search, setSearch]         = React.useState("");
  const [estadoFiltro, setEstadoFiltro] = React.useState("todos");
  const [editingId, setEditingId]   = React.useState(null);
  const formRef = React.useRef(null);

  const { cambiarEstado, agregarNota, editarEntrega, editarFirma, modales } = useEstadoFicha("abrigoretractil", fichas, setFichas);

  // ── Cálculo reactivo ─────────────────────────────────────────────────────

  const calculo = React.useMemo(
    () => calcularAbrigoRetractil(form),
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

  const fichasFiltradas = React.useMemo(() => {
    const term = search.trim().toLowerCase();
    return fichas
      .map((f, idx) => ({ f, numero: f.ordenProduccion ?? (fichas.length - idx), codigo: codigoDeFicha(f, "abrigoretractil") }))
      .filter(({ f }) => estadoFiltro === "todos" || (f.estado || "borrador") === estadoFiltro)
      .filter(({ f }) => !term || (f.cliente || "").toLowerCase().includes(term));
  }, [fichas, search, estadoFiltro]);

  // ── Firebase ─────────────────────────────────────────────────────────────

  const loadFichas = React.useCallback(async () => {
    setLoading(true);
    try {
      setFichas(await listarFichasAbrigoRetractil());
    } catch (e) {
      console.error(e);
      toast.error("Error cargando fichas");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => { loadFichas(); }, [loadFichas]);

  // ── Handlers ─────────────────────────────────────────────────────────────

  const set    = (field) => (e) => setForm((p) => ({ ...p, [field]: e.target.value }));

  // El selector devuelve nombre + id + NIT + ciudad juntos: la ficha no puede
  // quedar con el id de un cliente y el nombre de otro.
  const setCliente = (datos) => setForm((p) => ({ ...p, ...datos }));
  const setNum = (field) => (e) => setForm((p) => ({ ...p, [field]: Number(e.target.value) }));
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
      const datos = { ...form, ancho: Number(form.ancho), alto: Number(form.alto) };
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
      setFechaManual(false);
      await loadFichas();
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
      ...clienteDeFicha(f),
      cantidad:          f.cantidad ?? 1,
      fechaOrden:        f.fechaOrden || hoy(),
      fechaEntrega:      f.fechaEntrega || "",
      auxiliarEncargado: f.auxiliarEncargado || "TODOS",
      ancho:             f.ancho ?? "",
      alto:              f.alto ?? "",
      travesanos:        f.travesanos ?? 910,
      color:             f.color || "NEGRO",
      acabado:           f.acabado || "PINTADO",
      llevaBanda:        f.llevaBanda !== false,
    });
    setFechaManual(true);
    setEditingId(f.id);
    setSelectedId(null);
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const cancelarEdicion = () => {
    setEditingId(null);
    setForm(INITIAL_FORM);
    setFechaManual(false);
  };

  const handleEliminar = async (f) => {
    const ok = await confirm(`¿Eliminar la ficha de ${f.cliente || "este cliente"}? Esta acción no se puede deshacer.`);
    if (!ok) return;
    try {
      await eliminarFichaAbrigoRetractil(f.id);
      setFichas((prev) => prev.filter((x) => x.id !== f.id));
      if (selectedId === f.id) setSelectedId(null);
      if (editingId === f.id) cancelarEdicion();
      toast.success("Ficha eliminada");
    } catch (err) {
      console.error(err);
      toast.error("Error eliminando ficha");
    }
  };

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
              inputCls={inputCls}
              labelCls={labelCls}
            />
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Cantidad</label>
                <input type="number" min={1} step={1} value={form.cantidad}
                  onChange={setNum("cantidad")} className={inputCls} />
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
                    onChange={setNum("travesanos")}
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

      {/* ── Fichas guardadas ── */}
      <section className="bg-white dark:bg-gris-800 border border-gray-200 dark:border-gris-700 rounded-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="font-medium text-sm">Fichas guardadas</div>
          <button onClick={loadFichas} disabled={loading}
            className="inline-flex items-center gap-1.5 text-xs text-blue-600 dark:text-blue-400 hover:underline disabled:opacity-50">
            <FaSyncAlt className={loading ? "animate-spin" : ""} /> Actualizar
          </button>
        </div>

        <EstadoResumen fichas={fichas} filtro={estadoFiltro} onFiltrar={setEstadoFiltro} />

        {/* Búsqueda */}
        <div className="relative mb-3 max-w-xs">
          <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por cliente…"
            className={`${inputCls} pl-8`}
          />
        </div>

        {loading ? (
          <div className="flex items-center gap-2 text-sm opacity-60 py-6 justify-center">
            <FaSyncAlt className="animate-spin" /> Cargando…
          </div>
        ) : fichas.length === 0 ? (
          <div className="flex flex-col items-center gap-2 text-sm opacity-60 py-8">
            <FaInbox className="text-2xl" /> Sin fichas guardadas
          </div>
        ) : fichasFiltradas.length === 0 ? (
          <div className="flex flex-col items-center gap-2 text-sm opacity-60 py-8">
            <FaSearch className="text-2xl" /> Ninguna ficha coincide con el filtro
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gris-700 text-gray-500">
                  <th className="text-left py-2 font-medium whitespace-nowrap">N.° ficha</th>
                  <th className="text-left py-2 font-medium">Cliente</th>
                  <th className="text-center py-2 font-medium">Ancho×Alto (mm)</th>
                  <th className="text-center py-2 font-medium">Travesaños</th>
                  <th className="text-center py-2 font-medium">Cant.</th>
                  <th className="text-center py-2 font-medium">Estado</th>
                  <th className="text-left py-2 font-medium">Creada</th>
                  <th className="py-2"></th>
                </tr>
              </thead>
              <tbody>
                {fichasFiltradas.map(({ f, numero, codigo }) => {
                  const isSelected = selectedId === f.id;
                  return (
                    <React.Fragment key={f.id}>
                      <tr
                        onClick={() => setSelectedId(isSelected ? null : f.id)}
                        className={`border-b border-gray-100 dark:border-gris-700/50 cursor-pointer transition-colors ${
                          isSelected ? "bg-blue-50/60 dark:bg-blue-900/20" : "hover:bg-gray-50 dark:hover:bg-gris-700/40"
                        }`}
                      >
                        <td className="py-2 font-mono text-gray-500 whitespace-nowrap">{codigo || numero}</td>
                        <td className="py-2 font-medium">
                          <span className="inline-flex items-center gap-1.5">
                            <FaChevronRight className={`text-[9px] text-gray-400 transition-transform ${isSelected ? "rotate-90" : ""}`} />
                            {f.cliente || "—"}
                          </span>
                        </td>
                        <td className="py-2 text-center font-mono">{f.ancho}×{f.alto}</td>
                        <td className="py-2 text-center font-mono">{f.travesanos}</td>
                        <td className="py-2 text-center">{f.cantidad}</td>
                        <td className="py-2 text-center">
                          <EstadoBadge estado={f.estado} onChange={(estado) => cambiarEstado(f.id, estado)} />
                        </td>
                        <td className="py-2 text-gray-500">
                          {f.createdAt?.toDate
                            ? f.createdAt.toDate().toLocaleDateString("es-CO")
                            : "—"}
                        </td>
                        <td className="py-2 pl-2">
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={(e) => { e.stopPropagation(); setPrintFicha({ ficha: f, numero }); }}
                              className="inline-flex items-center gap-1.5 px-2 py-1 text-xs rounded-lg bg-gray-100 hover:bg-gray-200 dark:bg-gris-700 dark:hover:bg-gris-600 border border-gray-300 dark:border-gris-600 whitespace-nowrap transition-colors"
                              title="Ver ficha imprimible"
                            >
                              <FaEye className="text-[11px]" /> Ver ficha
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); handleEditar(f); }}
                              className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded-lg bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/30 dark:hover:bg-blue-900/50 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 transition-colors"
                              title="Editar ficha"
                            >
                              <FaEdit className="text-[11px]" />
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); handleEliminar(f); }}
                              className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded-lg bg-red-50 hover:bg-red-100 dark:bg-red-900/30 dark:hover:bg-red-900/50 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800 transition-colors"
                              title="Eliminar ficha"
                            >
                              <FaTrash className="text-[11px]" />
                            </button>
                          </div>
                        </td>
                      </tr>

                      {isSelected && (
                        <tr className="border-b border-gray-200 dark:border-gris-700">
                          <td colSpan={9} className="py-3 px-2">
                            <FichaDetalleAbrigoRetractil
                              ficha={f}
                              numero={numero}
                              onCambiarEstado={cambiarEstado}
                              onAgregarNota={agregarNota}
                              onEditarEntrega={editarEntrega}
                              onEditarFirma={editarFirma}
                              onVerFicha={() => setPrintFicha({ ficha: f, numero })}
                              onEditar={() => handleEditar(f)}
                              onEliminar={() => handleEliminar(f)}
                            />
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {printFicha && (
        <FichaImpresionAbrigoRetractil
          ficha={printFicha.ficha}
          numero={printFicha.numero}
          onClose={() => setPrintFicha(null)}
        />
      )}

      {modales}
    </div>
  );
}

// ─── Detalle expandido inline ─────────────────────────────────────────────────
function FichaDetalleAbrigoRetractil({ ficha: f, numero, onCambiarEstado, onAgregarNota, onEditarEntrega, onEditarFirma, onVerFicha, onEditar, onEliminar }) {
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
