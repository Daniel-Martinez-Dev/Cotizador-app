import React from "react";
import toast from "react-hot-toast";
import { calcularAbrigo } from "../modules/produccion/abrigos/calcular.js";
import {
  crearFichaAbrigo,
  listarFichasAbrigos,
  actualizarFichaAbrigo,
} from "../utils/firebaseAbrigos";
import FichaImpresionAbrigo from "./FichaImpresionAbrigo";

// ─── Utilidades ───────────────────────────────────────────────────────────────

const hoy = () => new Date().toISOString().slice(0, 10);

const genOP = () => {
  const now = new Date();
  const yy = String(now.getFullYear()).slice(2);
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  const hh = String(now.getHours()).padStart(2, "0");
  const mi = String(now.getMinutes()).padStart(2, "0");
  return `AP-${yy}${mm}${dd}-${hh}${mi}`;
};

const fmtMm = (n) => (n == null ? "—" : Math.round(Number(n)).toString());
const fmtM2 = (n) => (n == null ? "—" : Number(n).toFixed(3));
const fmtDec = (n, d = 2) => (n == null ? "—" : Number(n).toFixed(d));
const fmtN  = (n) => (n == null ? "—" : Number(n).toString());

const ESTADO_LABEL = {
  borrador:      "Borrador",
  en_produccion: "En producción",
  terminado:     "Terminado",
};
const ESTADO_CLS = {
  borrador:      "bg-gray-100 text-gray-700 dark:bg-gris-700 dark:text-gray-300",
  en_produccion: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  terminado:     "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300",
};

const inputCls = "mt-1 w-full px-3 py-2 rounded border border-gray-300 dark:border-gris-600 bg-white dark:bg-gris-700 text-sm";
const labelCls = "text-xs text-gray-600 dark:text-gray-300";
const sectionTitleCls = "text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2";

const INITIAL_FORM = {
  numeroOP:          genOP(),
  cliente:           "",
  cantidad:          1,
  fechaOrden:        hoy(),
  fechaEntrega:      "",
  auxiliarEncargado: "TODOS",
  ancho:             "",
  alto:              "",
  casas:             910,
  color:             "NEGRO",
  acabado:           "PINTADO",
  llevaBanda:        true,
};

// ─── Componente principal ─────────────────────────────────────────────────────

export default function AbrigoAndenFicha() {
  const [form, setForm]             = React.useState(INITIAL_FORM);
  const [fichas, setFichas]         = React.useState([]);
  const [loading, setLoading]       = React.useState(false);
  const [saving, setSaving]         = React.useState(false);
  const [selectedId, setSelectedId] = React.useState(null);
  const [printFicha, setPrintFicha] = React.useState(null);

  // ── Cálculo reactivo ─────────────────────────────────────────────────────

  const calculo = React.useMemo(
    () => calcularAbrigo(form),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [form.ancho, form.alto, form.casas, form.cantidad, form.llevaBanda, form.fechaOrden]
  );

  // Sincroniza fechaEntrega calculada cuando cambian ancho/alto/cantidad/fechaOrden
  // pero solo si el usuario no la ha editado manualmente
  const [fechaManual, setFechaManual] = React.useState(false);
  React.useEffect(() => {
    if (!fechaManual && calculo?.fechaEntrega) {
      setForm((p) => ({ ...p, fechaEntrega: calculo.fechaEntrega }));
    }
  }, [calculo?.fechaEntrega, fechaManual]);

  // ── Firebase ─────────────────────────────────────────────────────────────

  const loadFichas = React.useCallback(async () => {
    setLoading(true);
    try {
      setFichas(await listarFichasAbrigos());
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
      await crearFichaAbrigo(
        { ...form, ancho: Number(form.ancho), alto: Number(form.alto) },
        calculo
      );
      toast.success("Ficha guardada");
      setForm({ ...INITIAL_FORM, numeroOP: genOP() });
      setFechaManual(false);
      await loadFichas();
    } catch (err) {
      console.error(err);
      toast.error("Error guardando ficha");
    } finally {
      setSaving(false);
    }
  };

  const cambiarEstado = async (id, estado) => {
    try {
      await actualizarFichaAbrigo(id, { estado });
      toast.success(`Estado → ${ESTADO_LABEL[estado] || estado}`);
      setFichas((prev) => prev.map((f) => (f.id === id ? { ...f, estado } : f)));
    } catch (err) {
      console.error(err);
      toast.error("Error actualizando estado");
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
        <section className="bg-white dark:bg-gris-800 border border-gray-200 dark:border-gris-700 rounded-lg p-4">
          <div className="font-medium text-sm mb-4">Nueva ficha — Abrigo de Andén</div>
          <form onSubmit={handleSubmit} className="space-y-4">

            {/* Identificación */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>N° OP</label>
                <input value={form.numeroOP} onChange={set("numeroOP")}
                  className={`${inputCls} font-mono`} placeholder="AP-YYMMDD-HHMM" />
              </div>
              <div>
                <label className={labelCls}>Cantidad</label>
                <input type="number" min={1} step={1} value={form.cantidad}
                  onChange={setNum("cantidad")} className={inputCls} />
              </div>
              <div className="col-span-2">
                <label className={labelCls}>Cliente</label>
                <input value={form.cliente} onChange={set("cliente")}
                  className={inputCls} placeholder="Nombre del cliente" />
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
                  <label className={labelCls}>Ancho</label>
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
                  <label className={labelCls}>Casas (mm)</label>
                  <input type="number" min={1} value={form.casas}
                    onChange={setNum("casas")}
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

            <div className="flex justify-end pt-1">
              <button type="submit" disabled={saving || !calculo}
                className="px-5 py-2 rounded bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white text-sm font-medium transition-colors">
                {saving ? "Guardando…" : "Guardar ficha"}
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
                      ["Lona perimetral",     fmtMm(med.loneaPerimetro),    "700",                 "1"],
                      ["Banda PVC lateral",   fmtMm(med.bandaLateralLargo), fmtMm(med.bandaLateralAncho), "2"],
                      ["Banda PVC superior",  fmtMm(med.bandaSuperiorLargo),fmtMm(med.bandaSuperiorAncho),"1"],
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
          <button onClick={loadFichas}
            className="text-xs text-blue-600 dark:text-blue-400 hover:underline">
            Actualizar
          </button>
        </div>

        {loading ? (
          <div className="text-sm opacity-60">Cargando…</div>
        ) : fichas.length === 0 ? (
          <div className="text-sm opacity-60">Sin fichas guardadas</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gris-700 text-gray-500">
                  <th className="text-right py-2 font-medium w-10">#</th>
                  <th className="text-left py-2 font-medium pl-2">OP</th>
                  <th className="text-left py-2 font-medium">Cliente</th>
                  <th className="text-center py-2 font-medium">Ancho×Alto (mm)</th>
                  <th className="text-center py-2 font-medium">Casas</th>
                  <th className="text-center py-2 font-medium">Cant.</th>
                  <th className="text-center py-2 font-medium">Estado</th>
                  <th className="text-left py-2 font-medium">Creada</th>
                  <th className="py-2"></th>
                </tr>
              </thead>
              <tbody>
                {fichas.map((f, idx) => {
                  const numero = fichas.length - idx;
                  return (
                    <React.Fragment key={f.id}>
                      <tr
                        onClick={() => setSelectedId(selectedId === f.id ? null : f.id)}
                        className="border-b border-gray-100 dark:border-gris-700/50 cursor-pointer hover:bg-gray-50 dark:hover:bg-gris-700/40 transition-colors"
                      >
                        <td className="py-2 text-right font-mono text-gray-400">{numero}</td>
                        <td className="py-2 font-mono pl-2 text-gray-500">{f.numeroOP || "—"}</td>
                        <td className="py-2 font-medium">{f.cliente || "—"}</td>
                        <td className="py-2 text-center font-mono">{f.ancho}×{f.alto}</td>
                        <td className="py-2 text-center font-mono">{f.casas}</td>
                        <td className="py-2 text-center">{f.cantidad}</td>
                        <td className="py-2 text-center">
                          <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${ESTADO_CLS[f.estado] || ESTADO_CLS.borrador}`}>
                            {ESTADO_LABEL[f.estado] || f.estado || "Borrador"}
                          </span>
                        </td>
                        <td className="py-2 text-gray-500">
                          {f.createdAt?.toDate
                            ? f.createdAt.toDate().toLocaleDateString("es-CO")
                            : "—"}
                        </td>
                        <td className="py-2 pl-2">
                          <button
                            onClick={(e) => { e.stopPropagation(); setPrintFicha({ ficha: f, numero }); }}
                            className="px-2 py-1 text-xs rounded bg-gray-100 hover:bg-gray-200 dark:bg-gris-700 dark:hover:bg-gris-600 border border-gray-300 dark:border-gris-600 whitespace-nowrap"
                          >
                            Ver ficha
                          </button>
                        </td>
                      </tr>

                      {selectedId === f.id && (
                        <tr className="border-b border-gray-200 dark:border-gris-700">
                          <td colSpan={9} className="py-3 px-2">
                            <FichaDetalleAbrigo
                              ficha={f}
                              numero={numero}
                              onCambiarEstado={cambiarEstado}
                              onVerFicha={() => setPrintFicha({ ficha: f, numero })}
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
        <FichaImpresionAbrigo
          ficha={printFicha.ficha}
          numero={printFicha.numero}
          onClose={() => setPrintFicha(null)}
        />
      )}
    </div>
  );
}

// ─── Detalle expandido inline ─────────────────────────────────────────────────
function FichaDetalleAbrigo({ ficha: f, numero, onCambiarEstado, onVerFicha }) {
  const med  = f.medidas               || {};
  const mp   = f.materiaPrimaPorAbrigo || {};
  const mpt  = f.materiaPrimaTotal     || {};
  const des  = f.despacho              || {};
  const cant = Number(f.cantidad)      || 1;

  const tarjetas = [
    { label: "Lona perimetral",   val: `${fmtMm(med.loneaPerimetro)} × 700`,           color: "#1a3f8f" },
    { label: "Banda lateral ×2",  val: `800 × ${fmtMm(med.bandaLateralLargo)}`,         color: "#0891b2" },
    { label: "Banda superior ×1", val: `1600 × ${fmtMm(med.bandaSuperiorLargo)}`,       color: "#0d9488" },
    { label: "Travesaños ×4",     val: `${fmtMm(med.travesanoLargo)} mm`,               color: "#7c3aed" },
    { label: "Casitas ×2",        val: `${fmtMm(med.casitasLargo)} mm`,                 color: "#d97706" },
    { label: "Mangueras",         val: `${fmtN(med.manguerasCantidad)} rollos 6000 mm`, color: "#059669" },
  ];

  return (
    <div className="bg-gray-50 dark:bg-gris-700/60 rounded-xl p-4 space-y-4 text-xs border border-gray-200 dark:border-gris-600">
      <div className="flex items-center justify-between">
        <div>
          <span className="font-semibold text-sm text-gray-800 dark:text-gray-100">
            {f.cliente || "Sin cliente"}
          </span>
          <span className="ml-2 text-gray-400 font-mono">
            {f.ancho}×{f.alto} mm · ×{f.cantidad} und · casas {f.casas} mm
          </span>
        </div>
        <button onClick={onVerFicha}
          className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium">
          Ver ficha
        </button>
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

      {/* Acciones de estado */}
      <div className="flex flex-wrap gap-2 pt-1 border-t border-gray-200 dark:border-gris-600">
        {f.estado !== "en_produccion" && (
          <button onClick={() => onCambiarEstado(f.id, "en_produccion")}
            className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium">
            Pasar a producción
          </button>
        )}
        {f.estado !== "terminado" && (
          <button onClick={() => onCambiarEstado(f.id, "terminado")}
            className="px-3 py-1.5 rounded-lg bg-green-600 hover:bg-green-500 text-white text-xs font-medium">
            Marcar terminada
          </button>
        )}
        {f.estado !== "borrador" && (
          <button onClick={() => onCambiarEstado(f.id, "borrador")}
            className="px-3 py-1.5 rounded-lg bg-gray-200 hover:bg-gray-300 dark:bg-gris-600 dark:hover:bg-gris-500 text-xs font-medium">
            Volver a borrador
          </button>
        )}
      </div>
    </div>
  );
}

