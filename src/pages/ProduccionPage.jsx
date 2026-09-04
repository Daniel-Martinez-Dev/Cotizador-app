import React from "react";
import DivisionTermicaFicha from "../components/DivisionTermicaFicha";
import SelloAndenFicha from "../components/SelloAndenFicha";
import AbrigoRetractilFicha from "../components/AbrigoRetractilFicha";
import PuertaRapidaFicha from "../components/PuertaRapidaFicha";
import PuertaSeccionalFicha from "../components/PuertaSeccionalFicha";
import FichaBasicaFicha from "../components/FichaBasicaFicha";
import OrdenesProduccionList from "../components/produccion/OrdenesProduccionList";
import { tabDeTipo } from "../components/produccion/productosFicha";
import Tabs from "../components/ui/Tabs";
import PageHeader from "../components/ui/PageHeader";

// "Órdenes" va primero y es la pestaña de entrada: al abrir Producción lo que
// se necesita ver es qué hay en planta, no un formulario en blanco de un
// producto concreto. Las pestañas de producto son el formulario de esa línea;
// la lista de todas las fichas vive solo en Órdenes.
export const TABS = [
  { key: "ordenes",         label: "Órdenes" },
  { key: "division",        label: "División Térmica" },
  { key: "sello",           label: "Sello de Andén" },
  { key: "abrigoretractil", label: "Abrigo Retráctil" },
  { key: "puertarapida",    label: "Puertas Rápidas" },
  { key: "puertaseccional", label: "Puertas Seccionales" },
  { key: "fichas",          label: "Fichas básicas" },
];

export default function ProduccionPage() {
  const [tab, setTab] = React.useState("ordenes");

  // Encargo que Órdenes le hace a una pestaña de producto: "abre el formulario
  // en blanco" o "carga esta ficha para editarla". Se guarda aquí porque quien
  // cambia de pestaña es esta página, y la pestaña destino lo consume y avisa.
  //
  // `prefill` es el caso de sumar una línea a un pedido que ya existe: el
  // formulario abre con la orden de compra y el cliente de ese pedido puestos
  // (ver fichas/prefillOrden.js).
  const [encargo, setEncargo] = React.useState(null);

  const encargar = (tipo, accion, { ficha, prefill } = {}) => {
    setEncargo({ tipo, accion, ficha, prefill, id: Date.now() });
    setTab(tabDeTipo(tipo));
  };

  // Cada pestaña solo ve el encargo si es para su producto.
  const encargoDe = (tipo) => (encargo?.tipo === tipo ? encargo : null);
  const atendido = () => setEncargo(null);

  // Al guardar se vuelve a Órdenes: es de donde se vino y es donde se ve la
  // ficha recién creada, ya colocada en su columna del tablero.
  const props = (tipo) => ({
    encargo: encargoDe(tipo),
    onEncargoAtendido: atendido,
    onGuardada: () => setTab("ordenes"),
  });

  return (
    <div className="max-w-6xl mx-auto px-4">
      <PageHeader section="/produccion" />

      <Tabs items={TABS} active={tab} onChange={setTab} variant="boxed" />

      <div className="mt-5">
        {tab === "ordenes" && (
          <OrdenesProduccionList
            onNuevaFicha={(tipo, prefill) => encargar(tipo, "nueva", { prefill })}
            onEditarFicha={(ficha) => encargar(ficha.tipo, "editar", { ficha })}
          />
        )}
        {tab === "division"        && <DivisionTermicaFicha {...props("division")} />}
        {tab === "sello"           && <SelloAndenFicha {...props("sello")} />}
        {tab === "abrigoretractil" && <AbrigoRetractilFicha {...props("abrigoretractil")} />}
        {tab === "puertarapida"    && <PuertaRapidaFicha {...props("puertarapida")} />}
        {tab === "puertaseccional" && <PuertaSeccionalFicha {...props("puertaseccional")} />}
        {tab === "fichas"          && <FichaBasicaFicha {...props("general")} />}
      </div>
    </div>
  );
}
