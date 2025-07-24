//C:\Users\danma\Downloads\cotizador-app\src\components\Preview.jsx
import { useLocation, useNavigate } from "react-router-dom";
import { generarPDF } from "../utils/pdf";

export default function Preview() {
  const location = useLocation();
  const navigate = useNavigate();
  const data = location.state;

  if (!data) {
    return (
      <div className="p-4">
        <p>No hay datos disponibles. <button onClick={() => navigate("/")}>Volver</button></p>
      </div>
    );
  }

  const {
    nombreCliente,
    cliente,
    producto,
    ancho,
    alto,
    cantidad,
    precio,
    extras,
    subtotalExtras,
    subtotal,
    iva,
    total
  } = data;

  return (
    <div className="max-w-2xl mx-auto p-4 space-y-4">
      <h2 className="text-2xl font-bold">Vista previa de la cotización</h2>

      <div className="space-y-2">
        <p><strong>Cliente:</strong> {cliente}</p>
        <p><strong>Producto:</strong> {producto}</p>
        <p><strong>Medidas:</strong> {ancho}mm x {alto}mm</p>
        <p><strong>Cantidad:</strong> {cantidad}</p>
        <p><strong>Precio unitario:</strong> ${precio.toLocaleString()}</p>
        <p><strong>Extras:</strong> {extras.join(", ") || "Ninguno"}</p>
        <p><strong>Subtotal Extras:</strong> ${subtotalExtras.toLocaleString()}</p>
        <p><strong>Subtotal:</strong> ${subtotal.toLocaleString()}</p>
        <p><strong>IVA:</strong> ${iva.toLocaleString()}</p>
        <p><strong>Total:</strong> ${total.toLocaleString()}</p>
      </div>

      <div className="flex gap-4">
        <button
          onClick={() => navigate("/")}
          className="bg-gray-500 text-white px-4 py-2 rounded"
        >
          Editar
        </button>
        <button
          onClick={() => generarPDF(data)}
          className="bg-green-600 text-white px-4 py-2 rounded"
        >
          Generar PDF
        </button>
      </div>
    </div>
  );
}
