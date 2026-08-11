import React from "react";

// Fila de identificación común a las 4 fichas de producción:
//   · N.° ficha de producción — lo asigna el sistema al guardar (AR/SA/DT/PR +
//     ddmmaa + consecutivo global); solo lectura, ver utils/codigoFicha.js.
//   · N.° orden de compra — referencia del cliente, opcional.
const INPUT_CLS = "mt-1 w-full px-3 py-2 rounded border border-gray-300 dark:border-gris-600 bg-white dark:bg-gris-700 text-sm";
const LABEL_CLS = "text-xs text-gray-600 dark:text-gray-300";

export default function IdentificacionFicha({
  codigo,
  ordenCompra,
  onOrdenCompraChange,
  inputCls = INPUT_CLS,
  labelCls = LABEL_CLS,
  extra = null,
}) {
  return (
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
  );
}
