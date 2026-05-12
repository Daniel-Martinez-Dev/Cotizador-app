import React from "react";
import toast from "react-hot-toast";
import { calcularDesdeInput } from "../utils/divisionTermica";
import {
  crearFichaDivision,
  listarFichasDivision,
  actualizarFichaDivision,
} from "../utils/firebaseDivision";
import FichaImpresionDivision from "./FichaImpresionDivision";

const OPCIONES = {
  placa:     ["SI", "NO"],
  ft:        ["SI", "NO"],
  logo:      ["COLD CHAIN", "CLIENTE", "NO"],
  agujero:   ["SIN AGUJERO", "1 AGUJERO", "2 AGUJEROS", "4 AGUJEROS", "AGUJERO DIF MEDIDA"],
  platinas:  ["SI", "NO"],
  factura:   ["SI", "NO"],
  colorLona: ["NEGRO", "AZUL", "VERDE", "NARANJA", "GRIS", "OTRO"],
};

const INITIAL_FORM = {
  fechaOrden:    new Date().toISOString().slice(0, 10),
  fechaEntrega:  "",
  cliente:       "",
  cantidad:      1,
  anchoVehiculo: "",
  altoVehiculo:  "",
  placa:         "NO",
  ft:            "NO",
  logo:          "NO",
  agujero:       "SIN AGUJERO",
  platinas:      "NO",
  factura:       "SI",
  colorLona:     "NEGRO",
  adicional:     "",
};

const fmtMm = (n) => (n == null ? "—" : Math.round(n).toString());
const fmtM2 = (n) => (n == null ? "—" : Number(n).toFixed(3));
const fmtN  = (n) => (n == null ? "—" : Number(n).toString());
const fmtCm = (n) => (n == null ? "—" : Number(n).toFixed(1));

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

export default function DivisionTermicaFicha() {
  const [form, setForm]             = React.useState(INITIAL_FORM);
  const [fichas, setFichas]         = React.useState([]);
  const [loading, setLoading]       = React.useState(false);
  const [saving, setSaving]         = React.useState(false);
  const [selectedId, setSelectedId] = React.useState(null);
  const [printFicha, setPrintFicha] = React.useState(null); // { ficha, numero }

  const calculo = React.useMemo(
    () => calcularDesdeInput(form),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [form.anchoVehiculo, form.altoVehiculo, form.platinas]
  );

  const selectedFicha = React.useMemo(
    () => fichas.find((f) => f.id === selectedId) || null,
    [fichas, selectedId]
  );

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
      await crearFichaDivision(
        { ...form, anchoVehiculo: Number(form.anchoVehiculo), altoVehiculo: Number(form.altoVehiculo) },
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
      await actualizarFichaDivision(id, { estado });
      toast.success(`Estado → ${ESTADO_LABEL[estado] || estado}`);
      setFichas((prev) => prev.map((f) => (f.id === id ? { ...f, estado } : f)));
    } catch (err) {
      console.error(err);
      toast.error("Error actualizando estado");
    }
  };

  return (
    <div className="space-y-5">

      {/* ── Fila superior: formulario + vista previa ── */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">

        {/* FORMULARIO */}
        <section className="bg-white dark:bg-gris-800 border border-gray-200 dark:border-gris-700 rounded-lg p-4">
          <div className="font-medium text-sm mb-4">Nueva ficha — División Térmica</div>
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
              <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
                Medidas del vehículo (mm)
              </div>
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
              <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
                Opciones
              </div>
              <div className="grid grid-cols-2 gap-3">
                {[
                  ["placa",     "Placa"],
                  ["ft",        "FT"],
                  ["platinas",  "Platinas"],
                  ["factura",   "Factura"],
                  ["colorLona", "Color lona"],
                  ["logo",      "Logo"],
                ].map(([field, label]) => (
                  <div key={field}>
                    <label className={labelCls}>{label}</label>
                    <select value={form[field]} onChange={set(field)} className={inputCls}>
                      {OPCIONES[field].map((o) => <option key={o} value={o}>{o}</option>)}
                    </select>
                  </div>
                ))}
                <div className="col-span-2">
                  <label className={labelCls}>Agujero</label>
                  <select value={form.agujero} onChange={set("agujero")} className={inputCls}>
                    {OPCIONES.agujero.map((o) => <option key={o} value={o}>{o}</option>)}
                  </select>
                </div>
                <div className="col-span-2">
                  <label className={labelCls}>Adicional / Notas</label>
                  <input value={form.adicional} onChange={set("adicional")} className={inputCls} />
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
          <div className="flex items-center gap-2 mb-4">
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
                  <th className="text-left py-2 font-medium">Medidas (mm)</th>
                  <th className="text-center py-2 font-medium">Cant.</th>
                  <th className="text-center py-2 font-medium">Icopor</th>
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
                            onClick={(e) => {
                              e.stopPropagation();
                              setPrintFicha({ ficha: f, numero });
                            }}
                            className="px-2 py-1 text-xs rounded bg-gray-100 hover:bg-gray-200 dark:bg-gris-700 dark:hover:bg-gris-600 border border-gray-300 dark:border-gris-600 whitespace-nowrap"
                            title="Ver ficha imprimible"
                          >
                            Ver ficha
                          </button>
                        </td>
                      </tr>

                      {/* Detalle expandido */}
                      {selectedId === f.id && (
                        <tr className="border-b border-gray-200 dark:border-gris-700">
                          <td colSpan={8} className="py-3 px-2">
                            <FichaDetalle ficha={f} numero={numero} onCambiarEstado={cambiarEstado} onVerFicha={() => setPrintFicha({ ficha: f, numero })} />
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
function FichaDetalle({ ficha: f, numero, onCambiarEstado, onVerFicha }) {
  const med = f.medidas || {};
  const datos = [
    ["Panel",      med.panel       ? `${med.panel.ancho}×${med.panel.alto} mm`             : "—"],
    ["Funda",      med.funda       ? `${med.funda.ancho}×${med.funda.alto} mm`             : "—"],
    ["Icopor",     med.icopor      ? `${med.icopor.ancho}×${med.icopor.alto} mm`           : "—"],
    ["Policarb.",  med.policarbonato ? `${med.policarbonato.ancho}×${med.policarbonato.alto} mm` : "—"],
    ["Piso",       med.medidaPiso  ? `${med.medidaPiso} mm`                                : "—"],
    ["Tiras lona", med.lona        ? `${med.lona.tiras} × ${med.lona.largoTira} mm`       : "—"],
    ["Sobrante",   med.lona        ? `${med.lona.sobranteAncho} mm`                       : "—"],
    ["Dist. ventana", med.distanciaVentana != null ? `${Number(med.distanciaVentana).toFixed(1)} cm` : "—"],
    ["Platinas",   f.platinas  || "—"],
    ["FT",         f.ft        || "—"],
    ["Color lona", f.colorLona || "—"],
    ["Logo",       f.logo      || "—"],
    ["Agujero",    f.agujero   || "—"],
    ["Placa",      f.placa     || "—"],
  ];

  const consumoVisible = (f.consumo || []).filter((c) => c.cantidad > 0);

  return (
    <div className="bg-gray-50 dark:bg-gris-700 rounded-lg p-4 space-y-4 text-xs">
      <div className="font-medium text-sm">
        {f.cliente || "Sin cliente"}{" "}
        <span className="opacity-60 font-normal">
          — {f.anchoVehiculo}×{f.altoVehiculo} mm · Cant. {f.cantidad}
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-2">
        {datos.map(([k, v]) => (
          <div key={k} className="bg-white dark:bg-gris-800 rounded p-2">
            <div className="text-gray-500 dark:text-gray-400">{k}</div>
            <div className="font-mono font-medium mt-0.5 break-all">{v}</div>
          </div>
        ))}
      </div>

      {consumoVisible.length > 0 && (
        <div>
          <div className="font-medium mb-2">Consumo (por unidad)</div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
            {consumoVisible.map((c) => (
              <div key={c.insumo} className="bg-white dark:bg-gris-800 rounded p-2">
                <div className="text-gray-500 dark:text-gray-400">{c.insumo.replace("_", " ")}</div>
                <div className="font-mono font-medium mt-0.5">
                  {c.unidad === "m²" ? Number(c.cantidad).toFixed(3) : c.cantidad}{" "}
                  <span className="text-gray-400 font-normal">{c.unidad}</span>
                </div>
                {c.largoMm ? <div className="text-gray-400">{c.largoMm} mm c/u</div> : null}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex flex-wrap gap-2 pt-1">
        <button onClick={onVerFicha}
          className="px-3 py-1.5 rounded bg-gray-800 hover:bg-gray-700 dark:bg-gris-600 dark:hover:bg-gris-500 text-white text-xs font-medium">
          Ver ficha imprimible
        </button>
        {f.estado !== "en_produccion" && (
          <button onClick={() => onCambiarEstado(f.id, "en_produccion")}
            className="px-3 py-1.5 rounded bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium">
            Pasar a producción
          </button>
        )}
        {f.estado !== "terminado" && (
          <button onClick={() => onCambiarEstado(f.id, "terminado")}
            className="px-3 py-1.5 rounded bg-green-600 hover:bg-green-500 text-white text-xs font-medium">
            Marcar terminada
          </button>
        )}
        {f.estado !== "borrador" && (
          <button onClick={() => onCambiarEstado(f.id, "borrador")}
            className="px-3 py-1.5 rounded bg-gray-200 hover:bg-gray-300 dark:bg-gris-600 dark:hover:bg-gris-500 text-xs font-medium">
            Volver a borrador
          </button>
        )}
      </div>
    </div>
  );
}
