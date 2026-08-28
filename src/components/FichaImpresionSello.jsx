import React from "react";
import FichaImpresionShell from "./fichas/FichaImpresionShell";
import { fmtMm, fmtM2, fmtN, fmtDate } from "../utils/fichaFormat";
import logoPng from "../assets/imagenes/logo.png";
import { FaUserTie, FaRegCalendarAlt } from "react-icons/fa";
import { MedidaCard, InfoChip, AcabadoCard, Firmas, FichaFooter } from "./fichas/FichaVisualKit";
import { codigoFichaOFallback } from "../utils/codigoFicha";
import planoSelloAnden from "../assets/imagenes/SelloDeAnden/Plano.png";
import { nombreClienteImpreso } from "../utils/clienteVinculo";

// ─── Plano técnico (imagen de referencia + medidas superpuestas) ─────────────
// La imagen fuente (Plano.png) trae cada cota como "Etiqueta =" sin el valor
// impreso — cada "=" quedó en blanco a propósito para poder superponer aquí
// las medidas reales del pedido (mismo patrón que usa Abrigo Retráctil con su
// Plano.png). Coordenadas (px sobre 1231×716, la resolución del archivo
// fuente) medidas a mano sobre cada "=" del plano; si se reemplaza Plano.png
// por otro archivo con otro layout, estas posiciones hay que recalibrarlas.
const PLANO_ANCHO_PX = 1231;
const PLANO_ALTO_PX  = 716;
const pct = (px, total) => `${((px / total) * 100).toFixed(2)}%`;

function PlanoTecnico({ anchoVano, altoVano, selloAncho, selloAlto, espesorSello, espesorPoste, despliegueCortina }) {
  const overlays = [
    { x: 120, y: 175, value: `${fmtMm(despliegueCortina)} mm`, rotate: 0 },   // Despliegue cortina
    { x: 308, y: 290, value: `${fmtMm(altoVano)} mm`,          rotate: -90 }, // Alto total Luz
    { x: 815, y: 232, value: `${fmtMm(selloAlto)} mm`,         rotate: -90 }, // Alto total sello
    { x: 435, y: 586, value: `${fmtMm(espesorPoste)} mm`,      rotate: 0 },   // Espesor
    { x: 148, y: 633, value: `${fmtMm(espesorSello)} mm`,      rotate: 0 },   // Ancho poste
    { x: 415, y: 661, value: `${fmtMm(anchoVano)} mm`,         rotate: 0 },   // Ancho Vano
    { x: 408, y: 701, value: `${fmtMm(selloAncho)} mm`,        rotate: 0 },   // Ancho total sello
  ];

  return (
    <div style={{ textAlign: "center" }}>
      <div style={{ position: "relative", display: "inline-block", width: "520px", maxWidth: "100%" }}>
        <img
          src={planoSelloAnden}
          alt="Plano — Sello de Andén"
          style={{ display: "block", width: "100%", height: "auto" }}
        />
        {overlays.map(({ x, y, value, rotate }, i) => (
          <span key={i} style={{
            position: "absolute",
            top: pct(y, PLANO_ALTO_PX),
            left: pct(x, PLANO_ANCHO_PX),
            transform: `rotate(${rotate}deg)`,
            transformOrigin: "left center",
            fontSize: "11px", fontWeight: "bold", fontFamily: "monospace",
            color: "#000000", whiteSpace: "nowrap", lineHeight: 1,
            background: "#ffffff", padding: "1px 3px", borderRadius: "2px", border: "0.5px solid #000000",
          }}>
            {value}
          </span>
        ))}
      </div>
      <div style={{ fontSize: "9px", color: "#000000", marginTop: "5px" }}>
        Plano de referencia — medidas del pedido superpuestas
      </div>
    </div>
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
        <div style={{ fontSize: "8.5px", color: "#000000", fontWeight: "bold", textTransform: "uppercase", letterSpacing: "0.5px" }}>{label}</div>
        <div style={{ fontSize: "12.5px", color: "#000000", fontWeight: "bold" }}>{value}</div>
      </div>
    </div>
  );
}

// ── Componente principal ───────────────────────────────────────────────────────
export default function FichaImpresionSello({ ficha, numero, onClose }) {
  if (!ficha) return null;

  const f   = ficha;
  const codigo = codigoFichaOFallback({ ...f, ordenProduccion: f.ordenProduccion ?? numero }, "sello");
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

  const tdStyle = { border: "1px solid #000000", padding: "5px 7px", fontSize: "11.5px", verticalAlign: "middle" };
  const thStyle = { ...tdStyle, background: "#1a3f8f", color: "white", fontWeight: "bold", textAlign: "center", fontSize: "11px" };

  return (
    <FichaImpresionShell
      productLabel="Sello de Andén"
      numero={codigo}
      cliente={nombreClienteImpreso(f)}
      onClose={onClose}
      maxWidthClass="max-w-[1220px]"
      windowSize={{ width: 1300, height: 840 }}
    >
        <div style={{ color: "#000000", fontSize: "12.5px" }}>

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
              <div style={{ fontSize: "9px", color: "#000000", fontWeight: "bold", textTransform: "uppercase", letterSpacing: "1.5px" }}>N.° Ficha de producción</div>
              <div style={{ background: "linear-gradient(135deg, #1a3f8f 0%, #0b4a7d 100%)", color: "#fff", fontSize: "21px", fontWeight: "bold", fontFamily: "monospace", letterSpacing: "0.5px", whiteSpace: "nowrap", padding: "7px 16px", borderRadius: "8px", marginTop: "4px" }}>
                {codigo}
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
                <div style={{ fontSize: "9.5px", color: "#000000", fontWeight: "bold", textTransform: "uppercase", letterSpacing: "0.5px" }}>Cliente:</div>
                <div style={{ fontSize: "19px", fontWeight: "bold", color: "#1a3f8f", marginBottom: "10px" }}>{nombreClienteImpreso(f) || "—"}</div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "8px" }}>
                  <InfoChip label="Fecha orden"   value={fmtDate(f.fechaOrden)} />
                  <InfoChip label="Fecha entrega" value={fmtDate(f.fechaEntrega)} highlight={!!f.fechaEntrega} />
                  <InfoChip label="Cantidad"      value={`${f.cantidad} sellos`} />
                  <InfoChip label="Orden de compra" value={f.numeroOrdenCompra || "—"} highlight={!!f.numeroOrdenCompra} />
                </div>
              </Panel>

              <Panel title="Medidas de Fabricación (mm)">
                <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "8px" }}>
                  <MedidaCard label="Sello principal"  ancho={med.selloAncho}        alto={med.selloAlto}         color="#1a3f8f" />
                  <MedidaCard label="Espuma postes"    ancho={med.espumaPostesAncho} alto={med.espumaPostesAlto}  color="#0b4a7d" />
                  <MedidaCard label="Tapa superior"    ancho={med.tapaSuperiorAncho} alto={med.tapaSuperiorLargo} color="#155e75" dimLabels={["Ancho", "Largo"]} />
                  <MedidaCard label="Tapa inferior"    ancho={med.tapaInferiorAncho} alto={med.tapaInferiorLargo} color="#115e59" dimLabels={["Ancho", "Largo"]} />
                  <MedidaCard label="Forros / chaleco" ancho={med.forroAncho}        alto={med.forroLargo}        color="#5b21b6" dimLabels={["Ancho", "Largo"]} />
                  {f.llevaCortina && (
                    <MedidaCard label="Cortina" ancho={med.cortinaAncho} alto={med.cortinaLargoLona} color="#065f46" dimLabels={["Largo", "Ancho rollo"]} />
                  )}
                  {f.llevaTravesano && (
                    <MedidaCard label="Travesaño" ancho={med.travesanoAncho} alto={med.travesanoLargoLona} color="#92400e" dimLabels={["Largo", "Largo lona"]} />
                  )}
                </div>
              </Panel>
            </div>

            {/* Columna central — medida del vano + diagrama */}
            <Panel title="Medidas del Vano (mm)">
              <div style={{ display: "flex", alignItems: "baseline", justifyContent: "center", gap: "16px", marginBottom: "6px" }}>
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: "34px", fontWeight: "bold", color: "#1a3f8f", fontFamily: "monospace", lineHeight: 1 }}>{fmtMm(f.anchoVano)}</div>
                  <div style={{ fontSize: "9.5px", color: "#000000", fontWeight: "bold", textTransform: "uppercase", letterSpacing: "0.5px" }}>Ancho</div>
                </div>
                <div style={{ fontSize: "22px", color: "#000000", fontWeight: "300" }}>×</div>
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: "34px", fontWeight: "bold", color: "#1a3f8f", fontFamily: "monospace", lineHeight: 1 }}>{fmtMm(f.altoVano)}</div>
                  <div style={{ fontSize: "9.5px", color: "#000000", fontWeight: "bold", textTransform: "uppercase", letterSpacing: "0.5px" }}>Alto</div>
                </div>
              </div>
              <PlanoTecnico
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
                <AcabadoCard label="Cortina"          value={f.llevaCortina ? `SÍ · ${fmtMm(f.despliegueCortina)} mm` : "NO"} color="#065f46" active={!!f.llevaCortina} />
                <AcabadoCard label="Travesaño"        value={f.llevaTravesano ? "SÍ" : "NO"} color="#92400e" active={!!f.llevaTravesano} />
                <AcabadoCard label="Factura"          value={f.fact || "SI"} color="#166534" active={f.fact === "SI"} />
                <AcabadoCard label="Sello abrigo"     value={f.selloAbrigo || "NO"} color="#5b21b6" active={f.selloAbrigo === "SI"} />
                <AcabadoCard label="Forma de cuña"    value={f.formaCuna || "NO"}   color="#9f1239" active={f.formaCuna === "SI"} />
                <AcabadoCard label="Espesores S/P/T"  value={`${fmtMm(f.espesorSello)}/${fmtMm(f.espesorPoste)}/${fmtMm(f.espesorTravesano)}`} color="#155e75" active />
                <AcabadoCard label="Bandas"           value={bandas || "—"} color="#334155" active={!!bandas} />
              </div>
            </Panel>
          </div>

          {/* ── Consumo de materia prima ── */}
          <div style={{ padding: "14px 22px 8px" }}>
            <Panel title="Consumo de Materia Prima (por sello)">
              <div style={{ border: "1px solid #000000", borderRadius: "8px", overflow: "hidden", margin: "-12px" }}>
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
                        <td style={{ ...tdStyle, textAlign: "center", color: "#000000" }}>{unit}</td>
                        <td style={{ ...tdStyle, color: "#000000", fontSize: "10px" }}>{formula}</td>
                        <td style={{ ...tdStyle, textAlign: "center", fontFamily: "monospace", fontWeight: "bold" }}>{cu}</td>
                        <td style={{ ...tdStyle, textAlign: "center", fontFamily: "monospace", fontWeight: "bold", color: "#1e3a8a" }}>{tot}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Panel>
          </div>

          {/* ── Observaciones ── */}
          <div style={{ padding: "4px 22px 0" }}>
            <div style={{ border: "1px solid #e2e8f0", borderRadius: "8px", padding: "8px 14px" }}>
              <div style={{ fontSize: "10px", fontWeight: "bold", textTransform: "uppercase", letterSpacing: "0.5px", color: "#000000", marginBottom: "8px" }}>Observaciones</div>
              <div style={{ borderBottom: "1px solid #334155", height: "16px" }} />
              <div style={{ borderBottom: "1px solid #334155", height: "16px" }} />
            </div>
          </div>

          <Firmas ficha={ficha} padX="22px" />

          <FichaFooter
            texto="COLD CHAIN SERVICES S.A.S. — DEPARTAMENTO DE INGENIERÍA"
            numero={codigo}
            fecha={fmtDate(new Date().toISOString())}
          />
        </div>
    </FichaImpresionShell>
  );
}
