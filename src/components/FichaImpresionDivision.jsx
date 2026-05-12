import React from "react";

// Convierte mm → metros con 2 decimales, usando redondeo estándar (mismo que Excel)
const toM = (mm) => {
  if (mm == null) return "—";
  return (Math.round(Number(mm) / 10) / 100).toFixed(2);
};

const fmt1 = (n) => (n == null ? "—" : Number(n).toFixed(1));

// ─── Estilos inline (self-contained para window.print) ────────────────────────
const S = {
  table:  { width: "100%", borderCollapse: "collapse", fontFamily: "Arial, sans-serif", fontSize: "11px" },
  hdr:    { border: "1px solid #000", padding: "4px 6px", backgroundColor: "#d9d9d9", fontWeight: "bold", textAlign: "center", verticalAlign: "middle" },
  val:    { border: "1px solid #000", padding: "4px 6px", textAlign: "center", verticalAlign: "middle" },
  valI:   { border: "1px solid #000", padding: "4px 6px", textAlign: "center", verticalAlign: "middle", fontWeight: "bold", fontStyle: "italic" },
  logoTd: { border: "1px solid #000", padding: "6px 8px", textAlign: "center", verticalAlign: "middle" },
  titleTd:{ border: "1px solid #000", padding: "4px 8px", textAlign: "center", verticalAlign: "middle" },
  fichaTd:{ border: "1px solid #000", padding: "4px 8px", textAlign: "right",  verticalAlign: "middle" },
  big:    { color: "#1a3f8f", fontWeight: "bold", fontSize: "22px" },
  blue:   { color: "#1a3f8f", fontWeight: "bold" },
  distV:  { border: "1px solid #000", padding: "6px", textAlign: "center", verticalAlign: "middle", fontWeight: "bold", fontSize: "14px" },
  red:    { color: "#cc0000", fontWeight: "bold", textDecoration: "underline" },
};

export default function FichaImpresionDivision({ ficha, numero, onClose }) {
  const printRef = React.useRef();

  if (!ficha) return null;
  const f   = ficha;
  const med = f.medidas || {};

  const handlePrint = () => {
    const win = window.open("", "_blank", "width=1000,height=800");
    if (!win) return;
    win.document.write(`<!DOCTYPE html><html><head>
      <meta charset="utf-8"/>
      <title>Ficha División Térmica #${numero} — ${f.cliente || ""}</title>
      <style>
        body { margin: 8mm; font-family: Arial, sans-serif; }
        @media print { body { margin: 5mm; } }
      </style>
    </head><body>${printRef.current.innerHTML}</body></html>`);
    win.document.close();
    setTimeout(() => { win.focus(); win.print(); }, 300);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-start justify-center overflow-auto py-6">
      <div className="bg-white w-full max-w-5xl mx-4 rounded shadow-xl">

        {/* Barra de acciones (no se imprime) */}
        <div className="flex items-center justify-between px-4 py-2 bg-gray-100 border-b rounded-t-xl print:hidden">
          <span className="text-sm font-medium text-gray-700">
            Ficha #{numero} — División Térmica
          </span>
          <div className="flex gap-2">
            <button onClick={handlePrint}
              className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-sm rounded font-medium">
              Imprimir / PDF
            </button>
            <button onClick={onClose}
              className="px-4 py-1.5 bg-gray-200 hover:bg-gray-300 text-gray-700 text-sm rounded">
              Cerrar
            </button>
          </div>
        </div>

        {/* Contenido imprimible */}
        <div className="p-4" ref={printRef}>
          <table style={S.table}>
            <tbody>

              {/* ── Encabezado ── */}
              <tr>
                <td colSpan={3} style={S.logoTd}>
                  <div style={{ ...S.blue, fontSize: "13px" }}>COLD CHAIN</div>
                  <div style={{ ...S.blue, fontSize: "10px" }}>SERVICES</div>
                </td>
                <td colSpan={6} style={S.titleTd}>
                  <div style={{ ...S.blue, fontSize: "13px" }}>
                    DEPARTAMENTO DE INGENIERIA COLD CHAIN SERVICES S.A.S
                  </div>
                  <div style={{ ...S.blue, fontSize: "12px", marginTop: 2 }}>
                    FICHA DE FABRICACION DIVISIONES TERMICAS
                  </div>
                </td>
                <td colSpan={3} style={S.fichaTd}>
                  <div style={{ fontSize: "10px", color: "#555" }}>MENU</div>
                  <div style={S.big}>FICHA &nbsp;# &nbsp;{numero || "—"}</div>
                </td>
              </tr>

              {/* ── Fecha orden / Cliente / Placa ── */}
              <tr>
                <td colSpan={3} style={S.hdr}>FECHA ORDEN:</td>
                <td colSpan={2} style={S.val}>
                  {f.fechaOrden ? new Date(f.fechaOrden).toLocaleDateString("es-CO") : "—"}
                </td>
                <td colSpan={1} style={S.hdr}>CLIENTE</td>
                <td colSpan={4} style={{ ...S.valI, fontSize: "14px" }}>{f.cliente || "—"}</td>
                <td colSpan={2} style={S.hdr}>PLACA</td>
              </tr>

              {/* ── Fecha entrega / Cantidad / Placa / Logo ── */}
              <tr>
                <td colSpan={3} style={S.hdr}>FECHA ENTREGA:</td>
                <td colSpan={2} style={S.val}>
                  {f.fechaEntrega ? new Date(f.fechaEntrega).toLocaleDateString("es-CO") : "—"}
                </td>
                <td colSpan={1} style={S.hdr}>CANTIDAD</td>
                <td colSpan={1} style={S.valI}>{f.cantidad}</td>
                <td colSpan={1} style={S.hdr}>PLACA</td>
                <td colSpan={1} style={S.valI}>{f.placa}</td>
                <td colSpan={1} style={S.hdr}>LOGO</td>
                <td colSpan={2} style={S.valI}>{f.logo}</td>
              </tr>

              {/* ── Medidas del vehículo / Agujero ── */}
              <tr>
                <td colSpan={3} style={S.hdr}>MEDIDAS VEHICULO</td>
                <td colSpan={1} style={S.hdr}>ANCHO:</td>
                <td colSpan={1} style={S.valI}>{toM(f.anchoVehiculo)}</td>
                <td colSpan={1} style={S.hdr}>ALTO:</td>
                <td colSpan={1} style={S.valI}>{toM(f.altoVehiculo)}</td>
                <td colSpan={2} style={S.hdr}>AGUJERO</td>
                <td colSpan={4} style={S.valI}>{f.agujero}</td>
              </tr>

              {/* ── Medidas icopor / Policarbonato ALTO ── */}
              <tr>
                <td colSpan={3} style={S.hdr}>MEDIDAS ICOPOR</td>
                <td colSpan={1} style={S.hdr}>ANCHO:</td>
                <td colSpan={1} style={S.val}>{toM(med.icopor?.ancho)}</td>
                <td colSpan={1} style={S.hdr}>ALTO</td>
                <td colSpan={1} style={S.val}>{toM(med.icopor?.alto)}</td>
                <td colSpan={2} rowSpan={2} style={S.hdr}>
                  MEDIDAS POLICARBONATO<br />Y CARTONPLAST
                </td>
                <td colSpan={1} style={S.hdr}>ALTO</td>
                <td colSpan={2} style={S.val}>{toM(med.policarbonato?.alto)}</td>
              </tr>

              {/* ── Medidas panel / Policarbonato ANCHO ── */}
              <tr>
                <td colSpan={3} style={S.hdr}>MEDIDAS FINALES DE PANEL</td>
                <td colSpan={1} style={S.hdr}>ANCHO:</td>
                <td colSpan={1} style={S.val}>{toM(med.panel?.ancho)}</td>
                <td colSpan={1} style={S.hdr}>ALTO</td>
                <td colSpan={1} style={S.val}>{toM(med.panel?.alto)}</td>
                {/* rowspan de arriba ocupa cols 8-9 */}
                <td colSpan={1} style={S.hdr}>ANCHO</td>
                <td colSpan={2} style={S.val}>{toM(med.policarbonato?.ancho)}</td>
              </tr>

              {/* ── Medidas funda / Títulos de piso y tiras ── */}
              <tr>
                <td colSpan={3} style={S.hdr}>MEDIDAS DE FUNDA</td>
                <td colSpan={1} style={S.hdr}>ANCHO:</td>
                <td colSpan={1} style={S.val}>{toM(med.funda?.ancho)}</td>
                <td colSpan={1} style={S.hdr}>ALTO</td>
                <td colSpan={1} style={S.val}>{toM(med.funda?.alto)}</td>
                <td colSpan={2} style={S.hdr}>MEDIDA PISO</td>
                <td colSpan={4} style={S.hdr}>CANTIDAD TIRAS M</td>
              </tr>

              {/* ── Espuma / Piso / Tiras ── */}
              <tr>
                <td colSpan={3} style={S.hdr}>MEDIDAS DE ESPUMA</td>
                <td colSpan={1} style={S.hdr}>CABEZA</td>
                <td colSpan={1} style={S.valI}>8</td>
                <td colSpan={1} style={S.hdr}>LATERALES</td>
                <td colSpan={1} style={S.valI}>4 Y 4</td>
                <td colSpan={1} style={S.val}>{toM(med.medidaPiso)}</td>
                <td colSpan={1} style={S.val}>{med.lona?.tiras ?? "—"}</td>
                <td colSpan={1} style={S.val}>{toM(med.lona?.largoTira)}</td>
                <td colSpan={1} style={S.val}>1</td>
                <td colSpan={1} style={S.val}>{toM(med.lona?.sobranteAncho)}</td>
              </tr>

              {/* ── Platinas / FT / Color lona ── */}
              <tr>
                <td colSpan={1} style={S.hdr}>PLATINAS</td>
                <td colSpan={1} style={S.valI}>{f.platinas}</td>
                <td colSpan={1} style={S.hdr}>FT</td>
                <td colSpan={1} style={S.valI}>{f.ft || "NO"}</td>
                <td colSpan={3} style={S.hdr}>Color lona:</td>
                <td colSpan={5} style={S.valI}>{f.colorLona}</td>
              </tr>

              {/* ── Distancia platinas / Distancia ventana ── */}
              <tr>
                <td colSpan={3} style={S.hdr}>DISTACIA PLATINAS</td>
                <td colSpan={1} style={S.val}>{/* cálculo pendiente */}</td>
                <td colSpan={4} style={S.distV}>DISTANCIA VENTANA</td>
                <td colSpan={2} style={{ ...S.val, fontWeight: "bold", fontSize: "14px" }}>
                  {med.distanciaVentana != null ? fmt1(med.distanciaVentana) : "—"}
                </td>
                <td colSpan={2} style={S.val}></td>
              </tr>

              {/* ── Footer ── */}
              <tr>
                <td colSpan={2} style={{ ...S.val, padding: "8px 6px" }}>
                  <span style={{ border: "1px solid #999", padding: "3px 12px", cursor: "pointer" }}>COSTO</span>
                </td>
                <td colSpan={7} style={{ ...S.val, textAlign: "left" }}>
                  <strong>ADICIONAL:</strong> {f.adicional || ""}
                </td>
                <td colSpan={3} style={{ ...S.val, textAlign: "right" }}>
                  <span style={S.red}>AÑADIR DIVISION</span>
                </td>
              </tr>

            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
