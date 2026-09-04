import { describe, it, expect, vi } from "vitest";
import { crearListaCacheada } from "./listaCacheada";

describe("crearListaCacheada", () => {
  it("no ha leído nada antes del primer refresco", () => {
    const lista = crearListaCacheada(async () => [1]);
    expect(lista.ultima()).toBeNull();
  });

  it("guarda lo leído para pintarlo al instante la próxima vez", async () => {
    const lista = crearListaCacheada(async () => [1, 2]);
    await lista.refrescar();
    expect(lista.ultima()).toEqual([1, 2]);
  });

  // Dos selectores montados a la vez piden lo mismo: una sola ida a la red.
  it("comparte la petición en curso en vez de duplicarla", async () => {
    const cargar = vi.fn(async () => ["a"]);
    const lista = crearListaCacheada(cargar);
    const [uno, dos] = await Promise.all([lista.refrescar(), lista.refrescar()]);
    expect(cargar).toHaveBeenCalledTimes(1);
    expect(uno).toBe(dos);
  });

  // Cachear a secas dejaba fuera la cotización recién guardada: cada montaje
  // vuelve a preguntar, y lo viejo solo sirve mientras llega lo nuevo.
  it("vuelve a leer en cada refresco, no una sola vez por sesión", async () => {
    let n = 0;
    const lista = crearListaCacheada(async () => [++n]);
    await lista.refrescar();
    await lista.refrescar();
    expect(lista.ultima()).toEqual([2]);
  });

  it("un fallo no se cachea y conserva lo que ya se había leído bien", async () => {
    let fallar = false;
    const lista = crearListaCacheada(async () => {
      if (fallar) throw new Error("sin permiso");
      return ["ok"];
    });
    await lista.refrescar();

    fallar = true;
    await expect(lista.refrescar()).rejects.toThrow("sin permiso");
    expect(lista.ultima()).toEqual(["ok"]);

    fallar = false;
    await expect(lista.refrescar()).resolves.toEqual(["ok"]);
  });

  // Lo leído con los permisos de una cuenta no vale para la siguiente.
  it("olvidar deja la lista como recién creada", async () => {
    const lista = crearListaCacheada(async () => ["x"]);
    await lista.refrescar();
    lista.olvidar();
    expect(lista.ultima()).toBeNull();
  });
});
