import React from "react";

// Símbolos de las acciones del listado.
//
// Van como SVG y no como emoji ni como carácter unicode a propósito: "✎" y "⊘"
// se dibujan de un tamaño distinto en cada plataforma —y en Android algunos ni
// siquiera están en la fuente—, así que una fila de tres acciones quedaba
// desalineada. Estos heredan el color (`currentColor`) y miden lo mismo en
// Windows, en Android y en el Mac.

const Trazo = ({ children, className = "" }) => (
  <svg
    viewBox="0 0 20 20"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.7"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    className={`h-[18px] w-[18px] ${className}`}
  >
    {children}
  </svg>
);

/** Abonos: un billete. */
export const IconoAbono = () => (
  <Trazo>
    <rect x="2" y="5" width="16" height="10" rx="2" />
    <circle cx="10" cy="10" r="2.2" />
    <path d="M5 8v0M15 12v0" />
  </Trazo>
);

/** Editar: el lápiz de siempre. */
export const IconoEditar = () => (
  <Trazo>
    <path d="M13.2 3.6a1.7 1.7 0 0 1 2.4 2.4L7.3 14.3l-3.2.8.8-3.2z" />
    <path d="M12 5l3 3" />
  </Trazo>
);

/** Anular: el círculo tachado. No es borrar —la factura sigue existiendo—. */
export const IconoAnular = () => (
  <Trazo>
    <circle cx="10" cy="10" r="7" />
    <path d="M5.2 5.2l9.6 9.6" />
  </Trazo>
);

/** Reactivar: deshacer la anulación. */
export const IconoReactivar = () => (
  <Trazo>
    <path d="M3.5 10a6.5 6.5 0 1 0 1.9-4.6" />
    <path d="M3.2 3.5v3.2h3.2" />
  </Trazo>
);

/** Abonos mal aplicados en una nota crédito: hay que ir a quitarlos. */
export const IconoAlerta = () => (
  <Trazo>
    <path d="M10 3.2l7 12.3H3z" />
    <path d="M10 8v3.2M10 13.4v0" />
  </Trazo>
);
