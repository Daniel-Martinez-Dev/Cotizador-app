import React from "react";
import FichaImpresionShell from "./fichas/FichaImpresionShell";
import { fmtMm, fmtCm as fmt1, fmtDate } from "../utils/fichaFormat";
import logoPng from "../assets/imagenes/logo.png";

// Convierte un valor en milímetros a metros (2 decimales) — distinto de fmtM2,
// que formatea un área en m² ya calculada.
const toM = (mm) => (mm == null ? "—" : (Math.round(Number(mm) / 10) / 100).toFixed(2));

// ── Sub-componentes de diseño (todos con inline-styles para imprimir) ──────────

function MedidaCard({ label, ancho, alto, color }) {
  return (
    <div style={{ background: "white", border: `2px solid ${color}`, borderRadius: "8px", overflow: "hidden" }}>
      <div style={{
        background: color, color: "white", fontSize: "9px", fontWeight: "bold",
        textAlign: "center", padding: "4px 7px", textTransform: "uppercase", letterSpacing: "0.5px",
      }}>
        {label}
      </div>
      <div style={{ padding: "7px 6px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "3px" }}>
        {[["Ancho", ancho], ["Alto", alto]].map(([dim, val]) => (
          <div key={dim} style={{ textAlign: "center" }}>
            <div style={{ fontSize: "8px", color: "#94a3b8", textTransform: "uppercase", marginBottom: "1px" }}>{dim}</div>
            <div style={{ fontSize: "15px", fontWeight: "bold", fontFamily: "monospace", color, lineHeight: 1 }}>{fmtMm(val)}</div>
            <div style={{ fontSize: "8px", color: "#94a3b8", marginTop: "1px" }}>mm</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function InfoChip({ label, value, highlight }) {
  return (
    <div style={{
      background: highlight ? "#eff6ff" : "white",
      border: `1px solid ${highlight ? "#bfdbfe" : "#e2e8f0"}`,
      borderRadius: "6px", padding: "6px 8px",
    }}>
      <div style={{ fontSize: "8px", color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "2px" }}>{label}</div>
      <div style={{ fontSize: "11px", fontWeight: "600", color: highlight ? "#1d4ed8" : "#374151" }}>{value}</div>
    </div>
  );
}

// Tarjeta de acabado — mismo lenguaje visual que MedidaCard, para que
// "Opciones y Acabados" tenga el mismo peso visual que "Medidas de Corte".
function AcabadoCard({ label, value, color, active }) {
  return (
    <div style={{ background: "white", border: `2px solid ${active ? color : "#e2e8f0"}`, borderRadius: "8px", overflow: "hidden" }}>
      <div style={{
        background: active ? color : "#cbd5e1", color: "white", fontSize: "10px", fontWeight: "bold",
        textAlign: "center", padding: "4px 7px", textTransform: "uppercase", letterSpacing: "0.5px",
      }}>
        {label}
      </div>
      <div style={{ padding: "8px 6px", textAlign: "center" }}>
        <div style={{ fontSize: "14px", fontWeight: "bold", color: active ? color : "#94a3b8", lineHeight: 1.2 }}>{value}</div>
      </div>
    </div>
  );
}

function SectionTitle({ children, size = "10px" }) {
  return (
    <div style={{
      fontSize: size, fontWeight: "bold", textTransform: "uppercase",
      letterSpacing: "0.8px", color: "#475569",
      borderBottom: "2px solid #e2e8f0", paddingBottom: "5px", marginBottom: "8px",
    }}>
      {children}
    </div>
  );
}

// ── Plano técnico (SVG 2D vista frontal) ──────────────────────────────────────
// La división se arma con dos paneles del mismo tamaño lado a lado (ver
// calcularMedidas en utils/divisionTermica.js: anchoPanel = (anchoVehiculo+40)/2),
// cada uno con un núcleo de icopor más pequeño que el panel que lo contiene.
function PlanoTecnicoDivision({ anchoVehiculo, altoVehiculo, panel, icopor }) {
  const W = 420, H = 190;
  const margin = { top: 28, right: 58, bottom: 38, left: 58 };
  const drawW = W - margin.left - margin.right;
  const drawH = H - margin.top - margin.bottom;

  const scale = Math.min(drawW / anchoVehiculo, drawH / altoVehiculo) * 0.9;
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
  const nucleo = "#0891b2";
  const bg = "#f0f4ff";

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
      <rect x={x0 + insetX} y={y0 + insetY} width={Math.max(1, pw - insetX * 2)} height={Math.max(1, fh - insetY * 2)} fill="white" stroke={nucleo} strokeWidth="1.2" strokeDasharray="4,2" />

      {/* Panel derecho + núcleo de icopor */}
      <rect x={x0 + pw} y={y0} width={pw} height={fh} fill={bg} stroke={marco} strokeWidth="2" />
      <rect x={x0 + pw + insetX} y={y0 + insetY} width={Math.max(1, pw - insetX * 2)} height={Math.max(1, fh - insetY * 2)} fill="white" stroke={nucleo} strokeWidth="1.2" strokeDasharray="4,2" />

      {/* Línea de unión central */}
      <line x1={x0 + pw} y1={y0} x2={x0 + pw} y2={y0 + fh} stroke={marco} strokeWidth="1" strokeDasharray="2,2" />

      {/* Etiquetas de panel */}
      <text x={x0 + pw / 2} y={y0 - 6} fontSize="7" fill={marco} textAnchor="middle" fontWeight="bold">IZQ.</text>
      <text x={x0 + pw + pw / 2} y={y0 - 6} fontSize="7" fill={marco} textAnchor="middle" fontWeight="bold">DER.</text>
      <text x={x0 + pw / 2} y={y0 + fh / 2 + 3} fontSize="6" fill={nucleo} textAnchor="middle">ICOPOR</text>
      <text x={x0 + pw + pw / 2} y={y0 + fh / 2 + 3} fontSize="6" fill={nucleo} textAnchor="middle">ICOPOR</text>

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
          {/* ── Header tipo membrete ── */}
          <div style={{
            background: "white", padding: "10px 20px 8px", borderBottom: "3px solid #1a3f8f",
            display: "flex", justifyContent: "space-between", alignItems: "center", gap: "14px",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "12px", minWidth: 0 }}>
              <img src={logoPng} alt="Cold Chain Services" style={{ height: "36px", width: "auto", objectFit: "contain", flexShrink: 0 }} />
              <div style={{ borderLeft: "1px solid #e2e8f0", paddingLeft: "12px" }}>
                <div style={{ fontSize: "8px", color: "#94a3b8", textTransform: "uppercase", letterSpacing: "1px", fontWeight: "bold" }}>
                  Departamento de Ingeniería
                </div>
                <div style={{ fontSize: "13px", color: "#1a3f8f", fontWeight: "bold", marginTop: "1px" }}>
                  Ficha de Fabricación — División Térmica
                </div>
                <div style={{ fontSize: "8px", color: "#94a3b8", marginTop: "1px" }}>
                  Todas las dimensiones en milímetros
                </div>
              </div>
            </div>
            <div style={{ textAlign: "right", flexShrink: 0 }}>
              <div style={{ fontSize: "8px", color: "#94a3b8", textTransform: "uppercase", letterSpacing: "1.5px", fontWeight: "bold" }}>
                N.° orden de producción
              </div>
              <div style={{
                background: "linear-gradient(135deg, #1a3f8f 0%, #0f6cbf 100%)",
                color: "white", fontSize: "22px", fontWeight: "bold", lineHeight: 1,
                padding: "5px 14px", borderRadius: "8px", letterSpacing: "-0.5px", marginTop: "3px",
              }}>
                #{f.ordenProduccion ?? numero ?? "—"}
              </div>
            </div>
          </div>

          {/* ── Información general ── */}
          <div style={{ padding: "10px 20px", background: "#f8fafc", borderBottom: "2px solid #e2e8f0" }}>

            {/* Medida del vehículo — máxima prioridad visual, es la medida de entrada de todo el cálculo */}
            <div style={{
              background: "linear-gradient(135deg, #0f172a 0%, #1e3a5f 100%)",
              borderRadius: "8px", padding: "9px 16px", marginBottom: "8px",
              display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "8px",
            }}>
              <div style={{ color: "rgba(255,255,255,0.7)", fontSize: "10px", fontWeight: "bold", textTransform: "uppercase", letterSpacing: "1px" }}>
                Medida del Vehículo
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "18px" }}>
                <div style={{ textAlign: "center" }}>
                  <div style={{ color: "white", fontSize: "30px", fontWeight: "bold", fontFamily: "monospace", lineHeight: 1 }}>{fmtMm(f.anchoVehiculo)}</div>
                  <div style={{ color: "rgba(255,255,255,0.55)", fontSize: "8px", textTransform: "uppercase", letterSpacing: "0.5px" }}>Ancho mm</div>
                </div>
                <div style={{ color: "rgba(255,255,255,0.35)", fontSize: "22px", fontWeight: "300" }}>×</div>
                <div style={{ textAlign: "center" }}>
                  <div style={{ color: "white", fontSize: "30px", fontWeight: "bold", fontFamily: "monospace", lineHeight: 1 }}>{fmtMm(f.altoVehiculo)}</div>
                  <div style={{ color: "rgba(255,255,255,0.55)", fontSize: "8px", textTransform: "uppercase", letterSpacing: "0.5px" }}>Alto mm</div>
                </div>
                <div style={{ textAlign: "center", borderLeft: "1px solid rgba(255,255,255,0.2)", paddingLeft: "16px" }}>
                  <div style={{ color: "#7dd3fc", fontSize: "14px", fontWeight: "bold", fontFamily: "monospace" }}>
                    {toM(f.anchoVehiculo)} × {toM(f.altoVehiculo)} m
                  </div>
                </div>
              </div>
            </div>

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
            {med.panel && med.icopor && (
              <div style={{ border: "1px solid #ccc", borderRadius: "8px", padding: "4px", background: "#fafafa", display: "flex", justifyContent: "center" }}>
                <PlanoTecnicoDivision
                  anchoVehiculo={f.anchoVehiculo}
                  altoVehiculo={f.altoVehiculo}
                  panel={med.panel}
                  icopor={med.icopor}
                />
              </div>
            )}
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

          {/* ── Opciones y acabados — misma jerarquía visual que Medidas de Corte ── */}
          <div style={{ padding: "10px 20px 12px", background: "#eff6ff", borderTop: "2px solid #dbeafe", borderBottom: "2px solid #dbeafe" }}>
            <SectionTitle size="11px">Opciones y Acabados</SectionTitle>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "8px" }}>
              <AcabadoCard label="Logo"     value={f.logo || "NO"} color="#1a3f8f" active={f.logo !== "NO" && !!f.logo} />
              <AcabadoCard label="Platinas" value={f.platinas === "SI" ? `SI · ${f.alturaPlatinas ? fmtMm(f.alturaPlatinas) + " mm" : "—"}` : "NO"} color="#d97706" active={f.platinas === "SI"} />
              <AcabadoCard label="Espuma"   value="8 CAB / 4+4 LAT" color="#0d9488" active />
              <AcabadoCard label="Factura"  value={f.factura || "NO"} color="#16a34a" active={f.factura === "SI"} />
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

          {/* ── Firmas ── */}
          <div style={{ padding: "4px 20px 12px" }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "16px" }}>
              {["Elaboró", "Revisó", "Aprobó"].map((rol) => (
                <div key={rol} style={{ textAlign: "center" }}>
                  <div style={{ borderTop: "1px solid #94a3b8", marginTop: "20px", paddingTop: "3px" }}>
                    <span style={{ fontSize: "8px", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.5px", fontWeight: "bold" }}>
                      {rol}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ── Footer ── */}
          <div style={{
            background: "#f1f5f9", borderTop: "2px solid #e2e8f0",
            padding: "6px 20px", display: "flex", justifyContent: "space-between", alignItems: "center",
          }}>
            <div style={{ fontSize: "9px", color: "#94a3b8" }}>
              COLD CHAIN SERVICES S.A.S. — FICHA DE FABRICACIÓN DIVISIONES TÉRMICAS
            </div>
            <div style={{ fontSize: "9px", color: "#94a3b8" }}>
              Ficha #{numero || "—"} · {fmtDate(new Date().toISOString())}
            </div>
          </div>
        </div>
    </FichaImpresionShell>
  );
}
