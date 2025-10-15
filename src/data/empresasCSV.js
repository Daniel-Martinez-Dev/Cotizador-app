// Fuente de datos CSV para seeding de empresas.
// Instrucciones de uso:
// 1. Exporta tu archivo a CSV con encabezado: NIT,NOMBRE,DIRECCION,CIUDAD,TELEFONO
// 2. Copia TODO el contenido (incluyendo la fila de encabezado) y pégalo reemplazando el template de abajo.
// 3. Ejecuta el botón/acción de seed en la app.
// 4. La lógica:
//    - Si el NIT no existe en Firestore -> se crea una nueva empresa con (nit, nombre, ciudad, direccion, telefonoGeneral opcional).
//    - Si el NIT ya existe -> la línea se interpreta como una sucursal y se agrega un contacto con nombre:
//         "Sucursal: <DIRECCION> (<CIUDAD>)" (omitirá paréntesis si no hay ciudad)
//    - No se borra nada existente (política solicitada).
//    - Se evita repetir la misma sucursal/contacto por nombre en un mismo run.
// 5. Delimitadores soportados: coma (,) o punto y coma (;). Se toma el que produzca más columnas.
// 6. Limpieza de teléfono: se conservan dígitos y +, se eliminan otros caracteres.
// 7. Para actualizar: simplemente reemplaza el string y vuelve a ejecutar el seed (solo añadirá nuevas empresas/sucursales).
// 8. Para forzar correcciones (ej. dirección mal cargada) edita manualmente en la UI o en Firestore; el seed no sobrescribe direcciones existentes.
// 9. Campos mínimos por línea: NIT y NOMBRE. Las demás columnas pueden ir vacías.

export const empresasCSVRaw = "NIT,NOMBRE,DIRECCION,CIUDAD,TELEFONO"
