import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  priceMatrices,
  CLIENTE_FACTORES,
  EXTRAS_POR_DEFECTO,
  buscarPrecio,
  buscarPrecioAbrigo,
  matrizPanamericana
} from "../data/precios";
import { useQuote } from "../context/QuoteContext";
import { listarClientes } from "../utils/firebaseClients";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase"; // ajusta la ruta si es diferente
import { Toaster } from 'react-hot-toast';

// Redondea al múltiplo de $5.000 más cercano
function redondear5000(valor) {
  return Math.round(valor / 5000) * 5000;
}

function aplicarAjuste(valor, tipo, porcentaje) {
  if (!porcentaje || porcentaje === 0) return valor;
  if (tipo === "Descuento") return Math.round(valor * (1 - porcentaje / 100));  
  if (tipo === "Incremento") return Math.round(valor * (1 + porcentaje / 100));
  return valor;
}

function getRangoIndex(ranges, valor) {
  for (let i = 0; i < ranges.length - 1; i++) {
    if (valor > ranges[i] && valor <= ranges[i + 1]) {
      return i;
    }
  }
  if (valor <= ranges[0]) return 0;
  return ranges.length - 2;
}

function crearProductoInicial() {
  return {
    tipo: "Divisiones Térmicas",
    cliente: "Cliente Final Contado",
    ancho: "",
    alto: "",
    cantidad: 1,
    precioManual: "",
    extras: [],
    extrasCantidades: {},
    extrasPersonalizados: [],
    extrasPersonalizadosCant: {},
    componentes: [],
    nombrePersonalizado: "", // 👈 LÍNEA NUEVA
    mostrarAlerta: false,
    precioEditado: "",
    ajusteTipo: "Incremento",
    ajusteValor: 0
    
  };
}
export default function CotizadorApp() {
  const { quoteData, setQuoteData, clientes, setClientes, clienteSeleccionado, setClienteSeleccionado, matricesOverride, extrasOverride } = useQuote();
  const navigate = useNavigate();
  const location = useLocation();

  // Inicialización inteligente para editar cotización previa
  const [productos, setProductos] = useState([crearProductoInicial()]);
  const [cliente, setCliente] = useState("");
  useEffect(()=>{ if (clienteSeleccionado) { setCliente(clienteSeleccionado.nombre || ""); } }, [clienteSeleccionado]);
  useEffect(()=>{ (async()=>{ if(!clientes || clientes.length===0){ try { const lista = await listarClientes(); setClientes(lista);} catch(e){ console.error('Error cargando clientes', e);} } })(); }, []);

  useEffect(() => {
    if (quoteData && quoteData.productos?.length > 0) {
      setProductos(quoteData.productos);
      setCliente(quoteData.cliente || "");
      setAjusteTotalTipo(quoteData.ajusteTotalTipo || "Incremento");
      setAjusteTotalValor(quoteData.ajusteTotalValor || 0);
    }
  }, []);


  const [extraInput, setExtraInput] = useState("");
  const [extraPrecioInput, setExtraPrecioInput] = useState("");
  const [alertas, setAlertas] = useState([]);
  const [ajusteTotalTipo, setAjusteTotalTipo] = useState("Descuento");
  const [ajusteTotalValor, setAjusteTotalValor] = useState(0);

  useEffect(() => {
    const nuevasAlertas = productos.map((producto) => {
      const { tipo, ancho, alto, cliente } = producto;
      if (!ancho || !alto) return false;
      if (tipo === "Divisiones Térmicas" && cliente === "Carrocerías Panamericana") {
        const resultado = buscarPrecio(matrizPanamericana, parseInt(ancho), parseInt(alto));
        return resultado.fueraDeRango;
      }
      if (tipo === "Sello de Andén") return false;
  const matriz = (matricesOverride && matricesOverride[tipo]) ? matricesOverride[tipo] : priceMatrices[tipo];
      if (!matriz) return false;
      let fueraDeRango = false;
      if (tipo === "Abrigo Retráctil Estándar") {
        fueraDeRango = buscarPrecioAbrigo(matriz, parseInt(ancho), parseInt(alto)).fueraDeRango;
      } else {
        fueraDeRango = buscarPrecio(matriz, parseInt(ancho), parseInt(alto)).fueraDeRango;
      }
      return fueraDeRango;
    });
    setAlertas(nuevasAlertas);
  }, [productos]);

  const handleAgregarProducto = () => {
    setProductos([...productos, crearProductoInicial()]);
    setAlertas([...alertas, false]);
  };

  const handleEliminarProducto = (index) => {
    const nuevosProductos = [...productos];
    nuevosProductos.splice(index, 1);
    setProductos(nuevosProductos);

    const nuevasAlertas = [...alertas];
    nuevasAlertas.splice(index, 1);
    setAlertas(nuevasAlertas);
  };

  const handleChangeProducto = (index, campo, valor) => {
    const nuevos = [...productos];
    nuevos[index][campo] = valor;

    if (campo === "tipo") {
      nuevos[index].extras = [];
      nuevos[index].extrasCantidades = {};
      nuevos[index].extrasPersonalizados = [];
      nuevos[index].extrasPersonalizadosCant = {};
      nuevos[index].precioManual = "";
      nuevos[index].precioEditado = "";
      nuevos[index].componentes = [];
      nuevos[index].cliente = "Cliente Final Contado";
    }
    if (campo === "cliente") {
      nuevos[index].precioManual = "";
      nuevos[index].precioEditado = "";
    }
    setProductos(nuevos);
  };

  const handleChangeCantidadExtra = (indexProd, extraNombre, valor) => {
    const nuevos = [...productos];
    nuevos[indexProd].extrasCantidades = {
      ...(nuevos[indexProd].extrasCantidades || {}),
      [extraNombre]: valor
    };
    setProductos(nuevos);
  };

  const handleChangeCantidadExtraPersonalizado = (indexProd, idxExtra, valor) => {
    const nuevos = [...productos];
    nuevos[indexProd].extrasPersonalizadosCant = {
      ...(nuevos[indexProd].extrasPersonalizadosCant || {}),
      [idxExtra]: valor
    };
    setProductos(nuevos);
  };

  const handleToggleExtra = (index, extra) => {
    const nuevos = [...productos];
    const extrasActuales = nuevos[index].extras || [];
    if (extrasActuales.includes(extra.nombre)) {
      nuevos[index].extras = extrasActuales.filter((e) => e !== extra.nombre);
    } else {
      nuevos[index].extras = [...extrasActuales, extra.nombre];
      if (!nuevos[index].extrasCantidades[extra.nombre]) {
        nuevos[index].extrasCantidades[extra.nombre] = 1;
      }
    }
    setProductos(nuevos);
  };

  const handleAgregarExtraPersonalizado = (index) => {
    if (!extraInput || !extraPrecioInput) return;
    const nuevos = [...productos];
    nuevos[index].extrasPersonalizados = [
      ...(nuevos[index].extrasPersonalizados || []),
      { nombre: extraInput, precio: parseInt(extraPrecioInput) || 0 }
    ];
    const idx = nuevos[index].extrasPersonalizados.length - 1;
    nuevos[index].extrasPersonalizadosCant = {
      ...(nuevos[index].extrasPersonalizadosCant || {}),
      [idx + 1]: 1
    };
    setProductos(nuevos);
    setExtraInput("");
    setExtraPrecioInput("");
  };

  const handleEliminarExtraPersonalizado = (indexProd, idxExtra) => {
    const nuevos = [...productos];
    nuevos[indexProd].extrasPersonalizados.splice(idxExtra, 1);
    const cants = { ...(nuevos[indexProd].extrasPersonalizadosCant || {}) };
    delete cants[idxExtra];
    nuevos[indexProd].extrasPersonalizadosCant = cants;
    setProductos(nuevos);
  };

  // NUEVA lógica para Sello de Andén
  function calcularPrecioSellos(producto) {
    const { ancho, alto, componentes = [], cliente, tipo } = producto;
    if (!ancho && !alto) return 0;
    const matriz = priceMatrices["Sello de Andén"];
    const rangoAncho = getRangoIndex(matriz.medidaRanges, parseInt(ancho));
    const rangoAlto = getRangoIndex(matriz.medidaRanges, parseInt(alto));
    const precios = matriz.base;
    let total = 0;

    if (componentes.includes("sello completo")) {
      total = precios.completos[rangoAlto] || 0;
    } else {
      if (componentes.includes("cortina")) total += precios.cortina[rangoAncho] || 0;
      if (componentes.includes("postes laterales")) total += precios.postes[rangoAlto] || 0;
      if (componentes.includes("travesaño")) total += precios.travesano[rangoAlto] || 0;
    }
    const factor = CLIENTE_FACTORES[cliente] || 1;
    if (tipo === "Repuestos") {}
  // ⚠️ Por ahora no hay lógica definida para Repuestos
  // En el futuro aquí se buscará el precio en la matriz según nombrePersonalizado, medidas, etc.

    return redondear5000(Math.round(total * factor));
  }

  const calcularPrecio = (producto, index) => {
    const { tipo, ancho, alto, cliente, precioManual, precioEditado, ajusteTipo, ajusteValor } = producto;
    if (precioManual) return redondear5000(parseInt(precioManual) || 0);
    if (precioEditado) return redondear5000(parseInt(precioEditado) || 0);
    if (!ancho || !alto) return 0;

    let precio = 0;
    let fueraDeRango = false;

    if (tipo === "Sello de Andén") {
      precio = calcularPrecioSellos(producto);
    } else if (tipo === "Divisiones Térmicas" && cliente === "Carrocerías Panamericana") {
      const resultado = buscarPrecio(matrizPanamericana, parseInt(ancho), parseInt(alto));
      precio = resultado.precio;
      fueraDeRango = resultado.fueraDeRango;
      precio = redondear5000(precio);
    } else if (tipo === "Abrigo Retráctil Estándar") {
  const matriz = (matricesOverride && matricesOverride[tipo]) ? matricesOverride[tipo] : priceMatrices[tipo];
      const resultado = buscarPrecioAbrigo(matriz, parseInt(ancho), parseInt(alto));
      precio = resultado.precio;
      fueraDeRango = resultado.fueraDeRango;
      precio = redondear5000(precio);
    } else {
      const matriz = priceMatrices[tipo];
      if (!matriz) return 0;
      const resultado = buscarPrecio(matriz, parseInt(ancho), parseInt(alto));
      precio = resultado.precio;
      fueraDeRango = resultado.fueraDeRango;
      precio = redondear5000(precio * (CLIENTE_FACTORES[cliente] || 1));
    }

    if (fueraDeRango) return 0;

    let precioFinal = precio;
    precioFinal = aplicarAjuste(precioFinal, ajusteTipo, parseFloat(ajusteValor));
    return redondear5000(precioFinal);
  };

  const calcularSubtotalExtras = (producto) => {
    const { tipo, cliente, extras = [], extrasCantidades = {}, extrasPersonalizados = [], extrasPersonalizadosCant = {} } = producto;
    let subtotal = 0;
  const overrideExtrasTipo = extrasOverride && extrasOverride[tipo];
  const listaExtras = overrideExtrasTipo || EXTRAS_POR_DEFECTO[tipo] || [];

    for (let extraNombre of extras) {
      const extra = listaExtras.find(e => e.nombre === extraNombre);
      if (extra) {
        const cantidad = parseInt(extrasCantidades[extraNombre]) || 1;
        if (extra.precioDistribuidor || extra.precioCliente) {
          subtotal += cantidad * (cliente === "Distribuidor" ? (extra.precioDistribuidor || 0) : (extra.precioCliente || 0));
        } else {
          subtotal += cantidad * (extra.precio || 0);
        }
      }
    }
    for (let idx in extrasPersonalizados) {
      const extra = extrasPersonalizados[idx];
      const cantidad = parseInt(extrasPersonalizadosCant[idx]) || 1;
      subtotal += cantidad * (extra.precio || 0);
    }
    return redondear5000(subtotal);
  };

  const handleSubmit = () => {
    let productosCotizados = productos.map((p, i) => ({
      ...p,
      precioCalculado: calcularPrecio(p, i),
      subtotalExtras: calcularSubtotalExtras(p)
    }));

    let subtotal = productosCotizados.reduce(
      (sum, p) => sum + (p.precioCalculado || 0) * (parseInt(p.cantidad) || 1) + (p.subtotalExtras || 0),
      0
    );
    subtotal = redondear5000(aplicarAjuste(subtotal, ajusteTotalTipo, parseFloat(ajusteTotalValor)));
    const iva = Math.round(subtotal * 0.19);
    const total = subtotal + iva;

    const cotizacion = {
      cliente,
      clienteId: clienteSeleccionado?.id || null,
      nombreCliente: clienteSeleccionado?.nombre || cliente,
      clienteContacto: clienteSeleccionado?.contacto || '',
      clienteNIT: clienteSeleccionado?.nit || '',
      clienteCiudad: clienteSeleccionado?.ciudad || '',
      clienteEmail: clienteSeleccionado?.email || '',
      clienteTelefono: clienteSeleccionado?.telefono || '',
      productos: productosCotizados,
      subtotal,
      iva,
      total,
      ajusteGeneral: {
        tipo: ajusteTotalTipo,
        porcentaje: parseFloat(ajusteTotalValor) || 0
      }
    };

    setQuoteData(cotizacion);
    navigate("/preview");
  };

  return (
  <><div className="max-w-4xl mx-auto p-6 bg-white dark:bg-gris-900 shadow-lg rounded-lg text-gray-900 dark:text-gray-100">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Generar Cotización</h1>
      </div>
      <div className="mb-4 space-y-2">
        <label className="block mb-1 font-semibold">Cliente:</label>
        <div className="flex flex-col sm:flex-row gap-2">
          <input type="text" className="flex-1 border p-2 rounded" placeholder="Nombre del cliente" value={cliente} onChange={(e)=>{ setCliente(e.target.value); setClienteSeleccionado(null); }} />
          <select className="border p-2 rounded w-full sm:w-64" value={clienteSeleccionado?.id || ""} onChange={(e)=>{ const id=e.target.value; if(!id){ setClienteSeleccionado(null); return;} const obj=clientes.find(c=>c.id===id); setClienteSeleccionado(obj||null); if(obj) setCliente(obj.nombre); }}>
            <option value="">-- Seleccionar guardado --</option>
            {clientes?.map(c=> <option key={c.id} value={c.id}>{c.nombre}</option>)}
          </select>
          <button type="button" className="bg-blue-600 text-white px-3 py-2 rounded" onClick={()=>navigate('/clientes')}>Gestionar</button>
        </div>
        {clienteSeleccionado && (
          <div className="text-xs text-gray-600 space-x-2">
            <span>{clienteSeleccionado.email}</span>
            <span>{clienteSeleccionado.telefono}</span>
            <span>{clienteSeleccionado.nit}</span>
          </div>
        )}
      </div>

      {productos.map((producto, i) => (
        <div key={i} className="border-t border-gray-300 pt-4 mt-4">
          <h2 className="text-lg font-semibold mb-2">Producto #{i + 1}</h2>
          <div className="grid grid-cols-2 gap-4 mb-2">
            {/* Producto y Cliente */}
            <div>
              <label className="block font-medium">Producto:</label>
              <select
                value={producto.tipo}
                onChange={(e) => handleChangeProducto(i, "tipo", e.target.value)}
                className="w-full border p-2 rounded"
              >
                {[...Object.keys(priceMatrices), "Productos Personalizados", "Repuestos"].map((tipo) => (
                  <option key={tipo} value={tipo}>{tipo}</option>
                ))}
              </select>
                {(producto.tipo === "Productos Personalizados" || producto.tipo === "Repuestos") && (
                  <p className="text-sm text-yellow-600 mt-1">Este producto no tiene precio automático. Ingrese el precio manualmente.</p>
                )} 
              {producto.tipo === "Productos Personalizados" && (
                <div className="mt-2">
                  <label className="block text-sm font-medium text-gray-700">Nombre del Producto Personalizado:</label>
                  <input
                    type="text"
                    value={producto.nombrePersonalizado || ""}
                    onChange={(e) => {
                      const nuevosProductos = [...productos];
                      nuevosProductos[i].nombrePersonalizado = e.target.value;
                      setProductos(nuevosProductos);
                    }}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                    placeholder="Ej: Cortina flexible con refuerzo lateral"
                  />
                </div>
              )}
              {producto.tipo === "Repuestos" && (
                <div className="mt-2">
                  <label className="block text-sm font-medium text-gray-700">Nombre del Repuesto:</label>
                  <input
                    type="text"
                    value={producto.nombrePersonalizado || ""}
                    onChange={(e) => {
                      const nuevosProductos = [...productos];
                      nuevosProductos[i].nombrePersonalizado = e.target.value;
                      setProductos(nuevosProductos);
                    }}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                    placeholder="Ej: Motor 0.75kW, sensor óptico, etc."
                  />
                  <p className="text-sm text-gray-500 mt-1 italic">
                    Cuando las matrices estén disponibles, el precio se calculará automáticamente.
                  </p>
                </div>
              )}                                             
            </div>
            <div>
              <label className="block font-medium">Tipo de Cliente:</label>
              <select
                value={producto.cliente}
                onChange={(e) => handleChangeProducto(i, "cliente", e.target.value)}
                className="w-full border p-2 rounded"
              >
                {Object.keys(CLIENTE_FACTORES)
                  .concat(
                    producto.tipo === "Divisiones Térmicas"
                      ? ["Carrocerías Panamericana"]
                      : []
                  )
                  .map((tipo) => (
                    <option key={tipo} value={tipo}>
                      {tipo}
                    </option>
                  ))}
              </select>
            </div>
            {/* Medidas y cantidad */}
            <div>
              <label className="block font-medium">Ancho (mm):</label>
              <input
                type="number"
                placeholder="Ancho"
                className="w-full border p-2 rounded"
                value={producto.ancho}
                onChange={(e) => handleChangeProducto(i, "ancho", e.target.value)} />
            </div>
            <div>
              <label className="block font-medium">Alto (mm):</label>
              <input
                type="number"
                placeholder="Alto"
                className="w-full border p-2 rounded"
                value={producto.alto}
                onChange={(e) => handleChangeProducto(i, "alto", e.target.value)} />
            </div>
            <div>
              <label className="block font-medium">Cantidad:</label>
              <input
                type="number"
                className="w-full border p-2 rounded"
                value={producto.cantidad}
                onChange={(e) => handleChangeProducto(i, "cantidad", e.target.value)} />
            </div>
            <div>
              <label className="block font-medium">Precio Manual (opcional):</label>
              <input
                type="number"
                className="w-full border p-2 rounded"
                value={producto.precioManual}
                onChange={(e) => handleChangeProducto(i, "precioManual", e.target.value)} />
            </div>
            {/* Ajuste por producto */}
            <div>
              <label className="block font-medium">Ajuste (%):</label>
              <div className="flex gap-2">
                <select
                  value={producto.ajusteTipo}
                  onChange={e => handleChangeProducto(i, "ajusteTipo", e.target.value)}
                  className="border p-1 rounded"
                >
                  <option value="Incremento">Incremento</option>
                  <option value="Descuento">Descuento</option>
                </select>
                <input
                  type="number"
                  className="border p-1 rounded w-20"
                  value={producto.ajusteValor}
                  onChange={e => handleChangeProducto(i, "ajusteValor", e.target.value)}
                  placeholder="%" />
              </div>
            </div>
          </div>
          {/* ALERTA FUERA DE RANGO */}
          {alertas[i] && (
            <div className="mb-2 p-2 bg-yellow-100 border-l-4 border-yellow-400 text-yellow-800">
              Las medidas están fuera del rango de la matriz.<br />
              <span>Por favor ingresa un precio manual para este producto:</span>
              <input
                type="number"
                className="w-full border p-2 rounded mt-2"
                placeholder="Precio manual (obligatorio)"
                value={producto.precioEditado}
                onChange={(e) => handleChangeProducto(i, "precioEditado", e.target.value)} />
            </div>
          )}

          {/* ======== COMPONENTES SELLO DE ANDÉN ======== */}
          {producto.tipo === "Sello de Andén" && (
            <div className="mb-2">
              <label className="block font-medium">Componentes:</label>
              {["cortina", "postes laterales", "travesaño", "sello completo"].map((comp, cidx) => (
                <div key={cidx} className="inline-flex items-center mr-4">
                  <input
                    type="checkbox"
                    checked={producto.componentes?.includes(comp)}
                    onChange={() => {
                      const nuevos = [...(producto.componentes || [])];
                      if (nuevos.includes(comp)) {
                        nuevos.splice(nuevos.indexOf(comp), 1);
                      } else {
                        nuevos.push(comp);
                      }
                      handleChangeProducto(i, "componentes", nuevos);
                    } } />
                  <span className="ml-1">{comp.replace(/^\w/, c => c.toUpperCase())}</span>
                </div>
              ))}
            </div>
          )}

          {/* EXTRAS POR DEFECTO (con cantidad) */}
          <div className="mb-2">
            <label className="block font-medium">Extras:</label>
            {(EXTRAS_POR_DEFECTO[producto.tipo] || []).map((extra, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={producto.extras.includes(extra.nombre)}
                  onChange={() => handleToggleExtra(i, extra)} />
                <span>
                  {extra.nombre} $
                  {extra.precio !== undefined
                    ? extra.precio.toLocaleString()
                    : producto.cliente === "Distribuidor"
                      ? extra.precioDistribuidor?.toLocaleString()
                      : extra.precioCliente?.toLocaleString()}
                </span>
                {producto.extras.includes(extra.nombre) && (
                  <input
                    type="number"
                    min="1"
                    className="border p-1 rounded w-16"
                    value={producto.extrasCantidades[extra.nombre] || 1}
                    onChange={e => handleChangeCantidadExtra(i, extra.nombre, e.target.value)} />
                )}
              </div>
            ))}
          </div>

          {/* EXTRAS PERSONALIZADOS (con cantidad) */}
          <div className="mb-2">
            <label className="block font-medium">Extras personalizados:</label>
            <div className="flex gap-2 mb-1">
              <input
                type="text"
                placeholder="Nombre extra"
                className="border p-1 rounded w-1/2"
                value={extraInput}
                onChange={(e) => setExtraInput(e.target.value)} />
              <input
                type="number"
                placeholder="Precio"
                className="border p-1 rounded w-1/3"
                value={extraPrecioInput}
                onChange={(e) => setExtraPrecioInput(e.target.value)} />
              <button
                type="button"
                className="bg-blue-500 text-white px-2 rounded"
                onClick={() => handleAgregarExtraPersonalizado(i)}
              >
                +
              </button>
            </div>
            <div>
              {(producto.extrasPersonalizados || []).map((ex, idx) => (
                <div key={idx} className="flex gap-2 items-center">
                  <span>
                    {ex.nombre} ${ex.precio.toLocaleString()}
                  </span>
                  <input
                    type="number"
                    min="1"
                    className="border p-1 rounded w-16"
                    value={producto.extrasPersonalizadosCant[idx] || 1}
                    onChange={e => handleChangeCantidadExtraPersonalizado(i, idx, e.target.value)} />
                  <button
                    type="button"
                    className="bg-red-400 text-white px-2 rounded"
                    onClick={() => handleEliminarExtraPersonalizado(i, idx)}
                  >
                    Eliminar
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Precio unitario */}
          <div className="mb-2 font-semibold">
            Precio Calculado:{" "}
            {calcularPrecio(producto, i).toLocaleString("es-CO", {
              style: "currency",
              currency: "COP",
              minimumFractionDigits: 0
            })}<br />
            Subtotal Extras: $
            {calcularSubtotalExtras(producto).toLocaleString()}
          </div>

          <button
            onClick={() => handleEliminarProducto(i)}
            className="bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600 mb-2"
          >
            Eliminar Producto
          </button>
        </div>
      ))}

      {/* AJUSTE GENERAL */}
  <div className="mt-8 mb-4 p-4 bg-gray-50 dark:bg-gris-800 rounded-lg border border-gray-200 dark:border-gris-700 dark:text-white">
        <label className="block font-semibold mb-2">Ajuste general sobre el total de la cotización:</label>
        <div className="flex gap-2 items-center">
          <select
            value={ajusteTotalTipo}
            onChange={e => setAjusteTotalTipo(e.target.value)}
            className="border p-1 rounded"
          >
            <option value="Descuento">Descuento</option>
            <option value="Incremento">Incremento</option>
          </select>
          <input
            type="number"
            className="border p-1 rounded w-24"
            placeholder="%"
            value={ajusteTotalValor}
            onChange={e => setAjusteTotalValor(e.target.value)} />
          <span className="text-gray-700">%</span>
        </div>
      </div>

      <button
        onClick={handleAgregarProducto}
        className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 mt-4"
      >
        + Agregar otro producto
      </button>
      <button
        onClick={handleSubmit}
        className="bg-green-600 text-white px-6 py-2 rounded hover:bg-green-700 ml-4 mt-4"
      >
        Generar Cotización
      </button>
  </div></>    
  );
}

