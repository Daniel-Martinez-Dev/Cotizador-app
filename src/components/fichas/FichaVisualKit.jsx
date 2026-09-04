import React from "react";
import { fmtMm } from "../../utils/fichaFormat";
import { ETAPAS, ETAPAS_FIRMA, fechaFirmaTexto, firmasDeFicha } from "../../utils/firmasFicha";

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
            <div style={{ fontSize: "9.5px", color: "#000000", fontWeight: "600", textTransform: "uppercase", marginBottom: "1px" }}>{dim}</div>
            <div style={{ fontSize: "18px", fontWeight: "bold", fontFamily: "monospace", color, lineHeight: 1 }}>{fmtMm(val)}</div>
            <div style={{ fontSize: "9.5px", color: "#000000", fontWeight: "600", marginTop: "1px" }}>mm</div>
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
      <div style={{ fontSize: "9.5px", color: "#000000", fontWeight: "600", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "2px" }}>{label}</div>
      <div style={{ fontSize: "13px", fontWeight: "700", color: highlight ? "#1e3a8a" : "#000000" }}>{value}</div>
    </div>
  );
}

// Tarjeta de acabado — mismo lenguaje visual que MedidaCard, para que las
// secciones de "Opciones y Acabados" tengan el mismo peso visual que las medidas.
export function AcabadoCard({ label, value, color, active }) {
  return (
    <div style={{ background: "white", border: `2px solid ${active ? color : "#334155"}`, borderRadius: "8px", overflow: "hidden" }}>
      <div style={{
        background: active ? color : "#334155", color: "white", fontSize: "11px", fontWeight: "bold",
        textAlign: "center", padding: "4px 7px", textTransform: "uppercase", letterSpacing: "0.5px",
      }}>
        {label}
      </div>
      <div style={{ padding: "8px 6px", textAlign: "center" }}>
        <div style={{ fontSize: "16px", fontWeight: "bold", color: active ? color : "#000000", lineHeight: 1.2 }}>{value}</div>
      </div>
    </div>
  );
}

// Recuadro vacío para marcar con X sobre la ficha impresa (listas de empaque,
// alistamiento, chequeos). Es un cuadro y no un carácter tipográfico para que
// salga igual en pantalla, en el PDF y en la imagen que se pega en el chat.
export function Casilla({ tamano = "14px" }) {
  return (
    <span style={{
      display: "inline-block", width: tamano, height: tamano,
      border: "1.5px solid #000000", borderRadius: "3px",
      background: "#ffffff", flexShrink: 0,
    }} />
  );
}

export function SectionTitle({ children, size = "11.5px" }) {
  return (
    <div style={{
      fontSize: size, fontWeight: "bold", textTransform: "uppercase",
      letterSpacing: "0.8px", color: "#000000",
      borderBottom: "2px solid #000000", paddingBottom: "5px", marginBottom: "8px",
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
      <div style={{ color: "#ffffff", fontSize: "11px", fontWeight: "bold", textTransform: "uppercase", letterSpacing: "1px" }}>
        {label}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: "18px" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ color: "white", fontSize: "32px", fontWeight: "bold", fontFamily: "monospace", lineHeight: 1 }}>{fmtMm(ancho)}</div>
          <div style={{ color: "rgba(255,255,255,0.95)", fontSize: "9px", fontWeight: "600", textTransform: "uppercase", letterSpacing: "0.5px" }}>{unidadAncho}</div>
        </div>
        <div style={{ color: "rgba(255,255,255,0.8)", fontSize: "22px", fontWeight: "300" }}>×</div>
        <div style={{ textAlign: "center" }}>
          <div style={{ color: "white", fontSize: "32px", fontWeight: "bold", fontFamily: "monospace", lineHeight: 1 }}>{fmtMm(alto)}</div>
          <div style={{ color: "rgba(255,255,255,0.95)", fontSize: "9px", fontWeight: "600", textTransform: "uppercase", letterSpacing: "0.5px" }}>{unidadAlto}</div>
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
// `nombre` es el detalle libre de la ficha ("Zona 3", "Muelle 7"). Va pegado al
// consecutivo y no debajo: es lo primero que se busca al levantar la hoja de la
// mesa, y en horizontal no le cuesta alto a la hoja (la ficha entra en una sola
// carta, ver utils/hojaImpresion.js). Marco negro y letra negra sobre blanco —
// en papel no se imprimen fondos de color.
export function Membrete({ logoSrc, tituloFicha, numero, nombre, numeroLabel = "N.° ficha de producción", subtitulo = "Todas las dimensiones en milímetros" }) {
  return (
    <div style={{
      background: "white", padding: "10px 20px 8px", borderBottom: "3px solid #1a3f8f",
      display: "flex", justifyContent: "space-between", alignItems: "center", gap: "14px",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: "12px", minWidth: 0 }}>
        <img src={logoSrc} alt="Cold Chain Services" style={{ height: "36px", width: "auto", objectFit: "contain", flexShrink: 0 }} />
        <div style={{ borderLeft: "1px solid #e2e8f0", paddingLeft: "12px" }}>
          <div style={{ fontSize: "9px", color: "#000000", textTransform: "uppercase", letterSpacing: "1px", fontWeight: "bold" }}>
            Departamento de Ingeniería
          </div>
          <div style={{ fontSize: "15px", color: "#1a3f8f", fontWeight: "bold", marginTop: "1px" }}>
            {tituloFicha}
          </div>
          <div style={{ fontSize: "9px", color: "#000000", marginTop: "1px" }}>
            {subtitulo}
          </div>
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "flex-end", gap: "10px", flexShrink: 0 }}>
        {nombre && <DetalleFicha nombre={nombre} />}
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: "9px", color: "#000000", textTransform: "uppercase", letterSpacing: "1.5px", fontWeight: "bold" }}>
            {numeroLabel}
          </div>
          <div style={{
            background: "linear-gradient(135deg, #1a3f8f 0%, #0b4a7d 100%)",
            color: "white", fontSize: "21px", fontWeight: "bold", lineHeight: 1,
            fontFamily: "monospace", padding: "6px 14px", borderRadius: "8px",
            letterSpacing: "0.5px", marginTop: "3px", whiteSpace: "nowrap",
          }}>
            {numero ?? "—"}
          </div>
        </div>
      </div>
    </div>
  );
}

// Rótulo del detalle de la ficha, para el membrete y para las fichas que arman
// su encabezado a mano (Sello de Andén). Solo se pinta si la ficha lo tiene: es
// un campo opcional y una etiqueta vacía en la hoja no dice nada.
export function DetalleFicha({ nombre }) {
  if (!nombre) return null;
  return (
    <div style={{
      border: "2px solid #000000", borderRadius: "8px", padding: "4px 12px",
      background: "#ffffff", maxWidth: "230px", textAlign: "right",
    }}>
      <div style={{ fontSize: "8.5px", color: "#000000", textTransform: "uppercase", letterSpacing: "1.2px", fontWeight: "bold" }}>
        Detalle
      </div>
      <div style={{ fontSize: "17px", color: "#000000", fontWeight: "bold", lineHeight: 1.15, wordBreak: "break-word" }}>
        {nombre}
      </div>
    </div>
  );
}

// Bloque de firmas y trazabilidad — obligatorio al pie de TODAS las fichas /
// órdenes de producción.
//
// Las dos filas de responsables ya no se diligencian a mano: las cierra la app
// al cambiar de estado (alistado y empacado → "Terminada", revisado y aprobado
// → "Entregada", ver firmasFicha.js) y aquí salen impresos los nombres con su
// fecha. La línea se conserva encima de cada nombre para que la persona firme
// sobre ella: la ficha vale como constancia física.
//
// Mientras una etapa no se haya firmado se imprimen los espacios en blanco de
// siempre, para no dejar sin formato las fichas que se imprimen antes de
// cerrarse.
const ELABORADA_POR = "ING. DANIEL F. MARTÍNEZ";

const rotuloFirma = {
  fontSize: "9px", color: "#000000", fontWeight: "bold",
  textTransform: "uppercase", letterSpacing: "0.6px",
};

// Un espacio de firma: lo que va encima de la línea (cuando ya se registró) y
// el rótulo debajo — el nombre de quien firma, o "Firma N" si está en blanco.
//
// Encima de la línea va la firma que la persona dibujó en su perfil, si la
// tiene. Quien no la tiene deja la línea libre para firmar a mano sobre el
// papel, que es como se venía haciendo: el nombre impreso debajo vale igual.
//
// La firma es un data URI, no un enlace: la ficha se rasteriza metiendo su HTML
// dentro de un <svg><foreignObject> (ver fichaImagen.js) y ahí dentro una imagen
// externa no llega a cargar, así que saldría en blanco en el PDF y en la imagen
// que se comparte.
function CampoFirma({ caption, valor, firma, resaltado }) {
  return (
    <div>
      <div style={{
        borderBottom: "1px solid #000000", height: "24px",
        display: "flex", alignItems: "flex-end", justifyContent: "center",
        fontSize: "10px", fontWeight: "bold", color: "#000000",
        paddingBottom: "2px", whiteSpace: "nowrap", overflow: "hidden",
      }}>
        {firma
          ? <img src={firma} alt="" style={{ maxHeight: "22px", maxWidth: "100%", objectFit: "contain" }} />
          : valor || ""}
      </div>
      <div style={{
        ...rotuloFirma,
        fontSize: "8.5px",
        color: "#000000",
        marginTop: "2px",
        fontWeight: resaltado ? "bold" : "normal",
        wordBreak: "break-word",
      }}>
        {caption}
      </div>
    </div>
  );
}

// Una fila de responsables: un espacio por persona que firmó (o los espacios en
// blanco del formato si todavía no se cierra) + la fecha.
function FilaFirmas({ titulo, espacios, firma }) {
  const personas = firma?.personas || [];
  const firmado = personas.length > 0;
  const celdas = firmado ? personas : Array.from({ length: espacios }, () => null);

  return (
    <div style={{ padding: "5px 12px 6px", borderBottom: "1px solid #000000" }}>
      <div style={rotuloFirma}>{titulo}</div>
      <div style={{
        display: "grid", gridTemplateColumns: `repeat(${celdas.length}, 1fr) 0.9fr`,
        gap: "14px", marginTop: "3px",
      }}>
        {celdas.map((persona, i) => (
          <CampoFirma
            key={i}
            caption={firmado ? persona.nombre : `Firma ${i + 1}`}
            firma={persona?.firma}
            resaltado={firmado}
          />
        ))}
        <CampoFirma caption="Fecha" valor={firmado ? fechaFirmaTexto(firma.fecha) : ""} />
      </div>
    </div>
  );
}

export function Firmas({ ficha, padX = "20px" }) {
  const firmas = firmasDeFicha(ficha);

  return (
    <div style={{ padding: `4px ${padX} 10px` }}>
      <div style={{ border: "1px solid #000000", borderRadius: "8px", overflow: "hidden" }}>
        <div style={{
          display: "flex", alignItems: "baseline", gap: "8px",
          background: "#f1f5f9", padding: "5px 12px", borderBottom: "1px solid #000000",
        }}>
          <span style={rotuloFirma}>Ficha elaborada por</span>
          <span style={{ fontSize: "12px", fontWeight: "bold", color: "#000000", letterSpacing: "0.3px" }}>
            {ELABORADA_POR}
          </span>
        </div>

        {ETAPAS.map((etapa) => (
          <FilaFirmas
            key={etapa}
            titulo={ETAPAS_FIRMA[etapa].titulo}
            espacios={ETAPAS_FIRMA[etapa].espacios}
            firma={firmas[etapa]}
          />
        ))}

        <div style={{ display: "flex", alignItems: "flex-end", gap: "12px", padding: "6px 12px 7px" }}>
          <span style={{ ...rotuloFirma, whiteSpace: "nowrap", paddingBottom: "3px" }}>Fecha y hora de despacho</span>
          <div style={{ flex: 1, borderBottom: "1px solid #000000", height: "22px" }} />
        </div>
      </div>
    </div>
  );
}

// Pie de página — idéntico en las tres fichas.
export function FichaFooter({ texto, numero, fecha }) {
  return (
    <div style={{
      background: "#f1f5f9", borderTop: "2px solid #000000",
      padding: "6px 20px", display: "flex", justifyContent: "space-between", alignItems: "center",
    }}>
      <div style={{ fontSize: "10px", color: "#000000", fontWeight: "600" }}>{texto}</div>
      <div style={{ fontSize: "10px", color: "#000000", fontWeight: "600" }}>Ficha {numero || "—"} · {fecha}</div>
    </div>
  );
}
