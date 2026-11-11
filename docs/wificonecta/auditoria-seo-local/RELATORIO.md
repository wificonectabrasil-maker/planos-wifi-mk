# Auditoria editorial local: oito artigos de planos

Coleta: 10/11/2026. Produção consultada somente em leitura. Esta é uma primeira rodada de rascunhos, ainda não uma auditoria final: faltam leitura integral dos concorrentes, comparação atual de consultas no Search Console e validação visual dos artigos revisados no editor. Nenhuma alteração foi gravada no CMS ou publicada.

## Condições e evidências

- O banco remoto forneceu os oito registros publicados, com `content_html` e `content_json` do editor. As cópias locais originais e revisadas estão em `original/` e `revisado/`, respectivamente. Os JSONs são evidência e rascunhos: não são um mecanismo oficial de importação ou publicação. Confira novamente a versão atual antes de transportar trechos pelo editor.
- O site público apresentou para as oito URLs o canonical esperado, `index, follow` e um H1. O serviço de auditoria devolveu o HTML dessas oito páginas; isso não prova indexação efetiva ou posição no Google.
- Pesquisa DataForSEO Google, Brasil, português, 10/11/2026, cinco resultados por consulta: os retornos usam redirecionadores temporários `google.com/goto`, sem identificar com segurança todos os domínios nem permitir uma leitura completa das páginas. Os exemplos da tabela descrevem snippets, não uma análise integral dos concorrentes. Não inferir posição da WifiConecta quando não encontrada no recorte.
- O conector Search Console retornou erro, e os CSVs mencionados no diagnóstico não foram encontrados neste ambiente. O relatório anterior informa agregados de 14/10 a 07/11, sem permitir comparar páginas por período. As métricas de URL citadas abaixo vêm desse relatório, não de uma nova extração.
- As keywords atuais do CMS foram mantidas: não há evidência suficiente para substituí-las. O planejamento local contém slugs antigos para alguns briefs; os registros e canônicos reais foram usados como autoridade.
- Sem alteração de slug, `canonical_path`, `silo_id`, título, autoria, imagens, estado de publicação ou metadados nas cópias. H2 e contagem de imagens foram comparados entre HTML e JSON; isto não substitui validação completa no editor.

## Matriz resumida

As URLs da tabela têm o prefixo `https://wificonecta.com.br/planos-de-internet/`. "GSC ausente" não significa zero. As posições dos resultados da SERP correspondem apenas ao recorte consultado, não a ranking da WifiConecta.

| Artigo e slug | Keyword atual → proposta | Evidência disponível e intenção | Lacuna e rascunho local | Status |
| --- | --- | --- | --- | --- |
| Pilar `como-escolher-plano-internet-residencial` | planos de internet residencial → manter | SERP mistura listas de planos, guias e discussões; GSC por artigo indisponível | Comparação da mesma proposta por endereço, custos e uso; inclui o link faltante para velocidade. Hipótese: facilitar a decisão e a navegação. | Rascunho; revisar duplicação e renderização |
| `internet-residencial-barato` | internet residencial barata → manter | SERP mistura páginas locais e ofertas com preço; GSC por artigo indisponível | Exemplo fictício de custo em 12 meses com valores explicitamente ilustrativos. Hipótese: permitir comparar ofertas em vez de apenas mensalidade. | Rascunho; revisar cálculos e exemplos existentes |
| `claro-vivo-tim-internet-residencial` | claro vivo ou tim internet residencial → manter | SERP inclui comparações de duas marcas, relatos e páginas comerciais. Relatório anterior: 18 impressões e posição média 15,61 no intervalo completo, não queda medida. | Comparação pelo mesmo endereço e distinção entre indicadores de banda larga e móvel. Hipótese: evitar vencedor genérico. | Rascunho; conferir fontes e claims existentes |
| `operadoras-internet-no-meu-cep` | internet no meu cep → manter | SERP inclui consulta por endereço, comparador e guia. Relatório anterior: 41 impressões e posição média 17,17 no intervalo completo; consulta exata teve 18 impressões e 0 cliques em 28/10–07/11. | Resposta imediata sobre CEP, imóvel e próximos passos. Hipótese: atender a intenção operacional. | Rascunho; comparar com passo a passo já existente |
| `quantos-mega-de-internet-preciso` | quantos mega de internet preciso → manter | SERP inclui recomendações por perfil, tabela e teste. GSC por artigo indisponível. | Método de uso simultâneo e distinção entre download, upload e Wi-Fi. Títulos que sugeriam contratação de 1 Giga foram reformulados. Hipótese: dimensionar sem recomendar pacote automaticamente. | Rascunho; revisar H2 existentes e fontes |
| `combo-internet-e-celular` | combo internet e celular → manter | SERP inclui operadoras e comparadores; parte dos resultados mistura TV. GSC por artigo indisponível. | Exemplo fictício de 12 meses e efeitos de franquia, portabilidade e cancelamento. Hipótese: comparar combo com contratos separados. | Rascunho; conferir duplicação de simulações |
| `melhor-internet-tv-streaming` | combo internet tv streaming → manter | SERP inclui ofertas e listas de aplicativos. Relatório anterior: 66 impressões e posição média 53,48 no intervalo completo, não queda medida. | Distingue aplicativo disponível, assinatura incluída e cobrança separada. Hipótese: esclarecer a composição. | Rascunho; revisar a seção existente e fontes das assinaturas |
| `instalacao-internet-primeira-fatura` | instalação de internet residencial → manter | SERP inclui conteúdo comercial e guia de instalação. GSC por artigo indisponível. | Sequência de viabilidade a cobrança e exemplo proporcional fictício, com ressalva de que a regra real varia. Hipótese: preparar o leitor para conferir a fatura. | Rascunho; conferir método de cobrança e seção já existente |

## Verificação estrutural

Foi confirmado que o pilar original não tinha link para o suporte de velocidade; a cópia revisada inclui um link contextual para `/planos-de-internet/quantos-mega-de-internet-preciso`. Os sete suportes originais possuem link para o pilar. As cópias mantêm o mesmo valor dos campos protegidos; H2 do HTML e JSON, contagem de imagens e esse link foram checados automaticamente. Não foi realizada uma conversão pelo editor Tiptap nem uma renderização mobile dos rascunhos. Estes arquivos não devem ser gravados diretamente no banco.

## Fontes e análise complementar

- [TIM: consulta de cobertura por CEP e número](https://www.tim.com.br/para-voce/internet/internet-para-casa/tim-casa-internet/consulta-disponibilidade): exemplo de fluxo da prestadora, não garantia para qualquer endereço.
- [Claro: estimativa de velocidade por uso](https://www.claro.com.br/blog/internet/quantos-mbps-ou-gbps-voce-precisa): exemplo de guia de prestadora por perfil, com interesse comercial próprio.
- [Comparador Conectadum: custos e condições](https://www.conectadum.com/comparador-planos-internet-fibra): exemplo de comparação com custo em 12/24 meses; preços exibidos na fonte não foram adotados como ofertas.
- [Anatel: qualidade e medição](https://www.gov.br/anatel/pt-br/dados/qualidade/qualidade-dos-servicos/duvidas-frequentes/): fatores que influenciam a conexão e instrumentos de medição.
- [NIC.br: medição por Wi-Fi](https://docs.medicoes.nic.br/simet-integrado/projeto/medicao-wifi/): uma medição por Wi-Fi também reflete a rede sem fio local.

## Pendente antes de aplicar

Ler integralmente cada artigo e comparar cada bloco proposto com as respostas já presentes; verificar concorrentes por URLs diretas, fontes e links externos; obter Search Console por URL, consulta e dispositivo; revisar simulações e afirmações; preparar e renderizar no fluxo de rascunho do editor com HTML e JSON sincronizados. Se não houver staging que não publique, manter as cópias locais para revisão. Monitorar depois da publicação em períodos completos comparáveis, separando impressões, posição e CTR, sem assumir que mudanças na SERP foram causadas pelo texto.
