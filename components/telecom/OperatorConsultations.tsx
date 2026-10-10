import { operators } from "@/lib/telecom/catalog";
import { WhatsAppCTA } from "./WhatsAppCTA";

export function OperatorConsultations() {
  return (
    <section className="wifi-section wifi-container" id="operadoras">
      <div className="wifi-section-heading"><div>
        <p className="wifi-eyebrow">Consulta comercial</p>
        <h2>Converse sobre a operadora que procura.</h2>
        <p>A equipe verifica opções da Claro, Vivo, TIM e provedores de bairro para seu endereço em São Paulo.</p>
      </div></div>
      <div className="wifi-operator-consultations">
        {operators.map(operator => (
          <div className="wifi-guide-card" id={`operadora-${operator.slug}`} key={operator.slug}>
            <h3>{operator.name}</h3>
            <WhatsAppCTA source="operator-consultation" interest={`Serviços ${operator.name}`} label={`Consultar ${operator.name} no WhatsApp`} />
          </div>
        ))}
      </div>
    </section>
  );
}
