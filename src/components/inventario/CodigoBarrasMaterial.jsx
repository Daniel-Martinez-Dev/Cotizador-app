import React from "react";
import { geometriaEan13 } from "../../utils/ean13Barras";

// El código de barras tal como se ve en pantalla. Siempre negro sobre blanco,
// incluso en modo oscuro: un lector láser necesita el contraste máximo, y en
// tema oscuro las barras claras sobre fondo oscuro sencillamente no se leen.
// Por eso el recuadro blanco es fijo y no sigue el tema de la app.
export default function CodigoBarrasMaterial({
  codigo,
  modulo = 2,
  altoBarras = 56,
  mostrarTexto = true,
  className = "",
}) {
  const g = React.useMemo(
    () => geometriaEan13(codigo, { modulo, altoBarras, mostrarTexto }),
    [codigo, modulo, altoBarras, mostrarTexto]
  );

  if (!g) {
    return (
      <div className={`text-xs text-gray-500 dark:text-gray-400 ${className}`}>
        Sin código de barras
      </div>
    );
  }

  return (
    <svg
      viewBox={`0 0 ${g.ancho} ${g.alto}`}
      width="100%"
      style={{ maxWidth: g.ancho, background: "#fff" }}
      className={`block rounded ${className}`}
      role="img"
      aria-label={`Código de barras ${g.codigo}`}
    >
      <rect width={g.ancho} height={g.alto} fill="#fff" />
      {g.barras.map((b, i) => (
        <rect key={i} x={b.x} y={b.y} width={b.ancho} height={b.alto} fill="#000" />
      ))}
      {g.textos.map((t, i) => (
        <text
          key={`t${i}`}
          x={t.x}
          y={t.y}
          fontFamily="monospace"
          fontSize={t.tamano}
          textAnchor={t.anclaje}
          fill="#000"
        >
          {t.texto}
        </text>
      ))}
    </svg>
  );
}
