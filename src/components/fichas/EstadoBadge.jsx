import React from "react";
import { ESTADO_LABEL, ESTADO_CLS, ESTADO_DOT } from "./estadoFicha";

export default function EstadoBadge({ estado, className = "" }) {
  const key = estado || "borrador";
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium border ${ESTADO_CLS[key] || ESTADO_CLS.borrador} ${className}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${ESTADO_DOT[key] || ESTADO_DOT.borrador} ${key === "en_produccion" ? "animate-pulse" : ""}`} />
      {ESTADO_LABEL[key] || estado || "Borrador"}
    </span>
  );
}
