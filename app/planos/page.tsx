import { PackageQuickNav } from "@/components/telecom/PackageQuickNav";
import { PackageInterests } from "@/components/telecom/PackageInterests";
import { ContractProcess, FinalCTA } from "@/components/telecom/Shared";
import { staticPageMetadata } from "@/lib/telecom/metadata";
import { OperatorConsultations } from "@/components/telecom/OperatorConsultations";
import { CommercialIntro, CommercialQuestions, ContentSection, EditorialResources, TransparencyNote } from "@/components/telecom/CommercialContent";
import { CampaignSlot } from "@/components/telecom/CampaignSlot";
export const revalidate = 3600;
export const metadata = staticPageMetadata("/planos");
export default function Page() {
  return <>
    <CommercialIntro path="/planos" label="Pacotes e promoções" title="Planos de internet em São Paulo para sua casa" interest="Internet residencial e ofertas disponíveis para meu endereço" cta="Consultar promoções para meu endereço">
      Internet, celular, TV ou câmera: consulte pacotes de Claro, Vivo, TIM e provedores regionais. Uma pessoa confere as promoções e condições para o seu endereço.
    </CommercialIntro>
    <PackageQuickNav />
    <PackageInterests />
    <ContentSection title="Tem internet disponível para o seu endereço?"><p>Uma operadora pode atender o bairro e ainda não ter disponibilidade para o número da sua rua ou para o seu apartamento. A consulta considera o endereço completo, a infraestrutura e a viabilidade informada pela prestadora.</p><p>A capital é nossa prioridade, e também recebemos solicitações da Grande São Paulo, do interior e do litoral. A disponibilidade depende de cada endereço.</p><p>O atendimento começa pelo WhatsApp. Você conta onde precisa da conexão; a equipe confere as alternativas e orienta o próximo passo, sem uma promessa automática de cobertura.</p></ContentSection>
    <OperatorConsultations />
    <ContentSection title="Quanto custa? A composição muda a conta" id="precos"><p>Velocidade, tecnologia, endereço, celular, TV e equipamentos podem mudar o valor. Um combo com câmera não deve ser comparado só pela mensalidade com um pacote de internet sem serviços adicionais.</p><p>Uma faixa de preços só ajuda quando compara pacotes semelhantes, na mesma data e com as mesmas condições. Peça os valores atuais para o seu endereço pelo WhatsApp e confira a composição completa da proposta.</p><p>Na proposta, confira o total durante e depois do desconto, taxas, reajuste, fidelidade e o que acontece com os benefícios no fim da promoção.</p><TransparencyNote /></ContentSection>
    <CampaignSlot placement="plans" />
    <ContentSection title="E a instalação? E a primeira fatura?"><p>Ofertas elegíveis podem incluir instalação gratuita e primeira cobrança aproximadamente um mês após a instalação. A condição exata precisa constar na proposta: depende da operadora, do pacote, do endereço e do ciclo de faturamento.</p><p>Antes de confirmar, pergunte se há taxa de instalação ou equipamento, qual é a previsão de agendamento, quando começa a cobrança e se existe permanência mínima. Esse intervalo até a primeira fatura não significa teste gratuito.</p></ContentSection>
    <ContractProcess />
    <CommercialQuestions items={[
      ["Preciso informar meu CEP?", "O CEP ajuda a começar a consulta. Para confirmar a disponibilidade, a prestadora pode precisar também da rua, número e unidade. Você informa esses dados voluntariamente na conversa, sem preencher um formulário no site."],
      ["Quanto custa instalar?", "Algumas promoções incluem instalação sem cobrança. A equipe confere se isso vale para a oferta escolhida e informa eventuais taxas e regras antes do pedido."],
      ["Posso contratar sem fidelidade?", "Depende das ofertas e dos contratos disponíveis. Confira o prazo de permanência, os benefícios associados e a eventual multa antes de decidir."],
      ["Quando pago a primeira mensalidade?", "A data depende do ciclo de faturamento e do serviço contratado. O atendimento confirma a previsão da primeira cobrança e possíveis valores proporcionais."],
      ["Vocês instalam a internet?", "A operadora ou o provedor contratado executa a instalação e presta o serviço. A WifiConecta ajuda na escolha, esclarece as condições e encaminha o pedido com sua confirmação."],
    ]} />
    <EditorialResources slugs={["como-escolher-plano-internet-residencial", "operadoras-internet-no-meu-cep", "combo-internet-e-celular-vale-a-pena", "combo-internet-tv-streaming-vale-a-pena", "instalacao-internet-primeira-fatura"]} />
    <FinalCTA />
  </>;
}
