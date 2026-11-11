# Lote 2: revisão para aprovação

Os dois textos integrais foram copiados da leitura dos registros publicados para um banco local isolado. As alterações foram realizadas no Tiptap de desenvolvimento; produção não foi alterada.

## Quantos Mega de internet preciso?

A busca reúne comparações por perfil de uso, simultaneidade e ferramentas de estimativa. O artigo já oferece cálculo ilustrativo e distinção entre uso, equipamento e custos, portanto a estrutura foi preservada. Foram acrescentadas referências verificáveis: [Netflix: 15 Mbps para 4K](https://help.netflix.com/pt/node/306) e [Zoom: 3 Mbps de download e 3,8 Mbps de upload para 1080p](https://support.zoom.com/hc/pb/article?id=zm_kb&sysparm_article=KB0060756). A conta de 30 Mbps com margem de 30% permanece identificada como exemplo: 39 Mbps. O link sobre contratar serviços juntos passou a apontar ao suporte de combo; a âncora comercial aponta para `/planos`.

## Combo internet e celular

Os resultados abordam composição, franquia, descontos e comparação entre contratar junto ou separado. O artigo já cobre os critérios e traz uma simulação de 12 meses, que foi preservada. A projeção de 24 meses foi retirada na revisão editorial. A [Anatel explica as informações que devem constar nas ofertas](https://www.gov.br/anatel/pt-br/consumidor/conheca-seus-direitos/oferta-e-contratacao). Links comerciais foram corrigidos para `/planos`, e o esclarecimento da proposta foi direcionado ao atendimento humano.

## Fontes da análise e limites

Foram examinadas diretamente a [página da Claro sobre velocidade por uso](https://www.claro.com.br/blog/internet/quantos-mbps-ou-gbps-voce-precisa), a [ferramenta do NIC.br](https://internetquepreciso.nic.br/) e a [comparação de combo da Fibra Goiânia](https://fibragoiania.com.br/blog/combo-internet-e-celular-vale-a-pena). A observação é pontual e não representa posições permanentes ou dados do Search Console por consulta. Recomendações comerciais, preços e cobertura de concorrentes não foram reproduzidos como ofertas da WifiConecta.

## Validação

Os dois botões por artigo, mensagens e identificadores foram testados na prévia local; eles dependem das alterações locais de `PostArticle.tsx`, ainda sem confirmação de deploy público. Foram conferidos os links, imagens, HTML e JSON, slug, canonical, silo e autoria. O Tiptap converteu campos vazios `faq_json` e `howto_json` de `null` para `[]` no banco isolado; os conteúdos continuam vazios. Os exemplos financeiros foram calculados em centavos. Prévia sem transbordamento em 320, 390, 430 e 1440 px. Não houve publicação ou deploy.
