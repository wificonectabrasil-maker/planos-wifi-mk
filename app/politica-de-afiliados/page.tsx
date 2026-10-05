import { Breadcrumb } from "@/components/telecom/Shared";
import { telecomMetadata } from "@/lib/telecom/metadata";
export const metadata = telecomMetadata(
  "Transparência comercial e operadoras",
  "Entenda a diferença entre a WifiConecta, as operadoras citadas e as condições de contratação.",
  "/politica-de-afiliados",
);
export default function Page() {
  return (
    <>
      <Breadcrumb
        items={[
          { label: "Transparência comercial", href: "/politica-de-afiliados" },
        ]}
      />
      <article className="wifi-prose">
        <div className="wifi-page-intro">
          <p className="wifi-eyebrow">Condições visíveis</p>
          <h1>A marca do plano e quem atende você precisam ficar claros.</h1>
          <p>
            WifiConecta é a identidade desta plataforma. As operadoras fornecem
            os respectivos serviços e têm condições próprias.
          </p>
        </div>
        <h2>Marcas e relação comercial.</h2>
        <p>
          Mencionar Claro, Vivo, TIM ou um serviço de streaming não significa
          que o site seja oficial, autorizado ou parceiro dessas marcas. Uma
          relação comercial só deve ser apresentada como existente quando houver
          comprovação e identificação.
        </p>
        <h2>Oferta e disponibilidade.</h2>
        <p>
          Os pacotes e seus valores são apresentados exclusivamente pelo WhatsApp.
          Por enquanto, atendemos São Paulo. As promoções são temporárias e os
          benefícios e condições variam por bairro e perfil do cliente.
          O atendimento confirma as opções antes de uma contratação.
        </p>
        <h2>Encaminhamento e remuneração.</h2>
        <p>
          Qualquer intermediação, comissão ou vínculo comercial aplicável ao
          atendimento deve ser informado na oferta ou na etapa de contratação.
          Não presumimos que exista uma comissão ou parceria para toda marca
          mencionada.
        </p>
        <h2>A conversa vem antes da contratação.</h2>
        <p>
          Iniciar uma conversa no WhatsApp não assina contrato, não efetua pagamento e não
          garante instalação. A decisão vem depois da verificação de
          disponibilidade e das condições do serviço.
        </p>
      </article>
    </>
  );
}
