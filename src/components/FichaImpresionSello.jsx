import React from "react";

const fmtMm   = (n) => (n == null ? "—" : Math.round(Number(n)).toString());
const fmtM2   = (n) => (n == null ? "—" : Number(n).toFixed(3));
const fmtN    = (n) => (n == null ? "—" : Number(n).toString());
const fmtDate = (s) => {
  if (!s) return "—";
  try { return new Date(s).toLocaleDateString("es-CO"); } catch { return s; }
};

// ── Estilos de celda de tabla ──────────────────────────────────────────────────
const TD = ({ children, header, center, bold, italic, gray, colSpan, rowSpan, style = {} }) => (
  <td
    colSpan={colSpan}
    rowSpan={rowSpan}
    style={{
      border: "1px solid #999",
      padding: "4px 7px",
      fontSize: "11px",
      textAlign: center ? "center" : "left",
      fontWeight: bold || header ? "bold" : "normal",
      fontStyle: italic ? "italic" : "normal",
      background: gray ? "#f0f0f0" : header ? "#dde3ef" : "white",
      verticalAlign: "middle",
      whiteSpace: "nowrap",
      ...style,
    }}
  >
    {children}
  </td>
);

// ── Diagrama SVG del PARAL (poste lateral) ────────────────────────────────────
function DiagramaParal({ espesorSello, espesorPoste, selloAlto, despliegueCortina }) {
  const W = 280, H = 320;
  // Proporciones de la vista isométrica simplificada
  const fw = 90;   // ancho cara frontal
  const fd = 35;   // profundidad (perspectiva)
  const fh = 190;  // alto cara frontal
  const ox = 60;   // origen x cara frontal
  const oy = 80;   // origen y cara frontal

  // Núcleo estructural (madera/lámina) — centrado en la cara frontal
  const cw = fw * 0.35, ch = fh * 0.55;
  const cx = ox + (fw - cw) / 2;
  const cy = oy + (fh - ch) / 2;

  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ display: "block" }}>
      {/* Cara superior */}
      <polygon
        points={`${ox},${oy} ${ox+fw},${oy} ${ox+fw+fd},${oy-fd} ${ox+fd},${oy-fd}`}
        fill="#c8c8c8" stroke="#555" strokeWidth="1.2"
      />
      {/* Cara lateral derecha */}
      <polygon
        points={`${ox+fw},${oy} ${ox+fw+fd},${oy-fd} ${ox+fw+fd},${oy-fd+fh} ${ox+fw},${oy+fh}`}
        fill="#b0b0b0" stroke="#555" strokeWidth="1.2"
      />
      {/* Cara frontal */}
      <rect x={ox} y={oy} width={fw} height={fh} fill="#d8d8d8" stroke="#555" strokeWidth="1.2" />
      {/* Núcleo estructural */}
      <rect x={cx} y={cy} width={cw} height={ch} fill="#FFD700" stroke="#888" strokeWidth="1" />

      {/* ── Cotas ── */}
      {/* Cota altura (derecha) */}
      <line x1={ox+fw+fd+10} y1={oy-fd} x2={ox+fw+fd+10} y2={oy-fd+fh} stroke="#1a3f8f" strokeWidth="1" markerStart="url(#arr)" markerEnd="url(#arr)" />
      <text x={ox+fw+fd+22} y={oy-fd+fh/2+4} fontSize="9" fill="#1a3f8f" textAnchor="middle"
        transform={`rotate(90,${ox+fw+fd+22},${oy-fd+fh/2+4})`}>
        {fmtMm(selloAlto)} mm
      </text>

      {/* Cota ancho sello (inferior frontal) */}
      <line x1={ox} y1={oy+fh+12} x2={ox+fw} y2={oy+fh+12} stroke="#1a3f8f" strokeWidth="1" />
      <line x1={ox} y1={oy+fh+8} x2={ox} y2={oy+fh+16} stroke="#1a3f8f" strokeWidth="1" />
      <line x1={ox+fw} y1={oy+fh+8} x2={ox+fw} y2={oy+fh+16} stroke="#1a3f8f" strokeWidth="1" />
      <text x={ox+fw/2} y={oy+fh+24} fontSize="9" fill="#1a3f8f" textAnchor="middle">
        Esp. sello: {fmtMm(espesorSello)} mm
      </text>

      {/* Cota profundidad poste (inferior derecha, perspectiva) */}
      <line x1={ox+fw} y1={oy+fh+38} x2={ox+fw+fd} y2={oy+fh+38-fd} stroke="#555" strokeWidth="1" />
      <text x={ox+fw+fd+8} y={oy+fh+38-fd+4} fontSize="9" fill="#555" textAnchor="start">
        Esp. poste: {fmtMm(espesorPoste)} mm
      </text>

      {/* Etiqueta distancia solapas (izquierda) */}
      <line x1={ox-18} y1={oy} x2={ox-18} y2={oy+fh*0.6} stroke="#c00" strokeWidth="1" strokeDasharray="3,2" />
      <text x={ox-22} y={oy+fh*0.3} fontSize="8" fill="#c00" textAnchor="middle"
        transform={`rotate(-90,${ox-22},${oy+fh*0.3})`}>
        DIST. SOLAPAS: {fmtMm(despliegueCortina)} mm
      </text>

      {/* Flecha marcadores reutilizables */}
      <defs>
        <marker id="arr" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto">
          <path d="M0,0 L6,3 L0,6 Z" fill="#1a3f8f" />
        </marker>
      </defs>

      {/* Título */}
      <text x={W/2} y={H-8} fontSize="11" fontWeight="bold" textAnchor="middle" fill="#333">PARAL</text>
    </svg>
  );
}

// ── Diagrama SVG de la CORTINA ────────────────────────────────────────────────
function DiagramaCortina({ cortinaAncho, cortinaLargoLona, espesorSello, selloAlto, despliegueCortina }) {
  const W = 480, H = 320;
  const margin = 50;
  const rectW = W - margin * 2;
  const rectH = H - 80;
  const rx = margin, ry = 30;

  // Doblez superior (4 cm = representado como ~8% del alto del rectángulo)
  const dobSupH = rectH * 0.07;
  // Doblez inferior (5 cm)
  const dobInfH = rectH * 0.09;
  // Bloque paral (poste) en esquina sup-izq
  const paralW = rectW * 0.10;
  const paralH = rectH * 0.50;

  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ display: "block" }}>
      {/* Cuerpo principal de la cortina */}
      <rect x={rx} y={ry} width={rectW} height={rectH} fill="#e0e0e0" stroke="#555" strokeWidth="1.5" />

      {/* Doblez superior (azul claro) */}
      <rect x={rx} y={ry} width={rectW} height={dobSupH} fill="#9ecae1" stroke="#555" strokeWidth="1" />

      {/* Doblez inferior */}
      <rect x={rx} y={ry+rectH-dobInfH} width={rectW} height={dobInfH} fill="#9ecae1" stroke="#555" strokeWidth="1" />

      {/* Bloque paral (amarillo) en esquina sup-izq */}
      <rect x={rx} y={ry+dobSupH} width={paralW} height={paralH} fill="#FFD700" stroke="#777" strokeWidth="1" />

      {/* ── Cotas ── */}
      {/* Cota ancho (inferior, horizontal) */}
      <line x1={rx} y1={ry+rectH+16} x2={rx+rectW} y2={ry+rectH+16} stroke="#1a3f8f" strokeWidth="1" />
      <line x1={rx} y1={ry+rectH+12} x2={rx} y2={ry+rectH+20} stroke="#1a3f8f" strokeWidth="1" />
      <line x1={rx+rectW} y1={ry+rectH+12} x2={rx+rectW} y2={ry+rectH+20} stroke="#1a3f8f" strokeWidth="1" />
      <text x={rx+rectW/2} y={ry+rectH+30} fontSize="9" fill="#1a3f8f" textAnchor="middle">
        LARGO: {fmtMm(cortinaAncho)} mm
      </text>

      {/* Cota alto (derecha, vertical) */}
      <line x1={rx+rectW+16} y1={ry} x2={rx+rectW+16} y2={ry+rectH} stroke="#1a3f8f" strokeWidth="1" />
      <line x1={rx+rectW+12} y1={ry} x2={rx+rectW+20} y2={ry} stroke="#1a3f8f" strokeWidth="1" />
      <line x1={rx+rectW+12} y1={ry+rectH} x2={rx+rectW+20} y2={ry+rectH} stroke="#1a3f8f" strokeWidth="1" />
      <text x={rx+rectW+28} y={ry+rectH/2+4} fontSize="9" fill="#1a3f8f" textAnchor="middle"
        transform={`rotate(90,${rx+rectW+28},${ry+rectH/2+4})`}>
        ANCHO (rollo): {fmtMm(cortinaLargoLona)} mm
      </text>

      {/* Etiqueta doblez superior */}
      <text x={rx + rectW/2} y={ry + dobSupH/2 + 3} fontSize="8" fill="#08519c" textAnchor="middle" fontWeight="bold">
        DOBLEZ SUPERIOR 4 cm
      </text>

      {/* Etiqueta doblez inferior */}
      <text x={rx + rectW/2} y={ry+rectH-dobInfH/2+3} fontSize="8" fill="#08519c" textAnchor="middle" fontWeight="bold">
        DOBLEZ INFERIOR 5 cm
      </text>

      {/* Etiqueta despliegue */}
      <line x1={rx+paralW+4} y1={ry+dobSupH} x2={rx+paralW+4} y2={ry+dobSupH+rectH*0.55}
        stroke="#c00" strokeWidth="1" strokeDasharray="3,2" />
      <text x={rx+paralW+10} y={ry+dobSupH+rectH*0.28} fontSize="8" fill="#c00"
        transform={`rotate(90,${rx+paralW+10},${ry+dobSupH+rectH*0.28})`}>
        DESPLIEGUE: {fmtMm(despliegueCortina)} mm
      </text>

      {/* Título */}
      <text x={W/2} y={H-4} fontSize="11" fontWeight="bold" textAnchor="middle" fill="#333">CORTINA</text>
    </svg>
  );
}

// ── Componente principal ───────────────────────────────────────────────────────
export default function FichaImpresionSello({ ficha, numero, onClose }) {
  const printRef = React.useRef();
  if (!ficha) return null;

  const f   = ficha;
  const med = f.medidas      || {};
  const mp  = f.materiaPrima || {};
  const cantidad = Number(f.cantidad) || 1;

  const handlePrint = () => {
    const win = window.open("", "_blank", "width=1120,height=980");
    if (!win) return;
    win.document.write(`<!DOCTYPE html><html><head>
      <meta charset="utf-8"/>
      <title>Ficha Sello Andén #${numero} — ${f.cliente || ""}</title>
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

  const tdStyle = { border: "1px solid #999", padding: "4px 7px", fontSize: "11px", verticalAlign: "middle", whiteSpace: "nowrap" };
  const thStyle = { ...tdStyle, background: "#dde3ef", fontWeight: "bold", textAlign: "center" };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-start justify-center overflow-auto py-6 px-4">
      <div className="bg-white w-full max-w-5xl rounded-xl shadow-2xl overflow-hidden">

        {/* Barra de acciones (no se imprime) */}
        <div className="flex items-center justify-between px-5 py-3 bg-gray-50 border-b print:hidden">
          <span className="text-sm font-semibold text-gray-700">Ficha #{numero} — Sello de Andén</span>
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

          {/* ── Encabezado ── */}
          <div style={{ textAlign: "center", marginBottom: "10px" }}>
            <div style={{ fontSize: "15px", fontWeight: "bold", color: "#1a3f8f" }}>COLD CHAIN SERVICES S.A.S</div>
            <div style={{ fontSize: "13px", fontWeight: "bold", color: "#1a3f8f" }}>DEPARTAMENTO DE INGENIERÍA</div>
            <div style={{ fontSize: "13px", fontWeight: "bold", color: "#1a3f8f" }}>FICHA DE FABRICACIÓN SELLOS DE ANDÉN</div>
            <div style={{ fontSize: "11px", fontWeight: "bold", marginTop: "3px" }}>
              TODAS LAS DIMENSIONES EN MILÍMETROS Y LONA 750 K
            </div>
          </div>

          {/* ── Tabla principal de datos (estructura del Excel) ── */}
          <table style={{ borderCollapse: "collapse", width: "100%", marginBottom: "12px" }}>
            <tbody>

              {/* Fila 1: Fecha Orden / Cliente */}
              <tr>
                <td style={{ ...tdStyle, background: "#f0f0f0", fontWeight: "bold", width: "18%" }}>FECHA ORDEN:</td>
                <td style={{ ...tdStyle, width: "13%" }}>{fmtDate(f.fechaOrden)}</td>
                <td style={{ ...tdStyle, background: "#f0f0f0", fontWeight: "bold", textAlign: "center", width: "10%" }}>CLIENTE</td>
                <td style={{ ...tdStyle, fontWeight: "bold", fontStyle: "italic", textAlign: "center", width: "19%" }}>{f.cliente || "—"}</td>
                <td style={{ ...tdStyle, background: "#f0f0f0", fontWeight: "bold", textAlign: "center", width: "20%", borderLeft: "2px solid #888" }} colSpan={2}></td>
              </tr>

              {/* Fila 2: Fecha Entrega / Cantidad / Material */}
              <tr>
                <td style={{ ...tdStyle, background: "#f0f0f0", fontWeight: "bold" }}>FECHA ENTREGA:</td>
                <td style={{ ...tdStyle }}>{fmtDate(f.fechaEntrega)}</td>
                <td style={{ ...tdStyle, background: "#f0f0f0", fontWeight: "bold", textAlign: "center" }}>CANTIDAD</td>
                <td style={{ ...tdStyle, fontWeight: "bold", fontStyle: "italic", textAlign: "center" }}>{f.cantidad}</td>
                <td style={{ ...tdStyle, background: "#f0f0f0", fontWeight: "bold", textAlign: "center", borderLeft: "2px solid #888" }}>MATERIAL BASE</td>
                <td style={{ ...tdStyle, fontWeight: "bold", fontStyle: "italic", textAlign: "center" }}>{f.materialBase}</td>
              </tr>

              {/* Fila 3: Medidas Vano */}
              <tr>
                <td style={{ ...tdStyle, background: "#f0f0f0", fontWeight: "bold" }}>MEDIDAS VANO</td>
                <td style={{ ...tdStyle, background: "#f0f0f0", fontWeight: "bold", textAlign: "center" }}>ANCHO</td>
                <td style={{ ...tdStyle, fontWeight: "bold", textAlign: "center" }}>{fmtMm(f.anchoVano)}</td>
                <td style={{ ...tdStyle, background: "#f0f0f0", fontWeight: "bold", textAlign: "center" }}>ALTO</td>
                <td style={{ ...tdStyle, fontWeight: "bold", textAlign: "center" }}>{fmtMm(f.altoVano)}</td>
                <td style={{ ...tdStyle, background: "#f0f0f0", fontWeight: "bold", textAlign: "center", borderLeft: "2px solid #888" }}>FACT</td>
                <td style={{ ...tdStyle, fontWeight: "bold", fontStyle: "italic", textAlign: "center" }}>{f.fact || "SI"}</td>
              </tr>

              {/* Fila 4: Medidas Sello */}
              <tr>
                <td style={{ ...tdStyle, background: "#f0f0f0", fontWeight: "bold" }}>MEDIDAS SELLO</td>
                <td style={{ ...tdStyle, background: "#f0f0f0", fontWeight: "bold", textAlign: "center" }}>ANCHO</td>
                <td style={{ ...tdStyle, fontWeight: "bold", textAlign: "center" }}>{fmtMm(med.selloAncho)}</td>
                <td style={{ ...tdStyle, background: "#f0f0f0", fontWeight: "bold", textAlign: "center" }}>ALTO</td>
                <td style={{ ...tdStyle, fontWeight: "bold", textAlign: "center" }}>{fmtMm(med.selloAlto)}</td>
                <td style={{ ...tdStyle, background: "#f0f0f0", fontWeight: "bold", textAlign: "center", borderLeft: "2px solid #888" }}>ESPESOR</td>
                <td style={{ ...tdStyle, fontWeight: "bold", fontStyle: "italic", textAlign: "center" }}>{fmtMm(f.espesorSello)}</td>
              </tr>

              {/* Fila 5: Medidas Espuma de Postes */}
              <tr>
                <td style={{ ...tdStyle, background: "#f0f0f0", fontWeight: "bold" }}>MEDIDAS ESPUMA DE POSTES</td>
                <td style={{ ...tdStyle, background: "#f0f0f0", fontWeight: "bold", textAlign: "center" }}>ANCHO</td>
                <td style={{ ...tdStyle, fontWeight: "bold", textAlign: "center" }}>{fmtMm(med.espumaPostesAncho)}</td>
                <td style={{ ...tdStyle, background: "#f0f0f0", fontWeight: "bold", textAlign: "center" }}>ALTO</td>
                <td style={{ ...tdStyle, fontWeight: "bold", textAlign: "center" }}>{fmtMm(med.espumaPostesAlto)}</td>
                <td style={{ ...tdStyle, background: "#f0f0f0", fontWeight: "bold", textAlign: "center", borderLeft: "2px solid #888" }}>ESPESOR</td>
                <td style={{ ...tdStyle, fontWeight: "bold", fontStyle: "italic", textAlign: "center" }}>{fmtMm(f.espesorPoste)}</td>
              </tr>

              {/* Fila 6: Tapa Superior */}
              <tr>
                <td style={{ ...tdStyle, background: "#f0f0f0", fontWeight: "bold" }}>MEDIDAS TAPA DE POSTES SUPERIOR</td>
                <td style={{ ...tdStyle, background: "#f0f0f0", fontWeight: "bold", textAlign: "center" }}>ANCHO</td>
                <td style={{ ...tdStyle, fontWeight: "bold", textAlign: "center" }}>{fmtMm(med.tapaSuperiorAncho)}</td>
                <td style={{ ...tdStyle, background: "#f0f0f0", fontWeight: "bold", textAlign: "center" }}>LARGO</td>
                <td style={{ ...tdStyle, fontWeight: "bold", textAlign: "center" }}>{fmtMm(med.tapaSuperiorLargo)}</td>
                <td style={{ ...tdStyle, background: "#f0f0f0", fontWeight: "bold", textAlign: "center", borderLeft: "2px solid #888" }}>CANTIDAD</td>
                <td style={{ ...tdStyle, fontWeight: "bold", fontStyle: "italic", textAlign: "center" }}>2</td>
              </tr>

              {/* Fila 7: Tapa Inferior */}
              <tr>
                <td style={{ ...tdStyle, background: "#f0f0f0", fontWeight: "bold" }}>MEDIDAS TAPA DE POSTES INFERIOR (AGUJERO)</td>
                <td style={{ ...tdStyle, background: "#f0f0f0", fontWeight: "bold", textAlign: "center" }}>ANCHO</td>
                <td style={{ ...tdStyle, fontWeight: "bold", textAlign: "center" }}>{fmtMm(med.tapaInferiorAncho)}</td>
                <td style={{ ...tdStyle, background: "#f0f0f0", fontWeight: "bold", textAlign: "center" }}>LARGO</td>
                <td style={{ ...tdStyle, fontWeight: "bold", textAlign: "center" }}>{fmtMm(med.tapaInferiorLargo)}</td>
                <td style={{ ...tdStyle, background: "#f0f0f0", fontWeight: "bold", textAlign: "center", borderLeft: "2px solid #888" }}>CANTIDAD</td>
                <td style={{ ...tdStyle, fontWeight: "bold", fontStyle: "italic", textAlign: "center" }}>2</td>
              </tr>

              {/* Fila 8: Forros y Chalecos */}
              <tr>
                <td style={{ ...tdStyle, background: "#f0f0f0", fontWeight: "bold" }}>CORTE DE LONA POSTES (FORROS Y CHALECOS)</td>
                <td style={{ ...tdStyle, background: "#f0f0f0", fontWeight: "bold", textAlign: "center" }}>ANCHO</td>
                <td style={{ ...tdStyle, fontWeight: "bold", textAlign: "center" }}>{fmtMm(med.forroAncho)}</td>
                <td style={{ ...tdStyle, background: "#f0f0f0", fontWeight: "bold", textAlign: "center" }}>LARGO</td>
                <td style={{ ...tdStyle, fontWeight: "bold", textAlign: "center" }}>{fmtMm(med.forroLargo)}</td>
                <td style={{ ...tdStyle, background: "#f0f0f0", fontWeight: "bold", textAlign: "center", borderLeft: "2px solid #888" }}>FORMA DE CUÑA</td>
                <td style={{ ...tdStyle, fontWeight: "bold", fontStyle: "italic", textAlign: "center" }}>{f.formaCuna || "NO"}</td>
              </tr>

              {/* Fila 9: Cortina */}
              <tr>
                <td style={{ ...tdStyle, background: "#f0f0f0", fontWeight: "bold" }}>CORTINA</td>
                <td style={{ ...tdStyle, fontWeight: "bold", fontStyle: "italic", textAlign: "center", background: f.llevaCortina ? "#fffde7" : "white" }}>
                  {f.llevaCortina ? "SÍ" : "NO"}
                </td>
                <td style={{ ...tdStyle, background: "#f0f0f0", fontWeight: "bold", textAlign: "center" }}>LARGO</td>
                <td style={{ ...tdStyle, fontWeight: "bold", textAlign: "center" }}>
                  {f.llevaCortina ? fmtMm(med.cortinaAncho) : "—"}
                </td>
                <td style={{ ...tdStyle, background: "#f0f0f0", fontWeight: "bold", textAlign: "center" }}>ANCHO</td>
                <td style={{ ...tdStyle, fontWeight: "bold", textAlign: "center" }}>
                  {f.llevaCortina ? fmtMm(med.cortinaLargoLona) : "—"}
                </td>
                <td style={{ ...tdStyle, background: "#f0f0f0", fontWeight: "bold", textAlign: "center", borderLeft: "2px solid #888" }}>DESPLIEGUE CORTINA</td>
                <td style={{ ...tdStyle, fontWeight: "bold", textAlign: "center" }}>
                  {f.llevaCortina ? fmtMm(f.despliegueCortina) : "—"}
                </td>
              </tr>

              {/* Fila 10: Travesaño */}
              <tr>
                <td style={{ ...tdStyle, background: "#f0f0f0", fontWeight: "bold" }}>TRAVESAÑO</td>
                <td style={{ ...tdStyle, fontWeight: "bold", fontStyle: "italic", textAlign: "center", background: f.llevaTravesano ? "#fffde7" : "white" }}>
                  {f.llevaTravesano ? "SÍ" : "NO"}
                </td>
                <td style={{ ...tdStyle, background: "#f0f0f0", fontWeight: "bold", textAlign: "center" }}>LARGO</td>
                <td style={{ ...tdStyle, fontWeight: "bold", textAlign: "center" }}>
                  {f.llevaTravesano ? fmtMm(med.travesanoAncho) : "—"}
                </td>
                <td style={{ ...tdStyle, background: "#f0f0f0", fontWeight: "bold", textAlign: "center" }}>LARGO LONA</td>
                <td style={{ ...tdStyle, fontWeight: "bold", textAlign: "center" }}>
                  {f.llevaTravesano ? fmtMm(med.travesanoLargoLona) : "—"}
                </td>
                <td style={{ ...tdStyle, background: "#f0f0f0", fontWeight: "bold", textAlign: "center", borderLeft: "2px solid #888" }}>BANDA LATERAL</td>
                <td style={{ ...tdStyle, fontStyle: "italic", textAlign: "center" }}>{f.bandaLateral || ""}</td>
              </tr>

              {/* Fila 11: Sello Abrigo */}
              <tr>
                <td style={{ ...tdStyle, background: "#f0f0f0", fontWeight: "bold" }}>SELLO ABRIGO</td>
                <td style={{ ...tdStyle, fontWeight: "bold", fontStyle: "italic", textAlign: "center" }}>
                  {f.selloAbrigo || "NO"}
                </td>
                <td style={{ ...tdStyle, background: "#f0f0f0", fontWeight: "bold", textAlign: "center" }}>DIMENSIONES CUÑA</td>
                <td style={{ ...tdStyle }} colSpan={2}></td>
                <td style={{ ...tdStyle, background: "#f0f0f0", fontWeight: "bold", textAlign: "center", borderLeft: "2px solid #888" }}>BANDA SUPERIOR</td>
                <td style={{ ...tdStyle, fontStyle: "italic", textAlign: "center" }} colSpan={2}>{f.bandaSuperior || ""}</td>
              </tr>

            </tbody>
          </table>

          {/* Nota dobleces */}
          <div style={{ textAlign: "right", fontSize: "10px", fontWeight: "bold", marginBottom: "10px", color: "#555" }}>
            DOBLEZ SUPERIOR DE 4 CM
          </div>

          {/* ── Sección diagramas ── */}
          <div style={{ display: "flex", gap: "12px", justifyContent: "space-around", alignItems: "flex-start", marginBottom: "10px" }}>
            <div style={{ textAlign: "center" }}>
              <DiagramaParal
                espesorSello={f.espesorSello}
                espesorPoste={f.espesorPoste}
                selloAlto={med.selloAlto}
                despliegueCortina={f.despliegueCortina || 800}
              />
            </div>
            {f.llevaCortina && (
              <div style={{ textAlign: "center", flex: 1 }}>
                <DiagramaCortina
                  cortinaAncho={med.cortinaAncho}
                  cortinaLargoLona={med.cortinaLargoLona}
                  espesorSello={f.espesorSello}
                  selloAlto={med.selloAlto}
                  despliegueCortina={f.despliegueCortina || 800}
                />
              </div>
            )}
          </div>

          {/* Nota inferior dobleces */}
          <div style={{ textAlign: "right", fontSize: "10px", fontWeight: "bold", marginBottom: "12px", color: "#555" }}>
            DOBLEZ INFERIOR DE 5 CM
          </div>

          {/* ── Tabla de consumo de materia prima ── */}
          <table style={{ borderCollapse: "collapse", width: "100%", marginBottom: "10px" }}>
            <thead>
              <tr>
                {["INSUMO", "UNIDAD", "FÓRMULA (REFERENCIA)", `POR SELLO`, `TOTAL × ${cantidad}`].map((h) => (
                  <th key={h} style={{
                    ...thStyle,
                    textAlign: h === "INSUMO" || h.startsWith("FÓRMULA") ? "left" : "center",
                    background: "#1a3f8f", color: "white",
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {insumos.map(({ label, unit, cu, tot, formula }, i) => (
                <tr key={label} style={{ background: i % 2 === 0 ? "white" : "#f8f8f8" }}>
                  <td style={{ ...tdStyle, fontWeight: "600" }}>{label}</td>
                  <td style={{ ...tdStyle, textAlign: "center", color: "#555" }}>{unit}</td>
                  <td style={{ ...tdStyle, color: "#555", fontSize: "10px" }}>{formula}</td>
                  <td style={{ ...tdStyle, textAlign: "center", fontFamily: "monospace", fontWeight: "bold" }}>{cu}</td>
                  <td style={{ ...tdStyle, textAlign: "center", fontFamily: "monospace", fontWeight: "bold", color: "#1d4ed8" }}>{tot}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* ── Footer ── */}
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "9px", color: "#777", borderTop: "1px solid #ccc", paddingTop: "5px" }}>
            <span>COLD CHAIN SERVICES S.A.S. — FICHA DE FABRICACIÓN SELLOS DE ANDÉN</span>
            <span>Ficha #{numero || "—"} · {fmtDate(new Date().toISOString())}</span>
          </div>

        </div>
      </div>
    </div>
  );
}
