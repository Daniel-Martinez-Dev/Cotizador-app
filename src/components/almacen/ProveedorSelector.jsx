import React from "react";
import { FaCheckCircle } from "react-icons/fa";
import Combobox from "../ui/Combobox";
import { normalizarNombreCliente } from "../../utils/clienteVinculo";

// Elección de proveedor en el almacén, con el mismo Combobox que usan el
// selector de cliente de las fichas y el cotizador.
//
// Antes era un <select> nativo. En la tablet Android el desplegable del sistema
// se dibuja fuera del modal —encima de todo, con su propio tema— y con la lista
// larga de proveedores hay que buscar a ciegas: no se puede escribir para
// filtrar. El Combobox es HTML normal, así que se ve igual que el resto del
// formulario, se filtra tecleando y sirve tanto en la tablet como en el
// escritorio.

const nombreProveedor = (p) => p?.razonSocial || p?.nombre || p?.id || "";

export default function ProveedorSelector({
  proveedores = [],
  value = "",          // id del proveedor elegido ("" = ninguno)
  onChange,            // (id) => void
  inputCls = "",
  placeholder = "Escribe para buscar el proveedor…",
}) {
  const elegido = React.useMemo(
    () => proveedores.find((p) => p.id === value) || null,
    [proveedores, value]
  );

  // El texto es del campo, no del proveedor: mientras se escribe hay que poder
  // borrar y corregir sin que la selección anterior lo pise.
  const [texto, setTexto] = React.useState(() => nombreProveedor(elegido));

  // Cuando la selección cambia desde fuera —recién creado en el modal de
  // "Nuevo"— el campo la refleja. Solo cuando hay proveedor: sincronizar
  // también el caso vacío borraba lo que se estaba escribiendo, porque teclear
  // sobre un proveedor ya elegido lo deselecciona en la misma pulsación.
  React.useEffect(() => {
    if (elegido) setTexto(nombreProveedor(elegido));
  }, [elegido]);

  const opciones = React.useMemo(
    () => proveedores.map((p) => ({
      id: p.id,
      label: nombreProveedor(p),
      sublabel: [p.nit, p.contacto].filter(Boolean).join(" · "),
    })),
    [proveedores]
  );

  // Escribir el nombre completo de un proveedor lo elige sin abrir la lista;
  // cualquier otra cosa deja la selección vacía, para que no quede un id
  // pegado a un nombre que ya no se le parece.
  const escribir = (nuevo) => {
    setTexto(nuevo);
    const clave = normalizarNombreCliente(nuevo);
    const exacto = clave
      ? proveedores.filter((p) => normalizarNombreCliente(nombreProveedor(p)) === clave)
      : [];
    onChange?.(exacto.length === 1 ? exacto[0].id : "");
  };

  return (
    <div>
      <Combobox
        value={texto}
        onChange={escribir}
        onSelect={(op) => onChange?.(op.id)}
        options={opciones}
        placeholder={proveedores.length ? placeholder : "Todavía no hay proveedores"}
        inputClassName={inputCls}
        emptyText="Ningún proveedor con ese nombre"
      />
      {elegido && (
        <div className="mt-1 flex items-center gap-1.5 text-[11px] text-green-700 dark:text-green-400">
          <FaCheckCircle className="shrink-0" />
          <span className="truncate">
            {nombreProveedor(elegido)}
            {elegido.nit ? ` · ${elegido.nit}` : ""}
          </span>
        </div>
      )}
    </div>
  );
}
