import { CommercialIntro, CommercialQuestions, ContentSection, TransparencyNote } from "@/components/telecom/CommercialContent";
import { WhatsAppCTA } from "@/components/telecom/WhatsAppCTA";
import { staticPageMetadata } from "@/lib/telecom/metadata";
export const revalidate = 3600;
export const metadata = staticPageMetadata("/internet-empresarial");
export default function Page() {
  return <>
    <CommercialIntro path="/internet-empresarial" label="Internet empresarial" title="Internet empresarial em São Paulo: opções para a rotina do seu negócio" interest="Internet empresarial para CNPJ" cta="Consultar internet para minha empresa">Quando a conexão cai, a reunião trava, o pagamento demora e a equipe fica esperando. Conte como sua empresa usa a internet. A WifiConecta consulta opções para CNPJ na capital e em outras cidades paulistas, conforme a disponibilidade no endereço.</CommercialIntro>
    <ContentSection title="O que precisa continuar funcionando?"><div className="wifi-commercial-grid">
      <div><h3>Atendimento e vendas</h3><p>Caixa, maquininha, pedidos, agendamentos e sistemas na nuvem. Explique quais tarefas dependem da conexão ao longo do expediente.</p></div>
      <div><h3>Reuniões e arquivos</h3><p>Videochamadas, envio de documentos e backup. O upload e o uso simultâneo precisam entrar na consulta, junto com o download.</p></div>
      <div><h3>Equipe e equipamentos</h3><p>Informe o número de pessoas, computadores e aparelhos. A distribuição do Wi-Fi dentro do imóvel também merece avaliação.</p></div>
      <div><h3>Câmeras e acesso remoto</h3><p>Conte quais equipamentos e sistemas utiliza. Requisitos de upload, endereçamento, armazenamento e suporte devem ser verificados com a prestadora.</p></div>
    </div></ContentSection>
    <ContentSection title="Banda larga empresarial ou conexão dedicada?"><p>Os produtos têm propostas diferentes. Um pequeno comércio pode procurar banda larga empresarial; uma operação com aplicações críticas pode precisar avaliar uma solução dedicada, condições de reparo ou uma conexão de contingência.</p><p>IP fixo, velocidades simétricas, prazo de reparo e suporte 24 horas não fazem parte automaticamente de qualquer plano CNPJ. A equipe consulta o que a prestadora efetivamente oferece e o que está previsto no contrato. Esta página não anuncia esses recursos como incluídos.</p></ContentSection>
    <ContentSection title="Leve estes pontos para a cotação"><ul className="wifi-checklist"><li>Download, upload, tecnologia e equipamentos previstos na proposta.</li><li>Horário de operação, usuários simultâneos e sistemas que não podem parar.</li><li>Instalação, taxas, prazo estimado e autorização de acesso ao imóvel.</li><li>Canais de suporte, responsabilidades e condições de reparo.</li><li>Mensalidade, reajuste, permanência mínima e eventual multa.</li></ul><p>Peça as condições por escrito. A WifiConecta auxilia na consulta e no encaminhamento; instalação e atendimento técnico são responsabilidade da prestadora contratada.</p><TransparencyNote /></ContentSection>
    <CommercialQuestions items={[
      ["Internet residencial serve para uma empresa?", "A adequação depende do contrato, da contratação em CPF ou CNPJ e das exigências da operação. Confira as condições da oferta empresarial e os recursos efetivamente contratados."],
      ["Posso consultar IP fixo ou conexão reserva?", "Você pode explicar essa necessidade no atendimento. A equipe precisa verificar se há produto e disponibilidade para o endereço; não são recursos garantidos por esta página."],
      ["A instalação para CNPJ é gratuita?", "Depende da proposta. A equipe confirma taxas, equipamentos, viabilidade e previsão de instalação antes do encaminhamento."],
    ]} />
    <ContentSection title="Vamos entender a conexão do seu negócio?"><p>Conte o ramo, a região e as necessidades de uso pelo WhatsApp. Dados da empresa são compartilhados voluntariamente na conversa, conforme necessários à consulta.</p><WhatsAppCTA source="business-final" category="empresa" interest="Cotação de internet para minha empresa" label="Conversar sobre internet para CNPJ" /></ContentSection>
  </>;
}
