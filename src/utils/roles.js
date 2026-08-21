// Catálogo de roles del sistema. Vivía repartido entre UsuariosPage (la lista
// que se asigna), App.jsx (quién entra a qué interfaz) y las reglas de
// Firestore; aquí queda el nombre canónico de cada uno y las preguntas que la
// UI hace sobre ellos.

export const ROL_ADMIN = "admin";
export const ROL_VENDEDOR = "vendedor";
export const ROL_PRODUCCION = "produccion";
export const ROL_INVENTARIO = "inventario";
export const ROL_EMPLEADO = "empleado";
export const ROL_ALMACENISTA = "almacenista";

export const ROLES = [
  ROL_ADMIN,
  ROL_VENDEDOR,
  ROL_PRODUCCION,
  ROL_INVENTARIO,
  ROL_EMPLEADO,
  ROL_ALMACENISTA,
];

export const ROL_LABEL = {
  [ROL_ADMIN]: "Admin",
  [ROL_VENDEDOR]: "Vendedor",
  [ROL_PRODUCCION]: "Producción",
  [ROL_INVENTARIO]: "Inventario",
  [ROL_EMPLEADO]: "Empleado (planta)",
  [ROL_ALMACENISTA]: "Almacenista",
};

export const ROL_DESCRIPCION = {
  [ROL_ADMIN]: "Acceso total al sistema.",
  [ROL_VENDEDOR]: "Cotiza y gestiona clientes.",
  [ROL_PRODUCCION]: "Crea y administra fichas de fabricación.",
  [ROL_INVENTARIO]: "Administra el inventario desde el escritorio, con costos.",
  [ROL_EMPLEADO]: "Planta: ve las fichas, las firma y las cierra.",
  [ROL_ALMACENISTA]: "Almacén: única llave para entradas y salidas de materia prima.",
};

// Roles cuya casa es la tablet o el celular de planta, no el escritorio: quien
// solo tenga estos entra directo a "/planta" (ver RootGate en App.jsx).
export const ROLES_PLANTA = [ROL_EMPLEADO, ROL_ALMACENISTA];

// El cuarto de materia prima es del almacenista, y del rol de inventario que lo
// administra desde la oficina. Un empleado de planta ya no entra ahí.
export const ROLES_ALMACEN = [ROL_ALMACENISTA, ROL_INVENTARIO];

// `roles` es el arreglo crudo del perfil, no `hasRole`: esa función le devuelve
// true a un admin para cualquier rol, y aquí lo que se pregunta es si la
// persona no tiene nada que hacer en la interfaz de oficina.
export function soloRolesDePlanta(roles) {
  const lista = Array.isArray(roles) ? roles : [];
  return lista.length > 0 && lista.every((r) => ROLES_PLANTA.includes(r));
}

// Si puede mover materia prima. `hasRole` viene de AuthContext y ya da por
// bueno al admin.
export const puedeAlmacen = (hasRole) => ROLES_ALMACEN.some((r) => hasRole(r));
