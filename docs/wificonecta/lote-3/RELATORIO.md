# Lote 3: revisão editorial local

As cópias foram preparadas por leitura dos registros publicados, sem alterar o banco público. Os artigos integrais foram editados no Tiptap do banco isolado. Não houve publicação ou deploy.

## Internet, TV e streaming

Os resultados observados na [MelhorPlano](https://melhorplano.net/combo) e na [Claro](https://www.claro.com.br/blog/multi/tv-por-assinatura-ou-internet-com-streaming) combinam composição de serviços e custo. O original já cobre esses assuntos e traz simulações; a estrutura foi preservada. A referência à [Netflix sobre cobranças por parceiros](https://help.netflix.com/pt/node/41049) foi acrescentada junto à orientação sobre assinaturas antigas, e o link para modalidades comerciais foi corrigido para `/planos`. O cálculo ilustrativo de R$ 2.347,80 contra R$ 2.220,00, diferença de R$ 127,80, foi conferido.

## Instalação e primeira fatura

O original já explica agendamento, viabilidade, taxas, ciclo de cobrança e valores proporcionais. A consulta inicial foi atribuída à equipe pelo WhatsApp; a prestadora continua responsável pela viabilidade técnica. A afirmação sobre a antecedência de cinco dias recebeu [fonte da Anatel](https://www.gov.br/anatel/pt-br/consumidor/consumidor-novo/conheca-seus-direitos/cobranca). O link comercial passou a `/planos`. As contas de R$ 119,90 + R$ 90 = R$ 209,90 e de R$ 120 × 10/30 + R$ 60 = R$ 100 foram conferidas.

## Validação e limites

Os links foram verificados, assim como imagens, slug, canonical, silo, autoria, HTML e JSON. Os dois botões de WhatsApp por artigo, mensagens e identificadores foram testados na prévia. Foram verificadas as larguras 320, 390, 430 e 1440 px. Os CTAs dependem do código local em `PostArticle.tsx` e precisam estar no site público antes da aplicação dos textos.

Como nos lotes anteriores, o Tiptap normalizou campos vazios `faq_json` e `howto_json` de `null` para `[]` no banco isolado; preservar os valores originais exige resolver isso no fluxo de publicação. A SERP é uma observação pontual e não há métricas recentes do Search Console por consulta. As versões estão prontas para revisão editorial, não publicadas.
