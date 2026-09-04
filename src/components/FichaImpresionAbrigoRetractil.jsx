import React from "react";
import FichaImpresionShell from "./fichas/FichaImpresionShell";
import { fmtMm, fmtM2, fmtDec, fmtN, fmtDate } from "../utils/fichaFormat";
import logoPng from "../assets/imagenes/logo.png";
import { MedidaCard, InfoChip, AcabadoCard, SectionTitle, MedidaHero, Membrete, Firmas, FichaFooter, Casilla } from "./fichas/FichaVisualKit";
import { codigoFichaOFallback } from "../utils/codigoFicha";
import planoAbrigoRetractil from "../assets/imagenes/AbrigoRetractil/Plano.png";
import { nombreClienteImpreso } from "../utils/clienteVinculo";

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
      {/* 300 px de ancho: el plano es de referencia, no una guía a escala, y a
          más tamaño obligaba a encoger toda la ficha para caber en la carta. */}
      <div style={{ position: "relative", display: "inline-block", width: "300px", maxWidth: "100%" }}>
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
            fontSize: "10.5px", fontWeight: "bold", fontFamily: "monospace",
            color: "#000000", whiteSpace: "nowrap", lineHeight: 1,
            background: "#ffffff", padding: "1px 3px", borderRadius: "2px", border: "0.5px solid #000000",
          }}>
            {value}
          </span>
        ))}
      </div>
      <div style={{ fontSize: "9px", color: "#000000", marginTop: "4px" }}>
        Plano de referencia — medidas del pedido superpuestas
      </div>
    </div>
  );
}

const tdStyle = { border: "1px solid #000000", padding: "3px 6px", fontSize: "11px", verticalAlign: "middle" };
const thStyle = { ...tdStyle, background: "#1a3f8f", color: "white", fontWeight: "bold", textAlign: "center", fontSize: "10px" };

// Tarjeta de un dato suelto (corte o cantidad a alistar): rótulo arriba, número
// grande y unidad abajo. El rótulo reserva dos renglones para que todas las
// tarjetas de una fila queden con el número a la misma altura.
function DatoCard({ label, val, unit, color, bg, border }) {
  return (
    <div style={{ background: bg, border: `1px solid ${border}`, borderRadius: "6px", padding: "5px 4px", textAlign: "center" }}>
      <div style={{
        fontSize: "8.5px", color, fontWeight: "bold", textTransform: "uppercase",
        letterSpacing: "0.3px", lineHeight: 1.2, minHeight: "21px",
      }}>
        {label}
      </div>
      <div style={{ fontSize: "22px", fontWeight: "bold", fontFamily: "monospace", color, lineHeight: 1 }}>{val}</div>
      <div style={{ fontSize: "8.5px", color: "#000000", marginTop: "1px" }}>{unit}</div>
    </div>
  );
}

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

  // ── Cortes del pedido — los números que más se consultan en el taller ─────
  const cortes = [
    { label: `Largueros ×${fmtN(med.largueroCantidad)}`,   val: fmtMm(med.largueroLargo),    unit: "mm",     color: "#9f1239", bg: "#fff1f2", border: "#fecdd3" },
    { label: `Travesaños ×${fmtN(med.travesanoCantidad)}`, val: fmtMm(med.travesanoLargo),   unit: "mm",     color: "#5b21b6", bg: "#f5f3ff", border: "#ddd6fe" },
    { label: `Casitas ×${fmtN(med.casitasCantidad)}`,      val: fmtMm(med.casitasLargo),     unit: "mm",     color: "#92400e", bg: "#fffbeb", border: "#fde68a" },
    { label: "Mangueras rollos de 6000 mm",                val: fmtN(med.manguerasCantidad), unit: "rollos", color: "#065f46", bg: "#ecfdf5", border: "#a7f3d0" },
  ];

  // ── Material a alistar (cantidades del pedido completo) ───────────────────
  const alistar = [
    { label: `Mangueras largo = ancho (${fmtMm(f.ancho)} mm)`, val: `×${ali.manguerasCantAncho ?? 2 * cant}` },
    { label: `Mangueras largo = alto (${fmtMm(f.alto)} mm)`,   val: `×${ali.manguerasCantAlto  ?? 4 * cant}` },
    { label: 'Tornillos 3/8"×2½"',                             val: `×${ali.tornillos38x25 ?? 8 * cant}` },
    { label: 'Tornillos autorroscantes No10×¾"',                val: `×${ali.tornillosAutorroscantes ?? 22 * cant}` },
  ].map((c) => ({ ...c, unit: "und", color: "#075985", bg: "#f0f9ff", border: "#bae6fd" }));

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

  // La tabla de insumos va partida en dos mitades lado a lado: en una sola
  // columna se llevaba un tercio del alto de la hoja y obligaba a encoger toda
  // la ficha para caber en la carta.
  const mitad = Math.ceil(insumos.length / 2);
  const columnasInsumos = [insumos.slice(0, mitad), insumos.slice(mitad)];

  const medidasFabricacion = [
    <MedidaCard key="lona" label="Lona perimetral" ancho={med.loneaPerimetro} alto={700} color="#1a3f8f" dimLabels={["Largo", "Ancho rollo"]} />,
    ...(llevaBanda ? [
      <MedidaCard key="lateral"  label="Banda PVC lateral ×2" ancho={med.bandaLateralAncho}  alto={med.bandaLateralLargo}  color="#0b4a7d" dimLabels={["Ancho", "Largo"]} />,
      <MedidaCard key="superior" label="Banda PVC superior"   ancho={med.bandaSuperiorAncho} alto={med.bandaSuperiorLargo} color="#155e75" dimLabels={["Ancho", "Largo"]} />,
    ] : []),
  ];

  return (
    <FichaImpresionShell
      productLabel="Abrigo Retráctil"
      numero={codigo}
      cliente={nombreClienteImpreso(f)}
      onClose={onClose}
      maxWidthClass="max-w-[1220px]"
      windowSize={{ width: 1300, height: 840 }}
    >
        <div style={{ color: "#000000", fontSize: "12.5px" }}>
          <Membrete
            logoSrc={logoPng}
            tituloFicha="Ficha de Fabricación — Abrigo Retráctil"
            nombre={f.nombreFicha}
            numero={codigo}
            numeroLabel="N.° ficha de producción"
            subtitulo="Todas las dimensiones en milímetros"
          />

          {/* ── Identificación + medidas (izquierda) / Plano + aviso (derecha) ──
              Las dos columnas se estiran a la misma altura: la rejilla de
              medidas de la izquierda lleva flex:1, así absorbe el alto del
              plano en vez de dejar un hueco en blanco al pie de la columna. */}
          <div style={{
            display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px",
            padding: "9px 20px 0", background: "#f8fafc",
          }}>

            {/* Columna izquierda — identificación + medidas de fabricación */}
            <div style={{ display: "flex", flexDirection: "column" }}>
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
                <div style={{ background: "white", border: "1px solid #e2e8f0", borderRadius: "8px", padding: "7px 10px" }}>
                  <div style={{ fontSize: "9.5px", color: "#000000", fontWeight: "600", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "2px" }}>Cliente</div>
                  <div style={{ fontSize: "18px", fontWeight: "bold", color: "#1a3f8f" }}>{nombreClienteImpreso(f) || "—"}</div>
                </div>
                <div style={{ background: "white", border: "1px solid #e2e8f0", borderRadius: "8px", padding: "7px 10px", textAlign: "center" }}>
                  <div style={{ fontSize: "9.5px", color: "#000000", fontWeight: "600", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "2px" }}>Cantidad</div>
                  <div style={{ fontSize: "22px", fontWeight: "bold", color: "#1a3f8f", lineHeight: 1 }}>{f.cantidad}</div>
                  <div style={{ fontSize: "9.5px", color: "#000000", marginTop: "1px" }}>abrigos</div>
                </div>
              </div>

              {/* El color y el acabado no se repiten aquí: van abajo en "Opciones
                  y Acabados", con el mismo peso visual que el resto de la ficha. */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "6px", marginBottom: "6px" }}>
                <InfoChip label="Orden de compra"    value={f.numeroOrdenCompra || "—"} highlight={!!f.numeroOrdenCompra} />
                <InfoChip label="Auxiliar encargado" value={f.auxiliarEncargado || "TODOS"} />
                <InfoChip label="Fecha orden"        value={fmtDate(f.fechaOrden)} />
                <InfoChip label="Fecha entrega"      value={fmtDate(f.fechaEntrega)} highlight={!!f.fechaEntrega} />
              </div>

              <SectionTitle size="10px">Opciones y Acabados</SectionTitle>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "6px", marginBottom: "8px" }}>
                <AcabadoCard label="Color"     value={f.color || "NEGRO"} color="#1a3f8f" active />
                <AcabadoCard label="Acabado"   value={f.acabado || "PINTADO"} color="#0b4a7d" active />
                <AcabadoCard label="Banda PVC" value={llevaBanda ? "SÍ" : "NO"} color="#065f46" active={llevaBanda} />
              </div>

              <SectionTitle size="10px">Medidas de Fabricación</SectionTitle>
              <div style={{
                display: "grid", gridTemplateColumns: `repeat(${medidasFabricacion.length}, 1fr)`,
                gap: "6px", flex: 1, gridAutoRows: "1fr",
              }}>
                {medidasFabricacion}
              </div>
            </div>

            {/* Columna derecha — plano técnico + aviso de planta */}
            <div style={{ display: "flex", flexDirection: "column" }}>
              <div style={{
                border: "1px solid #334155", borderRadius: "8px", padding: "6px",
                background: "#fafafa", display: "flex", justifyContent: "center", alignItems: "center", flex: 1,
              }}>
                <PlanoTecnico ancho={f.ancho} alto={f.alto} anchoLuz={med.anchoLuz} bandaLateralAncho={med.bandaLateralAncho} />
              </div>

              <div style={{
                marginTop: "8px", fontSize: "10.5px", fontWeight: "600", color: "#92400e", background: "#fffbeb",
                border: "1px solid #fde68a", borderRadius: "6px", padding: "7px 9px", lineHeight: 1.35,
              }}>
                ⚠ No olvidar colocar en el perimetral las recomendaciones de mantenimiento.
              </div>
            </div>
          </div>

          {/* ── Cortes + material a alistar — una sola franja a lo ancho ──
              Antes eran dos rejillas de 2×2 apiladas dentro de media hoja: en
              una fila de cuatro cada número queda más grande y se ahorra el
              alto de dos renglones de tarjetas. */}
          <div style={{ padding: "9px 20px 0", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
            <div>
              <SectionTitle size="10px">Cortes (por abrigo)</SectionTitle>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "6px" }}>
                {cortes.map((c) => <DatoCard key={c.label} {...c} />)}
              </div>
            </div>
            <div>
              <SectionTitle size="10px">Material a Alistar (pedido completo)</SectionTitle>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "6px" }}>
                {alistar.map((c) => <DatoCard key={c.label} {...c} />)}
              </div>
            </div>
          </div>

          {/* ── Control de despacho ──
              Sin pesos: en planta no se pesa nada y los kg solo servían para el
              transporte. Queda la lista de bultos con sus medidas y su casilla
              para marcar lo que sale. */}
          {(des.items || []).length > 0 && (
            <div style={{ padding: "9px 20px 0" }}>
              <SectionTitle size="10px">Control de Despacho — Bultos a Entregar</SectionTitle>
              <div style={{ display: "grid", gridTemplateColumns: `repeat(${des.items.length}, 1fr)`, gap: "6px" }}>
                {des.items.map(({ descripcion, medidas, cantidad }) => (
                  <div key={descripcion} style={{
                    background: "white", border: "1px solid #334155", borderRadius: "6px",
                    padding: "5px 7px", display: "flex", alignItems: "center", gap: "7px",
                  }}>
                    <Casilla tamano="13px" />
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: "10px", fontWeight: "bold", color: "#000000", lineHeight: 1.2 }}>{descripcion}</div>
                      <div style={{ fontSize: "9.5px", fontFamily: "monospace", color: "#000000" }}>
                        {medidas} mm · ×{fmtN(cantidad)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Consumo de materia prima — dos medias tablas, una al lado de otra ── */}
          <div style={{ padding: "9px 20px 8px" }}>
            <SectionTitle size="10px">Consumo de Materia Prima (por abrigo)</SectionTitle>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
              {columnasInsumos.map((columna, c) => (
                <div key={c} style={{ border: "1px solid #000000", borderRadius: "8px", overflow: "hidden" }}>
                  <table style={{ borderCollapse: "collapse", width: "100%" }}>
                    <thead>
                      <tr>
                        {["INSUMO", "UND", "FÓRMULA (REFERENCIA)", "C/U", `TOTAL ×${cant}`].map((h) => (
                          <th key={h} style={{
                            ...thStyle,
                            textAlign: h === "INSUMO" || h.startsWith("FÓRMULA") ? "left" : "center",
                          }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {columna.map(({ label, unit, cu, tot, formula }, i) => (
                        <tr key={label} style={{ background: i % 2 === 0 ? "white" : "#f8fafc" }}>
                          <td style={{ ...tdStyle, fontWeight: "600" }}>{label}</td>
                          <td style={{ ...tdStyle, textAlign: "center", color: "#000000" }}>{unit}</td>
                          <td style={{ ...tdStyle, color: "#000000", fontSize: "9px" }}>{formula}</td>
                          <td style={{ ...tdStyle, textAlign: "center", fontFamily: "monospace", fontWeight: "bold" }}>{cu}</td>
                          <td style={{ ...tdStyle, textAlign: "center", fontFamily: "monospace", fontWeight: "bold", color: "#1e3a8a" }}>{tot}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ))}
            </div>
          </div>

          <Firmas ficha={ficha} />
          <FichaFooter
            texto="COLD CHAIN SERVICES S.A.S. — FICHA DE FABRICACIÓN ABRIGOS RETRÁCTILES"
            numero={codigo}
            fecha={fmtDate(new Date().toISOString())}
          />
        </div>
    </FichaImpresionShell>
  );
}
