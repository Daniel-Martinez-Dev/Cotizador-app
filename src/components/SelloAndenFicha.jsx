import React from "react";
import toast from "react-hot-toast";
import { calcularSello } from "../modules/produccion/sellos/calcular.js";
import { PARAMETROS_SELLO } from "../modules/produccion/sellos/parametros.js";
import {
  crearFichaSello,
  listarFichasSellos,
  actualizarFichaSello,
} from "../utils/firebaseSellos";
import FichaImpresionSello from "./FichaImpresionSello";

const hoy = () => new Date().toISOString().slice(0, 10);
const en5dias = () => {
  const d = new Date();
  d.setDate(d.getDate() + 5);
  return d.toISOString().slice(0, 10);
};

const INITIAL_FORM = {
  cliente:           "",
  cantidad:          1,
  fechaOrden:        hoy(),
  fechaEntrega:      en5dias(),
  anchoVano:         "",
  altoVano:          "",
  espesorSello:      PARAMETROS_SELLO.ESPESOR_SELLO_DEFAULT_MM,
  espesorPoste:      PARAMETROS_SELLO.ESPESOR_POSTE_DEFAULT_MM,
  espesorTravesano:  PARAMETROS_SELLO.ESPESOR_TRAVESANO_DEFAULT_MM,
  materialBase:      "MADERA",
  llevaCortina:      true,
  llevaTravesano:    false,
  despliegueCortina: PARAMETROS_SELLO.DESPLIEGUE_CORTINA_DEFAULT_MM,
  fact:              "SI",
  formaCuna:         "NO",
  selloAbrigo:       "NO",
  bandaLateral:      "",
  bandaSuperior:     "",
};

const fmtMm  = (n) => (n == null || n === 0 ? "—" : Math.round(Number(n)).toString());
const fmtM2  = (n) => (n == null ? "—" : Number(n).toFixed(3));
const fmtN   = (n) => (n == null ? "—" : Number(n).toString());

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

const inputCls  = "mt-1 w-full px-3 py-2 rounded border border-gray-300 dark:border-gris-600 bg-white dark:bg-gris-700 text-sm";
const labelCls  = "text-xs text-gray-600 dark:text-gray-300";
const sectionTitleCls = "text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2";

export default function SelloAndenFicha() {
  const [form, setForm]             = React.useState(INITIAL_FORM);
  const [fichas, setFichas]         = React.useState([]);
  const [loading, setLoading]       = React.useState(false);
  const [saving, setSaving]         = React.useState(false);
  const [selectedId, setSelectedId] = React.useState(null);
  const [printFicha, setPrintFicha] = React.useState(null);

  const calculo = React.useMemo(
    () => calcularSello(form),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      form.anchoVano, form.altoVano,
      form.espesorSello, form.espesorPoste, form.espesorTravesano,
      form.materialBase, form.llevaCortina, form.llevaTravesano,
    ]
  );

  const loadFichas = React.useCallback(async () => {
    setLoading(true);
    try {
      setFichas(await listarFichasSellos());
    } catch (e) {
      console.error(e);
      toast.error("Error cargando fichas");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => { loadFichas(); }, [loadFichas]);

  const set = (field) => (e) => setForm((p) => ({ ...p, [field]: e.target.value }));
  const setNum = (field) => (e) => setForm((p) => ({ ...p, [field]: Number(e.target.value) }));
  const setBool = (field) => (e) => setForm((p) => ({ ...p, [field]: e.target.value === "true" }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.anchoVano || !form.altoVano)
      return toast.error("Ancho y alto del vano son requeridos");
    if (Number(form.anchoVano) <= 0 || Number(form.altoVano) <= 0)
      return toast.error("Las medidas deben ser mayores a 0");
    if (!calculo) return toast.error("Revisa las medidas");
    setSaving(true);
    try {
      await crearFichaSello(
        {
          ...form,
          anchoVano: Number(form.anchoVano),
          altoVano:  Number(form.altoVano),
        },
        calculo
      );
      toast.success("Ficha guardada");
      setForm(INITIAL_FORM);
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
      await actualizarFichaSello(id, { estado });
      toast.success(`Estado → ${ESTADO_LABEL[estado] || estado}`);
      setFichas((prev) => prev.map((f) => (f.id === id ? { ...f, estado } : f)));
    } catch (err) {
      console.error(err);
      toast.error("Error actualizando estado");
    }
  };

  const mp = calculo?.materiaPrima;
  const med = calculo?.medidas;
  const cantidad = Number(form.cantidad) || 1;

  return (
    <div className="space-y-5">

      {/* ── Fila superior: formulario + vista previa ── */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">

        {/* FORMULARIO */}
        <section className="bg-white dark:bg-gris-800 border border-gray-200 dark:border-gris-700 rounded-lg p-4">
          <div className="font-medium text-sm mb-4">Nueva ficha — Sello de Andén</div>
          <form onSubmit={handleSubmit} className="space-y-4">

            {/* Identificación */}
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2 sm:col-span-1">
                <label className={labelCls}>Cliente</label>
                <input value={form.cliente} onChange={set("cliente")}
                  className={inputCls} placeholder="Nombre del cliente" />
              </div>
              <div>
                <label className={labelCls}>Cantidad</label>
                <input type="number" min={1} step={1} value={form.cantidad}
                  onChange={setNum("cantidad")} className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Fecha orden</label>
                <input type="date" value={form.fechaOrden} onChange={set("fechaOrden")} className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Fecha entrega</label>
                <input type="date" value={form.fechaEntrega} onChange={set("fechaEntrega")} className={inputCls} />
              </div>
            </div>

            {/* Medidas del vano */}
            <div className="border-t border-gray-200 dark:border-gris-700 pt-4">
              <div className={sectionTitleCls}>Medidas del vano (mm)</div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Ancho vano</label>
                  <input type="number" min={1} value={form.anchoVano}
                    onChange={set("anchoVano")}
                    className={`${inputCls} font-mono`} placeholder="ej: 2400" />
                </div>
                <div>
                  <label className={labelCls}>Alto vano</label>
                  <input type="number" min={1} value={form.altoVano}
                    onChange={set("altoVano")}
                    className={`${inputCls} font-mono`} placeholder="ej: 3200" />
                </div>
              </div>
            </div>

            {/* Espesores */}
            <div className="border-t border-gray-200 dark:border-gris-700 pt-4">
              <div className={sectionTitleCls}>Espesores (mm)</div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className={labelCls}>Sello principal</label>
                  <input type="number" min={1} value={form.espesorSello}
                    onChange={setNum("espesorSello")} className={`${inputCls} font-mono`} />
                </div>
                <div>
                  <label className={labelCls}>Postes laterales</label>
                  <input type="number" min={1} value={form.espesorPoste}
                    onChange={setNum("espesorPoste")} className={`${inputCls} font-mono`} />
                </div>
                <div>
                  <label className={labelCls}>Travesaño</label>
                  <input type="number" min={1} value={form.espesorTravesano}
                    onChange={setNum("espesorTravesano")} className={`${inputCls} font-mono`} />
                </div>
              </div>
            </div>

            {/* Opciones */}
            <div className="border-t border-gray-200 dark:border-gris-700 pt-4">
              <div className={sectionTitleCls}>Opciones</div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Material base</label>
                  <select value={form.materialBase} onChange={set("materialBase")} className={inputCls}>
                    <option value="MADERA">MADERA</option>
                    <option value="LAMINA">LÁMINA</option>
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Fact (facturar)</label>
                  <select value={form.fact} onChange={set("fact")} className={inputCls}>
                    <option value="SI">SÍ</option>
                    <option value="NO">NO</option>
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Cortina superior</label>
                  <select value={String(form.llevaCortina)} onChange={setBool("llevaCortina")} className={inputCls}>
                    <option value="true">SÍ</option>
                    <option value="false">NO</option>
                  </select>
                </div>
                {form.llevaCortina && (
                  <div>
                    <label className={labelCls}>Despliegue cortina (mm)</label>
                    <input type="number" min={1} value={form.despliegueCortina}
                      onChange={setNum("despliegueCortina")} className={`${inputCls} font-mono`} />
                  </div>
                )}
                <div>
                  <label className={labelCls}>Travesaño superior</label>
                  <select value={String(form.llevaTravesano)} onChange={setBool("llevaTravesano")} className={inputCls}>
                    <option value="false">NO</option>
                    <option value="true">SÍ</option>
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Forma de cuña</label>
                  <select value={form.formaCuna} onChange={set("formaCuna")} className={inputCls}>
                    <option value="NO">NO</option>
                    <option value="SI">SÍ</option>
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Sello abrigo</label>
                  <select value={form.selloAbrigo} onChange={set("selloAbrigo")} className={inputCls}>
                    <option value="NO">NO</option>
                    <option value="SI">SÍ</option>
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Banda lateral</label>
                  <input value={form.bandaLateral} onChange={set("bandaLateral")} className={inputCls} placeholder="Opcional" />
                </div>
                <div>
                  <label className={labelCls}>Banda superior</label>
                  <input value={form.bandaSuperior} onChange={set("bandaSuperior")} className={inputCls} placeholder="Opcional" />
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
        <section className="bg-white dark:bg-gris-800 border border-gray-200 dark:border-gris-700 rounded-lg p-4">
          <div className="font-medium text-sm mb-4">Vista previa</div>

          {!calculo ? (
            <div className="flex items-center justify-center h-48 text-sm text-gray-400 dark:text-gray-500">
              Ingresa ancho y alto del vano para ver los cálculos
            </div>
          ) : (
            <div className="space-y-4 text-sm">

              {/* Medidas derivadas */}
              <div>
                <div className={sectionTitleCls}>Medidas derivadas (mm)</div>
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-gris-700 text-gray-500">
                      <th className="text-left py-1.5">Componente</th>
                      <th className="text-right py-1.5">Dim 1</th>
                      <th className="text-right py-1.5">Dim 2</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      ["Vano",            fmtMm(form.anchoVano),     fmtMm(form.altoVano)],
                      ["Sello principal", fmtMm(med.selloAncho),     fmtMm(med.selloAlto)],
                      ["Espuma postes",   fmtMm(med.espumaPostesAncho), fmtMm(med.espumaPostesAlto)],
                      ["Tapa superior",   fmtMm(med.tapaSuperiorAncho), fmtMm(med.tapaSuperiorLargo)],
                      ["Tapa inferior",   fmtMm(med.tapaInferiorAncho), fmtMm(med.tapaInferiorLargo)],
                      ["Forros / chaleco",fmtMm(med.forroAncho),     fmtMm(med.forroLargo)],
                      ...(form.llevaCortina ? [["Cortina", fmtMm(med.cortinaAncho), fmtMm(med.cortinaLargoLona)]] : []),
                      ...(form.llevaTravesano ? [["Travesaño", fmtMm(med.travesanoAncho), fmtMm(med.travesanoLargoLona)]] : []),
                    ].map(([name, d1, d2]) => (
                      <tr key={name} className="border-b border-gray-100 dark:border-gris-700/50">
                        <td className="py-1.5 font-medium">{name}</td>
                        <td className="text-right py-1.5 font-mono">{d1}</td>
                        <td className="text-right py-1.5 font-mono">{d2}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Consumo materia prima */}
              <div>
                <div className={sectionTitleCls}>Materia prima</div>
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-gris-700 text-gray-500">
                      <th className="text-left py-1.5">Insumo</th>
                      <th className="text-right py-1.5">C/U</th>
                      {cantidad > 1 && <th className="text-right py-1.5">×{cantidad}</th>}
                      <th className="text-right py-1.5">Unidad</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { label: "Lona",           val: mp.lonaM2,           unit: "m²",  total: mp.lonaM2 * cantidad },
                      { label: "Espuma postes",   val: mp.espumaPostesMm,   unit: "mm",  total: mp.espumaPostesMm * cantidad },
                      ...(form.llevaTravesano ? [{ label: "Espuma travesaño", val: mp.espumaTravesanoMm, unit: "mm", total: mp.espumaTravesanoMm * cantidad }] : []),
                      ...(form.materialBase === "MADERA" ? [{ label: "Madera postes", val: mp.maderaPostesMm, unit: "mm", total: mp.maderaPostesMm * cantidad }] : []),
                      ...(form.materialBase === "LAMINA"  ? [{ label: "Lámina postes", val: mp.laminaPostesMm, unit: "mm", total: mp.laminaPostesMm * cantidad }] : []),
                      ...(form.llevaCortina ? [
                        { label: "Cadena",           val: mp.cadenaMm,  unit: "mm", total: mp.cadenaMm * cantidad },
                        { label: "Tubo cuadrado 3/4\"", val: mp.tuboMm, unit: "mm", total: mp.tuboMm * cantidad },
                      ] : []),
                      { label: "Ángulo L galv.",  val: mp.angulosUnd, unit: "und", total: mp.angulosUnd * cantidad },
                      { label: "Platina 2\"×1/8\"", val: mp.platinaMm, unit: "mm",  total: mp.platinaMm * cantidad },
                    ].map(({ label, val, unit, total }) => (
                      <tr key={label} className="border-b border-gray-100 dark:border-gris-700/50">
                        <td className="py-1.5 font-medium">{label}</td>
                        <td className="text-right py-1.5 font-mono">
                          {unit === "m²" ? fmtM2(val) : fmtN(val)}
                        </td>
                        {cantidad > 1 && (
                          <td className="text-right py-1.5 font-mono">
                            {unit === "m²" ? fmtM2(total) : fmtN(total)}
                          </td>
                        )}
                        <td className="text-right py-1.5 text-gray-500">{unit}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
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
                  <th className="text-left py-2 font-medium pl-2">Cliente</th>
                  <th className="text-left py-2 font-medium">Vano (mm)</th>
                  <th className="text-center py-2 font-medium">Cant.</th>
                  <th className="text-center py-2 font-medium">Material</th>
                  <th className="text-center py-2 font-medium">Cortina</th>
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
                        <td className="py-2 font-medium pl-2">{f.cliente || "—"}</td>
                        <td className="py-2 font-mono">{f.anchoVano}×{f.altoVano}</td>
                        <td className="py-2 text-center">{f.cantidad}</td>
                        <td className="py-2 text-center">{f.materialBase || "—"}</td>
                        <td className="py-2 text-center">{f.llevaCortina ? "SÍ" : "NO"}</td>
                        <td className="py-2 text-center">
                          <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${ESTADO_CLS[f.estado] || ESTADO_CLS.borrador}`}>
                            {ESTADO_LABEL[f.estado] || f.estado}
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
                            <FichaDetalleSello
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
        <FichaImpresionSello
          ficha={printFicha.ficha}
          numero={printFicha.numero}
          onClose={() => setPrintFicha(null)}
        />
      )}
    </div>
  );
}

// ─── Detalle expandido inline ─────────────────────────────────────────────────
function FichaDetalleSello({ ficha: f, numero, onCambiarEstado, onVerFicha }) {
  const med = f.medidas    || {};
  const mp  = f.materiaPrima || {};
  const cantidad = Number(f.cantidad) || 1;
  const fmtMm = (n) => (n == null ? "—" : Math.round(Number(n)).toString());
  const fmtM2 = (n) => (n == null ? "—" : Number(n).toFixed(3));
  const fmtN  = (n) => (n == null ? "—" : Number(n).toString());

  const filas = [
    { label: "Sello principal", d1: med.selloAncho,        d2: med.selloAlto,          color: "#1a3f8f" },
    { label: "Espuma postes",   d1: med.espumaPostesAncho, d2: med.espumaPostesAlto,   color: "#0f6cbf" },
    { label: "Tapa superior",   d1: med.tapaSuperiorAncho, d2: med.tapaSuperiorLargo,  color: "#0891b2" },
    { label: "Tapa inferior",   d1: med.tapaInferiorAncho, d2: med.tapaInferiorLargo,  color: "#0d9488" },
    { label: "Forros",          d1: med.forroAncho,        d2: med.forroLargo,         color: "#7c3aed" },
    ...(f.llevaCortina    ? [{ label: "Cortina",    d1: med.cortinaAncho,    d2: med.cortinaLargoLona,   color: "#059669" }] : []),
    ...(f.llevaTravesano  ? [{ label: "Travesaño",  d1: med.travesanoAncho,  d2: med.travesanoLargoLona, color: "#d97706" }] : []),
  ];

  return (
    <div className="bg-gray-50 dark:bg-gris-700/60 rounded-xl p-4 space-y-4 text-xs border border-gray-200 dark:border-gris-600">
      <div className="flex items-center justify-between">
        <div>
          <span className="font-semibold text-sm text-gray-800 dark:text-gray-100">{f.cliente || "Sin cliente"}</span>
          <span className="ml-2 text-gray-400 font-mono">{f.anchoVano}×{f.altoVano} mm · ×{f.cantidad}</span>
        </div>
        <button onClick={onVerFicha}
          className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium">
          Ver ficha
        </button>
      </div>

      {/* Medidas de corte */}
      <div>
        <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">Medidas de corte (mm)</div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {filas.map(({ label, d1, d2, color }) => (
            <div key={label} style={{ border: `2px solid ${color}` }} className="rounded-lg overflow-hidden bg-white dark:bg-gris-800">
              <div style={{ background: color, color: "white" }} className="text-center text-[10px] font-bold uppercase py-1 px-2">
                {label}
              </div>
              <div className="grid grid-cols-2 divide-x divide-gray-100 dark:divide-gris-700">
                {[["Ancho/L", d1], ["Alto/A", d2]].map(([dim, val]) => (
                  <div key={dim} className="p-2 text-center">
                    <div className="text-[9px] text-gray-400 uppercase">{dim}</div>
                    <div style={{ color }} className="font-mono font-bold text-sm leading-tight">
                      {fmtMm(val)}
                    </div>
                    <div className="text-[9px] text-gray-400">mm</div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Materia prima */}
      <div>
        <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">Materia prima</div>
        <div className="grid grid-cols-3 sm:grid-cols-5 gap-1.5">
          {[
            { label: "Lona",       val: fmtM2(mp.lonaM2),      unit: "m²",  tot: fmtM2((mp.lonaM2 || 0) * cantidad) },
            { label: "Esp. postes",val: fmtN(mp.espumaPostesMm),unit: "mm", tot: fmtN((mp.espumaPostesMm || 0) * cantidad) },
            ...(f.materialBase === "MADERA" ? [{ label: "Madera",  val: fmtN(mp.maderaPostesMm), unit: "mm", tot: fmtN((mp.maderaPostesMm || 0) * cantidad) }] : []),
            ...(f.materialBase === "LAMINA"  ? [{ label: "Lámina",  val: fmtN(mp.laminaPostesMm), unit: "mm", tot: fmtN((mp.laminaPostesMm || 0) * cantidad) }] : []),
            ...(f.llevaCortina ? [
              { label: "Cadena",  val: fmtN(mp.cadenaMm),  unit: "mm", tot: fmtN((mp.cadenaMm || 0) * cantidad) },
              { label: "Tubo",    val: fmtN(mp.tuboMm),    unit: "mm", tot: fmtN((mp.tuboMm || 0) * cantidad) },
            ] : []),
            { label: "Ángulos",    val: fmtN(mp.angulosUnd), unit: "und", tot: fmtN((mp.angulosUnd || 0) * cantidad) },
            { label: "Platina",    val: fmtN(mp.platinaMm),  unit: "mm",  tot: fmtN((mp.platinaMm || 0) * cantidad) },
          ].map(({ label, val, unit, tot }) => (
            <div key={label} className="bg-white dark:bg-gris-800 border border-gray-100 dark:border-gris-700 rounded-lg p-2">
              <div className="text-[9px] text-gray-400 leading-tight mb-1">{label}</div>
              <div className="font-mono font-bold text-gray-700 dark:text-gray-200 text-sm">{val}</div>
              <div className="text-[9px] text-gray-400">{unit} c/u</div>
              {cantidad > 1 && <div className="text-[9px] text-blue-500 font-mono mt-0.5">{tot} total</div>}
            </div>
          ))}
        </div>
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
