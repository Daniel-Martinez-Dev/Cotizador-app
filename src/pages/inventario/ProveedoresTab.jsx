import React from "react";
import EmptyState from "../../components/ui/EmptyState";
import { toggleSort, sortArrow } from "./inventarioUtils";

// Pestaña "Proveedores": listado + ficha de detalle del proveedor seleccionado.
// El estado (proveedores, selección) vive en InventarioPage; este componente
// es puramente presentacional.
export default function ProveedoresTab({
  isActive,
  sectionOpen,
  onToggleSection,
  proveedoresSearch,
  setProveedoresSearch,
  filteredCount,
  totalCount,
  sortedProveedores,
  provSort,
  setProvSort,
  selectedProveedorId,
  setSelectedProveedorId,
  setSelectedItemId,
  showProveedorOverlay,
  setShowProveedorOverlay,
  selectedProveedor,
  selectedProveedorItemList,
  showSelectedProveedorItems,
  setShowSelectedProveedorItems,
  ensureMovimientosForItem,
  startEditarProveedor,
  handleEliminarProveedor,
}) {
  const openProveedor = (id) => { setSelectedItemId(''); setSelectedProveedorId(id); setShowProveedorOverlay(true); };

  return (
    <>
      <section className={`${isActive ? "" : "hidden"} mt-5 bg-white dark:bg-gris-800 border border-gray-200 dark:border-gris-700 rounded-lg p-4`}>
        <div className="flex items-center justify-between gap-3">
          <div className="font-medium">Proveedores</div>
          <div className="flex gap-2">
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
                <div className="text-[11px] opacity-70">Buscar (razón social, NIT, contacto, ciudad, modalidad, pago).</div>
                <input
                  value={proveedoresSearch}
                  onChange={(e) => setProveedoresSearch(e.target.value)}
                  placeholder="Ej: nit 900 bogotá credito"
                  className="mt-1 w-full bg-transparent outline-none text-sm"
                />
              </div>
              <div className="text-xs opacity-70 pt-2">Mostrando: {filteredCount} / {totalCount}</div>
            </div>

            {sortedProveedores.length === 0 ? (
              <EmptyState icon="🚚" title="Sin resultados" />
            ) : (
              <>
              <div className="hidden md:block mt-4 rounded-lg border border-gray-200 dark:border-gris-700 overflow-auto max-h-[420px]">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-left opacity-70">
                      <th className="py-2 pr-3 cursor-pointer select-none" onClick={() => toggleSort(setProvSort, provSort, 'razonSocial')}>Razón social{sortArrow(provSort, 'razonSocial')}</th>
                      <th className="py-2 pr-3 cursor-pointer select-none" onClick={() => toggleSort(setProvSort, provSort, 'nit')}>NIT{sortArrow(provSort, 'nit')}</th>
                      <th className="py-2 pr-3 cursor-pointer select-none" onClick={() => toggleSort(setProvSort, provSort, 'leadTimeDias')}>Lead time{sortArrow(provSort, 'leadTimeDias')}</th>
                      <th className="py-2 pr-3 cursor-pointer select-none" onClick={() => toggleSort(setProvSort, provSort, 'modalidadEntrega')}>Entrega{sortArrow(provSort, 'modalidadEntrega')}</th>
                      <th className="py-2 pr-3 cursor-pointer select-none" onClick={() => toggleSort(setProvSort, provSort, 'tipoPago')}>Pago{sortArrow(provSort, 'tipoPago')}</th>
                      <th className="py-2 cursor-pointer select-none" onClick={() => toggleSort(setProvSort, provSort, 'contacto')}>Contacto{sortArrow(provSort, 'contacto')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedProveedores.map((p) => {
                      const isSelected = selectedProveedorId === p.id;
                      const contacto = p.contacto || (Array.isArray(p.contactos) ? (p.contactos[0]?.nombre || '') : '');
                      return (
                        <tr
                          key={p.id}
                          onClick={() => openProveedor(p.id)}
                          className={`border-t border-gray-200/60 dark:border-gris-600/60 align-top ${isSelected ? 'bg-gray-50 dark:bg-gris-700/40' : 'hover:bg-gray-50/60 dark:hover:bg-gris-700/20 cursor-pointer'}`}
                        >
                          <td className="py-2 pr-3">
                            <div className="font-medium truncate max-w-[320px]" title={p.razonSocial || p.nombre || ''}>{p.razonSocial || p.nombre || '—'}</div>
                          </td>
                          <td className="py-2 pr-3 whitespace-nowrap">{p.nit || '—'}</td>
                          <td className="py-2 pr-3 whitespace-nowrap">{Number(p.leadTimeDias ?? 0)} días</td>
                          <td className="py-2 pr-3 whitespace-nowrap">{p.modalidadEntrega || '—'}</td>
                          <td className="py-2 pr-3 whitespace-nowrap">{p.tipoPago || '—'}</td>
                          <td className="py-2">
                            <div className="truncate max-w-[340px]" title={contacto}>{contacto || '—'}</div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Tarjetas (móvil) */}
              <div className="md:hidden mt-4 space-y-2">
                {sortedProveedores.map((p) => {
                  const contacto = p.contacto || (Array.isArray(p.contactos) ? (p.contactos[0]?.nombre || '') : '');
                  return (
                    <div
                      key={p.id}
                      onClick={() => openProveedor(p.id)}
                      className="rounded-lg border border-gray-200 dark:border-gris-700 p-3 bg-white dark:bg-gris-800 cursor-pointer"
                    >
                      <div className="font-medium text-sm truncate">{p.razonSocial || p.nombre || '—'}</div>
                      <div className="text-[11px] opacity-70">NIT: {p.nit || '—'} · Lead time: {Number(p.leadTimeDias ?? 0)} días</div>
                      <div className="text-[11px] opacity-70">{p.modalidadEntrega || '—'} · {p.tipoPago || '—'}</div>
                      {contacto && <div className="text-[11px] opacity-70 truncate">Contacto: {contacto}</div>}
                    </div>
                  );
                })}
              </div>
              </>
            )}
          </>
        )}
      </section>

      {showProveedorOverlay && selectedProveedorId && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowProveedorOverlay(false)} />
          <div className="absolute inset-0 p-4 flex items-start justify-center">
            <div className="w-full max-w-2xl rounded-xl border border-gray-200 dark:border-gris-700 bg-white dark:bg-gris-800 shadow-lg max-h-[calc(100vh-2rem)] overflow-hidden">
              <div className="p-4 border-b border-gray-200 dark:border-gris-700 flex items-start justify-between gap-3">
                <div>
                  <div className="text-sm font-medium">Proveedor</div>
                  <div className="text-lg font-semibold mt-1 break-words">
                    {selectedProveedor
                      ? (selectedProveedor.razonSocial || selectedProveedor.nombre || '—')
                      : 'Cargando...'}
                  </div>
                  {selectedProveedor && (
                    <>
                      <div className="text-xs opacity-70 mt-1">NIT: {selectedProveedor.nit || '—'} - Lead time: {Number(selectedProveedor.leadTimeDias ?? 0)} dias</div>
                      <div className="text-xs opacity-70">Entrega: {selectedProveedor.modalidadEntrega || '—'} - Pago: {selectedProveedor.tipoPago || '—'}</div>
                    </>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setShowProveedorOverlay(false)}
                  aria-label="Cerrar"
                  title="Cerrar"
                  className="h-8 w-8 rounded border border-gray-300 dark:border-gris-600 bg-gray-50 dark:bg-gris-700 hover:bg-gray-100 dark:hover:bg-gris-600 flex items-center justify-center"
                >
                  <span className="text-base leading-none">✕</span>
                </button>
              </div>
              <div className="p-4 overflow-y-auto max-h-[calc(100vh-10rem)] overscroll-contain">
                {selectedProveedor ? (
                  <>
                    <div className="grid grid-cols-1 gap-3">
                      <div className="rounded border border-gray-200 dark:border-gris-700 bg-gray-50 dark:bg-gris-700/30 p-3">
                        <div className="text-xs opacity-70">Contactos</div>
                        <div className="text-sm mt-1">
                          {Array.isArray(selectedProveedor.contactos) && selectedProveedor.contactos.length ? (
                            selectedProveedor.contactos.slice(0, 3).map((c, idx) => (
                              <div key={idx} className="text-xs">
                                {c.nombre || '—'}{c.telefono ? ` - ${c.telefono}` : ''}{c.correo ? ` - ${c.correo}` : ''}
                              </div>
                            ))
                          ) : (
                            <div className="text-xs">{selectedProveedor.contacto || '—'}{selectedProveedor.telefono ? ` - ${selectedProveedor.telefono}` : ''}{selectedProveedor.email ? ` - ${selectedProveedor.email}` : ''}</div>
                          )}
                        </div>
                      </div>

                      <div className="rounded border border-gray-200 dark:border-gris-700 bg-gray-50 dark:bg-gris-700/30 p-3">
                        <div className="text-xs opacity-70">Sedes</div>
                        <div className="text-sm mt-1">
                          {Array.isArray(selectedProveedor.sedes) && selectedProveedor.sedes.length ? (
                            selectedProveedor.sedes.slice(0, 3).map((s, idx) => (
                              <div key={idx} className="text-xs">{s.direccion || '—'}{s.ciudad ? ` - ${s.ciudad}` : ''}</div>
                            ))
                          ) : (
                            <div className="text-xs">—</div>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="mt-3 flex items-center justify-between gap-2">
                      <div className="text-xs opacity-70">Items asociados: {selectedProveedorItemList.length}</div>
                      <button
                        type="button"
                        onClick={() => setShowSelectedProveedorItems((v) => !v)}
                        className="text-xs px-3 py-2 rounded border border-gray-300 dark:border-gris-600 bg-gray-50 dark:bg-gris-700 hover:bg-gray-100 dark:hover:bg-gris-600"
                      >{showSelectedProveedorItems ? 'Ocultar items' : 'Mostrar items'}</button>
                    </div>

                    {showSelectedProveedorItems && (
                      <div className="mt-2 overflow-x-auto">
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="text-left opacity-70">
                              <th className="py-1 pr-3">Item</th>
                              <th className="py-1 pr-3">SKU</th>
                              <th className="py-1 pr-3">Stock</th>
                              <th className="py-1">Ubicacion</th>
                            </tr>
                          </thead>
                          <tbody>
                            {selectedProveedorItemList.slice(0, 50).map((it) => (
                              <tr
                                key={it.id}
                                onClick={() => {
                                  setShowProveedorOverlay(false);
                                  setSelectedItemId(it.id);
                                  ensureMovimientosForItem(it.id);
                                }}
                                className="border-t border-gray-200/60 dark:border-gris-600/60 hover:bg-gray-50/60 dark:hover:bg-gris-700/20 cursor-pointer"
                              >
                                <td className="py-1 pr-3 font-medium">{it.nombre || '—'}</td>
                                <td className="py-1 pr-3">{it.sku || '—'}</td>
                                <td className="py-1 pr-3">{it.stockActual ?? 0}</td>
                                <td className="py-1">{it.ubicacion || '—'}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}

                    <div className="mt-4 flex flex-col sm:flex-row gap-2 sm:justify-end">
                      <button
                        type="button"
                        onClick={() => { setShowProveedorOverlay(false); startEditarProveedor(selectedProveedor); }}
                        className="text-xs px-3 py-2 rounded bg-indigo-600 hover:bg-indigo-700 text-white inline-flex items-center justify-center gap-2"
                      >
                        <span aria-hidden>✎</span>
                        Editar
                      </button>
                      <button
                        type="button"
                        onClick={() => handleEliminarProveedor(selectedProveedor)}
                        className="text-xs px-3 py-2 rounded bg-red-600 hover:bg-red-500 text-white inline-flex items-center justify-center gap-2"
                      >
                        <span aria-hidden>🗑</span>
                        Eliminar
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="text-sm opacity-70">Cargando proveedor...</div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
