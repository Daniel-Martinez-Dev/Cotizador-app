import React from "react";
import CotizacionSelector from "./CotizacionSelector";

// Fila de identificación común a las 6 fichas de producción:
//   · N.° ficha de producción — lo asigna el sistema al guardar (AR/SA/DT/PR +
//     ddmmaa + consecutivo global); solo lectura, ver utils/codigoFicha.js.
//   · N.° orden de compra — referencia del cliente, opcional. Es además lo que
//     agrupa las fichas de un mismo pedido (ver produccion/ordenesAgrupar.js).
//   · Cotización — de cuál salió el pedido, opcional. Es una referencia interna
//     y va aquí por lo mismo que la orden de compra: identifica la ficha frente
//     a los otros papeles del negocio (ver utils/documentoVinculo.js). Solo se
//     monta en la oficina: este formulario no existe en la interfaz de planta.
//   · Nombre / detalle — opcional, texto libre corto: "Zona 3", "Muelle 7",
//     "Bodega norte". Es lo único que distingue dos fichas por lo demás
//     idénticas —seis sellos de la misma medida en la misma orden de compra—,
//     así que va en grande en las tarjetas y en la ficha impresa.
const INPUT_CLS = "mt-1 w-full px-3 py-2 rounded border border-gray-300 dark:border-gris-600 bg-white dark:bg-gris-700 text-sm";
const LABEL_CLS = "text-xs text-gray-600 dark:text-gray-300";

export default function IdentificacionFicha({
  codigo,
  ordenCompra,
  onOrdenCompraChange,
  nombre,
  onNombreChange,
  // El formulario entero como valor: el selector necesita también `clienteId`
  // para avisar cuando la cotización elegida es de otro cliente.
  cotizacion = null,
  onCotizacionChange,
  inputCls = INPUT_CLS,
  labelCls = LABEL_CLS,
  extra = null,
}) {
  return (
    <div className="space-y-3">
      <div className={`grid gap-3 ${extra ? "grid-cols-2 sm:grid-cols-3" : "grid-cols-2"}`}>
        <div>
          <label className={labelCls}>N.° ficha de producción</label>
          <input
            value={codigo || ""}
            readOnly
            placeholder="Se asigna al guardar"
            title="Número consecutivo de la ficha de producción — lo asigna el sistema"
            className={`${inputCls} font-mono font-semibold tracking-tight bg-gray-100 dark:bg-gris-800 text-gray-700 dark:text-gray-200 cursor-default`}
          />
        </div>
        <div>
          <label className={labelCls}>
            N.° orden de compra <span className="opacity-60">(opcional)</span>
          </label>
          <input
            value={ordenCompra || ""}
            onChange={onOrdenCompraChange}
            className={inputCls}
            placeholder="Ref. del cliente"
          />
        </div>
        {extra}
      </div>

      {/* Vínculo con el cotizador. A renglón aparte porque el selector avisa
          debajo —cotización de otro cliente, historial ilegible— y esos avisos
          no caben dentro de una celda de la rejilla. */}
      {onCotizacionChange && (
        <CotizacionSelector
          value={cotizacion || {}}
          onChange={onCotizacionChange}
          inputCls={inputCls}
          labelCls={labelCls}
        />
      )}

      {/* A renglón aparte y a lo ancho: es texto, no un número, y es el dato
          con el que en planta se dice "el del muelle 7" en vez de recitar el
          consecutivo. */}
      {onNombreChange && (
        <div>
          <label className={labelCls}>
            Nombre o detalle de la ficha <span className="opacity-60">(opcional)</span>
          </label>
          <input
            value={nombre || ""}
            onChange={onNombreChange}
            className={inputCls}
            maxLength={60}
            placeholder="Zona 3, Muelle 7, Bodega norte…"
            title="Para distinguir esta ficha de otra igual del mismo pedido"
          />
        </div>
      )}
    </div>
  );
}
