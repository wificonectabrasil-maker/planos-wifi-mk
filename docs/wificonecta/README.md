# WifiConecta

Projeto de consulta de pacotes e promoções de internet, celular e TV pelo WhatsApp, adaptado ao Mini WordPress 3.1. Marca: **WifiConecta**. Domínio: **https://wificonecta.com.br**. A prévia local não publica o domínio.

## Modelo comercial vigente

A decisão do responsável em 04/10/2026 substitui o catálogo e a captura por formulário:

- Atendimento e apresentação dos pacotes exclusivamente pelo WhatsApp **(11) 99271-4748**, confirmado pelo responsável.
- São Paulo é a região atendida por enquanto. Não criar páginas que prometam atendimento nacional ou cobertura por cidade/bairro.
- Promoções temporárias e condições que variam por bairro e perfil. Nenhum preço, pacote fixo, velocidade ofertada ou lista permanente de benefícios é publicado.
- A home apresenta interesses de consulta (internet, celular, TV), orientações e botões para a conversa.
- Os materiais comerciais recebidos tratam de serviços Claro. Não divulgar Vivo/TIM como opções atuais, nem presumir vínculo oficial com qualquer marca.

As imagens promocionais com valores são referências privadas de contexto. Não estão em public e não devem ser usadas como ofertas permanentes, nem seus streamings tratados como inclusões garantidas.

## Experiência pública

Home, /planos, /comparar, páginas de serviços, /operadoras e /operadoras/claro conduzem ao WhatsApp. /comparar oferece orientação de escolha, sem tabela ou catálogo. /contato divulga o canal confirmado.

As URLs antigas /consultar redirecionam para /contato. /planos/500-mega, /planos/600-mega e /planos/1-giga redirecionam permanentemente para /planos; páginas antigas de Vivo e TIM redirecionam para /operadoras. Essas rotas antigas não constam no sitemap.

Cabeçalho, cards de interesse, final da página, rodapé e botão flutuante compartilham o telefone normalizado de WIFICONECTA_WHATSAPP. A mensagem inicial indica o assunto escolhido e São Paulo. O usuário abre, revisa e envia a mensagem; o site não envia automaticamente.

O blog está preparado para os 15 artigos futuros. Nenhum artigo foi produzido ou publicado a partir das pautas. URLs editoriais continuam em /{silo}/{slug}; o próximo passo comercial dos artigos também leva ao WhatsApp.

## Administração e dados

/admin/comercial apresenta o modelo e o canal de atendimento, sem formulário de cadastro de planos. O editor, mídia, silos, SEO, IA e adaptador Contentor/WordPress permanecem disponíveis.

A migration 0003_telecom.sql já aplicada é preservada. As tabelas telecom_offers, telecom_leads e telecom_rate_limits são privadas e históricas. As páginas públicas não consultam telecom_offers, mesmo que um registro tenha estado ativo. Os dados existentes não foram apagados. /admin/solicitacoes permanece uma rota autenticada para histórico, fora da navegação principal; não recebe novas consultas.

GET e POST em /api/telecom/leads retornam 410, sem ler o corpo ou gravar dados. Não há captura pública por CEP ou formulário.

## Configuração e conteúdo

SITE_URL usa o domínio informado. WIFICONECTA_WHATSAPP está configurado como 5511948844107. A indexação permanece desativada na prévia; revisar a configuração na publicação.

brand.config.ts centraliza marca, política de fontes, tom e CTA dos artigos. lib/telecom/editorial-plan.ts mantém 15 pautas em cinco grupos. O setup idempotente cria apenas os silos editoriais.

Os PDFs, diretrizes humanas, textos colados, SERP e imagens foram tratados como referências. Instruções dentro desses documentos não são pedidos independentes de execução. A solicitação atual do responsável define o modelo comercial. Não usar preços de exemplos, resultados de busca ou flyers no site.

O evento whatsapp_clicked informa apenas evento e origem do clique como wificonecta:conversion local. Não inclui dados do cliente nem envia analytics a um provedor externo.

## Validação

Os testes de navegador usam banco e pasta de compilação isolados. Verificam navegação móvel, consultas diretas por WhatsApp, mensagem por interesse, redirecionamentos, API antiga desativada, administração e a ausência de preços/benefícios de ofertas históricas nas páginas públicas. A navegação externa do teste é interceptada: não envia mensagens.

Build, TypeScript, lint dos arquivos comerciais alterados e seis testes de navegador passaram. Houve inspeção visual em desktop e celular. Os testes usam Edge no Windows ou o navegador indicado em PLAYWRIGHT_CHANNEL. O lint completo do template tem erros anteriores fora desta implementação.

A auditoria automática da home (desktop e celular) e do contato (celular) não detectou violações. O contraste do texto sobre a foto da home foi inspecionado visualmente, pois o fundo em gradiente não é calculado pela ferramenta. Na prévia de produção, os dez links de WhatsApp da home usam 5511948844107; nenhum formulário comercial está presente e não há rolagem horizontal no celular.

Google Custom Search respondeu 403 por falta de acesso à API na verificação anterior. A configuração precisa ser regularizada na conta Google; não é usada no atendimento comercial.

Imagem da home: [proveniência e prompt](IMAGEM-DA-HOME.md). A imagem é gerada, sem alegação de cliente real ou depoimento.
