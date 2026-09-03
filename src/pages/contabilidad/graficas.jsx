import React from "react";
import { formatCOP } from "../inventario/inventarioUtils";

// Gráficas de la sección contable.
//
// Sin librería a propósito: son cuatro formas (barras verticales, barras
// horizontales, un anillo y un medidor) y meter Recharts para eso son 400 KB
// más en un instalador que ya se distribuye por Windows y por Android.
//
// Todas se dibujan con divs y SVG del propio HTML, así que heredan el tema
// oscuro y el tamaño de letra de la app sin configurar nada. Y todas son
// clicables: la gráfica no está para adornar el tablero sino para filtrarlo —se
// pulsa un mes y la tabla de abajo queda en ese mes—.

// Paleta de series. El orden importa: es el que va tomando el mix de productos,
// y se escogió para que las tres primeras se distingan también impresas en gris.
export const COLORES = [
  { fondo: "bg-blue-500", texto: "text-blue-500", suave: "bg-blue-100 dark:bg-blue-900/40" },
  { fondo: "bg-emerald-500", texto: "text-emerald-500", suave: "bg-emerald-100 dark:bg-emerald-900/40" },
  { fondo: "bg-amber-500", texto: "text-amber-500", suave: "bg-amber-100 dark:bg-amber-900/40" },
  { fondo: "bg-purple-500", texto: "text-purple-500", suave: "bg-purple-100 dark:bg-purple-900/40" },
  { fondo: "bg-rose-500", texto: "text-rose-500", suave: "bg-rose-100 dark:bg-rose-900/40" },
  { fondo: "bg-cyan-500", texto: "text-cyan-500", suave: "bg-cyan-100 dark:bg-cyan-900/40" },
  { fondo: "bg-lime-500", texto: "text-lime-500", suave: "bg-lime-100 dark:bg-lime-900/40" },
  { fondo: "bg-orange-500", texto: "text-orange-500", suave: "bg-orange-100 dark:bg-orange-900/40" },
];

export const colorSerie = (i) => COLORES[i % COLORES.length];

// Cifras en millones. Una columna de ventas en pesos colombianos son nueve
// dígitos: escritos completos no caben bajo una barra de 20 px de ancho.
export function corto(valor) {
  const n = Math.abs(Number(valor) || 0);
  if (n >= 1_000_000_000) return `${(valor / 1_000_000_000).toFixed(1).replace(".0", "")} MM`;
  if (n >= 1_000_000) return `${Math.round(valor / 1_000_000)} M`;
  if (n >= 1_000) return `${Math.round(valor / 1_000)} k`;
  return String(Math.round(valor || 0));
}

function Titulo({ titulo, detalle, acciones }) {
  if (!titulo && !acciones) return null;
  return (
    <div className="flex items-start justify-between gap-3 mb-3">
      <div className="min-w-0">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white">{titulo}</h3>
        {detalle && <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">{detalle}</p>}
      </div>
      {acciones && <div className="shrink-0 flex items-center gap-2">{acciones}</div>}
    </div>
  );
}

/**
 * Barras por mes. `serie` son objetos { mes, etiqueta, valor }.
 *
 * Los meses sin ventas se dibujan vacíos y no se saltan: el hueco de mitad de
 * año es un dato, y una gráfica que solo pinta los meses con factura hace
 * parecer que el año fue parejo.
 */
export function BarrasMes({ serie = [], seleccion = "", onSeleccionar, titulo, detalle, acciones, alto = "h-32" }) {
  const maximo = Math.max(1, ...serie.map((p) => Math.abs(p.valor || 0)));
  const conVentas = serie.filter((p) => p.valor);
  const promedio = conVentas.length ? conVentas.reduce((a, p) => a + p.valor, 0) / conVentas.length : 0;

  return (
    <div>
      <Titulo titulo={titulo} detalle={detalle} acciones={acciones} />
      <div className={`relative ${alto}`}>
        {/* Línea del promedio: sin ella, doce barras solo dicen cuál fue la más
            alta; con ella se ve qué meses estuvieron por debajo de lo normal.
            Va en su propia capa, que termina donde empiezan los rótulos
            (bottom-5 = el alto del rótulo más su separación), para que el
            porcentaje se mida contra la misma altura que las barras. */}
        {promedio > 0 && (
          <div className="absolute inset-x-0 top-0 bottom-5 pointer-events-none z-10">
            <div
              className="absolute inset-x-0 border-t border-dashed border-gray-400/70 dark:border-gray-500/70"
              style={{ bottom: `${(promedio / maximo) * 100}%` }}
              title={`Promedio mensual ${formatCOP(promedio)}`}
            />
          </div>
        )}
        <div className="flex items-stretch gap-1 sm:gap-1.5 h-full">
          {serie.map((punto, i) => {
            const activo = seleccion === punto.mes;
            const hay = Math.abs(punto.valor) > 0;
            const pct = hay ? Math.max(3, (Math.abs(punto.valor) / maximo) * 100) : 0;
            const negativo = punto.valor < 0;
            return (
              <button
                key={punto.mes || i}
                type="button"
                onClick={() => onSeleccionar?.(activo ? "" : punto.mes)}
                disabled={!onSeleccionar}
                title={`${punto.etiqueta || punto.mes}: ${formatCOP(punto.valor)}`}
                aria-pressed={activo}
                className="flex-1 min-w-0 flex flex-col gap-1 group focus:outline-none focus-visible:ring-2 focus-visible:ring-trafico/60 rounded"
              >
                <span className="flex-1 flex items-end w-full">
                  <span
                    className={`w-full rounded-t transition-all ${
                      negativo
                        ? "bg-red-400"
                        : activo
                          ? "bg-trafico"
                          : hay
                            ? "bg-blue-500/80 group-hover:bg-blue-500"
                            : "bg-gray-200 dark:bg-gris-700"
                    }`}
                    style={{ height: hay ? `${pct}%` : "2px" }}
                  />
                </span>
                <span
                  className={`h-4 leading-4 text-[10px] truncate ${
                    activo ? "font-semibold text-gray-900 dark:text-white" : "text-gray-500 dark:text-gray-400"
                  }`}
                >
                  {punto.etiqueta || punto.mes}
                </span>
              </button>
            );
          })}
        </div>
      </div>
      <div className="mt-2 flex items-center justify-between text-[10px] text-gray-500 dark:text-gray-400">
        <span>Máx {corto(maximo)}</span>
        {promedio > 0 && <span>Promedio {corto(promedio)}</span>}
      </div>
    </div>
  );
}

/**
 * Ranking en barras horizontales. `items` son { clave, etiqueta, valor,
 * detalle }. En el teléfono es la única forma de ranking que se lee: veinte
 * nombres de empresa en barras verticales no caben.
 */
export function BarrasRanking({ items = [], seleccion = "", onSeleccionar, titulo, detalle, acciones, colorear = false, vacio = "Sin datos" }) {
  const maximo = Math.max(1, ...items.map((i) => Math.abs(i.valor || 0)));

  return (
    <div>
      <Titulo titulo={titulo} detalle={detalle} acciones={acciones} />
      {!items.length ? (
        <p className="text-xs text-gray-500 dark:text-gray-400 py-4 text-center">{vacio}</p>
      ) : (
        <ul className="grid gap-1.5">
          {items.map((item, i) => {
            const activo = seleccion && seleccion === item.clave;
            const pct = Math.max(2, (Math.abs(item.valor) / maximo) * 100);
            const color = colorear ? colorSerie(i).fondo : activo ? "bg-trafico" : "bg-blue-500/80";
            return (
              <li key={item.clave || i}>
                <button
                  type="button"
                  onClick={() => onSeleccionar?.(activo ? "" : item.clave)}
                  disabled={!onSeleccionar}
                  aria-pressed={activo}
                  className={`w-full text-left rounded-lg px-2 py-1.5 transition-colors ${
                    onSeleccionar ? "hover:bg-gray-50 dark:hover:bg-gris-700/40" : ""
                  } ${activo ? "bg-gray-100 dark:bg-gris-700/60" : ""} focus:outline-none focus-visible:ring-2 focus-visible:ring-trafico/60`}
                >
                  <div className="flex items-baseline justify-between gap-3">
                    <span className={`text-xs truncate ${activo ? "font-semibold text-gray-900 dark:text-white" : "text-gray-700 dark:text-gray-200"}`}>
                      {item.etiqueta}
                    </span>
                    <span className="text-xs tabular-nums shrink-0 text-gray-900 dark:text-gray-100">{formatCOP(item.valor)}</span>
                  </div>
                  <div className="mt-1 h-1.5 rounded-full bg-gray-100 dark:bg-gris-900 overflow-hidden">
                    <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
                  </div>
                  {item.detalle && (
                    <div className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5 truncate">{item.detalle}</div>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

/**
 * Anillo de participación. Se usa para el mix de productos, donde lo que se
 * mira no es cuánto vendió cada uno sino qué tanto pesa dentro del total —y esa
 * es la pregunta que una barra no contesta de un vistazo—.
 *
 * `pathLength=100` deja la matemática en porcentajes directos, sin tener que
 * calcular la circunferencia a mano.
 */
export function Anillo({ partes = [], total = 0, centro, subcentro, tamano = 128, grosor = 14, seleccion = "", onSeleccionar }) {
  const base = Math.max(1, Math.abs(total) || partes.reduce((a, p) => a + Math.abs(p.valor), 0));
  const radio = (tamano - grosor) / 2;
  let acumulado = 0;

  return (
    <div className="flex items-center gap-4">
      <svg
        width={tamano}
        height={tamano}
        viewBox={`0 0 ${tamano} ${tamano}`}
        className="shrink-0 -rotate-90"
        role="img"
        aria-label="Participación por producto"
      >
        <circle
          cx={tamano / 2}
          cy={tamano / 2}
          r={radio}
          fill="none"
          strokeWidth={grosor}
          className="stroke-gray-100 dark:stroke-gris-700"
        />
        {partes.map((parte, i) => {
          const pct = (Math.abs(parte.valor) / base) * 100;
          if (pct <= 0) return null;
          const offset = -acumulado;
          acumulado += pct;
          const apagada = seleccion && seleccion !== parte.clave;
          return (
            <circle
              key={parte.clave || i}
              cx={tamano / 2}
              cy={tamano / 2}
              r={radio}
              fill="none"
              stroke="currentColor"
              strokeWidth={grosor}
              pathLength="100"
              strokeDasharray={`${Math.max(0.6, pct)} ${100 - Math.max(0.6, pct)}`}
              strokeDashoffset={offset}
              className={`${colorSerie(i).texto} transition-opacity ${apagada ? "opacity-25" : ""} ${onSeleccionar ? "cursor-pointer" : ""}`}
              onClick={() => onSeleccionar?.(seleccion === parte.clave ? "" : parte.clave)}
            >
              <title>{`${parte.etiqueta}: ${formatCOP(parte.valor)} (${Math.round(pct)} %)`}</title>
            </circle>
          );
        })}
      </svg>

      <ul className="min-w-0 grid gap-1 text-xs">
        {centro && (
          <li className="mb-1">
            <div className="text-base font-semibold text-gray-900 dark:text-white tabular-nums">{centro}</div>
            {subcentro && <div className="text-[11px] text-gray-500 dark:text-gray-400">{subcentro}</div>}
          </li>
        )}
        {partes.map((parte, i) => {
          const pct = Math.round((Math.abs(parte.valor) / base) * 100);
          const activa = seleccion === parte.clave;
          return (
            <li key={parte.clave || i}>
              <button
                type="button"
                onClick={() => onSeleccionar?.(activa ? "" : parte.clave)}
                disabled={!onSeleccionar}
                className={`flex items-center gap-2 min-w-0 w-full text-left rounded px-1 -mx-1 ${
                  onSeleccionar ? "hover:bg-gray-50 dark:hover:bg-gris-700/40" : ""
                } ${activa ? "font-semibold" : ""}`}
              >
                <span className={`h-2.5 w-2.5 shrink-0 rounded-sm ${colorSerie(i).fondo}`} aria-hidden="true" />
                <span className="truncate text-gray-700 dark:text-gray-200">{parte.etiqueta}</span>
                <span className="ml-auto shrink-0 tabular-nums text-gray-500 dark:text-gray-400">{pct} %</span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

const TONO_MEDIDOR = {
  success: "bg-emerald-500",
  warning: "bg-amber-500",
  neutral: "bg-gray-400 dark:bg-gris-500",
};

/**
 * Medidor de 0 a 100 con las dos marcas que deciden (50 y 75). Se ve dónde
 * quedó el cliente y cuánto le falta para el siguiente escalón, que es lo que
 * un número suelto no dice.
 */
export function Medidor({ puntaje = 0, tono = "neutral", etiqueta, marcas = [50, 75], className = "" }) {
  const valor = Math.min(100, Math.max(0, Number(puntaje) || 0));
  return (
    <div className={className}>
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-xl font-bold tabular-nums text-gray-900 dark:text-white">{valor}</span>
        {etiqueta && <span className="text-[11px] text-gray-500 dark:text-gray-400 truncate">{etiqueta}</span>}
      </div>
      <div
        className="relative mt-1 h-2 rounded-full bg-gray-100 dark:bg-gris-900 overflow-hidden"
        role="meter"
        aria-valuenow={valor}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div className={`h-full rounded-full ${TONO_MEDIDOR[tono] || TONO_MEDIDOR.neutral}`} style={{ width: `${valor}%` }} />
        {marcas.map((m) => (
          <span
            key={m}
            className="absolute top-0 bottom-0 w-px bg-white/80 dark:bg-black/60"
            style={{ left: `${m}%` }}
            aria-hidden="true"
          />
        ))}
      </div>
    </div>
  );
}

/** Una barra de factor dentro del desglose de un puntaje. */
export function BarraFactor({ label, valor = 0, detalle, className = "" }) {
  const pct = Math.round(Math.min(1, Math.max(0, valor)) * 100);
  const color = pct >= 75 ? "bg-emerald-500" : pct >= 40 ? "bg-amber-500" : "bg-red-400";
  return (
    <div className={className}>
      <div className="flex items-baseline justify-between gap-2 text-[11px]">
        <span className="text-gray-600 dark:text-gray-300 truncate">{label}</span>
        <span className="tabular-nums text-gray-500 dark:text-gray-400 shrink-0">{pct} %</span>
      </div>
      <div className="mt-1 h-1.5 rounded-full bg-gray-100 dark:bg-gris-900 overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${Math.max(2, pct)}%` }} />
      </div>
      {detalle && <div className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5">{detalle}</div>}
    </div>
  );
}
