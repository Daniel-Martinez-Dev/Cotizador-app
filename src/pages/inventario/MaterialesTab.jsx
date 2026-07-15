import React from "react";
import toast from "react-hot-toast";
import EmptyState from "../../components/ui/EmptyState";
import Badge from "../../components/ui/Badge";
import { listarMovimientosPorItem } from "../../utils/firebaseInventory";
import { dataUrlSizeLabel } from "../../utils/imageCompress";
import { toggleSort, sortArrow, formatCOP, formatMovimientoFecha } from "./inventarioUtils";

// Pestaña "Materiales": listado + ficha de detalle del item seleccionado.
// El estado (items, selección, caché de movimientos) vive en InventarioPage;
// este componente es puramente presentacional.
export default function MaterialesTab({
  isActive,
  sectionOpen,
  onToggleSection,
  itemsSearch,
  setItemsSearch,
  filteredCount,
  totalCount,
  loading,
  sortedItems,
  itemsSort,
  setItemsSort,
  proveedorLabelById,
  proveedorById,
  proveedorNameById,
  selectedItemId,
  setSelectedItemId,
  setSelectedProveedorId,
  setShowProveedorOverlay,
  ensureMovimientosForItem,
  startMovimiento,
  selectedItem,
  selectedItemProveedorIds,
  showSelectedItemMovs,
  setShowSelectedItemMovs,
  cancelMovimiento,
  movimientosLoadingItemId,
  setMovimientosLoadingItemId,
  movimientosCache,
  setMovimientosCache,
  startEditarItem,
  handleEliminarItem,
}) {
  const closeItemDetail = () => { setSelectedItemId(''); setShowSelectedItemMovs(true); cancelMovimiento(); };
  const selectItem = (item) => { setSelectedProveedorId(''); setSelectedItemId(item.id); ensureMovimientosForItem(item.id); };

  return (
    <section className={`${isActive ? "" : "hidden"} mt-5 bg-white dark:bg-gris-800 border border-gray-200 dark:border-gris-700 rounded-lg p-4`}>
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div className="font-medium">Materiales</div>
        <div className="flex flex-col sm:flex-row gap-2">
          <button
            type="button"
            onClick={onToggleSection}
            className="text-xs px-3 py-2 rounded border border-gray-300 dark:border-gris-600 bg-gray-50 dark:bg-gris-700 hover:bg-gray-100 dark:hover:bg-gris-600"
          >
            {sectionOpen ? 'Ocultar listado' : 'Mostrar listado'}
          </button>
        </div>
      </div>

      {sectionOpen && (
        <>
          <div className="mt-3 grid grid-cols-1 md:grid-cols-[1fr_auto] gap-3 items-start">
            <div className="rounded border border-gray-300 dark:border-gris-600 bg-white dark:bg-gris-700 px-3 py-2">
              <div className="text-[11px] opacity-70">Buscar (nombre, SKU, categoría, ubicación, productos, proveedor). Soporta varios términos.</div>
              <input
                value={itemsSearch}
                onChange={(e) => setItemsSearch(e.target.value)}
                placeholder="Ej: espuma pu bodega bogotá proveedorX"
                className="mt-1 w-full bg-transparent outline-none text-sm"
              />
            </div>
            <div className="text-xs opacity-70 pt-2">Mostrando: {filteredCount} / {totalCount}</div>
          </div>

          {loading ? (
            <EmptyState icon="⏳" title="Cargando..." />
          ) : (
            <>
              {sortedItems.length === 0 ? (
                <EmptyState
                  icon="📦"
                  title={itemsSearch
                    ? <>Sin materiales que coincidan con <strong>"{itemsSearch}"</strong>.</>
                    : <>No hay materiales registrados. Crea el primero con el botón <strong>"Nuevo material"</strong>.</>
                  }
                />
              ) : (
                <>
                <div className="hidden md:block mt-4 rounded-lg border border-gray-200 dark:border-gris-700 overflow-auto max-h-[420px]">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="text-left opacity-70">
                        <th className="py-2 pr-3">Estado</th>
                        <th className="py-2 pr-3">Foto</th>
                        <th className="py-2 pr-3 cursor-pointer select-none" onClick={() => toggleSort(setItemsSort, itemsSort, 'nombre')}>Material{sortArrow(itemsSort, 'nombre')}</th>
                        <th className="py-2 pr-3 cursor-pointer select-none" onClick={() => toggleSort(setItemsSort, itemsSort, 'stockActual')}>Stock{sortArrow(itemsSort, 'stockActual')}</th>
                        <th className="py-2 pr-3 cursor-pointer select-none" onClick={() => toggleSort(setItemsSort, itemsSort, 'stockMinimo')}>Mín{sortArrow(itemsSort, 'stockMinimo')}</th>
                        <th className="py-2 pr-3 cursor-pointer select-none" onClick={() => toggleSort(setItemsSort, itemsSort, 'ubicacion')}>Ubicación{sortArrow(itemsSort, 'ubicacion')}</th>
                        <th className="py-2 pr-3 cursor-pointer select-none" onClick={() => toggleSort(setItemsSort, itemsSort, 'proveedores')}>Proveedores{sortArrow(itemsSort, 'proveedores')}</th>
                        <th className="py-2">Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sortedItems.map((i) => {
                        const ids = Array.isArray(i.proveedorIds) ? i.proveedorIds : (i.proveedorId ? [i.proveedorId] : []);
                        const provNames = ids.map((id) => proveedorLabelById[id] || '—').filter(Boolean);
                        const low = Number(i.stockActual || 0) < Number(i.stockMinimo || 0);
                        const isSelected = selectedItemId === i.id;
                        return (
                          <tr
                            key={i.id}
                            onClick={() => selectItem(i)}
                            className={`border-t border-gray-200/60 dark:border-gris-600/60 align-top cursor-pointer ${isSelected ? 'bg-gray-50 dark:bg-gris-700/40' : 'hover:bg-gray-50/60 dark:hover:bg-gris-700/20'}`}
                          >
                            <td className="py-2 pr-3">
                              <Badge tone={low ? 'danger' : 'success'}>{low ? 'Bajo' : 'Ok'}</Badge>
                            </td>
                            <td className="py-2 pr-3">
                              {i.fotoDataUrl ? (
                                <img
                                  src={i.fotoDataUrl}
                                  alt={i.nombre || 'foto'}
                                  className="h-10 w-10 rounded object-cover border border-gray-200 dark:border-gris-600"
                                />
                              ) : (
                                <div className="h-10 w-10 rounded border border-dashed border-gray-300 dark:border-gris-600 bg-gray-50 dark:bg-gris-800" />
                              )}
                            </td>
                            <td className="py-2 pr-3">
                              <div className="font-medium truncate max-w-[260px]" title={i.nombre || ''}>{i.nombre || '—'}</div>
                              <div className="text-[11px] opacity-70">SKU: {i.sku || '—'}{i.categoria ? ` · ${i.categoria}` : ''}</div>
                            </td>
                            <td className={`py-2 pr-3 whitespace-nowrap ${low ? 'text-red-600 dark:text-red-300 font-medium' : ''}`}>
                              <div>{i.stockActual ?? 0} {i.unidad || ''}</div>
                              {Number(i.stockMinimo || 0) > 0 && (
                                <div className="mt-1 h-1.5 w-16 rounded-full bg-gray-200 dark:bg-gris-600 overflow-hidden">
                                  <div
                                    className={`h-full rounded-full ${low ? 'bg-red-500' : 'bg-emerald-500'}`}
                                    style={{ width: `${Math.min(100, Math.round((Number(i.stockActual || 0) / Number(i.stockMinimo)) * 100))}%` }}
                                  />
                                </div>
                              )}
                            </td>
                            <td className="py-2 pr-3 whitespace-nowrap">{i.stockMinimo ?? 0}</td>
                            <td className="py-2 pr-3 whitespace-nowrap">{i.ubicacion || '—'}</td>
                            <td className="py-2 pr-3">
                              <div className="truncate max-w-[260px]" title={provNames.join(' · ')}>
                                {provNames.length ? provNames.join(' · ') : '—'}
                              </div>
                            </td>
                            <td className="py-2">
                              <div className="flex flex-wrap gap-1.5">
                                <button
                                  type="button"
                                  onClick={(e) => { e.stopPropagation(); startMovimiento(i, 'ingreso'); }}
                                  className="text-[11px] px-2.5 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-medium"
                                  title="Registrar ingreso"
                                >↑ Entrada</button>
                                <button
                                  type="button"
                                  onClick={(e) => { e.stopPropagation(); startMovimiento(i, 'salida'); }}
                                  className="text-[11px] px-2.5 py-1 rounded bg-red-600 hover:bg-red-500 text-white font-medium"
                                  title="Registrar salida"
                                >↓ Salida</button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Tarjetas (móvil) */}
                <div className="md:hidden mt-4 space-y-2">
                  {sortedItems.map((i) => {
                    const ids = Array.isArray(i.proveedorIds) ? i.proveedorIds : (i.proveedorId ? [i.proveedorId] : []);
                    const provNames = ids.map((id) => proveedorLabelById[id] || '—').filter(Boolean);
                    const low = Number(i.stockActual || 0) < Number(i.stockMinimo || 0);
                    return (
                      <div
                        key={i.id}
                        onClick={() => selectItem(i)}
                        className="rounded-lg border border-gray-200 dark:border-gris-700 p-3 bg-white dark:bg-gris-800 cursor-pointer"
                      >
                        <div className="flex items-start gap-3">
                          {i.fotoDataUrl ? (
                            <img src={i.fotoDataUrl} alt={i.nombre || 'foto'} className="h-12 w-12 rounded object-cover border border-gray-200 dark:border-gris-600 shrink-0" />
                          ) : (
                            <div className="h-12 w-12 rounded border border-dashed border-gray-300 dark:border-gris-600 bg-gray-50 dark:bg-gris-900 shrink-0" />
                          )}
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between gap-2">
                              <div className="font-medium text-sm truncate">{i.nombre || '—'}</div>
                              <Badge tone={low ? 'danger' : 'success'}>{low ? 'Bajo' : 'Ok'}</Badge>
                            </div>
                            <div className="text-[11px] opacity-70">SKU: {i.sku || '—'}{i.categoria ? ` · ${i.categoria}` : ''}</div>
                            <div className={`text-xs mt-1 ${low ? 'text-red-600 dark:text-red-300 font-medium' : ''}`}>Stock: {i.stockActual ?? 0} {i.unidad || ''} (mín. {i.stockMinimo ?? 0})</div>
                            <div className="text-[11px] opacity-70 truncate">{i.ubicacion || '—'}{provNames.length ? ` · ${provNames.join(', ')}` : ''}</div>
                          </div>
                        </div>
                        <div className="flex gap-2 mt-2">
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); startMovimiento(i, 'ingreso'); }}
                            className="flex-1 text-[11px] px-2.5 py-1.5 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-medium"
                          >↑ Entrada</button>
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); startMovimiento(i, 'salida'); }}
                            className="flex-1 text-[11px] px-2.5 py-1.5 rounded bg-red-600 hover:bg-red-500 text-white font-medium"
                          >↓ Salida</button>
                        </div>
                      </div>
                    );
                  })}
                </div>
                </>
              )}

              {selectedItem && (
                <div className="fixed inset-0 z-50">
                  <div
                    className="absolute inset-0 bg-black/40"
                    onClick={closeItemDetail}
                  />
                  <div className="absolute inset-0 p-4 flex items-start justify-center">
                    <div
                      role="dialog"
                      aria-modal="true"
                      className="w-full max-w-3xl rounded-xl border border-gray-200 dark:border-gris-700 bg-white dark:bg-gris-800 shadow-lg max-h-[calc(100vh-2rem)] overflow-hidden"
                    >
                      <div className="p-4 border-b border-gray-200 dark:border-gris-700 relative">
                        <button
                          type="button"
                          onClick={closeItemDetail}
                          className="absolute top-3 right-3 h-9 w-9 rounded border border-gray-300 dark:border-gris-600 bg-gray-50 dark:bg-gris-700 hover:bg-gray-100 dark:hover:bg-gris-600 flex items-center justify-center"
                          aria-label="Cerrar"
                          title="Cerrar"
                        >
                          <span className="text-base leading-none">✕</span>
                        </button>

                        <div className="text-sm font-medium">Ficha del item</div>
                        <div className="text-lg font-semibold mt-1 break-words">{selectedItem.nombre || '—'}</div>
                        <div className="text-xs opacity-70 mt-1">
                          SKU: {selectedItem.sku || '—'}{selectedItem.categoria ? ` · Cat: ${selectedItem.categoria}` : ''}{selectedItem.ubicacion ? ` · Ubic: ${selectedItem.ubicacion}` : ''}
                        </div>
                      </div>

                      <div className="p-4 overflow-y-auto max-h-[calc(100vh-10rem)] overscroll-contain">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                          <div className="rounded border border-gray-200 dark:border-gris-700 bg-gray-50 dark:bg-gris-700/30 p-3">
                            <div className="text-xs opacity-70">Stock</div>
                            <div className="text-sm font-medium">{selectedItem.stockActual ?? 0} {selectedItem.unidad || ''}</div>
                            <div className="text-xs opacity-70">Mínimo: {selectedItem.stockMinimo ?? 0}</div>
                          </div>
                          <div className="rounded border border-gray-200 dark:border-gris-700 bg-gray-50 dark:bg-gris-700/30 p-3">
                            <div className="text-xs opacity-70">Costo unitario</div>
                            <div className="text-sm font-medium">{formatCOP(selectedItem.costoUnitario ?? 0)}</div>
                            <div className="text-xs opacity-70">Ubicación: {selectedItem.ubicacion || '—'}</div>
                          </div>
                          <div className="rounded border border-gray-200 dark:border-gris-700 bg-gray-50 dark:bg-gris-700/30 p-3">
                            <div className="text-xs opacity-70">Proveedores</div>
                            <div className="text-sm flex flex-wrap gap-1.5">
                              {selectedItemProveedorIds.length ? (
                                selectedItemProveedorIds.map((id) => {
                                  const prov = proveedorById[id];
                                  const label = prov?.razonSocial || prov?.nombre || proveedorNameById[id] || id;
                                  return (
                                    <button
                                      key={id}
                                      type="button"
                                      onClick={() => { setSelectedProveedorId(id); setShowProveedorOverlay(true); }}
                                      className="text-xs px-2 py-1 rounded-full border border-gray-300 dark:border-gris-600 bg-white dark:bg-gris-800 hover:bg-gray-50 dark:hover:bg-gris-700"
                                      title="Ver proveedor"
                                    >
                                      {label}
                                    </button>
                                  );
                                })
                              ) : (
                                <span>Sin proveedores</span>
                              )}
                            </div>
                            <div className="text-xs opacity-70 mt-1">Productos: {Array.isArray(selectedItem.productoTipos) ? (selectedItem.productoTipos.filter(Boolean).join(' · ') || '—') : (selectedItem.productoTipo || '—')}</div>
                          </div>
                        </div>

                        {selectedItem.fotoDataUrl ? (
                          <div className="mt-3 flex items-start gap-3">
                            <img
                              src={selectedItem.fotoDataUrl}
                              alt={selectedItem.nombre || 'foto'}
                              className="w-24 h-24 object-cover rounded border border-gray-200 dark:border-gris-700"
                            />
                            <div className="text-xs opacity-70">
                              <div>Imagen: {selectedItem.fotoFileName || '—'}</div>
                              <div>Tamaño: {dataUrlSizeLabel(selectedItem.fotoDataUrl)}</div>
                            </div>
                          </div>
                        ) : null}

                        <div className="mt-4 flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => startMovimiento(selectedItem, 'ingreso')}
                            className="text-xs px-3 py-2 rounded bg-green-600 hover:bg-green-500 text-white"
                          >Ingreso</button>
                          <button
                            type="button"
                            onClick={() => startMovimiento(selectedItem, 'salida')}
                            className="text-xs px-3 py-2 rounded bg-red-600 hover:bg-red-500 text-white"
                          >Salida</button>
                          <button
                            type="button"
                            onClick={() => setShowSelectedItemMovs((v) => !v)}
                            className="text-xs px-3 py-2 rounded border border-gray-300 dark:border-gris-600 bg-gray-50 dark:bg-gris-700 hover:bg-gray-100 dark:hover:bg-gris-600"
                          >{showSelectedItemMovs ? 'Ocultar movimientos' : 'Mostrar movimientos'}</button>
                          <button
                            type="button"
                            onClick={async () => {
                              try {
                                setMovimientosLoadingItemId(selectedItem.id);
                                const lista = await listarMovimientosPorItem(selectedItem.id, { max: 50 });
                                setMovimientosCache((c) => ({ ...c, [selectedItem.id]: lista }));
                              } catch (e) {
                                console.error(e);
                                toast.error('No se pudo refrescar');
                              } finally {
                                setMovimientosLoadingItemId("");
                              }
                            }}
                            className="text-xs px-3 py-2 rounded border border-gray-300 dark:border-gris-600 bg-gray-50 dark:bg-gris-700 hover:bg-gray-100 dark:hover:bg-gris-600"
                          >Refrescar movimientos</button>
                        </div>

                        {showSelectedItemMovs && (
                          <div className="mt-3 rounded border border-gray-200 dark:border-gris-600 bg-white/60 dark:bg-gris-800/40 p-3">
                            <div className="text-sm font-medium">Ultimos movimientos</div>
                            {movimientosLoadingItemId === selectedItem.id ? (
                              <div className="text-sm opacity-70 mt-2">Cargando...</div>
                            ) : (Array.isArray(movimientosCache[selectedItem.id]) && movimientosCache[selectedItem.id].length === 0) ? (
                              <div className="text-sm opacity-70 mt-2">Sin movimientos.</div>
                            ) : Array.isArray(movimientosCache[selectedItem.id]) ? (
                              <div className="mt-2 overflow-x-auto">
                                <table className="w-full text-xs">
                                  <thead>
                                    <tr className="text-left opacity-70">
                                      <th className="py-1 pr-3">Fecha</th>
                                      <th className="py-1 pr-3">Tipo</th>
                                      <th className="py-1 pr-3">Cant.</th>
                                      <th className="py-1 pr-3">Stock</th>
                                      <th className="py-1 pr-3">Proveedor</th>
                                      <th className="py-1 pr-3">Costo</th>
                                      <th className="py-1">Nota</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {movimientosCache[selectedItem.id].map((m) => (
                                      <tr key={m.id} className="border-t border-gray-200/60 dark:border-gris-600/60">
                                        <td className="py-1 pr-3 whitespace-nowrap">{formatMovimientoFecha(m.createdAt)}</td>
                                        <td className="py-1 pr-3">{m.tipo === 'salida' ? 'Salida' : 'Ingreso'}</td>
                                        <td className="py-1 pr-3">{m.cantidad ?? ''}</td>
                                        <td className="py-1 pr-3">{typeof m.stockAntes !== 'undefined' ? `${m.stockAntes} -> ${m.stockDespues}` : ''}</td>
                                        <td className="py-1 pr-3">{proveedorLabelById[m.proveedorId] || '—'}</td>
                                        <td className="py-1 pr-3">{m.costoUnitario ? formatCOP(m.costoUnitario) : '—'}</td>
                                        <td className="py-1">{m.nota || ''}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            ) : (
                              <div className="text-sm opacity-70 mt-2">Selecciona "Refrescar movimientos".</div>
                            )}
                          </div>
                        )}
                      </div>

                      <div className="p-4 border-t border-gray-200 dark:border-gris-700 bg-white dark:bg-gris-800">
                        <div className="flex flex-col sm:flex-row gap-2 sm:justify-end">
                          <button
                            type="button"
                            onClick={() => startEditarItem(selectedItem)}
                            className="text-xs px-3 py-2 rounded bg-indigo-600 hover:bg-indigo-700 text-white inline-flex items-center justify-center gap-2"
                          >
                            <span aria-hidden>✎</span>
                            Editar
                          </button>
                          <button
                            type="button"
                            onClick={() => handleEliminarItem(selectedItem)}
                            className="text-xs px-3 py-2 rounded bg-red-600 hover:bg-red-500 text-white inline-flex items-center justify-center gap-2"
                          >
                            <span aria-hidden>🗑</span>
                            Eliminar
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </>
      )}
    </section>
  );
}
