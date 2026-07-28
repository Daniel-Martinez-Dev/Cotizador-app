import React from "react";
import FichaImpresionShell from "./fichas/FichaImpresionShell";
import { fmtMm, fmtCm as fmt1, fmtDate } from "../utils/fichaFormat";
import logoPng from "../assets/imagenes/logo.png";
import { MedidaCard, InfoChip, AcabadoCard, SectionTitle, MedidaHero, Membrete, Firmas, FichaFooter } from "./fichas/FichaVisualKit";

// Convierte un valor en milímetros a metros (2 decimales) — distinto de fmtM2,
// que formatea un área en m² ya calculada.
const toM = (mm) => (mm == null ? "—" : (Math.round(Number(mm) / 10) / 100).toFixed(2));

// ── Plano técnico (SVG 2D vista frontal) ──────────────────────────────────────
// La división se arma con dos paneles del mismo tamaño lado a lado (ver
// calcularMedidas en utils/divisionTermica.js: anchoPanel = (anchoVehiculo+40)/2),
// cada uno con un núcleo de icopor más pequeño que el panel que lo contiene.
// Además del corte, se marca la ubicación real de logo/placa (panel izq.),
// ventana con marco (panel der.), reatas de amarre (siempre presentes, ver
// insumo REATAS en calcularConsumo) y la franja de piso con pernos —
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
  const nucleo = "#93c5fd";
  const bg = "#f0f4ff";
  const hardware = "#d97706";
  const reataCol = "#475569";

  const tieneLogo = !!logo && logo !== "NO";
  const tienePlaca = placa === "SI";
  const nAgujeros = AGUJEROS_POR_OPCION[agujero] ?? 0;
  const medidaEspecial = agujero === "AGUJERO DIF MEDIDA";

  // ── Tag logo/placa (panel izquierdo, área superior) ──
  const tagW = Math.min(pw * 0.62, 56);
  const tagH = tieneLogo && tienePlaca ? 20 : 12;
  const tagX = x0 + pw * 0.6 - tagW / 2;
  const tagY = y0 + fh * 0.08;

  // ── Ventana (panel derecho, área superior) — con marco cuando hay 1 agujero ──
  const ventCx = x0 + pw + pw * 0.5;
  const frameW = pw * 0.6;
  const frameTop = y0 + fh * 0.17;
  const frameH = fh * 0.32;
  const postW = Math.max(2.5, frameW * 0.12);
  const crossbarY = frameTop + frameH * 0.58;
  const ventR = Math.max(4, Math.min(frameW - postW * 2, frameH * 0.58 * 2) * 0.42);
  const ventCy = frameTop + (crossbarY - frameTop) / 2;

  // Circulitos simples cuando hay 2 o 4 agujeros (sin marco — no cabe bien, y se
  // agrupan más arriba/adentro para no invadir la zona de las reatas).
  const ventCxSimple = x0 + pw + pw * 0.58;
  const ventCySimple = y0 + fh * 0.27;
  const ventRSimple = Math.min(ventR, fh * 0.05);
  const ventOffset = ventRSimple * 1.35;
  const ventanasSimples =
    nAgujeros === 2 ? [[ventCxSimple - ventOffset, ventCySimple], [ventCxSimple + ventOffset, ventCySimple]] :
    nAgujeros === 4 ? [
      [ventCxSimple - ventOffset, ventCySimple - ventOffset], [ventCxSimple + ventOffset, ventCySimple - ventOffset],
      [ventCxSimple - ventOffset, ventCySimple + ventOffset], [ventCxSimple + ventOffset, ventCySimple + ventOffset],
    ] : [];
  const ventanasSimplesTopY = ventCySimple - (nAgujeros === 4 ? ventOffset : 0) - ventRSimple;

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

  // ── Franja de piso con pernos — base de cada panel ──
  const pisoH = fh * 0.085;
  const pisoY = y0 + fh - pisoH;
  const pernosPorPanel = 4;
  const pernoMargin = pw * 0.26;
  const pernoStep = pernosPorPanel > 1 ? (pw - pernoMargin * 2) / (pernosPorPanel - 1) : 0;
  const pernosX = (panelX0) => Array.from({ length: pernosPorPanel }, (_, i) => panelX0 + pernoMargin + i * pernoStep);

  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ display: "block" }}>
      <defs>
        <marker id="arrDivA" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
          <path d="M0,0 L6,3 L0,6 Z" fill="#555" />
        </marker>
        <marker id="arrDivB" markerWidth="6" markerHeight="6" refX="1" refY="3" orient="auto">
          <path d="M6,0 L0,3 L6,6 Z" fill="#555" />
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
      <text x={x0 + pw / 2} y={y0 - 6} fontSize="7" fill={marco} textAnchor="middle" fontWeight="bold">IZQ.</text>
      <text x={x0 + pw + pw / 2} y={y0 - 6} fontSize="7" fill={marco} textAnchor="middle" fontWeight="bold">DER.</text>
      <text x={x0 + pw / 2} y={y0 + fh / 2 + 3} fontSize="6" fill={nucleo} textAnchor="middle">ICOPOR</text>
      <text x={x0 + pw + pw / 2} y={y0 + fh / 2 + 3} fontSize="6" fill={nucleo} textAnchor="middle">ICOPOR</text>

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
      <text x={reataLabelX} y={reataLabelY + 5} fontSize="6.5" fontWeight="bold" fill={reataCol} textAnchor="middle">REATAS</text>

      {/* Tag Logo / Placa — panel izquierdo */}
      {(tieneLogo || tienePlaca) && (
        <g>
          <rect x={tagX} y={tagY} width={tagW} height={tagH} rx="2" fill="white" stroke={hardware} strokeWidth="1" />
          {tieneLogo && (
            <text x={tagX + tagW / 2} y={tagY + (tienePlaca ? 8 : 8.5)} fontSize="6" fontWeight="bold" fill={hardware} textAnchor="middle">LOGO</text>
          )}
          {tieneLogo && tienePlaca && (
            <line x1={tagX + 2} y1={tagY + 10} x2={tagX + tagW - 2} y2={tagY + 10} stroke={hardware} strokeWidth="0.5" />
          )}
          {tienePlaca && (
            <text x={tagX + tagW / 2} y={tagY + (tieneLogo ? 18 : 8.5)} fontSize="6" fontWeight="bold" fill={hardware} textAnchor="middle">PLACA</text>
          )}
        </g>
      )}

      {/* Ventana — panel derecho */}
      {nAgujeros === 1 && (
        <g>
          <rect x={ventCx - frameW / 2} y={frameTop} width={postW} height={frameH} fill="white" stroke={nucleo} strokeWidth="1" />
          <rect x={ventCx + frameW / 2 - postW} y={frameTop} width={postW} height={frameH} fill="white" stroke={nucleo} strokeWidth="1" />
          <rect x={ventCx - frameW / 2 + postW} y={crossbarY} width={frameW - postW * 2} height={frameTop + frameH - crossbarY} fill="none" stroke={nucleo} strokeWidth="0.75" />
          <line x1={ventCx - frameW / 2} y1={crossbarY} x2={ventCx + frameW / 2} y2={crossbarY} stroke={nucleo} strokeWidth="1" />
          <circle cx={ventCx} cy={ventCy} r={ventR} fill="white" stroke={nucleo} strokeWidth="1.2" />
          <text x={ventCx} y={frameTop - 5} fontSize="6" fontWeight="bold" fill={nucleo} textAnchor="middle">
            VENTANA{medidaEspecial ? " (medida dif.)" : ""}
          </text>
        </g>
      )}
      {ventanasSimples.map(([vx, vy], i) => (
        <circle key={i} cx={vx} cy={vy} r={ventRSimple} fill="white" stroke={nucleo} strokeWidth="1.2" />
      ))}
      {ventanasSimples.length > 0 && (
        <text x={ventCxSimple} y={ventanasSimplesTopY - 5} fontSize="6" fontWeight="bold" fill={nucleo} textAnchor="middle">VENTANA</text>
      )}

      {/* Franja de piso con pernos — base de cada panel */}
      <rect x={x0} y={pisoY} width={pw - 1.5} height={pisoH} rx="1.5" fill="#e2e8f0" stroke="#64748b" strokeWidth="0.75" />
      <rect x={x0 + pw + 1.5} y={pisoY} width={pw - 1.5} height={pisoH} rx="1.5" fill="#e2e8f0" stroke="#64748b" strokeWidth="0.75" />
      {pernosX(x0).map((px, i) => <circle key={`pl${i}`} cx={px} cy={pisoY + pisoH / 2} r="1" fill="#475569" />)}
      {pernosX(x0 + pw + 1.5).map((px, i) => <circle key={`pr${i}`} cx={px} cy={pisoY + pisoH / 2} r="1" fill="#475569" />)}
      <text x={cx} y={pisoY + pisoH / 2 + 2.5} fontSize="6" fontWeight="bold" fill="#334155" textAnchor="middle">PISO</text>

      {/* Cota ANCHO (inferior) */}
      <line x1={x0} y1={y0 + fh + 14} x2={x0 + fw} y2={y0 + fh + 14} stroke="#555" strokeWidth="1" markerStart="url(#arrDivB)" markerEnd="url(#arrDivA)" />
      <text x={cx} y={y0 + fh + 26} fontSize="9" fill="#333" textAnchor="middle">
        ANCHO VEHÍCULO: {fmtMm(anchoVehiculo)} mm (paneles {fmtMm(panel.ancho)} c/u)
      </text>

      {/* Cota ALTO (derecha) */}
      <line x1={x0 + fw + 12} y1={y0} x2={x0 + fw + 12} y2={y0 + fh} stroke="#555" strokeWidth="1" markerStart="url(#arrDivB)" markerEnd="url(#arrDivA)" />
      <text
        x={x0 + fw + 26}
        y={cy}
        fontSize="9" fill="#333" textAnchor="middle"
        transform={`rotate(90,${x0 + fw + 26},${cy})`}
      >
        ALTO VEHÍCULO: {fmtMm(altoVehiculo)} mm
      </text>

      {/* Título */}
      <text x={W / 2} y={H - 4} fontSize="10" fontWeight="bold" textAnchor="middle" fill="#333">
        VISTA FRONTAL — DIVISIÓN TÉRMICA (2 PANELES)
      </text>
    </svg>
  );
}

// ── Componente principal ───────────────────────────────────────────────────────

export default function FichaImpresionDivision({ ficha, numero, onClose }) {
  if (!ficha) return null;
  const f   = ficha;
  const med = f.medidas || {};

  const consumoVisible = (f.consumo || []).filter((c) => c.cantidad > 0);

  return (
    <FichaImpresionShell
      productLabel="División Térmica"
      numero={numero}
      cliente={f.cliente}
      onClose={onClose}
      maxWidthClass="max-w-4xl"
      windowSize={{ width: 1050, height: 900 }}
    >
        <div style={{ color: "#1a1a2e", fontSize: "11px" }}>
          <Membrete
            logoSrc={logoPng}
            tituloFicha="Ficha de Fabricación — División Térmica"
            numero={f.ordenProduccion ?? numero}
          />

          {/* ── Información general ── */}
          <div style={{ padding: "10px 20px", background: "#f8fafc", borderBottom: "2px solid #e2e8f0" }}>

            {/* Medida del vehículo — máxima prioridad visual, es la medida de entrada de todo el cálculo */}
            <MedidaHero
              label="Medida del Vehículo"
              ancho={f.anchoVehiculo}
              alto={f.altoVehiculo}
              extra={
                <span style={{ color: "#7dd3fc", fontSize: "14px", fontWeight: "bold", fontFamily: "monospace" }}>
                  {toM(f.anchoVehiculo)} × {toM(f.altoVehiculo)} m
                </span>
              }
            />

            <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "8px", marginBottom: "6px" }}>
              <div style={{ background: "white", border: "1px solid #e2e8f0", borderRadius: "8px", padding: "8px 10px" }}>
                <div style={{ fontSize: "8px", color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "3px" }}>Cliente</div>
                <div style={{ fontSize: "16px", fontWeight: "bold", color: "#1a3f8f" }}>{f.cliente || "—"}</div>
              </div>

              <div style={{ background: "white", border: "1px solid #e2e8f0", borderRadius: "8px", padding: "8px 10px", textAlign: "center" }}>
                <div style={{ fontSize: "8px", color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "3px" }}>Cantidad</div>
                <div style={{ fontSize: "22px", fontWeight: "bold", color: "#1a3f8f", lineHeight: 1 }}>{f.cantidad}</div>
                <div style={{ fontSize: "9px", color: "#94a3b8", marginTop: "1px" }}>unidades</div>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "6px", marginBottom: "6px" }}>
              <InfoChip label="Orden de compra" value={f.numeroOrdenCompra || "—"} />
              <InfoChip label="N.° de ficha"    value={f.numeroFicha || "—"} />
              <InfoChip label="Agujero"         value={f.agujero || "—"} />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "6px" }}>
              <InfoChip label="Fecha orden"   value={f.fechaOrden   ? new Date(f.fechaOrden).toLocaleDateString("es-CO")   : "—"} />
              <InfoChip label="Fecha entrega" value={f.fechaEntrega ? new Date(f.fechaEntrega).toLocaleDateString("es-CO") : "—"} highlight={!!f.fechaEntrega} />
              <InfoChip label="Placa"         value={f.placa === "SI" ? `SI · ${f.numeroPlaca || "—"}` : "NO"} highlight={f.placa === "SI"} />
            </div>
          </div>

          {/* ── Medidas de corte ── */}
          <div style={{ padding: "10px 20px" }}>
            <SectionTitle>Medidas de Corte</SectionTitle>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "8px", marginBottom: "8px" }}>
              <MedidaCard label="Panel"                  ancho={med.panel?.ancho}          alto={med.panel?.alto}          color="#1a3f8f" />
              <MedidaCard label="Icopor"                 ancho={med.icopor?.ancho}         alto={med.icopor?.alto}         color="#0f6cbf" />
              <MedidaCard label="Funda"                  ancho={med.funda?.ancho}          alto={med.funda?.alto}          color="#0891b2" />
              <MedidaCard label="Policarb. / Cartonplast" ancho={med.policarbonato?.ancho} alto={med.policarbonato?.alto}  color="#0d9488" />
            </div>

            {/* Plano técnico + Opciones y Acabados, lado a lado para aprovechar el
                espacio que el plano deja libre a los costados. */}
            <div style={{ display: "flex", gap: "10px", alignItems: "stretch", flexWrap: "wrap" }}>
              {med.panel && med.icopor && (
                <div style={{
                  flex: "2 1 340px", border: "1px solid #ccc", borderRadius: "8px", padding: "4px",
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
              <div style={{
                flex: "1 1 200px", background: "#eff6ff", border: "1px solid #dbeafe",
                borderRadius: "8px", padding: "9px 10px",
              }}>
                <SectionTitle size="10px">Opciones y Acabados</SectionTitle>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "6px" }}>
                  <AcabadoCard label="Logo"     value={f.logo || "NO"} color="#1a3f8f" active={f.logo !== "NO" && !!f.logo} />
                  <AcabadoCard label="Platinas" value={f.platinas === "SI" ? `SI · ${f.alturaPlatinas ? fmtMm(f.alturaPlatinas) + " mm" : "—"}` : "NO"} color="#d97706" active={f.platinas === "SI"} />
                  <AcabadoCard label="Espuma"   value="8 CAB / 4+4 LAT" color="#0d9488" active />
                  <AcabadoCard label="Factura"  value={f.factura || "NO"} color="#16a34a" active={f.factura === "SI"} />
                </div>
              </div>
            </div>
          </div>

          {/* ── Lona + Piso ── */}
          <div style={{ padding: "0 20px 10px", display: "grid", gridTemplateColumns: "3fr 2fr", gap: "8px" }}>

            {/* Lona */}
            <div style={{ background: "#f0f9ff", border: "1px solid #bae6fd", borderRadius: "8px", padding: "9px" }}>
              <div style={{ fontSize: "9px", color: "#0284c7", fontWeight: "bold", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "7px" }}>
                Distribución de Lona
                <span style={{ fontWeight: "normal", color: "#64748b", marginLeft: "6px" }}>
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
                    <div style={{ fontSize: lbl === "Tiras" ? "20px" : "15px", fontWeight: "bold", color: "#0284c7", fontFamily: "monospace", lineHeight: 1 }}>
                      {val ?? "—"}
                    </div>
                    <div style={{ fontSize: "9px", color: "#64748b", marginTop: "2px" }}>{lbl}{unit ? ` (${unit})` : ""}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Piso y ventana */}
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: "8px", padding: "8px 9px", flex: 1 }}>
                <div style={{ fontSize: "8px", color: "#16a34a", fontWeight: "bold", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "3px" }}>Medida Piso</div>
                <div style={{ fontSize: "20px", fontWeight: "bold", fontFamily: "monospace", color: "#15803d", lineHeight: 1 }}>{fmtMm(med.medidaPiso)}</div>
                <div style={{ fontSize: "9px", color: "#94a3b8", marginTop: "2px" }}>mm</div>
              </div>
              <div style={{ background: "#fefce8", border: "1px solid #fde68a", borderRadius: "8px", padding: "8px 9px", flex: 1 }}>
                <div style={{ fontSize: "8px", color: "#ca8a04", fontWeight: "bold", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "3px" }}>Distancia Ventana</div>
                <div style={{ fontSize: "20px", fontWeight: "bold", fontFamily: "monospace", color: "#92400e", lineHeight: 1 }}>
                  {med.distanciaVentana != null ? fmt1(med.distanciaVentana) : "—"}
                </div>
                <div style={{ fontSize: "9px", color: "#94a3b8", marginTop: "2px" }}>cm</div>
              </div>
            </div>
          </div>

          {/* ── Consumo de materiales ── */}
          {consumoVisible.length > 0 && (
            <div style={{ padding: "10px 20px 8px" }}>
              <SectionTitle>Consumo de Materiales (por unidad)</SectionTitle>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: "6px" }}>
                {consumoVisible.map((c) => (
                  <div key={c.insumo} style={{
                    background: "#f8fafc", border: "1px solid #e2e8f0",
                    borderRadius: "6px", padding: "6px 8px",
                  }}>
                    <div style={{ fontSize: "8px", color: "#94a3b8", marginBottom: "2px" }}>{c.insumo.replace(/_/g, " ")}</div>
                    <div style={{ fontWeight: "bold", fontFamily: "monospace", fontSize: "13px", color: "#374151" }}>
                      {c.unidad === "m²" ? Number(c.cantidad).toFixed(3) : c.cantidad}
                    </div>
                    <div style={{ fontSize: "8px", color: "#94a3b8", marginTop: "1px" }}>
                      {c.unidad}{c.largoMm ? ` · ${c.largoMm} mm` : ""}
                    </div>
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
            texto="COLD CHAIN SERVICES S.A.S. — FICHA DE FABRICACIÓN DIVISIONES TÉRMICAS"
            numero={numero}
            fecha={fmtDate(new Date().toISOString())}
          />
        </div>
    </FichaImpresionShell>
  );
}
