// Script de seed manual. Ejecutar temporalmente desde alguna parte de la app (botón oculto) y luego eliminar.
import { sampleEmpresas, sampleContactosSinEmpresa } from '../data/sampleSeed';
import { crearEmpresa, obtenerEmpresaPorNIT, crearContacto, buscarContactoPorEmail, listarEmpresas } from './firebaseCompanies';

export async function seedEmpresasYContactos({ onProgress } = {}) {
  let creadasEmp = 0, creadosContactos = 0;
  for (const emp of sampleEmpresas) {
    try {
      let empresa = await obtenerEmpresaPorNIT(emp.nit);
      if (!empresa) {
        const id = await crearEmpresa({ nit: emp.nit, nombre: emp.nombre, ciudad: emp.ciudad });
        empresa = { id, ...emp };
        creadasEmp++;
        onProgress?.(`Empresa creada: ${emp.nombre}`);
      } else {
        onProgress?.(`Empresa ya existía: ${emp.nombre}`);
      }
      // contactos
      for (const cont of emp.contactos || []) {
        let existe = cont.email ? await buscarContactoPorEmail(empresa.id, cont.email) : null;
        if (!existe) {
          await crearContacto(empresa.id, {
            nombre: cont.nombre,
            email: cont.email || '',
            telefono: cont.telefono || ''
          });
          creadosContactos++;
          onProgress?.(`  Contacto creado: ${cont.nombre}`);
        } else {
          onProgress?.(`  Contacto ya existía: ${cont.nombre}`);
        }
      }
    } catch (e) {
      console.error('Error procesando empresa', emp.nombre, e);
      onProgress?.(`Error empresa: ${emp.nombre}`);
    }
  }
  // Contactos sin empresa (ahora ignorados o se podría crear empresa placeholder)
  const totalEmp = (await listarEmpresas()).length;
  return { creadasEmp, creadosContactos, totalEmp };
}
