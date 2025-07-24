import React from "react";
import { useQuote } from "../context/QuoteContext";
import { useNavigate } from "react-router-dom";
import { EXTRAS_POR_DEFECTO } from "../data/precios";
import { generarPDF } from "../utils/pdf";

function formatearPesos(valor) {
  return valor.toLocaleString("es-CO", {
    style: "currency",
    currency: "COP",
    minimumFractionDigits: 0
  });
}

function construirDescripcion(prod) {
  let desc = prod.tipo;
  if (prod.ancho && prod.alto) desc += ` (${prod.ancho} x ${prod.alto} mm)`;
  if (
    prod.cliente &&
    prod.cliente !== "Distribuidor" &&
    prod.cliente !== "Carrocerías Panamericana"
  )
    desc += ` / Cliente: ${prod.cliente}`;
  if (prod.cliente === "Carrocerías Panamericana") desc += " / Panamericana";
  if (
    prod.tipo === "Sello de Andén" &&
    prod.componentes &&
    prod.componentes.length > 0
  ) {
    desc += "\nComponentes: ";
    desc += prod.componentes
      .map((comp) => comp.charAt(0).toUpperCase() + comp.slice(1))
      .join(", ");
  }
  // Solo mostrar descuento
  if (
    prod.ajusteTipo === "Descuento" &&
    prod.ajusteValor &&
    Number(prod.ajusteValor) !== 0
  ) {
    desc += `\nAjuste Descuento: ${prod.ajusteValor}%`;
  }
  if (prod.precioManual)
    desc += `\nPrecio manual: ${formatearPesos(parseInt(prod.precioManual))}`;
  else if (prod.precioEditado)
    desc += `\nPrecio fuera de rango: ${formatearPesos(
      parseInt(prod.precioEditado)
    )}`;
  return desc;
}

export default function PreviewPage() {
  const { quoteData } = useQuote();
  const navigate = useNavigate();

  if (!quoteData || !quoteData.productos) {
    return (
      <div className="p-8">
        <h2 className="text-2xl">No hay cotización para mostrar</h2>
        <button
          onClick={() => navigate("/")}
          className="mt-4 bg-blue-500 text-white px-4 py-2 rounded"
        >
          Volver
        </button>
      </div>
    );
  }

  const { productos, cliente, subtotal, iva, total } = quoteData;

  // Para cada producto, construye un arreglo de subitems: [producto principal, ...extras]
  const filas = [];
  productos.forEach((prod, idx) => {
    const itemNum = idx + 1;
    // Producto principal
    filas.push({
      key: `${itemNum}`,
      isExtra: false,
      item: `${itemNum}`,
      descripcion: construirDescripcion(prod),
      cantidad: parseInt(prod.cantidad) || 1,
      precioUnit: prod.precioCalculado || 0,
      subtotal:
        (prod.precioCalculado || 0) * (parseInt(prod.cantidad) || 1),
    });
    // Extras por defecto seleccionados
    let subIdx = 1;
    if (prod.extras && prod.extras.length > 0) {
      prod.extras.forEach((e) => {
        const listaExtras = EXTRAS_POR_DEFECTO[prod.tipo] || [];
        let precioExtraUnit = 0;
        const encontrado = listaExtras.find((ex) => ex.nombre === e);
        if (encontrado) {
          if (encontrado.precio !== undefined) {
            precioExtraUnit = encontrado.precio;
          } else if (prod.cliente === "Distribuidor") {
            precioExtraUnit = encontrado.precioDistribuidor || 0;
          } else {
            precioExtraUnit = encontrado.precioCliente || 0;
          }
        }
        const cant = prod.extrasCantidades?.[e] || 1;
        filas.push({
          key: `${itemNum}.${subIdx}`,
          isExtra: true,
          item: `${itemNum}.${subIdx}`,
          descripcion: e,
          cantidad: cant,
          precioUnit: precioExtraUnit,
          subtotal: precioExtraUnit * cant,
        });
        subIdx++;
      });
    }
    // Extras personalizados
    if (prod.extrasPersonalizados && prod.extrasPersonalizados.length > 0) {
      prod.extrasPersonalizados.forEach((ex, j) => {
        const cant = prod.extrasPersonalizadosCant?.[j] || 1;
        filas.push({
          key: `${itemNum}.${subIdx}`,
          isExtra: true,
          item: `${itemNum}.${subIdx}`,
          descripcion: ex.nombre,
          cantidad: cant,
          precioUnit: ex.precio,
          subtotal: ex.precio * cant,
        });
        subIdx++;
      });
    }
  });

  return (
    <div className="max-w-5xl mx-auto p-8 bg-white rounded-lg shadow-lg">
      <h1 className="text-2xl font-bold mb-6">Vista previa de la cotización</h1>
      <div className="mb-4">
        <span className="font-semibold">Cliente:</span> {cliente}
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full border border-gray-300 mb-6">
          <thead className="bg-gray-100">
            <tr>
              <th className="px-3 py-2 border-b">Ítem #</th>
              <th className="px-3 py-2 border-b">Descripción</th>
              <th className="px-3 py-2 border-b">Cantidad</th>
              <th className="px-3 py-2 border-b">Precio unitario</th>
              <th className="px-3 py-2 border-b">Subtotal</th>
            </tr>
          </thead>
          <tbody>
            {filas.map((fila) => (
              <tr
                key={fila.key}
                className={
                  fila.isExtra
                    ? "bg-blue-50 text-sm"
                    : "border-b font-semibold"
                }
              >
                <td className="px-3 py-2 align-top text-center">{fila.item}</td>
                <td className="px-3 py-2 align-top whitespace-pre-line">{fila.descripcion}</td>
                <td className="px-3 py-2 align-top text-center">{fila.cantidad}</td>
                <td className="px-3 py-2 align-top text-right">
                  {formatearPesos(fila.precioUnit)}
                </td>
                <td className="px-3 py-2 align-top text-right">
                  {formatearPesos(fila.subtotal)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="text-right mr-3 mb-2">
        <div>
          <span className="font-semibold">Subtotal: </span>
          {formatearPesos(subtotal)}
        </div>
        <div>
          <span className="font-semibold">IVA (19%): </span>
          {formatearPesos(iva)}
        </div>
        <div className="text-lg font-bold">
          Total: {formatearPesos(total)}
        </div>
      </div>

      <div className="flex gap-4">
        <button
          className="bg-blue-500 text-white px-4 py-2 rounded"
          onClick={() => navigate("/")}
        >
          Editar cotización
        </button>
        <button
          className="bg-green-700 text-white px-4 py-2 rounded"
          onClick={() => generarPDF(quoteData)}
        >
          Descargar PDF
        </button>
      </div>
    </div>
  );
}
