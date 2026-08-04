import React from "react";
import { fmtMm } from "../../utils/fichaFormat";

// Sub-componentes de diseño compartidos por las fichas de impresión (todos con
// inline-styles para imprimir). Definen el lenguaje visual común: tarjeta de
// medida con cabecera de color, chip de dato, tarjeta de acabado y título de sección.

export function MedidaCard({ label, ancho, alto, color, dimLabels = ["Ancho", "Alto"] }) {
  return (
    <div style={{ background: "white", border: `2px solid ${color}`, borderRadius: "8px", overflow: "hidden" }}>
      <div style={{
        background: color, color: "white", fontSize: "10.5px", fontWeight: "bold",
        textAlign: "center", padding: "4px 7px", textTransform: "uppercase", letterSpacing: "0.5px",
      }}>
        {label}
      </div>
      <div style={{ padding: "7px 6px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "3px" }}>
        {[[dimLabels[0], ancho], [dimLabels[1], alto]].map(([dim, val]) => (
          <div key={dim} style={{ textAlign: "center" }}>
            <div style={{ fontSize: "9.5px", color: "#475569", fontWeight: "600", textTransform: "uppercase", marginBottom: "1px" }}>{dim}</div>
            <div style={{ fontSize: "18px", fontWeight: "bold", fontFamily: "monospace", color, lineHeight: 1 }}>{fmtMm(val)}</div>
            <div style={{ fontSize: "9.5px", color: "#475569", marginTop: "1px" }}>mm</div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function InfoChip({ label, value, highlight }) {
  return (
    <div style={{
      background: highlight ? "#eff6ff" : "white",
      border: `1px solid ${highlight ? "#bfdbfe" : "#e2e8f0"}`,
      borderRadius: "6px", padding: "6px 8px",
    }}>
      <div style={{ fontSize: "9.5px", color: "#475569", fontWeight: "600", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "2px" }}>{label}</div>
      <div style={{ fontSize: "13px", fontWeight: "700", color: highlight ? "#1d4ed8" : "#1e293b" }}>{value}</div>
    </div>
  );
}

// Tarjeta de acabado — mismo lenguaje visual que MedidaCard, para que las
// secciones de "Opciones y Acabados" tengan el mismo peso visual que las medidas.
export function AcabadoCard({ label, value, color, active }) {
  return (
    <div style={{ background: "white", border: `2px solid ${active ? color : "#e2e8f0"}`, borderRadius: "8px", overflow: "hidden" }}>
      <div style={{
        background: active ? color : "#94a3b8", color: "white", fontSize: "11px", fontWeight: "bold",
        textAlign: "center", padding: "4px 7px", textTransform: "uppercase", letterSpacing: "0.5px",
      }}>
        {label}
      </div>
      <div style={{ padding: "8px 6px", textAlign: "center" }}>
        <div style={{ fontSize: "16px", fontWeight: "bold", color: active ? color : "#64748b", lineHeight: 1.2 }}>{value}</div>
      </div>
    </div>
  );
}

export function SectionTitle({ children, size = "11.5px" }) {
  return (
    <div style={{
      fontSize: size, fontWeight: "bold", textTransform: "uppercase",
      letterSpacing: "0.8px", color: "#334155",
      borderBottom: "2px solid #e2e8f0", paddingBottom: "5px", marginBottom: "8px",
    }}>
      {children}
    </div>
  );
}

// Banda destacada de "medida de entrada" (vehículo, vano, etc.) — máxima
// prioridad visual, siempre lo primero después del membrete.
export function MedidaHero({ label, ancho, alto, unidadAncho = "Ancho mm", unidadAlto = "Alto mm", extra }) {
  return (
    <div style={{
      background: "linear-gradient(135deg, #0f172a 0%, #1e3a5f 100%)",
      borderRadius: "8px", padding: "9px 16px", marginBottom: "8px",
      display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "8px",
    }}>
      <div style={{ color: "rgba(255,255,255,0.85)", fontSize: "11px", fontWeight: "bold", textTransform: "uppercase", letterSpacing: "1px" }}>
        {label}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: "18px" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ color: "white", fontSize: "32px", fontWeight: "bold", fontFamily: "monospace", lineHeight: 1 }}>{fmtMm(ancho)}</div>
          <div style={{ color: "rgba(255,255,255,0.75)", fontSize: "9px", fontWeight: "600", textTransform: "uppercase", letterSpacing: "0.5px" }}>{unidadAncho}</div>
        </div>
        <div style={{ color: "rgba(255,255,255,0.45)", fontSize: "22px", fontWeight: "300" }}>×</div>
        <div style={{ textAlign: "center" }}>
          <div style={{ color: "white", fontSize: "32px", fontWeight: "bold", fontFamily: "monospace", lineHeight: 1 }}>{fmtMm(alto)}</div>
          <div style={{ color: "rgba(255,255,255,0.75)", fontSize: "9px", fontWeight: "600", textTransform: "uppercase", letterSpacing: "0.5px" }}>{unidadAlto}</div>
        </div>
        {extra && (
          <div style={{ textAlign: "center", borderLeft: "1px solid rgba(255,255,255,0.2)", paddingLeft: "16px" }}>
            {extra}
          </div>
        )}
      </div>
    </div>
  );
}

// Membrete (logo + título + N.° de ficha/orden) — idéntico en las tres fichas.
export function Membrete({ logoSrc, tituloFicha, numero, numeroLabel = "N.° orden de producción", subtitulo = "Todas las dimensiones en milímetros" }) {
  return (
    <div style={{
      background: "white", padding: "10px 20px 8px", borderBottom: "3px solid #1a3f8f",
      display: "flex", justifyContent: "space-between", alignItems: "center", gap: "14px",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: "12px", minWidth: 0 }}>
        <img src={logoSrc} alt="Cold Chain Services" style={{ height: "36px", width: "auto", objectFit: "contain", flexShrink: 0 }} />
        <div style={{ borderLeft: "1px solid #e2e8f0", paddingLeft: "12px" }}>
          <div style={{ fontSize: "9px", color: "#64748b", textTransform: "uppercase", letterSpacing: "1px", fontWeight: "bold" }}>
            Departamento de Ingeniería
          </div>
          <div style={{ fontSize: "15px", color: "#1a3f8f", fontWeight: "bold", marginTop: "1px" }}>
            {tituloFicha}
          </div>
          <div style={{ fontSize: "9px", color: "#64748b", marginTop: "1px" }}>
            {subtitulo}
          </div>
        </div>
      </div>
      <div style={{ textAlign: "right", flexShrink: 0 }}>
        <div style={{ fontSize: "9px", color: "#64748b", textTransform: "uppercase", letterSpacing: "1.5px", fontWeight: "bold" }}>
          {numeroLabel}
        </div>
        <div style={{
          background: "linear-gradient(135deg, #1a3f8f 0%, #0f6cbf 100%)",
          color: "white", fontSize: "24px", fontWeight: "bold", lineHeight: 1,
          padding: "5px 14px", borderRadius: "8px", letterSpacing: "-0.5px", marginTop: "3px",
        }}>
          #{numero ?? "—"}
        </div>
      </div>
    </div>
  );
}

// Firmas — Elaboró / Revisó / Aprobó, idéntico en las tres fichas.
export function Firmas() {
  return (
    <div style={{ padding: "4px 20px 12px" }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "16px" }}>
        {["Elaboró", "Revisó", "Aprobó"].map((rol) => (
          <div key={rol} style={{ textAlign: "center" }}>
            <div style={{ borderTop: "1px solid #94a3b8", marginTop: "20px", paddingTop: "3px" }}>
              <span style={{ fontSize: "9.5px", color: "#475569", textTransform: "uppercase", letterSpacing: "0.5px", fontWeight: "bold" }}>
                {rol}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Pie de página — idéntico en las tres fichas.
export function FichaFooter({ texto, numero, fecha }) {
  return (
    <div style={{
      background: "#f1f5f9", borderTop: "2px solid #e2e8f0",
      padding: "6px 20px", display: "flex", justifyContent: "space-between", alignItems: "center",
    }}>
      <div style={{ fontSize: "10px", color: "#64748b", fontWeight: "600" }}>{texto}</div>
      <div style={{ fontSize: "10px", color: "#64748b", fontWeight: "600" }}>Ficha #{numero || "—"} · {fecha}</div>
    </div>
  );
}
