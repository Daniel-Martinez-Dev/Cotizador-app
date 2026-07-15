import React from "react";
import { ESTADO_LABEL, ESTADO_CLS } from "./estadoFicha";

export default function EstadoBadge({ estado }) {
  return (
    <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${ESTADO_CLS[estado] || ESTADO_CLS.borrador}`}>
      {ESTADO_LABEL[estado] || estado || "Borrador"}
    </span>
  );
}
