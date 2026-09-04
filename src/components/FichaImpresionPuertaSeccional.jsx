import React from "react";
import FichaImpresionShell from "./fichas/FichaImpresionShell";
import { fmtMm, fmtDec, fmtN, fmtDate } from "../utils/fichaFormat";
import logoPng from "../assets/imagenes/logo.png";
import { PARAMETROS_PUERTA_SECCIONAL } from "../modules/produccion/puertas-seccionales/parametros.js";
import { AcabadoCard, SectionTitle, Membrete, Firmas, FichaFooter, InfoChip, MedidaHero, Casilla } from "./fichas/FichaVisualKit";
import { codigoFichaOFallback } from "../utils/codigoFicha";
import { nombreClienteImpreso } from "../utils/clienteVinculo";

// Cotas del plano: negro y con halo blanco (paintOrder) para que el número se
// lea aunque caiga encima del dibujo — la ficha se imprime y se lleva al taller.
// Mismo lenguaje visual que los planos de División Térmica y Puerta Rápida.
const TEXTO_PLANO = "#000000";
const haloTexto = { paintOrder: "stroke", stroke: "#ffffff", strokeWidth: 2.4, strokeLinejoin: "round" };

function DimH({ x1, x2, y, label, dy = -5 }) {
  return (
    <g>
      <line x1={x1} y1={y} x2={x2} y2={y} stroke={TEXTO_PLANO} strokeWidth="1" markerStart="url(#arrPS-b)" markerEnd="url(#arrPS-a)" />
      <text x={(x1 + x2) / 2} y={y + dy} fontSize="7.5" fontWeight="bold" fill={TEXTO_PLANO} textAnchor="middle" style={haloTexto}>{label}</text>
    </g>
  );
}
function DimV({ x, y1, y2, label, dx = -7 }) {
  const midY = (y1 + y2) / 2;
  return (
    <g>
      <line x1={x} y1={y1} x2={x} y2={y2} stroke={TEXTO_PLANO} strokeWidth="1" markerStart="url(#arrPS-b)" markerEnd="url(#arrPS-a)" />
      <text x={x + dx} y={midY} fontSize="7.5" fontWeight="bold" fill={TEXTO_PLANO} textAnchor="middle" transform={`rotate(-90,${x + dx},${midY})`} style={haloTexto}>{label}</text>
    </g>
  );
}

// Ancho de la guía lateral — solo para dar cuerpo al dibujo. No sale de ninguna
// fórmula de la ficha, así que no vive en PARAMETROS_PUERTA_SECCIONAL.
const ANCHO_GUIA_DIBUJO_MM = 100;

// ── Plano técnico ─────────────────────────────────────────────────────────────
// Dos vistas en una misma lámina:
//   · Frontal — réplica del croquis del Excel: eje superior con sus dos tambores
//     y el resorte al centro, guías laterales, la cortina partida en los paneles
//     reales (de ALTO_PANEL_MM cada uno desde el piso, con el de arriba recortado
//     contra el dintel) y la ventana centrada en el 3.er panel.
//   · Lateral — el recorrido de la puerta, que es lo que separa una CURVA de una
//     VERTICAL: la CURVA sube por el riel recto, dobla y corre por las guías
//     horizontales; la VERTICAL sigue derecho hasta el doble del alto del vano.
//     Es el respaldo visual de "guías horizontales" y del reparto de rieles
//     rectos/curvos del listado de empaque.
// Todas las cotas se recalculan de las medidas de la ficha.
function PlanoTecnicoPuertaSeccional({
  anchoVano, altoVano, cantidadPaneles, altoPanel, centroVentana, panelVentana,
  ventanas, ejeSuperior, guiasHorizontales, recorrido, tipo, resortes,
}) {
  const W = 680, H = 400;
  // La vista frontal se queda con la banda izquierda; la lateral, con la derecha.
  const FRENTE_W = 420;
  const margin = { top: 62, right: 66, bottom: 52, left: 46 };
  const drawW = FRENTE_W - margin.left - margin.right;
  const drawH = H - margin.top - margin.bottom;

  const anchoGuia = ANCHO_GUIA_DIBUJO_MM;
  // El eje sobresale del vano por ambos lados: es la pieza más ancha del
  // conjunto y la que fija la escala horizontal del dibujo.
  const totalW = Math.max(ejeSuperior || 0, anchoVano + anchoGuia * 2);
  const alturaEje = altoPanel;           // aire reservado arriba para eje y tambores
  const totalH = altoVano + alturaEje;
  const scale = Math.min(drawW / totalW, drawH / totalH) * 0.99;

  const vanoW = anchoVano * scale;
  const vanoH = altoVano * scale;
  const guideW = anchoGuia * scale;
  const ejeW = (ejeSuperior || totalW) * scale;

  const cx = margin.left + drawW / 2;
  const vanoX0 = cx - vanoW / 2;
  const vanoX1 = vanoX0 + vanoW;
  const topY = margin.top + (drawH - (alturaEje * scale + vanoH)) / 2 + 8;
  const ejeY = topY + alturaEje * scale * 0.55;
  const dintelY = topY + alturaEje * scale;   // borde superior del vano
  const floorY = dintelY + vanoH;

  const linea = "#000000";

  // Costuras entre paneles, medidas desde el piso: los paneles van completos de
  // abajo hacia arriba y el último se recorta contra el dintel — por eso la
  // junta más alta puede quedar más cerca del dintel que las demás.
  const juntas = [];
  for (let i = 1; i < cantidadPaneles; i++) {
    const mm = i * altoPanel;
    if (mm < altoVano - 1) juntas.push(floorY - mm * scale);
  }

  // Ventana: centrada a lo ancho (centroVentana) dentro del panel indicado,
  // contado desde el piso — a la altura de la vista.
  const bandaBase_mm = (panelVentana - 1) * altoPanel;
  const bandaTope_mm = Math.min(panelVentana * altoPanel, altoVano);
  const hayVentana = ventanas > 0 && bandaBase_mm < altoVano;
  const ventanaH = Math.max(0, (bandaTope_mm - bandaBase_mm) * scale) * 0.6;
  const ventanaW = Math.min(vanoW * 0.42, 200);
  const ventanaCx = vanoX0 + (centroVentana ?? anchoVano / 2) * scale;
  const ventanaY = floorY - bandaTope_mm * scale + ((bandaTope_mm - bandaBase_mm) * scale - ventanaH) / 2;

  const zocaloH = Math.min(5, vanoH * 0.045);
  const tamborR = Math.max(4, alturaEje * scale * 0.2);
  const ejeX0 = cx - ejeW / 2;
  const ejeX1 = cx + ejeW / 2;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ display: "block", maxWidth: "100%", margin: "0 auto", fontFamily: "Arial, sans-serif" }}>
      <defs>
        <marker id="arrPS-a" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
          <path d="M0,0 L6,3 L0,6 Z" fill={TEXTO_PLANO} />
        </marker>
        <marker id="arrPS-b" markerWidth="6" markerHeight="6" refX="1" refY="3" orient="auto">
          <path d="M6,0 L0,3 L6,6 Z" fill={TEXTO_PLANO} />
        </marker>
        <linearGradient id="aluminioPS" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#dfe6ee" />
          <stop offset="45%" stopColor="#9aa8b6" />
          <stop offset="100%" stopColor="#eef2f7" />
        </linearGradient>
        <linearGradient id="panelPS" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#f8fafc" />
          <stop offset="55%" stopColor="#e2e8f0" />
          <stop offset="100%" stopColor="#cbd5e1" />
        </linearGradient>
        <linearGradient id="vidrioPS" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#f8fbff" />
          <stop offset="100%" stopColor="#d6e7f5" />
        </linearGradient>
      </defs>

      {/* Cota principal: eje superior, arriba de todo y con el cuerpo más grande */}
      <line x1={ejeX0} y1={30} x2={ejeX1} y2={30} stroke={TEXTO_PLANO} strokeWidth="1.2" markerStart="url(#arrPS-b)" markerEnd="url(#arrPS-a)" />
      <line x1={ejeX0} y1={32} x2={ejeX0} y2={ejeY - tamborR - 4} stroke={TEXTO_PLANO} strokeWidth="0.6" />
      <line x1={ejeX1} y1={32} x2={ejeX1} y2={ejeY - tamborR - 4} stroke={TEXTO_PLANO} strokeWidth="0.6" />
      <text x={cx} y={22} fontSize="11" fontWeight="bold" fill={TEXTO_PLANO} textAnchor="middle" style={haloTexto}>
        EJE SUPERIOR: {fmtMm(ejeSuperior)} mm
      </text>

      {/* Eje + resorte central + tambores en los extremos */}
      <rect x={ejeX0} y={ejeY - 2} width={ejeW} height="4" fill="url(#aluminioPS)" stroke={linea} strokeWidth="0.8" />
      <rect x={cx - ejeW * 0.16} y={ejeY - 5} width={ejeW * 0.32} height="10" rx="2" fill="#374151" stroke={linea} strokeWidth="0.8" />
      {Array.from({ length: 11 }, (_, i) => cx - ejeW * 0.16 + (i + 0.5) * (ejeW * 0.32 / 11)).map((x, i) => (
        <line key={`res${i}`} x1={x} y1={ejeY - 5} x2={x + 3} y2={ejeY + 5} stroke="#e5e7eb" strokeWidth="0.7" />
      ))}
      <text x={cx} y={ejeY - 9} fontSize="7" fontWeight="bold" fill={TEXTO_PLANO} textAnchor="middle" style={haloTexto}>
        RESORTE ×{fmtN(resortes)}
      </text>
      {[ejeX0 + ejeW * 0.13, ejeX1 - ejeW * 0.13].map((x, i) => (
        <g key={`tam${i}`}>
          <circle cx={x} cy={ejeY} r={tamborR} fill="url(#aluminioPS)" stroke={linea} strokeWidth="1" />
          <circle cx={x} cy={ejeY} r={tamborR * 0.45} fill="#4b5563" stroke={linea} strokeWidth="0.6" />
        </g>
      ))}
      <text x={ejeX0 + ejeW * 0.13} y={ejeY + tamborR + 9} fontSize="6.5" fontWeight="bold" fill={TEXTO_PLANO} textAnchor="middle" style={haloTexto}>TAMBOR</text>
      <text x={ejeX1 - ejeW * 0.13} y={ejeY + tamborR + 9} fontSize="6.5" fontWeight="bold" fill={TEXTO_PLANO} textAnchor="middle" style={haloTexto}>TAMBOR</text>

      {/* Guías laterales — perfil con su tornillería */}
      {[vanoX0 - guideW, vanoX1].map((x, i) => (
        <g key={`guia${i}`}>
          <rect x={x} y={dintelY} width={guideW} height={vanoH} fill="url(#aluminioPS)" stroke={linea} strokeWidth="1.2" />
          <rect x={x + guideW * 0.22} y={dintelY + 3} width={guideW * 0.56} height={vanoH - 6} fill="#eef3f8" stroke="#4b5563" strokeWidth="0.5" />
          {Array.from({ length: 6 }, (_, k) => dintelY + 10 + (k * (vanoH - 20)) / 5).map((y, k) => (
            <circle key={k} cx={x + guideW / 2} cy={y} r="1" fill="#1f2937" />
          ))}
        </g>
      ))}

      {/* Cortina — paneles apilados y sus juntas (bisagras) */}
      <rect x={vanoX0} y={dintelY} width={vanoW} height={vanoH} fill="url(#panelPS)" stroke={linea} strokeWidth="1.6" />
      {juntas.map((y, i) => (
        <g key={`j${i}`}>
          <line x1={vanoX0} y1={y} x2={vanoX1} y2={y} stroke={linea} strokeWidth="1.1" />
          <line x1={vanoX0} y1={y - 1.6} x2={vanoX1} y2={y - 1.6} stroke="#ffffff" strokeOpacity="0.7" strokeWidth="0.8" />
          {[vanoX0 + 7, (vanoX0 + vanoX1) / 2, vanoX1 - 7].map((x, k) => (
            <rect key={k} x={x - 2.5} y={y - 1.8} width="5" height="3.6" fill="#4b5563" stroke={linea} strokeWidth="0.4" />
          ))}
        </g>
      ))}

      {/* Ventana — centrada a lo ancho, en el panel indicado desde el piso */}
      {hayVentana && (
        <g>
          <rect x={ventanaCx - ventanaW / 2} y={ventanaY} width={ventanaW} height={ventanaH} fill="url(#vidrioPS)" stroke={linea} strokeWidth="1.2" />
          <line x1={ventanaCx - ventanaW / 2} y1={ventanaY + ventanaH} x2={ventanaCx + ventanaW / 2} y2={ventanaY} stroke="#ffffff" strokeOpacity="0.8" strokeWidth="1.4" />
          <text x={ventanaCx} y={ventanaY - 4} fontSize="6.5" fontWeight="bold" fill={TEXTO_PLANO} textAnchor="middle" style={haloTexto}>
            VENTANA ({fmtN(ventanas)}) — {panelVentana}.º PANEL
          </text>
          {/* Cota del centro de la ventana, medida desde la jamba izquierda */}
          <line x1={ventanaCx} y1={ventanaY} x2={ventanaCx} y2={ventanaY + ventanaH} stroke={TEXTO_PLANO} strokeWidth="0.6" strokeDasharray="3,2" />
          <DimH x1={vanoX0} x2={ventanaCx} y={ventanaY + ventanaH + 11} label={`CENTRO ${fmtMm(centroVentana)} mm`} dy={8} />
        </g>
      )}

      {/* Zócalo — panel inferior con su caucho */}
      <rect x={vanoX0} y={floorY - zocaloH} width={vanoW} height={zocaloH} fill="#111827" />

      {/* Piso */}
      <line x1={vanoX0 - guideW - 12} y1={floorY} x2={vanoX1 + guideW + 12} y2={floorY} stroke={linea} strokeWidth="1.4" />

      {/* ── Cotas dinámicas ── */}
      <DimV x={vanoX1 + guideW + 18} y1={dintelY} y2={floorY} label={`ALTO VANO / GUÍA VERTICAL: ${fmtMm(altoVano)} mm`} dx={7} />
      <DimH x1={vanoX0} x2={vanoX1} y={floorY + 20} label={`ANCHO VANO: ${fmtMm(anchoVano)} mm`} dy={10} />

      {/* Rótulo de paneles, al costado libre */}
      <text x={vanoX0 - guideW - 6} y={dintelY + vanoH * 0.5} fontSize="7.5" fontWeight="bold" fill={TEXTO_PLANO} textAnchor="middle"
        transform={`rotate(-90,${vanoX0 - guideW - 6},${dintelY + vanoH * 0.5})`} style={haloTexto}>
        {fmtN(cantidadPaneles)} PANELES DE {fmtMm(altoPanel)} mm
      </text>

      <text x={FRENTE_W / 2} y={H - 6} fontSize="9.5" fontWeight="bold" textAnchor="middle" fill={TEXTO_PLANO}>
        VISTA FRONTAL — VANO {fmtMm(anchoVano)}×{fmtMm(altoVano)} mm
      </text>

      {/* Separador entre las dos vistas */}
      <line x1={FRENTE_W + 4} y1={40} x2={FRENTE_W + 4} y2={H - 20} stroke="#94a3b8" strokeWidth="0.6" strokeDasharray="4,3" />

      <VistaLateral
        x0={FRENTE_W + 20} x1={W - 14} yTop={margin.top - 6} yBase={floorY}
        altoVano={altoVano} guiasHorizontales={guiasHorizontales} recorrido={recorrido}
        cantidadPaneles={cantidadPaneles} tipo={tipo}
      />

      <text x={(FRENTE_W + W) / 2} y={H - 6} fontSize="9.5" fontWeight="bold" textAnchor="middle" fill={TEXTO_PLANO}>
        VISTA LATERAL — RECORRIDO {tipo || "CURVA"}
      </text>
    </svg>
  );
}

// Vista lateral del recorrido: riel recto pegado al vano y, en la puerta CURVA,
// el codo que lo entrega a las guías horizontales bajo el techo. Comparte el
// piso (yBase) con la vista frontal para que las dos se lean a la misma altura.
function VistaLateral({ x0, x1, yTop, yBase, altoVano, guiasHorizontales, recorrido, cantidadPaneles, tipo }) {
  const esCurva = tipo !== "VERTICAL";
  const radio = 400; // codo del riel curvo (mm) — proporción de fábrica, solo para el dibujo
  const alcance = esCurva ? radio + (guiasHorizontales || 0) : radio;
  const altura = esCurva ? altoVano + radio : recorrido || altoVano * 2;
  const scale = Math.min((x1 - x0) / Math.max(alcance, 1), (yBase - yTop) / Math.max(altura, 1));

  const r = radio * scale;
  const yVano = yBase - altoVano * scale;        // dintel
  const yRiel = yVano - r;                       // altura del riel horizontal
  const xFin = x0 + r + (guiasHorizontales || 0) * scale;
  const yTopeVertical = yBase - (recorrido || altoVano * 2) * scale;

  // Paneles apilados sobre el riel: en la CURVA, los de arriba ya doblaron y
  // corren en horizontal; en la VERTICAL siguen subiendo en línea recta.
  const panelH = (altoVano * scale) / Math.max(cantidadPaneles, 1);

  return (
    <g>
      {/* Muro del vano y piso */}
      <rect x={x0 - 9} y={yVano - 8} width="9" height={yBase - yVano + 8} fill="#e2e8f0" stroke={TEXTO_PLANO} strokeWidth="0.8" />
      <line x1={x0 - 14} y1={yBase} x2={x1} y2={yBase} stroke={TEXTO_PLANO} strokeWidth="1.4" />

      {/* Riel: tramo recto + codo + tramo horizontal (solo la puerta CURVA) */}
      <path
        d={esCurva
          ? `M ${x0} ${yBase} L ${x0} ${yVano} Q ${x0} ${yRiel} ${x0 + r} ${yRiel} L ${xFin} ${yRiel}`
          : `M ${x0} ${yBase} L ${x0} ${yTopeVertical}`}
        fill="none" stroke={TEXTO_PLANO} strokeWidth="2"
      />

      {/* Paneles sobre el riel, en la posición en que quedan con la puerta abierta */}
      {Array.from({ length: cantidadPaneles }, (_, i) => i).map((i) => {
        const enCurva = esCurva && i >= cantidadPaneles - 2;
        return enCurva
          ? <rect key={i} x={x0 + r + (i - (cantidadPaneles - 2)) * panelH} y={yRiel - 5} width={panelH * 0.88} height="5" fill="url(#panelPS)" stroke={TEXTO_PLANO} strokeWidth="0.6" />
          : <rect key={i} x={x0} y={yBase - (i + 1) * panelH} width="5" height={panelH * 0.88} fill="url(#panelPS)" stroke={TEXTO_PLANO} strokeWidth="0.6" />;
      })}

      {esCurva ? (
        <>
          <DimH x1={x0 + r} x2={xFin} y={yRiel - 14} label={`GUÍAS HORIZ.: ${fmtMm(guiasHorizontales)} mm`} dy={-4} />
          <text x={x0 + r + 4} y={yVano - 3} fontSize="6.5" fontWeight="bold" fill={TEXTO_PLANO} style={haloTexto}>RIEL CURVO</text>
        </>
      ) : (
        // El recorrido no es el largo de una pieza: los rieles rectos van del
        // alto del vano y se empatan de a dos por lado (ver listado de empaque).
        <DimV x={x0 + 16} y1={yTopeVertical} y2={yBase} label={`RECORRIDO: ${fmtMm(recorrido)} mm`} dx={7} />
      )}
      <text x={x0 - 12} y={(yBase + yVano) / 2} fontSize="6.5" fontWeight="bold" fill={TEXTO_PLANO} textAnchor="middle"
        transform={`rotate(-90,${x0 - 12},${(yBase + yVano) / 2})`} style={haloTexto}>
        VANO
      </text>
    </g>
  );
}

// Fila del listado de empaque — mismo formato que la tabla ITEM / CANTIDAD / OK
// del Excel: el recuadro se marca con X a medida que se empaca.
function FilaEmpaque({ item }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: "8px",
      border: "1px solid #000000", borderRadius: "5px", padding: "3px 7px", background: "#f8fafc",
    }}>
      <div style={{ minWidth: 0, flex: 1 }}>
        <span style={{ fontSize: "9.5px", fontWeight: "700", color: "#000000" }}>{item.insumo}</span>
        {item.detalle && (
          <span style={{ fontSize: "8.5px", color: "#000000", marginLeft: "5px" }}>· {item.detalle}</span>
        )}
      </div>
      <span style={{ fontFamily: "monospace", fontWeight: "bold", fontSize: "13px", color: "#000000", whiteSpace: "nowrap" }}>
        {item.texto ?? fmtN(item.cantidad)}
      </span>
      <span style={{ fontSize: "8px", color: "#000000", width: "20px", textAlign: "right" }}>{item.unidad}</span>
      <Casilla tamano="15px" />
    </div>
  );
}

// ── Componente principal ───────────────────────────────────────────────────────
export default function FichaImpresionPuertaSeccional({ ficha, numero, onClose }) {
  if (!ficha) return null;
  const f = ficha;
  const codigo = codigoFichaOFallback({ ...f, ordenProduccion: f.ordenProduccion ?? numero }, "puertaseccional");
  const med = f.medidas || {};
  const empaque = f.empaque || [];

  // El listado se reparte en tres columnas de igual alto — misma tabla del
  // Excel, pero en el ancho de la hoja carta horizontal: así la ficha entra en
  // una sola página sin que la impresión tenga que encogerle la letra.
  const porColumna = Math.ceil(empaque.length / 3);
  const columnasEmpaque = [0, 1, 2].map((i) => empaque.slice(i * porColumna, (i + 1) * porColumna));

  const resorteTexto = [f.resorteCalibre, f.resorteLargo].filter(Boolean).join(" · ");

  return (
    <FichaImpresionShell
      productLabel="Puerta Seccional"
      numero={codigo}
      cliente={nombreClienteImpreso(f)}
      onClose={onClose}
      maxWidthClass="max-w-[1220px]"
      windowSize={{ width: 1300, height: 840 }}
    >
      <div style={{ color: "#000000", fontSize: "12.5px" }}>
        <Membrete
          logoSrc={logoPng}
          tituloFicha="Ficha de Fabricación — Puerta Seccional"
          nombre={f.nombreFicha}
          numero={codigo}
          numeroLabel="N.° ficha de producción"
          subtitulo="Todas las dimensiones en milímetros"
        />

        {/* ── Identificación + medidas (izquierda) / Plano + notas (derecha) ── */}
        <div style={{
          display: "grid", gridTemplateColumns: "0.85fr 1.15fr", gap: "16px",
          padding: "10px 20px 0", background: "#f8fafc",
        }}>

          <div style={{ display: "flex", flexDirection: "column" }}>
            <MedidaHero label="Medida del Vano" ancho={f.anchoVano} alto={f.altoVano} />

            <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "8px", marginBottom: "6px" }}>
              <div style={{ background: "white", border: "1px solid #e2e8f0", borderRadius: "8px", padding: "8px 10px" }}>
                <div style={{ fontSize: "9.5px", color: "#000000", fontWeight: "600", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "3px" }}>Cliente</div>
                <div style={{ fontSize: "18px", fontWeight: "bold", color: "#1a3f8f" }}>{nombreClienteImpreso(f) || "—"}</div>
              </div>
              <div style={{ background: "white", border: "1px solid #e2e8f0", borderRadius: "8px", padding: "8px 10px", textAlign: "center" }}>
                <div style={{ fontSize: "9.5px", color: "#000000", fontWeight: "600", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "3px" }}>Cantidad</div>
                <div style={{ fontSize: "24px", fontWeight: "bold", color: "#1a3f8f", lineHeight: 1 }}>{f.cantidad}</div>
                <div style={{ fontSize: "10px", color: "#000000", marginTop: "1px" }}>puertas</div>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "6px", marginBottom: "10px" }}>
              <InfoChip label="Orden de compra" value={f.numeroOrdenCompra || "—"} highlight={!!f.numeroOrdenCompra} />
              <InfoChip label="Fecha orden" value={fmtDate(f.fechaOrden)} />
              <InfoChip label="Fecha entrega (estimada)" value={fmtDate(f.fechaEntrega)} highlight={!!f.fechaEntrega} />
            </div>

            <SectionTitle size="11.5px">Medidas de Fabricación (mm)</SectionTitle>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "6px", flex: 1, gridAutoRows: "1fr" }}>
              {[
                // El corte de panel/zócalo/caucho es la medida más consultada en
                // el taller: ocupa doble celda y va en grande.
                { label: "Panel, zócalo y caucho", val: fmtMm(med.anchoPanel), span: 2, destacado: true },
                { label: "Cantidad de paneles", val: fmtN(med.cantidadPaneles) },
                { label: "M² panel", val: fmtDec(med.m2Panel) },
                { label: "Eje superior", val: fmtMm(med.ejeSuperior) },
                { label: "Vueltas resorte", val: fmtN(med.vueltasResorte) },
                { label: "Guías verticales", val: fmtMm(med.guiasVerticales) },
                { label: "Guías horizontales", val: fmtMm(med.guiasHorizontales) },
                { label: "Medida guaya", val: fmtMm(med.medidaGuaya) },
                { label: `Centro ventana ${med.panelDeLaVentana || 3}.er panel`, val: fmtMm(med.centroVentana) },
                { label: "Recorrido de la puerta", val: fmtMm(med.recorrido) },
              ].map(({ label, val, span, destacado }) => (
                <div key={label} style={{
                  gridColumn: span ? `span ${span}` : undefined,
                  background: "white", border: `1px solid ${destacado ? "#1a3f8f" : "#e2e8f0"}`,
                  borderRadius: "6px", padding: "6px", textAlign: "center",
                  display: "flex", flexDirection: "column", justifyContent: "center", gap: "2px",
                }}>
                  <div style={{ fontSize: destacado ? "10px" : "8.5px", color: "#000000", fontWeight: destacado ? "bold" : "600", textTransform: "uppercase" }}>{label}</div>
                  <div style={{ fontSize: destacado ? "28px" : "16px", fontWeight: "bold", fontFamily: "monospace", color: "#1a3f8f", lineHeight: 1 }}>{val}</div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{
              border: "1px solid #334155", borderRadius: "8px", padding: "4px",
              background: "#fafafa", display: "flex", justifyContent: "center", alignItems: "center", flex: 1,
            }}>
              <PlanoTecnicoPuertaSeccional
                anchoVano={f.anchoVano}
                altoVano={f.altoVano}
                cantidadPaneles={med.cantidadPaneles || 1}
                altoPanel={PARAMETROS_PUERTA_SECCIONAL.ALTO_PANEL_MM}
                centroVentana={med.centroVentana}
                panelVentana={med.panelDeLaVentana || PARAMETROS_PUERTA_SECCIONAL.PANEL_DE_LA_VENTANA}
                ventanas={Number(f.ventanas || 0)}
                ejeSuperior={med.ejeSuperior}
                guiasHorizontales={med.guiasHorizontales}
                recorrido={med.recorrido}
                tipo={f.tipo}
                resortes={Number(f.resortes || 1)}
              />
            </div>

            {f.adicional && (
              <div style={{ marginTop: "8px", background: "#fff7ed", border: "1px solid #fed7aa", borderRadius: "8px", padding: "9px 10px" }}>
                <div style={{ fontSize: "9.5px", color: "#7c2d12", fontWeight: "bold", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "3px" }}>
                  Adicional / Notas
                </div>
                <div style={{ fontSize: "12.5px", color: "#000000" }}>{f.adicional}</div>
              </div>
            )}
          </div>
        </div>

        {/* ── Opciones y acabados — a lo ancho de toda la hoja ── */}
        <div style={{ padding: "10px 20px 0", background: "#f8fafc" }}>
          <div style={{ background: "#eff6ff", border: "1px solid #dbeafe", borderRadius: "8px", padding: "9px 10px" }}>
            <SectionTitle size="11.5px">Opciones y Acabados</SectionTitle>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: "6px" }}>
              <AcabadoCard label="Tipo" value={f.tipo || "—"} color="#1a3f8f" active />
              {/* Fuera del catálogo de tambores la tarjeta se apaga: el dato lo
                  define ingeniería antes de que la orden baje a planta. */}
              <AcabadoCard label="Tambor" value={med.tambor || "—"} color="#92400e"
                active={med.tambor !== PARAMETROS_PUERTA_SECCIONAL.TAMBOR_FUERA_DE_RANGO} />
              <AcabadoCard label="Resortes" value={resorteTexto ? `${fmtN(f.resortes)} · ${resorteTexto}` : fmtN(f.resortes)} color="#9f1239" active />
              <AcabadoCard label="Motor" value={f.motor || "NO"} color="#0b4a7d" active={f.motor === "SI"} />
              <AcabadoCard label="Exclusa" value={f.exclusa || "NO"} color="#155e75" active={f.exclusa === "SI"} />
              <AcabadoCard label="Ventanas" value={fmtN(f.ventanas)} color="#5b21b6" active={Number(f.ventanas) > 0} />
            </div>
          </div>
        </div>

        {/* ── Listado de empaque ──
            Única lista de la ficha: sustituye al bloque "Control de despacho"
            del Excel, que repetía las mismas piezas con menos detalle. */}
        {empaque.length > 0 && (
          <div style={{ padding: "10px 20px 8px" }}>
            <SectionTitle>Listado de Empaque y Despacho — Puerta Seccional</SectionTitle>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "6px" }}>
              {columnasEmpaque.map((col, i) => (
                <div key={i} style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
                  <div style={{ display: "flex", gap: "8px", fontSize: "8px", fontWeight: "bold", color: "#000000", textTransform: "uppercase", letterSpacing: "0.5px", padding: "0 7px" }}>
                    <span style={{ flex: 1 }}>Ítem</span>
                    <span>Cantidad</span>
                    <span style={{ width: "42px", textAlign: "right" }}>OK</span>
                  </div>
                  {col.map((item, k) => <FilaEmpaque key={`${item.insumo}-${k}`} item={item} />)}
                </div>
              ))}
            </div>
          </div>
        )}

        <Firmas ficha={ficha} />
        <FichaFooter
          texto="COLD CHAIN SERVICES S.A.S. — FICHA DE FABRICACIÓN PUERTAS SECCIONALES"
          numero={codigo}
          fecha={fmtDate(new Date().toISOString())}
        />
      </div>
    </FichaImpresionShell>
  );
}
