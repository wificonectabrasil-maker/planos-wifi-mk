# Revisão de copy por URL

Comparação com a versão anterior do repositório. Nas diferenças abaixo, linhas com `-` são o texto anterior e linhas com `+` são o texto novo; trechos JSX mostram a posição de cada frase na página. A página /planos usa o componente compartilhado indicado.

## /

```diff
diff --git a/app/page.tsx b/app/page.tsx
index 15e394a..8a71029 100644
--- a/app/page.tsx
+++ b/app/page.tsx
@@ -32,3 +32,3 @@ export default function Home() {
         <h1>Internet pra sua casa.<br /><em>Sem virar uma novela Mexicana.</em></h1>
-        <p className="wifi-hero-description">Quer instalar internet ou mudar de operadora? Consulte pacotes e promoções para seu endereço com a ajuda de uma pessoa.</p>
+        <p className="wifi-hero-description">Economize tempo ao pedir internet: uma pessoa entende sua necessidade, consulta opções para seu endereço e ajuda você a escolher com clareza.</p>
         <div className="wifi-hero-actions">
@@ -47,3 +47,3 @@ export default function Home() {
     </section>
-    <ContentSection title="A gente não escolhe só pelo número de Mega"><p>São tantos anúncios, preços diferentes e letras miúdas que pedir internet vira mais uma tarefa na agenda. A WifiConecta começa pela sua necessidade e pela disponibilidade do endereço.</p><p>Trabalhamos com opções de Claro, Vivo, TIM e provedores de bairro, conforme disponibilidade. Uma pessoa ajuda a conferir mensalidade, benefícios e regras entre as opções comercializadas. Você decide com as informações em mãos.</p><Link prefetch={false} href="/planos" className="wifi-text-link">Conhecer as modalidades e consultar pacotes <ArrowRight size={16} aria-hidden="true" /></Link></ContentSection>
+    <ContentSection title="O que você resolve com uma conversa"><p>Você conta o que precisa e onde mora. Uma pessoa da equipe entende sua rotina e consulta as alternativas disponíveis para o endereço.</p><p>Ela explica a composição, os valores e as condições das opções consultadas. Você escolhe e, após sua confirmação, a equipe encaminha o pedido à prestadora responsável.</p><Link prefetch={false} href="/planos" className="wifi-text-link">Conhecer as modalidades e consultar pacotes <ArrowRight size={16} aria-hidden="true" /></Link></ContentSection>
     <CampaignSlot placement="home" />
```

## /sobre

```diff
diff --git a/app/sobre/page.tsx b/app/sobre/page.tsx
index 3e7c868..9809156 100644
--- a/app/sobre/page.tsx
+++ b/app/sobre/page.tsx
@@ -1,3 +1,3 @@
 import Link from "next/link";
-import { Breadcrumb, RegionNotice } from "@/components/telecom/Shared";
+import { Breadcrumb } from "@/components/telecom/Shared";
 import { WhatsAppCTA } from "@/components/telecom/WhatsAppCTA";
@@ -11,12 +11,54 @@ export default function Page() {
   return <><JsonLd data={{ "@context": "https://schema.org", "@type": "Person", "@id": `${resolveSiteUrl()}/sobre#mike`, name: mikeProfile.name, jobTitle: mikeProfile.siteRole, description: mikeProfile.shortBio, url: `${resolveSiteUrl()}/sobre#mike`, image: `${resolveSiteUrl()}${mikeProfile.image.src}`, sameAs: mikeProfile.links.filter(link => link.platform !== "whatsapp").map(link => link.href), worksFor: { "@type": "Organization", "@id": `${resolveSiteUrl()}/#organization`, name: "WifiConecta", url: resolveSiteUrl() } }} /><Breadcrumb items={[{ label: "Sobre a WifiConecta", href: "/sobre" }]} /><article className="wifi-prose">
-    <div className="wifi-page-intro"><p className="wifi-eyebrow">Por que a WifiConecta existe</p><h1>A gente tira o trabalho chato do pedido de internet.</h1><p>Trabalho, família, compromisso e uma lista de coisas para resolver. Você não deveria precisar virar especialista em operadoras e letras miúdas para colocar internet em casa.</p></div>
-    <RegionNotice />
-    <h2>Uma pessoa atende você</h2><p>A WifiConecta nasceu para facilitar esse pedido. No WhatsApp, uma pessoa entende sua rotina, consulta as opções comercializadas para seu endereço e explica as condições. Não colocamos um chatbot no lugar do atendimento comercial.</p>
-    <h2>Conheça quem faz parte do time</h2>
+    <div className="wifi-page-intro"><h1>A vida já é corrida demais. Pedir internet não precisa ser mais um problema.</h1></div>
+    <p>Entre trabalho, família, compromissos e aquela lista de coisas que nunca acaba, às vezes mal sobra tempo para tomar um cafezinho.</p>
+    <p>Aí chega a hora de instalar internet em casa.</p>
+    <p>Você encontra uma promoção, depois outra, compara velocidades, tenta descobrir se a operadora atende seu endereço e ainda precisa entender o que está incluído, quanto vai pagar e quando o técnico pode aparecer.</p>
+    <p><strong>Era para ser simples. Mas nem sempre é.</strong></p>
+    <p>Foi justamente para facilitar esse processo que a WifiConecta surgiu.</p>
+    <p>Nossa proposta é tirar das suas mãos a parte mais cansativa do pedido de internet. Você conta o que precisa, uma pessoa da nossa equipe consulta as opções disponíveis e ajuda a entender qual pacote faz mais sentido para sua rotina.</p>
+    <p>Sem precisar passar horas procurando ofertas ou tentando descobrir sozinho as condições de cada contratação.</p>
+    <h2>Gente atendendo gente. De verdade.</h2>
+    <p>Aqui, o atendimento comercial não começa com uma inteligência artificial tentando adivinhar o que você quer.</p>
+    <p><strong>Você conversa com uma pessoa.</strong></p>
+    <p>Alguém que pode entender se sua casa precisa apenas de internet, se compensa combinar com o celular, se a família gosta de TV e streaming ou se uma câmera residencial seria útil.</p>
+    <p>Não queremos simplesmente oferecer o pacote com mais Mega.</p>
+    <p>Queremos ajudar você a encontrar uma opção que <strong>atenda sua necessidade, esteja disponível no endereço e tenha condições que façam sentido para você</strong>.</p>
+    <p>E se uma promoção parecer boa, mas tiver limitações importantes, isso também precisa entrar na conversa.</p>
+    <h2>Não existe um pacote perfeito para todo mundo.</h2>
+    <p>Quem passa o dia fora de casa pode querer juntar a internet residencial com a linha do celular.</p>
+    <p>Uma família que gosta de passar o fim de semana assistindo a filmes e séries talvez se interesse mais por um pacote com TV e streaming.</p>
+    <p>Já quem precisa acompanhar a residência pelo smartphone pode procurar uma oferta que combine internet e câmera.</p>
+    <p>E tem quem só queira uma conexão para trabalhar, estudar, conversar com a família e navegar sem complicação.</p>
+    <p><strong>São necessidades diferentes. Por que todo mundo teria que contratar a mesma coisa?</strong></p>
+    <p>A WifiConecta trabalha com a consulta de opções de Claro, Vivo, TIM e provedores regionais, conforme a disponibilidade comercial e técnica.</p>
+    <p>As composições, velocidades, benefícios e condições variam conforme a operadora, o endereço e a campanha vigente.</p>
+    <h2>Promoção boa precisa fazer sentido até depois da propaganda.</h2>
+    <p>Um preço interessante chama atenção. Claro que chama.</p>
+    <p>Mas a contratação não termina no valor destacado no anúncio.</p>
+    <p>É importante saber o que está incluído, quanto tempo dura a promoção, se existe fidelidade, como funciona a instalação e quando chega a primeira fatura.</p>
+    <p>Algumas ofertas podem incluir instalação gratuita e cobrança inicial aproximadamente um mês após a instalação. <strong>Essas condições precisam ser confirmadas para o pacote escolhido.</strong> O intervalo até a primeira mensalidade não representa, por si só, um período de teste gratuito.</p>
+    <p>Nosso papel é ajudar você a entender essas informações antes de encaminhar o pedido.</p>
+    <p>Porque ninguém merece descobrir uma condição importante só depois de contratar.</p>
+    <h2>Você escolhe. A gente ajuda a encaminhar.</h2>
+    <p>O processo começa com uma conversa.</p>
+    <p><strong>1. Conte o que você procura.</strong></p>
+    <p>Pode ser internet residencial, um combo com celular, TV, streaming ou câmera. Informe sua cidade e o endereço que precisa ser atendido.</p>
+    <p><strong>2. Confira as opções e as condições.</strong></p>
+    <p>Nossa equipe consulta as alternativas disponíveis, apresenta as informações comerciais e esclarece o que precisa ser verificado.</p>
+    <p><strong>3. Escolha com as informações em mãos.</strong></p>
+    <p>Depois da sua confirmação, ajudamos a encaminhar a solicitação à prestadora responsável.</p>
+    <p>A instalação, a manutenção da conexão e o faturamento são realizados pela operadora ou pelo provedor contratado, conforme suas próprias condições.</p>
+    <h2>Conheça quem está por trás do atendimento</h2>
     <AuthorCard profile={mikeProfile} id="mike" team />
-    <h2>Da escolha ao encaminhamento</h2><p>A ideia é ajudar você a conferir o que está incluído, o valor e as regras de cada benefício — inclusive quando a promoção que viu não atende seu endereço. Depois de sua confirmação, a equipe auxilia no encaminhamento do pedido.</p>
-    <h2>Não somos a operadora de internet</h2><p>Trabalhamos com opções de Claro, Vivo, TIM e provedores de bairro, conforme disponibilidade. A operadora ou o provedor contratado é responsável pela conexão, instalação, manutenção e faturamento. Citar uma marca não significa ser seu site oficial ou representante autorizado.</p>
-    <h2>A oferta de hoje pode mudar amanhã</h2><p>Pacotes variam por endereço, perfil e vigência. As condições atuais são conferidas na conversa. Campanhas publicadas precisam ter revisão, validade e restrições claras; exemplos antigos não viram promessas de menor preço, instalação sempre gratuita ou teste sem custo.</p>
-    <h2>Entender antes de contratar também faz parte</h2><p>Os guias estão organizados nos temas <Link prefetch={false} href="/planos-de-internet">Planos e contratação</Link> e <Link prefetch={false} href="/wifi-e-fibra">Wi-Fi e fibra óptica</Link>. Eles explicam dúvidas; a <Link prefetch={false} href="/planos">página de pacotes</Link> apresenta a consulta comercial.</p>
-    <div className="wifi-page-actions"><WhatsAppCTA source="about" label="Conversar com uma pessoa da WifiConecta" /><Link prefetch={false} href="/contato" className="wifi-text-link">Ver o canal de contato</Link></div>
+    <h2>De São Paulo para quem precisa simplificar a contratação.</h2>
+    <p>Nossa prioridade é a cidade de São Paulo, mas também recebemos solicitações de outras cidades do estado, incluindo Grande São Paulo, interior e litoral.</p>
+    <p>A disponibilidade de cada serviço depende da cobertura e das condições da prestadora para o endereço informado.</p>
+    <p>A WifiConecta é uma plataforma independente de orientação e intermediação comercial. Não somos a operadora responsável pela conexão, e citar marcas não significa que este seja um canal oficial dessas empresas.</p>
+    <h2>Deixa a parte chata com a gente.</h2>
+    <p>Você já tem coisa demais para resolver.</p>
+    <p><strong>Quando chegar a hora de pedir internet, comece por uma conversa.</strong></p>
+    <p>Conte o que precisa, confira as possibilidades e escolha com mais tranquilidade.</p>
+    <div className="wifi-page-actions"><WhatsAppCTA source="about" label="Consultar opções com uma pessoa no WhatsApp" /></div>
+    <p><em>WifiConecta. Internet que faz sentido pra você.</em></p>
+    <p>Conheça nossos <Link prefetch={false} href="/planos-de-internet">guias de planos e contratação</Link> e a <Link prefetch={false} href="/planos">página de pacotes</Link>.</p>
     <p><Link prefetch={false} href="/politica-editorial">Política editorial</Link> · <Link prefetch={false} href="/politica-de-afiliados">Transparência comercial</Link> · <Link prefetch={false} href="/politica-de-privacidade">Privacidade</Link></p>
```

## /planos

```diff
diff --git a/components/telecom/PackageInterests.tsx b/components/telecom/PackageInterests.tsx
index dc6e474..07dac0e 100644
--- a/components/telecom/PackageInterests.tsx
+++ b/components/telecom/PackageInterests.tsx
@@ -3,6 +3,6 @@ import { WhatsAppCTA } from "./WhatsAppCTA";
 const categories = [
-  { id: "internet-residencial", icon: House, title: "Internet residencial", interest: "Só internet residencial", text: "Para conectar a casa sem juntar serviços que você não usa. Conte quantas pessoas e aparelhos dividem a conexão.", checks: ["Tecnologia e velocidades disponíveis", "Roteador e alcance do Wi-Fi", "Mensalidade e condições do contrato"] },
-  { id: "internet-celular", icon: Smartphone, title: "Internet + celular", interest: "Combo de internet residencial e celular", text: "Já paga conexão de casa e dados móveis separados? Consulte se reunir os serviços faz sentido para sua rotina e sua conta.", checks: ["Franquia de dados e portabilidade", "Desconto e duração dos benefícios", "Cobrança conjunta e fidelidade"] },
-  { id: "tv-streaming", icon: MonitorPlay, title: "Internet + TV e streaming", interest: "Internet com TV Box e streaming", text: "Filmes, séries ou canais ao vivo? Diga o que sua família assiste. A lista de apps, sozinha, não conta a história toda.", checks: ["Canais, apps e modalidade das assinaturas", "Telas e regras de acesso", "Equipamento, duração e cobranças extras"] },
-  { id: "internet-camera", icon: Camera, title: "Internet + câmera residencial", interest: "Pacote de internet com câmera residencial", text: "Quer acompanhar a casa pelo celular? Algumas ofertas podem combinar internet e câmera. A equipe verifica se há uma opção para você.", checks: ["Modelo e propriedade do equipamento", "Aplicativo e armazenamento das imagens", "Instalação, suporte e custos adicionais"] },
+  { id: "internet-residencial", icon: House, title: "Internet residencial", interest: "Só internet residencial", text: "Para trabalhar, estudar e assistir em casa. Consulte opções de conexão e velocidades disponíveis para os aparelhos da sua rotina.", checks: ["Tecnologia e velocidades disponíveis", "Roteador e alcance do Wi-Fi", "Mensalidade e condições do contrato"] },
+  { id: "internet-celular", icon: Smartphone, title: "Internet + celular", interest: "Combo de internet residencial e celular", text: "Consulte combinações de internet residencial com linha e dados móveis. Compare a franquia e a cobrança conjunta com seus serviços atuais.", checks: ["Franquia de dados e portabilidade", "Desconto e duração dos benefícios", "Cobrança conjunta e fidelidade"] },
+  { id: "tv-streaming", icon: MonitorPlay, title: "Internet + TV e streaming", interest: "Internet com TV Box e streaming", text: "Consulte opções de internet com TV ou streaming para filmes, séries e canais ao vivo. Confira quais serviços estão incluídos ou são cobrados à parte.", checks: ["Canais, apps e modalidade das assinaturas", "Telas e regras de acesso", "Equipamento, duração e cobranças extras"] },
+  { id: "internet-camera", icon: Camera, title: "Internet + câmera residencial", interest: "Pacote de internet com câmera residencial", text: "Algumas ofertas combinam internet e câmera para acompanhar a casa pelo celular. Consulte disponibilidade, equipamento e condições de acesso às imagens.", checks: ["Modelo e propriedade do equipamento", "Aplicativo e armazenamento das imagens", "Instalação, suporte e custos adicionais"] },
 ] as const;
@@ -16,3 +16,3 @@ export function PackageInterests() {
     </article>)}</div>
-    <p className="wifi-section-note">Atendimento na capital e em outras cidades do estado, sujeito à disponibilidade. Operadora, preços, benefícios e vigência variam conforme a oferta. A consulta não garante cobertura.</p>
+    <p className="wifi-section-note">Atendimento na capital e em outras cidades do estado, sujeito à disponibilidade. Promoções, instalação, primeira cobrança, benefícios e vigência dependem das condições da oferta. A consulta não garante cobertura.</p>
   </div></section>;
```

## /internet-empresarial

```diff
diff --git a/app/internet-empresarial/page.tsx b/app/internet-empresarial/page.tsx
index 0deefce..d00714b 100644
--- a/app/internet-empresarial/page.tsx
+++ b/app/internet-empresarial/page.tsx
@@ -7,3 +7,3 @@ export default function Page() {
   return <>
-    <CommercialIntro path="/internet-empresarial" label="Internet empresarial" title="Internet empresarial em São Paulo: opções para a rotina do seu negócio" interest="Internet empresarial para CNPJ" cta="Consultar internet para minha empresa">Quando a conexão cai, a reunião trava, o pagamento demora e a equipe fica esperando. Conte como sua empresa usa a internet. A WifiConecta consulta opções para CNPJ na capital e em outras cidades paulistas, conforme a disponibilidade no endereço.</CommercialIntro>
+    <CommercialIntro path="/internet-empresarial" label="Internet empresarial" title="Internet empresarial em São Paulo: opções para a rotina do seu negócio" interest="Internet empresarial para CNPJ" cta="Consultar internet para minha empresa">Quando a conexão cai, a reunião trava, o pagamento demora e a equipe fica esperando. Uma pessoa entende os sistemas, equipamentos e horários da sua operação e ajuda a conferir o que perguntar na proposta. A WifiConecta consulta opções para CNPJ na capital e em outras cidades paulistas, conforme a disponibilidade no endereço.</CommercialIntro>
     <ContentSection title="O que precisa continuar funcionando?"><div className="wifi-commercial-grid">
```

## /internet-para-condominios

```diff
diff --git a/app/internet-para-condominios/page.tsx b/app/internet-para-condominios/page.tsx
index 0fa8bcc..769fb3e 100644
--- a/app/internet-para-condominios/page.tsx
+++ b/app/internet-para-condominios/page.tsx
@@ -8,5 +8,5 @@ export default function Page() {
     <CommercialIntro path="/internet-para-condominios" label="Condomínios" title="Internet para condomínios em São Paulo: cada necessidade tem uma consulta" interest="Internet para condomínio: entender disponibilidade e atendimento" cta="Verificar meu caso no WhatsApp">Uma oferta pode existir no bairro e ainda faltar viabilidade no seu bloco. Recebemos consultas da capital e de outras cidades do estado. Para moradores, o pedido é residencial; síndicos e administradoras começam pela demanda do prédio.</CommercialIntro>
-    <ContentSection title="Você quer conectar um apartamento?" id="moradores"><p>A consulta considera endereço, número, bloco e unidade quando necessário. Entrada da operadora no prédio, cabeamento, espaço técnico e regras de acesso podem fazer diferença na instalação.</p><p>A WifiConecta ajuda a consultar opções residenciais elegíveis e explica o próximo passo com a prestadora. Não é preciso contratar um pacote de TV para consultar internet no apartamento.</p><WhatsAppCTA source="condo-resident" category="condominio_morador" interest="Sou morador e preciso de internet no apartamento" label="Sou morador e preciso de internet" /></ContentSection>
+    <ContentSection title="Você quer conectar um apartamento?" id="moradores"><p>A consulta considera endereço, número, bloco e unidade quando necessário. A consulta começa pelo CEP e segue para o prédio, bloco e unidade: cobertura na região não confirma viabilidade em cada apartamento. Entrada da operadora, cabeamento, espaço técnico e regras de acesso podem fazer diferença na instalação.</p><p>A WifiConecta ajuda a consultar opções residenciais elegíveis e explica o próximo passo com a prestadora. Não é preciso contratar um pacote de TV para consultar internet no apartamento.</p><WhatsAppCTA source="condo-resident" category="condominio_morador" interest="Sou morador e preciso de internet no apartamento" label="Sou morador e preciso de internet" /></ContentSection>
     <ContentSection title="Você é síndico ou administra o condomínio?" id="sindicos"><p>Infraestrutura para os apartamentos, internet da portaria e conexão para áreas comuns são demandas diferentes. Comece dizendo qual problema quer resolver e quais serviços já existem no prédio.</p><p>A equipe verifica se existe uma modalidade comercial adequada e quem pode fazer a avaliação técnica. A conversa não representa aprovação de obra, projeto de rede coletiva ou garantia de atendimento a todas as unidades.</p><WhatsAppCTA source="condo-manager" category="condominio_gestao" interest="Sou síndico ou administrador e quero consultar uma demanda do condomínio" label="Sou síndico ou administrador" /></ContentSection>
-    <ContentSection title="O que precisa ser verificado no prédio?"><ul className="wifi-checklist"><li>Disponibilidade da operadora e viabilidade para cada endereço ou unidade.</li><li>Entrada de cabos, áreas técnicas e equipamentos existentes.</li><li>Autorização e regras de acesso para o técnico.</li><li>Responsabilidade por manutenção e por eventual obra.</li><li>Condições específicas de uma conexão para portaria, câmeras ou áreas comuns.</li></ul><p>Esses pontos devem ser alinhados entre a administração e a prestadora. Cobertura no bairro não equivale à liberação da instalação no prédio.</p></ContentSection>
+    <ContentSection title="O que precisa ser verificado no prédio?"><ul className="wifi-checklist"><li>Disponibilidade da operadora e viabilidade para cada endereço ou unidade.</li><li>Entrada de cabos, áreas técnicas e equipamentos existentes.</li><li>Autorização e regras de acesso para o técnico.</li><li>Responsabilidade por manutenção e por eventual obra.</li><li>Condições específicas de uma conexão para portaria, câmeras ou áreas comuns.</li></ul><p>A administração orienta sobre regras e acesso às áreas comuns; a prestadora avalia a viabilidade e suas responsabilidades técnicas. Esses pontos devem ser alinhados entre ambas. Cobertura no bairro não equivale à liberação da instalação no prédio.</p></ContentSection>
     <ContentSection title="TV Box e conexão do condomínio são coisas diferentes"><p>Um pacote de TV e streaming para a família é uma contratação individual. Ele não substitui infraestrutura de fibra nem um projeto de conectividade para o prédio.</p><p>Se você procura entretenimento no apartamento, consulte essa categoria na página de pacotes. Se a necessidade é do condomínio, explique a finalidade na conversa para verificar o encaminhamento possível.</p><Link prefetch={false} className="wifi-text-link" href="/planos#tv-streaming">Consultar internet, TV e streaming para a residência</Link><TransparencyNote /></ContentSection>
```

## /contato

```diff
diff --git a/app/contato/page.tsx b/app/contato/page.tsx
index 7c14be3..c2d9171 100644
--- a/app/contato/page.tsx
+++ b/app/contato/page.tsx
@@ -26,3 +26,3 @@ export default function Page() {
     )}
-    <ContentSection title="O que vale contar na primeira mensagem"><p>Sua cidade, bairro e o tipo de pacote já ajudam a começar. Para conferir disponibilidade, a prestadora pode precisar de CEP, rua, número e unidade. Você compartilha esses dados voluntariamente no WhatsApp, conforme a necessidade do atendimento.</p><p>Conte também quantas pessoas usam a rede e se precisa de instalação em uma data específica. Não há formulário de dados pessoais ou contratação automática neste site.</p></ContentSection>
+    <ContentSection title="O que vale contar na primeira mensagem"><p>Sua cidade, bairro e o tipo de pacote já ajudam a começar. Por exemplo: “Moro na capital, preciso de internet para um apartamento e quero consultar opções com celular.” Para conferir disponibilidade, a prestadora pode precisar de CEP, rua, número e unidade. Você compartilha esses dados voluntariamente no WhatsApp, conforme a necessidade do atendimento.</p><p>Conte também quantas pessoas usam a rede e se precisa de instalação em uma data específica. Não há formulário de dados pessoais ou contratação automática neste site.</p></ContentSection>
     <ContentSection title="O que acontece depois"><p>Uma pessoa verifica as alternativas comerciais e explica valores, benefícios, fidelidade, instalação e primeira cobrança. Você tira as dúvidas e decide se quer solicitar o serviço.</p><p>Abrir o WhatsApp não envia uma mensagem sem sua ação, não assina contrato e não garante instalação. O encaminhamento vem depois da sua confirmação; a prestação do serviço é da operadora escolhida.</p></ContentSection>
```
