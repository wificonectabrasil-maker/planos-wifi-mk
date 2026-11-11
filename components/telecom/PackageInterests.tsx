import { Camera, Check, House, MonitorPlay, Smartphone } from "lucide-react";
import { WhatsAppCTA } from "./WhatsAppCTA";
const categories = [
  { id: "internet-residencial", cta: "Consultar internet para minha casa", icon: House, title: "Internet residencial", interest: "Só internet residencial", text: "Sua internet precisa dar conta da rotina da casa, não só impressionar no anúncio. Conta quantas pessoas usam a conexão e se tem TV, videogame ou trabalho remoto. A equipe consulta as tecnologias e velocidades disponíveis para seu endereço.", checks: ["Tecnologia e velocidades disponíveis", "Roteador e alcance do Wi-Fi", "Mensalidade e condições do contrato"] },
  { id: "internet-celular", cta: "Ver combos de internet e celular", icon: Smartphone, title: "Internet + celular", interest: "Combo de internet residencial e celular", text: "Internet em casa e dados móveis no celular. Será que juntar os dois compensa? Consulte combos disponíveis e compare franquia, descontos e condições com o que você já paga hoje.", checks: ["Franquia de dados e portabilidade", "Desconto e duração dos benefícios", "Cobrança conjunta e fidelidade"] },
  { id: "tv-streaming", cta: "Consultar pacotes com TV e streaming", icon: MonitorPlay, title: "Internet + TV e streaming", interest: "Internet com TV Box e streaming", text: "Gosta de canais ao vivo, filmes e séries? Consulte combinações com internet, TV e streaming. A equipe ajuda a entender quais aplicativos estão incluídos, quais assinaturas são cobradas à parte e por quanto tempo os benefícios valem.", checks: ["Canais, apps e modalidade das assinaturas", "Telas e regras de acesso", "Equipamento, duração e cobranças extras"] },
  { id: "internet-camera", cta: "Ver opções com câmera residencial", icon: Camera, title: "Internet + câmera residencial", interest: "Pacote de internet com câmera residencial", text: "Quer acompanhar sua casa pelo celular? Algumas ofertas combinam internet residencial com câmera. Consulte as opções disponíveis e confira equipamento, aplicativo, instalação e armazenamento das imagens.", checks: ["Modelo e propriedade do equipamento", "Aplicativo e armazenamento das imagens", "Instalação, suporte e custos adicionais"] },
] as const;
export function PackageInterests() {
  return <section className="wifi-section" id="pacotes"><div className="wifi-container">
    <div className="wifi-section-heading"><div><p className="wifi-eyebrow">O pacote começa pela sua necessidade</p><h2>Que tipo de pacote você procura?</h2><p>Estas são modalidades para consulta. A composição disponível para seu endereço é confirmada por uma pessoa no WhatsApp.</p></div></div>
    <div className="wifi-package-grid">{categories.map(({ id, icon: Icon, title, text, checks, interest, cta }) => <article id={id} className="wifi-interest-card wifi-package-card" key={id}>
      <div className="wifi-interest-icon"><Icon size={26} aria-hidden="true" /></div><h3>{title}</h3><p>{text}</p>
      <span className="wifi-interest-label">Na conversa, confira:</span><ul>{checks.map(check => <li key={check}><Check size={16} aria-hidden="true" />{check}</li>)}</ul>
      <WhatsAppCTA source={"category-" + id} category={id === "internet-residencial" ? "internet" : id === "tv-streaming" ? "internet_tv" : id.replace("-", "_")} interest={interest} label={cta} />
    </article>)}</div>
    <p className="wifi-section-note">Atendimento na capital e em outras cidades de São Paulo. A disponibilidade, as promoções e as condições de instalação e cobrança dependem da oferta escolhida.</p>
  </div></section>;
}
