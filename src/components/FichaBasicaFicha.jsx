import React from "react";
import toast from "react-hot-toast";
import { FaEdit, FaTrash, FaPlus, FaTimes } from "react-icons/fa";
import { crearFichaGeneral, actualizarFichaGeneral } from "../utils/firebaseGeneral";
import { construirFichaGeneral, totalUnidades } from "../modules/produccion/general/normalizar";
import { fmtDate } from "../utils/fichaFormat";
import EstadoControl from "./fichas/EstadoControl";
import IdentificacionFicha from "./fichas/IdentificacionFicha";
import ClienteSelector from "./fichas/ClienteSelector";
import { clienteDeFicha } from "../utils/clienteVinculo";
import { cotizacionDeFicha } from "../utils/documentoVinculo";
import { conPrefillOrden } from "./fichas/prefillOrden";
import Combobox from "./ui/Combobox";
import { useQuote } from "../context/QuoteContext";
import { codigoFicha as codigoDeFicha } from "../utils/codigoFicha";
import {
  CATEGORIAS_GENERAL,
  UNIDADES_GENERAL,
  UNIDAD_POR_DEFECTO,
} from "../modules/produccion/general/catalogos";

// Ficha básica — orden de producción/despacho para lo que no tiene ficha de
// fabricación: repuestos y productos que salen tal cual de bodega (semáforos,
// lámparas, topes, rampas…). Igual que las fichas de producto, toma número del
// consecutivo global, tiene estados y se imprime; lo que cambia es que en vez
// de medidas y consumo lleva una lista libre de ítems a alistar.

const hoy = () => new Date().toISOString().slice(0, 10);

const inputCls = "mt-1 w-full px-3 py-2 rounded border border-gray-300 dark:border-gris-600 bg-white dark:bg-gris-700 text-sm";
const inputPlanoCls = "px-2 py-1.5 rounded border border-gray-300 dark:border-gris-600 bg-white dark:bg-gris-700 text-sm";
const labelCls = "text-xs text-gray-600 dark:text-gray-300";
const sectionTitleCls = "text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2";

const itemVacio = () => ({
  descripcion: "", categoria: "", referencia: "",
  cantidad: 1, unidad: UNIDAD_POR_DEFECTO, observaciones: "",
});

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
  responsable:       "",
  fechaOrden:        hoy(),
  fechaEntrega:      "",
  observaciones:     "",
  items:             [itemVacio()],
};

const CATEGORIA_OPCIONES = CATEGORIAS_GENERAL.map((c) => ({ id: c, label: c }));

export default function FichaBasicaFicha({ encargo, onEncargoAtendido, onGuardada }) {
  const { confirm } = useQuote();
  const [form, setForm]             = React.useState(INITIAL_FORM);
  const [loading, setLoading]       = React.useState(false);
  const [saving, setSaving]         = React.useState(false);
  const [editingId, setEditingId]   = React.useState(null);
  const formRef = React.useRef(null);

  // ── Handlers de formulario ────────────────────────────────────────────────

  const set = (field) => (e) => setForm((p) => ({ ...p, [field]: e.target.value }));

  // El selector devuelve nombre + id + NIT + ciudad juntos: la ficha no puede
  // quedar con el id de un cliente y el nombre de otro.
  const setCliente = (datos) => setForm((p) => ({ ...p, ...datos }));
  // El selector devuelve id + número juntos, o los dos vacíos al desvincular.
  const setCotizacion = (datos) => setForm((p) => ({ ...p, ...datos }));

  const setItem = (idx, campo, valor) =>
    setForm((p) => ({
      ...p,
      items: p.items.map((it, i) => (i === idx ? { ...it, [campo]: valor } : it)),
    }));

  const agregarItem = () => setForm((p) => ({ ...p, items: [...p.items, itemVacio()] }));

  // Nunca se queda sin filas: quitar la última deja una en blanco lista para escribir.
  const quitarItem = (idx) =>
    setForm((p) => {
      const items = p.items.filter((_, i) => i !== idx);
      return { ...p, items: items.length ? items : [itemVacio()] };
    });

  const itemsConDescripcion = form.items.filter((it) => (it.descripcion || "").trim());
  const totalForm = totalUnidades(form.items);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.cliente.trim()) return toast.error("El cliente es requerido");
    if (itemsConDescripcion.length === 0)
      return toast.error("Agrega al menos un ítem con descripción");
    if (itemsConDescripcion.some((it) => Number(it.cantidad) <= 0))
      return toast.error("Todos los ítems deben tener cantidad mayor a 0");

    setSaving(true);
    try {
      if (editingId) {
        await actualizarFichaGeneral(editingId, construirFichaGeneral(form));
        toast.success("Ficha actualizada");
        setEditingId(null);
      } else {
        await crearFichaGeneral(form);
        toast.success("Ficha básica guardada");
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
      codigoFicha:       codigoDeFicha(f, "general"),
      numeroOrdenCompra: f.numeroOrdenCompra || "",
      nombreFicha:       f.nombreFicha || "",
      ...clienteDeFicha(f),
      ...cotizacionDeFicha(f),
      responsable:       f.responsable || "",
      fechaOrden:        f.fechaOrden || hoy(),
      fechaEntrega:      f.fechaEntrega || "",
      observaciones:     f.observaciones || "",
      items:             Array.isArray(f.items) && f.items.length ? f.items.map((it) => ({ ...it })) : [itemVacio()],
    });
    setEditingId(f.id);
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  // Formulario en blanco. `prefill` llega cuando la ficha se crea desde un
  // pedido ya existente: hereda la orden de compra, el cliente y las fechas
  // para que caiga sola dentro del mismo grupo (ver prefillOrden.js).
  const nuevaFicha = (prefill) => {
    setEditingId(null);
    setForm(conPrefillOrden(INITIAL_FORM, prefill));
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

  return (
    <div className="space-y-5">
      <section ref={formRef} className="bg-white dark:bg-gris-800 border border-gray-200 dark:border-gris-700 rounded-lg p-4">
        <div className="flex items-center justify-between mb-1">
          <div className="font-medium text-sm">
            {editingId ? "Editar ficha básica" : "Nueva ficha básica"}
          </div>
          {editingId && (
            <button type="button" onClick={cancelarEdicion}
              className="inline-flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
              <FaTimes className="text-[11px]" /> Cancelar edición
            </button>
          )}
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
          Para órdenes que pasan a producción sin ficha de fabricación: repuestos,
          semáforos, lámparas, topes, rampas y demás productos que se despachan tal cual.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
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

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="sm:col-span-2">
              <ClienteSelector
                value={form}
                onChange={setCliente}
                inputCls={inputCls}
                labelCls={labelCls}
              />
            </div>
            <div>
              <label className={labelCls}>Fecha orden</label>
              <input type="date" value={form.fechaOrden} onChange={set("fechaOrden")} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Fecha entrega</label>
              <input type="date" value={form.fechaEntrega} onChange={set("fechaEntrega")} className={inputCls} />
            </div>
            <div className="sm:col-span-2">
              <label className={labelCls}>Responsable / auxiliar encargado</label>
              <input value={form.responsable} onChange={set("responsable")}
                className={inputCls} placeholder="TODOS" />
            </div>
          </div>

          {/* ── Ítems de la orden ── */}
          <div className="border-t border-gray-200 dark:border-gris-700 pt-4">
            <div className="flex items-center justify-between mb-2">
              <div className={`${sectionTitleCls} mb-0`}>Ítems a alistar</div>
              <div className="text-xs text-gray-500 dark:text-gray-400">
                {itemsConDescripcion.length} ítem(s) · {totalForm} unidad(es)
              </div>
            </div>

            {/* Encabezado de columnas — solo en escritorio; en móvil cada campo
                lleva su propia etiqueta porque las filas se apilan. */}
            <div className="hidden md:grid grid-cols-12 gap-2 px-2 pb-1 text-[11px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
              <div className="col-span-4">Descripción</div>
              <div className="col-span-2">Categoría</div>
              <div className="col-span-2">Referencia</div>
              <div className="col-span-1">Cant.</div>
              <div className="col-span-1">Unidad</div>
              <div className="col-span-1">Notas</div>
              <div className="col-span-1" />
            </div>

            <div className="space-y-2">
              {form.items.map((it, idx) => (
                <div key={idx}
                  className="grid grid-cols-12 gap-2 items-start rounded-lg border border-gray-200 dark:border-gris-700 p-2">
                  <div className="col-span-12 md:col-span-4">
                    <label className={`${labelCls} md:sr-only`}>Descripción</label>
                    <input
                      value={it.descripcion}
                      onChange={(e) => setItem(idx, "descripcion", e.target.value)}
                      className={`${inputPlanoCls} w-full`}
                      placeholder="Descripción del ítem"
                    />
                  </div>
                  <div className="col-span-6 md:col-span-2">
                    <label className={`${labelCls} md:sr-only`}>Categoría</label>
                    <Combobox
                      value={it.categoria}
                      onChange={(v) => setItem(idx, "categoria", v)}
                      options={CATEGORIA_OPCIONES}
                      inputClassName={inputPlanoCls}
                      placeholder="Categoría"
                    />
                  </div>
                  <div className="col-span-6 md:col-span-2">
                    <label className={`${labelCls} md:sr-only`}>Referencia</label>
                    <input
                      value={it.referencia}
                      onChange={(e) => setItem(idx, "referencia", e.target.value)}
                      className={`${inputPlanoCls} w-full`}
                      placeholder="Referencia"
                    />
                  </div>
                  <div className="col-span-4 md:col-span-1">
                    <label className={`${labelCls} md:sr-only`}>Cant.</label>
                    <input
                      type="number" min={0} step="any"
                      value={it.cantidad}
                      onChange={(e) => setItem(idx, "cantidad", e.target.value)}
                      className={`${inputPlanoCls} w-full`}
                    />
                  </div>
                  <div className="col-span-4 md:col-span-1">
                    <label className={`${labelCls} md:sr-only`}>Unidad</label>
                    <select
                      value={it.unidad}
                      onChange={(e) => setItem(idx, "unidad", e.target.value)}
                      className={`${inputPlanoCls} w-full`}
                    >
                      {UNIDADES_GENERAL.map((u) => <option key={u} value={u}>{u}</option>)}
                    </select>
                  </div>
                  {/* En móvil el botón de quitar cierra la fila de cantidad/unidad;
                      en escritorio se va al final con order-last. */}
                  <div className="col-span-4 md:col-span-1 md:order-last flex items-end md:justify-end h-full pb-0.5">
                    <button
                      type="button"
                      onClick={() => quitarItem(idx)}
                      title="Quitar ítem"
                      aria-label="Quitar ítem"
                      className="inline-flex items-center justify-center h-8 w-8 rounded bg-red-50 hover:bg-red-100 dark:bg-red-900/30 dark:hover:bg-red-900/50 text-red-600 dark:text-red-300 border border-red-200 dark:border-red-800"
                    >
                      <FaTrash className="text-[11px]" />
                    </button>
                  </div>
                  <div className="col-span-12 md:col-span-1">
                    <label className={`${labelCls} md:sr-only`}>Notas</label>
                    <input
                      value={it.observaciones}
                      onChange={(e) => setItem(idx, "observaciones", e.target.value)}
                      className={`${inputPlanoCls} w-full`}
                      placeholder="Notas"
                    />
                  </div>
                </div>
              ))}
            </div>

            <button type="button" onClick={agregarItem}
              className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-dashed border-gray-300 dark:border-gris-600 text-xs font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gris-700">
              <FaPlus className="text-[10px]" /> Agregar ítem
            </button>
          </div>

          <div>
            <label className={labelCls}>Observaciones de la orden</label>
            <textarea value={form.observaciones} onChange={set("observaciones")}
              className={inputCls} rows={3}
              placeholder="Indicaciones de alistamiento, empaque, transporte…" />
          </div>

          <div className="flex justify-end gap-2">
            {editingId && (
              <button type="button" onClick={cancelarEdicion}
                className="px-4 py-2 rounded border border-gray-300 dark:border-gris-600 text-sm">
                Cancelar
              </button>
            )}
            <button type="submit" disabled={saving}
              className="px-4 py-2 rounded bg-green-600 hover:bg-green-500 disabled:opacity-60 text-white text-sm font-medium">
              {saving ? "Guardando…" : editingId ? "Guardar cambios" : "Crear ficha básica"}
            </button>
          </div>
        </form>
      </section>

    </div>
  );
}

// ─── Detalle expandido inline ─────────────────────────────────────────────────
export function FichaBasicaDetalle({ ficha: f, onCambiarEstado, onAgregarNota, onEditarEntrega, onEditarFirma, onVerFicha, onEditar, onEliminar }) {
  const items = Array.isArray(f.items) ? f.items : [];

  return (
    <div className="bg-gray-50 dark:bg-gris-700/60 rounded-xl p-4 space-y-4 text-xs border border-gray-200 dark:border-gris-600">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <span className="font-semibold text-sm text-gray-800 dark:text-gray-100">
            {f.cliente || "Sin cliente"}
          </span>
          <span className="ml-2 text-gray-400">
            OC {f.numeroOrdenCompra || "—"} · orden {fmtDate(f.fechaOrden)} · entrega {fmtDate(f.fechaEntrega)}
            {f.responsable ? ` · ${f.responsable}` : ""}
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

      <div className="overflow-x-auto">
        <table className="w-full text-xs bg-white dark:bg-gris-800 rounded-lg overflow-hidden">
          <thead>
            <tr className="text-gray-500 border-b border-gray-200 dark:border-gris-700">
              <th className="text-left py-1.5 px-2 font-medium">Descripción</th>
              <th className="text-left py-1.5 px-2 font-medium">Categoría</th>
              <th className="text-left py-1.5 px-2 font-medium">Referencia</th>
              <th className="text-center py-1.5 px-2 font-medium">Cant.</th>
              <th className="text-left py-1.5 px-2 font-medium">Notas</th>
            </tr>
          </thead>
          <tbody>
            {items.map((it, i) => (
              <tr key={`${it.descripcion}-${i}`} className="border-b border-gray-100 dark:border-gris-700/50 last:border-b-0">
                <td className="py-1.5 px-2 font-medium">{it.descripcion}</td>
                <td className="py-1.5 px-2 text-gray-500">{it.categoria || "—"}</td>
                <td className="py-1.5 px-2 font-mono text-gray-500">{it.referencia || "—"}</td>
                <td className="py-1.5 px-2 text-center font-mono">{it.cantidad} {it.unidad}</td>
                <td className="py-1.5 px-2 text-gray-500">{it.observaciones || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {f.observaciones && (
        <div className="bg-white dark:bg-gris-800 border border-gray-200 dark:border-gris-600 rounded-lg p-3">
          <div className="text-[10px] uppercase tracking-wide text-gray-400 font-semibold mb-1">Observaciones</div>
          <div className="whitespace-pre-wrap text-gray-700 dark:text-gray-200">{f.observaciones}</div>
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
