import { describe, it, expect } from "vitest";
import {
  ETAPAS_FIRMA,
  claveNombre,
  fechaFirmaTexto,
  hoyISO,
  firmaDeEtapa,
  firmasDeFicha,
  nombresFirma,
  normalizarPersonasFirma,
  resumenFirma,
} from "./firmasFicha";

describe("normalizarPersonasFirma", () => {
  it("limpia nombres y descarta los vacíos", () => {
    expect(normalizarPersonasFirma([
      { uid: "u1", nombre: "  Juan   Pérez " },
      { uid: "u2", nombre: "   " },
      { nombre: "" },
    ])).toEqual([{ uid: "u1", nombre: "Juan Pérez" }]);
  });

  it("guarda con uid vacío a quien se escribió a mano", () => {
    expect(normalizarPersonasFirma([{ nombre: "Carlos Ruiz" }]))
      .toEqual([{ uid: "", nombre: "Carlos Ruiz" }]);
  });

  it("no repite a la misma persona marcada dos veces", () => {
    expect(normalizarPersonasFirma([
      { uid: "u1", nombre: "Juan Pérez" },
      { uid: "u1", nombre: "Juan Pérez" },
    ])).toHaveLength(1);
  });

  // El mismo operario marcado de la lista y escrito a mano no puede salir dos
  // veces en la ficha impresa.
  it("no repite al mismo nombre escrito con otras mayúsculas o tildes", () => {
    expect(normalizarPersonasFirma([
      { uid: "", nombre: "Juan Pérez" },
      { uid: "", nombre: "JUAN PEREZ" },
    ])).toEqual([{ uid: "", nombre: "Juan Pérez" }]);
  });

  it("aguanta lo que no es una lista", () => {
    expect(normalizarPersonasFirma(undefined)).toEqual([]);
    expect(normalizarPersonasFirma(null)).toEqual([]);
  });
});

describe("claveNombre", () => {
  // Con esta clave se reconoce a un usuario de producción cuyo nombre alguien
  // intenta escribir a mano para firmar por él (ver PersonasFirmaPicker).
  it("iguala el mismo nombre escrito de cualquier forma", () => {
    expect(claveNombre("  Ana   GÓMEZ ")).toBe(claveNombre("ana gomez"));
  });

  it("no confunde a dos personas distintas", () => {
    expect(claveNombre("Ana Gómez")).not.toBe(claveNombre("Ana Gómez Ruiz"));
  });

  it("aguanta lo que no es texto", () => {
    expect(claveNombre(null)).toBe("");
    expect(claveNombre(undefined)).toBe("");
  });
});

describe("firmasDeFicha", () => {
  const alistado = {
    personas: [{ uid: "u1", nombre: "Juan Pérez" }, { uid: "", nombre: "Carlos Ruiz" }],
    fecha: "2026-08-18",
    fotos: [{ url: "https://x/1.jpg", path: "fichas/a/1.jpg" }],
    registradoPor: { uid: "u1", nombre: "Juan Pérez" },
  };

  it("devuelve las dos etapas vacías cuando la ficha no tiene firmas", () => {
    expect(firmasDeFicha({})).toEqual({ alistado: null, revisado: null });
    expect(firmasDeFicha(null)).toEqual({ alistado: null, revisado: null });
  });

  it("lee la etapa firmada y deja pendiente la otra", () => {
    const firmas = firmasDeFicha({ firmas: { alistado } });
    expect(nombresFirma(firmas.alistado)).toEqual(["Juan Pérez", "Carlos Ruiz"]);
    expect(firmas.alistado.fotos).toHaveLength(1);
    expect(firmas.revisado).toBeNull();
  });

  it("descarta un bloque sin firmantes: sin nombres no hay firma", () => {
    expect(firmasDeFicha({ firmas: { alistado: { personas: [], fecha: "2026-08-18" } } }).alistado)
      .toBeNull();
  });

  // Las fichas cerradas antes de este modelo guardaban fabricantes/verificador;
  // tienen que seguir imprimiéndose con nombres.
  it("traduce el modelo viejo: fabricantes alistaron y el verificador revisó", () => {
    const firmas = firmasDeFicha({
      firmas: {
        fabricantes: [{ uid: "u1", nombre: "Juan Pérez" }],
        verificador: { uid: "u2", nombre: "Ana Gómez" },
        fecha: { seconds: 1755500000 },
      },
    });
    expect(nombresFirma(firmas.alistado)).toEqual(["Juan Pérez"]);
    expect(nombresFirma(firmas.revisado)).toEqual(["Ana Gómez"]);
  });

  it("con el modelo nuevo ya escrito ignora los campos viejos", () => {
    const firmas = firmasDeFicha({
      firmas: { alistado, fabricantes: [{ uid: "u9", nombre: "Quien Sea" }] },
    });
    expect(nombresFirma(firmas.alistado)).toEqual(["Juan Pérez", "Carlos Ruiz"]);
  });

  it("firmaDeEtapa apunta a la etapa pedida", () => {
    expect(firmaDeEtapa({ firmas: { alistado } }, "alistado")).not.toBeNull();
    expect(firmaDeEtapa({ firmas: { alistado } }, "revisado")).toBeNull();
  });
});

describe("fechaFirmaTexto", () => {
  // "2026-08-18" es medianoche UTC: en Colombia (UTC-5) el formateo ingenuo
  // imprime el día anterior, y esa fecha es la que sale en la ficha firmada.
  it("no corre un día la fecha guardada como texto", () => {
    const texto = fechaFirmaTexto("2026-08-18");
    expect(texto).toMatch(/^18\/0?8\/2026$/);
  });

  it("un Timestamp de las fichas viejas se imprime igual que una fecha nueva", () => {
    const ms = new Date(2026, 7, 18, 10, 0, 0).getTime();
    const esperado = fechaFirmaTexto("2026-08-18");
    expect(fechaFirmaTexto({ seconds: Math.floor(ms / 1000) })).toBe(esperado);
    expect(fechaFirmaTexto({ toMillis: () => ms })).toBe(esperado);
  });

  it("no inventa nada cuando no hay fecha", () => {
    expect(fechaFirmaTexto(null)).toBe("");
    expect(fechaFirmaTexto("")).toBe("");
  });
});

describe("hoyISO", () => {
  // La fecha por defecto de la firma sale de aquí y es la que queda impresa:
  // con toISOString(), firmar de noche en Colombia (UTC-5) la adelantaría un día.
  it("da la fecha local, no la UTC", () => {
    const d = new Date();
    const esperado = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    expect(hoyISO()).toBe(esperado);
  });

  it("la escribe en el formato que lee fechaFirmaTexto", () => {
    expect(hoyISO()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(fechaFirmaTexto(hoyISO())).not.toBe("");
  });
});

describe("resumenFirma", () => {
  it("arma el titular del historial con los nombres", () => {
    expect(resumenFirma("alistado", [{ uid: "u1", nombre: "Juan Pérez" }, { nombre: "Carlos Ruiz" }]))
      .toBe("Alistado y empacado: Juan Pérez, Carlos Ruiz");
  });

  it("los rótulos impresos son los del formato en papel", () => {
    expect(ETAPAS_FIRMA.alistado.titulo).toBe("Pedido alistado y empacado por");
    expect(ETAPAS_FIRMA.revisado.titulo).toBe("Revisado y aprobado por");
  });
});
