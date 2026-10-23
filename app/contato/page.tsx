import Link from "next/link";
import { CommercialIntro, ContentSection } from "@/components/telecom/CommercialContent";
import { WhatsAppCTA } from "@/components/telecom/WhatsAppCTA";
import { staticPageMetadata } from "@/lib/telecom/metadata";
import { GoogleMapsLink } from "@/components/site/GoogleMapsLink";
import { brandConfig } from "@/brand.config";
export const metadata = staticPageMetadata("/contato");
const interests = [
  ["internet", "Só internet", "Internet residencial"],
  ["internet_celular", "Internet + celular", "Combo de internet e celular"],
  ["internet_tv", "TV e streaming", "Internet com TV Box e streaming"],
  ["internet_camera", "Internet + câmera", "Internet com câmera residencial"],
  ["empresa", "Minha empresa", "Internet empresarial para CNPJ"],
  ["condominio", "Meu condomínio", "Atendimento para condomínio"],
];
export default function Page() {
  return <>
    <CommercialIntro path="/contato" label="Contato" title="Fale com uma pessoa para encontrar sua internet" interest="Ajuda para consultar opções de internet em São Paulo" cta="Abrir WhatsApp para consultar opções">Quer contratar internet, conferir uma promoção ou ver o que está disponível para sua casa? Chame a WifiConecta. O atendimento comercial começa com uma pessoa, não com um robô.</CommercialIntro>
    <ContentSection title="Escolha o assunto para começar a conversa"><p className="wifi-contact-number">Nosso WhatsApp: <strong>+55 11 94884-4107</strong></p><div className="wifi-contact-interests">{interests.map(([category, label, interest]) => <WhatsAppCTA key={category} source={"contact-" + category} category={category} interest={interest} label={label} />)}</div><p>A capital é nossa prioridade. Também recebemos solicitações de outras cidades do estado, conforme a disponibilidade para cada endereço.</p></ContentSection>
    {brandConfig.googleMapsUrl && (
      <ContentSection title="WifiConecta em São Paulo" id="wifi-maps">
        <p>Atendemos a capital e outras cidades do estado de São Paulo, com orientação para escolher planos de internet, TV, celular e combos conforme a disponibilidade no endereço.</p>
        <p>Nosso atendimento é inteiramente pelo WhatsApp.</p>
        <GoogleMapsLink className="wifi-contact-maps-link" />
      </ContentSection>
    )}
    <ContentSection title="O que vale contar na primeira mensagem"><p>Sua cidade, bairro e o tipo de pacote já ajudam a começar. Para conferir disponibilidade, a prestadora pode precisar de CEP, rua, número e unidade. Você compartilha esses dados voluntariamente no WhatsApp, conforme a necessidade do atendimento.</p><p>Conte também quantas pessoas usam a rede e se precisa de instalação em uma data específica. Não há formulário de dados pessoais ou contratação automática neste site.</p></ContentSection>
    <ContentSection title="O que acontece depois"><p>Uma pessoa verifica as alternativas comerciais e explica valores, benefícios, fidelidade, instalação e primeira cobrança. Você tira as dúvidas e decide se quer solicitar o serviço.</p><p>Abrir o WhatsApp não envia uma mensagem sem sua ação, não assina contrato e não garante instalação. O encaminhamento vem depois da sua confirmação; a prestação do serviço é da operadora escolhida.</p></ContentSection>
    <ContentSection title="Precisa corrigir conteúdo ou falar de privacidade?"><p>Use o mesmo canal para solicitar correções e tratar de informações compartilhadas no atendimento. Consulte a <Link prefetch={false} href="/politica-de-privacidade">política de privacidade</Link> e a <Link prefetch={false} href="/politica-editorial">política editorial</Link>.</p></ContentSection>
  </>;
}
