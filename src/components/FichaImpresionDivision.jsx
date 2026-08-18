import React from "react";
import FichaImpresionShell from "./fichas/FichaImpresionShell";
import { fmtMm, fmtCm as fmt1, fmtDate } from "../utils/fichaFormat";
import logoPng from "../assets/imagenes/logo.png";
import { MedidaCard, InfoChip, AcabadoCard, SectionTitle, MedidaHero, Membrete, Firmas, FichaFooter } from "./fichas/FichaVisualKit";
import { codigoFichaOFallback } from "../utils/codigoFicha";

// Convierte un valor en milímetros a metros (2 decimales) — distinto de fmtM2,
// que formatea un área en m² ya calculada.
const toM = (mm) => (mm == null ? "—" : (Math.round(Number(mm) / 10) / 100).toFixed(2));

// Fichas antiguas guardaron una sola `alturaPlatinas` (número); las nuevas
// guardan `alturasPlatinas` (arreglo), para permitir varias líneas de altura.
function getAlturasPlatinas(f) {
  if (Array.isArray(f.alturasPlatinas) && f.alturasPlatinas.length) return f.alturasPlatinas;
  if (f.alturaPlatinas) return [f.alturaPlatinas];
  return [];
}

function formatPlatinas(f) {
  if (f.platinas !== "SI") return "NO";
  const alturas = getAlturasPlatinas(f);
  const alturasTxt = alturas.length ? alturas.map((h) => fmtMm(h)).join(" / ") + " mm" : "—";
  return `SI · ${alturasTxt}${f.reatasRiel === "SI" ? " · Reatas riel" : ""}`;
}

// ── Plano técnico (SVG 2D vista frontal) ──────────────────────────────────────
// La división se arma con dos paneles del mismo tamaño lado a lado (ver
// calcularMedidas en utils/divisionTermica.js: anchoPanel = (anchoVehiculo+40)/2),
// cada uno con un núcleo de icopor más pequeño que el panel que lo contiene.
// Además del corte, se marca la ubicación real de logo/placa (panel izq.),
// ventana con marco (panel der. siempre; también panel izq. cuando son 2
// agujeros), reatas de amarre (siempre presentes, ver insumo REATAS en
// calcularConsumo) y la franja de piso con pernos —
// replicando la distribución de una división física (ver planos de referencia).
const AGUJEROS_POR_OPCION = {
  "SIN AGUJERO": 0,
  "1 AGUJERO": 1,
  "2 AGUJEROS": 2,
  "4 AGUJEROS": 4,
  "AGUJERO DIF MEDIDA": 1,
};

function PlanoTecnicoDivision({ anchoVehiculo, altoVehiculo, panel, icopor, logo, placa, agujero }) {
  const W = 460, H = 220;
  const margin = { top: 30, right: 62, bottom: 42, left: 62 };
  const drawW = W - margin.left - margin.right;
  const drawH = H - margin.top - margin.bottom;

  const scale = Math.min(drawW / anchoVehiculo, drawH / altoVehiculo) * 0.86;
  const fw = anchoVehiculo * scale;
  const fh = altoVehiculo * scale;
  const pw = fw / 2;

  const cx = W / 2;
  const cy = margin.top + drawH / 2;
  const x0 = cx - fw / 2;
  const y0 = cy - fh / 2;

  const insetX = Math.max(4, ((panel.ancho - icopor.ancho) / 2) * scale);
  const insetY = Math.max(4, ((panel.alto - icopor.alto) / 2) * scale);

  const marco = "#1a3f8f";
  const nucleo = "#93c5fd";     // relleno del icopor (no texto)
  const bg = "#f0f4ff";
  const hardware = "#7c2d12";
  const reataCol = "#000000";
  // Los rótulos del plano van en negro con halo blanco: sobre el dibujo, un
  // gris o un azul claro se pierden al imprimir.
  const rotulo = "#000000";
  const haloTexto = { paintOrder: "stroke", stroke: "#ffffff", strokeWidth: 2.4, strokeLinejoin: "round" };

  const tieneLogo = !!logo && logo !== "NO";
  const tienePlaca = placa === "SI";
  const nAgujeros = AGUJEROS_POR_OPCION[agujero] ?? 0;
  const medidaEspecial = agujero === "AGUJERO DIF MEDIDA";

  // ── Franja de piso con pernos — base de cada panel ──
  const pisoH = fh * 0.085;
  const pisoY = y0 + fh - pisoH;
  const pernosPorPanel = 4;
  const pernoMargin = pw * 0.26;
  const pernoStep = pernosPorPanel > 1 ? (pw - pernoMargin * 2) / (pernosPorPanel - 1) : 0;
  const pernosX = (panelX0) => Array.from({ length: pernosPorPanel }, (_, i) => panelX0 + pernoMargin + i * pernoStep);

  // ── Ventana con marco — área superior, centrada en su panel ──
  // Con 1 agujero va sólo la del panel derecho (la que siempre existe); con 2
  // agujeros va una por panel, la izquierda ubicada igual dentro de su panel.
  const frameW = pw * 0.6;
  const frameTop = y0 + fh * 0.17;
  const frameH = fh * 0.32;
  const postW = Math.max(2.5, frameW * 0.12);
  const crossbarY = frameTop + frameH * 0.58;
  const ventR = Math.max(4, Math.min(frameW - postW * 2, frameH * 0.58 * 2) * 0.42);
  const ventCy = frameTop + (crossbarY - frameTop) / 2;
  const ventanaIzq = nAgujeros === 2;
  const ventanasConMarco = [
    ...(ventanaIzq ? [x0 + pw * 0.5] : []),
    ...(nAgujeros === 1 || nAgujeros === 2 ? [x0 + pw + pw * 0.5] : []),
  ];

  // Circulitos simples cuando hay 4 agujeros (sin marco — no caben, y se agrupan
  // más arriba/adentro para no invadir la zona de las reatas).
  const ventCxSimple = x0 + pw + pw * 0.58;
  const ventCySimple = y0 + fh * 0.27;
  const ventRSimple = Math.min(ventR, fh * 0.05);
  const ventOffset = ventRSimple * 1.35;
  const ventanasSimples = nAgujeros === 4 ? [
    [ventCxSimple - ventOffset, ventCySimple - ventOffset], [ventCxSimple + ventOffset, ventCySimple - ventOffset],
    [ventCxSimple - ventOffset, ventCySimple + ventOffset], [ventCxSimple + ventOffset, ventCySimple + ventOffset],
  ] : [];
  const ventanasSimplesTopY = ventCySimple - ventOffset - ventRSimple;

  // ── Tag logo/placa (panel izquierdo) ──
  // Si el panel izquierdo lleva ventana, el tag baja para no chocar con ella.
  const tagW = Math.min(pw * 0.62, 56);
  const tagH = tieneLogo && tienePlaca ? 20 : 12;
  const tagX = x0 + pw * 0.6 - tagW / 2;
  const tagY = ventanaIzq
    ? Math.min(frameTop + frameH + 6, pisoY - tagH - 4)
    : y0 + fh * 0.08;

  // ── Reatas de amarre — siempre presentes (insumo fijo), cerca de bordes y unión ──
  const reataW = Math.max(4, pw * 0.065);
  const reataH = fh * 0.1;
  const reataYOuter = y0 + fh * 0.52;
  const reataYInner = y0 + fh * 0.36;
  const reatas = [
    { x: x0 + 4,                    y: reataYOuter }, // izq. borde exterior
    { x: x0 + pw - reataW - 4,      y: reataYInner }, // izq. junto a la unión
    { x: x0 + pw + 4,                y: reataYInner }, // der. junto a la unión
    { x: x0 + fw - reataW - 4,      y: reataYOuter }, // der. borde exterior
  ];
  const reataLabelX = x0 + pw * 0.5;
  const reataLabelY = y0 + fh * 0.74;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ display: "block", maxWidth: "640px", margin: "0 auto", fontFamily: "Arial, sans-serif" }}>
      <defs>
        <marker id="arrDivA" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
          <path d="M0,0 L6,3 L0,6 Z" fill="#000000" />
        </marker>
        <marker id="arrDivB" markerWidth="6" markerHeight="6" refX="1" refY="3" orient="auto">
          <path d="M6,0 L0,3 L6,6 Z" fill="#000000" />
        </marker>
      </defs>

      {/* Panel izquierdo + núcleo de icopor */}
      <rect x={x0} y={y0} width={pw} height={fh} fill={bg} stroke={marco} strokeWidth="2" />
      <rect x={x0 + insetX} y={y0 + insetY} width={Math.max(1, pw - insetX * 2)} height={Math.max(1, fh - insetY * 2)} fill="white" stroke={nucleo} strokeWidth="1" strokeDasharray="4,2" />

      {/* Panel derecho + núcleo de icopor */}
      <rect x={x0 + pw} y={y0} width={pw} height={fh} fill={bg} stroke={marco} strokeWidth="2" />
      <rect x={x0 + pw + insetX} y={y0 + insetY} width={Math.max(1, pw - insetX * 2)} height={Math.max(1, fh - insetY * 2)} fill="white" stroke={nucleo} strokeWidth="1" strokeDasharray="4,2" />

      {/* Línea de unión central */}
      <line x1={x0 + pw} y1={y0} x2={x0 + pw} y2={y0 + fh} stroke={marco} strokeWidth="1" strokeDasharray="2,2" />

      {/* Etiquetas de panel */}
      <text x={x0 + pw / 2} y={y0 - 6} fontSize="8" fill={rotulo} textAnchor="middle" fontWeight="bold" style={haloTexto}>IZQ.</text>
      <text x={x0 + pw + pw / 2} y={y0 - 6} fontSize="8" fill={rotulo} textAnchor="middle" fontWeight="bold" style={haloTexto}>DER.</text>
      <text x={x0 + pw / 2} y={y0 + fh / 2 + 3} fontSize="7" fontWeight="bold" fill={rotulo} textAnchor="middle" style={haloTexto}>ICOPOR</text>
      <text x={x0 + pw + pw / 2} y={y0 + fh / 2 + 3} fontSize="7" fontWeight="bold" fill={rotulo} textAnchor="middle" style={haloTexto}>ICOPOR</text>

      {/* Reatas de amarre (siempre presentes) + rótulo con líneas guía */}
      {reatas.map((r, i) => (
        <g key={i}>
          <rect x={r.x} y={r.y} width={reataW} height={reataH} rx={reataW / 2.2} fill="white" stroke={reataCol} strokeWidth="1" />
          <circle cx={r.x + reataW / 2} cy={r.y + reataH * 0.3} r="0.9" fill={reataCol} />
          <circle cx={r.x + reataW / 2} cy={r.y + reataH * 0.7} r="0.9" fill={reataCol} />
        </g>
      ))}
      <line x1={reatas[0].x + reataW / 2} y1={reatas[0].y + reataH} x2={reataLabelX - 6} y2={reataLabelY - 4} stroke={reataCol} strokeWidth="0.6" />
      <line x1={reatas[1].x + reataW / 2} y1={reatas[1].y + reataH} x2={reataLabelX + 4} y2={reataLabelY - 4} stroke={reataCol} strokeWidth="0.6" />
      <text x={reataLabelX} y={reataLabelY + 5} fontSize="7" fontWeight="bold" fill={rotulo} textAnchor="middle" style={haloTexto}>REATAS</text>

      {/* Tag Logo / Placa — panel izquierdo */}
      {(tieneLogo || tienePlaca) && (
        <g>
          <rect x={tagX} y={tagY} width={tagW} height={tagH} rx="2" fill="white" stroke={hardware} strokeWidth="1" />
          {tieneLogo && (
            <text x={tagX + tagW / 2} y={tagY + (tienePlaca ? 8 : 8.5)} fontSize="7" fontWeight="bold" fill={rotulo} textAnchor="middle" style={haloTexto}>LOGO</text>
          )}
          {tieneLogo && tienePlaca && (
            <line x1={tagX + 2} y1={tagY + 10} x2={tagX + tagW - 2} y2={tagY + 10} stroke={hardware} strokeWidth="0.5" />
          )}
          {tienePlaca && (
            <text x={tagX + tagW / 2} y={tagY + (tieneLogo ? 18 : 8.5)} fontSize="7" fontWeight="bold" fill={rotulo} textAnchor="middle" style={haloTexto}>PLACA</text>
          )}
        </g>
      )}

      {/* Ventana(s) con marco — una por panel con agujero */}
      {ventanasConMarco.map((ventCx, i) => (
        <g key={`vent${i}`}>
          <rect x={ventCx - frameW / 2} y={frameTop} width={postW} height={frameH} fill="white" stroke={nucleo} strokeWidth="1" />
          <rect x={ventCx + frameW / 2 - postW} y={frameTop} width={postW} height={frameH} fill="white" stroke={nucleo} strokeWidth="1" />
          <rect x={ventCx - frameW / 2 + postW} y={crossbarY} width={frameW - postW * 2} height={frameTop + frameH - crossbarY} fill="none" stroke={nucleo} strokeWidth="0.75" />
          <line x1={ventCx - frameW / 2} y1={crossbarY} x2={ventCx + frameW / 2} y2={crossbarY} stroke={nucleo} strokeWidth="1" />
          <circle cx={ventCx} cy={ventCy} r={ventR} fill="white" stroke={nucleo} strokeWidth="1.2" />
          <text x={ventCx} y={frameTop - 5} fontSize="7" fontWeight="bold" fill={rotulo} textAnchor="middle" style={haloTexto}>
            VENTANA{medidaEspecial ? " (medida dif.)" : ""}
          </text>
        </g>
      ))}
      {ventanasSimples.map(([vx, vy], i) => (
        <circle key={i} cx={vx} cy={vy} r={ventRSimple} fill="white" stroke={nucleo} strokeWidth="1.2" />
      ))}
      {ventanasSimples.length > 0 && (
        <text x={ventCxSimple} y={ventanasSimplesTopY - 5} fontSize="7" fontWeight="bold" fill={rotulo} textAnchor="middle" style={haloTexto}>VENTANA</text>
      )}

      {/* Franja de piso con pernos — base de cada panel */}
      <rect x={x0} y={pisoY} width={pw - 1.5} height={pisoH} rx="1.5" fill="#e2e8f0" stroke="#1f2937" strokeWidth="0.75" />
      <rect x={x0 + pw + 1.5} y={pisoY} width={pw - 1.5} height={pisoH} rx="1.5" fill="#e2e8f0" stroke="#1f2937" strokeWidth="0.75" />
      {pernosX(x0).map((px, i) => <circle key={`pl${i}`} cx={px} cy={pisoY + pisoH / 2} r="1" fill="#1f2937" />)}
      {pernosX(x0 + pw + 1.5).map((px, i) => <circle key={`pr${i}`} cx={px} cy={pisoY + pisoH / 2} r="1" fill="#1f2937" />)}
      <text x={cx} y={pisoY + pisoH / 2 + 2.5} fontSize="7" fontWeight="bold" fill={rotulo} textAnchor="middle" style={haloTexto}>PISO</text>

      {/* Cota ANCHO (inferior) */}
      <line x1={x0} y1={y0 + fh + 14} x2={x0 + fw} y2={y0 + fh + 14} stroke="#000000" strokeWidth="1" markerStart="url(#arrDivB)" markerEnd="url(#arrDivA)" />
      <text x={cx} y={y0 + fh + 26} fontSize="9.5" fontWeight="bold" fill={rotulo} textAnchor="middle" style={haloTexto}>
        ANCHO VEHÍCULO: {fmtMm(anchoVehiculo)} mm (paneles {fmtMm(panel.ancho)} c/u)
      </text>

      {/* Cota ALTO (derecha) */}
      <line x1={x0 + fw + 12} y1={y0} x2={x0 + fw + 12} y2={y0 + fh} stroke="#000000" strokeWidth="1" markerStart="url(#arrDivB)" markerEnd="url(#arrDivA)" />
      <text
        x={x0 + fw + 26}
        y={cy}
        fontSize="9.5" fontWeight="bold" fill={rotulo} textAnchor="middle" style={haloTexto}
        transform={`rotate(90,${x0 + fw + 26},${cy})`}
      >
        ALTO VEHÍCULO: {fmtMm(altoVehiculo)} mm
      </text>

      {/* Título */}
      <text x={W / 2} y={H - 4} fontSize="10" fontWeight="bold" textAnchor="middle" fill={rotulo}>
        VISTA FRONTAL — DIVISIÓN TÉRMICA (2 PANELES)
      </text>
    </svg>
  );
}

// ── Componente principal ───────────────────────────────────────────────────────

export default function FichaImpresionDivision({ ficha, numero, onClose }) {
  if (!ficha) return null;
  const f   = ficha;
  const codigo = codigoFichaOFallback({ ...f, ordenProduccion: f.ordenProduccion ?? numero }, "division");
  const med = f.medidas || {};

  const consumoVisible = (f.consumo || []).filter((c) => c.cantidad > 0);

  return (
    <FichaImpresionShell
      productLabel="División Térmica"
      numero={codigo}
      cliente={f.cliente}
      onClose={onClose}
      maxWidthClass="max-w-[1220px]"
      windowSize={{ width: 1300, height: 840 }}
    >
        <div style={{ color: "#000000", fontSize: "12.5px" }}>
          <Membrete
            logoSrc={logoPng}
            tituloFicha="Ficha de Fabricación — División Térmica"
            numero={codigo}
            numeroLabel="N.° ficha de producción"
          />

          {/* ── Identificación + medidas (izquierda) / Plano + acabados (derecha) ── */}
          <div style={{
            display: "grid", gridTemplateColumns: "0.86fr 1.14fr", gap: "16px",
            padding: "10px 20px", background: "#f8fafc", borderBottom: "2px solid #e2e8f0",
          }}>

            {/* Columna izquierda — identificación + medidas de corte */}
            <div>
              {/* Medida del vehículo — máxima prioridad visual, es la medida de entrada de todo el cálculo */}
              <MedidaHero
                label="Medida del Vehículo"
                ancho={f.anchoVehiculo}
                alto={f.altoVehiculo}
                extra={
                  <span style={{ color: "#ffffff", fontSize: "14px", fontWeight: "bold", fontFamily: "monospace" }}>
                    {toM(f.anchoVehiculo)} × {toM(f.altoVehiculo)} m
                  </span>
                }
              />

              <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "8px", marginBottom: "6px" }}>
                <div style={{ background: "white", border: "1px solid #e2e8f0", borderRadius: "8px", padding: "8px 10px" }}>
                  <div style={{ fontSize: "9.5px", color: "#000000", fontWeight: "600", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "3px" }}>Cliente</div>
                  <div style={{ fontSize: "18px", fontWeight: "bold", color: "#1a3f8f" }}>{f.cliente || "—"}</div>
                </div>

                <div style={{ background: "white", border: "1px solid #e2e8f0", borderRadius: "8px", padding: "8px 10px", textAlign: "center" }}>
                  <div style={{ fontSize: "9.5px", color: "#000000", fontWeight: "600", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "3px" }}>Cantidad</div>
                  <div style={{ fontSize: "24px", fontWeight: "bold", color: "#1a3f8f", lineHeight: 1 }}>{f.cantidad}</div>
                  <div style={{ fontSize: "10px", color: "#000000", marginTop: "1px" }}>unidades</div>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "6px", marginBottom: "6px" }}>
                <InfoChip label="Orden de compra" value={f.numeroOrdenCompra || "—"} highlight={!!f.numeroOrdenCompra} />
                <InfoChip label="N.° ficha física" value={f.numeroFicha || "—"} />
                <InfoChip label="Agujero"         value={f.agujero || "—"} />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "6px", marginBottom: "10px" }}>
                <InfoChip label="Fecha orden"   value={fmtDate(f.fechaOrden)} />
                <InfoChip label="Fecha entrega" value={fmtDate(f.fechaEntrega)} highlight={!!f.fechaEntrega} />
                <InfoChip label="Placa"         value={f.placa === "SI" ? `SI · ${f.numeroPlaca || "—"}` : "NO"} highlight={f.placa === "SI"} />
              </div>

              <SectionTitle size="11.5px">Medidas de Corte</SectionTitle>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "8px" }}>
                <MedidaCard label="Panel"                  ancho={med.panel?.ancho}          alto={med.panel?.alto}          color="#1a3f8f" />
                <MedidaCard label="Icopor"                 ancho={med.icopor?.ancho}         alto={med.icopor?.alto}         color="#0b4a7d" />
                <MedidaCard label="Funda"                  ancho={med.funda?.ancho}          alto={med.funda?.alto}          color="#155e75" />
                <MedidaCard label="Policarb. / Cartonplast" ancho={med.policarbonato?.ancho} alto={med.policarbonato?.alto}  color="#115e59" />
              </div>
            </div>

            {/* Columna derecha — plano técnico + opciones/acabados + lona/piso/ventana */}
            <div>
              {med.panel && med.icopor && (
                <div style={{
                  border: "1px solid #334155", borderRadius: "8px", padding: "4px",
                  background: "#fafafa", display: "flex", justifyContent: "center", alignItems: "center",
                }}>
                  <PlanoTecnicoDivision
                    anchoVehiculo={f.anchoVehiculo}
                    altoVehiculo={f.altoVehiculo}
                    panel={med.panel}
                    icopor={med.icopor}
                    logo={f.logo}
                    placa={f.placa}
                    agujero={f.agujero}
                  />
                </div>
              )}

              <div style={{ marginTop: "8px", background: "#eff6ff", border: "1px solid #dbeafe", borderRadius: "8px", padding: "9px 10px" }}>
                <SectionTitle size="11.5px">Opciones y Acabados</SectionTitle>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "6px" }}>
                  <AcabadoCard label="Logo"     value={f.logo || "NO"} color="#1a3f8f" active={f.logo !== "NO" && !!f.logo} />
                  <AcabadoCard label="Platinas" value={formatPlatinas(f)} color="#92400e" active={f.platinas === "SI"} />
                  <AcabadoCard label="Espuma"   value="8 CAB / 4+4 LAT" color="#115e59" active />
                  <AcabadoCard label="Factura"  value={f.factura || "NO"} color="#166534" active={f.factura === "SI"} />
                </div>
              </div>

              {/* Lona + Piso + Ventana */}
              <div style={{ marginTop: "8px", display: "grid", gridTemplateColumns: "3fr 2fr", gap: "8px" }}>

                {/* Lona */}
                <div style={{ background: "#f0f9ff", border: "1px solid #bae6fd", borderRadius: "8px", padding: "9px" }}>
                  <div style={{ fontSize: "10px", color: "#075985", fontWeight: "bold", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "7px" }}>
                    Distribución de Lona
                    <span style={{ fontWeight: "600", color: "#000000", marginLeft: "6px" }}>
                      Rollo {med.lona?.anchoRollo ?? "—"} mm — Color: {f.colorLona || "—"}
                    </span>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "6px" }}>
                    {[
                      ["Tiras",        med.lona?.tiras,          ""],
                      ["Largo tira",   med.lona?.largoTira,      "mm"],
                      ["Sobrante",     med.lona?.sobranteAncho,  "mm"],
                    ].map(([lbl, val, unit]) => (
                      <div key={lbl} style={{ textAlign: "center", background: "white", borderRadius: "6px", padding: "6px" }}>
                        <div style={{ fontSize: lbl === "Tiras" ? "22px" : "17px", fontWeight: "bold", color: "#075985", fontFamily: "monospace", lineHeight: 1 }}>
                          {val ?? "—"}
                        </div>
                        <div style={{ fontSize: "9px", color: "#000000", fontWeight: "600", marginTop: "2px" }}>{lbl}{unit ? ` (${unit})` : ""}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Piso y ventana */}
                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: "8px", padding: "8px 9px", flex: 1 }}>
                    <div style={{ fontSize: "9px", color: "#166534", fontWeight: "bold", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "3px" }}>Medida Piso</div>
                    <div style={{ fontSize: "22px", fontWeight: "bold", fontFamily: "monospace", color: "#14532d", lineHeight: 1 }}>{fmtMm(med.medidaPiso)}</div>
                    <div style={{ fontSize: "10px", color: "#000000", marginTop: "2px" }}>mm</div>
                  </div>
                  <div style={{ background: "#fefce8", border: "1px solid #fde68a", borderRadius: "8px", padding: "8px 9px", flex: 1 }}>
                    <div style={{ fontSize: "9px", color: "#854d0e", fontWeight: "bold", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "3px" }}>Distancia Ventana</div>
                    <div style={{ fontSize: "22px", fontWeight: "bold", fontFamily: "monospace", color: "#92400e", lineHeight: 1 }}>
                      {med.distanciaVentana != null ? fmt1(med.distanciaVentana) : "—"}
                    </div>
                    <div style={{ fontSize: "10px", color: "#000000", marginTop: "2px" }}>cm</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ── Adicional / Notas ── */}
          {f.adicional && (
            <div style={{ padding: "0 20px 8px" }}>
              <div style={{ background: "#fff7ed", border: "1px solid #fed7aa", borderRadius: "8px", padding: "9px 10px" }}>
                <div style={{ fontSize: "9.5px", color: "#7c2d12", fontWeight: "bold", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "3px" }}>
                  Adicional / Notas
                </div>
                <div style={{ fontSize: "12.5px", color: "#000000" }}>{f.adicional}</div>
              </div>
            </div>
          )}

          {/* ── Consumo de materiales ── */}
          {consumoVisible.length > 0 && (
            <div style={{ padding: "10px 20px 8px" }}>
              <SectionTitle>Consumo de Materiales (por unidad)</SectionTitle>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: "6px" }}>
                {consumoVisible.map((c) => (
                  <div key={c.insumo} style={{
                    background: "#f8fafc", border: "1px solid #e2e8f0",
                    borderRadius: "6px", padding: "6px 8px",
                  }}>
                    <div style={{ fontSize: "9px", color: "#000000", fontWeight: "600", marginBottom: "2px" }}>{c.insumo.replace(/_/g, " ")}</div>
                    <div style={{ fontWeight: "bold", fontFamily: "monospace", fontSize: "15px", color: "#000000" }}>
                      {c.unidad === "m²" ? Number(c.cantidad).toFixed(3) : c.cantidad}
                    </div>
                    <div style={{ fontSize: "9px", color: "#000000", marginTop: "1px" }}>
                      {c.unidad}{c.largoMm ? ` · ${c.largoMm} mm` : ""}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <Firmas ficha={ficha} />
          <FichaFooter
            texto="COLD CHAIN SERVICES S.A.S. — FICHA DE FABRICACIÓN DIVISIONES TÉRMICAS"
            numero={codigo}
            fecha={fmtDate(new Date().toISOString())}
          />
        </div>
    </FichaImpresionShell>
  );
}
