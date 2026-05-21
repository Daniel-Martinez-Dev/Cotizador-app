import React from "react";

const toM  = (mm) => (mm == null ? "—" : (Math.round(Number(mm) / 10) / 100).toFixed(2));
const fmt1 = (n)  => (n  == null ? "—" : Number(n).toFixed(1));
const fmtMm = (n) => (n  == null ? "—" : Math.round(Number(n)).toString());

// ── Sub-componentes de diseño (todos con inline-styles para imprimir) ──────────

function MedidaCard({ label, ancho, alto, color }) {
  return (
    <div style={{ background: "white", border: `2px solid ${color}`, borderRadius: "8px", overflow: "hidden" }}>
      <div style={{
        background: color, color: "white", fontSize: "10px", fontWeight: "bold",
        textAlign: "center", padding: "5px 8px", textTransform: "uppercase", letterSpacing: "0.5px",
      }}>
        {label}
      </div>
      <div style={{ padding: "10px 8px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "4px" }}>
        {[["Ancho", ancho], ["Alto", alto]].map(([dim, val]) => (
          <div key={dim} style={{ textAlign: "center" }}>
            <div style={{ fontSize: "9px", color: "#94a3b8", textTransform: "uppercase", marginBottom: "2px" }}>{dim}</div>
            <div style={{ fontSize: "17px", fontWeight: "bold", fontFamily: "monospace", color, lineHeight: 1 }}>{fmtMm(val)}</div>
            <div style={{ fontSize: "9px", color: "#94a3b8", marginTop: "1px" }}>mm</div>
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
      borderRadius: "6px", padding: "8px 10px",
    }}>
      <div style={{ fontSize: "9px", color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "2px" }}>{label}</div>
      <div style={{ fontSize: "12px", fontWeight: "600", color: highlight ? "#1d4ed8" : "#374151" }}>{value}</div>
    </div>
  );
}

function OpcionBadge({ label, value, active }) {
  return (
    <div style={{
      display: "inline-flex", alignItems: "center", gap: "4px",
      background: active ? "#eff6ff" : "#f1f5f9",
      border: `1px solid ${active ? "#bfdbfe" : "#e2e8f0"}`,
      borderRadius: "20px", padding: "4px 12px",
    }}>
      <span style={{ fontSize: "10px", color: "#94a3b8" }}>{label}:</span>
      <span style={{ fontSize: "11px", fontWeight: "bold", color: active ? "#1d4ed8" : "#64748b" }}>{value}</span>
    </div>
  );
}

function SectionTitle({ children }) {
  return (
    <div style={{
      fontSize: "10px", fontWeight: "bold", textTransform: "uppercase",
      letterSpacing: "0.8px", color: "#475569",
      borderBottom: "2px solid #e2e8f0", paddingBottom: "6px", marginBottom: "10px",
    }}>
      {children}
    </div>
  );
}

// ── Componente principal ───────────────────────────────────────────────────────

export default function FichaImpresionDivision({ ficha, numero, onClose }) {
  const printRef = React.useRef();

  if (!ficha) return null;
  const f   = ficha;
  const med = f.medidas || {};

  const handlePrint = () => {
    const win = window.open("", "_blank", "width=1050,height=900");
    if (!win) return;
    win.document.write(`<!DOCTYPE html><html><head>
      <meta charset="utf-8"/>
      <title>Ficha División Térmica #${numero} — ${f.cliente || ""}</title>
      <style>
        * { box-sizing: border-box; }
        body { margin: 8mm; font-family: Arial, sans-serif; background: white; }
        @media print { body { margin: 5mm; } }
      </style>
    </head><body>${printRef.current.innerHTML}</body></html>`);
    win.document.close();
    setTimeout(() => { win.focus(); win.print(); }, 300);
  };

  const consumoVisible = (f.consumo || []).filter((c) => c.cantidad > 0);

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-start justify-center overflow-auto py-6 px-4">
      <div className="bg-white w-full max-w-4xl rounded-xl shadow-2xl overflow-hidden">

        {/* Barra de acciones — no se imprime */}
        <div className="flex items-center justify-between px-5 py-3 bg-gray-50 border-b print:hidden">
          <span className="text-sm font-semibold text-gray-700">Ficha #{numero} — División Térmica</span>
          <div className="flex gap-2">
            <button onClick={handlePrint}
              className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-sm rounded-lg font-medium">
              Imprimir / PDF
            </button>
            <button onClick={onClose}
              className="px-4 py-1.5 bg-gray-200 hover:bg-gray-300 text-gray-700 text-sm rounded-lg">
              Cerrar
            </button>
          </div>
        </div>

        {/* ─ Contenido imprimible ─ */}
        <div ref={printRef} style={{ fontFamily: "Arial, sans-serif", color: "#1a1a2e", fontSize: "12px", background: "white" }}>

          {/* ── Header ── */}
          <div style={{
            background: "linear-gradient(135deg, #1a3f8f 0%, #0f6cbf 100%)",
            padding: "16px 20px", display: "flex", justifyContent: "space-between", alignItems: "center",
          }}>
            <div>
              <div style={{ color: "white", fontSize: "20px", fontWeight: "bold", letterSpacing: "1px" }}>
                COLD CHAIN SERVICES
              </div>
              <div style={{ color: "rgba(255,255,255,0.7)", fontSize: "10px", marginTop: "3px", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                Departamento de Ingeniería — Fichas de Fabricación
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ color: "rgba(255,255,255,0.6)", fontSize: "9px", textTransform: "uppercase", letterSpacing: "1.5px" }}>
                División Térmica
              </div>
              <div style={{ color: "white", fontSize: "34px", fontWeight: "bold", lineHeight: 1, letterSpacing: "-1px" }}>
                #{numero || "—"}
              </div>
            </div>
          </div>

          {/* ── Información general ── */}
          <div style={{ padding: "14px 20px", background: "#f8fafc", borderBottom: "2px solid #e2e8f0" }}>
            <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr", gap: "10px", marginBottom: "10px" }}>

              <div style={{ background: "white", border: "1px solid #e2e8f0", borderRadius: "8px", padding: "12px" }}>
                <div style={{ fontSize: "9px", color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "4px" }}>Cliente</div>
                <div style={{ fontSize: "18px", fontWeight: "bold", color: "#1a3f8f" }}>{f.cliente || "—"}</div>
              </div>

              <div style={{ background: "white", border: "1px solid #e2e8f0", borderRadius: "8px", padding: "12px", textAlign: "center" }}>
                <div style={{ fontSize: "9px", color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "4px" }}>Cantidad</div>
                <div style={{ fontSize: "30px", fontWeight: "bold", color: "#1a3f8f", lineHeight: 1 }}>{f.cantidad}</div>
                <div style={{ fontSize: "10px", color: "#94a3b8", marginTop: "2px" }}>unidades</div>
              </div>

              <div style={{ background: "white", border: "1px solid #e2e8f0", borderRadius: "8px", padding: "12px", textAlign: "center" }}>
                <div style={{ fontSize: "9px", color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "4px" }}>Vehículo (mm)</div>
                <div style={{ fontSize: "14px", fontWeight: "bold", fontFamily: "monospace", color: "#374151" }}>
                  {fmtMm(f.anchoVehiculo)} × {fmtMm(f.altoVehiculo)}
                </div>
                <div style={{ fontSize: "10px", color: "#94a3b8", marginTop: "2px" }}>
                  {toM(f.anchoVehiculo)} × {toM(f.altoVehiculo)} m
                </div>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "8px" }}>
              <InfoChip label="Fecha orden"   value={f.fechaOrden   ? new Date(f.fechaOrden).toLocaleDateString("es-CO")   : "—"} />
              <InfoChip label="Fecha entrega" value={f.fechaEntrega ? new Date(f.fechaEntrega).toLocaleDateString("es-CO") : "—"} highlight={!!f.fechaEntrega} />
              <InfoChip label="Placa"         value={f.placa  || "NO"} highlight={f.placa  === "SI"} />
              <InfoChip label="Agujero"       value={f.agujero || "—"} />
            </div>
          </div>

          {/* ── Medidas de corte ── */}
          <div style={{ padding: "14px 20px" }}>
            <SectionTitle>Medidas de Corte</SectionTitle>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "10px" }}>
              <MedidaCard label="Panel"                  ancho={med.panel?.ancho}          alto={med.panel?.alto}          color="#1a3f8f" />
              <MedidaCard label="Icopor"                 ancho={med.icopor?.ancho}         alto={med.icopor?.alto}         color="#0f6cbf" />
              <MedidaCard label="Funda"                  ancho={med.funda?.ancho}          alto={med.funda?.alto}          color="#0891b2" />
              <MedidaCard label="Policarb. / Cartonplast" ancho={med.policarbonato?.ancho} alto={med.policarbonato?.alto}  color="#0d9488" />
            </div>
          </div>

          {/* ── Lona + Piso ── */}
          <div style={{ padding: "0 20px 14px", display: "grid", gridTemplateColumns: "3fr 2fr", gap: "10px" }}>

            {/* Lona */}
            <div style={{ background: "#f0f9ff", border: "1px solid #bae6fd", borderRadius: "8px", padding: "12px" }}>
              <div style={{ fontSize: "10px", color: "#0284c7", fontWeight: "bold", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "10px" }}>
                Distribución de Lona
                <span style={{ fontWeight: "normal", color: "#64748b", marginLeft: "8px" }}>
                  Rollo {med.lona?.anchoRollo ?? "—"} mm — Color: {f.colorLona || "—"}
                </span>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "8px" }}>
                {[
                  ["Tiras",        med.lona?.tiras,          ""],
                  ["Largo tira",   med.lona?.largoTira,      "mm"],
                  ["Sobrante",     med.lona?.sobranteAncho,  "mm"],
                ].map(([lbl, val, unit]) => (
                  <div key={lbl} style={{ textAlign: "center", background: "white", borderRadius: "6px", padding: "8px" }}>
                    <div style={{ fontSize: lbl === "Tiras" ? "24px" : "18px", fontWeight: "bold", color: "#0284c7", fontFamily: "monospace", lineHeight: 1 }}>
                      {val ?? "—"}
                    </div>
                    <div style={{ fontSize: "10px", color: "#64748b", marginTop: "3px" }}>{lbl}{unit ? ` (${unit})` : ""}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Piso y ventana */}
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: "8px", padding: "12px", flex: 1 }}>
                <div style={{ fontSize: "9px", color: "#16a34a", fontWeight: "bold", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "4px" }}>Medida Piso</div>
                <div style={{ fontSize: "24px", fontWeight: "bold", fontFamily: "monospace", color: "#15803d", lineHeight: 1 }}>{fmtMm(med.medidaPiso)}</div>
                <div style={{ fontSize: "10px", color: "#94a3b8", marginTop: "3px" }}>mm</div>
              </div>
              <div style={{ background: "#fefce8", border: "1px solid #fde68a", borderRadius: "8px", padding: "12px", flex: 1 }}>
                <div style={{ fontSize: "9px", color: "#ca8a04", fontWeight: "bold", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "4px" }}>Distancia Ventana</div>
                <div style={{ fontSize: "24px", fontWeight: "bold", fontFamily: "monospace", color: "#92400e", lineHeight: 1 }}>
                  {med.distanciaVentana != null ? fmt1(med.distanciaVentana) : "—"}
                </div>
                <div style={{ fontSize: "10px", color: "#94a3b8", marginTop: "3px" }}>cm</div>
              </div>
            </div>
          </div>

          {/* ── Opciones y acabados ── */}
          <div style={{ padding: "0 20px 14px" }}>
            <SectionTitle>Opciones y Acabados</SectionTitle>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
              <OpcionBadge label="FT"       value={f.ft       || "NO"} active={f.ft       === "SI"} />
              <OpcionBadge label="Logo"     value={f.logo     || "NO"} active={f.logo !== "NO" && !!f.logo} />
              <OpcionBadge label="Platinas" value={f.platinas || "NO"} active={f.platinas === "SI"} />
              <OpcionBadge label="Factura"  value={f.factura  || "NO"} active={f.factura  === "SI"} />
              <OpcionBadge label="Espuma"   value="8 CAB / 4+4 LAT"   active />
            </div>
          </div>

          {/* ── Consumo de materiales ── */}
          {consumoVisible.length > 0 && (
            <div style={{ padding: "0 20px 14px" }}>
              <SectionTitle>Consumo de Materiales (por unidad)</SectionTitle>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: "8px" }}>
                {consumoVisible.map((c) => (
                  <div key={c.insumo} style={{
                    background: "#f8fafc", border: "1px solid #e2e8f0",
                    borderRadius: "6px", padding: "8px 10px",
                  }}>
                    <div style={{ fontSize: "9px", color: "#94a3b8", marginBottom: "3px" }}>{c.insumo.replace(/_/g, " ")}</div>
                    <div style={{ fontWeight: "bold", fontFamily: "monospace", fontSize: "14px", color: "#374151" }}>
                      {c.unidad === "m²" ? Number(c.cantidad).toFixed(3) : c.cantidad}
                    </div>
                    <div style={{ fontSize: "9px", color: "#94a3b8", marginTop: "1px" }}>
                      {c.unidad}{c.largoMm ? ` · ${c.largoMm} mm` : ""}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Adicional / Notas ── */}
          {f.adicional && (
            <div style={{ padding: "0 20px 14px" }}>
              <div style={{ background: "#fff7ed", border: "1px solid #fed7aa", borderRadius: "8px", padding: "12px" }}>
                <div style={{ fontSize: "9px", color: "#ea580c", fontWeight: "bold", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "4px" }}>
                  Adicional / Notas
                </div>
                <div style={{ fontSize: "12px", color: "#1a1a2e" }}>{f.adicional}</div>
              </div>
            </div>
          )}

          {/* ── Footer ── */}
          <div style={{
            background: "#f1f5f9", borderTop: "2px solid #e2e8f0",
            padding: "8px 20px", display: "flex", justifyContent: "space-between", alignItems: "center",
          }}>
            <div style={{ fontSize: "9px", color: "#94a3b8" }}>
              COLD CHAIN SERVICES S.A.S. — FICHA DE FABRICACIÓN DIVISIONES TÉRMICAS
            </div>
            <div style={{ fontSize: "9px", color: "#94a3b8" }}>Ficha #{numero || "—"}</div>
          </div>

        </div>
      </div>
    </div>
  );
}
