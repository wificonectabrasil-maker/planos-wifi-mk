# Correção da conversão para WhatsApp — dois artigos

Esta revisão substitui as propostas anteriores para os dois artigos. O conteúdo continua em rascunhos num banco local isolado, sem gravação nos posts públicos ou deploy.

## Internet no meu CEP

A abertura explica que a equipe consulta cobertura, planos, preços e promoções das operadoras e provedores acessíveis para o endereço. O passo a passo começa com os dados do imóvel e uma conversa no WhatsApp. O quadro explica região atendida, viabilidade pendente, imóvel não atendido e instalação não liberada. São mantidas as explicações sobre infraestrutura, diferenças entre consultas, provedores regionais e responsabilidade da prestadora.

O link comercial para consulta na TIM foi retirado. O artigo não direciona o leitor a consultar prestadoras ou comparadores por conta própria. Os links editoriais internos apontam para o pilar, comparação de prestadoras, custo e instalação; o CTA comercial principal é o WhatsApp.

CTA nos pontos de abertura, depois do quadro prático e na conclusão: **Consultar cobertura e promoções no WhatsApp**.

Mensagem: “Olá! Quero saber quais operadoras atendem meu endereço e consultar os planos, preços e promoções disponíveis. Podem me ajudar?”

[Artigo completo](cep-final.md) · [Prévia mobile](cep-final-mobile.png) · [Comparação com o original](cep-original-para-final.diff) · [Comparação com a versão condensada](cep-revisado-para-final.diff)

## Como escolher plano residencial

A abertura apresenta a equipe como facilitadora da consulta e comparação. O texto mantém as quatro etapas, simulação fictícia de 12 meses, comparação de propostas, referência à Anatel e orientações para troca de prestadora. Os sete suportes continuam vinculados por links contextuais. A página `/planos` continua como navegação informativa, sem substituir os botões de conversão.

CTA nos pontos de abertura, após o bloco de critérios e na conclusão: **Encontrar meu plano no WhatsApp**.

Mensagem: “Olá! Estou procurando internet para minha casa. Quero comparar os planos e promoções disponíveis para meu endereço. Podem me ajudar?”

[Artigo completo](pilar-final.md) · [Prévia mobile](pilar-final-mobile.png) · [Comparação com o original](pilar-original-para-final.diff) · [Comparação com a versão condensada](pilar-revisado-para-final.diff)

## Implementação e verificação

Os CTAs usam o componente compartilhado `WhatsAppCTA`, com o número fornecido pelo contexto da marca e fontes de evento distintas por artigo e posição. A opção de mensagem personalizada preserva o comportamento padrão dos demais botões. Os componentes específicos são exibidos para as versões revisadas identificadas pelos respectivos títulos de seção; na ausência dessas seções o artigo mantém a apresentação anterior. As anotações de botão nos arquivos Markdown indicam a posição dos componentes e não fazem parte do texto salvo no Tiptap.

Nos testes do editor e da prévia, ambos os rascunhos foram salvos por Tiptap no banco local. Foram verificados os três links de cada página, mensagens pré-preenchidas, número fictício do teste, evento de origem do primeiro botão, contraste e tamanho de toque. O teste não enviou mensagens. O HTML e o JSON têm o mesmo texto; o pilar contém os sete links de suporte; as imagens mantêm origem e ALT. A apresentação foi conferida em 320, 390 e 430 px. Os links editoriais de destino foram conferidos, e os novos CTAs usam o telefone configurado em runtime.

Slug, canonical, silo, H1, SEO title, descrição e dados da marca não foram deliberadamente alterados. Os registros publicados não receberam escrita nesta etapa. A cópia local de revisão está em `.cache-tests/wifi-revisao-editorial.db`; é um artefato de desenvolvimento, não um banco de publicação. Antes de qualquer aplicação posterior, compare novamente os registros atuais e use o fluxo oficial de edição com revisão.
