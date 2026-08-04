import React from "react";
import FichaImpresionShell from "./fichas/FichaImpresionShell";
import { fmtMm, fmtM2, fmtN, fmtDate } from "../utils/fichaFormat";
import logoPng from "../assets/imagenes/logo.png";
import { FaUserTie, FaRegCalendarAlt, FaUserCircle } from "react-icons/fa";
import { MedidaCard, InfoChip, AcabadoCard, FichaFooter } from "./fichas/FichaVisualKit";

// ── Diagrama SVG del SELLO — caja isométrica limpia (una sola pieza, sin
// despiece), con las 8 cotas de fabricación de referencia. ─────────────────
function DiagramaSelloFrente({ anchoVano, altoVano, selloAncho, selloAlto, espesorSello, espesorPoste, despliegueCortina }) {
  const W = 680, H = 440;
  const boxW = 320, boxH = 240, depth = 44;
  const ox = 170, oy = 78;

  const left = ox, right = ox + boxW;
  const top = oy, bottom = oy + boxH;
  const cx = (left + right) / 2;

  const linea = "#1f2937";
  const dim = "#475569";
  const faceSide = "#d7dbe2";
  const faceFront = "#fbfbfc";

  const despH = altoVano
    ? Math.min(boxH * 0.42, Math.max(30, (Number(despliegueCortina) / Number(altoVano)) * boxH))
    : 50;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: "auto", display: "block", fontFamily: "Arial, sans-serif" }}>
      <defs>
        <marker id="arrSF" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto">
          <path d="M0,0 L6,3 L0,6 Z" fill={dim} />
        </marker>
        <linearGradient id="topGradSF" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#f6f7f9" />
          <stop offset="100%" stopColor="#e3e6eb" />
        </linearGradient>
      </defs>

      {/* Sombra suave debajo de la caja */}
      <ellipse cx={cx + depth / 2} cy={bottom + depth * 0.55} rx={boxW / 2 + 8} ry="9" fill="#0f172a" opacity="0.06" />

      {/* Cara superior */}
      <path
        d={`M${left + 18},${top} H${right} L${right + depth},${top - depth} H${left + depth + 18} Z`}
        fill="url(#topGradSF)" stroke={linea} strokeWidth="1.3" strokeLinejoin="round"
      />
      {/* Cara lateral derecha (profundidad) */}
      <polygon
        points={`${right},${top} ${right + depth},${top - depth} ${right + depth},${bottom - depth} ${right},${bottom}`}
        fill={faceSide} stroke={linea} strokeWidth="1.3"
      />
      {/* Cara frontal, esquina superior izquierda redondeada */}
      <path
        d={`M${left},${top + 18} A18,18 0 0 1 ${left + 18},${top} H${right} V${bottom} H${left} Z`}
        fill={faceFront} stroke={linea} strokeWidth="1.4" strokeLinejoin="round"
      />

      {/* Franjas verticales de lona */}
      <rect x={left + 34} y={top + 16} width="12" height={boxH - 32} fill="#f5f6f8" stroke="#94a3b8" strokeWidth="0.8" rx="2" ry="2" />
      <rect x={right - 46} y={top + 16} width="12" height={boxH - 32} fill="#f5f6f8" stroke="#94a3b8" strokeWidth="0.8" rx="2" ry="2" />

      {/* Callouts Lona 750K */}
      <line x1={left + 40} y1={top + 40} x2={left - 6} y2={top + 18} stroke="#666" strokeWidth="0.8" />
      <text x={left - 10} y={top + 16} fontSize="9.5" fill="#334155" textAnchor="end">Lona 750K</text>

      <line x1={cx + 20} y1={top - depth * 0.4} x2={cx + 70} y2={top - depth - 14} stroke="#666" strokeWidth="0.8" />
      <text x={cx + 74} y={top - depth - 12} fontSize="9.5" fill="#334155" textAnchor="start">Lona 750K</text>

      {/* Despliegue cortina */}
      <line x1={left - 30} y1={top + 18} x2={left - 30} y2={top + 18 + despH} stroke={dim} strokeWidth="1" markerStart="url(#arrSF)" markerEnd="url(#arrSF)" />
      <text x={left - 38} y={top + 18 + despH / 2 - 4} fontSize="9" fill={dim} textAnchor="end">Despliegue</text>
      <text x={left - 38} y={top + 18 + despH / 2 + 8} fontSize="9" fill={dim} textAnchor="end">cortina: {fmtMm(despliegueCortina)} mm</text>

      {/* Alto bajo lona */}
      <line x1={left + 70} y1={top + 4} x2={left + 70} y2={bottom} stroke={dim} strokeWidth="1" markerStart="url(#arrSF)" markerEnd="url(#arrSF)" />
      <text x={left + 58} y={(top + bottom) / 2} fontSize="9" fill={dim} textAnchor="middle" transform={`rotate(-90,${left + 58},${(top + bottom) / 2})`}>
        Alto bajo lona: {fmtMm(altoVano)} mm
      </text>

      {/* Alto total sello */}
      <line x1={right + depth + 22} y1={top - depth} x2={right + depth + 22} y2={bottom} stroke={linea} strokeWidth="1.2" markerStart="url(#arrSF)" markerEnd="url(#arrSF)" />
      <text x={right + depth + 34} y={(top - depth + bottom) / 2} fontSize="10" fill={linea} fontWeight="bold" textAnchor="middle" transform={`rotate(90,${right + depth + 34},${(top - depth + bottom) / 2})`}>
        Alto total sello: {fmtMm(selloAlto)} mm
      </text>

      {/* Espesor (profundidad) */}
      <line x1={right} y1={bottom + 16} x2={right + depth} y2={bottom + 16 - depth} stroke={dim} strokeWidth="1" markerStart="url(#arrSF)" markerEnd="url(#arrSF)" />
      <text x={right + depth / 2 + 6} y={bottom + 30} fontSize="9" fill={dim} textAnchor="middle">Espesor: {fmtMm(espesorPoste)} mm</text>

      {/* Ancho poste */}
      <line x1={left} y1={bottom + 14} x2={left + 46} y2={bottom + 14} stroke={dim} strokeWidth="1" markerStart="url(#arrSF)" markerEnd="url(#arrSF)" />
      <text x={left + 23} y={bottom + 26} fontSize="8.5" fill={dim} textAnchor="middle">Ancho poste: {fmtMm(espesorSello)} mm</text>

      {/* Ancho bajo lona */}
      <line x1={left + 46} y1={bottom + 14} x2={right - 46} y2={bottom + 14} stroke={dim} strokeWidth="1" markerStart="url(#arrSF)" markerEnd="url(#arrSF)" />
      <text x={cx} y={bottom + 26} fontSize="9" fill={dim} textAnchor="middle">Ancho bajo lona: {fmtMm(anchoVano)} mm</text>

      {/* Ancho total sello */}
      <line x1={left} y1={bottom + 42} x2={right} y2={bottom + 42} stroke={linea} strokeWidth="1.2" markerStart="url(#arrSF)" markerEnd="url(#arrSF)" />
      <text x={cx} y={bottom + 54} fontSize="10" fill={linea} fontWeight="bold" textAnchor="middle">Ancho total sello: {fmtMm(selloAncho)} mm</text>
    </svg>
  );
}

// ── Bloques de layout locales (encabezado, paneles, firmas) — propios de
// esta ficha; no se tocan los componentes compartidos de FichaVisualKit. ───
function Panel({ title, children }) {
  return (
    <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: "8px", overflow: "hidden" }}>
      <div style={{ background: "#1a3f8f", color: "#fff", fontSize: "11px", fontWeight: "bold", letterSpacing: "0.4px", padding: "7px 12px", textTransform: "uppercase" }}>
        {title}
      </div>
      <div style={{ padding: "12px" }}>{children}</div>
    </div>
  );
}

function InfoBadge({ icon, label, value }) {
  return (
    <div style={{ border: "1px solid #e2e8f0", borderRadius: "8px", padding: "6px 12px", display: "flex", alignItems: "center", gap: "8px" }}>
      {icon && <span style={{ color: "#1a3f8f", fontSize: "14px" }}>{icon}</span>}
      <div>
        <div style={{ fontSize: "8.5px", color: "#64748b", fontWeight: "bold", textTransform: "uppercase", letterSpacing: "0.5px" }}>{label}</div>
        <div style={{ fontSize: "12.5px", color: "#1a1a2e", fontWeight: "bold" }}>{value}</div>
      </div>
    </div>
  );
}

function FirmaBox({ rol }) {
  return (
    <div style={{ border: "1px solid #e2e8f0", borderRadius: "8px", padding: "10px 14px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "12px" }}>
        <FaUserCircle style={{ color: "#94a3b8" }} />
        <span style={{ fontSize: "10px", fontWeight: "bold", textTransform: "uppercase", letterSpacing: "0.5px", color: "#334155" }}>{rol}</span>
      </div>
      <div style={{ fontSize: "10px", color: "#64748b", marginBottom: "16px", borderBottom: "1px solid #cbd5e1", paddingBottom: "3px" }}>Nombre:</div>
      <div style={{ fontSize: "10px", color: "#64748b", borderBottom: "1px solid #cbd5e1", paddingBottom: "3px" }}>Fecha:</div>
    </div>
  );
}

// ── Componente principal ───────────────────────────────────────────────────────
export default function FichaImpresionSello({ ficha, numero, onClose }) {
  if (!ficha) return null;

  const f   = ficha;
  const med = f.medidas      || {};
  const mp  = f.materiaPrima || {};
  const cantidad = Number(f.cantidad) || 1;

  // Materia prima: filas de la tabla
  const insumos = [
    { label: "Lona 750K",              unit: "m²", cu: fmtM2(mp.lonaM2),           tot: fmtM2((mp.lonaM2 || 0) * cantidad),            formula: "Suma áreas todos los componentes / 1 000 000" },
    { label: "Espuma postes",          unit: "mm", cu: fmtN(mp.espumaPostesMm),    tot: fmtN((mp.espumaPostesMm || 0) * cantidad),     formula: "2 × selloAlto" },
    ...(f.llevaTravesano ? [{ label: "Espuma travesaño", unit: "mm", cu: fmtN(mp.espumaTravesanoMm), tot: fmtN((mp.espumaTravesanoMm || 0) * cantidad), formula: "travesanoAncho" }] : []),
    ...(f.materialBase === "MADERA" ? [{ label: "Madera postes",  unit: "mm", cu: fmtN(mp.maderaPostesMm), tot: fmtN((mp.maderaPostesMm || 0) * cantidad), formula: "2 × selloAlto" }] : []),
    ...(f.materialBase === "LAMINA"  ? [{ label: "Lámina postes", unit: "mm", cu: fmtN(mp.laminaPostesMm), tot: fmtN((mp.laminaPostesMm || 0) * cantidad), formula: "2 × selloAlto" }] : []),
    ...(f.llevaCortina ? [
      { label: "Cadena",               unit: "mm", cu: fmtN(mp.cadenaMm),  tot: fmtN((mp.cadenaMm || 0) * cantidad),  formula: "cortinaLargo (= anchoVano + 2·espSello + 20)" },
      { label: 'Tubo cuadrado 3/4"',   unit: "mm", cu: fmtN(mp.tuboMm),   tot: fmtN((mp.tuboMm || 0) * cantidad),   formula: "cortinaLargo" },
    ] : []),
    { label: "Ángulo L galvanizado",   unit: "und", cu: fmtN(mp.angulosUnd),  tot: fmtN((mp.angulosUnd || 0) * cantidad),  formula: "6 und/sello (fijo)" },
    { label: 'Platina 2"×1/8"',        unit: "mm",  cu: fmtN(mp.platinaMm),   tot: fmtN((mp.platinaMm || 0) * cantidad),   formula: "6 platinas × 120 mm (fijo)" },
  ];

  const bandas = [f.bandaLateral, f.bandaSuperior].filter(Boolean).join(" / ");

  const tdStyle = { border: "1px solid #e2e8f0", padding: "5px 7px", fontSize: "11.5px", verticalAlign: "middle" };
  const thStyle = { ...tdStyle, background: "#1a3f8f", color: "white", fontWeight: "bold", textAlign: "center", fontSize: "11px" };

  return (
    <FichaImpresionShell
      productLabel="Sello de Andén"
      numero={numero}
      cliente={f.cliente}
      onClose={onClose}
      maxWidthClass="max-w-[1220px]"
      windowSize={{ width: 1300, height: 840 }}
    >
        <div style={{ color: "#1a1a2e", fontSize: "12.5px" }}>

          {/* ── Encabezado ── */}
          <div style={{
            background: "#fff", padding: "16px 24px", borderBottom: "3px solid #1a3f8f",
            display: "flex", alignItems: "center", justifyContent: "space-between", gap: "16px", flexWrap: "wrap",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
              <img src={logoPng} alt="Cold Chain Services" style={{ height: "52px", width: "auto", objectFit: "contain" }} />
              <div style={{ borderLeft: "1px solid #e2e8f0", paddingLeft: "16px" }}>
                <div style={{ fontSize: "20px", fontWeight: "bold", color: "#1a3f8f", lineHeight: 1.15 }}>FICHA DE FABRICACIÓN</div>
                <div style={{ fontSize: "20px", fontWeight: "bold", color: "#1a3f8f", lineHeight: 1.15 }}>SELLOS DE ANDÉN</div>
              </div>
            </div>
            <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
              <InfoBadge icon={<FaUserTie />} label="Departamento:" value="Ingeniería" />
              <InfoBadge icon={<FaRegCalendarAlt />} label="Fecha:" value={fmtDate(new Date().toISOString())} />
              <InfoBadge label="Versión:" value="1.0" />
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: "9px", color: "#64748b", fontWeight: "bold", textTransform: "uppercase", letterSpacing: "1.5px" }}>N.° Ficha</div>
              <div style={{ background: "linear-gradient(135deg, #1a3f8f 0%, #0f6cbf 100%)", color: "#fff", fontSize: "22px", fontWeight: "bold", padding: "6px 18px", borderRadius: "8px", marginTop: "4px" }}>
                #{numero ?? "—"}
              </div>
            </div>
          </div>

          {/* ── Información general / Medidas del vano / Opciones y acabados (3 columnas) ── */}
          <div style={{
            display: "grid", gridTemplateColumns: "0.8fr 1.35fr 0.8fr", gap: "14px",
            padding: "14px 22px", background: "#f8fafc", borderBottom: "2px solid #e2e8f0",
          }}>

            {/* Columna izquierda — información general + medidas de fabricación */}
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <Panel title="Información General">
                <div style={{ fontSize: "9.5px", color: "#64748b", fontWeight: "bold", textTransform: "uppercase", letterSpacing: "0.5px" }}>Cliente:</div>
                <div style={{ fontSize: "19px", fontWeight: "bold", color: "#1a3f8f", marginBottom: "10px" }}>{f.cliente || "—"}</div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "8px" }}>
                  <InfoChip label="Fecha orden"   value={fmtDate(f.fechaOrden)} />
                  <InfoChip label="Fecha entrega" value={fmtDate(f.fechaEntrega)} highlight={!!f.fechaEntrega} />
                  <InfoChip label="Cantidad"      value={`${f.cantidad} sellos`} />
                  <InfoChip label="Referencia / Notas" value="—" />
                </div>
              </Panel>

              <Panel title="Medidas de Fabricación (mm)">
                <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "8px" }}>
                  <MedidaCard label="Sello principal"  ancho={med.selloAncho}        alto={med.selloAlto}         color="#1a3f8f" />
                  <MedidaCard label="Espuma postes"    ancho={med.espumaPostesAncho} alto={med.espumaPostesAlto}  color="#0f6cbf" />
                  <MedidaCard label="Tapa superior"    ancho={med.tapaSuperiorAncho} alto={med.tapaSuperiorLargo} color="#0891b2" dimLabels={["Ancho", "Largo"]} />
                  <MedidaCard label="Tapa inferior"    ancho={med.tapaInferiorAncho} alto={med.tapaInferiorLargo} color="#0d9488" dimLabels={["Ancho", "Largo"]} />
                  <MedidaCard label="Forros / chaleco" ancho={med.forroAncho}        alto={med.forroLargo}        color="#7c3aed" dimLabels={["Ancho", "Largo"]} />
                  {f.llevaCortina && (
                    <MedidaCard label="Cortina" ancho={med.cortinaAncho} alto={med.cortinaLargoLona} color="#059669" dimLabels={["Largo", "Ancho rollo"]} />
                  )}
                  {f.llevaTravesano && (
                    <MedidaCard label="Travesaño" ancho={med.travesanoAncho} alto={med.travesanoLargoLona} color="#d97706" dimLabels={["Largo", "Largo lona"]} />
                  )}
                </div>
              </Panel>
            </div>

            {/* Columna central — medida del vano + diagrama */}
            <Panel title="Medidas del Vano (mm)">
              <div style={{ display: "flex", alignItems: "baseline", justifyContent: "center", gap: "16px", marginBottom: "6px" }}>
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: "34px", fontWeight: "bold", color: "#1a3f8f", fontFamily: "monospace", lineHeight: 1 }}>{fmtMm(f.anchoVano)}</div>
                  <div style={{ fontSize: "9.5px", color: "#64748b", fontWeight: "bold", textTransform: "uppercase", letterSpacing: "0.5px" }}>Ancho</div>
                </div>
                <div style={{ fontSize: "22px", color: "#94a3b8", fontWeight: "300" }}>×</div>
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: "34px", fontWeight: "bold", color: "#1a3f8f", fontFamily: "monospace", lineHeight: 1 }}>{fmtMm(f.altoVano)}</div>
                  <div style={{ fontSize: "9.5px", color: "#64748b", fontWeight: "bold", textTransform: "uppercase", letterSpacing: "0.5px" }}>Alto</div>
                </div>
              </div>
              <DiagramaSelloFrente
                anchoVano={f.anchoVano}
                altoVano={f.altoVano}
                selloAncho={med.selloAncho}
                selloAlto={med.selloAlto}
                espesorSello={f.espesorSello}
                espesorPoste={f.espesorPoste}
                despliegueCortina={f.despliegueCortina || 800}
              />
            </Panel>

            {/* Columna derecha — opciones y acabados */}
            <Panel title="Opciones y Acabados">
              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                <AcabadoCard label="Material base"   value={f.materialBase || "MADERA"} color="#1a3f8f" active />
                <AcabadoCard label="Cortina"          value={f.llevaCortina ? `SÍ · ${fmtMm(f.despliegueCortina)} mm` : "NO"} color="#059669" active={!!f.llevaCortina} />
                <AcabadoCard label="Travesaño"        value={f.llevaTravesano ? "SÍ" : "NO"} color="#d97706" active={!!f.llevaTravesano} />
                <AcabadoCard label="Factura"          value={f.fact || "SI"} color="#16a34a" active={f.fact === "SI"} />
                <AcabadoCard label="Sello abrigo"     value={f.selloAbrigo || "NO"} color="#7c3aed" active={f.selloAbrigo === "SI"} />
                <AcabadoCard label="Forma de cuña"    value={f.formaCuna || "NO"}   color="#be123c" active={f.formaCuna === "SI"} />
                <AcabadoCard label="Espesores S/P/T"  value={`${fmtMm(f.espesorSello)}/${fmtMm(f.espesorPoste)}/${fmtMm(f.espesorTravesano)}`} color="#0891b2" active />
                <AcabadoCard label="Bandas"           value={bandas || "—"} color="#334155" active={!!bandas} />
              </div>
            </Panel>
          </div>

          {/* ── Consumo de materia prima ── */}
          <div style={{ padding: "14px 22px 8px" }}>
            <Panel title="Consumo de Materia Prima (por sello)">
              <div style={{ border: "1px solid #e2e8f0", borderRadius: "8px", overflow: "hidden", margin: "-12px" }}>
                <table style={{ borderCollapse: "collapse", width: "100%" }}>
                  <thead>
                    <tr>
                      {["INSUMO", "UNIDAD", "FÓRMULA (REFERENCIA)", "POR SELLO", `TOTAL × ${cantidad}`].map((h) => (
                        <th key={h} style={{
                          ...thStyle,
                          textAlign: h === "INSUMO" || h.startsWith("FÓRMULA") ? "left" : "center",
                        }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {insumos.map(({ label, unit, cu, tot, formula }, i) => (
                      <tr key={label} style={{ background: i % 2 === 0 ? "white" : "#f8fafc" }}>
                        <td style={{ ...tdStyle, fontWeight: "600" }}>{label}</td>
                        <td style={{ ...tdStyle, textAlign: "center", color: "#475569" }}>{unit}</td>
                        <td style={{ ...tdStyle, color: "#475569", fontSize: "10px" }}>{formula}</td>
                        <td style={{ ...tdStyle, textAlign: "center", fontFamily: "monospace", fontWeight: "bold" }}>{cu}</td>
                        <td style={{ ...tdStyle, textAlign: "center", fontFamily: "monospace", fontWeight: "bold", color: "#1d4ed8" }}>{tot}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Panel>
          </div>

          {/* ── Firmas + Observaciones ── */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1.4fr", gap: "14px", padding: "4px 22px 14px" }}>
            <FirmaBox rol="Elaboró" />
            <FirmaBox rol="Revisó" />
            <FirmaBox rol="Aprobó" />
            <div style={{ border: "1px solid #e2e8f0", borderRadius: "8px", padding: "10px 14px" }}>
              <div style={{ fontSize: "10px", fontWeight: "bold", textTransform: "uppercase", letterSpacing: "0.5px", color: "#334155", marginBottom: "10px" }}>Observaciones</div>
              <div style={{ borderBottom: "1px solid #cbd5e1", height: "16px" }} />
              <div style={{ borderBottom: "1px solid #cbd5e1", height: "16px" }} />
            </div>
          </div>

          <FichaFooter
            texto="COLD CHAIN SERVICES S.A.S. — DEPARTAMENTO DE INGENIERÍA"
            numero={numero}
            fecha={fmtDate(new Date().toISOString())}
          />
        </div>
    </FichaImpresionShell>
  );
}
