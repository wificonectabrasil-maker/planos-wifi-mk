import { Building2, Check, House, MonitorPlay, Smartphone } from "lucide-react";
import { WhatsAppCTA } from "./WhatsAppCTA";

// Compositions supplied by the owner; availability and current terms are confirmed in the conversation.
const packages = [
  {
    id: "internet-celular",
    icon: Smartphone,
    audience: "Casa + celular",
    title: "Claro Multi",
    text: "Internet em casa, dados no celular e benefícios para acompanhar você dentro e fora de casa.",
    specs: [
      { value: "500", unit: "Mega", label: "Internet em casa" },
      { value: "60", unit: "GB", label: "No celular" },
    ],
    benefits: ["Globoplay", "Passaporte Américas", "iCloud+ com 50 GB", "Google One com 100 GB"],
    streaming: [],
    note: "Consulte a disponibilidade dos serviços e as regras de cada benefício para o seu perfil.",
    interest: "Claro Multi: 500 Mega + 60 GB, Globoplay, Passaporte Américas e armazenamento na nuvem",
  },
  {
    id: "tv-streaming",
    icon: House,
    audience: "Internet + celular + TV",
    title: "Claro com TV e streaming",
    text: "Uma composição para conectar a casa, usar o celular e reunir canais, filmes e séries.",
    specs: [
      { value: "500", unit: "Mega", label: "Internet em casa" },
      { value: "60", unit: "GB", label: "No celular" },
    ],
    benefits: ["TV Box com 120 canais", "Ligações ilimitadas para todo o Brasil"],
    streaming: ["Netflix", "Globoplay", "HBO Max", "Apple TV", "Prime Video", "Disney+"],
    note: "Confirme os canais, as modalidades de acesso aos apps e a duração dos benefícios.",
    interest: "Claro: 500 Mega + 60 GB + TV Box com 120 canais e seis streamings",
  },
  {
    id: "empresa",
    icon: Building2,
    audience: "Exclusivo para CNPJ",
    title: "Claro Empresas",
    text: "Uma opção para consultar a conexão do seu negócio, do atendimento aos clientes à rotina da equipe.",
    specs: [
      { value: "600", unit: "Mega", label: "Internet para a empresa" },
    ],
    benefits: ["McAfee", "Contratação para CNPJ"],
    streaming: [],
    note: "Consulte as condições e a vigência atuais do pacote empresarial pelo WhatsApp.",
    interest: "Claro Empresas: 600 Mega + McAfee, contratação para CNPJ",
  },
  {
    id: "condominio",
    icon: MonitorPlay,
    audience: "Para condomínios",
    title: "Claro tv+ Box",
    text: "Canais e aplicativos na TV, com consulta de condições para moradores de condomínios.",
    specs: [
      { value: "Box", unit: "", label: "Claro tv+" },
      { value: "6", unit: "streamings", label: "Na composição" },
    ],
    benefits: ["Composição Multi com 5G e internet", "Atendimento para o seu condomínio"],
    streaming: ["Netflix", "Globoplay", "HBO Max", "Apple TV+", "Prime Video", "Disney+"],
    note: "Condições vinculadas à composição Multi. Confira a elegibilidade e as regras dos apps no atendimento.",
    interest: "Claro tv+ Box para condomínio: composição Multi com 5G, internet e seis streamings",
  },
];

export function PackageInterests() {
  return (
    <section className="wifi-section" id="pacotes">
      <div className="wifi-container">
        <div className="wifi-section-heading">
          <div>
            <p className="wifi-eyebrow">Claro em São Paulo</p>
            <h2>Conheça os pacotes Claro para São Paulo.</h2>
            <p>Escolha a composição que você quer consultar. Disponibilidade, preços e condições atuais são confirmados pelo WhatsApp.</p>
          </div>
        </div>
        <div className="wifi-package-grid">
          {packages.map(({ id, icon: Icon, audience, title, text, specs, benefits, streaming, note, interest }) => (
            <article id={id} className="wifi-interest-card wifi-package-card" key={title}>
              <div className="wifi-package-top">
                <div className="wifi-interest-icon"><Icon size={26} aria-hidden="true" /></div>
                <span className="wifi-package-audience">{audience}</span>
              </div>
              <h3>{title}</h3>
              <p>{text}</p>
              <dl className="wifi-package-specs">
                {specs.map(spec => (
                  <div key={spec.label}>
                    <dt>{spec.label}</dt>
                    <dd><strong>{spec.value}</strong><span>{spec.unit}</span></dd>
                  </div>
                ))}
              </dl>
              <span className="wifi-interest-label">Benefícios para confirmar na consulta:</span>
              <ul>{benefits.map(benefit => <li key={benefit}><Check size={16} aria-hidden="true" />{benefit}</li>)}</ul>
              {streaming.length ? (
                <div className="wifi-package-streaming">
                  <span className="wifi-interest-label">6 streamings na composição:</span>
                  <ul aria-label={`Streamings na composição ${title}`}>
                    {streaming.map(service => <li key={service}>{service}</li>)}
                  </ul>
                </div>
              ) : null}
              <p className="wifi-package-note">{note}</p>
              <WhatsAppCTA source="package-interest" interest={interest} label="Consultar este pacote no WhatsApp" />
            </article>
          ))}
        </div>
        <p className="wifi-section-note">Atendimento em São Paulo, por enquanto. As composições acima são opções para consulta, sem garantia de disponibilidade no seu bairro. Promoções, valores, serviços incluídos e duração dos benefícios precisam ser confirmados no WhatsApp.</p>
      </div>
    </section>
  );
}
