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
    <ContentSection title="Como comparar pacotes para a sua rotina"><p>Compare serviços que você realmente pretende usar, além da velocidade anunciada. Estas situações ajudam a escolher o que perguntar na proposta:</p><div className="wifi-commercial-grid">
      <div><h3>Você já paga internet e celular</h3><p>Compare a soma das contas atuais com o valor do combo durante e depois do desconto. Confira franquia, portabilidade e o que acontece se cancelar um dos serviços.</p></div>
      <div><h3>Sua família assiste a filmes e canais</h3><p>Veja se o pacote tem canais ao vivo, acesso a aplicativos ou assinaturas completas. Confira telas, duração dos benefícios e serviços cobrados à parte.</p></div>
      <div><h3>Você quer acompanhar a casa</h3><p>Em uma oferta com câmera, pergunte se o equipamento é cedido ou vendido, como funciona o acesso às imagens e se há cobrança pelo armazenamento.</p></div>
      <div><h3>Você precisa apenas de conexão</h3><p>Compare tecnologia, download e upload para os usos simultâneos da casa. Não é necessário contratar serviços adicionais que você não pretende usar.</p></div>
    </div><p>Para qualquer modalidade, confirme disponibilidade, instalação, primeira cobrança, fidelidade e condições após eventuais promoções antes de decidir.</p></ContentSection>
    <ContentSection title="Tem internet disponível para o seu endereço?"><p>Uma operadora pode atender o bairro e ainda não ter disponibilidade para o número da sua rua ou para o seu apartamento. A consulta considera o endereço completo, a infraestrutura e a viabilidade informada pela prestadora.</p><p>A capital é nossa prioridade, e também recebemos solicitações da Grande São Paulo, do interior e do litoral. A disponibilidade depende de cada endereço.</p><p>O atendimento começa pelo WhatsApp. Você conta onde precisa da conexão; a equipe confere as alternativas e orienta o próximo passo, sem uma promessa automática de cobertura.</p></ContentSection>
    <OperatorConsultations />
    <ContentSection title="Quanto custa? A composição muda a conta" id="precos"><p>Velocidade, tecnologia, endereço, celular, TV e equipamentos podem mudar o valor. Um combo com câmera não deve ser comparado só pela mensalidade com um pacote de internet sem serviços adicionais.</p><p>Uma faixa de preços só ajuda quando compara pacotes semelhantes, na mesma data e com as mesmas condições. Peça os valores atuais para o seu endereço pelo WhatsApp e confira a composição completa da proposta.</p><p>Na proposta, confira o total durante e depois do desconto, taxas, reajuste, fidelidade e o que acontece com os benefícios no fim da promoção.</p><TransparencyNote /></ContentSection>
    <CampaignSlot placement="plans" />
    <ContentSection title="E a instalação? E a primeira fatura?"><p>Ofertas elegíveis podem incluir instalação gratuita e primeira cobrança aproximadamente um mês após a instalação. A proposta informa as condições da operadora, do pacote e do ciclo de faturamento para seu endereço.</p><p>Antes de confirmar, confira as taxas de instalação ou equipamento, a previsão de agendamento, a data da primeira cobrança e a permanência mínima. A primeira fatura considera as condições do serviço contratado.</p></ContentSection>
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
