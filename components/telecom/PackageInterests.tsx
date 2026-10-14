import { Camera, Check, House, MonitorPlay, Smartphone } from "lucide-react";
import { WhatsAppCTA } from "./WhatsAppCTA";
const categories = [
  { id: "internet-residencial", icon: House, title: "Internet residencial", interest: "Só internet residencial", text: "Para conectar a casa sem juntar serviços que você não usa. Conte quantas pessoas e aparelhos dividem a conexão.", checks: ["Tecnologia e velocidades disponíveis", "Roteador e alcance do Wi-Fi", "Mensalidade e condições do contrato"] },
  { id: "internet-celular", icon: Smartphone, title: "Internet + celular", interest: "Combo de internet residencial e celular", text: "Já paga conexão de casa e dados móveis separados? Consulte se reunir os serviços faz sentido para sua rotina e sua conta.", checks: ["Franquia de dados e portabilidade", "Desconto e duração dos benefícios", "Cobrança conjunta e fidelidade"] },
  { id: "tv-streaming", icon: MonitorPlay, title: "Internet + TV e streaming", interest: "Internet com TV Box e streaming", text: "Filmes, séries ou canais ao vivo? Diga o que sua família assiste. A lista de apps, sozinha, não conta a história toda.", checks: ["Canais, apps e modalidade das assinaturas", "Telas e regras de acesso", "Equipamento, duração e cobranças extras"] },
  { id: "internet-camera", icon: Camera, title: "Internet + câmera residencial", interest: "Pacote de internet com câmera residencial", text: "Quer acompanhar a casa pelo celular? Algumas ofertas podem combinar internet e câmera. A equipe verifica se há uma opção para você.", checks: ["Modelo e propriedade do equipamento", "Aplicativo e armazenamento das imagens", "Instalação, suporte e custos adicionais"] },
] as const;
export function PackageInterests() {
  return <section className="wifi-section" id="pacotes"><div className="wifi-container">
    <div className="wifi-section-heading"><div><p className="wifi-eyebrow">O pacote começa pela sua necessidade</p><h2>Que tipo de pacote você procura?</h2><p>Estas são modalidades para consulta. A composição disponível para seu endereço é confirmada por uma pessoa no WhatsApp.</p></div></div>
    <div className="wifi-package-grid">{categories.map(({ id, icon: Icon, title, text, checks, interest }) => <article id={id} className="wifi-interest-card wifi-package-card" key={id}>
      <div className="wifi-interest-icon"><Icon size={26} aria-hidden="true" /></div><h3>{title}</h3><p>{text}</p>
      <span className="wifi-interest-label">Na conversa, confira:</span><ul>{checks.map(check => <li key={check}><Check size={16} aria-hidden="true" />{check}</li>)}</ul>
      <WhatsAppCTA source={"category-" + id} category={id === "internet-residencial" ? "internet" : id === "tv-streaming" ? "internet_tv" : id.replace("-", "_")} interest={interest} label={"Consultar " + title.toLowerCase()} />
    </article>)}</div>
    <p className="wifi-section-note">Atendimento na capital e em outras cidades do estado, sujeito à disponibilidade. Operadora, preços, benefícios e vigência variam conforme a oferta. A consulta não garante cobertura.</p>
  </div></section>;
}
