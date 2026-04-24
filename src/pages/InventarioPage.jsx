import React from "react";
import toast from "react-hot-toast";
import { PRODUCTOS_ACTIVOS } from "../data/catalogoProductos";
import { compressImageFileToDataURL, dataUrlSizeLabel } from "../utils/imageCompress";
import {
  actualizarItemInventario,
  crearItemInventario,
  crearProveedor,
  actualizarProveedor,
  eliminarProveedor,
  eliminarItemInventario,
  listarItemsInventario,
  listarProveedores,
  registrarMovimientoInventario,
  listarMovimientosPorItem,
  listarMovimientosGeneral,
  actualizarMovimientoInventario,
  eliminarMovimientoInventario,
} from "../utils/firebaseInventory";

export default function InventarioPage() {
  const [activeCreate, setActiveCreate] = React.useState("materia"); // materia | proveedor
  const [showAdmin, setShowAdmin] = React.useState(false);
  const [sectionsOpen, setSectionsOpen] = React.useState({
    inventario: true,
    proveedores: true,
    movimientos: true,
    proveedoresRecientes: true,
    itemsRecientes: true,
  });
  const emptySede = React.useMemo(() => ({ direccion: "", ciudad: "" }), []);
  const emptyContacto = React.useMemo(() => ({ nombre: "", telefono: "", correo: "" }), []);
  const [provForm, setProvForm] = React.useState({
    razonSocial: "",
    nit: "",
    leadTimeDias: 0,
    sedes: [emptySede],
    contactos: [emptyContacto],
    modalidadEntrega: "", // envio_nacional | envio_bogota | recoger
    tipoPago: "", // credito | al_pedir | al_recoger
    materiaPrimaItemIds: [], // inventario_items ids
  });
  const [editingProveedorId, setEditingProveedorId] = React.useState("");
  const [itemForm, setItemForm] = React.useState({ sku: "", nombre: "", productoTipos: [], categoria: "", unidad: "", stockActual: 0, stockMinimo: 0, ubicacion: "", costoUnitario: 0, proveedorId: "", proveedorIds: [], fotoDataUrl: "", fotoFileName: "", fotoMimeType: "" });
  const [editingItemId, setEditingItemId] = React.useState("");
  const [productoSearch, setProductoSearch] = React.useState("");
  const [provMateriaSearch, setProvMateriaSearch] = React.useState("");
  const [proveedorSearch, setProveedorSearch] = React.useState("");

  const allProductoTipos = React.useMemo(
    () => [...PRODUCTOS_ACTIVOS, "Productos Personalizados", "Repuestos"],
    []
  );

  const [proveedores, setProveedores] = React.useState([]);
  const [items, setItems] = React.useState([]);
  const [loading, setLoading] = React.useState(false);
  const [itemsSearch, setItemsSearch] = React.useState("");
  const [mov, setMov] = React.useState({ itemId: "", tipo: "", cantidad: 1, nota: "" });
  const [movimientosOpenItemId, setMovimientosOpenItemId] = React.useState("");
  const [movimientosLoadingItemId, setMovimientosLoadingItemId] = React.useState("");
  const [movimientosCache, setMovimientosCache] = React.useState({}); // itemId -> movimientos[]

  const [proveedoresSearch, setProveedoresSearch] = React.useState("");

  const [movGeneralLoaded, setMovGeneralLoaded] = React.useState(false);
  const [movGeneralLoading, setMovGeneralLoading] = React.useState(false);
  const [movGeneralSearch, setMovGeneralSearch] = React.useState("");
  const [movGeneral, setMovGeneral] = React.useState([]);
  const [editingMovId, setEditingMovId] = React.useState("");
  const [editingMovForm, setEditingMovForm] = React.useState({ tipo: "ingreso", cantidad: 1, nota: "" });

  const toggleSection = (key) => {
    setSectionsOpen((p) => ({ ...p, [key]: !p[key] }));
  };

  const load = async () => {
    setLoading(true);
    try {
      const [p, i] = await Promise.all([listarProveedores(), listarItemsInventario()]);
      setProveedores(p);
      setItems(i);
    } catch (e) {
      console.error(e);
      toast.error("No se pudo cargar inventario");
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    load();
  }, []);

  const sanitizeNIT = (nit) => (nit ?? "").toString().replace(/[\"“”]/g, "").trim();

  const validarProveedorForm = (form) => {
    if (!form.razonSocial?.trim()) return "Razón social requerida";
    if (!sanitizeNIT(form.nit)) return "NIT requerido";
    const leadTime = Number(form.leadTimeDias || 0);
    if (Number.isNaN(leadTime) || leadTime < 0) return "Lead time no puede ser negativo";
    const sedes = Array.isArray(form.sedes) ? form.sedes : [];
    if (sedes.length === 0) return "Debe agregar al menos una sede";
    const sedeOk = sedes.some((s) => (s?.direccion || "").trim() && (s?.ciudad || "").trim());
    if (!sedeOk) return "La sede debe tener dirección y ciudad";
    const contactos = Array.isArray(form.contactos) ? form.contactos : [];
    if (contactos.length === 0) return "Debe agregar al menos un contacto";
    const contactoOk = contactos.some((c) => (c?.nombre || "").trim() && (c?.telefono || "").trim() && (c?.correo || "").trim());
    if (!contactoOk) return "El contacto debe tener nombre, teléfono y correo";
    if (!form.modalidadEntrega) return "Selecciona modalidad de entrega";
    if (!form.tipoPago) return "Selecciona tipo de pago";
    return null;
  };

  const resetProveedorForm = () => {
    setProvForm({
      razonSocial: "",
      nit: "",
      leadTimeDias: 0,
      sedes: [emptySede],
      contactos: [emptyContacto],
      modalidadEntrega: "",
      tipoPago: "",
      materiaPrimaItemIds: [],
    });
    setEditingProveedorId("");
    setProvMateriaSearch("");
  };

  const validarItemForm = (form) => {
    if (!form.nombre?.trim()) return "Nombre del item requerido";
    const stockActual = Number(form.stockActual);
    const stockMinimo = Number(form.stockMinimo);
    const costoUnitario = Number(form.costoUnitario);
    if (Number.isNaN(stockActual) || stockActual < 0) return "Stock actual no puede ser negativo";
    if (Number.isNaN(stockMinimo) || stockMinimo < 0) return "Stock mínimo no puede ser negativo";
    if (Number.isNaN(costoUnitario) || costoUnitario < 0) return "Costo unitario no puede ser negativo";
    return null;
  };

  const resetItemForm = () => {
    setItemForm({ sku: "", nombre: "", productoTipos: [], categoria: "", unidad: "", stockActual: 0, stockMinimo: 0, ubicacion: "", costoUnitario: 0, proveedorId: "", proveedorIds: [], fotoDataUrl: "", fotoFileName: "", fotoMimeType: "" });
    setEditingItemId("");
    setProductoSearch("");
    setProveedorSearch("");
  };

  const submitProveedor = async (e) => {
    e.preventDefault();
    try {
      const errMsg = validarProveedorForm(provForm);
      if (errMsg) return toast.error(errMsg);

      const contactos = Array.isArray(provForm.contactos) ? provForm.contactos : [];
      const primerContacto = contactos.find((c) => (c?.nombre || c?.telefono || c?.correo)) || {};

      const payload = {
        // Compatibilidad: mantenemos nombre/contacto/telefono/email
        nombre: provForm.razonSocial,
        razonSocial: provForm.razonSocial,
        nit: sanitizeNIT(provForm.nit),
        sedes: provForm.sedes,
        contactos: provForm.contactos,
        modalidadEntrega: provForm.modalidadEntrega,
        tipoPago: provForm.tipoPago,
        contacto: (primerContacto?.nombre || "").trim(),
        telefono: (primerContacto?.telefono || "").trim(),
        email: (primerContacto?.correo || "").trim(),
        leadTimeDias: Number(provForm.leadTimeDias || 0),
      };

      if (editingProveedorId) {
        await actualizarProveedor(editingProveedorId, payload);
        const provId = editingProveedorId;
        const selected = new Set(Array.isArray(provForm.materiaPrimaItemIds) ? provForm.materiaPrimaItemIds : []);
        const pending = [];
        for (const it of items) {
          const currentIds = Array.isArray(it.proveedorIds)
            ? it.proveedorIds
            : (it.proveedorId ? [it.proveedorId] : []);
          const shouldHave = selected.has(it.id);
          const has = currentIds.includes(provId);
          if (shouldHave && !has) pending.push({ id: it.id, proveedorIds: [...currentIds, provId] });
          if (!shouldHave && has) pending.push({ id: it.id, proveedorIds: currentIds.filter((x) => x !== provId) });
        }
        await Promise.all(pending.map((p) => actualizarItemInventario(p.id, { proveedorIds: p.proveedorIds })));
        toast.success("Proveedor actualizado");
      } else {
        const provId = await crearProveedor(payload);
        const selected = new Set(Array.isArray(provForm.materiaPrimaItemIds) ? provForm.materiaPrimaItemIds : []);
        const pending = [];
        for (const it of items) {
          if (!selected.has(it.id)) continue;
          const currentIds = Array.isArray(it.proveedorIds)
            ? it.proveedorIds
            : (it.proveedorId ? [it.proveedorId] : []);
          if (currentIds.includes(provId)) continue;
          pending.push({ id: it.id, proveedorIds: [...currentIds, provId] });
        }
        await Promise.all(pending.map((p) => actualizarItemInventario(p.id, { proveedorIds: p.proveedorIds })));
        toast.success("Proveedor creado");
      }

      resetProveedorForm();
      await load();
    } catch (err) {
      console.error(err);
      toast.error(editingProveedorId ? "No se pudo actualizar el proveedor" : "No se pudo crear el proveedor");
    }
  };

  const startEditarProveedor = (prov) => {
    const contactos = Array.isArray(prov.contactos) && prov.contactos.length > 0
      ? prov.contactos
      : ((prov.contacto || prov.telefono || prov.email)
        ? [{ nombre: prov.contacto || "", telefono: prov.telefono || "", correo: prov.email || "" }]
        : [emptyContacto]);

    const sedes = Array.isArray(prov.sedes) && prov.sedes.length > 0
      ? prov.sedes
      : [emptySede];

    setEditingProveedorId(prov.id);

    const materiaPrimaItemIds = items
      .filter((it) => {
        const ids = Array.isArray(it.proveedorIds)
          ? it.proveedorIds
          : (it.proveedorId ? [it.proveedorId] : []);
        return ids.includes(prov.id);
      })
      .map((it) => it.id);

    setProvForm({
      razonSocial: prov.razonSocial || prov.nombre || "",
      nit: sanitizeNIT(prov.nit || ""),
      leadTimeDias: Number(prov.leadTimeDias ?? 0),
      sedes,
      contactos,
      modalidadEntrega: prov.modalidadEntrega || "",
      tipoPago: prov.tipoPago || "",
      materiaPrimaItemIds,
    });
    setProvMateriaSearch("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleEliminarProveedor = async (prov) => {
    if (items.some((it) => (Array.isArray(it.proveedorIds) ? it.proveedorIds : (it.proveedorId ? [it.proveedorId] : [])).includes(prov.id))) {
      toast.error("No se puede eliminar: hay items asociados a este proveedor");
      return;
    }
    const ok = window.confirm(`¿Eliminar el proveedor "${prov.nombre || ""}"?`);
    if (!ok) return;
    try {
      await eliminarProveedor(prov.id);
      toast.success("Proveedor eliminado");
      if (editingProveedorId === prov.id) resetProveedorForm();
      await load();
    } catch (e) {
      console.error(e);
      toast.error("No se pudo eliminar el proveedor");
    }
  };

  const submitItem = async (e) => {
    e.preventDefault();
    try {
      const errMsg = validarItemForm(itemForm);
      if (errMsg) return toast.error(errMsg);

      const payload = {
        sku: itemForm.sku,
        nombre: itemForm.nombre,
        productoTipos: itemForm.productoTipos,
        categoria: itemForm.categoria,
        unidad: itemForm.unidad,
        stockActual: Number(itemForm.stockActual || 0),
        stockMinimo: Number(itemForm.stockMinimo || 0),
        ubicacion: itemForm.ubicacion,
        costoUnitario: Number(itemForm.costoUnitario || 0),
        proveedorId: itemForm.proveedorId,
        proveedorIds: Array.isArray(itemForm.proveedorIds)
          ? itemForm.proveedorIds
          : (itemForm.proveedorId ? [itemForm.proveedorId] : []),
        fotoDataUrl: itemForm.fotoDataUrl,
        fotoFileName: itemForm.fotoFileName,
        fotoMimeType: itemForm.fotoMimeType,
      };

      if (editingItemId) {
        await actualizarItemInventario(editingItemId, payload);
        toast.success("Item actualizado");
      } else {
        await crearItemInventario(payload);
        toast.success("Item creado");
      }

      resetItemForm();
      await load();
    } catch (err) {
      console.error(err);
      toast.error(editingItemId ? "No se pudo actualizar el item" : "No se pudo crear el item");
    }
  };

  const startEditarItem = (item) => {
    setEditingItemId(item.id);
    const productoTipos = Array.isArray(item.productoTipos)
      ? item.productoTipos.filter(Boolean)
      : (item.productoTipo ? [item.productoTipo] : []);

    const proveedorIds = Array.isArray(item.proveedorIds)
      ? item.proveedorIds.filter(Boolean)
      : (item.proveedorId ? [item.proveedorId] : []);

    setItemForm({
      sku: item.sku || "",
      nombre: item.nombre || "",
      productoTipos,
      categoria: item.categoria || "",
      unidad: item.unidad || "",
      stockActual: Number(item.stockActual ?? item.stockActual ?? 0),
      stockMinimo: Number(item.stockMinimo ?? 0),
      ubicacion: item.ubicacion || "",
      costoUnitario: Number(item.costoUnitario ?? 0),
      proveedorId: proveedorIds[0] || (item.proveedorId || ""),
      proveedorIds,
      fotoDataUrl: item.fotoDataUrl || "",
      fotoFileName: item.fotoFileName || "",
      fotoMimeType: item.fotoMimeType || "",
    });
    setProductoSearch("");
    setProveedorSearch("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const toggleProductoTipo = (tipo) => {
    setItemForm((prev) => {
      const current = Array.isArray(prev.productoTipos) ? prev.productoTipos : [];
      if (current.includes(tipo)) return { ...prev, productoTipos: current.filter((t) => t !== tipo) };
      return { ...prev, productoTipos: [...current, tipo] };
    });
  };

  const productosFiltrados = React.useMemo(() => {
    const q = (productoSearch || "").trim().toLowerCase();
    if (!q) return allProductoTipos;
    return allProductoTipos.filter((t) => String(t).toLowerCase().includes(q));
  }, [productoSearch, allProductoTipos]);

  const materiasPrimasFiltradas = React.useMemo(() => {
    const q = (provMateriaSearch || "").trim().toLowerCase();
    const base = Array.isArray(items) ? items : [];
    const arr = q
      ? base.filter((it) => {
          const hay = `${it.nombre || ""} ${it.sku || ""} ${it.categoria || ""}`.toLowerCase();
          return hay.includes(q);
        })
      : base;
    return arr.slice(0, 200);
  }, [provMateriaSearch, items]);

  const toggleMateriaPrimaItem = (itemId) => {
    setProvForm((prev) => {
      const current = Array.isArray(prev.materiaPrimaItemIds) ? prev.materiaPrimaItemIds : [];
      if (current.includes(itemId)) return { ...prev, materiaPrimaItemIds: current.filter((id) => id !== itemId) };
      return { ...prev, materiaPrimaItemIds: [...current, itemId] };
    });
  };

  const proveedoresFiltrados = React.useMemo(() => {
    const q = (proveedorSearch || "").trim().toLowerCase();
    if (!q) return proveedores;
    return (Array.isArray(proveedores) ? proveedores : []).filter((p) => {
      const hay = `${p.razonSocial || p.nombre || ""} ${p.nit || ""}`.toLowerCase();
      return hay.includes(q);
    });
  }, [proveedorSearch, proveedores]);

  const toggleItemProveedor = (provId) => {
    setItemForm((prev) => {
      const current = Array.isArray(prev.proveedorIds)
        ? prev.proveedorIds
        : (prev.proveedorId ? [prev.proveedorId] : []);
      if (current.includes(provId)) {
        const next = current.filter((x) => x !== provId);
        return { ...prev, proveedorIds: next, proveedorId: next[0] || "" };
      }
      const next = [...current, provId];
      return { ...prev, proveedorIds: next, proveedorId: next[0] || "" };
    });
  };

  const goCrearMateriaPrimaDesdeBusqueda = () => {
    const suggestion = (provMateriaSearch || "").trim();
    setActiveCreate("materia");
    if (suggestion) {
      setItemForm((p) => ({ ...p, nombre: p.nombre?.trim() ? p.nombre : suggestion }));
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const goCrearProveedorDesdeBusqueda = () => {
    const suggestion = (proveedorSearch || "").trim();
    setActiveCreate("proveedor");
    if (suggestion) {
      setProvForm((p) => ({ ...p, razonSocial: p.razonSocial?.trim() ? p.razonSocial : suggestion }));
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleFotoChange = async (file) => {
    if (!file) return;
    try {
      const dataUrl = await compressImageFileToDataURL(file, { maxWidth: 900, maxHeight: 900, quality: 0.65 });
      setItemForm((p) => ({
        ...p,
        fotoDataUrl: dataUrl,
        fotoFileName: file.name || "",
        fotoMimeType: file.type || "",
      }));
    } catch (e) {
      console.error(e);
      toast.error(e?.message || "No se pudo cargar la imagen");
    }
  };

  const handleEliminarItem = async (item) => {
    const ok = window.confirm(`¿Eliminar el item "${item.nombre || ""}"?`);
    if (!ok) return;
    try {
      await eliminarItemInventario(item.id);
      toast.success("Item eliminado");
      if (editingItemId === item.id) resetItemForm();
      await load();
    } catch (e) {
      console.error(e);
      toast.error("No se pudo eliminar el item");
    }
  };

  const proveedorNameById = React.useMemo(() => {
    const map = {};
    for (const p of proveedores) {
      map[p.id] = p.razonSocial || p.nombre || "";
    }
    return map;
  }, [proveedores]);

  const itemById = React.useMemo(() => {
    const map = {};
    for (const it of items) map[it.id] = it;
    return map;
  }, [items]);

  const normalizeTerms = (q) => (q || "")
    .toString()
    .toLowerCase()
    .split(/\s+/)
    .map((t) => t.trim())
    .filter(Boolean);

  const filteredProveedores = React.useMemo(() => {
    const terms = normalizeTerms(proveedoresSearch);
    if (terms.length === 0) return proveedores;
    return (Array.isArray(proveedores) ? proveedores : []).filter((p) => {
      const blob = [
        p.razonSocial,
        p.nombre,
        p.nit,
        p.contacto,
        p.telefono,
        p.email,
        Array.isArray(p.sedes) ? p.sedes.map((s) => `${s.direccion || ''} ${s.ciudad || ''}`).join(' ') : '',
        Array.isArray(p.contactos) ? p.contactos.map((c) => `${c.nombre || ''} ${c.telefono || ''} ${c.correo || ''}`).join(' ') : '',
        p.modalidadEntrega,
        p.tipoPago,
      ].filter(Boolean).join(' ').toLowerCase();
      return terms.every((t) => blob.includes(t));
    });
  }, [proveedores, proveedoresSearch]);

  const filteredMovGeneral = React.useMemo(() => {
    const terms = normalizeTerms(movGeneralSearch);
    if (terms.length === 0) return movGeneral;
    return (Array.isArray(movGeneral) ? movGeneral : []).filter((m) => {
      const it = itemById[m.itemId];
      const blob = [
        it?.nombre,
        it?.sku,
        m?.tipo,
        String(m?.cantidad ?? ''),
        String(m?.stockAntes ?? ''),
        String(m?.stockDespues ?? ''),
        m?.nota,
      ].filter(Boolean).join(' ').toLowerCase();
      return terms.every((t) => blob.includes(t));
    });
  }, [movGeneral, movGeneralSearch, itemById]);

  const loadMovGeneral = async () => {
    setMovGeneralLoading(true);
    try {
      const list = await listarMovimientosGeneral({ max: 200 });
      setMovGeneral(list);
      setMovGeneralLoaded(true);
    } catch (e) {
      console.error(e);
      toast.error("No se pudieron cargar los movimientos");
    } finally {
      setMovGeneralLoading(false);
    }
  };

  const startEditarMovimiento = (m) => {
    setEditingMovId(m.id);
    setEditingMovForm({
      tipo: m.tipo === 'salida' ? 'salida' : 'ingreso',
      cantidad: Number(m.cantidad || 1),
      nota: m.nota || "",
    });
  };

  const cancelEditarMovimiento = () => {
    setEditingMovId("");
    setEditingMovForm({ tipo: "ingreso", cantidad: 1, nota: "" });
  };

  const submitEditarMovimiento = async (e, movimiento) => {
    e.preventDefault();
    try {
      const it = itemById[movimiento.itemId];
      const isLatest = it?.lastMovimientoId && it.lastMovimientoId === movimiento.id;
      if (!isLatest) {
        // Permitir solo editar nota
        await actualizarMovimientoInventario(movimiento.id, { nota: editingMovForm.nota });
      } else {
        await actualizarMovimientoInventario(movimiento.id, {
          tipo: editingMovForm.tipo,
          cantidad: Number(editingMovForm.cantidad || 0),
          nota: editingMovForm.nota,
        });
      }
      toast.success("Movimiento actualizado");
      cancelEditarMovimiento();
      await load();
      await loadMovGeneral();
    } catch (err) {
      console.error(err);
      toast.error(err?.message || "No se pudo actualizar el movimiento");
    }
  };

  const handleEliminarMovimiento = async (movimiento) => {
    const it = itemById[movimiento.itemId];
    const isLatest = it?.lastMovimientoId && it.lastMovimientoId === movimiento.id;
    if (!isLatest) {
      toast.error("Solo se puede borrar el último movimiento del item");
      return;
    }
    const ok = window.confirm("¿Eliminar este movimiento? Esto revertirá el stock.");
    if (!ok) return;
    try {
      await eliminarMovimientoInventario(movimiento.id);
      toast.success("Movimiento eliminado");
      if (editingMovId === movimiento.id) cancelEditarMovimiento();
      await load();
      await loadMovGeneral();
    } catch (err) {
      console.error(err);
      toast.error(err?.message || "No se pudo eliminar el movimiento");
    }
  };

  const filteredItems = React.useMemo(() => {
    const terms = normalizeTerms(itemsSearch);
    if (terms.length === 0) return items;
    return (Array.isArray(items) ? items : []).filter((i) => {
      const ids = Array.isArray(i.proveedorIds) ? i.proveedorIds : (i.proveedorId ? [i.proveedorId] : []);
      const provNames = ids.map((id) => proveedorNameById[id] || "").filter(Boolean).join(" ");
      const blob = [
        i.nombre,
        i.sku,
        i.categoria,
        i.unidad,
        i.ubicacion,
        Array.isArray(i.productoTipos) ? i.productoTipos.join(" ") : i.productoTipo,
        provNames,
      ].filter(Boolean).join(" ").toLowerCase();
      return terms.every((t) => blob.includes(t));
    });
  }, [items, itemsSearch, proveedorNameById]);

  const startMovimiento = (item, tipo) => {
    setMov({ itemId: item.id, tipo, cantidad: 1, nota: "" });
  };

  const cancelMovimiento = () => setMov({ itemId: "", tipo: "", cantidad: 1, nota: "" });

  const submitMovimiento = async (e) => {
    e.preventDefault();
    try {
      if (!mov.itemId) return;
      const cantidad = Number(mov.cantidad || 0);
      if (Number.isNaN(cantidad) || cantidad <= 0) return toast.error("Cantidad inválida");
      await registrarMovimientoInventario(mov.itemId, { tipo: mov.tipo, cantidad, nota: mov.nota });
      toast.success(mov.tipo === 'salida' ? 'Salida registrada' : 'Ingreso registrado');
      // refrescar historial si está abierto
      if (movimientosOpenItemId === mov.itemId) {
        try {
          const lista = await listarMovimientosPorItem(mov.itemId, { max: 50 });
          setMovimientosCache((c) => ({ ...c, [mov.itemId]: lista }));
        } catch {}
      }
      cancelMovimiento();
      await load();
    } catch (err) {
      console.error(err);
      toast.error(err?.message || 'No se pudo registrar el movimiento');
    }
  };

  const formatMovimientoFecha = (ts) => {
    try {
      const d = ts?.toDate ? ts.toDate() : (ts?.seconds ? new Date(ts.seconds * 1000) : null);
      if (!d) return "";
      return d.toLocaleString();
    } catch {
      return "";
    }
  };

  const toggleMovimientos = async (itemId) => {
    if (!itemId) return;
    if (movimientosOpenItemId === itemId) {
      setMovimientosOpenItemId("");
      return;
    }
    setMovimientosOpenItemId(itemId);
    if (Array.isArray(movimientosCache[itemId])) return;
    try {
      setMovimientosLoadingItemId(itemId);
      const lista = await listarMovimientosPorItem(itemId, { max: 50 });
      setMovimientosCache((c) => ({ ...c, [itemId]: lista }));
    } catch (e) {
      console.error(e);
      toast.error("No se pudieron cargar los movimientos");
    } finally {
      setMovimientosLoadingItemId("");
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4">
      <h1 className="text-xl font-semibold">Inventario</h1>
      <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
        Base inicial: materia prima + proveedores (lead time).
      </p>

      <section className="mt-5 bg-white dark:bg-gris-800 border border-gray-200 dark:border-gris-700 rounded-lg p-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div className="font-medium">Listado de inventario</div>
          <div className="flex flex-col sm:flex-row gap-2">
            <button
              type="button"
              onClick={() => toggleSection('inventario')}
              className="text-xs px-3 py-2 rounded border border-gray-300 dark:border-gris-600 bg-gray-50 dark:bg-gris-700 hover:bg-gray-100 dark:hover:bg-gris-600"
            >
              {sectionsOpen.inventario ? 'Ocultar listado' : 'Mostrar listado'}
            </button>
            <button
              type="button"
              onClick={() => setShowAdmin((v) => !v)}
              className="text-xs px-3 py-2 rounded border border-gray-300 dark:border-gris-600 bg-gray-50 dark:bg-gris-700 hover:bg-gray-100 dark:hover:bg-gris-600"
            >
              {showAdmin ? 'Ocultar creación/edición' : 'Crear/editar materia prima y proveedores'}
            </button>
          </div>
        </div>

        {sectionsOpen.inventario && (
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
              <div className="text-xs opacity-70 pt-2">Mostrando: {filteredItems.length} / {items.length}</div>
            </div>

            {loading ? (
              <div className="text-sm opacity-70 mt-3">Cargando…</div>
            ) : (
              <div className="mt-4 space-y-2">
                {filteredItems.length === 0 ? (
                  <div className="text-sm opacity-70">Sin resultados.</div>
                ) : filteredItems
                  .slice()
                  .sort((a, b) => String(a.nombre || '').localeCompare(String(b.nombre || '')))
                  .map((i) => {
                    const ids = Array.isArray(i.proveedorIds) ? i.proveedorIds : (i.proveedorId ? [i.proveedorId] : []);
                    const provNames = ids.map((id) => proveedorNameById[id] || '—').filter(Boolean);
                    const low = Number(i.stockActual || 0) < Number(i.stockMinimo || 0);
                    const openMov = mov.itemId === i.id;
                    const openHist = movimientosOpenItemId === i.id;
                    const histLoading = movimientosLoadingItemId === i.id;
                    const hist = movimientosCache[i.id];
                    return (
                      <div key={i.id} className="rounded border border-gray-200 dark:border-gris-700 px-3 py-3">
                        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-3">
                          <div className="min-w-0">
                            <div className="text-sm font-medium truncate" title={i.nombre || ''}>{i.nombre || '—'}</div>
                            <div className="text-xs opacity-70">
                              SKU: {i.sku || '—'}{i.categoria ? ` · Cat: ${i.categoria}` : ''}{i.ubicacion ? ` · Ubic: ${i.ubicacion}` : ''}
                            </div>
                            <div className={`text-xs ${low ? 'text-red-600 dark:text-red-300' : 'opacity-70'}`}>
                              Stock: {i.stockActual ?? 0} {i.unidad || ''} · Mín: {i.stockMinimo ?? 0}
                            </div>
                            <div className="text-xs opacity-70">
                              Proveedores: {provNames.length ? provNames.slice(0, 3).join(' · ') + (provNames.length > 3 ? `…(+${provNames.length - 3})` : '') : '—'}
                            </div>
                            <div className="text-xs opacity-70">
                              Productos: {Array.isArray(i.productoTipos) ? (i.productoTipos.filter(Boolean).join(' · ') || '—') : (i.productoTipo || '—')}
                            </div>
                          </div>

                          <div className="flex flex-col sm:flex-row gap-2 flex-shrink-0">
                            <button
                              type="button"
                              onClick={() => startMovimiento(i, 'ingreso')}
                              className="text-xs px-3 py-2 rounded bg-green-600 hover:bg-green-500 text-white"
                            >
                              Ingreso
                            </button>
                            <button
                              type="button"
                              onClick={() => startMovimiento(i, 'salida')}
                              className="text-xs px-3 py-2 rounded bg-red-600 hover:bg-red-500 text-white"
                            >
                              Salida
                            </button>
                            <button
                              type="button"
                              onClick={() => startEditarItem(i)}
                              className="text-xs px-3 py-2 rounded bg-indigo-600 hover:bg-indigo-700 text-white"
                            >
                              Editar
                            </button>
                            <button
                              type="button"
                              onClick={() => toggleMovimientos(i.id)}
                              className="text-xs px-3 py-2 rounded border border-gray-300 dark:border-gris-600 bg-gray-50 dark:bg-gris-700 hover:bg-gray-100 dark:hover:bg-gris-600"
                            >
                              {openHist ? 'Ocultar movimientos' : 'Movimientos'}
                            </button>
                          </div>
                        </div>

                        {openMov && (
                          <form onSubmit={submitMovimiento} className="mt-3 grid grid-cols-1 md:grid-cols-[160px_1fr_auto] gap-2 items-end bg-gray-50 dark:bg-gris-700/50 border border-gray-200 dark:border-gris-600 rounded p-3">
                            <div>
                              <label className="text-xs text-gray-600 dark:text-gray-300">Cantidad ({mov.tipo})</label>
                              <input
                                type="number"
                                min={1}
                                value={mov.cantidad}
                                onChange={(e) => setMov((p) => ({ ...p, cantidad: Number(e.target.value) }))}
                                className="mt-1 w-full px-3 py-2 rounded border border-gray-300 dark:border-gris-600 bg-white dark:bg-gris-800"
                              />
                            </div>
                            <div>
                              <label className="text-xs text-gray-600 dark:text-gray-300">Nota (opcional)</label>
                              <input
                                value={mov.nota}
                                onChange={(e) => setMov((p) => ({ ...p, nota: e.target.value }))}
                                className="mt-1 w-full px-3 py-2 rounded border border-gray-300 dark:border-gris-600 bg-white dark:bg-gris-800"
                                placeholder="Factura, orden, responsable..."
                              />
                            </div>
                            <div className="flex gap-2 justify-end">
                              <button type="button" onClick={cancelMovimiento} className="text-xs px-3 py-2 rounded border border-gray-300 dark:border-gris-600 bg-white dark:bg-gris-800 hover:bg-gray-50 dark:hover:bg-gris-700">Cancelar</button>
                              <button type="submit" className="text-xs px-3 py-2 rounded bg-trafico text-black">Registrar</button>
                            </div>
                          </form>
                        )}

                        {openHist && (
                          <div className="mt-3 rounded border border-gray-200 dark:border-gris-600 bg-white/60 dark:bg-gris-800/40 p-3">
                            <div className="flex items-center justify-between gap-3">
                              <div className="text-sm font-medium">Últimos movimientos</div>
                              <button
                                type="button"
                                onClick={async () => {
                                  try {
                                    setMovimientosLoadingItemId(i.id);
                                    const lista = await listarMovimientosPorItem(i.id, { max: 50 });
                                    setMovimientosCache((c) => ({ ...c, [i.id]: lista }));
                                  } catch (e) {
                                    console.error(e);
                                    toast.error('No se pudo refrescar');
                                  } finally {
                                    setMovimientosLoadingItemId("");
                                  }
                                }}
                                className="text-xs px-3 py-2 rounded border border-gray-300 dark:border-gris-600 bg-gray-50 dark:bg-gris-700 hover:bg-gray-100 dark:hover:bg-gris-600"
                              >
                                Refrescar
                              </button>
                            </div>

                            {histLoading ? (
                              <div className="text-sm opacity-70 mt-2">Cargando…</div>
                            ) : (Array.isArray(hist) && hist.length === 0) ? (
                              <div className="text-sm opacity-70 mt-2">Sin movimientos.</div>
                            ) : Array.isArray(hist) ? (
                              <div className="mt-2 overflow-x-auto">
                                <table className="w-full text-xs">
                                  <thead>
                                    <tr className="text-left opacity-70">
                                      <th className="py-1 pr-3">Fecha</th>
                                      <th className="py-1 pr-3">Tipo</th>
                                      <th className="py-1 pr-3">Cant.</th>
                                      <th className="py-1 pr-3">Stock</th>
                                      <th className="py-1">Nota</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {hist.map((m) => (
                                      <tr key={m.id} className="border-t border-gray-200/60 dark:border-gris-600/60">
                                        <td className="py-1 pr-3 whitespace-nowrap">{formatMovimientoFecha(m.createdAt)}</td>
                                        <td className="py-1 pr-3">{m.tipo === 'salida' ? 'Salida' : 'Ingreso'}</td>
                                        <td className="py-1 pr-3">{m.cantidad ?? ''}</td>
                                        <td className="py-1 pr-3">{typeof m.stockAntes !== 'undefined' ? `${m.stockAntes} → ${m.stockDespues}` : ''}</td>
                                        <td className="py-1">{m.nota || ''}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            ) : (
                              <div className="text-sm opacity-70 mt-2">Cargando…</div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
              </div>
            )}
          </>
        )}
      </section>

      <section className="mt-5 bg-white dark:bg-gris-800 border border-gray-200 dark:border-gris-700 rounded-lg p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="font-medium">Proveedores</div>
          <button
            type="button"
            onClick={() => toggleSection('proveedores')}
            className="text-xs px-3 py-2 rounded border border-gray-300 dark:border-gris-600 bg-gray-50 dark:bg-gris-700 hover:bg-gray-100 dark:hover:bg-gris-600"
          >
            {sectionsOpen.proveedores ? 'Ocultar listado' : 'Mostrar listado'}
          </button>
        </div>

        {sectionsOpen.proveedores && (
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
              <div className="text-xs opacity-70 pt-2">Mostrando: {filteredProveedores.length} / {proveedores.length}</div>
            </div>

            <div className="mt-4 space-y-2">
              {filteredProveedores.length === 0 ? (
                <div className="text-sm opacity-70">Sin resultados.</div>
              ) : filteredProveedores
                .slice()
                .sort((a, b) => String((a.razonSocial || a.nombre) || '').localeCompare(String((b.razonSocial || b.nombre) || '')))
                .map((p) => (
                  <div key={p.id} className="rounded border border-gray-200 dark:border-gris-700 px-3 py-3">
                    <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-sm font-medium truncate" title={p.razonSocial || p.nombre || ''}>{p.razonSocial || p.nombre || '—'}</div>
                        <div className="text-xs opacity-70">NIT: {p.nit || '—'} · Lead time: {Number(p.leadTimeDias ?? 0)} días</div>
                        <div className="text-xs opacity-70">Entrega: {p.modalidadEntrega || '—'} · Pago: {p.tipoPago || '—'}</div>
                        <div className="text-xs opacity-70">
                          Contacto: {p.contacto || (Array.isArray(p.contactos) && p.contactos[0]?.nombre) || '—'}
                          {p.telefono || (Array.isArray(p.contactos) && p.contactos[0]?.telefono) ? ` · Tel: ${p.telefono || p.contactos[0]?.telefono}` : ''}
                          {p.email || (Array.isArray(p.contactos) && p.contactos[0]?.correo) ? ` · Email: ${p.email || p.contactos[0]?.correo}` : ''}
                        </div>
                      </div>
                      <div className="flex flex-col sm:flex-row gap-2 flex-shrink-0">
                        <button
                          type="button"
                          onClick={() => { setShowAdmin(true); setActiveCreate('proveedor'); startEditarProveedor(p); }}
                          className="text-xs px-3 py-2 rounded bg-indigo-600 hover:bg-indigo-700 text-white"
                        >
                          Editar
                        </button>
                        <button
                          type="button"
                          onClick={() => handleEliminarProveedor(p)}
                          className="text-xs px-3 py-2 rounded bg-red-600 hover:bg-red-500 text-white"
                        >
                          Eliminar
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </>
        )}
      </section>

      <section className="mt-5 bg-white dark:bg-gris-800 border border-gray-200 dark:border-gris-700 rounded-lg p-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div className="font-medium">Movimientos (general)</div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => toggleSection('movimientos')}
              className="text-xs px-3 py-2 rounded border border-gray-300 dark:border-gris-600 bg-gray-50 dark:bg-gris-700 hover:bg-gray-100 dark:hover:bg-gris-600"
            >
              {sectionsOpen.movimientos ? 'Ocultar listado' : 'Mostrar listado'}
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

        {sectionsOpen.movimientos && (
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
              <div className="text-xs opacity-70 pt-2">Mostrando: {filteredMovGeneral.length} / {movGeneral.length}</div>
            </div>

            <div className="mt-4">
              {!movGeneralLoaded ? (
                <div className="text-sm opacity-70">Haz clic en “Cargar últimos 200” para ver el historial general.</div>
              ) : movGeneralLoading ? (
                <div className="text-sm opacity-70">Cargando…</div>
              ) : filteredMovGeneral.length === 0 ? (
                <div className="text-sm opacity-70">Sin movimientos.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="text-left opacity-70">
                        <th className="py-2 pr-3">Fecha</th>
                        <th className="py-2 pr-3">Item</th>
                        <th className="py-2 pr-3">Tipo</th>
                        <th className="py-2 pr-3">Cant.</th>
                        <th className="py-2 pr-3">Stock</th>
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
                              onChange={(e) => setEditingMovForm((p) => ({ ...p, cantidad: Number(e.target.value) }))}
                              disabled={!isLatest}
                              className="w-24 px-2 py-1 rounded border border-gray-300 dark:border-gris-600 bg-white dark:bg-gris-800"
                            />
                          ) : (m.cantidad ?? '')}
                        </td>
                        <td className="py-2 pr-3 whitespace-nowrap">{typeof m.stockAntes !== 'undefined' ? `${m.stockAntes} → ${m.stockDespues}` : ''}</td>
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
              )}
            </div>
          </>
        )}
      </section>

      <div className={`${showAdmin ? '' : 'hidden'} mt-6 flex flex-col sm:flex-row items-stretch sm:items-center gap-2`}>
        <div className="inline-flex rounded border border-gray-200 dark:border-gris-700 overflow-hidden">
          <button
            type="button"
            onClick={() => setActiveCreate("materia")}
            className={`px-4 py-2 text-sm ${activeCreate === 'materia' ? 'bg-trafico text-black' : 'bg-white dark:bg-gris-800 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gris-700'}`}
          >
            Crear materia prima
          </button>
          <button
            type="button"
            onClick={() => setActiveCreate("proveedor")}
            className={`px-4 py-2 text-sm border-l border-gray-200 dark:border-gris-700 ${activeCreate === 'proveedor' ? 'bg-trafico text-black' : 'bg-white dark:bg-gris-800 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gris-700'}`}
          >
            Crear proveedor
          </button>
        </div>
        <div className="text-xs opacity-70 text-gray-700 dark:text-gray-200">
          Tip: si no existe, usa el botón “Crear …” dentro del buscador.
        </div>
      </div>

      <div className={`${showAdmin ? '' : 'hidden'} grid grid-cols-1 gap-5 mt-5`}>
        <section className={`${activeCreate === 'proveedor' ? '' : 'hidden'} bg-white dark:bg-gris-800 border border-gray-200 dark:border-gris-700 rounded-lg p-4`}>
          <div className="font-medium">{editingProveedorId ? "Editar proveedor" : "Nuevo proveedor"}</div>
          <form onSubmit={submitProveedor} className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="md:col-span-2">
              <label className="text-xs text-gray-600 dark:text-gray-300">Razón social</label>
              <input value={provForm.razonSocial} onChange={(e)=>setProvForm(p=>({...p, razonSocial:e.target.value}))}
                className="mt-1 w-full px-3 py-2 rounded border border-gray-300 dark:border-gris-600 bg-white dark:bg-gris-700" />
            </div>
            <div>
              <label className="text-xs text-gray-600 dark:text-gray-300">NIT</label>
              <input value={provForm.nit} onChange={(e)=>setProvForm(p=>({...p, nit:e.target.value}))}
                className="mt-1 w-full px-3 py-2 rounded border border-gray-300 dark:border-gris-600 bg-white dark:bg-gris-700" />
            </div>
            <div>
              <label className="text-xs text-gray-600 dark:text-gray-300">Lead time (días)</label>
              <input type="number" min={0} value={provForm.leadTimeDias} onChange={(e)=>setProvForm(p=>({...p, leadTimeDias:Number(e.target.value)}))}
                className="mt-1 w-full px-3 py-2 rounded border border-gray-300 dark:border-gris-600 bg-white dark:bg-gris-700" />
            </div>

            <div>
              <label className="text-xs text-gray-600 dark:text-gray-300">Modalidad de entrega</label>
              <select value={provForm.modalidadEntrega} onChange={(e)=>setProvForm(p=>({...p, modalidadEntrega:e.target.value}))}
                className="mt-1 w-full px-3 py-2 rounded border border-gray-300 dark:border-gris-600 bg-white dark:bg-gris-700">
                <option value="">—</option>
                <option value="envio_nacional">Envío (nacional)</option>
                <option value="envio_bogota">Envío (solo Bogotá)</option>
                <option value="recoger">Recoger en ubicación</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-600 dark:text-gray-300">Tipo de pago</label>
              <select value={provForm.tipoPago} onChange={(e)=>setProvForm(p=>({...p, tipoPago:e.target.value}))}
                className="mt-1 w-full px-3 py-2 rounded border border-gray-300 dark:border-gris-600 bg-white dark:bg-gris-700">
                <option value="">—</option>
                <option value="credito">Crédito</option>
                <option value="al_pedir">Al hacer el pedido</option>
                <option value="al_recoger">Al momento de recoger</option>
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="text-xs text-gray-600 dark:text-gray-300">Sedes (dirección y ciudad)</label>
              <div className="mt-1 space-y-2">
                {(Array.isArray(provForm.sedes) ? provForm.sedes : []).map((s, idx) => (
                  <div key={idx} className="grid grid-cols-1 md:grid-cols-[1fr_220px_auto] gap-2">
                    <input
                      value={s?.direccion || ""}
                      onChange={(e)=>setProvForm(p=>({
                        ...p,
                        sedes: (Array.isArray(p.sedes) ? p.sedes : []).map((x, i)=> i===idx ? { ...x, direccion: e.target.value } : x)
                      }))}
                      placeholder="Dirección"
                      className="w-full px-3 py-2 rounded border border-gray-300 dark:border-gris-600 bg-white dark:bg-gris-700"
                    />
                    <input
                      value={s?.ciudad || ""}
                      onChange={(e)=>setProvForm(p=>({
                        ...p,
                        sedes: (Array.isArray(p.sedes) ? p.sedes : []).map((x, i)=> i===idx ? { ...x, ciudad: e.target.value } : x)
                      }))}
                      placeholder="Ciudad"
                      className="w-full px-3 py-2 rounded border border-gray-300 dark:border-gris-600 bg-white dark:bg-gris-700"
                    />
                    <div className="flex items-center justify-end">
                      <button
                        type="button"
                        onClick={()=>setProvForm(p=>({
                          ...p,
                          sedes: (Array.isArray(p.sedes) ? p.sedes : []).length > 1
                            ? (Array.isArray(p.sedes) ? p.sedes : []).filter((_, i)=> i!==idx)
                            : [emptySede]
                        }))}
                        className="px-2 py-2 rounded border border-gray-300 dark:border-gris-600 text-xs hover:bg-gray-50 dark:hover:bg-gris-600"
                        title="Quitar sede"
                      >Quitar</button>
                    </div>
                  </div>
                ))}
                <div>
                  <button
                    type="button"
                    onClick={()=>setProvForm(p=>({ ...p, sedes: [...(Array.isArray(p.sedes) ? p.sedes : []), { ...emptySede }] }))}
                    className="text-xs px-3 py-1.5 rounded bg-indigo-600 hover:bg-indigo-700 text-white"
                  >+ Agregar sede</button>
                </div>
              </div>
            </div>

            <div className="md:col-span-2">
              <label className="text-xs text-gray-600 dark:text-gray-300">Contactos (nombre, teléfono, correo)</label>
              <div className="mt-1 space-y-2">
                {(Array.isArray(provForm.contactos) ? provForm.contactos : []).map((c, idx) => (
                  <div key={idx} className="grid grid-cols-1 md:grid-cols-[1fr_200px_1fr_auto] gap-2">
                    <input
                      value={c?.nombre || ""}
                      onChange={(e)=>setProvForm(p=>({
                        ...p,
                        contactos: (Array.isArray(p.contactos) ? p.contactos : []).map((x, i)=> i===idx ? { ...x, nombre: e.target.value } : x)
                      }))}
                      placeholder="Nombre"
                      className="w-full px-3 py-2 rounded border border-gray-300 dark:border-gris-600 bg-white dark:bg-gris-700"
                    />
                    <input
                      value={c?.telefono || ""}
                      onChange={(e)=>setProvForm(p=>({
                        ...p,
                        contactos: (Array.isArray(p.contactos) ? p.contactos : []).map((x, i)=> i===idx ? { ...x, telefono: e.target.value } : x)
                      }))}
                      placeholder="Teléfono"
                      className="w-full px-3 py-2 rounded border border-gray-300 dark:border-gris-600 bg-white dark:bg-gris-700"
                    />
                    <input
                      type="email"
                      value={c?.correo || ""}
                      onChange={(e)=>setProvForm(p=>({
                        ...p,
                        contactos: (Array.isArray(p.contactos) ? p.contactos : []).map((x, i)=> i===idx ? { ...x, correo: e.target.value } : x)
                      }))}
                      placeholder="Correo"
                      className="w-full px-3 py-2 rounded border border-gray-300 dark:border-gris-600 bg-white dark:bg-gris-700"
                    />
                    <div className="flex items-center justify-end">
                      <button
                        type="button"
                        onClick={()=>setProvForm(p=>({
                          ...p,
                          contactos: (Array.isArray(p.contactos) ? p.contactos : []).length > 1
                            ? (Array.isArray(p.contactos) ? p.contactos : []).filter((_, i)=> i!==idx)
                            : [emptyContacto]
                        }))}
                        className="px-2 py-2 rounded border border-gray-300 dark:border-gris-600 text-xs hover:bg-gray-50 dark:hover:bg-gris-600"
                        title="Quitar contacto"
                      >Quitar</button>
                    </div>
                  </div>
                ))}
                <div>
                  <button
                    type="button"
                    onClick={()=>setProvForm(p=>({ ...p, contactos: [...(Array.isArray(p.contactos) ? p.contactos : []), { ...emptyContacto }] }))}
                    className="text-xs px-3 py-1.5 rounded bg-indigo-600 hover:bg-indigo-700 text-white"
                  >+ Agregar contacto</button>
                </div>
              </div>
            </div>

            <div className="md:col-span-2">
              <label className="text-xs text-gray-600 dark:text-gray-300">Materia prima que provee (items del inventario)</label>
              <div className="mt-1 rounded border border-gray-300 dark:border-gris-600 bg-white dark:bg-gris-700 p-3">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                  <input
                    value={provMateriaSearch}
                    onChange={(e) => setProvMateriaSearch(e.target.value)}
                    placeholder="Buscar por nombre / SKU / categoría…"
                    className="w-full md:max-w-md px-3 py-2 rounded border border-gray-300 dark:border-gris-600 bg-white dark:bg-gris-800 text-sm"
                  />
                  <div className="flex items-center justify-between md:justify-end gap-2">
                    <div className="text-xs opacity-70">
                      Seleccionados: {Array.isArray(provForm.materiaPrimaItemIds) ? provForm.materiaPrimaItemIds.length : 0}
                    </div>
                    <button
                      type="button"
                      onClick={() => setProvForm((p) => ({ ...p, materiaPrimaItemIds: [] }))}
                      className="text-xs px-2 py-1 rounded border border-gray-300 dark:border-gris-600 bg-gray-50 dark:bg-gris-800 hover:bg-gray-100 dark:hover:bg-gris-700"
                    >
                      Limpiar
                    </button>
                  </div>
                </div>

                {Array.isArray(provForm.materiaPrimaItemIds) && provForm.materiaPrimaItemIds.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {provForm.materiaPrimaItemIds.map((id) => {
                      const it = items.find((x) => x.id === id);
                      const label = it ? `${it.nombre || '—'}${it.sku ? ` (${it.sku})` : ''}` : id;
                      return (
                        <button
                          key={id}
                          type="button"
                          onClick={() => toggleMateriaPrimaItem(id)}
                          className="text-xs px-2 py-1 rounded-full bg-indigo-600/10 text-indigo-700 dark:text-indigo-200 border border-indigo-600/20 hover:bg-indigo-600/15"
                          title="Quitar"
                        >
                          {label} ×
                        </button>
                      );
                    })}
                  </div>
                )}

                <div className="mt-3 max-h-52 overflow-auto rounded border border-gray-200 dark:border-gris-600 bg-white/60 dark:bg-gris-800/40">
                  <div className="grid grid-cols-1 gap-2 p-2">
                    {materiasPrimasFiltradas.map((it) => {
                      const checked = Array.isArray(provForm.materiaPrimaItemIds) && provForm.materiaPrimaItemIds.includes(it.id);
                      return (
                        <label
                          key={it.id}
                          className={`flex items-start gap-2 rounded px-2 py-1.5 cursor-pointer border ${
                            checked
                              ? "border-indigo-400/60 bg-indigo-50 dark:bg-indigo-500/10"
                              : "border-transparent hover:border-gray-200 dark:hover:border-gris-600"
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleMateriaPrimaItem(it.id)}
                            className="h-4 w-4 mt-0.5"
                          />
                          <div className="min-w-0">
                            <div className="text-sm text-gray-800 dark:text-gray-100 truncate" title={it.nombre || ''}>{it.nombre || '—'}</div>
                            <div className="text-xs opacity-70">
                              SKU: {it.sku || '—'}{it.categoria ? ` · ${it.categoria}` : ''}
                            </div>
                          </div>
                        </label>
                      );
                    })}
                    {materiasPrimasFiltradas.length === 0 && (
                      <div className="p-2">
                        <div className="text-sm opacity-70">Sin resultados.</div>
                        <button
                          type="button"
                          onClick={goCrearMateriaPrimaDesdeBusqueda}
                          className="mt-2 text-xs px-3 py-2 rounded bg-indigo-600 hover:bg-indigo-700 text-white"
                        >
                          Crear materia prima
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="md:col-span-2 flex items-center justify-end gap-2">
              {editingProveedorId && (
                <button type="button" onClick={resetProveedorForm} className="px-4 py-2 rounded border border-gray-300 dark:border-gris-600 bg-gray-100 dark:bg-gris-700 text-gray-700 dark:text-gray-200 text-sm hover:bg-gray-200 dark:hover:bg-gris-600">Cancelar</button>
              )}
              <button type="submit" className="px-4 py-2 rounded bg-green-600 hover:bg-green-500 text-white text-sm">{editingProveedorId ? "Guardar" : "Crear"}</button>
            </div>
          </form>

          <div className="mt-5">
            <div className="flex items-center justify-between gap-3">
              <div className="text-sm font-medium">Proveedores recientes</div>
              <button
                type="button"
                onClick={() => toggleSection('proveedoresRecientes')}
                className="text-xs px-3 py-2 rounded border border-gray-300 dark:border-gris-600 bg-gray-50 dark:bg-gris-700 hover:bg-gray-100 dark:hover:bg-gris-600"
              >
                {sectionsOpen.proveedoresRecientes ? 'Ocultar' : 'Mostrar'}
              </button>
            </div>
            {sectionsOpen.proveedoresRecientes && (
              loading ? <div className="text-sm opacity-70 mt-2">Cargando…</div> : (
                <div className="mt-2 space-y-2">
                  {proveedores.length === 0 ? <div className="text-sm opacity-70">Sin proveedores</div> : proveedores.map(p => (
                    <div key={p.id} className="rounded border border-gray-200 dark:border-gris-700 px-3 py-2">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="text-sm font-medium truncate" title={(p.razonSocial || p.nombre) || ''}>{p.razonSocial || p.nombre}</div>
                          {p.nit && <div className="text-xs opacity-70">NIT: {sanitizeNIT(p.nit)}</div>}
                          <div className="text-xs opacity-70">Lead time: {p.leadTimeDias ?? 0} días</div>
                          {p.modalidadEntrega && <div className="text-xs opacity-70">Entrega: {p.modalidadEntrega === 'recoger' ? 'Recoger' : (p.modalidadEntrega === 'envio_bogota' ? 'Envío Bogotá' : 'Envío nacional')}</div>}
                          {p.tipoPago && <div className="text-xs opacity-70">Pago: {p.tipoPago === 'credito' ? 'Crédito' : (p.tipoPago === 'al_pedir' ? 'Al pedir' : 'Al recoger')}</div>}
                          {Array.isArray(p.sedes) && p.sedes.length > 0 && (
                            <div className="text-xs opacity-70">Sedes: {p.sedes.length}</div>
                          )}
                          {Array.isArray(p.contactos) && p.contactos.length > 0 ? (
                            <div className="text-xs opacity-70">Contactos: {p.contactos.length}</div>
                          ) : ((p.contacto || p.telefono || p.email) ? (
                            <div className="text-xs opacity-70">
                              {[p.contacto, p.telefono, p.email].filter(Boolean).join(' · ')}
                            </div>
                          ) : null)}
                          <div className="text-xs opacity-70">
                            Materia prima asociada: {items.filter((it) => (Array.isArray(it.proveedorIds) ? it.proveedorIds : (it.proveedorId ? [it.proveedorId] : [])).includes(p.id)).length}
                          </div>
                        </div>
                        <div className="flex flex-col gap-2 flex-shrink-0">
                          <button type="button" onClick={()=>startEditarProveedor(p)} className="text-xs px-2 py-1 rounded bg-indigo-600 hover:bg-indigo-700 text-white">Editar</button>
                          <button type="button" onClick={()=>handleEliminarProveedor(p)} className="text-xs px-2 py-1 rounded bg-red-600 hover:bg-red-500 text-white">Eliminar</button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )
            )}
          </div>
        </section>

        <section className={`${activeCreate === 'materia' ? '' : 'hidden'} bg-white dark:bg-gris-800 border border-gray-200 dark:border-gris-700 rounded-lg p-4`}>
          <div className="font-medium">{editingItemId ? "Editar item de materia prima" : "Nuevo item de materia prima"}</div>
          <form onSubmit={submitItem} className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="md:col-span-2">
              <label className="text-xs text-gray-600 dark:text-gray-300">Producto(s) asociado(s)</label>
              <div className="mt-1 rounded border border-gray-300 dark:border-gris-600 bg-white dark:bg-gris-700 p-3">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                  <input
                    value={productoSearch}
                    onChange={(e) => setProductoSearch(e.target.value)}
                    placeholder="Buscar producto…"
                    className="w-full md:max-w-sm px-3 py-2 rounded border border-gray-300 dark:border-gris-600 bg-white dark:bg-gris-800 text-sm"
                  />
                  <div className="flex items-center justify-between md:justify-end gap-2">
                    <div className="text-xs opacity-70">
                      Seleccionados: {Array.isArray(itemForm.productoTipos) ? itemForm.productoTipos.length : 0}
                    </div>
                    <button
                      type="button"
                      onClick={() => setItemForm((p) => ({ ...p, productoTipos: [] }))}
                      className="text-xs px-2 py-1 rounded border border-gray-300 dark:border-gris-600 bg-gray-50 dark:bg-gris-800 hover:bg-gray-100 dark:hover:bg-gris-700"
                    >
                      Limpiar
                    </button>
                  </div>
                </div>

                {Array.isArray(itemForm.productoTipos) && itemForm.productoTipos.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {itemForm.productoTipos.map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => toggleProductoTipo(t)}
                        className="text-xs px-2 py-1 rounded-full bg-indigo-600/10 text-indigo-700 dark:text-indigo-200 border border-indigo-600/20 hover:bg-indigo-600/15"
                        title="Quitar"
                      >
                        {t} ×
                      </button>
                    ))}
                  </div>
                )}

                <div className="mt-3 max-h-40 overflow-auto rounded border border-gray-200 dark:border-gris-600 bg-white/60 dark:bg-gris-800/40">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 p-2">
                    {productosFiltrados.map((t) => {
                      const checked = Array.isArray(itemForm.productoTipos) && itemForm.productoTipos.includes(t);
                      return (
                        <label
                          key={t}
                          className={`flex items-center gap-2 rounded px-2 py-1.5 cursor-pointer border ${
                            checked
                              ? "border-indigo-400/60 bg-indigo-50 dark:bg-indigo-500/10"
                              : "border-transparent hover:border-gray-200 dark:hover:border-gris-600"
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleProductoTipo(t)}
                            className="h-4 w-4"
                          />
                          <span className="text-sm text-gray-800 dark:text-gray-100">{t}</span>
                        </label>
                      );
                    })}
                    {productosFiltrados.length === 0 && (
                      <div className="text-sm opacity-70 p-2">Sin resultados.</div>
                    )}
                  </div>
                </div>
              </div>
                <div className="text-[11px] opacity-70 mt-1">Opcional: puedes asociarlo a productos ahora o después.</div>
            </div>

            <div className="md:col-span-2">
              <label className="text-xs text-gray-600 dark:text-gray-300">Foto (opcional)</label>
              <div className="mt-1 grid grid-cols-1 md:grid-cols-[1fr_auto] gap-3 items-start">
                <div>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleFotoChange(e.target.files?.[0])}
                    className="block w-full text-sm text-gray-700 dark:text-gray-200 file:mr-3 file:py-2 file:px-3 file:rounded file:border-0 file:bg-indigo-600 file:text-white hover:file:bg-indigo-700"
                  />
                  <div className="text-[11px] opacity-70 mt-1">
                    Se comprime automáticamente para guardarlo en Firebase.
                    {itemForm.fotoDataUrl ? ` Tamaño aprox: ${dataUrlSizeLabel(itemForm.fotoDataUrl)}.` : ""}
                  </div>
                </div>

                {itemForm.fotoDataUrl ? (
                  <div className="flex flex-col items-end gap-2">
                    <img
                      src={itemForm.fotoDataUrl}
                      alt={itemForm.fotoFileName || "foto"}
                      className="h-24 w-24 object-cover rounded border border-gray-200 dark:border-gris-600 bg-white"
                    />
                    <button
                      type="button"
                      onClick={() => setItemForm((p) => ({ ...p, fotoDataUrl: "", fotoFileName: "", fotoMimeType: "" }))}
                      className="text-xs px-2 py-1 rounded border border-red-300 text-red-700 hover:bg-red-50 dark:hover:bg-red-500/10"
                    >
                      Quitar foto
                    </button>
                  </div>
                ) : (
                  <div className="hidden md:block text-xs opacity-70 text-right pt-2">Sin foto</div>
                )}
              </div>
            </div>
            <div>
              <label className="text-xs text-gray-600 dark:text-gray-300">SKU</label>
              <input value={itemForm.sku} onChange={(e)=>setItemForm(p=>({...p, sku:e.target.value}))}
                className="mt-1 w-full px-3 py-2 rounded border border-gray-300 dark:border-gris-600 bg-white dark:bg-gris-700" />
            </div>
            <div>
              <label className="text-xs text-gray-600 dark:text-gray-300">Categoría</label>
              <input value={itemForm.categoria} onChange={(e)=>setItemForm(p=>({...p, categoria:e.target.value}))}
                className="mt-1 w-full px-3 py-2 rounded border border-gray-300 dark:border-gris-600 bg-white dark:bg-gris-700" placeholder="(Opcional)" />
            </div>
            <div>
              <label className="text-xs text-gray-600 dark:text-gray-300">Unidad</label>
              <input value={itemForm.unidad} onChange={(e)=>setItemForm(p=>({...p, unidad:e.target.value}))}
                className="mt-1 w-full px-3 py-2 rounded border border-gray-300 dark:border-gris-600 bg-white dark:bg-gris-700" placeholder="m2, kg, und..." />
            </div>
            <div>
              <label className="text-xs text-gray-600 dark:text-gray-300">Ubicación</label>
              <input value={itemForm.ubicacion} onChange={(e)=>setItemForm(p=>({...p, ubicacion:e.target.value}))}
                className="mt-1 w-full px-3 py-2 rounded border border-gray-300 dark:border-gris-600 bg-white dark:bg-gris-700" placeholder="Bodega, estante, etc." />
            </div>
            <div className="md:col-span-2">
              <label className="text-xs text-gray-600 dark:text-gray-300">Nombre</label>
              <input value={itemForm.nombre} onChange={(e)=>setItemForm(p=>({...p, nombre:e.target.value}))}
                className="mt-1 w-full px-3 py-2 rounded border border-gray-300 dark:border-gris-600 bg-white dark:bg-gris-700" />
            </div>
            <div>
              <label className="text-xs text-gray-600 dark:text-gray-300">Stock actual</label>
              <input type="number" min={0} value={itemForm.stockActual} onChange={(e)=>setItemForm(p=>({...p, stockActual:Number(e.target.value)}))}
                className="mt-1 w-full px-3 py-2 rounded border border-gray-300 dark:border-gris-600 bg-white dark:bg-gris-700" />
            </div>
            <div>
              <label className="text-xs text-gray-600 dark:text-gray-300">Stock mínimo</label>
              <input type="number" min={0} value={itemForm.stockMinimo} onChange={(e)=>setItemForm(p=>({...p, stockMinimo:Number(e.target.value)}))}
                className="mt-1 w-full px-3 py-2 rounded border border-gray-300 dark:border-gris-600 bg-white dark:bg-gris-700" />
            </div>
            <div>
              <label className="text-xs text-gray-600 dark:text-gray-300">Costo unitario</label>
              <input type="number" min={0} value={itemForm.costoUnitario} onChange={(e)=>setItemForm(p=>({...p, costoUnitario:Number(e.target.value)}))}
                className="mt-1 w-full px-3 py-2 rounded border border-gray-300 dark:border-gris-600 bg-white dark:bg-gris-700" />
            </div>
            <div className="md:col-span-2">
              <label className="text-xs text-gray-600 dark:text-gray-300">Proveedor(es)</label>
              <div className="mt-1 rounded border border-gray-300 dark:border-gris-600 bg-white dark:bg-gris-700 p-3">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                  <input
                    value={proveedorSearch}
                    onChange={(e) => setProveedorSearch(e.target.value)}
                    placeholder="Buscar proveedor…"
                    className="w-full md:max-w-sm px-3 py-2 rounded border border-gray-300 dark:border-gris-600 bg-white dark:bg-gris-800 text-sm"
                  />
                  <div className="flex items-center justify-between md:justify-end gap-2">
                    <div className="text-xs opacity-70">
                      Seleccionados: {Array.isArray(itemForm.proveedorIds)
                        ? itemForm.proveedorIds.length
                        : (itemForm.proveedorId ? 1 : 0)}
                    </div>
                    <button
                      type="button"
                      onClick={() => setItemForm((p) => ({ ...p, proveedorIds: [], proveedorId: "" }))}
                      className="text-xs px-2 py-1 rounded border border-gray-300 dark:border-gris-600 bg-gray-50 dark:bg-gris-800 hover:bg-gray-100 dark:hover:bg-gris-700"
                    >
                      Limpiar
                    </button>
                  </div>
                </div>

                {Array.isArray(itemForm.proveedorIds) && itemForm.proveedorIds.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {itemForm.proveedorIds.map((id) => {
                      const p = proveedores.find((x) => x.id === id);
                      const label = p ? (p.razonSocial || p.nombre) : id;
                      return (
                        <button
                          key={id}
                          type="button"
                          onClick={() => toggleItemProveedor(id)}
                          className="text-xs px-2 py-1 rounded-full bg-indigo-600/10 text-indigo-700 dark:text-indigo-200 border border-indigo-600/20 hover:bg-indigo-600/15"
                          title="Quitar"
                        >
                          {label} ×
                        </button>
                      );
                    })}
                  </div>
                )}

                <div className="mt-3 max-h-40 overflow-auto rounded border border-gray-200 dark:border-gris-600 bg-white/60 dark:bg-gris-800/40">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 p-2">
                    {proveedoresFiltrados.map((p) => {
                      const current = Array.isArray(itemForm.proveedorIds)
                        ? itemForm.proveedorIds
                        : (itemForm.proveedorId ? [itemForm.proveedorId] : []);
                      const checked = current.includes(p.id);
                      return (
                        <label
                          key={p.id}
                          className={`flex items-center gap-2 rounded px-2 py-1.5 cursor-pointer border ${
                            checked
                              ? "border-indigo-400/60 bg-indigo-50 dark:bg-indigo-500/10"
                              : "border-transparent hover:border-gray-200 dark:hover:border-gris-600"
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleItemProveedor(p.id)}
                            className="h-4 w-4"
                          />
                          <span className="text-sm text-gray-800 dark:text-gray-100 truncate" title={(p.razonSocial || p.nombre) || ''}>{p.razonSocial || p.nombre}</span>
                        </label>
                      );
                    })}
                    {proveedoresFiltrados.length === 0 && (
                      <div className="p-2">
                        <div className="text-sm opacity-70">Sin resultados.</div>
                        <button
                          type="button"
                          onClick={goCrearProveedorDesdeBusqueda}
                          className="mt-2 text-xs px-3 py-2 rounded bg-indigo-600 hover:bg-indigo-700 text-white"
                        >
                          Crear proveedor
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
            <div className="md:col-span-2 flex items-center justify-end gap-2">
              {editingItemId && (
                <button type="button" onClick={resetItemForm} className="px-4 py-2 rounded border border-gray-300 dark:border-gris-600 bg-gray-100 dark:bg-gris-700 text-gray-700 dark:text-gray-200 text-sm hover:bg-gray-200 dark:hover:bg-gris-600">Cancelar</button>
              )}
              <button type="submit" className="px-4 py-2 rounded bg-green-600 hover:bg-green-500 text-white text-sm">{editingItemId ? "Guardar" : "Crear"}</button>
            </div>
          </form>

          <div className="mt-5">
            <div className="flex items-center justify-between gap-3">
              <div className="text-sm font-medium">Items recientes</div>
              <button
                type="button"
                onClick={() => toggleSection('itemsRecientes')}
                className="text-xs px-3 py-2 rounded border border-gray-300 dark:border-gris-600 bg-gray-50 dark:bg-gris-700 hover:bg-gray-100 dark:hover:bg-gris-600"
              >
                {sectionsOpen.itemsRecientes ? 'Ocultar' : 'Mostrar'}
              </button>
            </div>
            {sectionsOpen.itemsRecientes && (
              loading ? <div className="text-sm opacity-70 mt-2">Cargando…</div> : (
                <div className="mt-2 space-y-2">
                  {items.length === 0 ? <div className="text-sm opacity-70">Sin items</div> : items.map(i => (
                    <div key={i.id} className="rounded border border-gray-200 dark:border-gris-700 px-3 py-2">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex items-start gap-3">
                        {i.fotoDataUrl ? (
                          <img
                            src={i.fotoDataUrl}
                            alt={i.nombre || "foto"}
                            className="h-12 w-12 object-cover rounded border border-gray-200 dark:border-gris-600 bg-white flex-shrink-0"
                          />
                        ) : (
                          <div className="h-12 w-12 rounded border border-dashed border-gray-300 dark:border-gris-600 bg-gray-50 dark:bg-gris-800 flex-shrink-0" />
                        )}

                        <div className="min-w-0">
                        <div className="text-sm font-medium truncate" title={i.nombre || ''}>{i.nombre}</div>
                        <div className="text-xs opacity-70">
                          Productos: {Array.isArray(i.productoTipos) ? (i.productoTipos.filter(Boolean).join(' · ') || '—') : (i.productoTipo || '—')}
                        </div>
                        <div className="text-xs opacity-70">
                          SKU: {i.sku || "—"}
                          {i.categoria ? ` · Cat: ${i.categoria}` : ""}
                          {i.ubicacion ? ` · Ubic: ${i.ubicacion}` : ""}
                        </div>
                        <div className="text-xs opacity-70">
                          Stock: {i.stockActual ?? 0} {i.unidad || ""}
                          {typeof i.stockMinimo !== 'undefined' ? ` · Mín: ${i.stockMinimo ?? 0}` : ""}
                          {typeof i.costoUnitario !== 'undefined' ? ` · Costo: $${Number(i.costoUnitario ?? 0).toLocaleString()}` : ""}
                          {(() => {
                            const ids = Array.isArray(i.proveedorIds)
                              ? i.proveedorIds
                              : (i.proveedorId ? [i.proveedorId] : []);
                            if (!ids.length) return "";
                            const names = ids
                              .map((id) => {
                                const p = proveedores.find((x) => x.id === id);
                                return p ? (p.razonSocial || p.nombre) : "—";
                              })
                              .filter(Boolean);
                            const shown = names.slice(0, 2).join(' · ');
                            const more = names.length > 2 ? `…(+${names.length - 2})` : "";
                            return ` · Prov: ${shown}${more ? ' ' + more : ''}`;
                          })()}
                        </div>
                        </div>
                      </div>
                      <div className="flex flex-col gap-2 flex-shrink-0">
                        <button type="button" onClick={()=>startEditarItem(i)} className="text-xs px-2 py-1 rounded bg-indigo-600 hover:bg-indigo-700 text-white">Editar</button>
                        <button type="button" onClick={()=>handleEliminarItem(i)} className="text-xs px-2 py-1 rounded bg-red-600 hover:bg-red-500 text-white">Eliminar</button>
                      </div>
                    </div>
                    </div>
                  ))}
                </div>
              )
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
