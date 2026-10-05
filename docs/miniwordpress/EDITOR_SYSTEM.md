# Editor System

Este documento define o editor de posts do Mini WordPress.

O editor e a principal estacao de trabalho do sistema. Ele mistura uma area publica da marca, onde o artigo e editado/visualizado, com paineis administrativos do Mini WordPress. Essa separacao e obrigatoria.

Atualizacao projeto 2026-05-18: o editor inclui ferramentas de revisao SEO por KGR, Drive support, Guardiao SEO com brief para GPT, Duplicacao Interna acionavel, Links Internos IA e Agente Visual manual.

## Zonas do editor

### Area da marca

A area central do artigo pertence a marca.

Ela inclui:

- Fundo do artigo.
- Tipografia do artigo.
- Cores do texto publico.
- Imagens.
- Espacamento editorial publico.
- Indice/estrutura publica quando renderizada como preview.
- Componentes do artigo que o visitante final vai enxergar.

No codigo atual essa area e protegida por `.editor-public-preview`.

### Area do Mini WordPress

Tudo que controla, audita, sugere ou publica pertence ao sistema.

Inclui:

- Header do editor.
- Toolbar de formatacao.
- Bubble menus.
- Painel esquerdo de inteligencia.
- Painel direito de metadados/revisao/publicacao.
- Popups de links, midia, produto e afiliacao.
- Estados de IA.
- Busca interna no artigo.

## Arquivos principais

- `components/editor/AdvancedEditor.tsx`: orquestracao do editor.
- `components/editor/ContentIntelligence.tsx`: painel esquerdo.
- `components/editor/EditorInspector.tsx`: painel direito.
- `components/editor/TextSearchPanel.tsx`: busca no artigo.
- `components/editor/InternalLinksPanel.tsx`: sugestoes de links internos.
- `components/editor/LinkHygienePanel.tsx`: higiene de links.
- `components/editor/GuardianPanel.tsx`: guardiao SEO e melhorias.
- `components/editor/ReviewPanel.tsx`: revisao, Duplicacao Interna e briefs de auditoria.
- `components/editor/VisualPlanPanel.tsx`: Agente Visual, prompts de capa/respiro/tabela e checklist manual.
- `components/editor/TermsPanel.tsx`: termos, LSI, entidades e apoio semantico.
- `components/editor/Mini WordPressBubbleMenu.tsx`: menu flutuante atual, ainda com nome legado.
- `components/editor/AdvancedLinkDialog.tsx`: popup de link.

## Ordem operacional do painel esquerdo

A ordem atual deve seguir a frequencia de uso:

1. Buscar no artigo.
2. Estrutura H2/H3/H4.
3. Links internos IA.
4. Higiene de links.
5. Guardiao SEO.
6. Termos / LSI IA.

Justificativa:

- Buscar no artigo e usado o tempo todo.
- Estrutura e usada durante a escrita.
- Links internos entram na producao e revisao semantica.
- Guardiao SEO orienta qualidade.
- Termos / LSI e SEO local entram depois, por isso ficam no fim.

## Painel direito

O painel direito deve concentrar configuracoes e etapas finais.

Abas atuais:

- Post.
- SEO / KGR.
- Revisao.
- E-E-A-T.
- Publicar.

Contrato:

- Criacao/edicao principal fica em Post e SEO / KGR.
- Revisao manual, duplicacao, schema, SERP e verificacoes pos-publicacao ficam em Revisao.
- E-E-A-T deve concentrar autoridade, fontes, autores, riscos e confiabilidade.
- Publicar deve ser enxuto e focado em status final.

No projeto, a aba Revisao deve manter Duplicacao Interna acionavel e o Agente Visual deve aparecer como etapa editorial manual, sem gerar ou inserir imagens automaticamente.

## Busca no artigo

`TextSearchPanel` e uma ferramenta de alta frequencia.

Regras:

- Sempre aparecer no topo do painel esquerdo.
- Nao depender de scroll para ser encontrada.
- Mostrar quantidade de resultados.
- Permitir anterior/proxima/limpar.
- Manter popup acessivel.
- Ser compacta.

## Termos / LSI IA

`TermsPanel` e ferramenta de enriquecimento semantico, nao de escrita inicial.

Funcoes esperadas:

- Entrada para palavras-chave.
- Conversao semantica em sinonimos, relacoes e entidades.
- Sugestoes harmonicas para introduzir no artigo.
- Entrada de endereco/localidade para SEO local.
- Sugestoes de pontos de referencia, estabelecimentos, bairros, hospitais, praca, escola, restaurante e orgaos publicos quando fizer sentido.
- Sugestoes de fontes confiaveis, como Wikipedia, sites governamentais, entidades tecnicas ou institucionais.

Regras:

- Nao forcar termos artificiais.
- Sugerir adaptacao leve de frase quando o termo exato soar ruim.
- Marcar se o termo e sinonimo, entidade, fonte, local, pergunta ou relacao.
- Indicar onde usar: intro, corpo, conclusao, FAQ, bloco local, fonte externa.

## Melhoria de texto

A API de melhoria de fragmento deve considerar:

- Posicao do trecho: inicio, meio ou fim.
- Tom da marca.
- Nicho do projeto.
- Intencao do artigo.
- Retencao do leitor.
- Silo e palavra-chave principal.
- Necessidade de preservar naturalidade.

Retorno esperado:

- Texto melhorado.
- Explicacao objetiva.
- Motivo editorial.
- Termos/ancoras semanticas incorporadas.
- Alertas quando a mudanca pode alterar sentido.

## Links internos

O editor deve sugerir links internos com semantica, nao apenas correspondencia exata de palavra-chave.

Regras:

- Procurar sinonimos e expressoes relacionadas.
- Priorizar trechos naturais como ancora.
- Evitar links roboticos.
- Considerar hierarquia do silo.
- Permitir sugestao de pequena mudanca na frase para encaixar link.
- Explicar por que o link ajuda o silo.

Separacao atual:

- Guardiao SEO sugere ancoras semanticas para preparar frases no meio/final do artigo.
- Links Internos IA e a ferramenta de aplicacao/selecionamento preciso.
- Duplicacao Interna pode recomendar linkar quando ha apoio sem concorrencia.

## Guardiao SEO

O Guardiao SEO e uma ferramenta de diagnostico editorial, nao de aplicacao automatica.

No projeto ele deve mostrar:

- Diagnostico LSI/PNL.
- Checks de silo, E-E-A-T/YMYL, SEO local e anticanibalizacao.
- Links internos no meio/final com anchors curtas.
- Botao `Copiar relatorio para GPT`, contendo resumo LSI/PNL, acoes, anchors, E-E-A-T/YMYL e instrucao para usar junto com Duplicacao Interna.

## Duplicacao Interna

A experiencia principal deve ser triagem:

- Resumo executivo.
- Pares prioritarios.
- Trechos tecnicos somente quando precisam reescrita.
- Copia compacta para GPT e relatorio completo apenas como auditoria secundaria.

## Agente Visual

O Agente Visual prepara imagens editoriais para um artigo pronto.

Regras atuais:

- Capa: prompt de edicao sobre foto-base de banco de imagem, crop-safe e com direcao de arte variavel.
- Capa preserva a foto/pessoa original e adiciona elementos AR editoriais inspirados em Google Search/I/O 2026, sem logotipo oficial nem UI copiada.
- Capa usa a variavel diferencial do slug/intencao e varia camera, pose, acao, objeto principal, composicao e elementos AR para evitar miniaturas iguais.
- Respiro: 1:1, somente para marcacoes explicitas ou fallback unico quando necessario.
- Respiro usa como fonte principal o trecho depois da marcacao e o bloco/H2/H3 seguinte; quando houver HTML, a secao estruturada e preferida; nao deve repetir a keyword global quando o trecho local tem tema proprio.
- Respiro deve expor trecho usado, frase forte, termos especificos e diferenciacao visual no painel.
- Respiro deve variar layout, objeto focal, acao visual e itens de apoio; nao repetir a mesma metafora quando duas marcacoes caem em tema parecido. Se duas marcacoes forem equivalentes, marcar duplicidade visual em vez de forcar novo prompt.
- O painel do Agente Visual deve oferecer prompts separados para GPT Imagem e Gemini/Nano Banana, com contador de caracteres e aviso de prompt longo.
- Prompts diretos nao devem comecar com "Voce e o Agente Visual" e nao podem ser truncados no meio de frase.
- Gemini/Nano Banana nao recebe formato/dimensao no prompt principal; qualquer texto deve ser em portugues do Brasil; elementos devem ser rigidos e claros, sem borracha/liquido/blobs.
- Tabela visual: 5:4, apoio opcional para tabela HTML.
- Prompt principal para ChatGPT Images deve ser limpo, visual, local ao trecho e com poucos elementos.
- Marcacao, posicao, contexto antes/depois, alt, legenda, arquivo e checklist ficam na UI/brief tecnico.
- Fluxo manual: prompt_ready -> generated -> uploaded -> inserted -> approved.

## Nomes legados

Alguns componentes ainda carregam nomes da Mini WordPress, como `Mini WordPressBubbleMenu`. Para pacote neutro, renomear para nomes de Core:

- `Mini WordPressBubbleMenu` -> `EditorBubbleMenu`.
- `GuardianPanel` pode permanecer se for nome de produto, mas deve remover prompts Mini WordPress.
- Textos "Mini WordPress" no editor devem vir de `brandConfig`.

## Checklist de qualidade

- O artigo central nao recebe dark mode do admin.
- O painel esquerdo abre com busca visivel.
- Termos / LSI fica no fim.
- SERP do post esta em Revisao.
- Guardiao SEO copia brief compacto para GPT.
- Duplicacao Interna nao deve despejar todos os matches baixos na experiencia principal.
- Agente Visual nao deve mandar ChatGPT Images ou Gemini/Nano Banana acessar Drive nem incluir marcacoes do editor no prompt principal.
- Popups nao possuem texto invisivel.
- A toolbar e compacta.
- Os botoes importantes usam icons quando possivel.
- O editor continua editavel depois de aplicar sugestao de IA.
- A marca muda sem quebrar a interface do Mini WordPress.

## Melhorias de Usabilidade, Correspondência Semântica e Variantes de Sugestão (2026-05-22)

Para otimizar drasticamente a eficiência do trabalho editorial, o editor passou por uma ampla reestruturação técnica em usabilidade, inteligência artificial e processamento de linguagem natural:

### 1. Painéis Colapsáveis de Alta Densidade
Para sanar o scroll excessivo do painel lateral esquerdo (Painel de Inteligência), foi adotado um modelo de cards bento interativos e colapsáveis:
- **Agente Visual (`VisualPlanPanel`)**: Cada tipo de imagem (Capa, OG, Respiro, Tabela) inicia fechado por padrão. Os botões de ação rápida como **GPT Imagem**, **Gemini/Nano** e **Marcar** ficam visíveis no estado fechado. Informações ricas secundárias (direção de arte, checklists, alt, prompts estendidos) expandem-se sob demanda ao clicar no header ou no chevron.
- **Estrutura H2/H3/H4 (`ContentIntelligence`)**: O outline estrutural inicia colapsado, mostrando apenas títulos agregados e a contagem total de tags. Ao ser expandido, revela a árvore interativa completa com atalhos clique-para-rolar (click-to-jump).
- **Guardião SEO (`GuardianPanel`)**: Todas as listas analíticas densas da IA (Silo e Hierarquia, E-E-A-T, SEO Local, Anticanibalização) foram acondicionadas em blocos `<details>` com chevrons dinâmicos CSS.
- **Links Internos IA (`InternalLinksPanel`)**: Cada card de link sugerido inicia fechado. O usuário vê de imediato o destino, score, tipo do link e os botões essenciais (**Ver frase**, **Aplicar link**). Justificativas ricas (linking principle, pontes semânticas) ficam protegidas no estado colapsado.

### 2. Geração Contextual de 3 Variantes de Reescrita
O sistema de melhoria de texto do editor evoluiu de uma reescrita única e opaca para um gerador inteligente de 3 abordagens distintas, providas pela rota `/api/admin/improve-fragment`:
- **Abordagem 1 (Fluidez e Autoridade)**: Ajuste focado no tom da marca projeto (maduro, confiável, voz própria do médico escritor).
- **Abordagem 2 (Resolução Estrutural de Atrito)**: Foco estrito em resolver a anomalia diagnosticada (duplicação, repetição excessiva ou inserção semântica de palavra de busca).
- **Abordagem 3 (Conexão Empática/Conversacional)**: Foco em ritmo de leitura, clareza e quebra de termos robóticos para melhorar a retenção.

### 3. Destaque Visual Ativo (Highlight) e Re-Foco no Tiptap
Ao interagir com as 3 opções de reescrita no `GuardianPanel`, o editor ProseMirror:
- Recupera o foco (`editor.commands.focus()`) automaticamente.
- Define a seleção visual exata (`from`, `to`) sobre o trecho que está sendo analisado, destacando-o de forma persistente.
- Executa rolagem suave (`scrollIntoView`) para centralizar o trecho de texto no centro do canvas.
- Esse mecanismo auxilia o editor humano a identificar instantaneamente o local do impacto antes de clicar em "Aplicar Melhoria".

### 4. Integração Multicanal no Editor
A geração de 3 variantes de melhoria foi acoplada a múltiplos pontos estratégicos do editor:
- **Artigo/Alerta Encontrado (Guardião SEO)**: Alertas como densidade excessiva (`kw-stuffing`), palavra-chave no início e plano visual possuem o botão contextual **Sugerir Alternativas** para tratar os trechos em tempo real.
- **Buscar e Linkar (`ArticleFindDialog`)**: O botão **Melhorar** com ícone `WandSparkles` ao lado de cada ocorrência de busca localiza o trecho, fecha o modal e abre o painel esquerdo do Guardião SEO carregando as alternativas estruturadas.
- **Duplicação Interna (`ReviewPanel`)**: Na listagem de trechos redundantes de plágio interno, o botão **Sugerir Alternativas** executa o algoritmo `findContiguousTextPosition(editor, searchText)` para achar a posição exata da redundância no documento (mesmo cruzando tags HTML internas ou hiperlinks) e gerar sugestões personalizadas para reescrita estrutural direta.
- **Atualização Direta de Metadados (`setMeta`)**: Para problemas relacionados a metadados (`title` e `metaDescription` na barra direita do editor), o painel intercepta o `activeSuggestion.targetField` e, em vez de injetar o texto no documento ProseMirror, aplica a melhoria diretamente ao estado reativo do formulário do artigo via `setMeta`, permitindo alteração com um único clique.

### 5. Auditor Semântico Adaptativo PT-BR
Para erradicar alertas falsos de "Palavra-chave não encontrada no início" ou no H1/H2 (ocasionados por quebras de tags internas como negrito/itálico e termos flexionados), a lógica em `useContentGuardian.ts` foi robustecida:
- **Extração de Texto do Bloco**: Em vez de buscar em nós inline ProseMirror fragmentados, a análise extrai o `node.textContent` consolidado dos blocos principais (primeiro parágrafo e primeiro H2).
- **Bypass de Placeholders/Linhas Vazias**: O auditor ignora blocos de texto semântico nulos, parágrafos vazios ou temporários (ex: tamanho menor que 15 caracteres ou iniciados por colchetes como `[PLANO VISUAL]`). Ele pesquisa o primeiro parágrafo *real* de conteúdo.
- **Filtro de Stop Words**: Remove termos de ligação em português (`para, de, do, da, dos, das, em, um, uma, com, a, o, os, as, e, ou, por, sob, sobre, sua, seu, ao, aos, pelo, pela, num, numa, este, esta, aquele, aquela`) na avaliação de correspondência de palavras-chave de cauda longa.
- **Stemming Flexional de Número**: Implementa correspondência inteligente para plural/singular em português (ex: `clinicas` casa com `clinica`, `pacientes` com `paciente` e vice-versa), garantindo validação perfeita sem impor repetições robóticas.
