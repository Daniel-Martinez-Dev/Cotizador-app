import React from "react";
import toast from "react-hot-toast";
import { PRODUCTOS_ACTIVOS } from "../data/catalogoProductos";
import { compressImageFileToDataURL, dataUrlSizeLabel } from "../utils/imageCompress";
import { useQuote } from "../context/QuoteContext";
import EmptyState from "../components/ui/EmptyState";
import Button from "../components/ui/Button";
import MaterialesTab from "./inventario/MaterialesTab";
import ProveedoresTab from "./inventario/ProveedoresTab";
import MovimientosTab from "./inventario/MovimientosTab";
import { toggleSort, sortArrow, compareValues, normalizeTerms, formatCOP, formatMovimientoFecha } from "./inventario/inventarioUtils";
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
  obtenerProveedorPorId,
  asignarCodigosMaterialFaltantes,
  buscarItemPorCodigo,
} from "../utils/firebaseInventory";
import EscanerCodigoModal from "../components/inventario/EscanerCodigoModal";
import EtiquetasMaterialModal from "../components/inventario/EtiquetasMaterialModal";
import CodigoBarrasMaterial from "../components/inventario/CodigoBarrasMaterial";
import { buscarItemPorCodigoEnLista, itemNecesitaCodigos } from "../utils/codigoMaterial";

export default function InventarioPage() {
  const { confirm } = useQuote();
  const [activeTab, setActiveTab] = React.useState("materiales"); // materiales | proveedores | movimientos
  const [showItemModal, setShowItemModal] = React.useState(false);
  const [showProveedorModal, setShowProveedorModal] = React.useState(false);
  const [showMovimientoModal, setShowMovimientoModal] = React.useState(false);
  const [showProveedorOverlay, setShowProveedorOverlay] = React.useState(false);
  const [sectionsOpen, setSectionsOpen] = React.useState({
    inventario: true,
    proveedores: true,
    movimientos: true,
  });
  const emptySede = React.useMemo(() => ({ direccion: "", ciudad: "" }), []);
  const emptyContacto = React.useMemo(() => ({ nombre: "", telefono: "", correo: "" }), []);
  const [provForm, setProvForm] = React.useState({
    razonSocial: "",
    nit: "",
    leadTimeDias: "",
    sedes: [emptySede],
    contactos: [emptyContacto],
    modalidadEntrega: "", // envio_nacional | envio_bogota | recoger
    tipoPago: "", // credito | al_pedir | al_recoger
    materiaPrimaItemIds: [], // inventario_items ids
  });
  const [editingProveedorId, setEditingProveedorId] = React.useState("");
  const [itemForm, setItemForm] = React.useState({ sku: "", codigoBarras: "", codigoSecuencia: 0, nombre: "", productoTipos: [], categoria: "", unidad: "", stockActual: "", stockMinimo: "", ubicacion: "", costoUnitario: "", proveedorId: "", proveedorIds: [], fotoDataUrl: "", fotoFileName: "", fotoMimeType: "" });
  const [editingItemId, setEditingItemId] = React.useState("");
  const [productoSearch, setProductoSearch] = React.useState("");
  const [provMateriaSearch, setProvMateriaSearch] = React.useState("");
  const [proveedorSearch, setProveedorSearch] = React.useState("");

  const allProductoTipos = React.useMemo(
    () => [...PRODUCTOS_ACTIVOS, "Productos Personalizados", "Repuestos"],
    []
  );

  const [proveedores, setProveedores] = React.useState([]);
  const [extraProveedores, setExtraProveedores] = React.useState({});
  const [items, setItems] = React.useState([]);
  const [loading, setLoading] = React.useState(false);
  const [itemsSearch, setItemsSearch] = React.useState("");
  const [mov, setMov] = React.useState({ itemId: "", tipo: "", cantidad: 1, nota: "", proveedorId: "", costoUnitario: "", codigoLeido: "" });
  const [movimientosOpenItemId, setMovimientosOpenItemId] = React.useState("");
  const [movimientosLoadingItemId, setMovimientosLoadingItemId] = React.useState("");
  const [movimientosCache, setMovimientosCache] = React.useState({}); // itemId -> movimientos[]

  const [proveedoresSearch, setProveedoresSearch] = React.useState("");

  const [selectedItemId, setSelectedItemId] = React.useState("");
  const [selectedProveedorId, setSelectedProveedorId] = React.useState("");
  const [showSelectedItemMovs, setShowSelectedItemMovs] = React.useState(true);
  const [showSelectedProveedorItems, setShowSelectedProveedorItems] = React.useState(true);
  const [itemsSort, setItemsSort] = React.useState({ key: "nombre", dir: "asc" });
  const [provSort, setProvSort] = React.useState({ key: "razonSocial", dir: "asc" });

  const [movGeneralLoaded, setMovGeneralLoaded] = React.useState(false);
  const [movGeneralLoading, setMovGeneralLoading] = React.useState(false);
  const [movGeneralSearch, setMovGeneralSearch] = React.useState("");
  const [movGeneral, setMovGeneral] = React.useState([]);
  const [escanerAbierto, setEscanerAbierto] = React.useState(false);
  const [escanerError, setEscanerError] = React.useState("");
  const [buscandoCodigo, setBuscandoCodigo] = React.useState(false);
  const [showEtiquetas, setShowEtiquetas] = React.useState(false);
  const [generandoCodigos, setGenerandoCodigos] = React.useState(false);
  const [editingMovId, setEditingMovId] = React.useState("");
  const [editingMovForm, setEditingMovForm] = React.useState({ tipo: "ingreso", cantidad: 1, nota: "" });

  const toggleSection = (key) => {
    setSectionsOpen((p) => ({ ...p, [key]: !p[key] }));
  };

  const parseDigits = (value) => {
    const s = String(value ?? "");
    const digits = s.replace(/\D+/g, "");
    return digits;
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

  React.useEffect(() => {
    const hasModal = showItemModal || showProveedorModal || showMovimientoModal || showProveedorOverlay;
    if (!hasModal) {
      document.body.style.overflow = "";
      return undefined;
    }
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [showItemModal, showProveedorModal, showMovimientoModal, showProveedorOverlay]);

  const sanitizeText = (v) => {
    if (v === null || typeof v === 'undefined') return '';
    return String(v)
      .replace(/[\u0000-\u001F\u007F]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  };

  const sanitizeNIT = (nit) => {
    if (nit === null || typeof nit === "undefined") return "";
    if (typeof nit === "number" && Number.isFinite(nit)) return String(Math.trunc(nit));
    let s = String(nit).replace(/[\"“”]/g, "").trim();
    if (!s) return "";
    s = s.replace(/\s+/g, "");

    // Algunos CSV/Excel exportan números como notación científica.
    if (/^\d+(?:\.\d+)?e\+\d+$/i.test(s)) {
      const asNum = Number(s);
      if (Number.isFinite(asNum)) s = String(Math.trunc(asNum));
    }

    // Normalizar separadores comunes (puntos/guiones), dejando solo dígitos.
    s = s.replace(/[^0-9]/g, "");
    return s;
  };

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
      leadTimeDias: "",
      sedes: [emptySede],
      contactos: [emptyContacto],
      modalidadEntrega: "",
      tipoPago: "",
      materiaPrimaItemIds: [],
    });
    setEditingProveedorId("");
    setProvMateriaSearch("");
    setShowProveedorModal(false);
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
    setItemForm({ sku: "", codigoBarras: "", codigoSecuencia: 0, nombre: "", productoTipos: [], categoria: "", unidad: "", stockActual: "", stockMinimo: "", ubicacion: "", costoUnitario: "", proveedorId: "", proveedorIds: [], fotoDataUrl: "", fotoFileName: "", fotoMimeType: "" });
    setEditingItemId("");
    setProductoSearch("");
    setProveedorSearch("");
    setShowItemModal(false);
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
      leadTimeDias: String(Number(prov.leadTimeDias ?? 0)),
      sedes,
      contactos,
      modalidadEntrega: prov.modalidadEntrega || "",
      tipoPago: prov.tipoPago || "",
      materiaPrimaItemIds,
    });
    setProvMateriaSearch("");
    setActiveTab("proveedores");
    setShowProveedorModal(true);
  };

  const handleEliminarProveedor = async (prov) => {
    if (items.some((it) => (Array.isArray(it.proveedorIds) ? it.proveedorIds : (it.proveedorId ? [it.proveedorId] : [])).includes(prov.id))) {
      toast.error("No se puede eliminar: hay items asociados a este proveedor");
      return;
    }
    const ok = await confirm(`¿Eliminar el proveedor "${prov.nombre || ""}"?`);
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
        codigoBarras: itemForm.codigoBarras,
        codigoSecuencia: itemForm.codigoSecuencia,
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
      codigoBarras: item.codigoBarras || "",
      codigoSecuencia: Number(item.codigoSecuencia || 0),
      nombre: item.nombre || "",
      productoTipos,
      categoria: item.categoria || "",
      unidad: item.unidad || "",
      stockActual: String(Number(item.stockActual ?? 0)),
      stockMinimo: String(Number(item.stockMinimo ?? 0)),
      ubicacion: item.ubicacion || "",
      costoUnitario: String(Number(item.costoUnitario ?? 0)),
      proveedorId: proveedorIds[0] || (item.proveedorId || ""),
      proveedorIds,
      fotoDataUrl: item.fotoDataUrl || "",
      fotoFileName: item.fotoFileName || "",
      fotoMimeType: item.fotoMimeType || "",
    });
    setProductoSearch("");
    setProveedorSearch("");
    setActiveTab("materiales");
    setShowItemModal(true);
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
    if (suggestion) {
      setItemForm((p) => ({ ...p, nombre: p.nombre?.trim() ? p.nombre : suggestion }));
    }
    setActiveTab("materiales");
    setShowProveedorModal(false);
    setShowItemModal(true);
  };

  const goCrearProveedorDesdeBusqueda = () => {
    const suggestion = (proveedorSearch || "").trim();
    if (suggestion) {
      setProvForm((p) => ({ ...p, razonSocial: p.razonSocial?.trim() ? p.razonSocial : suggestion }));
    }
    setActiveTab("proveedores");
    setShowItemModal(false);
    setShowProveedorModal(true);
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
    const ok = await confirm(`¿Eliminar el item "${item.nombre || ""}"?`);
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

  const proveedorById = React.useMemo(() => {
    const map = {};
    for (const p of proveedores) {
      map[p.id] = p;
    }
    return map;
  }, [proveedores]);

  const proveedorByIdAll = React.useMemo(() => {
    return { ...proveedorById, ...extraProveedores };
  }, [proveedorById, extraProveedores]);

  const proveedorLabelById = React.useMemo(() => {
    const map = {};
    for (const p of proveedores) {
      map[p.id] = p.razonSocial || p.nombre || p.id;
    }
    for (const [id, prov] of Object.entries(extraProveedores)) {
      map[id] = prov?.razonSocial || prov?.nombre || map[id] || id;
    }
    return map;
  }, [proveedores, extraProveedores]);

  const itemById = React.useMemo(() => {
    const map = {};
    for (const it of items) map[it.id] = it;
    return map;
  }, [items]);

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
        proveedorLabelById[m?.proveedorId] || '',
        String(m?.costoUnitario ?? ''),
        m?.nota,
      ].filter(Boolean).join(' ').toLowerCase();
      return terms.every((t) => blob.includes(t));
    });
  }, [movGeneral, movGeneralSearch, itemById, proveedorLabelById]);

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
    const ok = await confirm("¿Eliminar este movimiento? Esto revertirá el stock.");
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
      const provNames = ids.map((id) => proveedorLabelById[id] || "").filter(Boolean).join(" ");
      const blob = [
        i.nombre,
        i.sku,
        i.codigoBarras,
        i.categoria,
        i.unidad,
        i.ubicacion,
        Array.isArray(i.productoTipos) ? i.productoTipos.join(" ") : i.productoTipo,
        provNames,
      ].filter(Boolean).join(" ").toLowerCase();
      return terms.every((t) => blob.includes(t));
    });
  }, [items, itemsSearch, proveedorNameById]);

  const lowStockItems = React.useMemo(() => {
    return (Array.isArray(items) ? items : []).filter((i) => {
      const actual = Number(i.stockActual ?? 0);
      const minimo = Number(i.stockMinimo ?? 0);
      if (Number.isNaN(actual) || Number.isNaN(minimo)) return false;
      return minimo > 0 && actual < minimo;
    });
  }, [items]);

  const itemsSinCodigo = React.useMemo(
    () => (Array.isArray(items) ? items : []).filter(itemNecesitaCodigos).length,
    [items]
  );

  const sortedItems = React.useMemo(() => {
    const list = Array.isArray(filteredItems) ? filteredItems.slice() : [];
    const dir = itemsSort.dir === "desc" ? -1 : 1;
    const get = (i) => {
      if (!i) return "";
      if (itemsSort.key === "nombre") return i.nombre || "";
      if (itemsSort.key === "sku") return i.sku || "";
      if (itemsSort.key === "categoria") return i.categoria || "";
      if (itemsSort.key === "ubicacion") return i.ubicacion || "";
      if (itemsSort.key === "unidad") return i.unidad || "";
      if (itemsSort.key === "stockActual") return Number(i.stockActual || 0);
      if (itemsSort.key === "stockMinimo") return Number(i.stockMinimo || 0);
      if (itemsSort.key === "costoUnitario") return Number(i.costoUnitario || 0);
      if (itemsSort.key === "proveedores") {
        const ids = Array.isArray(i.proveedorIds) ? i.proveedorIds : (i.proveedorId ? [i.proveedorId] : []);
        return ids.map((id) => proveedorNameById[id] || "").filter(Boolean).join(" · ");
      }
      return i.nombre || "";
    };
    return list.sort((a, b) => dir * compareValues(get(a), get(b)));
  }, [filteredItems, itemsSort, proveedorNameById]);

  const sortedProveedores = React.useMemo(() => {
    const list = Array.isArray(filteredProveedores) ? filteredProveedores.slice() : [];
    const dir = provSort.dir === "desc" ? -1 : 1;
    const get = (p) => {
      if (!p) return "";
      if (provSort.key === "razonSocial") return (p.razonSocial || p.nombre || "");
      if (provSort.key === "nit") return p.nit || "";
      if (provSort.key === "leadTimeDias") return Number(p.leadTimeDias || 0);
      if (provSort.key === "modalidadEntrega") return p.modalidadEntrega || "";
      if (provSort.key === "tipoPago") return p.tipoPago || "";
      if (provSort.key === "contacto") return p.contacto || (Array.isArray(p.contactos) ? (p.contactos[0]?.nombre || "") : "");
      return (p.razonSocial || p.nombre || "");
    };
    return list.sort((a, b) => dir * compareValues(get(a), get(b)));
  }, [filteredProveedores, provSort]);

  const selectedItem = selectedItemId ? itemById[selectedItemId] : null;
  const selectedProveedor = selectedProveedorId ? proveedorByIdAll[selectedProveedorId] : null;

  const selectedItemProveedorIds = React.useMemo(() => {
    if (!selectedItem) return [];
    return Array.isArray(selectedItem.proveedorIds)
      ? selectedItem.proveedorIds
      : (selectedItem.proveedorId ? [selectedItem.proveedorId] : []);
  }, [selectedItem]);

  const loadProveedorIfMissing = React.useCallback(async (id) => {
    if (!id) return;
    if (proveedorByIdAll[id]) return;
    try {
      const prov = await obtenerProveedorPorId(id);
      if (!prov) return;
      setExtraProveedores((prev) => ({ ...prev, [id]: prov }));
    } catch (e) {
      console.error(e);
    }
  }, [proveedorByIdAll]);

  React.useEffect(() => {
    for (const id of selectedItemProveedorIds) {
      loadProveedorIfMissing(id);
    }
  }, [selectedItemProveedorIds, loadProveedorIfMissing]);

  React.useEffect(() => {
    if (selectedProveedorId) loadProveedorIfMissing(selectedProveedorId);
  }, [selectedProveedorId, loadProveedorIfMissing]);

  const selectedProveedorItemList = React.useMemo(() => {
    if (!selectedProveedor) return [];
    const provId = selectedProveedor.id;
    return (Array.isArray(items) ? items : []).filter((it) => {
      const ids = Array.isArray(it.proveedorIds) ? it.proveedorIds : (it.proveedorId ? [it.proveedorId] : []);
      return ids.includes(provId);
    });
  }, [selectedProveedor, items]);

  const startMovimiento = (item, tipo, codigoLeido = "") => {
    const ids = Array.isArray(item.proveedorIds)
      ? item.proveedorIds
      : (item.proveedorId ? [item.proveedorId] : []);
    setMov({
      itemId: item.id,
      tipo,
      cantidad: 1,
      nota: "",
      proveedorId: ids[0] || "",
      costoUnitario: tipo === "ingreso" ? String(Number(item.costoUnitario ?? "")) : "",
      codigoLeido,
    });
    setShowMovimientoModal(true);
  };

  const cancelMovimiento = () => {
    setMov({ itemId: "", tipo: "", cantidad: 1, nota: "", proveedorId: "", costoUnitario: "", codigoLeido: "" });
    setShowMovimientoModal(false);
  };

  // Un código leído se busca primero en la lista ya cargada y, si no está ahí
  // (el listado se corta en 200 materiales), se pregunta al servidor.
  const manejarCodigoEscaneado = async (codigo) => {
    setEscanerError("");
    let item = buscarItemPorCodigoEnLista(items, codigo);
    if (!item) {
      setBuscandoCodigo(true);
      try {
        item = await buscarItemPorCodigo(codigo);
      } catch (err) {
        console.error(err);
      } finally {
        setBuscandoCodigo(false);
      }
    }
    if (!item) {
      setEscanerError(`Ningún material tiene el código ${codigo}.`);
      return;
    }
    // El material queda seleccionado y con su ficha abierta: desde ahí se
    // registra el ingreso o la salida, que es lo que el lector no puede decidir.
    setEscanerAbierto(false);
    setActiveTab("materiales");
    setSelectedProveedorId("");
    setSelectedItemId(item.id);
    ensureMovimientosForItem(item.id);
    toast.success(`Material: ${item.nombre || codigo}`);
  };

  // Etiquetado inicial del inventario: el catálogo existía desde antes de que
  // hubiera códigos, así que hay que poder marcar de golpe todo lo que aún no
  // los tiene. Los que ya están etiquetados no se tocan, para no invalidar
  // etiquetas ya pegadas en la bodega.
  const generarCodigosFaltantes = async () => {
    const pendientes = items.filter(itemNecesitaCodigos);
    if (pendientes.length === 0) {
      toast.success("Todos los materiales ya tienen SKU y código de barras");
      return;
    }
    const ok = await confirm(
      `Se asignará SKU y código de barras a ${pendientes.length} material(es) que aún no lo tienen. Los que ya están etiquetados no cambian. ¿Continuar?`
    );
    if (!ok) return;

    setGenerandoCodigos(true);
    try {
      const { actualizados } = await asignarCodigosMaterialFaltantes(items);
      toast.success(`${actualizados} material(es) etiquetado(s)`);
      await load();
    } catch (err) {
      console.error(err);
      toast.error(err?.message || "No se pudieron generar los códigos");
    } finally {
      setGenerandoCodigos(false);
    }
  };

  const submitMovimiento = async (e) => {
    e.preventDefault();
    try {
      if (!mov.itemId) return;
      const cantidad = Number(mov.cantidad || 0);
      if (Number.isNaN(cantidad) || cantidad <= 0) return toast.error("Cantidad inválida");
      if (mov.tipo === "ingreso") {
        if (!mov.proveedorId) return toast.error("Selecciona el proveedor");
        const costoUnitario = Number(mov.costoUnitario || 0);
        if (Number.isNaN(costoUnitario) || costoUnitario <= 0) return toast.error("Costo unitario inválido");
      }
      await registrarMovimientoInventario(mov.itemId, {
        tipo: mov.tipo,
        cantidad,
        nota: mov.nota,
        proveedorId: mov.tipo === "ingreso" ? mov.proveedorId : "",
        costoUnitario: mov.tipo === "ingreso" ? Number(mov.costoUnitario || 0) : 0,
        codigoLeido: mov.codigoLeido,
      });
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

  const ensureMovimientosForItem = async (itemId) => {
    if (!itemId) return;
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
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Inventario</h1>
          <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
            Base inicial: materia prima + proveedores (lead time).
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="brand"
            size="sm"
            onClick={() => { resetItemForm(); setShowItemModal(true); setActiveTab("materiales"); }}
          >
            Nuevo material
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => { setEscanerError(""); setEscanerAbierto(true); }}
          >
            Escanear código
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => { resetProveedorForm(); setShowProveedorModal(true); setActiveTab("proveedores"); }}
          >
            Nuevo proveedor
          </Button>
          {activeTab === "materiales" && (
            <>
              <Button
                variant="secondary"
                size="sm"
                onClick={generarCodigosFaltantes}
                disabled={generandoCodigos || loading}
              >
                {generandoCodigos
                  ? "Generando…"
                  : itemsSinCodigo > 0
                    ? `Generar códigos (${itemsSinCodigo})`
                    : "Generar códigos"}
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setShowEtiquetas(true)}
                disabled={loading}
              >
                Imprimir etiquetas
              </Button>
            </>
          )}
          {activeTab === "movimientos" && (
            <Button
              variant="secondary"
              size="sm"
              onClick={loadMovGeneral}
            >
              {movGeneralLoaded ? "Refrescar movimientos" : "Cargar movimientos"}
            </Button>
          )}
        </div>
      </div>

      {itemsSinCodigo > 0 && !loading && (
        <div className="mt-4 rounded-lg border border-sky-200 dark:border-sky-800/60 bg-sky-50 dark:bg-sky-900/20 px-4 py-3">
          <div className="text-sm font-medium text-sky-900 dark:text-sky-100">
            {itemsSinCodigo} material(es) sin código de barras
          </div>
          <div className="text-xs text-sky-800 dark:text-sky-200 mt-1">
            Sin código no se pueden identificar con el lector al registrar entradas
            y salidas. Usa <strong>Generar códigos</strong> y luego imprime las etiquetas.
          </div>
        </div>
      )}

      {lowStockItems.length > 0 && (
        <div className="mt-4 rounded-lg border border-amber-200 dark:border-amber-800/60 bg-amber-50 dark:bg-amber-900/20 px-4 py-3">
          <div className="text-sm font-medium text-amber-900 dark:text-amber-100">
            Alertas de stock bajo: {lowStockItems.length}
          </div>
          <div className="text-xs text-amber-800 dark:text-amber-200 mt-1">
            {lowStockItems.slice(0, 4).map((i) => i.nombre || "-").join(" - ")}
            {lowStockItems.length > 4 ? " - ..." : ""}
          </div>
        </div>
      )}

      <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Total materiales", value: items.length, color: "text-gray-800 dark:text-gray-100" },
          { label: "Bajo stock", value: lowStockItems.length, color: lowStockItems.length > 0 ? "text-red-600 dark:text-red-300" : "text-emerald-600 dark:text-emerald-300" },
          { label: "Proveedores", value: proveedores.length, color: "text-gray-800 dark:text-gray-100" },
          { label: "Valor inventario", value: formatCOP(items.reduce((s, i) => s + Number(i.costoUnitario || 0) * Number(i.stockActual || 0), 0)), color: "text-gray-800 dark:text-gray-100" },
        ].map(({ label, value, color }) => (
          <div key={label} className="rounded-lg border border-gray-200 dark:border-gris-700 bg-white dark:bg-gris-800 px-4 py-3">
            <div className="text-[11px] opacity-60 uppercase tracking-wide">{label}</div>
            <div className={`text-xl font-semibold mt-1 ${color}`}>{value}</div>
          </div>
        ))}
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {[
          { key: "materiales", label: `Materiales (${items.length})` },
          { key: "proveedores", label: `Proveedores (${proveedores.length})` },
          { key: "movimientos", label: "Movimientos" },
        ].map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key)}
            className={`text-xs px-4 py-2 rounded-full border ${activeTab === tab.key
              ? "bg-black text-white border-black dark:bg-white dark:text-black dark:border-white"
              : "border-gray-300 dark:border-gris-600 bg-white dark:bg-gris-800 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gris-700"}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <MaterialesTab
        isActive={activeTab === "materiales"}
        sectionOpen={sectionsOpen.inventario}
        onToggleSection={() => toggleSection('inventario')}
        itemsSearch={itemsSearch}
        setItemsSearch={setItemsSearch}
        filteredCount={filteredItems.length}
        totalCount={items.length}
        loading={loading}
        sortedItems={sortedItems}
        itemsSort={itemsSort}
        setItemsSort={setItemsSort}
        proveedorLabelById={proveedorLabelById}
        proveedorById={proveedorById}
        proveedorNameById={proveedorNameById}
        selectedItemId={selectedItemId}
        setSelectedItemId={setSelectedItemId}
        setSelectedProveedorId={setSelectedProveedorId}
        setShowProveedorOverlay={setShowProveedorOverlay}
        ensureMovimientosForItem={ensureMovimientosForItem}
        startMovimiento={startMovimiento}
        selectedItem={selectedItem}
        selectedItemProveedorIds={selectedItemProveedorIds}
        showSelectedItemMovs={showSelectedItemMovs}
        setShowSelectedItemMovs={setShowSelectedItemMovs}
        cancelMovimiento={cancelMovimiento}
        movimientosLoadingItemId={movimientosLoadingItemId}
        setMovimientosLoadingItemId={setMovimientosLoadingItemId}
        movimientosCache={movimientosCache}
        setMovimientosCache={setMovimientosCache}
        startEditarItem={startEditarItem}
        handleEliminarItem={handleEliminarItem}
      />

      <ProveedoresTab
        isActive={activeTab === "proveedores"}
        sectionOpen={sectionsOpen.proveedores}
        onToggleSection={() => toggleSection('proveedores')}
        proveedoresSearch={proveedoresSearch}
        setProveedoresSearch={setProveedoresSearch}
        filteredCount={filteredProveedores.length}
        totalCount={proveedores.length}
        sortedProveedores={sortedProveedores}
        provSort={provSort}
        setProvSort={setProvSort}
        selectedProveedorId={selectedProveedorId}
        setSelectedProveedorId={setSelectedProveedorId}
        setSelectedItemId={setSelectedItemId}
        showProveedorOverlay={showProveedorOverlay}
        setShowProveedorOverlay={setShowProveedorOverlay}
        selectedProveedor={selectedProveedor}
        selectedProveedorItemList={selectedProveedorItemList}
        showSelectedProveedorItems={showSelectedProveedorItems}
        setShowSelectedProveedorItems={setShowSelectedProveedorItems}
        ensureMovimientosForItem={ensureMovimientosForItem}
        startEditarProveedor={startEditarProveedor}
        handleEliminarProveedor={handleEliminarProveedor}
      />

      <MovimientosTab
        isActive={activeTab === "movimientos"}
        sectionOpen={sectionsOpen.movimientos}
        onToggleSection={() => toggleSection('movimientos')}
        movGeneralLoaded={movGeneralLoaded}
        loadMovGeneral={loadMovGeneral}
        movGeneralSearch={movGeneralSearch}
        setMovGeneralSearch={setMovGeneralSearch}
        filteredCount={filteredMovGeneral.length}
        totalCount={movGeneral.length}
        movGeneralLoading={movGeneralLoading}
        filteredMovGeneral={filteredMovGeneral}
        itemById={itemById}
        editingMovId={editingMovId}
        editingMovForm={editingMovForm}
        setEditingMovForm={setEditingMovForm}
        submitEditarMovimiento={submitEditarMovimiento}
        cancelEditarMovimiento={cancelEditarMovimiento}
        startEditarMovimiento={startEditarMovimiento}
        handleEliminarMovimiento={handleEliminarMovimiento}
        proveedorNameById={proveedorNameById}
      />

      {showMovimientoModal && mov.itemId && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/40" onClick={cancelMovimiento} />
          <div className="absolute inset-0 p-4 flex items-center justify-center">
            <div className="w-full max-w-sm rounded-xl border border-gray-200 dark:border-gris-700 bg-white dark:bg-gris-800 shadow-lg overflow-hidden">
              <div className="p-4 border-b border-gray-200 dark:border-gris-700 flex items-start justify-between gap-3">
                <div>
                  <div className="text-sm font-medium">Movimiento rapido</div>
                  <div className="text-xs opacity-70">Tipo: {mov.tipo === 'salida' ? 'Salida' : 'Ingreso'}</div>
                </div>
                <button
                  type="button"
                  onClick={cancelMovimiento}
                  aria-label="Cerrar"
                  title="Cerrar"
                  className="h-8 w-8 rounded border border-gray-300 dark:border-gris-600 bg-gray-50 dark:bg-gris-700 hover:bg-gray-100 dark:hover:bg-gris-600 flex items-center justify-center"
                >
                  <span className="text-base leading-none">✕</span>
                </button>
              </div>
              <form onSubmit={submitMovimiento} className="p-4 grid grid-cols-1 gap-3">
                <div>
                  <label className="text-xs text-gray-600 dark:text-gray-300">Cantidad</label>
                  <input
                    type="number"
                    min={1}
                    value={mov.cantidad}
                    onChange={(e) => setMov((p) => ({ ...p, cantidad: Number(e.target.value) }))}
                    className="mt-1 w-full px-3 py-2 rounded border border-gray-300 dark:border-gris-600 bg-white dark:bg-gris-800"
                  />
                </div>
                {mov.tipo === "ingreso" && (
                  <>
                    <div>
                      <label className="text-xs text-gray-600 dark:text-gray-300">Proveedor</label>
                      <select
                        value={mov.proveedorId}
                        onChange={(e) => setMov((p) => ({ ...p, proveedorId: e.target.value }))}
                        className="mt-1 w-full px-3 py-2 rounded border border-gray-300 dark:border-gris-600 bg-white dark:bg-gris-800"
                      >
                        <option value="">Selecciona proveedor</option>
                        {proveedores.map((p) => (
                          <option key={p.id} value={p.id}>{p.razonSocial || p.nombre || p.id}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs text-gray-600 dark:text-gray-300">Costo unitario</label>
                      <input
                        type="text"
                        inputMode="numeric"
                        value={mov.costoUnitario === "" ? "" : formatCOP(Number(mov.costoUnitario))}
                        onChange={(e) => setMov((p) => ({ ...p, costoUnitario: parseDigits(e.target.value) }))}
                        className="mt-1 w-full px-3 py-2 rounded border border-gray-300 dark:border-gris-600 bg-white dark:bg-gris-800"
                      />
                    </div>
                  </>
                )}
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
            </div>
          </div>
        </div>
      )}

      {showProveedorModal && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/40" onClick={resetProveedorForm} />
          <div className="absolute inset-0 p-4 flex items-start justify-center">
            <div className="w-full max-w-4xl rounded-xl border border-gray-200 dark:border-gris-700 bg-white dark:bg-gris-800 shadow-lg max-h-[calc(100vh-2rem)] overflow-hidden">
              <div className="p-4 border-b border-gray-200 dark:border-gris-700 flex items-start justify-between gap-3">
                <div>
                  <div className="text-sm font-medium">{editingProveedorId ? "Editar proveedor" : "Nuevo proveedor"}</div>
                  <div className="text-xs opacity-70">Completa los datos basicos y asocia materiales si aplica.</div>
                </div>
                <button
                  type="button"
                  onClick={resetProveedorForm}
                  aria-label="Cerrar"
                  title="Cerrar"
                  className="h-8 w-8 rounded border border-gray-300 dark:border-gris-600 bg-gray-50 dark:bg-gris-700 hover:bg-gray-100 dark:hover:bg-gris-600 flex items-center justify-center"
                >
                  <span className="text-base leading-none">✕</span>
                </button>
              </div>
              <div className="p-4 overflow-y-auto max-h-[calc(100vh-10rem)] overscroll-contain">
                <form onSubmit={submitProveedor} className="grid grid-cols-1 md:grid-cols-2 gap-3">
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
              <input type="number" min={0} value={provForm.leadTimeDias} onChange={(e)=>setProvForm(p=>({...p, leadTimeDias:e.target.value}))}
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
              </div>
            </div>
          </div>
        </div>
      )}

      {showItemModal && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/40" onClick={resetItemForm} />
          <div className="absolute inset-0 p-4 flex items-start justify-center">
            <div className="w-full max-w-4xl rounded-xl border border-gray-200 dark:border-gris-700 bg-white dark:bg-gris-800 shadow-lg max-h-[calc(100vh-2rem)] overflow-hidden">
              <div className="p-4 border-b border-gray-200 dark:border-gris-700 flex items-start justify-between gap-3">
                <div>
                  <div className="text-sm font-medium">{editingItemId ? "Editar material" : "Nuevo material"}</div>
                  <div className="text-xs opacity-70">Define stock, ubicacion, proveedores e imagen.</div>
                </div>
                <button
                  type="button"
                  onClick={resetItemForm}
                  aria-label="Cerrar"
                  title="Cerrar"
                  className="h-8 w-8 rounded border border-gray-300 dark:border-gris-600 bg-gray-50 dark:bg-gris-700 hover:bg-gray-100 dark:hover:bg-gris-600 flex items-center justify-center"
                >
                  <span className="text-base leading-none">✕</span>
                </button>
              </div>
              <div className="p-4 overflow-y-auto max-h-[calc(100vh-10rem)] overscroll-contain">
                <form onSubmit={submitItem} className="grid grid-cols-1 md:grid-cols-2 gap-3">
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
              <label className="text-xs text-gray-600 dark:text-gray-300">Foto (opcional) — en móvil abre la cámara</label>
              <div className="mt-1 grid grid-cols-1 md:grid-cols-[1fr_auto] gap-3 items-start">
                <div>
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={(e) => handleFotoChange(e.target.files?.[0])}
                    className="block w-full text-sm text-gray-700 dark:text-gray-200 file:mr-3 file:py-2 file:px-3 file:rounded file:border-0 file:bg-indigo-600 file:text-white hover:file:bg-indigo-700"
                  />
                  <div className="text-[11px] opacity-70 mt-1">
                    Captura desde cámara en móvil o selecciona una imagen. Se comprime automáticamente.
                    {itemForm.fotoDataUrl ? ` Tamaño: ${dataUrlSizeLabel(itemForm.fotoDataUrl)}.` : ""}
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
                className="mt-1 w-full px-3 py-2 rounded border border-gray-300 dark:border-gris-600 bg-white dark:bg-gris-700"
                placeholder="Se genera solo al guardar" />
              <div className="text-[11px] opacity-70 mt-1">
                Si lo dejas vacío se asigna automáticamente junto con el código de barras.
              </div>
            </div>
            {/* El código de barras no se edita a mano: sale del consecutivo de
                materiales y lleva dígito verificador. Se muestra para poder
                cotejarlo contra la etiqueta pegada en la estantería. */}
            <div>
              <label className="text-xs text-gray-600 dark:text-gray-300">Código de barras</label>
              {itemForm.codigoBarras ? (
                <div className="mt-1 rounded border border-gray-300 dark:border-gris-600 bg-white p-2">
                  <CodigoBarrasMaterial codigo={itemForm.codigoBarras} modulo={2} altoBarras={44} />
                </div>
              ) : (
                <div className="mt-1 px-3 py-2 rounded border border-dashed border-gray-300 dark:border-gris-600 text-xs opacity-70">
                  Se genera automáticamente al guardar el material.
                </div>
              )}
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
              <input type="number" min={0} value={itemForm.stockActual} onChange={(e)=>setItemForm(p=>({...p, stockActual:e.target.value}))}
                className="mt-1 w-full px-3 py-2 rounded border border-gray-300 dark:border-gris-600 bg-white dark:bg-gris-700" />
            </div>
            <div>
              <label className="text-xs text-gray-600 dark:text-gray-300">Stock mínimo</label>
              <input type="number" min={0} value={itemForm.stockMinimo} onChange={(e)=>setItemForm(p=>({...p, stockMinimo:e.target.value}))}
                className="mt-1 w-full px-3 py-2 rounded border border-gray-300 dark:border-gris-600 bg-white dark:bg-gris-700" />
            </div>
            <div>
              <label className="text-xs text-gray-600 dark:text-gray-300">Costo unitario</label>
              <input
                type="text"
                inputMode="numeric"
                value={itemForm.costoUnitario === "" ? "" : formatCOP(Number(itemForm.costoUnitario))}
                onChange={(e)=>setItemForm(p=>({...p, costoUnitario: parseDigits(e.target.value)}))}
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
              </div>
            </div>
          </div>
        </div>
      )}

      {escanerAbierto && (
        <EscanerCodigoModal
          titulo="Buscar material por código"
          descripcion="Escanea la etiqueta o dispara el lector para abrir la ficha del material."
          error={escanerError}
          ocupado={buscandoCodigo}
          onDetect={manejarCodigoEscaneado}
          onClose={() => { setEscanerAbierto(false); setEscanerError(""); }}
        />
      )}

      {showEtiquetas && (
        <EtiquetasMaterialModal
          items={sortedItems}
          onClose={() => setShowEtiquetas(false)}
        />
      )}
    </div>
  );
}
