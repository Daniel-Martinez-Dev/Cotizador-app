import { describe, it, expect, vi } from "vitest";
import { crearAcumuladorEscaner, PAUSA_MAX_MS } from "./escanerCodigo";

// La pistola lectora y el operario escriben en el mismo teclado. Lo único que
// los distingue es la velocidad: si el criterio falla hacia un lado se pierden
// barridos, y si falla hacia el otro cada palabra tecleada dispara una búsqueda.

const barrer = (acumulador, texto, { paso = 10, desde = 1000 } = {}) => {
  let t = desde;
  for (const key of texto) {
    acumulador.procesarTecla({ key, tiempo: t });
    t += paso;
  }
  acumulador.procesarTecla({ key: "Enter", tiempo: t });
  return t;
};

describe("acumulador de la pistola lectora", () => {
  it("reconoce una ráfaga rápida rematada en Enter", () => {
    const onCodigo = vi.fn();
    const acc = crearAcumuladorEscaner({ onCodigo });
    barrer(acc, "2000000000426");
    expect(onCodigo).toHaveBeenCalledWith("2000000000426");
  });

  it("acepta el Tab como cierre, que es lo que manda algún lector", () => {
    const onCodigo = vi.fn();
    const acc = crearAcumuladorEscaner({ onCodigo });
    let t = 1000;
    for (const key of "MP-LAM-0042") { acc.procesarTecla({ key, tiempo: t }); t += 10; }
    acc.procesarTecla({ key: "Tab", tiempo: t });
    expect(onCodigo).toHaveBeenCalledWith("MP-LAM-0042");
  });

  it("ignora a alguien escribiendo despacio", () => {
    const onCodigo = vi.fn();
    const acc = crearAcumuladorEscaner({ onCodigo });
    barrer(acc, "espuma", { paso: PAUSA_MAX_MS + 100 });
    expect(onCodigo).not.toHaveBeenCalled();
  });

  it("ignora un Enter suelto", () => {
    const onCodigo = vi.fn();
    const acc = crearAcumuladorEscaner({ onCodigo });
    acc.procesarTecla({ key: "Enter", tiempo: 1000 });
    expect(onCodigo).not.toHaveBeenCalled();
  });

  it("descarta el tecleo previo y se queda solo con el barrido", () => {
    const onCodigo = vi.fn();
    const acc = crearAcumuladorEscaner({ onCodigo });
    // Alguien escribió "ab" despacio y acto seguido dispara la pistola.
    acc.procesarTecla({ key: "a", tiempo: 0 });
    acc.procesarTecla({ key: "b", tiempo: 500 });
    barrer(acc, "2000000000426", { desde: 5000 });
    expect(onCodigo).toHaveBeenCalledWith("2000000000426");
  });

  it("no toma como código un texto corto", () => {
    const onCodigo = vi.fn();
    const acc = crearAcumuladorEscaner({ onCodigo });
    barrer(acc, "ab");
    expect(onCodigo).not.toHaveBeenCalled();
  });

  it("no mete las teclas especiales dentro del código", () => {
    const onCodigo = vi.fn();
    const acc = crearAcumuladorEscaner({ onCodigo });
    let t = 1000;
    for (const key of ["2", "0", "0", "Shift", "0", "ArrowLeft", "0"]) {
      acc.procesarTecla({ key, tiempo: t });
      t += 10;
    }
    acc.procesarTecla({ key: "Enter", tiempo: t });
    expect(onCodigo).toHaveBeenCalledWith("20000");
  });

  it("queda limpio para el siguiente barrido", () => {
    const onCodigo = vi.fn();
    const acc = crearAcumuladorEscaner({ onCodigo });
    barrer(acc, "2000000000426");
    barrer(acc, "2000000000075", { desde: 9000 });
    expect(onCodigo).toHaveBeenNthCalledWith(1, "2000000000426");
    expect(onCodigo).toHaveBeenNthCalledWith(2, "2000000000075");
    expect(onCodigo).toHaveBeenCalledTimes(2);
  });

  it("avisa a quien lo llama si consumió el Enter", () => {
    const acc = crearAcumuladorEscaner({ onCodigo: () => {} });
    let t = 1000;
    for (const key of "2000000000426") { acc.procesarTecla({ key, tiempo: t }); t += 10; }
    expect(acc.procesarTecla({ key: "Enter", tiempo: t })).toBe(true);
    expect(acc.procesarTecla({ key: "Enter", tiempo: t + 10 })).toBe(false);
  });
});
