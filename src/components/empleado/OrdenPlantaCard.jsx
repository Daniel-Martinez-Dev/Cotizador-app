import React from "react";
import { Link } from "react-router-dom";
import {
  FaChevronRight, FaRulerCombined, FaLayerGroup, FaCalendarAlt,
  FaExclamationCircle, FaCheck, FaFileAlt,
} from "react-icons/fa";
import EstadoBadge from "../fichas/EstadoBadge";
import { codigoFichaOFallback } from "../../utils/codigoFicha";
import { medidasFichaTexto } from "../../utils/medidasFicha";
import { nombreClienteImpreso } from "../../utils/clienteVinculo";

// La orden tal como se ve en el teléfono de planta.
//
// Está pensada para leerse de un vistazo y tocarse con guantes: el cliente y la
// medida en grande —los dos datos con los que se reconoce una orden en la
// mesa— y la ficha a un solo toque. Antes había que entrar al detalle y buscar
// "Ver ficha" adentro, dos toques para llegar a lo que se hace casi siempre.
//
// El botón de la ficha va fuera del enlace a propósito: un <button> dentro de
// un <a> no es HTML válido, y en Android el toque termina abriendo el enlace.

export default function OrdenPlantaCard({
  ficha,
  seleccionable = false,   // modo "varias": la tarjeta marca en vez de abrir
  marcada = false,
  onAlternar,
  onVerFicha,              // null = esta orden no tiene ficha imprimible
}) {
  const medida = medidasFichaTexto(ficha);
  const cantidad = Number(ficha.cantidad || 0);
  const cliente = nombreClienteImpreso(ficha) || "Sin cliente";
  const urgencia = urgenciaEntrega(ficha);

  const cuerpo = (
    <>
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-[10px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
          {ficha.tipoLabel}
        </span>
        <span className="text-[10px] text-gray-400 font-mono">{codigoFichaOFallback(ficha)}</span>
        {/* La orden de compra es la referencia con la que el cliente pregunta
            por el pedido: en planta sirve para confirmar por teléfono que se
            está mirando la orden correcta, sin abrir la ficha. */}
        {ficha.numeroOrdenCompra && (
          <span className="text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded border border-gray-200 dark:border-gris-600 bg-gray-50 dark:bg-gris-700/60 text-gray-600 dark:text-gray-300">
            OC {ficha.numeroOrdenCompra}
          </span>
        )}
      </div>

      {/* Cliente y medida juntos: cuando un mismo cliente tiene varias órdenes
          abiertas, la medida es lo que las distingue en planta. */}
      <div className="font-semibold text-base leading-snug break-words mt-0.5">{cliente}</div>

      <div className="flex items-center gap-2 flex-wrap mt-1.5">
        {medida ? (
          <span className="inline-flex items-center gap-1.5 rounded-md bg-gray-900 text-white dark:bg-gris-700 dark:text-gray-100 px-2.5 py-1.5 font-mono font-bold text-base leading-none">
            <FaRulerCombined className="text-[11px] opacity-70" aria-hidden="true" />
            {medida}
            <span className="text-[10px] font-sans font-normal opacity-70">mm</span>
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 rounded-md bg-gray-100 dark:bg-gris-700 text-gray-600 dark:text-gray-300 px-2.5 py-1.5 text-xs leading-none">
            <FaLayerGroup className="text-[10px] opacity-70" aria-hidden="true" />
            {(ficha.items?.length || 0) > 0 ? `${ficha.items.length} ítems` : "Sin medidas"}
          </span>
        )}
        {cantidad > 1 && (
          <span className="text-sm font-bold text-gray-700 dark:text-gray-200">×{cantidad}</span>
        )}
      </div>

      <div className="text-xs text-gray-500 dark:text-gray-400 mt-2 inline-flex items-center gap-1.5 flex-wrap">
        <FaCalendarAlt className="text-[10px]" aria-hidden="true" />
        Entrega: {fmtFecha(ficha.fechaEntrega)}
        {urgencia && (
          <span className={`inline-flex items-center gap-1 ${urgencia.cls}`}>
            {urgencia.alerta && <FaExclamationCircle className="text-[10px]" aria-hidden="true" />}
            {urgencia.texto}
          </span>
        )}
      </div>
    </>
  );

  const tarjetaCls = `rounded-xl border transition ${
    marcada
      ? "border-green-500 bg-green-50 dark:bg-green-900/20"
      : "border-gray-200 dark:border-gris-700 bg-white dark:bg-gris-800"
  }`;

  // Armando un pedido: toda la tarjeta marca y no hay acciones que distraigan.
  if (seleccionable) {
    return (
      <button
        type="button"
        onClick={() => onAlternar?.(ficha)}
        aria-pressed={marcada}
        className={`${tarjetaCls} flex items-start gap-3 w-full text-left px-3 py-3 active:scale-[0.99]`}
      >
        <span
          aria-hidden="true"
          className={`h-6 w-6 mt-0.5 shrink-0 rounded-md border flex items-center justify-center ${
            marcada ? "bg-green-600 border-green-600 text-white" : "border-gray-300 dark:border-gris-600"
          }`}
        >
          {marcada && <FaCheck className="text-[11px]" />}
        </span>
        <div className="flex-1 min-w-0">{cuerpo}</div>
        <EstadoBadge estado={ficha.estado} />
      </button>
    );
  }

  return (
    <div className={tarjetaCls}>
      <Link
        to={`/planta/produccion/${ficha.tipo}/${ficha.id}`}
        className="flex items-start gap-3 px-3 pt-3 pb-2 active:opacity-70"
      >
        <div className="flex-1 min-w-0">{cuerpo}</div>
        <div className="flex flex-col items-end gap-1.5 shrink-0">
          <EstadoBadge estado={ficha.estado} />
          <FaChevronRight className="text-gray-400 text-xs" />
        </div>
      </Link>

      {onVerFicha && (
        <div className="px-3 pb-3">
          <button
            type="button"
            onClick={() => onVerFicha(ficha)}
            className="w-full inline-flex items-center justify-center gap-2 py-2.5 rounded-lg bg-blue-600 active:bg-blue-700 text-white text-sm font-semibold"
          >
            <FaFileAlt className="text-xs" aria-hidden="true" />
            Ver ficha
            <span className="sr-only"> de {cliente}</span>
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Fechas de entrega ──────────────────────────────────────────────────────

function aFecha(f) {
  if (!f) return null;
  try {
    const m = typeof f === "string" && /^(\d{4})-(\d{2})-(\d{2})$/.exec(f);
    const d = m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : new Date(f);
    return Number.isNaN(d.getTime()) ? null : d;
  } catch {
    return null;
  }
}

function fmtFecha(f) {
  const d = aFecha(f);
  return d ? d.toLocaleDateString("es-CO") : "—";
}

// Días que faltan para la entrega (negativo = vencida). Se compara a
// medianoche: una entrega de hoy no está vencida por la hora que sea.
function diasParaEntrega(f) {
  const d = aFecha(f);
  if (!d) return null;
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  d.setHours(0, 0, 0, 0);
  return Math.round((d - hoy) / 86400000);
}

// La urgencia solo aplica mientras la ficha esté en planta: una entregada tarde
// ya no es una alarma, es historia.
function urgenciaEntrega(ficha) {
  if ((ficha.estado || "en_produccion") === "entregado") return null;
  const dias = diasParaEntrega(ficha.fechaEntrega);
  if (dias === null) return null;
  if (dias < 0) return { texto: `Vencida hace ${Math.abs(dias)} d`, cls: "text-red-700 dark:text-red-400 font-semibold", alerta: true };
  if (dias === 0) return { texto: "Entrega hoy", cls: "text-red-700 dark:text-red-400 font-semibold", alerta: true };
  if (dias === 1) return { texto: "Entrega mañana", cls: "text-amber-700 dark:text-amber-400 font-semibold", alerta: true };
  if (dias <= 3) return { texto: `En ${dias} días`, cls: "text-amber-700 dark:text-amber-400 font-medium", alerta: false };
  return null;
}
