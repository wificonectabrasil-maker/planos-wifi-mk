# Lote 1 — revisão editorial para aprovação

Este lote trata somente dos suportes sobre operadoras e preço. Os dois artigos aprovados anteriormente continuam separados e não foram alterados. Não houve gravação no CMS público, publicação ou deploy. O [diagnóstico](DIAGNOSTICO.md) foi registrado antes das alterações e contém as limitações da SERP e do Search Console.

## Claro, Vivo ou TIM

**Intenção e evidência.** Ajudar a comparar banda larga fixa no mesmo endereço. A keyword principal cadastrada, `claro vivo ou tim internet residencial`, e as secundárias existentes foram mantidas. A SERP brasileira retornou comparadores, páginas comerciais e discussões locais, misturando também telefonia móvel; os resultados vieram com URLs intermediárias e não permitem atribuir posição definitiva. O relatório histórico indicou 18 impressões e posição média 15,61 no intervalo total; isso não é perda medida nem posição consolidada.

**O que mudou.** A comparação de marcas, tecnologias, atendimento, qualidade, preço e fidelidade foi preservada. A nova abertura informa que outras operadoras e provedores regionais acessíveis à equipe também podem entrar na consulta. O passo sobre CEP e o encerramento agora apresentam a WifiConecta como facilitadora, em vez de pedir consulta comercial individual ou encaminhar para a Claro. Um parágrafo ajuda a registrar o que está confirmado em propostas para o mesmo imóvel. Foi inserido o espaço ausente entre duas referências já existentes ao Consumidor.gov.br, preservando seus destinos.

| Parte original | Tratamento | Motivo |
| --- | --- | --- |
| Cobertura e seções Claro, Vivo e TIM | Mantidas | Ajudam a entender diferenças por imóvel, tecnologia e uso. |
| Provedores regionais | Mantidos e reforçados na abertura | A lista de marcas não esgota as alternativas acessíveis. |
| Indicadores de satisfação, reclamações e velocidade | Mantidos | Dados agregados são contextualizados, sem vencedor absoluto. |
| Simulação, fidelidade e combo | Mantidos | Preservam custo no período e condições da proposta. |
| Consulta por CEP e contratação da Claro | Reorientadas | A equipe consulta alternativas e ajuda a encaminhar a escolha confirmada; a prestadora confirma a viabilidade. |
| Imagens, H1, keyword e metadados | Mantidos | Não havia evidência suficiente para alterá-los. |

**CTA:** “Comparar operadoras no WhatsApp”, após a abertura e na conclusão, com mensagem específica e origem identificada. A informação continua disponível sem contato. O artigo mantém link ao pilar e aos suportes pertinentes; não foi incluído link comercial para concorrente. A referência externa à [Anatel](https://www.gov.br/anatel/pt-br/consumidor/compare-as-prestadoras/pesquisa-de-satisfacao-e-qualidade/satisfacao-e-qualidade-percebida) continua para fins informativos.

- [Versão publicada](operadoras-original.md) · [Versão revisada](operadoras-revisado.md) · [Diff completo](operadoras-comparacao.diff) · [Prévia mobile](operadoras-mobile.png)

## Internet residencial barata

**Intenção e evidência.** Ajudar a reduzir o custo real sem escolher uma conexão inadequada. A keyword principal cadastrada, `internet residencial barata`, e as secundárias existentes foram mantidas. A SERP consultada priorizou muitas ofertas por cidade e preço; isso não confirma uma oferta em São Paulo. Não há dados atualizados de consulta e URL no Search Console desta sessão.

**O que mudou.** Foi retirada a repetição literal do H1 no primeiro parágrafo. A simulação e as seções existentes foram preservadas. Um parágrafo ensina a somar mensalidades, taxas e adicionais no mesmo período e a conferir separadamente eventual multa de saída, sem tratá-la como cobrança certa. A abertura informa que a equipe consulta preços e condições para o endereço.

| Parte original | Tratamento | Motivo |
| --- | --- | --- |
| Simulação de duas ofertas em 12 meses | Mantida | R$ 1.327,80 versus R$ 1.198,80; diferença de R$ 129,00, valores fictícios. |
| Reajuste e fim de desconto | Mantidos | São condições diferentes, que precisam ser explicadas. |
| Instalação, primeira fatura, adicionais e equipamento | Mantidos | Afetam o custo total e não devem desaparecer na comparação. |
| Uso, Wi-Fi e combos | Mantidos | Ajudam a escolher serviço adequado sem comprar apenas pelo número de Mega. |
| Fidelidade e eventual multa | Mantidas e esclarecidas na fórmula | A multa depende da situação e não entra automaticamente em todas as contas. |
| H1, keyword e metadados | Mantidos | Poucas impressões não justificam uma troca de intenção. |

**CTA:** “Consultar preços no WhatsApp”, após a abertura e na conclusão. Os exemplos monetários do corpo são explicitamente fictícios; os preços e promoções reais dependem da consulta para o endereço. Links ao pilar, suportes e fontes oficiais permaneceram.

- [Versão publicada](barata-original.md) · [Versão revisada](barata-revisado.md) · [Diff completo](barata-comparacao.diff) · [Prévia mobile](barata-mobile.png)

## Segurança e validação

Os dois registros públicos foram lidos antes do trabalho e continuavam iguais aos snapshots de conteúdo e URL na conferência posterior. As propostas foram aplicadas pelo Tiptap em cópias de rascunho em `.cache-tests/wifi-lote1.db`, uma cópia do ambiente isolado, sem importar dados para produção. Os dois rascunhos anteriormente aprovados não foram modificados nessa cópia.

Slug, canonical, silo, hierarquia, H1, autoria, imagens, ALT, SEO title, description e Open Graph foram preservados nos testes. O conteúdo textual de HTML e JSON coincidiu; os destinos de links existentes e o link ao pilar foram mantidos. Os 13 destinos editoriais distintos responderam HTTP 200 na verificação. Os índices locais de links foram preenchidos.

Em 320, 390 e 430 px não houve transbordamento horizontal nas prévias. Foram verificados dois CTAs por artigo, mensagens específicas, número fictício do teste e evento de origem do primeiro botão, sem enviar mensagens. Build, TypeScript, lint e 12 testes unitários passaram. Isso não mede tráfego nem garante posições. A publicação dos textos e o deploy do código de CTA permanecem etapas futuras separadas e não autorizadas nesta revisão.
