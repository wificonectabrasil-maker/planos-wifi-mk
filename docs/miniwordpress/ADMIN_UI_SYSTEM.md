# Admin UI System

Este documento define o sistema visual e operacional do ambiente privado do Mini WordPress.

O admin nao pertence a marca. Ele e uma ferramenta de trabalho replicavel, sempre em dark mode, com densidade alta, leitura clara e sem depender de fontes, cores ou estilos do site publico.

## Principio central

O Mini WordPress e o sistema. A marca e apenas o conteudo editado e a camada publica.

Dentro de `/admin`, todo painel, botao, tabela, aba, formulario, toolbar e popup deve usar tokens do sistema. A unica excecao e a area de preview/editor do artigo, isolada por `.editor-public-preview`, porque ali o usuario precisa ver o artigo como ele vai aparecer na marca.

## Classificacao

### Core

- Shell administrativo em `app/admin/layout.tsx`.
- Tokens CSS dentro de `.admin-app`.
- Classes de sistema: `admin-pane`, `admin-subpane`, `admin-sidebar`, `admin-toolbar`, `admin-button*`, `admin-input`, `admin-tab`, `admin-kpi`, `admin-table`.
- Grid denso dos paineis.
- Modo escuro obrigatorio.
- Tipografia propria do sistema.
- Regras de seguranca contra classes Tailwind claras dentro do admin.

### Brand Adapter

- Logo da marca no canto superior esquerdo.
- Nome curto da marca ou workspace.
- Links de preview publico.
- Variaveis visuais publicas da marca, mas somente fora do admin ou dentro da area de preview do artigo.

### Template

- Padrao de paginas administrativas.
- Estrutura de header compacto.
- Barra de acoes: Conteudo, Silos, Novo post.
- Layout de listagens, filtros, tabelas e abas.

### Legacy

- Qualquer uso de fonte da marca Mini WordPress no admin.
- Textos fixos como "Mini WordPress Editor" quando deveriam vir de configuracao.
- Classes Tailwind claras soltas dentro de paineis administrativos.
- Cards muito grandes usados para dados que precisam de leitura rapida.

## Regras visuais obrigatorias

1. O admin e sempre dark mode.
2. O admin nao herda fonte da marca.
3. Titulos de areas e paineis devem ser fortes, preferencialmente em caixa alta.
4. Dados operacionais devem ter contraste maior que textos auxiliares.
5. Slugs, IDs, URLs e termos tecnicos precisam ser faceis de identificar.
6. Placeholders devem ser visiveis, mas subordinados.
7. Botao primario deve usar gradiente do sistema.
8. Alertas devem ter cor sem depender apenas de texto branco.
9. Tabelas devem favorecer leitura horizontal e reduzir scroll vertical.
10. Bento box decorativo nao deve dominar o espaco.

## Densidade

O sistema deve ser confortavel para uso prolongado, mas nao espalhado.

Padroes recomendados:

- Shell: padding externo maximo de 12 a 16px em desktop.
- Paineis principais: padding de 10 a 14px.
- Subpaineis: padding de 8 a 12px.
- Linhas de tabela: altura compacta, com informacao essencial visivel.
- Filtros: sempre em uma faixa curta.
- KPIs: inline quando forem apenas contadores.
- Campos raros: agrupados e recolhiveis.

Campos preenchidos uma vez, como metadados de silo, nao devem ocupar a tela inteira. Eles devem abrir como edicao compacta com secao avancada/recolhivel para descricao, SEO, hero e conteudo do pilar.

## Arquivos atuais relevantes

- `app/admin/layout.tsx`: shell principal e isolamento do admin.
- `app/globals.css`: tokens e classes `.admin-app`.
- `app/admin/page.tsx`: cockpit editorial.
- `app/admin/silos/page.tsx`: listagem de silos.
- `app/admin/silos/[slug]/page.tsx`: painel de silo.
- `components/admin/AdminHeader.tsx`: cabecalho administrativo.
- `components/editor/AdvancedEditor.tsx`: editor completo dentro do admin.
- `components/editor/EditorInspector.tsx`: painel lateral direito.
- `components/editor/ContentIntelligence.tsx`: painel lateral esquerdo.

## Contrato de CSS

`.admin-app` e a raiz do sistema. Toda cor, fonte e estado visual administrativo deve estar sob esse escopo.

`.editor-public-preview` e area protegida. Nenhum hardening de dark mode, compactacao de padding ou override de fonte pode alterar essa area.

Se um componente administrativo precisar mostrar uma previa publica da marca, ele deve renderizar essa previa dentro de `.editor-public-preview` ou de outra classe explicitamente marcada como brand surface.

## Hierarquia de informacao

O admin deve priorizar:

1. Acao atual do editor.
2. Dados que ajudam decisao imediata.
3. Status tecnico.
4. Dados raros ou de setup.
5. Configuracoes destrutivas.

Exemplo aplicado:

- Buscar no artigo fica no topo do painel esquerdo.
- Estrutura H2/H3/H4 fica logo depois.
- Linkagem interna e guardiao SEO ficam no fluxo de producao.
- Termos / LSI fica no fim porque e usado depois.
- Analise SERP do post fica na aba Revisao porque e mais util em atualizacao ou auditoria.

## Checklist de auditoria visual

- Nenhum painel administrativo usa fundo branco por acidente.
- Nenhum texto importante fica cinza demais.
- Todos os titulos de paineis usam fonte do sistema.
- Slugs sao legiveis e destacados.
- A tela de conteudo mostra varias linhas sem scroll excessivo.
- A tela de silos mostra nomes e slugs com clareza.
- Metadados de silo nao bloqueiam a leitura do resto do painel.
- Popups, menus e dialogs seguem dark mode.
- O editor publico preserva a identidade da marca.

## Pendencias tecnicas

- Extrair as regras de `.admin-app` de `app/globals.css` para um arquivo de sistema quando a base virar pacote neutro.
- Criar componentes primitivos de UI administrativa para reduzir Tailwind repetido.
- Trocar qualquer string Mini WordPress fixa por `brandConfig`.
- Criar teste visual manual por rota: `/admin`, `/admin/silos`, `/admin/silos/[slug]`, `/admin/editor/[id]`.

## Padrões de Usabilidade e Isolação Visual (Adicionado em 2026-05-22)

Para gerenciar o atrito visual e manter a alta performance em telas de alta densidade no `/admin`, dois padrões fundamentais foram oficializados:

### 1. Padrão Bento Box Colapsável (Alta Densidade)
Em painéis de diagnóstico ou de setup de imagens (como `VisualPlanPanel` e `InternalLinksPanel`), o uso de cards grandes e abertos é proibido. Deve-se adotar o padrão **Colapsado por Padrão**:
* **Visualização Compacta**: O card deve iniciar fechado, expondo apenas os dados essenciais (ex: nome do link/tipo de imagem) e os botões de ação de altíssima frequência (ex: copiar prompts ou marcar status).
* **Chevron de Estado**: O cabeçalho do card deve conter um Chevron rotativo que reaja ao estado `expanded` (ou `open` em tags `<details>`).
* **Expansão Sob Demanda**: Ao clicar, o card revela dados secundários densos (ex: justificativas semânticas longas, checklists de auditoria, direções de arte detalhadas).

### 2. Isolação Fixo do Canvas (`.editor-preview-device-frame`)
A área central de edição e preview (`EditorCanvas`) é uma superfície de marca e nunca deve herdar estilos, fundos ou contrastes do sistema administrativo escuro.
* **Problema Resolvido**: Ao alternar para mídias responsivas (Tablet ou Mobile), o contêiner herdava `.admin-pane` e a classe `.dark` injetava fundos cinza-escuros que inviabilizavam a leitura dos textos escuros do artigo.
* **Diretriz Técnica**: Todo frame de visualização responsiva de dispositivo deve ser envolto estritamente pela classe `.editor-preview-device-frame`.
* **Regra CSS**: Esta classe possui fundo estritamente travado a `#faf9f7 !important` em todos os níveis, simulando bordas arredondadas finas, sombras macias de dispositivo físico, mas protegendo totalmente o preview de qualquer contaminação do Dark Mode administrativo superior.
