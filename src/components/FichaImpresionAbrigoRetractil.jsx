import React from "react";
import FichaImpresionShell from "./fichas/FichaImpresionShell";
import { fmtMm, fmtM2, fmtDec, fmtN, fmtDate } from "../utils/fichaFormat";
import logoPng from "../assets/imagenes/logo.png";
import { MedidaCard, InfoChip, AcabadoCard, SectionTitle, MedidaHero, Membrete, Firmas, FichaFooter } from "./fichas/FichaVisualKit";
import { codigoFichaOFallback } from "../utils/codigoFicha";
import planoAbrigoRetractil from "../assets/imagenes/AbrigoRetractil/Plano.png";

// ─── Plano técnico (imagen isométrica de referencia + medidas superpuestas) ──
// La imagen fuente (Plano.png) no trae números impresos — cada "=" quedó en
// blanco a propósito para poder superponer aquí las medidas reales del pedido,
// en vez de mostrar valores de ejemplo fijos que contradigan la ficha.
// Coordenadas (% sobre 1128×1156 px, la resolución del archivo fuente) medidas
// a mano sobre cada "=" del plano; si se reemplaza Plano.png por otro archivo
// con otro layout, estas posiciones hay que recalibrarlas.
const PLANO_ANCHO_PX = 1128;
const PLANO_ALTO_PX  = 1156;
const pct = (px, total) => `${((px / total) * 100).toFixed(1)}%`;

function PlanoTecnico({ ancho, alto, anchoLuz, bandaLateralAncho }) {
  // "ancho" es el ancho TOTAL del abrigo (lo que se escribe en el formulario).
  // "anchoLuz" (vano libre) = ancho - 2×bandaLateralAncho, ya calculado en
  // calcularAbrigoRetractil (medidas.anchoLuz).
  const overlays = [
    { x: 252, y: 46,   value: "700 mm",                       rotate: 0  }, // Proyección (constante de fabricación)
    { x: 182, y: 505,  value: `${fmtMm(alto)} mm`,             rotate: 0  }, // Alto total
    { x: 988, y: 745,  value: `${fmtMm(alto)} mm`,             rotate: 0  }, // Altura abrigo
    { x: 1060, y: 618, value: "1000 mm",                       rotate: 0  }, // Banda Superior (constante — ancho de banda PVC superior)
    { x: 478, y: 920,  value: `${fmtMm(anchoLuz)} mm`,         rotate: 20 }, // Ancho luz (vano libre)
    { x: 412, y: 1008, value: `${fmtMm(ancho)} mm`,            rotate: 20 }, // Ancho total abrigo
    { x: 608, y: 1045, value: `${fmtMm(bandaLateralAncho)} mm`, rotate: 20 }, // Ancho banda lateral
  ];

  return (
    <div style={{ textAlign: "center" }}>
      <div style={{ position: "relative", display: "inline-block", width: "340px", maxWidth: "100%" }}>
        <img
          src={planoAbrigoRetractil}
          alt="Plano isométrico — Abrigo Retráctil"
          style={{ display: "block", width: "100%", height: "auto" }}
        />
        {overlays.map(({ x, y, value, rotate }, i) => (
          <span key={i} style={{
            position: "absolute",
            top: pct(y, PLANO_ALTO_PX),
            left: pct(x, PLANO_ANCHO_PX),
            transform: `rotate(${rotate}deg)`,
            transformOrigin: "left center",
            fontSize: "11.5px", fontWeight: "bold", fontFamily: "monospace",
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

const tdStyle = { border: "1px solid #000000", padding: "5px 7px", fontSize: "11.5px", verticalAlign: "middle" };
const thStyle = { ...tdStyle, background: "#1a3f8f", color: "white", fontWeight: "bold", textAlign: "center", fontSize: "11px" };

// ─── Componente principal ─────────────────────────────────────────────────────
export default function FichaImpresionAbrigoRetractil({ ficha, numero, onClose }) {
  if (!ficha) return null;

  const f   = ficha;
  const codigo = codigoFichaOFallback({ ...f, ordenProduccion: f.ordenProduccion ?? numero }, "abrigoretractil");
  const med = f.medidas               || {};
  const mp  = f.materiaPrimaPorAbrigo || {};
  const mpt = f.materiaPrimaTotal     || {};
  const ali = f.alistamiento          || {};
  const des = f.despacho              || {};
  const cant = Number(f.cantidad)     || 1;
  const llevaBanda = f.llevaBanda !== false;

  // ── Insumos consumo materia prima ─────────────────────────────────────────
  const insumos = [
    { label: "Lona perimetral",                unit: "m²",  cu: fmtM2(mp.lonaPerimetral_m2),    tot: fmtM2(mpt.lonaPerimetral_m2),    formula: "(2·alto+ancho+40) × 700 / 1e6" },
    ...(llevaBanda ? [
      { label: "Banda PVC (laterales + superior)", unit: "m²", cu: fmtM2(mp.bandaPVC_m2), tot: fmtM2(mpt.bandaPVC_m2), formula: "(2×lateral + superior) / 1e6" },
    ] : []),
    { label: "Tubería marco 2\"×1\" cal.16",   unit: "und", cu: fmtN(mp.tuberiaMarco_und),       tot: fmtN(mpt.tuberiaMarco_und),       formula: "4 und/abrigo (fijo)" },
    { label: "Tubería travesaños 1\"×1¼\" cal.16", unit: "m", cu: fmtDec(mp.tuberiaTravesanos_m), tot: fmtDec(mpt.tuberiaTravesanos_m), formula: "travesaños × 4 / 1000" },
    { label: "Mangueras (rollos 6 m)",         unit: "und", cu: fmtN(mp.mangueras_und),          tot: fmtN(mpt.mangueras_und),          formula: "CEIL((alto×4+ancho×2)/6000)" },
    { label: "U doble 5×5",                    unit: "und", cu: fmtN(mp.uDoble5x5_und),          tot: fmtN(mpt.uDoble5x5_und),          formula: "8 und/abrigo (fijo)" },
    { label: "Refuerzos platina 7×7×⅛",        unit: "und", cu: fmtN(mp.refuerzosPlatina_und),   tot: fmtN(mpt.refuerzosPlatina_und),   formula: "8 und/abrigo (fijo)" },
    { label: "Tubos ½\"×3.8mm",               unit: "und", cu: fmtN(mp.tubosMedia_und),          tot: fmtN(mpt.tubosMedia_und),          formula: "8 und/abrigo (fijo)" },
    { label: "Tuercas y arandelas ¼\"",        unit: "und", cu: fmtDec(mp.tuercasArandelas_und, 1), tot: fmtN(mpt.tuercasArandelas_und), formula: "20 + 2/cantidad" },
  ];

  // ── Actividades placeholder ───────────────────────────────────────────────
  const actividades = [
    "Corte de lona",
    "Sellado de lona",
    "Corte de banda PVC",
    "Pintado de banda PVC",
    "Corte de tubería",
    "Armado estructura",
    "Alistamiento",
  ];

  return (
    <FichaImpresionShell
      productLabel="Abrigo Retráctil"
      numero={codigo}
      cliente={f.cliente}
      onClose={onClose}
      maxWidthClass="max-w-[1220px]"
      windowSize={{ width: 1300, height: 840 }}
    >
        <div style={{ color: "#000000", fontSize: "12.5px" }}>
          <Membrete
            logoSrc={logoPng}
            tituloFicha="Ficha de Fabricación — Abrigo Retráctil"
            numero={codigo}
            numeroLabel="N.° ficha de producción"
            subtitulo="Todas las dimensiones en milímetros"
          />

          {/* ── Identificación + medidas (izquierda) / Plano + acabados (derecha) ── */}
          <div style={{
            display: "grid", gridTemplateColumns: "0.86fr 1.14fr", gap: "16px",
            padding: "10px 20px", background: "#f8fafc", borderBottom: "2px solid #e2e8f0",
          }}>

            {/* Columna izquierda — identificación + medidas de fabricación */}
            <div>
              {/* Medidas del abrigo — máxima prioridad visual, es la medida de entrada de todo el cálculo */}
              <MedidaHero
                label="Medidas del Abrigo"
                ancho={f.ancho}
                alto={f.alto}
                extra={
                  <span style={{ color: "#ffffff", fontSize: "12px", fontWeight: "bold", fontFamily: "monospace" }}>
                    Travesaños: {fmtMm(f.travesanos)} mm
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
                  <div style={{ fontSize: "10px", color: "#000000", marginTop: "1px" }}>abrigos</div>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "6px", marginBottom: "6px" }}>
                <InfoChip label="Orden de compra" value={f.numeroOrdenCompra || "—"} highlight={!!f.numeroOrdenCompra} />
                <InfoChip label="Auxiliar encargado"   value={f.auxiliarEncargado || "TODOS"} />
                <InfoChip label="Color / Acabado"      value={f.acabado === "GALVANIZADO" ? "GALVANIZADO" : `${f.color || "NEGRO"} / PINTADO`} />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "6px", marginBottom: "10px" }}>
                <InfoChip label="Fecha orden"   value={fmtDate(f.fechaOrden)} />
                <InfoChip label="Fecha entrega" value={fmtDate(f.fechaEntrega)} highlight={!!f.fechaEntrega} />
              </div>

              <SectionTitle size="11.5px">Medidas de Fabricación</SectionTitle>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "8px", marginBottom: "8px" }}>
                <MedidaCard label="Lona perimetral" ancho={med.loneaPerimetro} alto={700} color="#1a3f8f" dimLabels={["Largo", "Ancho rollo"]} />
                {llevaBanda && (
                  <>
                    <MedidaCard label="Banda PVC lateral ×2" ancho={med.bandaLateralAncho}  alto={med.bandaLateralLargo}  color="#0b4a7d" dimLabels={["Ancho", "Largo"]} />
                    <MedidaCard label="Banda PVC superior"   ancho={med.bandaSuperiorAncho} alto={med.bandaSuperiorLargo} color="#155e75" dimLabels={["Ancho", "Largo"]} />
                  </>
                )}
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "8px" }}>
                {[
                  { label: `Largueros ×${fmtN(med.largueroCantidad)}`,   val: fmtMm(med.largueroLargo),        unit: "mm",     color: "#9f1239", bg: "#fff1f2", border: "#fecdd3" },
                  { label: `Travesaños ×${fmtN(med.travesanoCantidad)}`, val: fmtMm(med.travesanoLargo),       unit: "mm",     color: "#5b21b6", bg: "#f5f3ff", border: "#ddd6fe" },
                  { label: `Casitas ×${fmtN(med.casitasCantidad)}`,       val: fmtMm(med.casitasLargo),         unit: "mm",     color: "#92400e", bg: "#fffbeb", border: "#fde68a" },
                  { label: "Mangueras (rollos de 6000 mm)",                val: fmtN(med.manguerasCantidad),     unit: "rollos", color: "#065f46", bg: "#ecfdf5", border: "#a7f3d0" },
                ].map(({ label, val, unit, color, bg, border }) => (
                  <div key={label} style={{ background: bg, border: `1px solid ${border}`, borderRadius: "8px", padding: "8px 9px", textAlign: "center" }}>
                    <div style={{ fontSize: "9px", color, fontWeight: "bold", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "3px" }}>{label}</div>
                    <div style={{ fontSize: "20px", fontWeight: "bold", fontFamily: "monospace", color, lineHeight: 1 }}>{val}</div>
                    <div style={{ fontSize: "9px", color: "#000000", marginTop: "2px" }}>{unit}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Columna derecha — plano técnico + opciones/acabados */}
            <div>
              <div style={{
                border: "1px solid #334155", borderRadius: "8px", padding: "8px",
                background: "#fafafa", display: "flex", justifyContent: "center", alignItems: "center",
              }}>
                <PlanoTecnico ancho={f.ancho} alto={f.alto} anchoLuz={med.anchoLuz} bandaLateralAncho={med.bandaLateralAncho} />
              </div>

              <div style={{ marginTop: "8px", background: "#eff6ff", border: "1px solid #dbeafe", borderRadius: "8px", padding: "9px 10px" }}>
                <SectionTitle size="11.5px">Opciones y Acabados</SectionTitle>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "6px" }}>
                  <AcabadoCard label="Color"     value={f.color || "NEGRO"} color="#1a3f8f" active />
                  <AcabadoCard label="Acabado"   value={f.acabado || "PINTADO"} color="#0b4a7d" active />
                  <AcabadoCard label="Banda PVC" value={llevaBanda ? "SÍ" : "NO"} color="#065f46" active={llevaBanda} />
                </div>
                <div style={{
                  marginTop: "10px", fontSize: "10px", fontWeight: "600", color: "#92400e", background: "#fffbeb",
                  border: "1px solid #fde68a", borderRadius: "6px", padding: "7px 8px", lineHeight: 1.4,
                }}>
                  ⚠ No olvidar colocar en el perimetral las recomendaciones de mantenimiento.
                </div>
              </div>
            </div>
          </div>

          {/* ── Material a alistar + Control de despacho ── */}
          <div style={{ padding: "0 20px 10px", display: "grid", gridTemplateColumns: "3fr 2fr", gap: "8px" }}>

            <div style={{ background: "#f0f9ff", border: "1px solid #bae6fd", borderRadius: "8px", padding: "9px" }}>
              <div style={{ fontSize: "10px", color: "#075985", fontWeight: "bold", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "7px" }}>
                Material a Alistar
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "6px" }}>
                {[
                  [`Mangueras largo = ancho (${fmtMm(f.ancho)} mm)`, `×${ali.manguerasCantAncho ?? 2 * cant}`],
                  [`Mangueras largo = alto (${fmtMm(f.alto)} mm)`,   `×${ali.manguerasCantAlto  ?? 4 * cant}`],
                  ['Tornillos 3/8"×2½"',                              `×${ali.tornillos38x25 ?? 8 * cant}`],
                  ['Tornillos autorroscantes No10×¾"',                 `×${ali.tornillosAutorroscantes ?? 22 * cant}`],
                ].map(([lbl, val]) => (
                  <div key={lbl} style={{ textAlign: "center", background: "white", borderRadius: "6px", padding: "6px" }}>
                    <div style={{ fontSize: "17px", fontWeight: "bold", color: "#075985", fontFamily: "monospace", lineHeight: 1 }}>{val}</div>
                    <div style={{ fontSize: "9px", color: "#000000", fontWeight: "600", marginTop: "2px" }}>{lbl}</div>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: "8px", padding: "9px", display: "flex", flexDirection: "column" }}>
              <div style={{ fontSize: "10px", color: "#166534", fontWeight: "bold", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "7px" }}>
                Control de Despacho
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "white", borderRadius: "6px", padding: "8px 10px", marginBottom: "6px" }}>
                <span style={{ fontSize: "10px", color: "#000000", fontWeight: "600" }}>Peso total pedido</span>
                <span style={{ fontSize: "20px", fontWeight: "bold", color: "#14532d", fontFamily: "monospace" }}>{fmtDec(des.pesoTotalKg, 1)} kg</span>
              </div>
              <table style={{ borderCollapse: "collapse", width: "100%" }}>
                <tbody>
                  {(des.items || []).map(({ descripcion, pesoTotalKg }) => (
                    <tr key={descripcion}>
                      <td style={{ fontSize: "10px", padding: "2px 0", color: "#000000" }}>{descripcion}</td>
                      <td style={{ fontSize: "10px", padding: "2px 0", textAlign: "right", fontFamily: "monospace", color: "#14532d", fontWeight: "bold" }}>
                        {fmtDec(pesoTotalKg, 1)} kg
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* ── Consumo de materia prima ── */}
          <div style={{ padding: "0 20px 10px" }}>
            <SectionTitle>Consumo de Materia Prima (por abrigo)</SectionTitle>
            <div style={{ border: "1px solid #000000", borderRadius: "8px", overflow: "hidden" }}>
              <table style={{ borderCollapse: "collapse", width: "100%" }}>
                <thead>
                  <tr>
                    {["INSUMO", "UNIDAD", "FÓRMULA (REFERENCIA)", "POR ABRIGO", `TOTAL × ${cant}`].map((h) => (
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
          </div>

          {/* ── Control de actividades ── */}
          <div style={{ padding: "0 20px 4px" }}>
            <SectionTitle size="11.5px">Control de Actividades</SectionTitle>
            <div style={{ border: "1px solid #000000", borderRadius: "8px", overflow: "hidden" }}>
              <table style={{ borderCollapse: "collapse", width: "100%" }}>
                <thead>
                  <tr>
                    {["ACTIVIDAD", "AUXILIAR RESPONSABLE", "FECHA INICIO", "FECHA FIN", "OBSERVACIONES"].map((h) => (
                      <th key={h} style={{ ...thStyle, fontSize: "10.5px" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {actividades.map((act, i) => (
                    <tr key={act} style={{ background: i % 2 === 0 ? "white" : "#f8fafc" }}>
                      <td style={{ ...tdStyle, fontWeight: "600" }}>{act}</td>
                      <td style={tdStyle}></td>
                      <td style={tdStyle}></td>
                      <td style={tdStyle}></td>
                      <td style={tdStyle}></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <Firmas />
          <FichaFooter
            texto="COLD CHAIN SERVICES S.A.S. — FICHA DE FABRICACIÓN ABRIGOS RETRÁCTILES"
            numero={codigo}
            fecha={fmtDate(new Date().toISOString())}
          />
        </div>
    </FichaImpresionShell>
  );
}
