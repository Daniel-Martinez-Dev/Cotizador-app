import React from "react";
import toast from "react-hot-toast";
import {
  FaRulerCombined,
  FaLayerGroup,
  FaSlidersH,
  FaIdCard,
  FaSyncAlt,
  FaEdit,
  FaTrash,
  FaTimes,
} from "react-icons/fa";
import { calcularSello } from "../modules/produccion/sellos/calcular.js";
import { PARAMETROS_SELLO } from "../modules/produccion/sellos/parametros.js";
import { crearFichaSello, actualizarFichaSello } from "../utils/firebaseSellos";
import { fmtMm as fmtMmBase, fmtM2, fmtN } from "../utils/fichaFormat";
import EstadoControl from "./fichas/EstadoControl";
import { useQuote } from "../context/QuoteContext";
import { codigoFicha as codigoDeFicha } from "../utils/codigoFicha";
import IdentificacionFicha from "./fichas/IdentificacionFicha";
import ClienteSelector from "./fichas/ClienteSelector";
import { clienteDeFicha } from "../utils/clienteVinculo";
import { valorNumerico, conDefectosNumericos } from "../utils/campoNumero";

const hoy = () => new Date().toISOString().slice(0, 10);
const en5dias = () => {
  const d = new Date();
  d.setDate(d.getDate() + 5);
  return d.toISOString().slice(0, 10);
};

const INITIAL_FORM = {
  codigoFicha:       "", // solo lectura: lo asigna el sistema al guardar
  numeroOrdenCompra: "",
  cliente:           "",
  // Vínculo con la base de clientes del cotizador (empresas/{id}).
  // Ver utils/clienteVinculo.js.
  clienteId:         null,
  clienteNit:        "",
  clienteCiudad:     "",
  clienteAlias:      "",
  usarAlias:         false,
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

// Lo que vale un campo numérico que se dejó en blanco. El formulario admite ""
// para que se pueda borrar y reescribir sin pelear con un 0 (ver
// utils/campoNumero.js); el cálculo y lo que se guarda usan estos defectos, que
// además son los que se ven de placeholder.
const DEFECTOS_NUM = {
  cantidad:          1,
  espesorSello:      PARAMETROS_SELLO.ESPESOR_SELLO_DEFAULT_MM,
  espesorPoste:      PARAMETROS_SELLO.ESPESOR_POSTE_DEFAULT_MM,
  espesorTravesano:  PARAMETROS_SELLO.ESPESOR_TRAVESANO_DEFAULT_MM,
  despliegueCortina: PARAMETROS_SELLO.DESPLIEGUE_CORTINA_DEFAULT_MM,
};

const conDefectos = (form) => conDefectosNumericos(form, DEFECTOS_NUM);

// Las medidas de corte del sello nunca son 0 legítimamente: se tratan como "—".
const fmtMm = (n) => fmtMmBase(n, { hideZero: true });

const inputCls  = "mt-1 w-full px-3 py-2 rounded border border-gray-300 dark:border-gris-600 bg-white dark:bg-gris-700 text-sm";
const labelCls  = "text-xs text-gray-600 dark:text-gray-300";
const sectionTitleCls = "text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2";

function SectionLabel({ icon: Icon, children }) {
  return (
    <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
      <Icon className="text-[11px] opacity-70" /> {children}
    </div>
  );
}

export default function SelloAndenFicha({ encargo, onEncargoAtendido, onGuardada }) {
  const { confirm } = useQuote();
  const [form, setForm]             = React.useState(INITIAL_FORM);
  const [loading, setLoading]       = React.useState(false);
  const [saving, setSaving]         = React.useState(false);
  const [search, setSearch]         = React.useState("");
  const [editingId, setEditingId]   = React.useState(null);
  const formRef = React.useRef(null);

  const calculo = React.useMemo(
    () => calcularSello(conDefectos(form)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      form.anchoVano, form.altoVano,
      form.espesorSello, form.espesorPoste, form.espesorTravesano,
      form.materialBase, form.llevaCortina, form.llevaTravesano,
    ]
  );

  const set = (field) => (e) => setForm((p) => ({ ...p, [field]: e.target.value }));

  // El selector devuelve nombre + id + NIT + ciudad juntos: la ficha no puede
  // quedar con el id de un cliente y el nombre de otro.
  const setCliente = (datos) => setForm((p) => ({ ...p, ...datos }));
  const setNum = (field) => (e) => setForm((p) => ({ ...p, [field]: valorNumerico(e.target.value) }));
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
      const datos = {
        ...conDefectos(form),
        anchoVano: Number(form.anchoVano),
        altoVano:  Number(form.altoVano),
      };
      if (editingId) {
        await actualizarFichaSello(editingId, {
          ...datos,
          medidas:      calculo.medidas,
          materiaPrima: calculo.materiaPrima,
        });
        toast.success("Ficha actualizada");
        setEditingId(null);
      } else {
        await crearFichaSello(datos, calculo);
        toast.success("Ficha guardada");
      }
      setForm(INITIAL_FORM);
      onGuardada?.();
    } catch (err) {
      console.error(err);
      toast.error(editingId ? "Error actualizando ficha" : "Error guardando ficha");
    } finally {
      setSaving(false);
    }
  };

  const handleEditar = (f) => {
    setForm({
      codigoFicha:       codigoDeFicha(f, "sello"),
      numeroOrdenCompra: f.numeroOrdenCompra || "",
      ...clienteDeFicha(f),
      cantidad:          f.cantidad ?? 1,
      fechaOrden:        f.fechaOrden || hoy(),
      fechaEntrega:      f.fechaEntrega || en5dias(),
      anchoVano:         f.anchoVano ?? "",
      altoVano:          f.altoVano ?? "",
      espesorSello:      f.espesorSello ?? PARAMETROS_SELLO.ESPESOR_SELLO_DEFAULT_MM,
      espesorPoste:      f.espesorPoste ?? PARAMETROS_SELLO.ESPESOR_POSTE_DEFAULT_MM,
      espesorTravesano:  f.espesorTravesano ?? PARAMETROS_SELLO.ESPESOR_TRAVESANO_DEFAULT_MM,
      materialBase:      f.materialBase || "MADERA",
      llevaCortina:      !!f.llevaCortina,
      llevaTravesano:    !!f.llevaTravesano,
      despliegueCortina: f.despliegueCortina ?? PARAMETROS_SELLO.DESPLIEGUE_CORTINA_DEFAULT_MM,
      fact:              f.fact || "SI",
      formaCuna:         f.formaCuna || "NO",
      selloAbrigo:       f.selloAbrigo || "NO",
      bandaLateral:      f.bandaLateral || "",
      bandaSuperior:     f.bandaSuperior || "",
    });
    setEditingId(f.id);
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const cancelarEdicion = () => {
    setEditingId(null);
    setForm(INITIAL_FORM);
  };

  // Órdenes es la lista de producción; desde allí se pide crear o editar una
  // ficha de este producto y ProduccionPage cambia de pestaña dejando el
  // encargo aquí. Se atiende una sola vez y se avisa para no repetirlo.
  React.useEffect(() => {
    if (!encargo) return;
    if (encargo.accion === "editar" && encargo.ficha) handleEditar(encargo.ficha);
    else cancelarEdicion();
    onEncargoAtendido?.();
    // Lo que dispara esto es el encargo; handleEditar y cancelarEdicion se
    // rehacen en cada render y meterlos aquí lo dispararía en bucle.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [encargo]);

  const mp = calculo?.materiaPrima;
  const med = calculo?.medidas;
  const cantidad = Number(form.cantidad) || 1;

  return (
    <div className="space-y-5">

      {/* ── Fila superior: formulario + vista previa ── */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">

        {/* FORMULARIO */}
        <section ref={formRef} className="bg-white dark:bg-gris-800 border border-gray-200 dark:border-gris-700 border-t-4 border-t-blue-600 rounded-lg p-4 shadow-sm">
          <div className="flex items-center gap-2 font-medium text-sm mb-4">
            <span className="flex items-center justify-center h-6 w-6 rounded-md bg-blue-600/10 text-blue-700 dark:text-blue-400">
              <FaIdCard className="text-[11px]" />
            </span>
            {editingId ? "Editar ficha — Sello de Andén" : "Nueva ficha — Sello de Andén"}
          </div>
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
              <div className="col-span-2 sm:col-span-1">
                <ClienteSelector
                  value={form}
                  onChange={setCliente}
                  inputCls={inputCls}
                  labelCls={labelCls}
                />
              </div>
              <div>
                <label className={labelCls}>Cantidad</label>
                <input type="number" min={1} step={1} value={form.cantidad}
                  onChange={setNum("cantidad")} placeholder={String(DEFECTOS_NUM.cantidad)}
                  className={inputCls} />
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
              <SectionLabel icon={FaRulerCombined}>Medidas del vano (mm)</SectionLabel>
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
              <SectionLabel icon={FaLayerGroup}>Espesores (mm)</SectionLabel>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className={labelCls}>Sello principal</label>
                  <input type="number" min={1} value={form.espesorSello}
                    onChange={setNum("espesorSello")} placeholder={String(DEFECTOS_NUM.espesorSello)}
                    className={`${inputCls} font-mono`} />
                </div>
                <div>
                  <label className={labelCls}>Postes laterales</label>
                  <input type="number" min={1} value={form.espesorPoste}
                    onChange={setNum("espesorPoste")} placeholder={String(DEFECTOS_NUM.espesorPoste)}
                    className={`${inputCls} font-mono`} />
                </div>
                <div>
                  <label className={labelCls}>Travesaño</label>
                  <input type="number" min={1} value={form.espesorTravesano}
                    onChange={setNum("espesorTravesano")} placeholder={String(DEFECTOS_NUM.espesorTravesano)}
                    className={`${inputCls} font-mono`} />
                </div>
              </div>
            </div>

            {/* Opciones */}
            <div className="border-t border-gray-200 dark:border-gris-700 pt-4">
              <SectionLabel icon={FaSlidersH}>Opciones</SectionLabel>
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
                      onChange={setNum("despliegueCortina")} placeholder={String(DEFECTOS_NUM.despliegueCortina)}
                      className={`${inputCls} font-mono`} />
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

            <div className="flex justify-end gap-2 pt-1">
              {editingId && (
                <button type="button" onClick={cancelarEdicion}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 dark:bg-gris-700 dark:hover:bg-gris-600 border border-gray-300 dark:border-gris-600 text-sm font-medium transition">
                  <FaTimes className="text-xs" /> Cancelar edición
                </button>
              )}
              <button type="submit" disabled={saving || !calculo}
                className="inline-flex items-center gap-2 px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-40 active:scale-95 text-white text-sm font-medium shadow-sm transition">
                {saving && <FaSyncAlt className="animate-spin text-xs" />}
                {saving ? "Guardando…" : editingId ? "Guardar cambios" : "Guardar ficha"}
              </button>
            </div>
          </form>
        </section>

        {/* VISTA PREVIA */}
        <section className="bg-white dark:bg-gris-800 border border-gray-200 dark:border-gris-700 border-t-4 border-t-cyan-600 rounded-lg p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <span className="flex items-center justify-center h-6 w-6 rounded-md bg-cyan-600/10 text-cyan-700 dark:text-cyan-400">
              <FaLayerGroup className="text-[11px]" />
            </span>
            <span className="font-medium text-sm">Vista previa</span>
          </div>

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

    </div>
  );
}

// ─── Detalle expandido inline ─────────────────────────────────────────────────
export function FichaDetalleSello({ ficha: f, numero, onCambiarEstado, onAgregarNota, onEditarEntrega, onEditarFirma, onVerFicha, onEditar, onEliminar }) {
  const med = f.medidas    || {};
  const mp  = f.materiaPrima || {};
  const cantidad = Number(f.cantidad) || 1;

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
