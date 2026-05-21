import React from "react";

// ─── Formateadores ────────────────────────────────────────────────────────────
const fmtMm   = (n) => (n == null ? "—" : Math.round(Number(n)).toString());
const fmtM2   = (n) => (n == null ? "—" : Number(n).toFixed(3));
const fmtDec  = (n, d = 2) => (n == null ? "—" : Number(n).toFixed(d));
const fmtN    = (n) => (n == null ? "—" : Number(n).toString());
const fmtDate = (s) => {
  if (!s) return "—";
  try { return new Date(s).toLocaleDateString("es-CO"); } catch { return s; }
};

// ─── Estilos de celda reutilizables ──────────────────────────────────────────
const base = {
  border: "1px solid #999",
  padding: "4px 7px",
  fontSize: "11px",
  verticalAlign: "middle",
};
const th = { ...base, background: "#dde3ef", fontWeight: "bold", textAlign: "center" };
const td = { ...base };
const hd = { ...base, background: "#1a3f8f", color: "white", fontWeight: "bold", textAlign: "center" };
const gray = { ...base, background: "#f0f0f0", fontWeight: "bold" };

// ─── Plano técnico (SVG 2D vista frontal) ────────────────────────────────────
function PlanoTecnico({ ancho, alto, casas }) {
  const W = 520, H = 260;
  const margin = { top: 40, right: 70, bottom: 50, left: 70 };
  const drawW = W - margin.left - margin.right;
  const drawH = H - margin.top  - margin.bottom;

  // Escala para que el abrigo quepa, respetando proporciones
  const scaleX = drawW / (ancho + 2 * casas);
  const scaleY = drawH / alto;
  const scale  = Math.min(scaleX, scaleY) * 0.85;

  const fw = ancho * scale;   // ancho frontal
  const fh = alto  * scale;   // alto frontal
  const cw = casas * scale;   // ancho de cada casita

  // Centro del dibujo
  const cx = W / 2;
  const cy = margin.top + drawH / 2;
  const x0 = cx - fw / 2 - cw;
  const y0 = cy - fh / 2;

  // Colores
  const marco = "#1a3f8f";
  const casita = "#0891b2";
  const bg = "#f0f4ff";

  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ display: "block" }}>
      <defs>
        <marker id="arrowA" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
          <path d="M0,0 L6,3 L0,6 Z" fill="#555" />
        </marker>
        <marker id="arrowB" markerWidth="6" markerHeight="6" refX="1" refY="3" orient="auto">
          <path d="M6,0 L0,3 L6,6 Z" fill="#555" />
        </marker>
      </defs>

      {/* Fondo */}
      <rect x={x0} y={y0} width={fw + cw * 2} height={fh} fill={bg} stroke={marco} strokeWidth="1.5" />

      {/* Marco central (vano principal) */}
      <rect x={x0 + cw} y={y0} width={fw} height={fh} fill="white" stroke={marco} strokeWidth="2" />

      {/* Casita izquierda */}
      <rect x={x0} y={y0} width={cw} height={fh} fill="#e8f4fc" stroke={casita} strokeWidth="1.5" />
      <text x={x0 + cw / 2} y={cy + 4} fontSize="9" fill={casita} textAnchor="middle" fontWeight="bold">
        CASITA
      </text>

      {/* Casita derecha */}
      <rect x={x0 + cw + fw} y={y0} width={cw} height={fh} fill="#e8f4fc" stroke={casita} strokeWidth="1.5" />
      <text x={x0 + cw + fw + cw / 2} y={cy + 4} fontSize="9" fill={casita} textAnchor="middle" fontWeight="bold">
        CASITA
      </text>

      {/* ── Cota ANCHO (parte inferior, bajo el vano central) ── */}
      <line x1={x0 + cw} y1={y0 + fh + 14} x2={x0 + cw + fw} y2={y0 + fh + 14}
        stroke="#555" strokeWidth="1" markerStart="url(#arrowB)" markerEnd="url(#arrowA)" />
      <text x={x0 + cw + fw / 2} y={y0 + fh + 26} fontSize="9" fill="#333" textAnchor="middle">
        ANCHO: {fmtMm(ancho)} mm
      </text>

      {/* ── Cota ALTO (lado derecho) ── */}
      <line x1={x0 + cw * 2 + fw + 12} y1={y0} x2={x0 + cw * 2 + fw + 12} y2={y0 + fh}
        stroke="#555" strokeWidth="1" markerStart="url(#arrowB)" markerEnd="url(#arrowA)" />
      <text
        x={x0 + cw * 2 + fw + 26}
        y={cy}
        fontSize="9" fill="#333" textAnchor="middle"
        transform={`rotate(90,${x0 + cw * 2 + fw + 26},${cy})`}
      >
        ALTO: {fmtMm(alto)} mm
      </text>

      {/* ── Cota CASAS (izquierda) ── */}
      <line x1={x0 - 12} y1={y0} x2={x0 - 12} y2={y0 + fh}
        stroke={casita} strokeWidth="1" strokeDasharray="3,2"
        markerStart="url(#arrowB)" markerEnd="url(#arrowA)" />
      <text
        x={x0 - 26}
        y={cy}
        fontSize="9" fill={casita} textAnchor="middle"
        transform={`rotate(-90,${x0 - 26},${cy})`}
      >
        CASAS: {fmtMm(casas)} mm
      </text>

      {/* Título */}
      <text x={W / 2} y={H - 6} fontSize="10" fontWeight="bold" textAnchor="middle" fill="#333">
        VISTA FRONTAL — ABRIGO DE ANDÉN
      </text>
    </svg>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────
export default function FichaImpresionAbrigo({ ficha, numero, onClose }) {
  const printRef = React.useRef();
  if (!ficha) return null;

  const f   = ficha;
  const med = f.medidas               || {};
  const mp  = f.materiaPrimaPorAbrigo || {};
  const mpt = f.materiaPrimaTotal     || {};
  const ali = f.alistamiento          || {};
  const des = f.despacho              || {};
  const cant = Number(f.cantidad)     || 1;

  const handlePrint = () => {
    const win = window.open("", "_blank", "width=1120,height=980");
    if (!win) return;
    win.document.write(`<!DOCTYPE html><html><head>
      <meta charset="utf-8"/>
      <title>Ficha Abrigo Andén #${numero} — ${f.cliente || ""}</title>
      <style>
        * { box-sizing: border-box; }
        body { margin: 8mm; font-family: Arial, sans-serif; background: white; color: #111; }
        table { border-collapse: collapse; width: 100%; }
        td, th { border: 1px solid #999; padding: 4px 7px; font-size: 11px; vertical-align: middle; }
        @media print { body { margin: 5mm; } @page { size: A4 landscape; } }
      </style>
    </head><body>${printRef.current.innerHTML}</body></html>`);
    win.document.close();
    setTimeout(() => { win.focus(); win.print(); }, 300);
  };

  // ── Insumos consumo materia prima ─────────────────────────────────────────
  const insumos = [
    { label: "Lona perimetral",                unit: "m²",  cu: fmtM2(mp.lonaPerimetral_m2),    tot: fmtM2(mpt.lonaPerimetral_m2)    },
    ...(f.llevaBanda !== false ? [
      { label: "Banda PVC (laterales + superior)", unit: "m²", cu: fmtM2(mp.bandaPVC_m2), tot: fmtM2(mpt.bandaPVC_m2) },
    ] : []),
    { label: "Tubería marco 2\"×1\" cal.16",   unit: "und", cu: fmtN(mp.tuberiaMarco_und),       tot: fmtN(mpt.tuberiaMarco_und)       },
    { label: "Tubería travesaños 1\"×1¼\" cal.16", unit: "m", cu: fmtDec(mp.tuberiaTravesanos_m), tot: fmtDec(mpt.tuberiaTravesanos_m) },
    { label: "Mangueras (rollos 6 m)",         unit: "und", cu: fmtN(mp.mangueras_und),          tot: fmtN(mpt.mangueras_und)          },
    { label: "U doble 5×5",                    unit: "und", cu: fmtN(mp.uDoble5x5_und),          tot: fmtN(mpt.uDoble5x5_und)          },
    { label: "Refuerzos platina 7×7×⅛",        unit: "und", cu: fmtN(mp.refuerzosPlatina_und),   tot: fmtN(mpt.refuerzosPlatina_und)   },
    { label: "Tubos ½\"×3.8mm",               unit: "und", cu: fmtN(mp.tubosMedia_und),          tot: fmtN(mpt.tubosMedia_und)          },
    { label: "Tuercas y arandelas ¼\"",        unit: "und", cu: fmtDec(mp.tuercasArandelas_und, 1), tot: fmtN(mpt.tuercasArandelas_und) },
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

  const colorHeader = "#1a3f8f";

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-start justify-center overflow-auto py-6 px-4">
      <div className="bg-white w-full max-w-5xl rounded-xl shadow-2xl overflow-hidden">

        {/* ── Barra de acciones ── */}
        <div className="flex items-center justify-between px-5 py-3 bg-gray-50 border-b print:hidden">
          <span className="text-sm font-semibold text-gray-700">
            Ficha #{numero} — Abrigo de Andén
          </span>
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

        {/* ── Contenido imprimible ── */}
        <div ref={printRef} style={{ fontFamily: "Arial, sans-serif", color: "#111", background: "white", padding: "14px 18px" }}>

          {/* ── 1. Encabezado ── */}
          <div style={{ textAlign: "center", marginBottom: "10px" }}>
            <div style={{ fontSize: "15px", fontWeight: "bold", color: colorHeader }}>
              COLD CHAIN SERVICES S.A.S.
            </div>
            <div style={{ fontSize: "13px", fontWeight: "bold", color: colorHeader }}>
              DEPARTAMENTO DE INGENIERÍA
            </div>
            <div style={{ fontSize: "13px", fontWeight: "bold", color: colorHeader }}>
              FICHA DE FABRICACIÓN DE ABRIGOS DE ANDÉN
            </div>
            <div style={{ fontSize: "10px", fontWeight: "bold", marginTop: "3px", color: "#555" }}>
              TODAS LAS DIMENSIONES EN MILÍMETROS
            </div>
          </div>

          {/* ── 2. Datos del pedido ── */}
          <table style={{ borderCollapse: "collapse", width: "100%", marginBottom: "10px" }}>
            <tbody>
              <tr>
                <td style={{ ...gray, width: "14%" }}>N° ORDEN PROD.:</td>
                <td style={{ ...td, fontWeight: "bold", fontStyle: "italic", width: "14%" }}>{f.numeroOP || "—"}</td>
                <td style={{ ...gray, width: "10%", textAlign: "center" }}>FECHA ORDEN</td>
                <td style={{ ...td, width: "12%" }}>{fmtDate(f.fechaOrden)}</td>
                <td style={{ ...gray, width: "12%", textAlign: "center" }}>FECHA ENTREGA</td>
                <td style={{ ...td, width: "12%" }}>{fmtDate(f.fechaEntrega)}</td>
              </tr>
              <tr>
                <td style={{ ...gray }}>CLIENTE:</td>
                <td style={{ ...td, fontWeight: "bold", fontStyle: "italic" }} colSpan={3}>{f.cliente || "—"}</td>
                <td style={{ ...gray, textAlign: "center" }}>CANTIDAD</td>
                <td style={{ ...td, fontWeight: "bold", textAlign: "center" }}>{f.cantidad}</td>
              </tr>
              <tr>
                <td style={{ ...gray }}>AUXILIAR ENCARGADO:</td>
                <td style={{ ...td, fontStyle: "italic" }} colSpan={3}>{f.auxiliarEncargado || "TODOS"}</td>
                <td style={{ ...gray, textAlign: "center" }}>COLOR / ACABADO</td>
                <td style={{ ...td, textAlign: "center", fontWeight: "bold" }}>
                  {f.acabado === "GALVANIZADO" ? "GALVANIZADO" : `${f.color || "NEGRO"} / PINTADO`}
                </td>
              </tr>
              <tr>
                <td style={{ ...gray }}>MEDIDAS DEL ABRIGO</td>
                <td style={{ ...gray, textAlign: "center" }}>ANCHO</td>
                <td style={{ ...td, fontWeight: "bold", textAlign: "center", fontFamily: "monospace" }}>{fmtMm(f.ancho)}</td>
                <td style={{ ...gray, textAlign: "center" }}>ALTO</td>
                <td style={{ ...td, fontWeight: "bold", textAlign: "center", fontFamily: "monospace" }}>{fmtMm(f.alto)}</td>
                <td style={{ ...td, textAlign: "center" }}>
                  <span style={{ fontWeight: "bold" }}>CASAS:</span> {fmtMm(f.casas)} mm
                </td>
              </tr>
            </tbody>
          </table>

          {/* ── Fila: tabla medidas + plano técnico ── */}
          <div style={{ display: "flex", gap: "12px", marginBottom: "10px", alignItems: "flex-start" }}>

            {/* ── 3. Tabla de medidas estructurales ── */}
            <div style={{ flex: 1 }}>
              <table style={{ borderCollapse: "collapse", width: "100%" }}>
                <thead>
                  <tr>
                    {["COMPONENTE", "CANT.", "LARGO (mm)", "ANCHO (mm)", "OBSERVACIONES"].map((h) => (
                      <th key={h} style={{ ...hd, fontSize: "10px" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[
                    { comp: 'Tubería marco 2"×1" cal.16 (largueros)',    cant: "4",                              largo: fmtMm(f.alto),                 ancho: "—",   obs: "Marco estructural perimetral" },
                    { comp: 'Tubería travesaños 1"×1¼" cal.16',          cant: fmtN(med.travesanoCantidad),      largo: fmtMm(med.travesanoLargo),     ancho: "—",   obs: "Refuerzo interno" },
                    { comp: "Lona perimetral (rollo 70 cm)",              cant: "1",                              largo: fmtMm(med.loneaPerimetro),     ancho: "700", obs: "Envuelve el marco exterior" },
                    ...(f.llevaBanda !== false ? [
                      { comp: "Banda PVC lateral",  cant: "2", largo: fmtMm(med.bandaLateralLargo),  ancho: fmtMm(med.bandaLateralAncho),  obs: "Sello lateral contra camión" },
                      { comp: "Banda PVC superior", cant: "1", largo: fmtMm(med.bandaSuperiorLargo), ancho: fmtMm(med.bandaSuperiorAncho), obs: "Sello superior contra camión" },
                    ] : []),
                    { comp: `Mangueras (rollos de ${6000} mm)`,          cant: fmtN(med.manguerasCantidad),     largo: "6000",                        ancho: "—",   obs: "Amortiguadores" },
                  ].map(({ comp, cant: c, largo, ancho, obs }, i) => (
                    <tr key={comp} style={{ background: i % 2 === 0 ? "white" : "#f8f8f8" }}>
                      <td style={{ ...td, fontWeight: "600" }}>{comp}</td>
                      <td style={{ ...td, textAlign: "center", fontFamily: "monospace" }}>{c}</td>
                      <td style={{ ...td, textAlign: "center", fontFamily: "monospace", fontWeight: "bold" }}>{largo}</td>
                      <td style={{ ...td, textAlign: "center", fontFamily: "monospace" }}>{ancho}</td>
                      <td style={{ ...td, fontSize: "10px", color: "#555" }}>{obs}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* ── 4. Plano técnico ── */}
            <div style={{ border: "1px solid #ccc", borderRadius: "4px", padding: "6px", background: "#fafafa", flexShrink: 0 }}>
              <PlanoTecnico ancho={f.ancho} alto={f.alto} casas={f.casas} />
            </div>
          </div>

          {/* ── Fila: material a fabricar + material a alistar ── */}
          <div style={{ display: "flex", gap: "12px", marginBottom: "10px" }}>

            {/* ── 5. Material a fabricar ── */}
            <div style={{ flex: 1 }}>
              <table style={{ borderCollapse: "collapse", width: "100%" }}>
                <thead>
                  <tr>
                    <th colSpan={3} style={{ ...hd }}>MATERIAL A FABRICAR</th>
                  </tr>
                  <tr>
                    {["COMPONENTE", "CANT. × PEDIDO", "LARGO (mm)"].map((h) => (
                      <th key={h} style={{ ...th, fontSize: "10px" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[
                    { comp: "Casitas",                 cant: `${(med.casitasCantidad || 2) * cant}`, largo: fmtMm(med.casitasLargo) },
                    { comp: "Largueros (alt. marco)",  cant: `${4 * cant}`,                          largo: fmtMm(f.alto) },
                    { comp: "U doble 5×5",             cant: `${8 * cant}`,                          largo: "—" },
                    { comp: "Refuerzos platina 7×7×⅛", cant: `${8 * cant}`,                         largo: "—" },
                    { comp: "Tubos ½\"×3.8mm",         cant: `${8 * cant}`,                          largo: "—" },
                  ].map(({ comp, cant: c, largo }, i) => (
                    <tr key={comp} style={{ background: i % 2 === 0 ? "white" : "#f8f8f8" }}>
                      <td style={{ ...td, fontWeight: "600" }}>{comp}</td>
                      <td style={{ ...td, textAlign: "center", fontFamily: "monospace", fontWeight: "bold" }}>{c}</td>
                      <td style={{ ...td, textAlign: "center", fontFamily: "monospace" }}>{largo}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* ── 6. Material a alistar ── */}
            <div style={{ flex: 1 }}>
              <table style={{ borderCollapse: "collapse", width: "100%" }}>
                <thead>
                  <tr>
                    <th colSpan={3} style={{ ...hd }}>MATERIAL A ALISTAR</th>
                  </tr>
                  <tr>
                    {["INSUMO", "CANTIDAD", "DIMENSIÓN (mm)"].map((h) => (
                      <th key={h} style={{ ...th, fontSize: "10px" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[
                    { ins: `Mangueras largo = ${fmtMm(f.ancho)} mm`,   cant: `×${ali.manguerasCantAncho || 2 * cant}`, dim: fmtMm(f.ancho) },
                    { ins: `Mangueras largo = ${fmtMm(f.alto)} mm`,    cant: `×${ali.manguerasCantAlto  || 4 * cant}`, dim: fmtMm(f.alto) },
                    { ins: "Tuercas y arandelas ¼\"",                   cant: fmtN(mpt.tuercasArandelas_und),           dim: "—" },
                    { ins: "Tornillos 3/8\"×2½\"",                      cant: `×${ali.tornillos38x25 || 8 * cant}`,     dim: "—" },
                    { ins: "Tornillos autorroscantes No10×¾\"",          cant: `×${ali.tornillosAutorroscantes || 22 * cant}`, dim: "—" },
                  ].map(({ ins, cant: c, dim }, i) => (
                    <tr key={ins} style={{ background: i % 2 === 0 ? "white" : "#f8f8f8" }}>
                      <td style={{ ...td, fontWeight: "600" }}>{ins}</td>
                      <td style={{ ...td, textAlign: "center", fontFamily: "monospace", fontWeight: "bold" }}>{c}</td>
                      <td style={{ ...td, textAlign: "center", fontFamily: "monospace" }}>{dim}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* ── Fila: consumo materia prima + despacho ── */}
          <div style={{ display: "flex", gap: "12px", marginBottom: "10px" }}>

            {/* ── 7. Consumo de materia prima ── */}
            <div style={{ flex: 1 }}>
              <table style={{ borderCollapse: "collapse", width: "100%" }}>
                <thead>
                  <tr>
                    {["INSUMO", "UND", `POR ABRIGO`, `TOTAL × ${cant}`].map((h) => (
                      <th key={h} style={{ ...hd, fontSize: "10px",
                        textAlign: h === "INSUMO" ? "left" : "center" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {insumos.map(({ label, unit, cu, tot }, i) => (
                    <tr key={label} style={{ background: i % 2 === 0 ? "white" : "#f8f8f8" }}>
                      <td style={{ ...td, fontWeight: "600" }}>{label}</td>
                      <td style={{ ...td, textAlign: "center", color: "#555" }}>{unit}</td>
                      <td style={{ ...td, textAlign: "center", fontFamily: "monospace", fontWeight: "bold" }}>{cu}</td>
                      <td style={{ ...td, textAlign: "center", fontFamily: "monospace", fontWeight: "bold", color: "#1d4ed8" }}>{tot}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* ── 8. Control de despacho ── */}
            <div style={{ flex: 1 }}>
              <table style={{ borderCollapse: "collapse", width: "100%" }}>
                <thead>
                  <tr>
                    {["DESCRIPCIÓN", "MEDIDAS (mm)", "PESO UNIT (kg)", "CANT.", "PESO TOTAL (kg)"].map((h) => (
                      <th key={h} style={{ ...hd, fontSize: "10px" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(des.items || []).map(({ descripcion, medidas: dims, pesoUnitKg, cantidad: c, pesoTotalKg }, i) => (
                    <tr key={descripcion} style={{ background: i % 2 === 0 ? "white" : "#f8f8f8" }}>
                      <td style={{ ...td, fontWeight: "600" }}>{descripcion}</td>
                      <td style={{ ...td, textAlign: "center", fontFamily: "monospace", fontSize: "10px" }}>{dims}</td>
                      <td style={{ ...td, textAlign: "center", fontFamily: "monospace" }}>{pesoUnitKg}</td>
                      <td style={{ ...td, textAlign: "center" }}>{c}</td>
                      <td style={{ ...td, textAlign: "center", fontFamily: "monospace", fontWeight: "bold" }}>
                        {fmtDec(pesoTotalKg, 1)}
                      </td>
                    </tr>
                  ))}
                  <tr style={{ background: "#dde3ef" }}>
                    <td style={{ ...td, fontWeight: "bold" }} colSpan={4}>PESO TOTAL PEDIDO</td>
                    <td style={{ ...td, textAlign: "center", fontFamily: "monospace", fontWeight: "bold",
                      fontSize: "13px", color: colorHeader }}>
                      {fmtDec(des.pesoTotalKg, 1)} kg
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* ── 9. Tabla de actividades ── */}
          <table style={{ borderCollapse: "collapse", width: "100%", marginBottom: "10px" }}>
            <thead>
              <tr>
                {["ACTIVIDAD", "AUXILIAR RESPONSABLE", "FECHA INICIO", "FECHA FIN", "OBSERVACIONES"].map((h) => (
                  <th key={h} style={{ ...hd, fontSize: "10px" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {actividades.map((act, i) => (
                <tr key={act} style={{ background: i % 2 === 0 ? "white" : "#f8f8f8" }}>
                  <td style={{ ...td, fontWeight: "600" }}>{act}</td>
                  <td style={td}></td>
                  <td style={td}></td>
                  <td style={td}></td>
                  <td style={td}></td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* ── Footer ── */}
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "9px",
            color: "#777", borderTop: "1px solid #ccc", paddingTop: "5px" }}>
            <span>COLD CHAIN SERVICES S.A.S. — FICHA DE FABRICACIÓN ABRIGOS DE ANDÉN</span>
            <span>Ficha #{numero || "—"} · {fmtDate(new Date().toISOString())}</span>
          </div>

        </div>
      </div>
    </div>
  );
}
