import { Breadcrumb } from "@/components/telecom/Shared";
import { telecomMetadata } from "@/lib/telecom/metadata";
export const metadata = telecomMetadata(
  "Política editorial: informação para escolher internet",
  "Conheça os critérios de escrita, fontes e atualização de informações da WifiConecta.",
  "/politica-editorial",
);
export default function Page() {
  return (
    <>
      <Breadcrumb
        items={[{ label: "Política editorial", href: "/politica-editorial" }]}
      />
      <article className="wifi-prose">
        <div className="wifi-page-intro">
          <p className="wifi-eyebrow">Como tratamos a informação</p>
          <h1>Texto claro. Oferta verificável. Escolha sua.</h1>
          <p>
            Os conteúdos da WifiConecta ajudam a entender internet e serviços
            relacionados antes de uma decisão de contratação.
          </p>
        </div>
        <h2>Uma dúvida por vez.</h2>
        <p>
          Organizamos os guias por contratação, velocidades, Wi-Fi e uso,
          operadoras e comparações. Cada página tem uma intenção principal e
          conecta o assunto a um próximo passo útil.
        </p>
        <h2>Fontes e limites.</h2>
        <p>
          Priorizamos materiais oficiais das operadoras, fabricantes e serviços
          citados. Não inventamos preço, cobertura, upload, fidelidade, taxa de
          instalação, prazo, ranking ou benefício. Quando falta informação,
          mostramos a necessidade de confirmação.
        </p>
        <h2>Promoção não é informação permanente.</h2>
        <p>
          Pacotes, preços e vantagens são apresentados exclusivamente pelo WhatsApp,
          conforme as condições atuais para o bairro e o perfil do cliente.
          Os artigos não publicam tabelas de planos fixos nem valores de promoções.
        </p>
        <h2>Comparação sem campeão automático.</h2>
        <p>
          Os guias explicam o que conferir sobre uso, disponibilidade e contrato.
          A comparação das opções atuais acontece no atendimento. Não
          declaramos uma operadora ou plano “o melhor” sem critérios e
          evidências.
        </p>
        <h2>Autoria e revisão.</h2>
        <p>
          A autoria deve corresponder a quem produziu ou assumiu
          responsabilidade pelo conteúdo. Não atribuímos experiências,
          credenciais ou revisão especializada fictícias. Ferramentas de apoio
          editorial podem ajudar na produção, mas os fatos e a publicação exigem
          revisão humana.
        </p>
      </article>
    </>
  );
}
