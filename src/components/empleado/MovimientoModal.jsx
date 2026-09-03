import React from "react";
import toast from "react-hot-toast";
import { FaTimes, FaBarcode, FaFileInvoiceDollar, FaPlus, FaChevronDown } from "react-icons/fa";
import { listarProveedores, registrarMovimientoInventarioAlmacen } from "../../utils/firebaseInventory";
import { formatCOP } from "../../pages/inventario/inventarioUtils";
import OrdenProduccionPicker from "./OrdenProduccionPicker";
import ProveedorFormModal from "../almacen/ProveedorFormModal";
import ProveedorSelector from "../almacen/ProveedorSelector";

// Entrada o salida de materia prima desde el almacén.
//
// La entrada puede llevar los datos de la compra —proveedor, número de factura,
// ítem y precio unitario—: el almacenista es quien tiene el papel del proveedor
// en la mano cuando descarga. Que pueda escribir el precio no significa que lo
// pueda consultar: aquí no se muestra el costo que ya tenga el material, ni su
// valor en inventario. Eso vive en el módulo de oficina.
//
// Ninguno de esos datos es obligatorio, y la cantidad es lo único que se pide.
// El caso que manda es el arranque: cargar el stock que ya está en bodega, que
// no tiene factura ni proveedor que recordar. Exigirlos convertía el conteo
// inicial en una invención de datos, y un dato inventado en contabilidad es
// peor que un campo vacío.
//
// La salida exige la orden de producción, que es lo que permite saber después
// en qué se gastó el material.
//
// `codigoLeido` llega cuando el material se identificó con el lector en vez de
// elegirlo de la lista. Se muestra para que se confirme que se barrió la
// etiqueta correcta, y se guarda en el movimiento como constancia.

const soloDigitos = (v) => (v || "").toString().replace(/\D+/g, "");

export default function MovimientoModal({ item, tipo, codigoLeido = "", onClose, onDone }) {
  const esSalida = tipo === "salida";
  const [cantidad, setCantidad] = React.useState(1);
  const [proveedorId, setProveedorId] = React.useState("");
  const [proveedores, setProveedores] = React.useState([]);
  const [nuevoProveedor, setNuevoProveedor] = React.useState(false);
  const [facturaNumero, setFacturaNumero] = React.useState("");
  const [facturaItem, setFacturaItem] = React.useState("");
  const [costoUnitario, setCostoUnitario] = React.useState("");
  const [orden, setOrden] = React.useState(null);
  const [nota, setNota] = React.useState("");
  const [compraAbierta, setCompraAbierta] = React.useState(false);
  const [saving, setSaving] = React.useState(false);

  const cargarProveedores = React.useCallback(async () => {
    try {
      const list = await listarProveedores();
      setProveedores(list);
      return list;
    } catch (e) {
      console.error(e);
      toast.error("No se pudieron cargar los proveedores");
      return [];
    }
  }, []);

  // La lista de proveedores solo hace falta en las entradas.
  React.useEffect(() => {
    if (!esSalida) cargarProveedores();
  }, [esSalida, cargarProveedores]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const cant = Number(cantidad || 0);
    if (Number.isNaN(cant) || cant <= 0) return toast.error("Cantidad inválida");
    if (esSalida && cant > Number(item.stockActual || 0)) return toast.error("No hay stock suficiente");
    if (esSalida && !orden) return toast.error("Selecciona la orden de producción");

    setSaving(true);
    try {
      await registrarMovimientoInventarioAlmacen(item.id, {
        tipo,
        cantidad: cant,
        nota,
        codigoLeido,
        proveedorId: esSalida ? "" : proveedorId,
        facturaNumero: esSalida ? "" : facturaNumero,
        facturaItem: esSalida ? "" : facturaItem,
        // Sin precio escrito no se toca el costo que el material ya tenga.
        costoUnitario: !esSalida && costoUnitario !== "" ? Number(costoUnitario) : undefined,
        ordenProduccion: esSalida ? orden.ordenProduccion : undefined,
        codigoFicha: esSalida ? orden.codigo : undefined,
        fichaId: esSalida ? orden.fichaId : undefined,
        fichaTipo: esSalida ? orden.fichaTipo : undefined,
      });
      toast.success(esSalida ? "Salida registrada" : "Entrada registrada");
      onDone?.();
    } catch (e2) {
      console.error(e2);
      toast.error(e2?.message || "No se pudo registrar el movimiento");
    } finally {
      setSaving(false);
    }
  };

  // Lo que se ve del bloque de compra cuando está plegado, para no tener que
  // abrirlo solo para comprobar qué quedó escrito.
  const resumenCompra = React.useMemo(() => {
    const proveedor = proveedores.find((p) => p.id === proveedorId);
    const partes = [
      proveedor ? (proveedor.razonSocial || proveedor.nombre) : null,
      facturaNumero.trim() || null,
      costoUnitario !== "" ? formatCOP(Number(costoUnitario)) : null,
    ].filter(Boolean);
    return partes.length ? partes.join(" · ") : "Sin datos";
  }, [proveedores, proveedorId, facturaNumero, costoUnitario]);

  const controlCls = "w-full px-3 py-2.5 rounded-lg border border-gray-300 dark:border-gris-600 bg-white dark:bg-gris-900 text-sm";
  const inputCls = `mt-1 ${controlCls}`;
  const labelCls = "text-xs text-gray-600 dark:text-gray-300";

  return (
    <div className="fixed inset-0 z-[1000]">
      <div className="absolute inset-0 bg-black/50" onClick={saving ? undefined : onClose} />
      <div className="absolute inset-x-0 bottom-0 sm:inset-0 sm:flex sm:items-center sm:justify-center sm:p-4">
        <div className="w-full sm:max-w-md bg-white dark:bg-gris-800 rounded-t-2xl sm:rounded-2xl border border-gray-200 dark:border-gris-700 shadow-xl max-h-[88vh] overflow-hidden flex flex-col">
          <div className="p-4 border-b border-gray-200 dark:border-gris-700 flex items-center justify-between">
            <div className="min-w-0">
              <div className="text-sm font-semibold">{esSalida ? "Registrar salida" : "Registrar entrada"}</div>
              <div className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-[220px]">{item.nombre}</div>
            </div>
            <button type="button" onClick={onClose} disabled={saving}
              className="h-8 w-8 rounded border border-gray-300 dark:border-gris-600 bg-gray-50 dark:bg-gris-700 flex items-center justify-center disabled:opacity-40">
              <FaTimes className="text-sm" />
            </button>
          </div>

          <form id="movimiento-form" onSubmit={handleSubmit} className="p-4 overflow-y-auto flex-1 space-y-3">
            <div className="text-xs text-gray-500 dark:text-gray-400">
              Stock actual: <span className="font-mono font-medium text-gray-700 dark:text-gray-200">{item.stockActual ?? 0} {item.unidad || ""}</span>
            </div>

            {codigoLeido && (
              <div className="rounded-lg border border-emerald-300 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/40 px-3 py-2 text-xs text-emerald-900 dark:text-emerald-300 inline-flex items-center gap-2 w-full">
                <FaBarcode className="shrink-0" />
                <span>Identificado por escáner: <span className="font-mono font-semibold">{codigoLeido}</span></span>
              </div>
            )}

            <div>
              <label className={labelCls}>Cantidad</label>
              <input
                type="number"
                min={1}
                step="any"
                inputMode="decimal"
                value={cantidad}
                onChange={(e) => setCantidad(e.target.value)}
                className={inputCls}
              />
            </div>

            {!esSalida && (
              <div className="rounded-lg border border-gray-200 dark:border-gris-600">
                {/* Plegado por defecto: la entrada corriente es cantidad y ya.
                    Quien tenga la factura en la mano lo abre y la registra. */}
                <button
                  type="button"
                  onClick={() => setCompraAbierta((v) => !v)}
                  aria-expanded={compraAbierta}
                  className="w-full flex items-center gap-2 px-3 py-2.5 text-left"
                >
                  <FaFileInvoiceDollar className="text-gray-400 shrink-0" />
                  <span className="text-xs font-semibold text-gray-600 dark:text-gray-300">Datos de compra</span>
                  <span className="text-[10px] text-gray-400">(opcional)</span>
                  <span className="ml-auto text-[11px] text-gray-500 dark:text-gray-400 truncate max-w-[45%]">
                    {!compraAbierta && resumenCompra}
                  </span>
                  <FaChevronDown
                    className={`text-[10px] text-gray-400 shrink-0 transition-transform ${compraAbierta ? "rotate-180" : ""}`}
                  />
                </button>

                {compraAbierta && (
                  <div className="px-3 pb-3 space-y-3 border-t border-gray-200 dark:border-gris-600 pt-3">
                    <div>
                      <div className="flex items-center justify-between">
                        <label className={labelCls}>Proveedor</label>
                        <button type="button" onClick={() => setNuevoProveedor(true)}
                          className="text-[11px] text-blue-600 dark:text-blue-400 inline-flex items-center gap-1">
                          <FaPlus className="text-[9px]" /> Nuevo
                        </button>
                      </div>
                      <div className="mt-1">
                        <ProveedorSelector
                          proveedores={proveedores}
                          value={proveedorId}
                          onChange={setProveedorId}
                          inputCls={controlCls}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className={labelCls}>N.° de factura</label>
                        <input
                          value={facturaNumero}
                          onChange={(e) => setFacturaNumero(e.target.value)}
                          placeholder="FV-1234"
                          className={`${inputCls} font-mono`}
                        />
                      </div>
                      <div>
                        <label className={labelCls}>Precio unitario</label>
                        <input
                          value={costoUnitario === "" ? "" : formatCOP(Number(costoUnitario))}
                          onChange={(e) => setCostoUnitario(soloDigitos(e.target.value))}
                          inputMode="numeric"
                          placeholder="$ 0"
                          className={inputCls}
                        />
                      </div>
                    </div>
                    <div>
                      <label className={labelCls}>Ítem / descripción en la factura</label>
                      <input
                        value={facturaItem}
                        onChange={(e) => setFacturaItem(e.target.value)}
                        placeholder="Como aparece en el documento del proveedor"
                        className={inputCls}
                      />
                    </div>
                    <div className="text-[10px] text-gray-400">
                      Estos datos quedan para contabilidad. El valor del material no se consulta desde el almacén.
                    </div>
                  </div>
                )}
              </div>
            )}

            {esSalida && (
              <div>
                <label className={labelCls}>Orden de producción</label>
                <div className="mt-1">
                  <OrdenProduccionPicker value={orden} onChange={setOrden} />
                </div>
              </div>
            )}

            <div>
              <label className={labelCls}>Nota (opcional)</label>
              <input
                value={nota}
                onChange={(e) => setNota(e.target.value)}
                className={inputCls}
                placeholder="Observación…"
              />
            </div>
          </form>

          <div className="p-4 border-t border-gray-200 dark:border-gris-700 flex gap-2">
            <button type="button" onClick={onClose} disabled={saving}
              className="flex-1 py-2.5 rounded-lg border border-gray-300 dark:border-gris-600 bg-gray-50 dark:bg-gris-700 text-sm font-medium disabled:opacity-50">
              Cancelar
            </button>
            <button
              type="submit"
              form="movimiento-form"
              disabled={saving}
              className={`flex-1 py-2.5 rounded-lg disabled:opacity-50 text-white text-sm font-semibold ${esSalida ? "bg-red-600 hover:bg-red-500" : "bg-green-600 hover:bg-green-500"}`}
            >
              {saving ? "Guardando…" : esSalida ? "Registrar salida" : "Registrar entrada"}
            </button>
          </div>
        </div>
      </div>

      {nuevoProveedor && (
        <ProveedorFormModal
          onClose={() => setNuevoProveedor(false)}
          onDone={async (id) => {
            setNuevoProveedor(false);
            await cargarProveedores();
            setProveedorId(id);
            setCompraAbierta(true);
          }}
        />
      )}
    </div>
  );
}
