import React from "react";
import { FaCheckCircle, FaExclamationTriangle, FaFileInvoiceDollar, FaTimes } from "react-icons/fa";
import Combobox from "../ui/Combobox";
import { useListaCacheada } from "../../utils/listaCacheada";
import { listaCotizaciones } from "../../utils/listasVinculo";
import {
  clienteDiscrepa,
  etiquetaCotizacion,
  sinCotizacion,
  vinculoDesdeCotizacion,
} from "../../utils/documentoVinculo";

// Selector de la cotización de la que salió la ficha. Opcional: una ficha
// urgente no espera a que exista la cotización, y las miles de fichas ya
// guardadas no tienen ninguna (ver utils/documentoVinculo.js).
//
// El campo NO es de texto libre, al revés que el de cliente. Un número de
// cotización tecleado a mano no sirve para nada —no abre el documento, no
// cuadra con contabilidad— y sí alcanza para hacer creer que la ficha está
// vinculada cuando no lo está. O se elige una de la lista, o no hay vínculo.
//
// La lista se pinta con lo último que se leyó y se refresca por detrás: el
// formulario se abre y se cierra muchas veces seguidas al cargar un pedido, y
// una cotización guardada hace un minuto tiene que aparecer sin recargar la
// app (ver utils/listaCacheada.js).

const fechaCorta = (f) => {
  try {
    return f ? new Date(f).toLocaleDateString("es-CO") : "";
  } catch {
    return "";
  }
};

export default function CotizacionSelector({
  value = {},
  onChange,
  inputCls = "",
  labelCls = "",
  className = "",
  label = "Cotización",
}) {
  const { datos: cotizaciones, cargando, error } = useListaCacheada(listaCotizaciones);
  const [busqueda, setBusqueda] = React.useState("");

  const vinculada = Boolean(value.cotizacionId);

  // La cotización elegida, cuando alcanza a estar en la lista. Puede no estar
  // —es más vieja que las últimas 300, o quien edita la ficha no tiene permiso
  // de leerla— y entonces el vínculo se muestra igual con el número congelado
  // en la ficha, que para eso se guardó.
  const elegida = React.useMemo(
    () => (vinculada ? cotizaciones.find((c) => c.id === value.cotizacionId) || null : null),
    [vinculada, cotizaciones, value.cotizacionId]
  );

  // Las del mismo cliente primero: es casi siempre la que se busca, y con
  // trescientas en la lista el orden es lo único que hace corta la búsqueda.
  const opciones = React.useMemo(() => {
    const propio = String(value.clienteId || "");
    const ordenadas = propio
      ? [...cotizaciones].sort((a, b) => (b.empresaId === propio) - (a.empresaId === propio))
      : cotizaciones;
    return ordenadas.map((c) => ({
      id: c.id,
      label: c.numero ? `N.º ${c.numero}` : "Sin número",
      sublabel: [c.nombreCliente, fechaCorta(c.fecha), c.estadoSeguimiento].filter(Boolean).join(" · "),
      data: c,
    }));
  }, [cotizaciones, value.clienteId]);

  const elegir = (opcion) => {
    setBusqueda("");
    onChange(vinculoDesdeCotizacion(opcion.data));
  };

  const desvincular = () => {
    setBusqueda("");
    onChange(sinCotizacion());
  };

  // Vinculada a una cotización de otro cliente. No se impide —hay pedidos que
  // se cotizan a la matriz y se fabrican para una sede— pero es el error típico
  // al elegir de una lista larga.
  const discrepa = clienteDiscrepa(value, elegida);

  return (
    <div className={className}>
      <label className={labelCls}>
        {label} <span className="opacity-60">(opcional)</span>
      </label>

      {vinculada ? (
        <div className={`${inputCls} flex items-center gap-2 !py-1.5`}>
          <FaFileInvoiceDollar className="shrink-0 text-[11px] text-blue-600 dark:text-blue-400" />
          <span className="min-w-0 flex-1 truncate font-medium">
            {etiquetaCotizacion(value)}
            {elegida?.nombreCliente && (
              <span className="ml-1.5 font-normal opacity-60">{elegida.nombreCliente}</span>
            )}
          </span>
          <button
            type="button"
            onClick={desvincular}
            title="Quitar el vínculo con la cotización. La ficha no cambia."
            className="shrink-0 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
          >
            <FaTimes />
          </button>
        </div>
      ) : (
        <Combobox
          value={busqueda}
          onChange={setBusqueda}
          onSelect={elegir}
          options={opciones}
          disabled={cargando || error}
          placeholder={cargando ? "Cargando cotizaciones…" : "Buscar por número o cliente"}
          inputClassName={inputCls}
          emptyText="Ninguna cotización con ese número o cliente"
        />
      )}

      {error ? (
        <div className="mt-1 flex items-start gap-1.5 text-[11px] text-amber-700 dark:text-amber-400">
          <FaExclamationTriangle className="shrink-0 mt-0.5" />
          <span>No se pudo leer el historial de cotizaciones. La ficha se guarda igual, sin vínculo.</span>
        </div>
      ) : discrepa ? (
        <div className="mt-1 flex items-start gap-1.5 text-[11px] text-amber-700 dark:text-amber-400">
          <FaExclamationTriangle className="shrink-0 mt-0.5" />
          <span>
            Esa cotización es de «{elegida.nombreCliente || "otro cliente"}», distinto al de la ficha.
            Revisa que sea la correcta.
          </span>
        </div>
      ) : vinculada ? (
        <div className="mt-1 flex items-center gap-1.5 text-[11px] text-green-700 dark:text-green-400">
          <FaCheckCircle className="shrink-0" />
          <span className="truncate">Ficha vinculada a la cotización</span>
        </div>
      ) : null}
    </div>
  );
}

// Insignia de solo lectura para el detalle de la orden en la oficina.
//
// No se usa —ni debe usarse— en la interfaz de planta ni en la ficha impresa:
// el operario alista y firma, y lo que se cotizó no es asunto suyo. Ver el
// panel de planta (pages/empleado) y las fichas de impresión, que no la montan.
export function CotizacionBadge({ ficha, onAbrir = null, className = "" }) {
  if (!ficha?.cotizacionId) return null;
  const contenido = (
    <>
      <FaFileInvoiceDollar className="text-[10px] shrink-0 opacity-70" />
      <span className="truncate min-w-0">{etiquetaCotizacion(ficha)}</span>
    </>
  );
  const clases =
    "min-w-0 shrink inline-flex items-center gap-1.5 rounded-md border border-blue-200 dark:border-blue-800 " +
    `bg-blue-50 dark:bg-blue-900/30 px-2.5 py-1 text-xs font-semibold text-blue-800 dark:text-blue-300 ${className}`;

  return onAbrir ? (
    <button type="button" onClick={onAbrir} title="Ver la cotización en el historial" className={`${clases} hover:bg-blue-100 dark:hover:bg-blue-900/50`}>
      {contenido}
    </button>
  ) : (
    <span title={etiquetaCotizacion(ficha)} className={clases}>{contenido}</span>
  );
}
