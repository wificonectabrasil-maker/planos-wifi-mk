import Link from "next/link";
import { Breadcrumb } from "@/components/telecom/Shared";
import { telecomMetadata } from "@/lib/telecom/metadata";
export const metadata = telecomMetadata("Privacidade e atendimento pelo WhatsApp", "Entenda como funciona o contato pelo WhatsApp e a medição de navegação da WifiConecta.", "/politica-de-privacidade");
export default function Page() {
  return (<>
    <Breadcrumb items={[{ label: "Privacidade", href: "/politica-de-privacidade" }]} />
    <article className="wifi-prose">
      <div className="wifi-page-intro"><p className="wifi-eyebrow">Versão de 23 de outubro de 2026</p><h1>Você escolhe iniciar a conversa.</h1><p>O atendimento comercial da WifiConecta acontece pelo WhatsApp. Esta página descreve o funcionamento do contato e da navegação no site.</p></div>
      <h2>Contato pelo WhatsApp.</h2><p>Os botões abrem o WhatsApp com uma mensagem inicial sobre o assunto escolhido. Você revisa a mensagem e decide enviá-la. O site não envia a mensagem por você nem registra seu nome, telefone ou endereço por um formulário de consulta.</p>
      <h2>Informações compartilhadas na conversa.</h2><p>No atendimento, o bairro, as necessidades de uso e as informações que você decidir compartilhar ajudam a consultar as opções disponíveis e responder ao pedido. O WhatsApp é um serviço externo e aplica suas próprias regras de privacidade.</p>
      <h2>Navegação e medição.</h2><p>O site emite eventos locais de clique para indicar a página, o botão, a categoria e a campanha consultada. Identificadores de marketing revisados podem acompanhar o evento; parâmetros livres e dados pessoais são descartados. Um clique não comprova conversa iniciada ou venda. Esses eventos não incluem nome, telefone, endereço ou conteúdo da conversa e não são enviados a um serviço externo de analytics pela implementação atual. A área administrativa usa um cookie de autenticação para proteger a sessão.</p>
      <h2>Mapa do Google.</h2><p>O rodapé exibe um mapa regional do Google Maps com carregamento adiado. Ao carregar ou usar esse mapa, seu navegador se conecta aos servidores do Google. Esse conteúdo externo segue a <a href="https://policies.google.com/privacy?hl=pt-BR" target="_blank" rel="noopener noreferrer" aria-label="Política de privacidade do Google (abre em nova aba)">política de privacidade do Google</a>. O mapa representa a região de atendimento, sem indicar um endereço físico da WifiConecta.</p>
      <h2>Pedidos sobre dados pessoais.</h2><p>Para tratar de informações compartilhadas no atendimento ou de um registro anterior, use o WhatsApp divulgado na <Link href="/contato">página de contato</Link>. Informe o necessário para localizar o pedido de acesso, correção ou exclusão.</p>
      <h2>Contratação e atualizações.</h2><p>Uma eventual contratação envolve os procedimentos e as condições da operadora, apresentados na etapa de atendimento. Se o funcionamento do site ou do contato mudar, esta página será atualizada.</p>
    </article>
  </>);
}
