import React from "react";
import toast from "react-hot-toast";
import {
  FaRulerCombined,
  FaSlidersH,
  FaIdCard,
  FaSyncAlt,
  FaLayerGroup,
  FaEdit,
  FaTrash,
  FaTimes,
  FaPlus,
  FaBoxOpen,
} from "react-icons/fa";
import { calcularPuertaRapida, calcularFechaEntrega } from "../modules/produccion/puertas-rapidas/calcular.js";
import { PARAMETROS_PUERTA_RAPIDA } from "../modules/produccion/puertas-rapidas/parametros.js";
import {
  crearFichaPuertaRapida,
  actualizarFichaPuertaRapida,
} from "../utils/firebasePuertaRapida";
import { fmtMm, fmtM2, fmtN, fmtDate } from "../utils/fichaFormat";
import EstadoControl from "./fichas/EstadoControl";
import { useQuote } from "../context/QuoteContext";
import { codigoFicha as codigoDeFicha } from "../utils/codigoFicha";
import IdentificacionFicha from "./fichas/IdentificacionFicha";
import ClienteSelector from "./fichas/ClienteSelector";
import { clienteDeFicha } from "../utils/clienteVinculo";
import { valorNumerico, conDefectosNumericos } from "../utils/campoNumero";

const OPCIONES = {
  colorLona: ["NEGRO", "BLANCO", "AZUL", "VERDE", "NARANJA", "GRIS", "OTRO"],
  ladoMotor: ["IZQUIERDO", "DERECHO"],
  siNo:      ["SI", "NO"],
};

const hoy = () => new Date().toISOString().slice(0, 10);

const INITIAL_FORM = {
  codigoFicha:           "", // solo lectura: lo asigna el sistema al guardar
  numeroOrdenCompra:     "",
  cliente:               "",
  // Vínculo con la base de clientes del cotizador (empresas/{id}).
  // Ver utils/clienteVinculo.js.
  clienteId:             null,
  clienteNit:            "",
  clienteCiudad:         "",
  clienteAlias:          "",
  usarAlias:             false,
  cantidad:              1,
  fechaOrden:            hoy(),
  anchoVano:             "",
  altoVano:              "",
  colorLona:             "AZUL",
  ladoMotor:             "IZQUIERDO",
  exclusa:               "SI",
  fct:                   "SI",
  vinilo:                "SI",
  distanciaCortavientos: PARAMETROS_PUERTA_RAPIDA.DISTANCIA_CORTAVIENTOS_DEFAULT_MM,
  adicional:             "",
};

// Lo que vale un campo numérico que se dejó en blanco. El formulario admite ""
// para que se pueda borrar y reescribir sin pelear con un 0 (ver
// utils/campoNumero.js); el cálculo y lo que se guarda usan estos defectos, que
// además son los que se ven de placeholder.
const DEFECTOS_NUM = {
  cantidad:              1,
  distanciaCortavientos: PARAMETROS_PUERTA_RAPIDA.DISTANCIA_CORTAVIENTOS_DEFAULT_MM,
};

const conDefectos = (form) => conDefectosNumericos(form, DEFECTOS_NUM);

// Accesorios cuya cantidad no es numérica sino una casilla de validación
// (lista desplegable de valores fijos, ej. capacidad del transformador/UPS).
const ACCESORIOS_CON_OPCIONES = {
  "TRANSFORMADOR / UPS": PARAMETROS_PUERTA_RAPIDA.TRANSFORMADOR_UPS_OPCIONES,
};
const conOpciones = (lista) =>
  (lista || []).map((it) =>
    ACCESORIOS_CON_OPCIONES[it.insumo] ? { ...it, opciones: ACCESORIOS_CON_OPCIONES[it.insumo] } : it
  );

const inputCls = "mt-1 w-full px-3 py-2 rounded border border-gray-300 dark:border-gris-600 bg-white dark:bg-gris-700 text-sm";
// Variante sin margen superior, para filas repetidas sin label propio (p. ej. lista de empaque).
const rowInputCls = "w-full px-3 py-2 rounded border border-gray-300 dark:border-gris-600 bg-white dark:bg-gris-700 text-sm";
const labelCls = "text-xs text-gray-600 dark:text-gray-300";

function SectionLabel({ icon: Icon, children }) {
  return (
    <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
      <Icon className="text-[11px] opacity-70" /> {children}
    </div>
  );
}

export default function PuertaRapidaFicha({ encargo, onEncargoAtendido, onGuardada }) {
  const { confirm } = useQuote();
  const [form, setForm]             = React.useState(INITIAL_FORM);
  const [loading, setLoading]       = React.useState(false);
  const [saving, setSaving]         = React.useState(false);
  const [search, setSearch]         = React.useState("");
  const [editingId, setEditingId]   = React.useState(null);
  const [empaque, setEmpaque]       = React.useState([]);
  const formRef = React.useRef(null);

  const calculo = React.useMemo(
    () => calcularPuertaRapida(conDefectos(form)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [form.anchoVano, form.altoVano, form.cantidad, form.distanciaCortavientos]
  );

  const fechaEntrega = React.useMemo(
    () => calcularFechaEntrega(form.fechaOrden, conDefectos(form).cantidad),
    [form.fechaOrden, form.cantidad]
  );

  // Mientras el usuario no toque la lista, se mantiene sincronizada con las
  // medidas: al crear una ficha las cantidades salen bien solas, sin pulsar
  // "Recalcular según medidas". (Precargarla una sola vez dejaba congeladas las
  // del ancho/alto a medio escribir.) En cuanto se edita una fila —o se abre
  // una ficha que ya trae su lista guardada— deja de sobrescribirse.
  const empaqueManual = React.useRef(false);
  const marcarEmpaqueManual = () => { empaqueManual.current = true; };

  React.useEffect(() => {
    if (!calculo || empaqueManual.current) return;
    setEmpaque(conOpciones(calculo.empaque));
  }, [calculo]);

  // Devuelve la lista al modo automático y la pone al día con las medidas.
  const handleRecalcularEmpaque = () => {
    if (!calculo) return;
    empaqueManual.current = false;
    setEmpaque(conOpciones(calculo.empaque));
  };

  const updateEmpaqueField = (idx, field, value) => {
    marcarEmpaqueManual();
    setEmpaque((prev) => prev.map((row, i) => (i === idx ? { ...row, [field]: value } : row)));
  };

  const addEmpaqueRow = () => {
    marcarEmpaqueManual();
    setEmpaque((prev) => [...prev, { insumo: "", unidad: "und", cantidad: 1 }]);
  };

  const removeEmpaqueRow = (idx) => {
    marcarEmpaqueManual();
    setEmpaque((prev) => prev.filter((_, i) => i !== idx));
  };

  const set = (field) => (e) => setForm((p) => ({ ...p, [field]: e.target.value }));
  const setNum = (field) => (e) => setForm((p) => ({ ...p, [field]: valorNumerico(e.target.value) }));

  // El selector devuelve nombre + id + NIT + ciudad juntos: la ficha no puede
  // quedar con el id de un cliente y el nombre de otro.
  const setCliente = (datos) => setForm((p) => ({ ...p, ...datos }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.anchoVano || !form.altoVano)
      return toast.error("Ancho y alto del vano son requeridos");
    if (Number(form.anchoVano) <= 0 || Number(form.altoVano) <= 0)
      return toast.error("Las medidas deben ser mayores a 0");
    if (!calculo) return toast.error("Revisa las medidas");
    setSaving(true);
    try {
      const empaqueLimpio = empaque
        .filter((it) => (it.insumo || "").trim())
        .map((it) => ({
          insumo: it.insumo.trim(),
          unidad: (it.unidad || "").trim(),
          ...(it.texto !== undefined
            ? { texto: it.texto, cantidad: null }
            : { cantidad: Number(it.cantidad) || 0 }),
        }));
      const datos = {
        ...conDefectos(form),
        anchoVano: Number(form.anchoVano),
        altoVano:  Number(form.altoVano),
        fechaEntrega,
      };
      if (editingId) {
        await actualizarFichaPuertaRapida(editingId, {
          ...datos,
          medidas: calculo.medidas,
          empaque: empaqueLimpio,
        });
        toast.success("Ficha actualizada");
        setEditingId(null);
      } else {
        await crearFichaPuertaRapida(datos, { ...calculo, empaque: empaqueLimpio });
        toast.success("Ficha guardada");
      }
      setForm(INITIAL_FORM);
      onGuardada?.();
      setEmpaque([]);
      empaqueManual.current = false;
    } catch (err) {
      console.error(err);
      toast.error(editingId ? "Error actualizando ficha" : "Error guardando ficha");
    } finally {
      setSaving(false);
    }
  };

  const handleEditar = (f) => {
    setForm({
      codigoFicha:           codigoDeFicha(f, "puertarapida"),
      numeroOrdenCompra:     f.numeroOrdenCompra || "",
      ...clienteDeFicha(f),
      cantidad:              f.cantidad ?? 1,
      fechaOrden:            f.fechaOrden || hoy(),
      anchoVano:             f.anchoVano ?? "",
      altoVano:              f.altoVano ?? "",
      colorLona:             f.colorLona || "AZUL",
      ladoMotor:             f.ladoMotor || "IZQUIERDO",
      exclusa:               f.exclusa || "SI",
      fct:                   f.fct || "SI",
      vinilo:                f.vinilo || "SI",
      distanciaCortavientos: f.distanciaCortavientos ?? PARAMETROS_PUERTA_RAPIDA.DISTANCIA_CORTAVIENTOS_DEFAULT_MM,
      adicional:             f.adicional || "",
    });
    // La lista guardada manda; si la ficha no trae ninguna se vuelve a calcular.
    empaqueManual.current = Array.isArray(f.empaque) && f.empaque.length > 0;
    setEmpaque(conOpciones(Array.isArray(f.empaque) ? f.empaque : []));
    setEditingId(f.id);
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const cancelarEdicion = () => {
    setEditingId(null);
    setForm(INITIAL_FORM);
    setEmpaque([]);
    empaqueManual.current = false;
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

  const med = calculo?.medidas;

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
            {editingId ? "Editar ficha — Puerta Rápida" : "Nueva ficha — Puerta Rápida"}
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
                <label className={labelCls}>Fecha entrega (estimada)</label>
                <input type="date" value={fechaEntrega} disabled
                  className={`${inputCls} disabled:opacity-60`} />
              </div>
            </div>

            {/* Medidas del vano */}
            <div className="border-t border-gray-200 dark:border-gris-700 pt-4">
              <SectionLabel icon={FaRulerCombined}>Medidas del vano (mm)</SectionLabel>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Ancho vano</label>
                  <input type="number" min={100} step={1} value={form.anchoVano}
                    onChange={set("anchoVano")}
                    className={`${inputCls} font-mono`} placeholder="ej: 3500" />
                </div>
                <div>
                  <label className={labelCls}>Alto vano</label>
                  <input type="number" min={100} step={1} value={form.altoVano}
                    onChange={set("altoVano")}
                    className={`${inputCls} font-mono`} placeholder="ej: 3050" />
                </div>
              </div>
            </div>

            {/* Opciones */}
            <div className="border-t border-gray-200 dark:border-gris-700 pt-4">
              <SectionLabel icon={FaSlidersH}>Opciones</SectionLabel>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Color lona</label>
                  <select value={form.colorLona} onChange={set("colorLona")} className={inputCls}>
                    {OPCIONES.colorLona.map((o) => <option key={o} value={o}>{o}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Lado de motor</label>
                  <select value={form.ladoMotor} onChange={set("ladoMotor")} className={inputCls}>
                    {OPCIONES.ladoMotor.map((o) => <option key={o} value={o}>{o}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Exclusa</label>
                  <select value={form.exclusa} onChange={set("exclusa")} className={inputCls}>
                    {OPCIONES.siNo.map((o) => <option key={o} value={o}>{o}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelCls}>FCT</label>
                  <select value={form.fct} onChange={set("fct")} className={inputCls}>
                    {OPCIONES.siNo.map((o) => <option key={o} value={o}>{o}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Vinilo</label>
                  <select value={form.vinilo} onChange={set("vinilo")} className={inputCls}>
                    {OPCIONES.siNo.map((o) => <option key={o} value={o}>{o}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Distancia cortavientos (mm)</label>
                  <input type="number" min={1} step={1} value={form.distanciaCortavientos}
                    onChange={setNum("distanciaCortavientos")}
                    placeholder={String(DEFECTOS_NUM.distanciaCortavientos)}
                    className={`${inputCls} font-mono`} />
                </div>
                <div className="col-span-2">
                  <label className={labelCls}>Adicional / Notas</label>
                  <input value={form.adicional} onChange={set("adicional")} className={inputCls} />
                </div>
              </div>
            </div>

            {/* Lista de empaque / accesorios */}
            <div className="border-t border-gray-200 dark:border-gris-700 pt-4">
              <div className="flex items-center justify-between mb-2">
                <SectionLabel icon={FaBoxOpen}>Lista de empaque / accesorios</SectionLabel>
                <button type="button" onClick={handleRecalcularEmpaque} disabled={!calculo}
                  className="inline-flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 hover:underline disabled:opacity-40 disabled:pointer-events-none">
                  <FaSyncAlt className="text-[10px]" /> Recalcular según medidas
                </button>
              </div>

              {empaque.length === 0 ? (
                <div className="text-xs text-gray-400 dark:text-gray-500 py-2">
                  Ingresa las medidas del vano para sugerir la lista, o añade accesorios manualmente.
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="grid grid-cols-12 gap-2 text-[10px] text-gray-400 uppercase tracking-wide px-1">
                    <span className="col-span-6">Accesorio</span>
                    <span className="col-span-3">Cantidad</span>
                    <span className="col-span-2">Unidad</span>
                  </div>
                  {empaque.map((item, idx) => (
                    <div key={idx} className="grid grid-cols-12 gap-2 items-center">
                      <input value={item.insumo} onChange={(e) => updateEmpaqueField(idx, "insumo", e.target.value)}
                        className={`${rowInputCls} col-span-6`} placeholder="Nombre del accesorio" />
                      {item.opciones ? (
                        <select value={item.texto ?? ""} onChange={(e) => updateEmpaqueField(idx, "texto", e.target.value)}
                          className={`${rowInputCls} col-span-3`}>
                          {item.opciones.map((o) => <option key={o} value={o}>{o}</option>)}
                        </select>
                      ) : item.texto !== undefined ? (
                        <input value={item.texto ?? ""} onChange={(e) => updateEmpaqueField(idx, "texto", e.target.value)}
                          className={`${rowInputCls} col-span-3`} />
                      ) : (
                        <input type="number" min={0} step="any" value={item.cantidad ?? ""}
                          onChange={(e) => updateEmpaqueField(idx, "cantidad", e.target.value)}
                          className={`${rowInputCls} col-span-3 font-mono`} />
                      )}
                      <input value={item.unidad ?? ""} onChange={(e) => updateEmpaqueField(idx, "unidad", e.target.value)}
                        className={`${rowInputCls} col-span-2`} placeholder="und" />
                      <button type="button" onClick={() => removeEmpaqueRow(idx)}
                        className="col-span-1 flex justify-center text-gray-400 hover:text-red-500 p-1" title="Quitar accesorio">
                        <FaTimes className="text-xs" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <button type="button" onClick={addEmpaqueRow}
                className="mt-2 inline-flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 hover:underline">
                <FaPlus className="text-[9px]" /> Añadir accesorio
              </button>
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
            {calculo && (
              <span className={`text-xs px-2 py-0.5 rounded font-medium ${
                med.base === "GRANDE"
                  ? "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300"
                  : "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300"
              }`}>
                BASE {med.base} · MOTOR {med.motorKw}
              </span>
            )}
          </div>

          {!calculo ? (
            <div className="flex items-center justify-center h-48 text-sm text-gray-400 dark:text-gray-500">
              Ingresa ancho y alto del vano para ver los cálculos
            </div>
          ) : (
            <div className="space-y-5 text-sm">

              {/* Medidas derivadas */}
              <div>
                <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">
                  Medidas derivadas (mm)
                </div>
                <table className="w-full text-xs">
                  <tbody>
                    {[
                      ["Vinilo",                                        med.vinilo],
                      ["Largo cortina",                                 med.largoCortina],
                      ["Cubre rollo",                                   med.cubreRollo],
                      ["Altura parales",                                med.alturaParales],
                      ["Eje, zócalo, caucho, cortavientos y lona",      med.ejeZocalo],
                      ["Tubo estructura",                               med.tuboEstructura],
                      ["Ancho total puerta",                            med.anchoTotalPuerta],
                      ["Alto total puerta",                             med.altoTotalPuerta],
                      ["Alto cubrerrollo",                              med.altoCubrerrollo],
                      ["Añadido cubre rollo",                           med.anadidoCubreRollo],
                      ["Añadido por paral",                             med.anadidoPorParal],
                    ].map(([name, val]) => (
                      <tr key={name} className="border-b border-gray-100 dark:border-gris-700/50">
                        <td className="py-1.5 font-medium">{name}</td>
                        <td className="text-right py-1.5 font-mono">{fmtMm(val)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Cortavientos + M2 cortina */}
              <div className="grid grid-cols-3 gap-2">
                {[
                  ["M2 cortina",     fmtM2(med.m2Cortina),               "m²"],
                  ["Distancia cortav.", fmtMm(med.distanciaCortavientos), "mm"],
                  ["Cant. cortav.",  fmtN(med.cantidadCortavientos),     ""],
                ].map(([label, val, unit]) => (
                  <div key={label} className="bg-gray-50 dark:bg-gris-700 rounded p-2 text-center">
                    <div className="text-base font-bold font-mono">{val}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                      {label}{unit ? ` (${unit})` : ""}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>
      </div>

    </div>
  );
}

// ─── Detalle expandido inline ─────────────────────────────────────────────────
export function FichaDetalle({ ficha: f, numero, onCambiarEstado, onAgregarNota, onEditarEntrega, onEditarFirma, onVerFicha, onEditar, onEliminar }) {
  const med = f.medidas || {};
  const empaque = f.empaque || [];

  const medidas = [
    { label: "Vinilo",           val: med.vinilo },
    { label: "Largo cortina",    val: med.largoCortina },
    { label: "Cubre rollo",      val: med.cubreRollo },
    { label: "Altura parales",   val: med.alturaParales },
    { label: "Ancho total",      val: med.anchoTotalPuerta },
    { label: "Alto total",       val: med.altoTotalPuerta },
  ];

  const opciones = [
    ["Color lona",  f.colorLona || "—", false],
    ["Lado motor",  f.ladoMotor || "—", false],
    ["Exclusa",     f.exclusa   || "—", f.exclusa === "SI"],
    ["FCT",         f.fct       || "—", f.fct === "SI"],
    ["Vinilo",      f.vinilo    || "—", f.vinilo === "SI"],
    ["Base / Eje motor", `${med.base || "—"} / ${med.ejeMotor || "—"}`, false],
    ["Motor",       med.motorKw || "—", false],
  ];

  return (
    <div className="bg-gray-50 dark:bg-gris-700/60 rounded-xl p-4 space-y-4 text-xs border border-gray-200 dark:border-gris-600">

      <div className="flex items-center justify-between">
        <div>
          <span className="font-semibold text-sm text-gray-800 dark:text-gray-100">{f.cliente || "Sin cliente"}</span>
          <span className="ml-2 text-gray-400 font-mono">{fmtMm(f.anchoVano)}×{fmtMm(f.altoVano)} mm · ×{f.cantidad}</span>
          <div className="text-[11px] text-gray-400 mt-0.5">
            Entrega estimada: {fmtDate(f.fechaEntrega)}
          </div>
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

      {/* Medidas de fabricación */}
      <div>
        <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">Medidas de fabricación (mm)</div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {medidas.map(({ label, val }) => (
            <div key={label} className="bg-white dark:bg-gris-800 border border-gray-100 dark:border-gris-700 rounded-lg p-2 text-center">
              <div className="text-[9px] text-gray-400 uppercase">{label}</div>
              <div className="font-mono font-bold text-sm text-blue-700 dark:text-blue-300">{fmtMm(val)}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Opciones */}
      <div>
        <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">Opciones</div>
        <div className="flex flex-wrap gap-1.5">
          {opciones.map(([label, value, active]) => (
            <span key={label} className={`inline-flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-full border font-medium
              ${active
                ? "bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-900/30 dark:border-blue-700 dark:text-blue-300"
                : "bg-white border-gray-200 text-gray-600 dark:bg-gris-800 dark:border-gris-600 dark:text-gray-400"
              }`}>
              <span className="text-[9px] font-normal opacity-70">{label}:</span> {value}
            </span>
          ))}
        </div>
      </div>

      {/* Lista de empaque */}
      {empaque.length > 0 && (
        <div>
          <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">Lista de empaque por puerta</div>
          <div className="grid grid-cols-3 sm:grid-cols-5 gap-1.5">
            {empaque.map((c) => (
              <div key={c.insumo} className="bg-white dark:bg-gris-800 border border-gray-100 dark:border-gris-700 rounded-lg p-2">
                <div className="text-[9px] text-gray-400 leading-tight mb-1">{c.insumo}</div>
                <div className="font-mono font-bold text-gray-700 dark:text-gray-200 text-sm">
                  {c.texto ?? fmtN(c.cantidad)}
                </div>
                <div className="text-[9px] text-gray-400">{c.unidad}</div>
              </div>
            ))}
          </div>
        </div>
      )}

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
