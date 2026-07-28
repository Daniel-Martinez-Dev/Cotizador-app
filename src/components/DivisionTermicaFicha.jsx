import React from "react";
import toast from "react-hot-toast";
import {
  FaTruck, FaSlidersH, FaIdCard, FaSearch, FaSyncAlt, FaEye,
  FaChevronRight, FaLayerGroup, FaPauseCircle, FaIndustry, FaCheckCircle, FaInbox,
  FaEdit, FaTrash, FaTimes,
} from "react-icons/fa";
import { calcularDesdeInput } from "../utils/divisionTermica";
import {
  crearFichaDivision,
  listarFichasDivision,
  actualizarFichaDivision,
  eliminarFichaDivision,
} from "../utils/firebaseDivision";
import FichaImpresionDivision from "./FichaImpresionDivision";
import { fmtMm, fmtM2, fmtN, fmtCm } from "../utils/fichaFormat";
import { ESTADO_LABEL } from "./fichas/estadoFicha";
import EstadoBadge from "./fichas/EstadoBadge";
import EstadoActions from "./fichas/EstadoActions";
import { useQuote } from "../context/QuoteContext";

const OPCIONES = {
  placa:     ["SI", "NO"],
  logo:      ["COLD CHAIN", "CLIENTE", "NO"],
  agujero:   ["SIN AGUJERO", "1 AGUJERO", "2 AGUJEROS", "4 AGUJEROS", "AGUJERO DIF MEDIDA"],
  platinas:  ["SI", "NO"],
  factura:   ["SI", "NO"],
  colorLona: ["NEGRO", "AZUL", "VERDE", "NARANJA", "GRIS", "OTRO"],
};

const INITIAL_FORM = {
  fechaOrden:        new Date().toISOString().slice(0, 10),
  fechaEntrega:      "",
  numeroOrdenCompra: "",
  numeroFicha:       "",
  cliente:           "",
  cantidad:          1,
  anchoVehiculo:     "",
  altoVehiculo:      "",
  placa:             "SI",
  numeroPlaca:       "",
  logo:              "COLD CHAIN",
  agujero:           "1 AGUJERO",
  platinas:          "NO",
  alturaPlatinas:    "",
  factura:           "SI",
  colorLona:         "NEGRO",
  adicional:         "",
};

const inputCls = "mt-1 w-full px-3 py-2 rounded border border-gray-300 dark:border-gris-600 bg-white dark:bg-gris-700 text-sm";
const labelCls = "text-xs text-gray-600 dark:text-gray-300";

function SectionLabel({ icon: Icon, children }) {
  return (
    <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
      <Icon className="text-[11px] opacity-70" /> {children}
    </div>
  );
}

export default function DivisionTermicaFicha() {
  const { confirm } = useQuote();
  const [form, setForm]             = React.useState(INITIAL_FORM);
  const [fichas, setFichas]         = React.useState([]);
  const [loading, setLoading]       = React.useState(false);
  const [saving, setSaving]         = React.useState(false);
  const [selectedId, setSelectedId] = React.useState(null);
  const [printFicha, setPrintFicha] = React.useState(null); // { ficha, numero }
  const [search, setSearch] = React.useState("");
  const [estadoFiltro, setEstadoFiltro] = React.useState("todos");
  const [editingId, setEditingId]   = React.useState(null);
  const formRef = React.useRef(null);

  const calculo = React.useMemo(
    () => calcularDesdeInput(form),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [form.anchoVehiculo, form.altoVehiculo, form.platinas]
  );

  const selectedFicha = React.useMemo(
    () => fichas.find((f) => f.id === selectedId) || null,
    [fichas, selectedId]
  );

  const stats = React.useMemo(() => ({
    total: fichas.length,
    borrador: fichas.filter((f) => (f.estado || "borrador") === "borrador").length,
    en_produccion: fichas.filter((f) => f.estado === "en_produccion").length,
    terminado: fichas.filter((f) => f.estado === "terminado").length,
  }), [fichas]);

  const fichasFiltradas = React.useMemo(() => {
    const term = search.trim().toLowerCase();
    return fichas
      .map((f, idx) => ({ f, numero: f.ordenProduccion ?? (fichas.length - idx) }))
      .filter(({ f }) => estadoFiltro === "todos" || (f.estado || "borrador") === estadoFiltro)
      .filter(({ f }) => !term || (f.cliente || "").toLowerCase().includes(term));
  }, [fichas, search, estadoFiltro]);

  const loadFichas = React.useCallback(async () => {
    setLoading(true);
    try {
      setFichas(await listarFichasDivision());
    } catch (e) {
      console.error(e);
      toast.error("Error cargando fichas");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => { loadFichas(); }, [loadFichas]);

  const set = (field) => (e) => setForm((p) => ({ ...p, [field]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.anchoVehiculo || !form.altoVehiculo)
      return toast.error("Ancho y alto son requeridos");
    if (!calculo) return toast.error("Revisa las medidas (deben ser > 0)");
    setSaving(true);
    try {
      const datos = { ...form, anchoVehiculo: Number(form.anchoVehiculo), altoVehiculo: Number(form.altoVehiculo) };
      if (editingId) {
        await actualizarFichaDivision(editingId, {
          ...datos,
          medidas:    calculo.medidas,
          tipoIcopor: calculo.tipoIcopor,
          consumo:    calculo.consumo,
        });
        toast.success("Ficha actualizada");
        setEditingId(null);
      } else {
        await crearFichaDivision(datos, calculo);
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

  const cambiarEstado = async (id, estado) => {
    try {
      await actualizarFichaDivision(id, { estado });
      toast.success(`Estado → ${ESTADO_LABEL[estado] || estado}`);
      setFichas((prev) => prev.map((f) => (f.id === id ? { ...f, estado } : f)));
    } catch (err) {
      console.error(err);
      toast.error("Error actualizando estado");
    }
  };

  const handleEditar = (f) => {
    setForm({
      fechaOrden:        f.fechaOrden || new Date().toISOString().slice(0, 10),
      fechaEntrega:      f.fechaEntrega || "",
      numeroOrdenCompra: f.numeroOrdenCompra || "",
      numeroFicha:       f.numeroFicha || "",
      cliente:           f.cliente || "",
      cantidad:          f.cantidad ?? 1,
      anchoVehiculo:     f.anchoVehiculo ?? "",
      altoVehiculo:      f.altoVehiculo ?? "",
      placa:             f.placa || "SI",
      numeroPlaca:       f.numeroPlaca || "",
      logo:              f.logo || "COLD CHAIN",
      agujero:           f.agujero || "1 AGUJERO",
      platinas:          f.platinas || "NO",
      alturaPlatinas:    f.alturaPlatinas ?? "",
      factura:           f.factura || "SI",
      colorLona:         f.colorLona || "NEGRO",
      adicional:         f.adicional || "",
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
      await eliminarFichaDivision(f.id);
      setFichas((prev) => prev.filter((x) => x.id !== f.id));
      if (selectedId === f.id) setSelectedId(null);
      if (editingId === f.id) cancelarEdicion();
      toast.success("Ficha eliminada");
    } catch (err) {
      console.error(err);
      toast.error("Error eliminando ficha");
    }
  };

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
            {editingId ? "Editar ficha — División Térmica" : "Nueva ficha — División Térmica"}
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">

            {/* Identificación */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>N.° orden de compra</label>
                <input value={form.numeroOrdenCompra} onChange={set("numeroOrdenCompra")}
                  className={inputCls} placeholder="Ref. del cliente" />
              </div>
              <div>
                <label className={labelCls}>N.° de ficha</label>
                <input value={form.numeroFicha} onChange={set("numeroFicha")}
                  className={inputCls} placeholder="Ficha física (opcional)" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2 sm:col-span-1">
                <label className={labelCls}>Cliente</label>
                <input value={form.cliente} onChange={set("cliente")}
                  className={inputCls} placeholder="Nombre del cliente" />
              </div>
              <div>
                <label className={labelCls}>Cantidad</label>
                <input type="number" min={1} value={form.cantidad}
                  onChange={(e) => setForm((p) => ({ ...p, cantidad: Number(e.target.value) }))}
                  className={inputCls} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Fecha orden</label>
                <input type="date" value={form.fechaOrden} onChange={set("fechaOrden")} className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Fecha entrega</label>
                <input type="date" value={form.fechaEntrega} onChange={set("fechaEntrega")} className={inputCls} />
              </div>
            </div>

            {/* Medidas del vehículo */}
            <div className="border-t border-gray-200 dark:border-gris-700 pt-4">
              <SectionLabel icon={FaTruck}>Medidas del vehículo (mm)</SectionLabel>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Ancho interior</label>
                  <input type="number" min={1} value={form.anchoVehiculo}
                    onChange={set("anchoVehiculo")}
                    className={`${inputCls} font-mono`} placeholder="ej: 2160" />
                </div>
                <div>
                  <label className={labelCls}>Alto interior</label>
                  <input type="number" min={1} value={form.altoVehiculo}
                    onChange={set("altoVehiculo")}
                    className={`${inputCls} font-mono`} placeholder="ej: 2640" />
                </div>
              </div>
            </div>

            {/* Opciones */}
            <div className="border-t border-gray-200 dark:border-gris-700 pt-4">
              <SectionLabel icon={FaSlidersH}>Opciones</SectionLabel>
              <div className="grid grid-cols-2 gap-3">

                {/* Placa + número de placa */}
                <div>
                  <label className={labelCls}>Placa</label>
                  <select value={form.placa} onChange={set("placa")} className={inputCls}>
                    {OPCIONES.placa.map((o) => <option key={o} value={o}>{o}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Número de placa</label>
                  <input value={form.numeroPlaca} onChange={set("numeroPlaca")}
                    disabled={form.placa !== "SI"}
                    className={`${inputCls} disabled:opacity-40`} placeholder="ej: ABC123" />
                </div>

                {/* Logo + color de lona */}
                <div>
                  <label className={labelCls}>Logo</label>
                  <select value={form.logo} onChange={set("logo")} className={inputCls}>
                    {OPCIONES.logo.map((o) => <option key={o} value={o}>{o}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Color lona</label>
                  <select value={form.colorLona} onChange={set("colorLona")} className={inputCls}>
                    {OPCIONES.colorLona.map((o) => <option key={o} value={o}>{o}</option>)}
                  </select>
                </div>

                {/* Agujero */}
                <div className="col-span-2">
                  <label className={labelCls}>Agujero</label>
                  <select value={form.agujero} onChange={set("agujero")} className={inputCls}>
                    {OPCIONES.agujero.map((o) => <option key={o} value={o}>{o}</option>)}
                  </select>
                </div>

                {/* Platinas + altura */}
                <div>
                  <label className={labelCls}>Platinas</label>
                  <select value={form.platinas} onChange={set("platinas")} className={inputCls}>
                    {OPCIONES.platinas.map((o) => <option key={o} value={o}>{o}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Altura platinas (mm)</label>
                  <input type="number" min={0} value={form.alturaPlatinas}
                    onChange={set("alturaPlatinas")}
                    disabled={form.platinas !== "SI"}
                    className={`${inputCls} font-mono disabled:opacity-40`} placeholder="ej: 450" />
                </div>

                {/* Factura (al final) */}
                <div className="col-span-2">
                  <label className={labelCls}>Factura</label>
                  <select value={form.factura} onChange={set("factura")} className={inputCls}>
                    {OPCIONES.factura.map((o) => <option key={o} value={o}>{o}</option>)}
                  </select>
                </div>

                <div className="col-span-2">
                  <label className={labelCls}>Adicional / Notas</label>
                  <input value={form.adicional} onChange={set("adicional")} className={inputCls} />
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
            {calculo && (
              <span className={`text-xs px-2 py-0.5 rounded font-medium ${
                calculo.tipoIcopor === "GRANDE"
                  ? "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300"
                  : "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300"
              }`}>
                ICOPOR {calculo.tipoIcopor}
              </span>
            )}
          </div>

          {!calculo ? (
            <div className="flex items-center justify-center h-48 text-sm text-gray-400 dark:text-gray-500">
              Ingresa ancho y alto del vehículo para ver los cálculos
            </div>
          ) : (
            <div className="space-y-5 text-sm">

              {/* Medidas derivadas */}
              <div>
                <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">
                  Medidas derivadas (mm)
                </div>
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-gris-700 text-gray-500">
                      <th className="text-left py-1.5">Componente</th>
                      <th className="text-right py-1.5">Ancho</th>
                      <th className="text-right py-1.5">Alto</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      ["Panel",         calculo.medidas.panel],
                      ["Funda",         calculo.medidas.funda],
                      ["Icopor",        calculo.medidas.icopor],
                      ["Policarbonato", calculo.medidas.policarbonato],
                    ].map(([name, m]) => (
                      <tr key={name} className="border-b border-gray-100 dark:border-gris-700/50">
                        <td className="py-1.5 font-medium">{name}</td>
                        <td className="text-right py-1.5 font-mono">{fmtMm(m.ancho)}</td>
                        <td className="text-right py-1.5 font-mono">{fmtMm(m.alto)}</td>
                      </tr>
                    ))}
                    <tr className="border-b border-gray-100 dark:border-gris-700/50">
                      <td className="py-1.5 font-medium">Piso</td>
                      <td className="text-right py-1.5 font-mono" colSpan={2}>
                        {fmtMm(calculo.medidas.medidaPiso)} largo
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Distribución de lona */}
              <div>
                <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
                  Distribución de lona (rollo {calculo.medidas.lona.anchoRollo} mm)
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    ["Tiras",      fmtN(calculo.medidas.lona.tiras),           ""],
                    ["Largo tira", fmtMm(calculo.medidas.lona.largoTira),      "mm"],
                    ["Sobrante",   fmtMm(calculo.medidas.lona.sobranteAncho),  "mm"],
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

              {/* Consumo de materia prima */}
              <div>
                <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">
                  Consumo de materia prima
                </div>
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-gris-700 text-gray-500">
                      <th className="text-left py-1.5">Insumo</th>
                      <th className="text-right py-1.5">C/U</th>
                      {Number(form.cantidad) > 1 && (
                        <th className="text-right py-1.5">×{form.cantidad}</th>
                      )}
                      <th className="text-right py-1.5">Unidad</th>
                    </tr>
                  </thead>
                  <tbody>
                    {calculo.consumo.map((c) => {
                      const isM2 = c.unidad === "m²";
                      const valCU    = isM2 ? fmtM2(c.cantidad) : fmtN(c.cantidad);
                      const valTotal = isM2
                        ? fmtM2(c.cantidad * Number(form.cantidad))
                        : fmtN(c.cantidad * Number(form.cantidad));
                      return (
                        <tr key={c.insumo} className="border-b border-gray-100 dark:border-gris-700/50">
                          <td className="py-1.5 font-medium">{c.insumo.replace("_", " ")}</td>
                          <td className="text-right py-1.5 font-mono">{valCU}</td>
                          {Number(form.cantidad) > 1 && (
                            <td className="text-right py-1.5 font-mono">{valTotal}</td>
                          )}
                          <td className="text-right py-1.5 text-gray-500">
                            {c.unidad}
                            {c.largoMm ? ` (${fmtMm(c.largoMm)} mm)` : ""}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="text-xs text-gray-400 dark:text-gray-500">
                Distancia ventana: <span className="font-mono font-medium text-gray-600 dark:text-gray-300">
                  {fmtCm(calculo.medidas.distanciaVentana)} cm
                </span>
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

        {/* Resumen de estados */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
          {[
            { key: "todos",         label: "Total",         value: stats.total,         icon: FaLayerGroup,  tone: "text-gray-600 dark:text-gray-300",  ring: "border-gray-200 dark:border-gris-600" },
            { key: "borrador",      label: "Borrador",      value: stats.borrador,      icon: FaPauseCircle, tone: "text-gray-500 dark:text-gray-300",  ring: "border-gray-200 dark:border-gris-600" },
            { key: "en_produccion", label: "En producción", value: stats.en_produccion, icon: FaIndustry,    tone: "text-blue-700 dark:text-blue-300",  ring: "border-blue-200 dark:border-blue-800" },
            { key: "terminado",     label: "Terminadas",    value: stats.terminado,     icon: FaCheckCircle, tone: "text-green-700 dark:text-green-300", ring: "border-green-200 dark:border-green-800" },
          ].map(({ key, label, value, icon: Icon, tone, ring }) => (
            <button
              key={key}
              type="button"
              onClick={() => setEstadoFiltro((prev) => (prev === key ? "todos" : key))}
              className={`text-left rounded-lg border px-3 py-2 transition-colors ${ring} ${
                estadoFiltro === key ? "bg-gray-50 dark:bg-gris-700 ring-2 ring-offset-1 ring-blue-500 dark:ring-offset-gris-800" : "bg-white dark:bg-gris-800 hover:bg-gray-50 dark:hover:bg-gris-700/60"
              }`}
            >
              <div className={`flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide ${tone}`}>
                <Icon className="text-[10px]" /> {label}
              </div>
              <div className={`text-xl font-bold font-mono mt-0.5 ${tone}`}>{value}</div>
            </button>
          ))}
        </div>

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
                  <th className="text-right py-2 font-medium w-10">#</th>
                  <th className="text-left py-2 font-medium pl-2">Cliente</th>
                  <th className="text-left py-2 font-medium">Medidas (mm)</th>
                  <th className="text-center py-2 font-medium">Cant.</th>
                  <th className="text-center py-2 font-medium">Icopor</th>
                  <th className="text-center py-2 font-medium">Estado</th>
                  <th className="text-left py-2 font-medium">Creada</th>
                  <th className="py-2"></th>
                </tr>
              </thead>
              <tbody>
                {fichasFiltradas.map(({ f, numero }) => {
                  const isSelected = selectedId === f.id;
                  return (
                    <React.Fragment key={f.id}>
                      <tr
                        onClick={() => setSelectedId(isSelected ? null : f.id)}
                        className={`border-b border-gray-100 dark:border-gris-700/50 cursor-pointer transition-colors ${
                          isSelected ? "bg-blue-50/60 dark:bg-blue-900/20" : "hover:bg-gray-50 dark:hover:bg-gris-700/40"
                        }`}
                      >
                        <td className="py-2 text-right font-mono text-gray-400">{numero}</td>
                        <td className="py-2 font-medium pl-2">
                          <span className="inline-flex items-center gap-1.5">
                            <FaChevronRight className={`text-[9px] text-gray-400 transition-transform ${isSelected ? "rotate-90" : ""}`} />
                            {f.cliente || "—"}
                          </span>
                        </td>
                        <td className="py-2 font-mono">{f.anchoVehiculo}×{f.altoVehiculo}</td>
                        <td className="py-2 text-center">{f.cantidad}</td>
                        <td className="py-2 text-center">
                          <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${
                            f.tipoIcopor === "GRANDE"
                              ? "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300"
                              : "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300"
                          }`}>
                            {f.tipoIcopor}
                          </span>
                        </td>
                        <td className="py-2 text-center">
                          <EstadoBadge estado={f.estado} />
                        </td>
                        <td className="py-2 text-gray-500">
                          {f.createdAt?.toDate
                            ? f.createdAt.toDate().toLocaleDateString("es-CO")
                            : "—"}
                        </td>
                        <td className="py-2 pl-2">
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setPrintFicha({ ficha: f, numero });
                              }}
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

                      {/* Detalle expandido */}
                      {isSelected && (
                        <tr className="border-b border-gray-200 dark:border-gris-700">
                          <td colSpan={8} className="py-3 px-2">
                            <FichaDetalle
                              ficha={f}
                              numero={numero}
                              onCambiarEstado={cambiarEstado}
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

      {/* ── Modal impresión ── */}
      {printFicha && (
        <FichaImpresionDivision
          ficha={printFicha.ficha}
          numero={printFicha.numero}
          onClose={() => setPrintFicha(null)}
        />
      )}
    </div>
  );
}

// ─── Detalle expandido inline ─────────────────────────────────────────────────
function FichaDetalle({ ficha: f, numero, onCambiarEstado, onVerFicha, onEditar, onEliminar }) {
  const med = f.medidas || {};

  const medidas = [
    { label: "Panel",     ancho: med.panel?.ancho,         alto: med.panel?.alto,         border: "border-blue-700",  text: "text-blue-700"  },
    { label: "Icopor",    ancho: med.icopor?.ancho,        alto: med.icopor?.alto,        border: "border-blue-500",  text: "text-blue-500"  },
    { label: "Funda",     ancho: med.funda?.ancho,         alto: med.funda?.alto,         border: "border-cyan-600",  text: "text-cyan-600"  },
    { label: "Policarb.", ancho: med.policarbonato?.ancho, alto: med.policarbonato?.alto, border: "border-teal-600",  text: "text-teal-600"  },
  ];

  const opciones = [
    ["Placa",      f.placa === "SI" ? `SI · ${f.numeroPlaca || "—"}` : (f.placa || "—"), f.placa === "SI"],
    ["Logo",       f.logo      || "—", f.logo !== "NO" && !!f.logo],
    ["Platinas",   f.platinas === "SI" ? `SI · ${f.alturaPlatinas ? fmtMm(f.alturaPlatinas) + " mm" : "—"}` : (f.platinas || "—"), f.platinas === "SI"],
    ["Factura",    f.factura   || "—", f.factura    === "SI"],
    ["Color lona", f.colorLona || "—", false],
    ["Agujero",    f.agujero   || "—", false],
  ];

  const consumoVisible = (f.consumo || []).filter((c) => c.cantidad > 0);

  return (
    <div className="bg-gray-50 dark:bg-gris-700/60 rounded-xl p-4 space-y-4 text-xs border border-gray-200 dark:border-gris-600">

      {/* Cabecera del detalle */}
      <div className="flex items-center justify-between">
        <div>
          <span className="font-semibold text-sm text-gray-800 dark:text-gray-100">{f.cliente || "Sin cliente"}</span>
          <span className="ml-2 text-gray-400 font-mono">{f.anchoVehiculo}×{f.altoVehiculo} mm · ×{f.cantidad}</span>
          <div className="text-[11px] text-gray-400 mt-0.5">
            Orden producción #{f.ordenProduccion ?? numero}
            {f.numeroOrdenCompra && <> · OC {f.numeroOrdenCompra}</>}
            {f.numeroFicha && <> · Ficha {f.numeroFicha}</>}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={onVerFicha}
            className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium flex items-center gap-1.5">
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
        <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">Medidas de corte</div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {medidas.map(({ label, ancho, alto, border, text }) => (
            <div key={label} className={`bg-white dark:bg-gris-800 rounded-lg border-2 ${border} overflow-hidden`}>
              <div className={`text-center text-[10px] font-bold uppercase py-1 px-2 ${text}`}
                style={{ background: "rgba(0,0,0,0.05)" }}>
                {label}
              </div>
              <div className="grid grid-cols-2 divide-x divide-gray-100 dark:divide-gris-700">
                {[["Ancho", ancho], ["Alto", alto]].map(([dim, val]) => (
                  <div key={dim} className="p-2 text-center">
                    <div className="text-[9px] text-gray-400 uppercase">{dim}</div>
                    <div className={`font-mono font-bold text-sm leading-tight ${text}`}>
                      {val != null ? Math.round(val) : "—"}
                    </div>
                    <div className="text-[9px] text-gray-400">mm</div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Piso, lona y ventana */}
      <div className="grid grid-cols-3 gap-2">
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-2.5">
          <div className="text-[9px] text-green-700 dark:text-green-400 font-bold uppercase tracking-wide">Piso</div>
          <div className="font-mono font-bold text-green-800 dark:text-green-300 text-base leading-tight mt-0.5">
            {med.medidaPiso != null ? Math.round(med.medidaPiso) : "—"} <span className="text-xs font-normal">mm</span>
          </div>
        </div>
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-2.5">
          <div className="text-[9px] text-blue-700 dark:text-blue-400 font-bold uppercase tracking-wide">
            Lona · {med.lona?.tiras ?? "—"} tiras
          </div>
          <div className="font-mono font-bold text-blue-800 dark:text-blue-300 text-base leading-tight mt-0.5">
            {med.lona?.largoTira != null ? Math.round(med.lona.largoTira) : "—"} <span className="text-xs font-normal">mm</span>
          </div>
          <div className="text-[9px] text-blue-500 mt-0.5">sobrante {med.lona?.sobranteAncho != null ? Math.round(med.lona.sobranteAncho) : "—"} mm</div>
        </div>
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-2.5">
          <div className="text-[9px] text-yellow-700 dark:text-yellow-400 font-bold uppercase tracking-wide">Dist. ventana</div>
          <div className="font-mono font-bold text-yellow-800 dark:text-yellow-300 text-base leading-tight mt-0.5">
            {med.distanciaVentana != null ? Number(med.distanciaVentana).toFixed(1) : "—"} <span className="text-xs font-normal">cm</span>
          </div>
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

      {/* Consumo */}
      {consumoVisible.length > 0 && (
        <div>
          <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">Consumo por unidad</div>
          <div className="grid grid-cols-3 sm:grid-cols-5 gap-1.5">
            {consumoVisible.map((c) => (
              <div key={c.insumo} className="bg-white dark:bg-gris-800 border border-gray-100 dark:border-gris-700 rounded-lg p-2">
                <div className="text-[9px] text-gray-400 leading-tight mb-1">{c.insumo.replace(/_/g, " ")}</div>
                <div className="font-mono font-bold text-gray-700 dark:text-gray-200 text-sm">
                  {c.unidad === "m²" ? Number(c.cantidad).toFixed(3) : c.cantidad}
                </div>
                <div className="text-[9px] text-gray-400">{c.unidad}{c.largoMm ? ` · ${c.largoMm}mm` : ""}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      <EstadoActions estado={f.estado} onCambiarEstado={(estado) => onCambiarEstado(f.id, estado)} />
    </div>
  );
}
