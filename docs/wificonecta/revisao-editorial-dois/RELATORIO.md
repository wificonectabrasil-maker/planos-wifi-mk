# Revisão editorial dos dois artigos prioritários

Preparada em 10/11/2026 em banco local isolado. As versões públicas não foram alteradas. Os arquivos completos e diffs são para revisão humana; não importar JSON ou HTML diretamente no banco de produção.

## Evidência de pesquisa e limites

Na consulta DataForSEO/Google Brasil, português, em 10/11/2026, `internet no meu cep` retornou, na amostra de oito resultados, guia de cobertura, provedores, mapa e um resultado com o título do artigo da WifiConecta. As URLs vieram como redirecionadores temporários do Google e a localização/dispositivo específicos não foram informados; portanto, não atribuímos domínio ou posição definitiva ao artigo. A amostra não representa toda a SERP.

Páginas diretas examinadas como referências competitivas, sem afirmar que todas ocupam uma posição específica nessa amostra:

- [TIM: consulta de disponibilidade](https://www.tim.com.br/para-voce/internet/internet-para-casa/tim-casa-internet/consulta-disponibilidade) solicita CEP e número e apresenta cidades atendidas. Limite: uma ferramenta de uma prestadora não compara toda a região. Na proposta da WifiConecta, essa página é identificada como canal da TIM e a orientação inclui a confirmação de unidade, pendências e provedores regionais.
- [Claro: critérios para contratar internet e TV](https://www.claro.com.br/blog/multi/criterios-para-contratar-internet-e-tv) apresenta critérios, perfis e checklist. Limite: o conteúdo está ligado à oferta da própria prestadora. O pilar revisado organiza a comparação para o mesmo endereço e período, com cálculo ilustrativo e links para os suportes, sem escolher uma operadora vencedora.
- [Conectadum: comparador de internet](https://www.conectadum.com/comparador-planos-internet-fibra) oferece filtros e custo em 12/24 meses, com a ressalva de que preços variam por cidade e CEP. Limite: suas referências comerciais podem envelhecer e não garantem cobertura no imóvel. A proposta usa um método manual e não apresenta preços como ofertas.

O Search Console atualizado por URL e consulta não estava acessível. O diagnóstico anterior é uma amostra pequena e não demonstra ganhos ou perdas por página; não se alteraram keywords, H1 ou metadados por causa desse volume.

## 1. Internet no meu CEP

**Intenção:** descobrir prestadoras candidatas e confirmar se a instalação pode ser feita no imóvel. Mantida a keyword `internet no meu cep` e o H1/SEO title/description atuais; a redação continua compatível com a intenção, e não há dado suficiente para uma troca.

**Problemas da versão anterior:** a diferença entre CEP, bairro e imóvel aparecia repetidamente antes e depois do passo a passo. As ações para resultado inconclusivo, prédio e vizinho ficavam espalhadas ao longo de muitas seções. A comparação de custo e tecnologia se aprofundava em temas de outros suportes.

**Revisão:** introdução direta; quatro passos executáveis; quadro com resultado por CEP, vizinho, apartamento e instalação pendente; orientações para consultar outros canais e provedores; perguntas curtas sobre viabilidade, fibra e responsabilidade da prestadora. A consulta da WifiConecta é identificada como atendimento humano, sem ferramenta automática. O link da TIM é novo e identificado como canal oficial daquela prestadora.

O corpo passa de aproximadamente 2.600 para 800 palavras; a redução é uma decisão editorial relevante e deve ser avaliada pelo responsável, não uma garantia de melhora de tráfego. Foram mantidas as duas imagens internas e seus textos alternativos, com ajuste de alinhamento para evitar texto espremido ao lado de imagens em celular. Mantidos links contextuais ao pilar, à comparação de prestadoras, ao custo e à instalação. Removidos os links a celular, velocidade, TV, pesquisa da Anatel, Consumidor.gov.br e hub, pois os trechos que lhes davam contexto foram condensados ou retirados. Incluídos `/planos` e a consulta oficial TIM.

- [Versão anterior integral](cep-original.md)
- [Versão revisada integral](cep-revisado.md)
- [Comparação completa](cep-comparacao.diff)
- [Prévia mobile 390 px](cep-mobile.png)

**Canibalização:** o artigo responde como verificar o imóvel; escolha geral, custo e comparação entre marcas continuam nos respectivos destinos. **Identidade protegida:** slug `operadoras-internet-no-meu-cep`, canonical `/planos-de-internet/operadoras-internet-no-meu-cep`, silo `planos-de-internet`, papel de suporte: sem alteração na proposta. **Status:** pronta para revisão editorial humana em ambiente isolado; não publicada.

## 2. Pilar de planos residenciais

**Intenção:** orientar a escolha inicial e distribuir aprofundamentos para os suportes. Mantida a keyword `planos de internet residencial`, H1, SEO title e description; a SERP não justifica mudá-los com a amostra de GSC disponível.

**Problemas da versão anterior:** os mesmos argumentos sobre viabilidade, mensalidade e contrato apareciam em blocos longos e no checklist. A velocidade surgia tardiamente, sem link para seu suporte, e a avaliação contratual era repetida.

**Revisão:** quatro critérios apresentados na ordem da decisão (endereço, uso, custo e contrato), método único para comparar propostas, resumo de combos e orientação para quem já tem plano. O exemplo de 12 meses foi preservado e verificado: 3 × 89,90 + 9 × 119,90 = 1.348,80; 12 × 109,90 = 1.318,80; diferença = 30,00. Os valores são fictícios. O pilar passa de aproximadamente 2.500 para 790 palavras: redução substantiva sujeita a revisão editorial humana.

Mantidos os sete links contextuais para os suportes publicados, inclusive o link antes ausente para velocidade; os sete suportes tinham link para o pilar nos snapshots lidos. Mantidas as três imagens internas e seus textos alternativos, com ajuste de alinhamento. A menção antiga à pesquisa de satisfação e o link duplicado de instalação e hub foram retirados com os blocos condensados; adicionados `/planos`, suporte de velocidade e [orientações da Anatel sobre oferta e contratação](https://www.gov.br/anatel/pt-br/consumidor/consumidor-novo/conheca-seus-direitos/oferta-e-contratacao).

- [Versão anterior integral](pilar-original.md)
- [Versão revisada integral](pilar-revisado.md)
- [Comparação completa](pilar-comparacao.diff)
- [Prévia mobile 390 px](pilar-mobile.png)

**Canibalização:** o pilar resume a decisão e encaminha os detalhes a CEP, preço, operadoras, velocidade, celular, TV e instalação; não vira catálogo de `/planos`. **Identidade protegida:** slug `como-escolher-plano-internet-residencial`, canonical `/planos-de-internet/como-escolher-plano-internet-residencial`, silo `planos-de-internet`, papel de pilar: sem alteração na proposta. **Status:** pronta para revisão editorial humana em ambiente isolado; não publicada.

## Validação e procedimento seguro

As propostas foram coladas e salvas pelo editor Tiptap em dois posts de rascunho de um banco `file:.cache-tests/e2e.db`, isolado e configurado pelos testes. Os HTMLs e JSONs resultantes estão nesta pasta como `*-tiptap.html` e `*-tiptap.json`; não são importadores. O editor salvou os documentos, o HTML renderizado mostrou o conteúdo esperado, as imagens preservaram `src` e `alt`, e o pilar apresentou os sete links. Nos dois posts de teste, slug, canonical e silo corresponderam aos valores originais e o status permaneceu rascunho.

A prévia autenticada passou pela verificação de transbordamento em 390 px. Foram usadas as imagens públicas existentes para a visualização, sem alterar os arquivos. Os 11 destinos distintos de links propostos responderam HTTP 200 na conferência; respostas de fontes podem variar. A leitura do banco remoto ao final confirmou que os campos presentes nos snapshots dos oito posts, inclusive conteúdo, slug, canonical, silo e timestamps, continuavam iguais.

Não houve gravação no banco remoto, publicação ou deploy. Antes de qualquer aplicação posterior, revisar as versões completas, a redução de conteúdo e links removidos; verificar se os registros públicos continuam iguais aos snapshots; aplicar pelo editor oficial com revisão humana e revalidar HTML, JSON, mídia e URLs. O ambiente local de teste não é um mecanismo de revisão paralela em produção.
