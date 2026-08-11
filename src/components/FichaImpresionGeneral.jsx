import React from "react";
import FichaImpresionShell from "./fichas/FichaImpresionShell";
import { fmtN, fmtDate } from "../utils/fichaFormat";
import logoPng from "../assets/imagenes/logo.png";
import { Membrete, Firmas, FichaFooter, InfoChip, SectionTitle, Casilla } from "./fichas/FichaVisualKit";
import { codigoFichaOFallback } from "../utils/codigoFicha";

// Orden de producción para lo que NO tiene ficha de fabricación: repuestos y
// productos que se despachan tal cual (semáforos, lámparas, topes, rampas…).
// A diferencia de las fichas de producto, aquí no hay plano ni medidas: el
// documento es la lista de ítems a alistar, con una casilla por renglón para
// ir marcando el alistamiento a mano sobre la hoja impresa.

// La hoja siempre muestra un mínimo de renglones aunque la orden traiga menos
// ítems, para poder agregar a mano lo que se decida en planta.
const MIN_FILAS = 8;

export default function FichaImpresionGeneral({ ficha, numero, onClose }) {
  if (!ficha) return null;
  const f = ficha;
  const codigo = codigoFichaOFallback({ ...f, ordenProduccion: f.ordenProduccion ?? numero }, "general");
  const items = Array.isArray(f.items) ? f.items : [];
  const filasVacias = Math.max(0, MIN_FILAS - items.length);

  const tdStyle = { border: "1px solid #000000", padding: "6px 8px", fontSize: "12px", verticalAlign: "middle", height: "26px" };
  const thStyle = { ...tdStyle, background: "#1a3f8f", color: "white", fontWeight: "bold", textAlign: "center", fontSize: "11px", height: "auto" };

  const casilla = <Casilla />;

  return (
    <FichaImpresionShell
      productLabel="Ficha Básica"
      numero={codigo}
      cliente={f.cliente}
      onClose={onClose}
      maxWidthClass="max-w-[1220px]"
      windowSize={{ width: 1300, height: 840 }}
    >
      <div style={{ color: "#000000", fontSize: "12.5px" }}>
        <Membrete
          logoSrc={logoPng}
          tituloFicha="Orden de Producción — Ficha Básica"
          numero={codigo}
          numeroLabel="N.° ficha de producción"
          subtitulo="Repuestos y productos sin ficha de fabricación"
        />

        {/* ── Encabezado: cliente, cantidad y datos de la orden ── */}
        <div style={{ padding: "10px 20px", background: "#f8fafc", borderBottom: "2px solid #e2e8f0" }}>
          <div style={{ display: "grid", gridTemplateColumns: "2.4fr 1fr", gap: "8px", marginBottom: "8px" }}>
            <div style={{ background: "white", border: "1px solid #e2e8f0", borderRadius: "8px", padding: "8px 12px" }}>
              <div style={{ fontSize: "9.5px", color: "#000000", fontWeight: "600", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "3px" }}>Cliente</div>
              <div style={{ fontSize: "20px", fontWeight: "bold", color: "#1a3f8f" }}>{f.cliente || "—"}</div>
            </div>
            <div style={{ background: "white", border: "1px solid #e2e8f0", borderRadius: "8px", padding: "8px 12px", textAlign: "center" }}>
              <div style={{ fontSize: "9.5px", color: "#000000", fontWeight: "600", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "3px" }}>Total unidades</div>
              <div style={{ fontSize: "26px", fontWeight: "bold", color: "#1a3f8f", lineHeight: 1 }}>{fmtN(f.cantidad ?? 0)}</div>
              <div style={{ fontSize: "10px", color: "#000000", marginTop: "1px" }}>en {fmtN(items.length)} ítem(s)</div>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "6px" }}>
            <InfoChip label="Orden de compra" value={f.numeroOrdenCompra || "—"} highlight={!!f.numeroOrdenCompra} />
            <InfoChip label="Fecha orden" value={fmtDate(f.fechaOrden)} />
            <InfoChip label="Fecha entrega" value={fmtDate(f.fechaEntrega)} highlight={!!f.fechaEntrega} />
            <InfoChip label="Responsable" value={f.responsable || "—"} />
          </div>
        </div>

        {/* ── Ítems a alistar ── */}
        <div style={{ padding: "10px 20px 8px" }}>
          <SectionTitle>Ítems a Alistar y Despachar</SectionTitle>
          <table style={{ borderCollapse: "collapse", width: "100%" }}>
            <thead>
              <tr>
                <th style={{ ...thStyle, width: "34px" }}>#</th>
                <th style={{ ...thStyle, textAlign: "left" }}>DESCRIPCIÓN</th>
                <th style={{ ...thStyle, width: "120px" }}>CATEGORÍA</th>
                <th style={{ ...thStyle, width: "120px" }}>REFERENCIA</th>
                <th style={{ ...thStyle, width: "60px" }}>CANT.</th>
                <th style={{ ...thStyle, width: "70px" }}>UNIDAD</th>
                <th style={{ ...thStyle, textAlign: "left", width: "230px" }}>OBSERVACIONES</th>
                <th style={{ ...thStyle, width: "56px" }}>ALISTADO</th>
              </tr>
            </thead>
            <tbody>
              {items.map((it, i) => (
                <tr key={`${it.descripcion}-${i}`} style={{ background: i % 2 === 0 ? "white" : "#f8fafc" }}>
                  <td style={{ ...tdStyle, textAlign: "center", color: "#000000", fontFamily: "monospace" }}>{i + 1}</td>
                  <td style={{ ...tdStyle, fontWeight: "600" }}>{it.descripcion}</td>
                  <td style={{ ...tdStyle, textAlign: "center", color: "#000000", fontSize: "11px" }}>{it.categoria || "—"}</td>
                  <td style={{ ...tdStyle, textAlign: "center", fontFamily: "monospace", fontSize: "11px" }}>{it.referencia || "—"}</td>
                  <td style={{ ...tdStyle, textAlign: "center", fontFamily: "monospace", fontWeight: "bold", fontSize: "14px", color: "#1e3a8a" }}>{fmtN(it.cantidad)}</td>
                  <td style={{ ...tdStyle, textAlign: "center", color: "#000000", fontSize: "11px" }}>{it.unidad || "—"}</td>
                  <td style={{ ...tdStyle, color: "#000000", fontSize: "11px" }}>{it.observaciones || ""}</td>
                  <td style={{ ...tdStyle, textAlign: "center" }}>{casilla}</td>
                </tr>
              ))}
              {/* Renglones en blanco para agregar a mano en planta */}
              {Array.from({ length: filasVacias }, (_, i) => (
                <tr key={`vacia-${i}`} style={{ background: (items.length + i) % 2 === 0 ? "white" : "#f8fafc" }}>
                  <td style={{ ...tdStyle, textAlign: "center", color: "#000000", fontFamily: "monospace" }}>{items.length + i + 1}</td>
                  <td style={tdStyle}></td>
                  <td style={tdStyle}></td>
                  <td style={tdStyle}></td>
                  <td style={tdStyle}></td>
                  <td style={tdStyle}></td>
                  <td style={tdStyle}></td>
                  <td style={{ ...tdStyle, textAlign: "center" }}>{casilla}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* ── Observaciones generales ── */}
        <div style={{ padding: "0 20px 8px" }}>
          <div style={{ background: "#fff7ed", border: "1px solid #fed7aa", borderRadius: "8px", padding: "9px 12px" }}>
            <div style={{ fontSize: "9.5px", color: "#7c2d12", fontWeight: "bold", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "4px" }}>
              Observaciones de la orden
            </div>
            {f.observaciones ? (
              <div style={{ fontSize: "12.5px", color: "#000000", whiteSpace: "pre-wrap" }}>{f.observaciones}</div>
            ) : (
              <>
                <div style={{ borderBottom: "1px solid #fdba74", height: "18px" }} />
                <div style={{ borderBottom: "1px solid #fdba74", height: "18px" }} />
              </>
            )}
          </div>
        </div>

        <Firmas />
        <FichaFooter
          texto="COLD CHAIN SERVICES S.A.S. — ORDEN DE PRODUCCIÓN / DESPACHO"
          numero={codigo}
          fecha={fmtDate(new Date().toISOString())}
        />
      </div>
    </FichaImpresionShell>
  );
}
