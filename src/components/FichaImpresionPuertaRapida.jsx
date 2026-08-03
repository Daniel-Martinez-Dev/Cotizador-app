import React from "react";
import FichaImpresionShell from "./fichas/FichaImpresionShell";
import { fmtMm, fmtM2, fmtN, fmtDate } from "../utils/fichaFormat";
import logoPng from "../assets/imagenes/logo.png";
import { PARAMETROS_PUERTA_RAPIDA } from "../modules/produccion/puertas-rapidas/parametros.js";
import { AcabadoCard, SectionTitle, Membrete, Firmas, FichaFooter, InfoChip, MedidaHero } from "./fichas/FichaVisualKit";

const COLOR_HEX = {
  NEGRO: "#1f2937", AZUL: "#1d4ed8", VERDE: "#15803d",
  NARANJA: "#ea580c", GRIS: "#6b7280", OTRO: "#7c3aed",
};

// Pequeños helpers de cota (línea con flechas + texto), para no repetir el
// mismo bloque de SVG en cada medida — mismo lenguaje visual que el plano de
// División Térmica (ver FichaImpresionDivision.jsx).
function DimH({ x1, x2, y, label, color = "#475569", dy = -5 }) {
  return (
    <g>
      <line x1={x1} y1={y} x2={x2} y2={y} stroke={color} strokeWidth="1" markerStart="url(#arrPR-b)" markerEnd="url(#arrPR-a)" />
      <text x={(x1 + x2) / 2} y={y + dy} fontSize="6.5" fontWeight="bold" fill={color} textAnchor="middle">{label}</text>
    </g>
  );
}
function DimV({ x, y1, y2, label, color = "#475569", dx = -7 }) {
  const midY = (y1 + y2) / 2;
  return (
    <g>
      <line x1={x} y1={y1} x2={x} y2={y2} stroke={color} strokeWidth="1" markerStart="url(#arrPR-b)" markerEnd="url(#arrPR-a)" />
      <text x={x + dx} y={midY} fontSize="6.5" fontWeight="bold" fill={color} textAnchor="middle" transform={`rotate(-90,${x + dx},${midY})`}>{label}</text>
    </g>
  );
}
// ── Plano técnico (vista frontal, réplica del plano de referencia "Puerta
// Rápida Enrrollable") — guías laterales, cubremotor, cortina dividida por
// cortavientos con el visor centrado, cortina óptica, airbag y el cuadro de
// control siempre al mismo costado que el motor (ladoMotor). Las cotas de
// Ancho/Alto Vano, Altura total puerta, Distancia entre Cortavientos y
// Alto/Altura Visor se recalculan de las medidas reales de la ficha; las
// distancias de montaje fijas del modelo (guía, holguras de motor, etc.) se
// muestran aparte en el panel de referencia (ver PARAMETROS_PUERTA_RAPIDA).
function PlanoTecnicoPuertaRapida({
  anchoVano, altoVano, altoCubrerrollo, altoTotalPuerta, colorLona, ladoMotor,
  distanciaCortavientos, params,
}) {
  const W = 560, H = 400;
  const motorIzquierda = ladoMotor !== "DERECHO";

  // El cuadro de control vive del mismo lado que el motor, así que ese
  // costado necesita más aire para la caja de motor + cuadro de control;
  // el margen derecho se deja fijo porque el rótulo del motor siempre
  // aparece ahí (con línea guía cuando el motor está a la izquierda).
  const margin = { top: 70, right: 150, bottom: 66, left: motorIzquierda ? 150 : 96 };
  const drawW = W - margin.left - margin.right;
  const drawH = H - margin.top - margin.bottom;

  const anchoGuia = params.ANCHO_GUIA_MM;
  const totalW = anchoVano + anchoGuia * 2;
  const totalH = altoVano + altoCubrerrollo;
  const scale = Math.min(drawW / totalW, drawH / totalH) * 0.92;

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

  const linea = "#334155";
  const dim = "#475569";
  const cortinaCol = COLOR_HEX[colorLona] || COLOR_HEX.OTRO;

  // Bandas de la cortina separadas por cortavientos; el visor ocupa una banda
  // COMPLETA (no un recorte inscrito) — por convención de fábrica, va en la
  // segunda banda contando de abajo hacia arriba.
  const distCortav = distanciaCortavientos || altoVano;
  const bays = Math.max(1, Math.round(altoVano / distCortav));
  const bayH = vanoH / bays;
  const bayH_mm = altoVano / bays;
  const visorBayFromBottom = bays >= 2 ? 1 : 0;
  const visorY = floorY - (visorBayFromBottom + 1) * bayH;
  const altoVisor_mm = bayH_mm;
  const alturaVisor_mm = visorBayFromBottom * bayH_mm;

  // Cuadro de control — siempre al mismo costado que el motor (ladoMotor),
  // pegado a la guía de ese lado; sin botonera ni accesorios adicionales.
  const boxW = Math.max(14, guideW * 2.2);
  const boxH = vanoH * 0.15;
  const boxY = vanoY0 + vanoH * 0.60;
  const boxX = motorIzquierda ? x0 - 4 - boxW : outerRightX + 4;
  const boxTextX = motorIzquierda ? boxX - 4 : boxX + boxW + 4;
  const boxTextAnchor = motorIzquierda ? "end" : "start";

  // Motor — caja mecánica sobre la guía del lado configurado (ladoMotor),
  // asomando por encima del cubremotor, igual que en el plano de referencia.
  const motorW = guideW * 2.4;
  const motorH = headerH * 1.7;
  const motorCx = motorIzquierda ? x0 + guideW / 2 : rightGuideX0 + guideW / 2;
  const motorX = motorCx - motorW / 2;
  const motorY = topY - motorH * 0.55;
  const motorLabelX = outerRightX + 14;
  const motorLabelY = topY + headerH * 0.5 + 2;
  const topMostY = Math.min(topY, motorY);

  // Cotas de Altura total puerta / Alto vano — al costado libre de equipo,
  // opuesto al motor y al cuadro de control.
  const altoDimSign = motorIzquierda ? 1 : -1;
  const altoDimBaseX = motorIzquierda ? outerRightX : x0;
  const altoDimNearX = altoDimBaseX + altoDimSign * 16;
  const altoDimFarX  = altoDimBaseX + altoDimSign * 34;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ display: "block", maxWidth: "620px", margin: "0 auto", fontFamily: "Arial, sans-serif" }}>
      <defs>
        <marker id="arrPR-a" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
          <path d="M0,0 L6,3 L0,6 Z" fill={dim} />
        </marker>
        <marker id="arrPR-b" markerWidth="6" markerHeight="6" refX="1" refY="3" orient="auto">
          <path d="M6,0 L0,3 L6,6 Z" fill={dim} />
        </marker>
      </defs>

      {/* Línea de holgura mínima de montaje, por encima del motor y el cubremotor */}
      <line x1={x0} y1={topMostY - 14} x2={outerRightX} y2={topMostY - 14} stroke="#94a3b8" strokeWidth="0.75" strokeDasharray="4,3" />
      <text x={x0} y={topMostY - 18} fontSize="6" fill="#64748b">
        Seguridad montaje = {params.DISTANCIA_MIN_SEGURIDAD_MONTAJE_MM} mm
      </text>

      {/* Cubremotor (caja superior) */}
      <rect x={x0} y={topY} width={fw} height={headerH} fill="#cbd5e1" stroke={linea} strokeWidth="1.2" />
      <text x={cx} y={topY + headerH / 2 + 2.5} fontSize="6.5" fontWeight="bold" fill="#1e293b" textAnchor="middle">CUBREMOTOR</text>

      {/* Guías laterales */}
      <rect x={x0} y={vanoY0} width={guideW} height={vanoH} fill="#e2e8f0" stroke={linea} strokeWidth="1.2" />
      <rect x={rightGuideX0} y={vanoY0} width={guideW} height={vanoH} fill="#e2e8f0" stroke={linea} strokeWidth="1.2" />

      {/* Motor — posición vertical, sobre la guía del lado configurado */}
      <rect x={motorX} y={motorY} width={motorW} height={motorH} rx="1.5" fill="#94a3b8" stroke={linea} strokeWidth="1.2" />
      <rect x={motorX + motorW * 0.15} y={motorY + motorH * 0.1} width={motorW * 0.7} height={motorH * 0.35} fill="#64748b" stroke={linea} strokeWidth="0.75" />
      <circle cx={motorCx} cy={motorY + motorH * 0.72} r={Math.max(1.2, motorW * 0.1)} fill="#334155" />
      <line x1={motorLabelX - 4} y1={motorLabelY} x2={motorCx + (motorIzquierda ? motorW / 2 : -motorW / 2)} y2={motorY + motorH * 0.35} stroke="#94a3b8" strokeWidth="0.75" strokeDasharray="2,1.5" />
      <text x={motorLabelX} y={motorLabelY} fontSize="6.5" fontWeight="bold" fill="#475569">
        MOTOR POSICIÓN VERTICAL ({ladoMotor || "IZQUIERDO"})
      </text>

      {/* Cortina — bandas separadas por cortavientos */}
      <rect x={vanoX0} y={vanoY0} width={vanoW} height={vanoH} fill={cortinaCol} fillOpacity="0.18" stroke={cortinaCol} strokeWidth="2" />
      {Array.from({ length: bays - 1 }, (_, i) => vanoY0 + (i + 1) * bayH).map((y, i) => (
        <rect key={i} x={vanoX0} y={y - 1.2} width={vanoW} height="2.4" fill={linea} />
      ))}

      {/* Distancia entre cortavientos — cota corta sobre la banda superior */}
      <line x1={cx} y1={vanoY0 + 3} x2={cx} y2={vanoY0 + bayH - 3} stroke={dim} strokeWidth="1" markerStart="url(#arrPR-b)" markerEnd="url(#arrPR-a)" />
      <rect x={cx - 24} y={vanoY0 + bayH / 2 - 6} width="48" height="11" fill="white" fillOpacity="0.85" rx="2" />
      <text x={cx} y={vanoY0 + bayH / 2 + 3} fontSize="6.5" fontWeight="bold" fill={dim} textAnchor="middle">
        {fmtMm(distCortav)} mm
      </text>

      {/* Visor (ventana de visión) — banda completa, sin recortar */}
      <defs>
        <clipPath id="visorClipPR">
          <rect x={vanoX0} y={visorY} width={vanoW} height={bayH} />
        </clipPath>
      </defs>
      <rect x={vanoX0} y={visorY} width={vanoW} height={bayH} fill="#eff6ff" />
      <g clipPath="url(#visorClipPR)">
        {Array.from({ length: Math.round(vanoW / bayH) + 1 }, (_, i) => {
          const sx = vanoX0 - bayH + i * bayH * 1.4;
          return <line key={i} x1={sx} y1={visorY + bayH} x2={sx + bayH} y2={visorY} stroke={cortinaCol} strokeWidth="0.5" strokeOpacity="0.3" />;
        })}
      </g>
      <text x={vanoX0 + vanoW / 2} y={visorY + bayH * 0.5} fontSize="6.5" fontWeight="bold" fill={cortinaCol} textAnchor="middle">VISOR</text>
      <text x={vanoX0 + vanoW / 2} y={visorY + bayH * 0.5 + 9} fontSize="5.5" fill={cortinaCol} textAnchor="middle">
        alto {fmtMm(altoVisor_mm)} · a {fmtMm(alturaVisor_mm)} mm del piso
      </text>

      {/* Airbag de seguridad (borde inferior) */}
      <rect x={vanoX0} y={floorY - 6} width={vanoW} height="6" fill="#1f2937" />
      <text x={vanoX0 + vanoW / 2} y={floorY - 1.5} fontSize="5" fontWeight="bold" fill="white" textAnchor="middle">AIRBAG DE SEGURIDAD</text>

      {/* Cortina óptica (cara interior de la guía izquierda) */}
      <rect x={vanoX0 - 3} y={vanoY0} width="3" height={vanoH} fill="#0f172a" />
      <text
        x={vanoX0 + 4} y={vanoY0 + vanoH * 0.42}
        fontSize="5.5" fontWeight="bold" fill="#0f172a" textAnchor="middle"
        transform={`rotate(-90,${vanoX0 + 4},${vanoY0 + vanoH * 0.42})`}
      >
        CORTINA ÓPTICA
      </text>

      {/* Cuadro de control — mismo costado que el motor */}
      <rect x={boxX} y={boxY} width={boxW} height={boxH} rx="1" fill="white" stroke="#d97706" strokeWidth="1" />
      <text x={boxTextX} y={boxY + boxH * 0.65} fontSize="6.5" fontWeight="bold" fill="#b45309" textAnchor={boxTextAnchor}>CUADRO DE CONTROL</text>

      {/* ── Cotas dinámicas (recalculadas de la ficha) ── */}
      <DimV x={altoDimFarX} y1={topY} y2={floorY} label={`ALTURA TOTAL PUERTA: ${fmtMm(altoTotalPuerta)} mm`} dx={altoDimSign * 7} />
      <DimV x={altoDimNearX} y1={vanoY0} y2={floorY} label={`ALTO VANO: ${fmtMm(altoVano)} mm`} dx={altoDimSign * 7} />
      <DimH x1={vanoX0} x2={rightGuideX0} y={floorY + 14} label={`ANCHO VANO: ${fmtMm(anchoVano)} mm`} dy={9} />
      <DimH x1={x0} x2={vanoX0} y={floorY + 30} label={fmtMm(anchoGuia)} dy={9} color="#94a3b8" />
      <DimH x1={rightGuideX0} x2={outerRightX} y={floorY + 30} label={fmtMm(anchoGuia)} dy={9} color="#94a3b8" />

      {/* Holgura mínima instalación/mantenimiento (izquierda) */}
      <DimH x1={Math.max(6, x0 - 50)} x2={x0} y={floorY + 46} label={`INSTAL./MANTENIM. = ${params.MIN_DISTANCIA_INSTALACION_MANTENIMIENTO_MM} mm`} dy={9} color="#94a3b8" />

      {/* Título */}
      <text x={W / 2} y={H - 6} fontSize="9" fontWeight="bold" textAnchor="middle" fill="#333">
        VISTA FRONTAL — PUERTA RÁPIDA ENRROLLABLE (VANO {fmtMm(anchoVano)}×{fmtMm(altoVano)} mm)
      </text>
    </svg>
  );
}

// ── Componente principal ───────────────────────────────────────────────────────
export default function FichaImpresionPuertaRapida({ ficha, numero, onClose }) {
  if (!ficha) return null;
  const f   = ficha;
  const med = f.medidas  || {};
  const empaque = f.empaque || [];

  return (
    <FichaImpresionShell
      productLabel="Puerta Rápida"
      numero={numero}
      cliente={f.cliente}
      onClose={onClose}
      maxWidthClass="max-w-[1220px]"
      windowSize={{ width: 1300, height: 840 }}
    >
      <div style={{ color: "#1a1a2e", fontSize: "11px" }}>
        <Membrete
          logoSrc={logoPng}
          tituloFicha="Ficha de Fabricación — Puerta Rápida"
          numero={numero}
          numeroLabel="N.° de ficha"
          subtitulo="Todas las dimensiones en milímetros"
        />

        {/* ── Identificación + medidas + acabados (izquierda) / Plano + distancias (derecha) ── */}
        <div style={{
          display: "grid", gridTemplateColumns: "0.86fr 1.14fr", gap: "16px",
          padding: "10px 20px", background: "#f8fafc", borderBottom: "2px solid #e2e8f0",
        }}>

          {/* Columna izquierda — identificación + medidas de fabricación */}
          <div>
            <MedidaHero label="Medida del Vano" ancho={f.anchoVano} alto={f.altoVano} />

            <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "8px", marginBottom: "6px" }}>
              <div style={{ background: "white", border: "1px solid #e2e8f0", borderRadius: "8px", padding: "8px 10px" }}>
                <div style={{ fontSize: "8px", color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "3px" }}>Cliente</div>
                <div style={{ fontSize: "16px", fontWeight: "bold", color: "#1a3f8f" }}>{f.cliente || "—"}</div>
              </div>
              <div style={{ background: "white", border: "1px solid #e2e8f0", borderRadius: "8px", padding: "8px 10px", textAlign: "center" }}>
                <div style={{ fontSize: "8px", color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "3px" }}>Cantidad</div>
                <div style={{ fontSize: "22px", fontWeight: "bold", color: "#1a3f8f", lineHeight: 1 }}>{f.cantidad}</div>
                <div style={{ fontSize: "9px", color: "#94a3b8", marginTop: "1px" }}>puertas</div>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "6px", marginBottom: "10px" }}>
              <InfoChip label="Fecha orden"   value={fmtDate(f.fechaOrden)} />
              <InfoChip label="Fecha entrega (estimada)" value={fmtDate(f.fechaEntrega)} highlight={!!f.fechaEntrega} />
            </div>

            <SectionTitle size="10px">Medidas de Fabricación (mm)</SectionTitle>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "6px" }}>
              {[
                { label: "Vinilo", val: fmtMm(med.vinilo) },
                { label: "Largo cortina", val: fmtMm(med.largoCortina) },
                { label: "Cubre rollo", val: fmtMm(med.cubreRollo) },
                { label: "Altura parales", val: fmtMm(med.alturaParales) },
                { label: "Eje, zócalo, caucho, cortavientos y lona", val: fmtMm(med.ejeZocalo) },
                { label: "Tubo estructura", val: fmtMm(med.tuboEstructura) },
                { label: "Ancho total", val: fmtMm(med.anchoTotalPuerta) },
                { label: "Alto total", val: fmtMm(med.altoTotalPuerta) },
                { label: "Alto cubrerrollo", val: fmtMm(med.altoCubrerrollo) },
                { label: "Añadido cubre rollo", val: fmtMm(med.anadidoCubreRollo) },
                { label: "Añadido por paral", val: fmtMm(med.anadidoPorParal) },
                { label: "M² cortina", val: fmtM2(med.m2Cortina) },
              ].map(({ label, val }) => (
                <div key={label} style={{ background: "white", border: "1px solid #e2e8f0", borderRadius: "6px", padding: "6px", textAlign: "center" }}>
                  <div style={{ fontSize: "7px", color: "#94a3b8", textTransform: "uppercase", marginBottom: "2px" }}>{label}</div>
                  <div style={{ fontSize: "13px", fontWeight: "bold", fontFamily: "monospace", color: "#1a3f8f" }}>{val}</div>
                </div>
              ))}
            </div>

            <div style={{ marginTop: "10px", background: "#eff6ff", border: "1px solid #dbeafe", borderRadius: "8px", padding: "9px 10px" }}>
              <SectionTitle size="10px">Opciones y Acabados</SectionTitle>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "6px" }}>
                <AcabadoCard label="Color lona"  value={f.colorLona || "—"} color="#1a3f8f" active />
                <AcabadoCard label="Lado motor"  value={f.ladoMotor || "—"} color="#0f6cbf" active />
                <AcabadoCard label="Exclusa"     value={f.exclusa   || "NO"} color="#0891b2" active={f.exclusa === "SI"} />
                <AcabadoCard label="FCT"         value={f.fct       || "NO"} color="#0d9488" active={f.fct === "SI"} />
                <AcabadoCard label="Vinilo"      value={f.vinilo    || "NO"} color="#7c3aed" active={f.vinilo === "SI"} />
                <AcabadoCard label="Base / Eje"  value={`${med.base || "—"} / ${med.ejeMotor || "—"}`} color="#d97706" active />
                <AcabadoCard label="Motor"       value={med.motorKw || "—"} color="#be123c" active />
                <AcabadoCard label="Cortavientos" value={`${fmtN(med.cantidadCortavientos)} · cada ${fmtMm(med.distanciaCortavientos)} mm`} color="#334155" active />
              </div>
            </div>
          </div>

          {/* Columna derecha — plano técnico + distancias de instalación */}
          <div>
            <div style={{
              border: "1px solid #ccc", borderRadius: "8px", padding: "4px",
              background: "#fafafa", display: "flex", justifyContent: "center", alignItems: "center",
            }}>
              <PlanoTecnicoPuertaRapida
                anchoVano={f.anchoVano}
                altoVano={f.altoVano}
                altoCubrerrollo={med.altoCubrerrollo}
                altoTotalPuerta={med.altoTotalPuerta}
                colorLona={f.colorLona}
                ladoMotor={f.ladoMotor}
                distanciaCortavientos={med.distanciaCortavientos}
                params={PARAMETROS_PUERTA_RAPIDA}
              />
            </div>

            {/* ── Distancias de instalación (referencia de fábrica, fijas del modelo) ── */}
            <div style={{ marginTop: "8px", background: "white", border: "1px solid #e2e8f0", borderRadius: "8px", padding: "9px 10px" }}>
              <SectionTitle size="10px">Distancias de Instalación (Referencia de Fábrica)</SectionTitle>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "6px" }}>
                {[
                  ["Ancho guía",                "ANCHO_GUIA_MM"],
                  ["Seguridad montaje",         "DISTANCIA_MIN_SEGURIDAD_MONTAJE_MM"],
                  ["Guía-ext. motor",           "DISTANCIA_GUIA_EXTERIOR_MOTOR_MM"],
                  ["Guía-ext. cubremotor",      "DISTANCIA_GUIA_EXTERIOR_CUBREMOTOR_MM"],
                  ["Seguridad recomendada",     "DISTANCIA_RECOMENDADA_SEGURIDAD_MM"],
                  ["Instalación/mantenim.",     "MIN_DISTANCIA_INSTALACION_MANTENIMIENTO_MM"],
                  ["Estructura control",        "ANCHO_ESTRUCTURA_CONTROL_MM"],
                  ["Espesor pared ext./int.",   null],
                ].map(([label, key]) => (
                  <div key={label} style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "6px", padding: "5px", textAlign: "center" }}>
                    <div style={{ fontSize: "6.5px", color: "#94a3b8", textTransform: "uppercase", marginBottom: "2px" }}>{label}</div>
                    <div style={{ fontSize: "11px", fontWeight: "bold", fontFamily: "monospace", color: "#334155" }}>
                      {key ? `${PARAMETROS_PUERTA_RAPIDA[key]} mm` : `${PARAMETROS_PUERTA_RAPIDA.ESPESOR_PARED_EXTERNA_MM} / ${PARAMETROS_PUERTA_RAPIDA.ESPESOR_PARED_INTERNA_MM} mm`}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ── Lista de empaque ── */}
        {empaque.length > 0 && (
          <div style={{ padding: "10px 20px 8px" }}>
            <SectionTitle>Lista de Empaque por Puerta</SectionTitle>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: "6px" }}>
              {empaque.map((c) => (
                <div key={c.insumo} style={{
                  background: "#f8fafc", border: "1px solid #e2e8f0",
                  borderRadius: "6px", padding: "6px 8px",
                }}>
                  <div style={{ fontSize: "8px", color: "#94a3b8", marginBottom: "2px" }}>{c.insumo}</div>
                  <div style={{ fontWeight: "bold", fontFamily: "monospace", fontSize: "13px", color: "#374151" }}>
                    {c.texto ?? fmtN(c.cantidad)}
                  </div>
                  <div style={{ fontSize: "8px", color: "#94a3b8", marginTop: "1px" }}>{c.unidad}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Adicional / Notas ── */}
        {f.adicional && (
          <div style={{ padding: "0 20px 8px" }}>
            <div style={{ background: "#fff7ed", border: "1px solid #fed7aa", borderRadius: "8px", padding: "9px 10px" }}>
              <div style={{ fontSize: "8px", color: "#ea580c", fontWeight: "bold", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "3px" }}>
                Adicional / Notas
              </div>
              <div style={{ fontSize: "11px", color: "#1a1a2e" }}>{f.adicional}</div>
            </div>
          </div>
        )}

        <Firmas />
        <FichaFooter
          texto="COLD CHAIN SERVICES S.A.S. — FICHA DE FABRICACIÓN PUERTAS RÁPIDAS"
          numero={numero}
          fecha={fmtDate(new Date().toISOString())}
        />
      </div>
    </FichaImpresionShell>
  );
}
