import React from "react";
import FichaImpresionShell from "./fichas/FichaImpresionShell";
import { fmtMm, fmtM2, fmtN, fmtDate } from "../utils/fichaFormat";
import logoPng from "../assets/imagenes/logo.png";
import { PARAMETROS_PUERTA_RAPIDA } from "../modules/produccion/puertas-rapidas/parametros.js";
import { AcabadoCard, SectionTitle, Membrete, Firmas, FichaFooter, InfoChip, MedidaHero, Casilla } from "./fichas/FichaVisualKit";
import { codigoFichaOFallback } from "../utils/codigoFicha";

const COLOR_HEX = {
  NEGRO: "#1f2937", BLANCO: "#e2e8f0", AZUL: "#1e3a8a", VERDE: "#14532d",
  NARANJA: "#9a3412", GRIS: "#6b7280", OTRO: "#5b21b6",
};
// La lona blanca se rellena en gris muy claro (el blanco puro desaparece contra
// la hoja), pero su contorno y las diagonales del visor van en negro para que
// la cortina siga leyéndose en la ficha impresa.
const COLOR_BORDE = { BLANCO: "#1f2937" };

// Pequeños helpers de cota (línea con flechas + texto), para no repetir el
// mismo bloque de SVG en cada medida — mismo lenguaje visual que el plano de
// División Térmica (ver FichaImpresionDivision.jsx).
// Las cotas van en negro y con halo blanco (paintOrder) para que el número se
// lea aunque caiga encima del dibujo: la ficha se imprime y se lleva al taller.
const TEXTO_PLANO = "#000000";
const haloTexto = { paintOrder: "stroke", stroke: "#ffffff", strokeWidth: 2.4, strokeLinejoin: "round" };

function DimH({ x1, x2, y, label, color = TEXTO_PLANO, dy = -5 }) {
  return (
    <g>
      <line x1={x1} y1={y} x2={x2} y2={y} stroke={color} strokeWidth="1" markerStart="url(#arrPR-b)" markerEnd="url(#arrPR-a)" />
      <text x={(x1 + x2) / 2} y={y + dy} fontSize="7.5" fontWeight="bold" fill={color} textAnchor="middle" style={haloTexto}>{label}</text>
    </g>
  );
}
function DimV({ x, y1, y2, label, color = TEXTO_PLANO, dx = -7 }) {
  const midY = (y1 + y2) / 2;
  return (
    <g>
      <line x1={x} y1={y1} x2={x} y2={y2} stroke={color} strokeWidth="1" markerStart="url(#arrPR-b)" markerEnd="url(#arrPR-a)" />
      <text x={x + dx} y={midY} fontSize="7.5" fontWeight="bold" fill={color} textAnchor="middle" transform={`rotate(-90,${x + dx},${midY})`} style={haloTexto}>{label}</text>
    </g>
  );
}
// ── Plano técnico (vista frontal, réplica del plano de referencia "Puerta
// Rápida Enrrollable") — guías laterales, cubremotor, cortina dividida por
// cortavientos con el visor centrado, y el cuadro de control siempre al
// mismo costado y a la misma altura que el motor (ladoMotor). Las cotas de
// Ancho/Alto Vano, Altura total puerta, Distancia entre Cortavientos y
// altura del visor sobre el piso se recalculan de las medidas reales de la
// ficha (el ALTO del visor es fijo, ver ALTO_VISOR_MM); las
// distancias de montaje fijas del modelo (guía, holguras de motor, etc.) se
// muestran aparte en el panel de referencia (ver PARAMETROS_PUERTA_RAPIDA).
function PlanoTecnicoPuertaRapida({
  anchoVano, altoVano, altoCubrerrollo, altoTotalPuerta, cubreRollo, colorLona, ladoMotor,
  distanciaCortavientos, params,
}) {
  const W = 560, H = 400;
  const motorIzquierda = ladoMotor !== "DERECHO";

  // El cuadro de control vive del mismo lado que el motor, así que ese
  // costado necesita más aire para la caja de motor + cuadro de control;
  // el margen derecho se deja fijo porque el rótulo del motor siempre
  // aparece ahí (con línea guía cuando el motor está a la izquierda).
  const margin = { top: 58, right: 118, bottom: 56, left: motorIzquierda ? 150 : 78 };
  const drawW = W - margin.left - margin.right;
  const drawH = H - margin.top - margin.bottom;

  const anchoGuia = params.ANCHO_GUIA_MM;
  const totalW = anchoVano + anchoGuia * 2;
  const totalH = altoVano + altoCubrerrollo;
  const scale = Math.min(drawW / totalW, drawH / totalH) * 0.99;

  const fw = totalW * scale;
  const guideW = anchoGuia * scale;
  const headerH = altoCubrerrollo * scale;
  const vanoW = anchoVano * scale;
  const vanoH = altoVano * scale;

  const cx = margin.left + drawW / 2;
  const x0 = cx - fw / 2;                    // borde exterior guía izquierda
  const topY = margin.top + (drawH - (headerH + vanoH)) / 2 + 6;
  const vanoX0 = x0 + guideW;
  const vanoY0 = topY + headerH;
  const floorY = vanoY0 + vanoH;
  const rightGuideX0 = vanoX0 + vanoW;
  const outerRightX = x0 + fw;

  const linea = "#000000";
  const dim = TEXTO_PLANO;
  // El portarrollo (guarda inox) mide `cubreRollo` = anchoVano + 210. NO se usa
  // anchoTotalPuerta: esa medida es cubreRollo + 230 porque suma la guarda del
  // motor, que se fabrica aparte y no es el ancho del portarrollo.
  const anchoPortarrollo = cubreRollo || anchoVano + params.OFFSET_CUBRE_ROLLO_MM;
  const cortinaCol = COLOR_HEX[colorLona] || COLOR_HEX.OTRO;
  const cortinaBorde = COLOR_BORDE[colorLona] || cortinaCol;

  // La cortina se arma con TIRAS unidas por cortavientos: cada cortaviento es
  // la costura donde termina una tira y empieza la siguiente. El visor es una
  // tira más, solo que de vinilo transparente y de alto FIJO (el rollo viene de
  // ALTO_VISOR_MM = 600 mm y se instala completo): no se estira ni se recorta
  // según la distancia entre cortavientos. Por eso las costuras NO son una
  // grilla pareja — se cuentan desde el piso: N tiras de lona de `distCortav`,
  // la tira del visor de 600 mm, y de ahí para arriba el resto de tiras de lona
  // otra vez cada `distCortav` (la última contra el portarrollo queda corta,
  // como en fábrica). Así ningún cortaviento cae desfasado del visor: los dos
  // que lo tocan son sus propias costuras.
  const distCortav = distanciaCortavientos || altoVano;
  const altoVisor_mm = Math.min(params.ALTO_VISOR_MM, altoVano);
  // Tiras de lona bajo el visor: una, o dos con cortavientos cada 500 mm
  // (tiras bajas) para que el visor quede a la altura de la vista. Se recorta
  // si el vano no da para tantas.
  const tirasBajoVisorObjetivo = distCortav === 500 ? 2 : 1;
  const tirasBajoVisor = Math.min(
    tirasBajoVisorObjetivo,
    Math.max(0, Math.floor((altoVano - altoVisor_mm) / distCortav))
  );
  const alturaVisor_mm = tirasBajoVisor * distCortav;   // piso → borde inferior del visor
  const topeVisor_mm = alturaVisor_mm + altoVisor_mm;   // piso → borde superior del visor
  const visorH = altoVisor_mm * scale;
  const visorY = floorY - topeVisor_mm * scale;

  // Costuras (mm desde el piso): las de las tiras de abajo, las dos del visor,
  // y las de las tiras de arriba. Se descartan las que caen pegadas al
  // portarrollo: ahí la tira sobrante se remata contra el eje, no lleva unión.
  const costuras_mm = [];
  for (let i = 1; i <= tirasBajoVisor; i++) costuras_mm.push(i * distCortav);
  if (topeVisor_mm < altoVano - 1) costuras_mm.push(topeVisor_mm);
  for (let y = topeVisor_mm + distCortav; y < altoVano - distCortav * 0.15; y += distCortav) {
    costuras_mm.push(y);
  }
  const cortavientosY = costuras_mm.map((mm) => floorY - mm * scale);

  // Cota de distancia entre cortavientos — sobre la primera tira de lona
  // completa, que es la de abajo salvo que el visor arranque en el piso.
  const cotaBase_mm = tirasBajoVisor >= 1 ? 0 : topeVisor_mm;
  const mostrarCotaCortav = costuras_mm.length > 0 && cotaBase_mm + distCortav <= altoVano + 0.5;
  const cotaCortavY0 = floorY - (cotaBase_mm + distCortav) * scale;
  const cotaCortavH = distCortav * scale;
  const zocaloH = Math.min(4, vanoH * 0.04);

  // Motor — bloque mecánico pegado al costado del cubremotor (misma altura,
  // no asomando por encima), del lado configurado (ladoMotor).
  const motorW = headerH * 0.95;
  const motorH = headerH * 1.2;
  const motorY = topY;
  const motorX = motorIzquierda ? x0 - motorW : outerRightX;
  const motorCx = motorX + motorW / 2;

  // El rótulo del motor se calcula desde el borde real de su caja (no un
  // offset fijo) para que nunca quede tapado, sin importar el ancho de motorW.
  // Con el motor a la izquierda el rótulo se ancla al borde del plano y crece
  // hacia adentro: colgado del motor (anclado al final) se salía del lienzo y
  // aparecía cortado cuando el dibujo ocupa todo el ancho disponible.
  const motorLabelX = motorIzquierda ? 2 : motorX + motorW + 14;
  const motorLabelY = topY + headerH * 0.5 + 2;
  const motorLabelAnchor = "start";
  const topMostY = Math.min(topY, motorY);

  // Cuadro de control — siempre al mismo costado que el motor (ladoMotor),
  // a media altura del vano, pegado a la guía de ese lado; sin botonera ni
  // accesorios adicionales.
  const boxW = Math.max(14, guideW * 2.2);
  const boxH = vanoH * 0.15;
  const boxY = vanoY0 + vanoH * 0.60;
  const boxX = motorIzquierda ? x0 - 4 - boxW : outerRightX + 4;
  const boxTextX = motorIzquierda ? boxX - 4 : boxX + boxW + 4;
  const boxTextAnchor = motorIzquierda ? "end" : "start";

  // Cotas de Altura total puerta / Alto vano — al costado libre de equipo,
  // opuesto al motor y al cuadro de control.
  const altoDimSign = motorIzquierda ? 1 : -1;
  const altoDimBaseX = motorIzquierda ? outerRightX : x0;
  const altoDimNearX = altoDimBaseX + altoDimSign * 16;
  const altoDimFarX  = altoDimBaseX + altoDimSign * 34;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ display: "block", maxWidth: "100%", margin: "0 auto", fontFamily: "Arial, sans-serif" }}>
      <defs>
        <marker id="arrPR-a" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
          <path d="M0,0 L6,3 L0,6 Z" fill={dim} />
        </marker>
        <marker id="arrPR-b" markerWidth="6" markerHeight="6" refX="1" refY="3" orient="auto">
          <path d="M6,0 L0,3 L6,6 Z" fill={dim} />
        </marker>
        <linearGradient id="aluminioPR" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#dfe6ee" />
          <stop offset="45%" stopColor="#9aa8b6" />
          <stop offset="100%" stopColor="#eef2f7" />
        </linearGradient>
        <linearGradient id="motorGradPR" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#6b7280" />
          <stop offset="100%" stopColor="#1f2937" />
        </linearGradient>
        <linearGradient id="visorGradPR" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#f8fbff" stopOpacity="0.95" />
          <stop offset="100%" stopColor="#d6e7f5" stopOpacity="0.85" />
        </linearGradient>
        <linearGradient id="lonaGradPR" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={cortinaCol} stopOpacity="0.85" />
          <stop offset="50%" stopColor={cortinaCol} stopOpacity="0.55" />
          <stop offset="100%" stopColor={cortinaCol} stopOpacity="0.8" />
        </linearGradient>
      </defs>

      {/* Ancho portarrollo / guarda inox — cota principal del plano, arriba de
          todo y con el cuerpo más grande de la lámina. Las líneas de extensión
          se cortan antes de la cota de seguridad para no cruzarla. */}
      <line x1={x0} y1={34} x2={x0} y2={topMostY - 20} stroke={TEXTO_PLANO} strokeWidth="0.6" />
      <line x1={outerRightX} y1={34} x2={outerRightX} y2={topMostY - 20} stroke={TEXTO_PLANO} strokeWidth="0.6" />
      <line x1={x0} y1={30} x2={outerRightX} y2={30} stroke={TEXTO_PLANO} strokeWidth="1.2" markerStart="url(#arrPR-b)" markerEnd="url(#arrPR-a)" />
      <text x={cx} y={22} fontSize="11" fontWeight="bold" fill={TEXTO_PLANO} textAnchor="middle" style={haloTexto}>
        ANCHO PORTARROLLO / GUARDA INOX: {fmtMm(anchoPortarrollo)} mm
      </text>

      {/* Línea de holgura mínima de montaje, por encima del motor y el cubremotor */}
      <line x1={x0} y1={topMostY - 14} x2={outerRightX} y2={topMostY - 14} stroke={TEXTO_PLANO} strokeWidth="0.75" strokeDasharray="4,3" />
      <text x={x0} y={topMostY - 18} fontSize="7" fontWeight="bold" fill={TEXTO_PLANO} style={haloTexto}>
        Seguridad montaje = {params.DISTANCIA_MIN_SEGURIDAD_MONTAJE_MM} mm
      </text>

      {/* Portarrollo (caja superior) */}
      <rect x={x0} y={topY} width={fw} height={headerH} fill="url(#aluminioPR)" stroke={linea} strokeWidth="1.2" />
      <line x1={x0 + 3} y1={topY + headerH * 0.22} x2={x0 + fw - 3} y2={topY + headerH * 0.22} stroke="#ffffff" strokeOpacity="0.6" strokeWidth="0.75" />
      <text x={cx} y={topY + headerH / 2 + 2.5} fontSize="7.5" fontWeight="bold" fill={TEXTO_PLANO} textAnchor="middle" style={haloTexto}>
        ALTURA PORTARROLLO: {fmtMm(altoCubrerrollo)} mm
      </text>

      {/* Guías laterales — perfil metálico con tornillería */}
      <rect x={x0} y={vanoY0} width={guideW} height={vanoH} fill="url(#aluminioPR)" stroke={linea} strokeWidth="1.2" />
      <rect x={x0 + guideW * 0.22} y={vanoY0 + 3} width={guideW * 0.56} height={vanoH - 6} fill="#eef3f8" stroke="#4b5563" strokeWidth="0.5" />
      {Array.from({ length: 6 }, (_, i) => vanoY0 + 10 + (i * (vanoH - 20)) / 5).map((y, i) => (
        <circle key={`lg${i}`} cx={x0 + guideW / 2} cy={y} r="1" fill="#1f2937" />
      ))}
      <rect x={rightGuideX0} y={vanoY0} width={guideW} height={vanoH} fill="url(#aluminioPR)" stroke={linea} strokeWidth="1.2" />
      <rect x={rightGuideX0 + guideW * 0.22} y={vanoY0 + 3} width={guideW * 0.56} height={vanoH - 6} fill="#eef3f8" stroke="#4b5563" strokeWidth="0.5" />
      {Array.from({ length: 6 }, (_, i) => vanoY0 + 10 + (i * (vanoH - 20)) / 5).map((y, i) => (
        <circle key={`rg${i}`} cx={rightGuideX0 + guideW / 2} cy={y} r="1" fill="#1f2937" />
      ))}

      {/* Motor — posición vertical, sobre la guía del lado configurado */}
      <rect x={motorX} y={motorY} width={motorW} height={motorH} rx="1.5" fill="url(#motorGradPR)" stroke={linea} strokeWidth="1.2" />
      <rect x={motorX + motorW * 0.15} y={motorY + motorH * 0.1} width={motorW * 0.7} height={motorH * 0.35} fill="#4b5563" stroke={linea} strokeWidth="0.75" />
      <circle cx={motorCx} cy={motorY + motorH * 0.72} r={Math.max(1.2, motorW * 0.1)} fill="#0f172a" />
      <text x={motorLabelX} y={motorLabelY} fontSize="7" fontWeight="bold" fill={TEXTO_PLANO} textAnchor={motorLabelAnchor} style={haloTexto}>
        MOTOR POSICIÓN VERTICAL ({ladoMotor || "IZQUIERDO"})
      </text>

      {/* Cortina — tiras de lona unidas por cortavientos */}
      <rect x={vanoX0} y={vanoY0} width={vanoW} height={vanoH} fill="url(#lonaGradPR)" stroke={cortinaBorde} strokeWidth="2" />
      {Array.from({ length: 14 }, (_, i) => vanoY0 + (i + 0.5) * (vanoH / 14)).map((y, i) => (
        <line key={i} x1={vanoX0} y1={y} x2={vanoX0 + vanoW} y2={y} stroke="#ffffff" strokeOpacity="0.07" />
      ))}
      {cortavientosY.map((y, i) => (
        <g key={i}>
          <rect x={vanoX0} y={y - 1.6} width={vanoW} height="3.2" fill="url(#aluminioPR)" stroke={linea} strokeWidth="0.5" />
          <line x1={vanoX0} y1={y - 1.6} x2={vanoX0 + vanoW} y2={y - 1.6} stroke="#ffffff" strokeOpacity="0.5" />
        </g>
      ))}

      {/* Distancia entre cortavientos — cota corta sobre una tira de lona completa */}
      {mostrarCotaCortav && (
        <g>
          <line x1={cx} y1={cotaCortavY0 + 3} x2={cx} y2={cotaCortavY0 + cotaCortavH - 3} stroke={dim} strokeWidth="1" markerStart="url(#arrPR-b)" markerEnd="url(#arrPR-a)" />
          <rect x={cx - 24} y={cotaCortavY0 + cotaCortavH / 2 - 6} width="48" height="11" fill="white" fillOpacity="0.85" rx="2" />
          <text x={cx} y={cotaCortavY0 + cotaCortavH / 2 + 3} fontSize="7.5" fontWeight="bold" fill={dim} textAnchor="middle" style={haloTexto}>
            {fmtMm(distCortav)} mm
          </text>
        </g>
      )}

      {/* Visor (ventana de visión) — franja de vinilo de alto fijo (600 mm) */}
      <defs>
        <clipPath id="visorClipPR">
          <rect x={vanoX0} y={visorY} width={vanoW} height={visorH} />
        </clipPath>
      </defs>
      <rect x={vanoX0} y={visorY} width={vanoW} height={visorH} fill="url(#visorGradPR)" />
      <g clipPath="url(#visorClipPR)">
        {Array.from({ length: Math.round(vanoW / visorH) + 1 }, (_, i) => {
          const sx = vanoX0 - visorH + i * visorH * 1.4;
          return <line key={i} x1={sx} y1={visorY + visorH} x2={sx + visorH} y2={visorY} stroke={cortinaBorde} strokeWidth="0.5" strokeOpacity="0.3" />;
        })}
        <line x1={vanoX0} y1={visorY + visorH * 0.85} x2={vanoX0 + vanoW} y2={visorY + visorH * 0.15} stroke="#ffffff" strokeOpacity="0.5" strokeWidth="1.4" />
      </g>
      {/* Los cortavientos de los bordes del visor son sus propias costuras (unen
          el vinilo con la lona de arriba y la de abajo): se repintan encima de
          la franja transparente para que no queden medio tapados por ella. */}
      {cortavientosY.filter((y) => y > visorY - 2 && y < visorY + visorH + 2).map((y, i) => (
        <g key={`cv-visor-${i}`}>
          <rect x={vanoX0} y={y - 1.6} width={vanoW} height="3.2" fill="url(#aluminioPR)" stroke={linea} strokeWidth="0.5" />
          <line x1={vanoX0} y1={y - 1.6} x2={vanoX0 + vanoW} y2={y - 1.6} stroke="#ffffff" strokeOpacity="0.5" />
        </g>
      ))}
      <rect x={vanoX0} y={visorY} width={vanoW} height={visorH} fill="none" stroke="#1f2937" strokeWidth="0.8" />
      <text x={vanoX0 + vanoW / 2} y={visorY + visorH * 0.5} fontSize="7.5" fontWeight="bold" fill={TEXTO_PLANO} textAnchor="middle" style={haloTexto}>VISOR</text>
      <text x={vanoX0 + vanoW / 2} y={visorY + visorH * 0.5 + 9} fontSize="6.5" fontWeight="bold" fill={TEXTO_PLANO} textAnchor="middle" style={haloTexto}>
        alto {fmtMm(altoVisor_mm)} mm (fijo) · a {fmtMm(alturaVisor_mm)} mm del piso
      </text>

      {/* Zócalo — barra inferior de refuerzo de la cortina */}
      <rect x={vanoX0} y={floorY - zocaloH} width={vanoW} height={zocaloH} fill="#111827" />

      {/* Cuadro de control — mismo costado que el motor */}
      <rect x={boxX} y={boxY} width={boxW} height={boxH} rx="1" fill="white" stroke="#92400e" strokeWidth="1" />
      {[0.28, 0.5, 0.72].map((f, i) => (
        <circle key={i} cx={boxX + boxW / 2} cy={boxY + boxH * f} r={Math.min(1.6, boxW * 0.12)} fill={["#166534", "#f59e0b", "#dc2626"][i]} />
      ))}
      <text x={boxTextX} y={boxY + boxH * 0.65} fontSize="7" fontWeight="bold" fill={TEXTO_PLANO} textAnchor={boxTextAnchor} style={haloTexto}>CUADRO DE CONTROL</text>

      {/* ── Cotas dinámicas (recalculadas de la ficha) ── */}
      <DimV x={altoDimFarX} y1={topY} y2={floorY} label={`ALTURA TOTAL PUERTA: ${fmtMm(altoTotalPuerta)} mm`} dx={altoDimSign * 7} />
      <DimV x={altoDimNearX} y1={vanoY0} y2={floorY} label={`ALTO VANO: ${fmtMm(altoVano)} mm`} dx={altoDimSign * 7} />
      <DimH x1={vanoX0} x2={rightGuideX0} y={floorY + 14} label={`ANCHO VANO: ${fmtMm(anchoVano)} mm`} dy={9} />

      {/* Título */}
      <text x={W / 2} y={H - 6} fontSize="9.5" fontWeight="bold" textAnchor="middle" fill={TEXTO_PLANO}>
        VISTA FRONTAL — PUERTA RÁPIDA ENRROLLABLE (VANO {fmtMm(anchoVano)}×{fmtMm(altoVano)} mm)
      </text>
    </svg>
  );
}

// ── Componente principal ───────────────────────────────────────────────────────
export default function FichaImpresionPuertaRapida({ ficha, numero, onClose }) {
  if (!ficha) return null;
  const f   = ficha;
  const codigo = codigoFichaOFallback({ ...f, ordenProduccion: f.ordenProduccion ?? numero }, "puertarapida");
  const med = f.medidas  || {};
  const empaque = f.empaque || [];

  return (
    <FichaImpresionShell
      productLabel="Puerta Rápida"
      numero={codigo}
      cliente={f.cliente}
      onClose={onClose}
      maxWidthClass="max-w-[1220px]"
      windowSize={{ width: 1300, height: 840 }}
    >
      <div style={{ color: "#000000", fontSize: "12.5px" }}>
        <Membrete
          logoSrc={logoPng}
          tituloFicha="Ficha de Fabricación — Puerta Rápida"
          numero={codigo}
          numeroLabel="N.° ficha de producción"
          subtitulo="Todas las dimensiones en milímetros"
        />

        {/* ── Identificación + medidas (izquierda) / Plano + notas (derecha) ──
            Los acabados salieron de esta fila y ahora van a ancho completo más
            abajo: así el plano se lleva la mitad ancha de la hoja y no queda el
            hueco que antes se abría debajo de "Adicional / Notas". */}
        <div style={{
          display: "grid", gridTemplateColumns: "0.8fr 1.2fr", gap: "16px",
          padding: "10px 20px 0", background: "#f8fafc",
        }}>

          {/* Columna izquierda — identificación + medidas de fabricación */}
          <div style={{ display: "flex", flexDirection: "column" }}>
            <MedidaHero label="Medida del Vano" ancho={f.anchoVano} alto={f.altoVano} />

            <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "8px", marginBottom: "6px" }}>
              <div style={{ background: "white", border: "1px solid #e2e8f0", borderRadius: "8px", padding: "8px 10px" }}>
                <div style={{ fontSize: "9.5px", color: "#000000", fontWeight: "600", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "3px" }}>Cliente</div>
                <div style={{ fontSize: "18px", fontWeight: "bold", color: "#1a3f8f" }}>{f.cliente || "—"}</div>
              </div>
              <div style={{ background: "white", border: "1px solid #e2e8f0", borderRadius: "8px", padding: "8px 10px", textAlign: "center" }}>
                <div style={{ fontSize: "9.5px", color: "#000000", fontWeight: "600", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "3px" }}>Cantidad</div>
                <div style={{ fontSize: "24px", fontWeight: "bold", color: "#1a3f8f", lineHeight: 1 }}>{f.cantidad}</div>
                <div style={{ fontSize: "10px", color: "#000000", marginTop: "1px" }}>puertas</div>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "6px", marginBottom: "10px" }}>
              <InfoChip label="Orden de compra" value={f.numeroOrdenCompra || "—"} highlight={!!f.numeroOrdenCompra} />
              <InfoChip label="Fecha orden"   value={fmtDate(f.fechaOrden)} />
              <InfoChip label="Fecha entrega (estimada)" value={fmtDate(f.fechaEntrega)} highlight={!!f.fechaEntrega} />
            </div>

            <SectionTitle size="11.5px">Medidas de Fabricación (mm)</SectionTitle>
            {/* La rejilla crece con la columna (flex:1 + gridAutoRows) para que
                no quede aire muerto debajo cuando el plano manda la altura. */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "6px", flex: 1, gridAutoRows: "1fr" }}>
              {[
                // El corte de eje/zócalo/caucho/cortavientos/lona es la medida
                // que más se consulta en el taller: ocupa doble celda y va en grande.
                { label: "Eje, zócalo, caucho, cortavientos y lona", val: fmtMm(med.ejeZocalo), span: 2, destacado: true },
                { label: "Largo cortina", val: fmtMm(med.largoCortina) },
                { label: "Vinilo", val: fmtMm(med.vinilo) },
                { label: "Porta rollo / guarda inox", val: fmtMm(med.cubreRollo) },
                { label: "Añadido guarda inox", val: fmtMm(med.anadidoCubreRollo) },
                { label: "Altura parales", val: fmtMm(med.alturaParales) },
                { label: "Añadido por paral", val: fmtMm(med.anadidoPorParal) },
                { label: "Alto base porta rollo", val: fmtMm(med.altoCubrerrollo) },
                { label: "Ancho total puerta", val: fmtMm(med.anchoTotalPuerta) },
                { label: "Alto total puerta", val: fmtMm(med.altoTotalPuerta) },
                { label: "M² cortina", val: fmtM2(med.m2Cortina) },
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

          {/* Columna derecha — plano técnico + adicional/notas */}
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{
              border: "1px solid #334155", borderRadius: "8px", padding: "4px",
              background: "#fafafa", display: "flex", justifyContent: "center", alignItems: "center",
              flex: 1,
            }}>
              <PlanoTecnicoPuertaRapida
                anchoVano={f.anchoVano}
                altoVano={f.altoVano}
                altoCubrerrollo={med.altoCubrerrollo}
                altoTotalPuerta={med.altoTotalPuerta}
                cubreRollo={med.cubreRollo}
                colorLona={f.colorLona}
                ladoMotor={f.ladoMotor}
                distanciaCortavientos={med.distanciaCortavientos}
                params={PARAMETROS_PUERTA_RAPIDA}
              />
            </div>

            {/* ── Adicional / Notas ── */}
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
        <div style={{ padding: "10px 20px", background: "#f8fafc", borderBottom: "2px solid #e2e8f0" }}>
          <div style={{ background: "#eff6ff", border: "1px solid #dbeafe", borderRadius: "8px", padding: "9px 10px" }}>
            <SectionTitle size="11.5px">Opciones y Acabados</SectionTitle>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "6px" }}>
              <AcabadoCard label="Color lona"  value={f.colorLona || "—"} color="#1a3f8f" active />
              <AcabadoCard label="Lado motor"  value={f.ladoMotor || "—"} color="#0b4a7d" active />
              <AcabadoCard label="Motor"       value={med.motorKw || "—"} color="#9f1239" active />
              <AcabadoCard label="Cortavientos" value={`${fmtN(med.cantidadCortavientos)} · cada ${fmtMm(med.distanciaCortavientos)} mm`} color="#334155" active />
              <AcabadoCard label="Vinilo"      value={f.vinilo    || "NO"} color="#5b21b6" active={f.vinilo === "SI"} />
              <AcabadoCard label="Base / Eje"  value={`${med.base || "—"} / ${med.ejeMotor || "—"}`} color="#92400e" active />
              <AcabadoCard label="Exclusa"     value={f.exclusa   || "NO"} color="#155e75" active={f.exclusa === "SI"} />
              <AcabadoCard label="FCT"         value={f.fct       || "NO"} color="#115e59" active={f.fct === "SI"} />
            </div>
          </div>
        </div>

        {/* ── Lista de empaque ── */}
        {empaque.length > 0 && (
          <div style={{ padding: "10px 20px 8px" }}>
            <SectionTitle>Lista de Empaque por Puerta</SectionTitle>
            {/* Cada ítem lleva su recuadro: se marca con X a medida que se empaca. */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: "6px" }}>
              {empaque.map((c) => (
                <div key={c.insumo} style={{
                  background: "#f8fafc", border: "1px solid #000000",
                  borderRadius: "6px", padding: "6px 8px",
                  display: "flex", alignItems: "center", gap: "8px",
                }}>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ fontSize: "9px", color: "#000000", fontWeight: "600", marginBottom: "2px" }}>{c.insumo}</div>
                    <div style={{ display: "flex", alignItems: "baseline", gap: "4px" }}>
                      <span style={{ fontWeight: "bold", fontFamily: "monospace", fontSize: "15px", color: "#000000" }}>
                        {c.texto ?? fmtN(c.cantidad)}
                      </span>
                      <span style={{ fontSize: "9px", color: "#000000" }}>{c.unidad}</span>
                    </div>
                  </div>
                  <Casilla tamano="18px" />
                </div>
              ))}
            </div>
          </div>
        )}

        <Firmas ficha={ficha} />
        <FichaFooter
          texto="COLD CHAIN SERVICES S.A.S. — FICHA DE FABRICACIÓN PUERTAS RÁPIDAS"
          numero={codigo}
          fecha={fmtDate(new Date().toISOString())}
        />
      </div>
    </FichaImpresionShell>
  );
}
