import { Check, MonitorPlay, Smartphone, Wifi } from "lucide-react";
import { WhatsAppCTA } from "./WhatsAppCTA";

const interests = [
  {
    icon: Wifi,
    title: "Internet pra casa",
    text: "Trabalho, estudos, séries e a casa toda conectada. Conte como você usa a internet para conhecer as opções do momento.",
    topics: ["Sua rotina e os aparelhos conectados", "Disponibilidade no seu bairro", "Condições da promoção atual"],
  },
  {
    icon: Smartphone,
    title: "Internet + celular",
    text: "Quer reunir a conexão de casa e o celular? A conversa ajuda a conferir se um pacote faz sentido pra você.",
    topics: ["Uso de internet dentro e fora de casa", "Franquia e opções de portabilidade", "Vantagens e condições do pacote"],
  },
  {
    icon: MonitorPlay,
    title: "TV e streaming",
    text: "Filmes, séries ou canais ao vivo? Diga o que gosta de assistir e consulte os pacotes disponíveis.",
    topics: ["Canais e aplicativos que você procura", "O que está incluído no pacote", "Duração e regras dos benefícios"],
  },
];

export function PackageInterests() {
  return (
    <section className="wifi-section" id="pacotes">
      <div className="wifi-container">
        <div className="wifi-section-heading">
          <div>
            <p className="wifi-eyebrow">O pacote é escolhido na conversa</p>
            <h2>O que você quer conectar?</h2>
            <p>Consulte as promoções atuais pelo WhatsApp. Por enquanto, nosso atendimento é em São Paulo.</p>
          </div>
        </div>
        <div className="wifi-offer-grid">
          {interests.map(({ icon: Icon, title, text, topics }) => (
            <article className="wifi-interest-card" key={title}>
              <div className="wifi-interest-icon"><Icon size={26} aria-hidden="true" /></div>
              <h3>{title}</h3>
              <p>{text}</p>
              <span className="wifi-interest-label">Na conversa, você confere:</span>
              <ul>{topics.map(topic => <li key={topic}><Check size={16} aria-hidden="true" />{topic}</li>)}</ul>
              <WhatsAppCTA source="package-interest" interest={title} label="Consultar no WhatsApp" />
            </article>
          ))}
        </div>
        <p className="wifi-section-note">Pacotes, valores e benefícios são apresentados no atendimento, após conferir as opções para o seu bairro. As promoções podem mudar.</p>
      </div>
    </section>
  );
}
