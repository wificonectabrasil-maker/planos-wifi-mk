# Reorganização editorial — 09/10/2026

Fonte do planejamento: arquivo “Planejamento editorial WifiConecta 15 artigos para começar o blog.md”, fornecido pelo responsável. A solicitação autoriza reorganizar páginas e preparar dois silos; os 15 artigos serão escritos depois pelo responsável. As instruções e sugestões do documento são referências editoriais, sem autorização para produzir ou publicar os artigos.

## Evidência da auditoria

Foram examinadas 20 URLs em https://planos-wifi-mk.vercel.app, incluindo título, canonical, robots, H1, H2 e texto principal, além das rotas e dos componentes deste repositório. A captura anterior está em `artifacts/wificonecta-editorial-audit-before.json`. As cinco URLs dos silos antigos retornavam 404 porque não havia artigos publicados. O banco tinha um rascunho “Novo post” sem silo; nenhum artigo publicado foi encontrado.

A revisão identifica sobreposição de finalidade e repetição de conteúdo, não uma perda de posições comprovada. Não foram examinados dados de consultas, impressões ou desempenho do Search Console. Páginas comerciais podem mencionar os mesmos serviços dos artigos quando têm função de atendimento; o problema editorial tratado aqui é a repetição das respostas e dos guias em várias páginas.

## Arquitetura resultante

| URL | Função exclusiva |
| --- | --- |
| `/` | Apresentar a WifiConecta e encaminhar a consulta humana pelo WhatsApp. |
| `/planos` | Apresentar as composições Claro e consultar serviços das operadoras. Sem preços públicos ou comparação editorial. |
| `/internet-empresarial` | Consulta comercial para CNPJ; não é guia de home office residencial. |
| `/internet-para-condominios` | Atendimento comercial a moradores e administração de condomínios. |
| `/planos-de-internet` | Hub “Planos e contratação”, com ícone de lista e navegação pelos artigos publicados. |
| `/wifi-e-fibra` | Hub “Wi-Fi e fibra óptica”, com ícone de roteador e navegação pelos artigos publicados. |
| `/sobre`, `/contato` e políticas | Identidade, atendimento, práticas editoriais e privacidade. |

Os hubs mostram uma apresentação breve, áreas temáticas e estado de preparação. Não contêm respostas antecipadas, FAQ, conteúdo de pilar ou páginas fictícias dos 15 artigos. Por solicitação expressa do responsável, esses dois hubs aparecem antes dos artigos; essa é uma exceção da marca à regra genérica de esconder hubs vazios do template. Permanecem `noindex, follow` e fora do sitemap enquanto não houver artigos publicados no respectivo silo.

A orientação posterior do responsável remove o índice tradicional `/blog`. Ele retorna 308 ao silo de contratação, sai do sitemap e deixa de receber links internos. Menu, home, rodapé e breadcrumbs acessam os silos diretamente. A hierarquia publicada destaca o pilar e agrupa os suportes por assunto, sem feed cronológico. A orientação mais recente define o caminho `/planos-de-internet`, sem prefixo `/blog`, e domínio canônico exclusivo `https://wificonecta.com.br`. Os links entre artigos são contextuais e redacionais, respeitando relações pilar–suporte e relações pertinentes entre suportes; não se aplica linkagem indiscriminada.

## Decisões por URL substituída

Todos os redirecionamentos abaixo são permanentes, com resposta 308. Fragmentos levam à seção comercial relevante e não criam uma segunda página indexável.

| URL anterior | Decisão / destino | Motivo |
| --- | --- | --- |
| `/blog` | Retirar índice → `/planos-de-internet` | Entrada direta no silo de contratação, por solicitação do responsável. |
| `/comparar` | Transformar → `/planos-de-internet` | Sua orientação genérica passa a ser organizada pelo hub; o futuro pilar explica a escolha. |
| `/internet-residencial` | Consolidar → `/planos#pacotes` | Consulta comercial residencial reunida na página de pacotes. |
| `/celular-e-internet` | Consolidar → `/planos#internet-celular` | Os benefícios comerciais ficam nos cards; a avaliação de combos fica no artigo 6. |
| `/tv-e-streaming` | Consolidar → `/planos#tv-streaming` | Consulta comercial de TV na composição correspondente; streaming e banda ficam no artigo 12. |
| `/operadoras` | Consolidar → `/planos#operadoras` | Diretório de atendimento, sem repetir critérios de comparação. |
| `/operadoras/claro` | Consolidar → `/planos#operadora-claro` | CTA de consulta por operadora; comparação editorial no artigo 3. |
| `/operadoras/vivo` | Consolidar → `/planos#operadora-vivo` | Mesmo princípio. |
| `/operadoras/tim` | Consolidar → `/planos#operadora-tim` | Mesmo princípio. |
| `/contratacao` | Redirecionar → `/planos-de-internet` | Grupo antigo substituído pelo silo de contratação. |
| `/velocidades` | Redirecionar → `/planos-de-internet` | Dimensionamento geral reservado ao artigo 5. |
| `/guias-de-operadoras` | Redirecionar → `/planos-de-internet` | Comparação de operadoras reservada ao artigo 3. |
| `/comparacoes-e-combos` | Redirecionar → `/planos-de-internet` | Combos e escolha reunidos no silo 1. |
| `/wifi-e-uso` | Redirecionar → `/wifi-e-fibra` | Rede doméstica e usos reunidos no silo 2. |
| `/planos/500-mega`, `/planos/600-mega`, `/planos/1-giga` | Redirecionar → `/planos-de-internet` | O futuro artigo 5 concentra a comparação de velocidades; não há catálogo fixo. |
| `/blog/planos-de-internet` e seus artigos | Alias permanente → `/planos-de-internet` e caminho do artigo | Remover o prefixo antigo e preservar uma única hierarquia canônica. |
| `/silos/{grupo-antigo}` | Redirecionar diretamente ao novo hub correspondente | Evitar passagem pelo hub antigo e uma segunda etapa de redirecionamento. |

Menu, rodapé, cards e links internos usam diretamente os destinos finais. As URLs substituídas saem do sitemap. `/consultar` continua redirecionando para `/contato`.

## Conteúdo reservado aos artigos

O backlog em `lib/telecom/editorial-plan.ts` foi substituído pelas 15 pautas recebidas: oito de contratação e sete de tecnologia/qualidade. Há um pilar por silo, 13 suportes, palavras-chave próprias e links previstos entre pilar e suportes. Nenhum post foi criado para essas pautas.

Os limites mais importantes para a redação futura são:

- O pilar de planos organiza critérios e aponta aos suportes; o pilar de fibra compara tecnologias de acesso.
- O artigo 5 dimensiona a casa inteira. Os artigos 12, 13 e 14 aprofundam streaming, jogos e trabalho, respectivamente.
- O artigo 6 avalia contratação conjunta. O artigo 12 trata de banda para vídeo, sem avaliar assinaturas e combos.
- O artigo 11 diagnostica Wi-Fi lento. O artigo 15 concentra método e interpretação do teste de velocidade.
- O artigo 8 explica contratação residencial em São Paulo. Home e páginas comerciais apresentam o atendimento da WifiConecta.
- O artigo 2 compara custo total. O artigo 7 explica permanência mínima, multas e contrato.

A seção da home com pequenos conselhos sobre jogos, upload, telas e roteador foi retirada. Os três “guias” que levavam a páginas comerciais deram lugar aos dois cards de silos. A página de índice de blog foi retirada por orientação posterior do responsável.

## Banco e URLs do CMS

`pnpm.cmd wifi:setup` cria ou atualiza somente os dois silos. Antes da escrita, salva o estado dos silos e a identificação dos posts em um snapshot local ignorado pelo Git. Desativa grupos antigos vazios quando presentes, sem apagar registros. Se um grupo antigo tiver qualquer post vinculado, aborta a operação em transação para exigir revisão do conteúdo.

O rascunho já existente foi preservado. Na verificação posterior há dois silos ativos e nenhum novo artigo. Não houve mudança de slug ou canonical de um artigo publicado.

A orientação mais recente remove a exceção de caminhos aninhados. `buildSiloCanonicalPath` e `buildPostCanonicalPath` geram somente `/{silo}` e `/{silo}/{slug}`. Canonicals, publicação, breadcrumbs, cards, sugestões de links no editor, auditoria e sitemap usam essa estrutura. `brandConfig.useBrandCanonicalOrigin` fixa a origem em `https://wificonecta.com.br`, mesmo no localhost e nas prévias da Vercel. Artigos do silo 1 terão `/planos-de-internet/{slug}`; artigos do silo 2 terão `/wifi-e-fibra/{slug}`. Outros projetos do template continuam com `/{silo}/{slug}`.

O número dos CTAs permanece +55 11 94884-4107. Atendimento atual em São Paulo, por uma pessoa; preços e condições continuam sob consulta. O vídeo da home mantém a reprodução completa em loop, sem áudio ou controles, com carregamento adiado.

## Validação e publicação

Na etapa final, as URLs passaram para `https://wificonecta.com.br/{silo}/{slug}` e foram aplicados ajustes de desempenho e navegação no celular. Build com TypeScript, lint dos arquivos dessa etapa, quatro testes unitários e 11 testes de navegador passaram. A inspeção do build de produção confirmou origem canônica, redirecionamentos diretos, sitemap e navegação móvel. A medição local e seus limites estão em [URLs e desempenho móvel](URLS-E-DESEMPENHO-MOVEL.md).

Build e TypeScript passaram na reorganização inicial. Os quatro testes unitários de arquitetura e banco e os 11 cenários de navegador passaram naquela etapa. Eles verificam a migração idempotente, preservação de rascunhos, recusa de migração com posts, URLs canônicas, 308, menu móvel, publicação futura e entrada dos hubs e artigos no sitemap, além dos pacotes e do loop completo do vídeo. A retirada posterior do índice é verificada pelos testes de arquitetura editorial, que cobrem o 308 de `/blog`, ausência de links e de entrada no sitemap, agrupamento de pilares e suportes e navegação por links contextuais em artigos de teste no banco isolado.

Após a retirada do índice, os três testes de arquitetura editorial passaram, assim como o build com TypeScript e o lint dos arquivos de código alterados nessa etapa. A inspeção visual em desktop e celular confirmou o menu direto aos silos e o breadcrumb Início → silo, sem links para `/blog`, excesso de largura ou erros de execução no navegador.

O lint foi comparado com o código anterior: há oito erros preexistentes em efeitos de estado dos diálogos e do painel de links do editor, sem novos erros nos arquivos modificados. A reorganização não corrige nem amplia esses problemas anteriores.

Alterações de código locais não atualizam automaticamente https://planos-wifi-mk.vercel.app. O deploy deve incluir estes arquivos e a configuração de redirecionamentos. Os dois silos já estão preparados no banco conectado. Nenhum dos 15 artigos foi produzido ou publicado.
