import { describe, it, expect } from "vitest";
import {
  ROLES,
  ROL_ALMACENISTA,
  ROL_EMPLEADO,
  ROL_INVENTARIO,
  ROL_LABEL,
  puedeAlmacen,
  soloRolesDePlanta,
} from "./roles";

// `hasRole` de AuthContext le devuelve true al admin para cualquier rol; estas
// pruebas usan una versión simple para comprobar la lógica de cada perfil.
const conRoles = (...roles) => (rol) => roles.includes(rol);

describe("soloRolesDePlanta", () => {
  // Decide si la persona entra a "/planta" o a la interfaz de oficina. Un error
  // aquí manda al operario a la pantalla equivocada apenas inicia sesión.
  it("manda a planta al operario y al almacenista", () => {
    expect(soloRolesDePlanta([ROL_EMPLEADO])).toBe(true);
    expect(soloRolesDePlanta([ROL_ALMACENISTA])).toBe(true);
    expect(soloRolesDePlanta([ROL_EMPLEADO, ROL_ALMACENISTA])).toBe(true);
  });

  it("deja en la oficina a quien tenga algún rol de escritorio", () => {
    expect(soloRolesDePlanta([ROL_EMPLEADO, ROL_INVENTARIO])).toBe(false);
    expect(soloRolesDePlanta(["admin"])).toBe(false);
    expect(soloRolesDePlanta(["produccion"])).toBe(false);
  });

  it("no manda a planta a quien todavía no tiene roles", () => {
    expect(soloRolesDePlanta([])).toBe(false);
    expect(soloRolesDePlanta(undefined)).toBe(false);
    expect(soloRolesDePlanta(null)).toBe(false);
  });
});

describe("puedeAlmacen", () => {
  it("deja entrar al almacenista y al rol de inventario", () => {
    expect(puedeAlmacen(conRoles(ROL_ALMACENISTA))).toBe(true);
    expect(puedeAlmacen(conRoles(ROL_INVENTARIO))).toBe(true);
  });

  // El motivo del cambio: la materia prima dejó de ser del operario de planta.
  it("deja fuera al empleado de planta", () => {
    expect(puedeAlmacen(conRoles(ROL_EMPLEADO))).toBe(false);
    expect(puedeAlmacen(conRoles(ROL_EMPLEADO, "produccion"))).toBe(false);
  });

  it("el admin entra porque hasRole se lo concede todo", () => {
    expect(puedeAlmacen(() => true)).toBe(true);
  });
});

describe("catálogo de roles", () => {
  it("incluye almacenista y no tiene roles sin etiqueta", () => {
    expect(ROLES).toContain(ROL_ALMACENISTA);
    for (const rol of ROLES) expect(ROL_LABEL[rol]).toBeTruthy();
  });
});
