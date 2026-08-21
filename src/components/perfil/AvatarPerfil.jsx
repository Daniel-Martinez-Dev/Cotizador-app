import React from "react";
import { inicialesDe } from "../../utils/fotoPerfil";

// Foto del usuario, con sus iniciales mientras no haya subido ninguna.
// Se usa en el perfil y en la barra de la app.
export default function AvatarPerfil({ perfil, email, size = 40, className = "" }) {
  const nombre = perfil?.displayName || "";
  const foto = perfil?.fotoURL || "";
  const estilo = { width: size, height: size, fontSize: Math.round(size * 0.38) };

  if (foto) {
    return (
      <img
        src={foto}
        alt={nombre || "Foto de perfil"}
        style={estilo}
        className={`rounded-full object-cover border border-gray-300 dark:border-gris-600 bg-gray-100 dark:bg-gris-700 ${className}`}
      />
    );
  }

  return (
    <span
      style={estilo}
      aria-hidden="true"
      className={`rounded-full border border-gray-300 dark:border-gris-600 bg-gray-200 dark:bg-gris-700 text-gray-700 dark:text-gray-200 font-semibold flex items-center justify-center select-none ${className}`}
    >
      {inicialesDe(nombre, email)}
    </span>
  );
}
