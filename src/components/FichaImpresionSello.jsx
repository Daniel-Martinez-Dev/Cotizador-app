import React from "react";
import FichaImpresionShell from "./fichas/FichaImpresionShell";
import { fmtMm, fmtM2, fmtN, fmtDate } from "../utils/fichaFormat";
import logoPng from "../assets/imagenes/logo.png";
import { MedidaCard, InfoChip, AcabadoCard, SectionTitle, MedidaHero, Membrete, Firmas, FichaFooter } from "./fichas/FichaVisualKit";

// ── Diagrama SVG del SELLO (vista frontal isométrica: dintel + 2 postes) ──────
// Dibujo técnico en blanco y negro (solo trazo, sin relleno de color), siguiendo
// la proporción del plano de referencia: postes esbeltos y vano amplio, marco en
// forma de "U" invertida con una franja de acabado marcada en cada poste.
function DiagramaSelloFrente({ anchoVano, altoVano, selloAncho, selloAlto, espesorSello, despliegueCortina }) {
  const W = 420, H = 350;
  const postD   = 20;   // profundidad (perspectiva)
  const postW   = 34;   // ancho cara frontal de cada poste
  const lintelH = 42;   // alto cara frontal del dintel
  const vanoW   = 210;  // ancho de la luz (vano) en el dibujo
  const postH   = 190;  // alto cara frontal de cada poste
  const ox = 70, oy = 40;

  const frontLeftX  = ox;
  const frontRightX = ox + postW * 2 + vanoW;
  const totalW = postW * 2 + vanoW;
  const lintelTopY    = oy;
  const lintelBottomY = oy + lintelH;
  const postBottomY   = lintelBottomY + postH;
  const cx = (frontLeftX + frontRightX) / 2;

  const linea = "#111827";       // trazo de objeto (negro)
  const dim   = "#374151";       // trazo/texto de cota (gris oscuro)
  const caraFrontal = "#ffffff";
  const caraSuperior = "#f8fafc";
  const caraLateral  = "#e5e7eb";
  const stripeW = 7, stripeInset = 7;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ display: "block", width: "100%", height: "auto", maxWidth: W }}>
      <defs>
        <marker id="arrSF" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto">
          <path d="M0,0 L6,3 L0,6 Z" fill={dim} />
        </marker>
      </defs>

      {/* Dintel (viga superior) */}
      <polygon points={`${frontLeftX},${lintelTopY} ${frontRightX},${lintelTopY} ${frontRightX+postD},${lintelTopY-postD} ${frontLeftX+postD},${lintelTopY-postD}`} fill={caraSuperior} stroke={linea} strokeWidth="1.3" />
      <polygon points={`${frontRightX},${lintelTopY} ${frontRightX+postD},${lintelTopY-postD} ${frontRightX+postD},${lintelTopY-postD+lintelH} ${frontRightX},${lintelTopY+lintelH}`} fill={caraLateral} stroke={linea} strokeWidth="1.3" />
      <rect x={frontLeftX} y={lintelTopY} width={totalW} height={lintelH} fill={caraFrontal} stroke={linea} strokeWidth="1.3" />
      {/* Franjas de acabado del dintel, alineadas con cada poste */}
      <rect x={frontLeftX+postW-stripeW-stripeInset} y={lintelTopY+lintelH*0.5} width={stripeW} height={lintelH*0.42} fill="none" stroke={linea} strokeWidth="0.9" />
      <rect x={frontRightX-postW+stripeInset} y={lintelTopY+lintelH*0.5} width={stripeW} height={lintelH*0.42} fill="none" stroke={linea} strokeWidth="0.9" />

      {/* Poste izquierdo */}
      <rect x={frontLeftX} y={lintelBottomY} width={postW} height={postH} fill={caraFrontal} stroke={linea} strokeWidth="1.3" />
      <rect x={frontLeftX+postW-stripeW-stripeInset} y={lintelBottomY+5} width={stripeW} height={postH-10} fill="none" stroke={linea} strokeWidth="0.9" />

      {/* Poste derecho + cara lateral (borde exterior del conjunto) */}
      <polygon points={`${frontRightX},${lintelBottomY} ${frontRightX+postD},${lintelBottomY-postD} ${frontRightX+postD},${lintelBottomY-postD+postH} ${frontRightX},${lintelBottomY+postH}`} fill={caraLateral} stroke={linea} strokeWidth="1.3" />
      <rect x={frontRightX-postW} y={lintelBottomY} width={postW} height={postH} fill={caraFrontal} stroke={linea} strokeWidth="1.3" />
      <rect x={frontRightX-postW+stripeInset} y={lintelBottomY+5} width={stripeW} height={postH-10} fill="none" stroke={linea} strokeWidth="0.9" />

      {/* ── Cotas ── */}
      {/* Ancho vano (interno) */}
      <line x1={frontLeftX+postW} y1={postBottomY+14} x2={frontRightX-postW} y2={postBottomY+14} stroke={dim} strokeWidth="1" markerStart="url(#arrSF)" markerEnd="url(#arrSF)" />
      <text x={cx} y={postBottomY+25} fontSize="9" fill={dim} textAnchor="middle">ANCHO VANO: {fmtMm(anchoVano)} mm</text>

      {/* Ancho total sello (externo) */}
      <line x1={frontLeftX} y1={postBottomY+34} x2={frontRightX} y2={postBottomY+34} stroke={linea} strokeWidth="1" markerStart="url(#arrSF)" markerEnd="url(#arrSF)" />
      <text x={cx} y={postBottomY+45} fontSize="9" fill={linea} textAnchor="middle" fontWeight="bold">ANCHO TOTAL SELLO: {fmtMm(selloAncho)} mm</text>

      {/* Alto luz (dentro del vano) */}
      <line x1={frontLeftX+postW+vanoW*0.28} y1={lintelBottomY} x2={frontLeftX+postW+vanoW*0.28} y2={postBottomY} stroke={dim} strokeWidth="1" markerStart="url(#arrSF)" markerEnd="url(#arrSF)" />
      <text x={frontLeftX+postW+vanoW*0.28-9} y={(lintelBottomY+postBottomY)/2}
        fontSize="9" fill={dim} textAnchor="middle"
        transform={`rotate(-90,${frontLeftX+postW+vanoW*0.28-9},${(lintelBottomY+postBottomY)/2})`}>
        ALTO LUZ: {fmtMm(altoVano)} mm
      </text>

      {/* Alto total sello (externo, derecha) */}
      <line x1={frontRightX+postD+14} y1={lintelTopY-postD} x2={frontRightX+postD+14} y2={postBottomY} stroke={linea} strokeWidth="1" markerStart="url(#arrSF)" markerEnd="url(#arrSF)" />
      <text x={frontRightX+postD+26} y={(lintelTopY-postD+postBottomY)/2}
        fontSize="9" fill={linea} textAnchor="middle" fontWeight="bold"
        transform={`rotate(90,${frontRightX+postD+26},${(lintelTopY-postD+postBottomY)/2})`}>
        ALTO TOTAL SELLO: {fmtMm(selloAlto)} mm
      </text>

      {/* Nota inferior: espesor / despliegue / material */}
      <text x={cx} y={H-10} fontSize="8" fill={dim} textAnchor="middle">
        Espesor postes: {fmtMm(espesorSello)} mm · Despliegue cortina: {fmtMm(despliegueCortina)} mm · Lona 750gr
      </text>
    </svg>
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

  const tdStyle = { border: "1px solid #e2e8f0", padding: "5px 7px", fontSize: "10px", verticalAlign: "middle" };
  const thStyle = { ...tdStyle, background: "#1a3f8f", color: "white", fontWeight: "bold", textAlign: "center" };

  return (
    <FichaImpresionShell
      productLabel="Sello de Andén"
      numero={numero}
      cliente={f.cliente}
      onClose={onClose}
      maxWidthClass="max-w-5xl"
      windowSize={{ width: 1120, height: 980 }}
    >
        <div style={{ color: "#1a1a2e", fontSize: "11px" }}>
          <Membrete
            logoSrc={logoPng}
            tituloFicha="Ficha de Fabricación — Sello de Andén"
            numero={numero}
            numeroLabel="N.° de ficha"
            subtitulo="Todas las dimensiones en milímetros y lona 750K"
          />

          {/* ── Información general ── */}
          <div style={{ padding: "10px 20px", background: "#f8fafc", borderBottom: "2px solid #e2e8f0" }}>

            {/* Medida del vano — máxima prioridad visual, es la medida de entrada de todo el cálculo */}
            <MedidaHero label="Medida del Vano" ancho={f.anchoVano} alto={f.altoVano} />

            <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "8px", marginBottom: "6px" }}>
              <div style={{ background: "white", border: "1px solid #e2e8f0", borderRadius: "8px", padding: "8px 10px" }}>
                <div style={{ fontSize: "8px", color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "3px" }}>Cliente</div>
                <div style={{ fontSize: "16px", fontWeight: "bold", color: "#1a3f8f" }}>{f.cliente || "—"}</div>
              </div>
              <div style={{ background: "white", border: "1px solid #e2e8f0", borderRadius: "8px", padding: "8px 10px", textAlign: "center" }}>
                <div style={{ fontSize: "8px", color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "3px" }}>Cantidad</div>
                <div style={{ fontSize: "22px", fontWeight: "bold", color: "#1a3f8f", lineHeight: 1 }}>{f.cantidad}</div>
                <div style={{ fontSize: "9px", color: "#94a3b8", marginTop: "1px" }}>sellos</div>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "6px" }}>
              <InfoChip label="Fecha orden"   value={fmtDate(f.fechaOrden)} />
              <InfoChip label="Fecha entrega" value={fmtDate(f.fechaEntrega)} highlight={!!f.fechaEntrega} />
            </div>
          </div>

          {/* ── Medidas de fabricación ── */}
          <div style={{ padding: "10px 20px" }}>
            <SectionTitle>Medidas de Fabricación</SectionTitle>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "8px" }}>
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
          </div>

          {/* ── Diagramas + Opciones y Acabados, lado a lado para aprovechar el
                espacio que los planos dejan libre a los costados. ── */}
          <div style={{ padding: "0 20px 10px", display: "flex", gap: "10px", alignItems: "stretch", flexWrap: "wrap" }}>

            <div style={{ flex: "2 1 320px", border: "1px solid #ccc", borderRadius: "8px", padding: "4px", background: "#fafafa", display: "flex", justifyContent: "center" }}>
              <DiagramaSelloFrente
                anchoVano={f.anchoVano}
                altoVano={f.altoVano}
                selloAncho={med.selloAncho}
                selloAlto={med.selloAlto}
                espesorSello={f.espesorSello}
                despliegueCortina={f.despliegueCortina || 800}
              />
            </div>

            <div style={{ flex: "1 1 220px", background: "#eff6ff", border: "1px solid #dbeafe", borderRadius: "8px", padding: "9px 10px" }}>
              <SectionTitle size="10px">Opciones y Acabados</SectionTitle>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "6px" }}>
                <AcabadoCard label="Material base"   value={f.materialBase || "MADERA"} color="#1a3f8f" active />
                <AcabadoCard label="Cortina"          value={f.llevaCortina ? `SÍ · ${fmtMm(f.despliegueCortina)} mm` : "NO"} color="#059669" active={!!f.llevaCortina} />
                <AcabadoCard label="Travesaño"        value={f.llevaTravesano ? "SÍ" : "NO"} color="#d97706" active={!!f.llevaTravesano} />
                <AcabadoCard label="Factura"          value={f.fact || "SI"} color="#16a34a" active={f.fact === "SI"} />
                <AcabadoCard label="Sello abrigo"     value={f.selloAbrigo || "NO"} color="#7c3aed" active={f.selloAbrigo === "SI"} />
                <AcabadoCard label="Forma de cuña"    value={f.formaCuna || "NO"}   color="#be123c" active={f.formaCuna === "SI"} />
                <AcabadoCard label="Espesores S/P/T"  value={`${fmtMm(f.espesorSello)}/${fmtMm(f.espesorPoste)}/${fmtMm(f.espesorTravesano)}`} color="#0891b2" active />
                <AcabadoCard label="Bandas"           value={bandas || "—"} color="#334155" active={!!bandas} />
              </div>
            </div>
          </div>

          {/* ── Consumo de materia prima ── */}
          <div style={{ padding: "10px 20px 8px" }}>
            <SectionTitle>Consumo de Materia Prima (por sello)</SectionTitle>
            <div style={{ border: "1px solid #e2e8f0", borderRadius: "8px", overflow: "hidden" }}>
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
                      <td style={{ ...tdStyle, textAlign: "center", color: "#64748b" }}>{unit}</td>
                      <td style={{ ...tdStyle, color: "#64748b", fontSize: "9px" }}>{formula}</td>
                      <td style={{ ...tdStyle, textAlign: "center", fontFamily: "monospace", fontWeight: "bold" }}>{cu}</td>
                      <td style={{ ...tdStyle, textAlign: "center", fontFamily: "monospace", fontWeight: "bold", color: "#1d4ed8" }}>{tot}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <Firmas />
          <FichaFooter
            texto="COLD CHAIN SERVICES S.A.S. — FICHA DE FABRICACIÓN SELLOS DE ANDÉN"
            numero={numero}
            fecha={fmtDate(new Date().toISOString())}
          />
        </div>
    </FichaImpresionShell>
  );
}
