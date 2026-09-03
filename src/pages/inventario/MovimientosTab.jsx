import React from "react";
import EmptyState from "../../components/ui/EmptyState";
import Badge from "../../components/ui/Badge";
import { formatCOP, formatMovimientoFecha } from "./inventarioUtils";
import { valorNumerico } from "../../utils/campoNumero";

// Pestaña "Movimientos (general)": historial de entradas/salidas de todos los
// items, con edición en línea del último movimiento de cada item. El estado
// vive en InventarioPage; este componente es puramente presentacional.
export default function MovimientosTab({
  isActive,
  sectionOpen,
  onToggleSection,
  movGeneralLoaded,
  loadMovGeneral,
  movGeneralSearch,
  setMovGeneralSearch,
  filteredCount,
  totalCount,
  movGeneralLoading,
  filteredMovGeneral,
  itemById,
  editingMovId,
  editingMovForm,
  setEditingMovForm,
  submitEditarMovimiento,
  cancelEditarMovimiento,
  startEditarMovimiento,
  handleEliminarMovimiento,
  proveedorNameById,
}) {
  return (
    <section className={`${isActive ? "" : "hidden"} mt-5 bg-white dark:bg-gris-800 border border-gray-200 dark:border-gris-700 rounded-lg p-4`}>
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div className="font-medium">Movimientos (general)</div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onToggleSection}
            className="text-xs px-3 py-2 rounded border border-gray-300 dark:border-gris-600 bg-gray-50 dark:bg-gris-700 hover:bg-gray-100 dark:hover:bg-gris-600"
          >
            {sectionOpen ? 'Ocultar listado' : 'Mostrar listado'}
          </button>
          <button
            type="button"
            onClick={loadMovGeneral}
            className="text-xs px-3 py-2 rounded border border-gray-300 dark:border-gris-600 bg-gray-50 dark:bg-gris-700 hover:bg-gray-100 dark:hover:bg-gris-600"
          >
            {movGeneralLoaded ? 'Refrescar' : 'Cargar últimos 200'}
          </button>
        </div>
      </div>

      {sectionOpen && (
        <>
          <div className="mt-3 grid grid-cols-1 md:grid-cols-[1fr_auto] gap-3 items-start">
            <div className="rounded border border-gray-300 dark:border-gris-600 bg-white dark:bg-gris-700 px-3 py-2">
              <div className="text-[11px] opacity-70">Buscar (item, SKU, tipo, cantidad, nota).</div>
              <input
                value={movGeneralSearch}
                onChange={(e) => setMovGeneralSearch(e.target.value)}
                placeholder="Ej: salida espuma factura"
                className="mt-1 w-full bg-transparent outline-none text-sm"
                disabled={!movGeneralLoaded}
              />
            </div>
            <div className="text-xs opacity-70 pt-2">Mostrando: {filteredCount} / {totalCount}</div>
          </div>

          <div className="mt-4">
            {!movGeneralLoaded ? (
              <EmptyState icon="📜" title="Historial no cargado" description={'Haz clic en "Cargar últimos 200" para ver el historial general.'} />
            ) : movGeneralLoading ? (
              <EmptyState icon="⏳" title="Cargando..." />
            ) : filteredMovGeneral.length === 0 ? (
              <EmptyState icon="📜" title="Sin movimientos" />
            ) : (
              <>
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-left opacity-70">
                      <th className="py-2 pr-3">Fecha</th>
                      <th className="py-2 pr-3">Item</th>
                      <th className="py-2 pr-3">Tipo</th>
                      <th className="py-2 pr-3">Cant.</th>
                      <th className="py-2 pr-3">Stock</th>
                      <th className="py-2 pr-3">Proveedor</th>
                      <th className="py-2 pr-3">Costo</th>
                      <th className="py-2 pr-3">Nota</th>
                      <th className="py-2">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                {filteredMovGeneral.map((m) => {
                  const it = itemById[m.itemId];
                  const isLatest = it?.lastMovimientoId && it.lastMovimientoId === m.id;
                  const isEditing = editingMovId === m.id;
                  return (
                    <tr key={m.id} className="border-t border-gray-200/60 dark:border-gris-600/60 align-top">
                      <td className="py-2 pr-3 whitespace-nowrap">{formatMovimientoFecha(m.createdAt)}</td>
                      <td className="py-2 pr-3">
                        <div className="font-medium">{it?.nombre || m.itemId}</div>
                        <div className="opacity-70">SKU: {it?.sku || '—'}</div>
                      </td>
                      <td className="py-2 pr-3">
                        {isEditing ? (
                          <select
                            value={editingMovForm.tipo}
                            onChange={(e) => setEditingMovForm((p) => ({ ...p, tipo: e.target.value }))}
                            disabled={!isLatest}
                            className="px-2 py-1 rounded border border-gray-300 dark:border-gris-600 bg-white dark:bg-gris-800"
                          >
                            <option value="ingreso">Ingreso</option>
                            <option value="salida">Salida</option>
                          </select>
                        ) : (m.tipo === 'salida' ? 'Salida' : 'Ingreso')}
                        {!isLatest && isEditing && (
                          <div className="text-[11px] opacity-60 mt-1">Solo nota (no es el último del item)</div>
                        )}
                      </td>
                      <td className="py-2 pr-3">
                        {isEditing ? (
                          <input
                            type="number"
                            min={1}
                            value={editingMovForm.cantidad}
                            onChange={(e) => setEditingMovForm((p) => ({ ...p, cantidad: valorNumerico(e.target.value) }))}
                            disabled={!isLatest}
                            className="w-24 px-2 py-1 rounded border border-gray-300 dark:border-gris-600 bg-white dark:bg-gris-800"
                          />
                        ) : (m.cantidad ?? '')}
                      </td>
                      <td className="py-2 pr-3 whitespace-nowrap">{typeof m.stockAntes !== 'undefined' ? `${m.stockAntes} → ${m.stockDespues}` : ''}</td>
                      <td className="py-2 pr-3">{proveedorNameById[m.proveedorId] || '—'}</td>
                      <td className="py-2 pr-3">{m.costoUnitario ? formatCOP(m.costoUnitario) : '—'}</td>
                      <td className="py-2 pr-3">
                        {isEditing ? (
                          <form onSubmit={(e) => submitEditarMovimiento(e, m)}>
                            <input
                              value={editingMovForm.nota}
                              onChange={(e) => setEditingMovForm((p) => ({ ...p, nota: e.target.value }))}
                              className="w-full min-w-[220px] px-2 py-1 rounded border border-gray-300 dark:border-gris-600 bg-white dark:bg-gris-800"
                              placeholder="Nota"
                            />
                            <div className="flex gap-2 mt-2">
                              <button type="button" onClick={cancelEditarMovimiento} className="text-xs px-3 py-2 rounded border border-gray-300 dark:border-gris-600 bg-gray-50 dark:bg-gris-700 hover:bg-gray-100 dark:hover:bg-gris-600">Cancelar</button>
                              <button type="submit" className="text-xs px-3 py-2 rounded bg-trafico text-black">Guardar</button>
                            </div>
                          </form>
                        ) : (m.nota || '')}
                      </td>
                      <td className="py-2">
                        {isEditing ? null : (
                          <div className="flex flex-col gap-2">
                            <button
                              type="button"
                              onClick={() => startEditarMovimiento(m)}
                              className="text-xs px-3 py-2 rounded border border-gray-300 dark:border-gris-600 bg-gray-50 dark:bg-gris-700 hover:bg-gray-100 dark:hover:bg-gris-600"
                            >
                              Editar
                            </button>
                            <button
                              type="button"
                              onClick={() => handleEliminarMovimiento(m)}
                              className={`text-xs px-3 py-2 rounded ${isLatest ? 'bg-red-600 hover:bg-red-500 text-white' : 'border border-gray-300 dark:border-gris-600 bg-white dark:bg-gris-800 opacity-60 cursor-not-allowed'}`}
                              disabled={!isLatest}
                            >
                              Borrar
                            </button>
                            {!isLatest && (
                              <div className="text-[11px] opacity-60">Solo se borra el último del item</div>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
                  </tbody>
                </table>
              </div>

              {/* Tarjetas (móvil) */}
              <div className="md:hidden space-y-2">
                {filteredMovGeneral.map((m) => {
                  const it = itemById[m.itemId];
                  const isLatest = it?.lastMovimientoId && it.lastMovimientoId === m.id;
                  const isEditing = editingMovId === m.id;
                  return (
                    <div key={m.id} className="rounded-lg border border-gray-200 dark:border-gris-700 p-3 bg-white dark:bg-gris-800">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="font-medium text-sm truncate">{it?.nombre || m.itemId}</div>
                          <div className="text-[11px] opacity-70">SKU: {it?.sku || '—'} · {formatMovimientoFecha(m.createdAt)}</div>
                        </div>
                        <Badge tone={m.tipo === 'salida' ? 'danger' : 'success'}>{m.tipo === 'salida' ? 'Salida' : 'Ingreso'}</Badge>
                      </div>
                      <div className="text-xs mt-2 space-y-0.5">
                        <div>Cantidad: {m.cantidad ?? ''}{typeof m.stockAntes !== 'undefined' ? ` · Stock: ${m.stockAntes} → ${m.stockDespues}` : ''}</div>
                        <div>Proveedor: {proveedorNameById[m.proveedorId] || '—'} {m.costoUnitario ? `· ${formatCOP(m.costoUnitario)}` : ''}</div>
                      </div>

                      {isEditing ? (
                        <form onSubmit={(e) => submitEditarMovimiento(e, m)} className="mt-2 space-y-2">
                          <div className="flex gap-2">
                            <select
                              value={editingMovForm.tipo}
                              onChange={(e) => setEditingMovForm((p) => ({ ...p, tipo: e.target.value }))}
                              disabled={!isLatest}
                              className="flex-1 px-2 py-1.5 rounded border border-gray-300 dark:border-gris-600 bg-white dark:bg-gris-900 text-xs"
                            >
                              <option value="ingreso">Ingreso</option>
                              <option value="salida">Salida</option>
                            </select>
                            <input
                              type="number"
                              min={1}
                              value={editingMovForm.cantidad}
                              onChange={(e) => setEditingMovForm((p) => ({ ...p, cantidad: valorNumerico(e.target.value) }))}
                              disabled={!isLatest}
                              className="w-20 px-2 py-1.5 rounded border border-gray-300 dark:border-gris-600 bg-white dark:bg-gris-900 text-xs"
                            />
                          </div>
                          {!isLatest && (
                            <div className="text-[11px] opacity-60">Solo se puede editar la nota (no es el último movimiento del item)</div>
                          )}
                          <input
                            value={editingMovForm.nota}
                            onChange={(e) => setEditingMovForm((p) => ({ ...p, nota: e.target.value }))}
                            className="w-full px-2 py-1.5 rounded border border-gray-300 dark:border-gris-600 bg-white dark:bg-gris-900 text-xs"
                            placeholder="Nota"
                          />
                          <div className="flex gap-2">
                            <button type="button" onClick={cancelEditarMovimiento} className="flex-1 text-xs px-3 py-1.5 rounded border border-gray-300 dark:border-gris-600 bg-gray-50 dark:bg-gris-700">Cancelar</button>
                            <button type="submit" className="flex-1 text-xs px-3 py-1.5 rounded bg-trafico text-black">Guardar</button>
                          </div>
                        </form>
                      ) : (
                        <>
                          {m.nota && <div className="text-xs mt-2 italic opacity-80">"{m.nota}"</div>}
                          <div className="flex gap-2 mt-2">
                            <button
                              type="button"
                              onClick={() => startEditarMovimiento(m)}
                              className="flex-1 text-xs px-3 py-1.5 rounded border border-gray-300 dark:border-gris-600 bg-gray-50 dark:bg-gris-700"
                            >
                              Editar
                            </button>
                            <button
                              type="button"
                              onClick={() => handleEliminarMovimiento(m)}
                              className={`flex-1 text-xs px-3 py-1.5 rounded ${isLatest ? 'bg-red-600 hover:bg-red-500 text-white' : 'border border-gray-300 dark:border-gris-600 bg-white dark:bg-gris-800 opacity-60 cursor-not-allowed'}`}
                              disabled={!isLatest}
                            >
                              Borrar
                            </button>
                          </div>
                          {!isLatest && (
                            <div className="text-[11px] opacity-60 mt-1">Solo se borra el último movimiento del item</div>
                          )}
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
              </>
            )}
          </div>
        </>
      )}
    </section>
  );
}
