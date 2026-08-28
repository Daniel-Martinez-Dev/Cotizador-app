import React from "react";
import toast from "react-hot-toast";
import {
  FaRulerCombined, FaLayerGroup, FaSlidersH, FaIdCard, FaSearch, FaSyncAlt, FaEye,
  FaChevronRight, FaInbox, FaEdit, FaTrash, FaTimes
} from "react-icons/fa";
import { calcularSello } from "../modules/produccion/sellos/calcular.js";
import { PARAMETROS_SELLO } from "../modules/produccion/sellos/parametros.js";
import {
  crearFichaSello,
  listarFichasSellos,
  actualizarFichaSello,
  eliminarFichaSello,
} from "../utils/firebaseSellos";
import FichaImpresionSello from "./FichaImpresionSello";
import { fmtMm as fmtMmBase, fmtM2, fmtN } from "../utils/fichaFormat";
import EstadoBadge from "./fichas/EstadoBadge";
import EstadoControl from "./fichas/EstadoControl";
import useEstadoFicha from "./fichas/useEstadoFicha";
import EstadoResumen from "./fichas/EstadoResumen";
import { useQuote } from "../context/QuoteContext";
import { codigoFicha as codigoDeFicha } from "../utils/codigoFicha";
import IdentificacionFicha from "./fichas/IdentificacionFicha";
import ClienteSelector from "./fichas/ClienteSelector";
import { clienteDeFicha } from "../utils/clienteVinculo";

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

export default function SelloAndenFicha() {
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

  const { cambiarEstado, agregarNota, editarEntrega, editarFirma, modales } = useEstadoFicha("sello", fichas, setFichas);

  const calculo = React.useMemo(
    () => calcularSello(form),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      form.anchoVano, form.altoVano,
      form.espesorSello, form.espesorPoste, form.espesorTravesano,
      form.materialBase, form.llevaCortina, form.llevaTravesano,
    ]
  );

  const fichasFiltradas = React.useMemo(() => {
    const term = search.trim().toLowerCase();
    return fichas
      .map((f, idx) => ({ f, numero: f.ordenProduccion ?? (fichas.length - idx), codigo: codigoDeFicha(f, "sello") }))
      .filter(({ f }) => estadoFiltro === "todos" || (f.estado || "borrador") === estadoFiltro)
      // Busca por el nombre y por el alias: en oficina se pregunta por el
      // nombre legal y en planta por la abreviación que salió impresa.
      .filter(({ f }) => !term || `${f.cliente || ""} ${f.clienteAlias || ""}`.toLowerCase().includes(term));
  }, [fichas, search, estadoFiltro]);

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

  // El selector devuelve nombre + id + NIT + ciudad juntos: la ficha no puede
  // quedar con el id de un cliente y el nombre de otro.
  const setCliente = (datos) => setForm((p) => ({ ...p, ...datos }));
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
      const datos = {
        ...form,
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
    setSelectedId(null);
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const cancelarEdicion = () => {
    setEditingId(null);
    setForm(INITIAL_FORM);
  };

  const handleEliminar = async (f) => {
    const ok = await confirm(`¿Eliminar la ficha de ${f.cliente || "este cliente"}? Esta acción no se puede deshacer.`);
    if (!ok) return;
    try {
      await eliminarFichaSello(f.id);
      setFichas((prev) => prev.filter((x) => x.id !== f.id));
      if (selectedId === f.id) setSelectedId(null);
      if (editingId === f.id) cancelarEdicion();
      toast.success("Ficha eliminada");
    } catch (err) {
      console.error(err);
      toast.error("Error eliminando ficha");
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

      {/* ── Fichas guardadas ── */}
      <section className="bg-white dark:bg-gris-800 border border-gray-200 dark:border-gris-700 rounded-lg p-4">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
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
                        <td className="py-2 font-medium pl-2">
                          <span className="inline-flex items-center gap-1.5">
                            <FaChevronRight className={`text-[9px] text-gray-400 transition-transform ${isSelected ? "rotate-90" : ""}`} />
                            {f.cliente || "—"}
                          </span>
                        </td>
                        <td className="py-2 font-mono">{f.anchoVano}×{f.altoVano}</td>
                        <td className="py-2 text-center">{f.cantidad}</td>
                        <td className="py-2 text-center">{f.materialBase || "—"}</td>
                        <td className="py-2 text-center">{f.llevaCortina ? "SÍ" : "NO"}</td>
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
                            <FichaDetalleSello
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
        <FichaImpresionSello
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
function FichaDetalleSello({ ficha: f, numero, onCambiarEstado, onAgregarNota, onEditarEntrega, onEditarFirma, onVerFicha, onEditar, onEliminar }) {
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
