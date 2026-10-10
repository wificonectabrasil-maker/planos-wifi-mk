# Silos and SEO System

Atualização WifiConecta de 09/10/2026: o plano da marca tem dois silos, 15 briefs e dois pilares. A orientação mais recente exige canônicos em `https://wificonecta.com.br/{silo}/{slug}`, sem prefixo `/blog`. `buildSiloCanonicalPath` e `buildPostCanonicalPath` geram caminhos planos e são usados também em links, breadcrumbs, publicação, métricas e sitemap. A opção `brandConfig.useBrandCanonicalOrigin` fixa a origem da marca e impede que localhost ou Vercel substituam o domínio público. O CMS preserva slugs de artigos publicados. Os hubs vazios desta marca são uma exceção solicitada pelo responsável: ficam visíveis para navegação e planejamento, mas com `noindex` e fora do sitemap. Não são criados posts de exemplo. [Auditoria e migração](../wificonecta/AUDITORIA-E-MIGRACAO-EDITORIAL.md).

Por orientação posterior do responsável, `/blog` deixa de ser índice e redireciona ao silo de contratação. A navegação é temática e direta aos hubs; cada hub destaca o pilar e agrupa os suportes conforme a organização editorial. As ligações no texto devem ser pertinentes ao contexto, com âncoras descritivas variadas, relações pilar–suporte e relações justificadas entre suportes. A arquitetura é uma base para SEO semântico; não substitui a redação, a pesquisa e a validação dos futuros artigos.

Este documento define o sistema de silos, arquitetura editorial, SEO tecnico e auditorias do Mini WordPress.

O silo e a unidade central de organizacao editorial. Cada marca pode ter silos diferentes, mas a logica de gerenciamento, auditoria e linkagem pertence ao Core.

Atualizacao projeto 2026-05-18: o projeto usa uma fonte KGR local com 4 silos e 21 artigos, enriquecida por Drive support curado. O raio-x operacional esta em `projeto_BLOG_SEO_RAIOX.md`.

## Objetivos

- Organizar o site em hubs claros.
- Definir posts pilar e suporte.
- Controlar linkagem interna.
- Evitar canibalizacao.
- Facilitar atualizacao de posts publicados.
- Guiar producao SEO sem depender de planilhas externas.

## Entidades principais

### Silo

Agrupa posts por tema.

Campos Core:

- `id`
- `name`
- `slug`
- `description`
- `menu_order`
- `active`
- `show_in_menu`
- metadados SEO
- configuracao de grupos editoriais

Campos Brand:

- nomes dos silos
- slugs publicos
- descricao editorial
- meta title/description
- grupos editoriais especificos do nicho

### Post do silo

Representa o papel editorial de um post dentro do hub.

Campos importantes:

- `silo_id`
- `post_id`
- `role`: pilar ou suporte
- `position`
- `primary_keyword`
- `supporting_keywords`
- `group_id`

### Links

O sistema acompanha links internos e externos.

Funcoes:

- Contar entradas e saidas.
- Detectar orfaos.
- Identificar excesso de links externos.
- Sugerir links internos.
- Registrar ocorrencias de links no texto.

No projeto, links esperados tambem podem vir do KGR local com alvo, anchor e relacionamento. Esse plano alimenta auditoria, Guardiao SEO, Links Internos IA e verificacao `content-plan:check`.

## Paineis atuais

### `/admin/silos`

Listagem de silos e hubs.

Regras de layout:

- Mostrar nome e slug com alta legibilidade.
- Evitar cards grandes.
- Manter tabela densa.
- Destacar status de menu/publicacao.
- Permitir abrir painel rapidamente.

### `/admin/silos/[slug]`

Painel de inteligencia do silo.

Abas:

- Metadados.
- Visao Geral.
- Mapa de Links.
- Canibalizacao.
- SERP.

Contrato:

- Metadados e setup nao devem ocupar a tela inteira.
- Campos raros devem ficar recolhiveis.
- Mapa de links deve priorizar leitura de titulo, slug, papel e contagem.
- Canibalizacao deve mostrar pares problemáticos com acao clara.
- SERP deve ficar para comparacao e auditoria.

## Metadados de silo

Como o usuario normalmente preenche uma vez e altera pouco, o painel deve ser compacto.

Campos sempre visiveis:

- Nome.
- Slug.
- Ordem no menu.
- Ativo.
- Exibir no menu.
- Salvar.

Campos avancados/recolhiveis:

- Descricao.
- Meta title.
- Meta description.
- Hero image URL.
- Hero alt.
- Conteudo do pilar.
- Exclusao permanente.

## Grupos editoriais

Os grupos editoriais ajudam a distribuir posts dentro do silo.

Core:

- Criar, editar e ordenar grupos.
- Contar posts por grupo.
- Mostrar grupos vazios.

Brand:

- Nomes dos grupos.
- Estrategia editorial por nicho.

Exemplo Mini WordPress atual:

- Preco / oportunidade.
- Decisao / escolha.
- Tipos.
- Uso / como fazer.
- Marcas / produtos.
- Resultados / tempo.

## Mapa de links

O grafo deve ser funcional, nao decorativo.

Informacoes obrigatorias no node:

- Papel: pilar/suporte.
- Titulo legivel.
- Slug legivel.
- Status.
- Entradas.
- Saidas.

Regras:

- Evitar fonte da marca no grafo.
- Titulo deve usar fonte do sistema.
- Slug deve ter contraste proprio.
- Nodes devem ser compactos e legiveis.
- Zoom e pan devem funcionar.
- O usuario precisa identificar o post pelo slug rapidamente.

## Higiene de silos

Problemas detectaveis:

- Posts orfaos.
- Pilar sem links suficientes.
- Suporte sem link para pilar.
- Links para posts fora do silo sem necessidade.
- Canibalizacao de palavra-chave.
- Links externos excessivos.
- Posts com slug/titulo desalinhados.

## Canibalizacao

O painel de canibalizacao compara posts do mesmo silo ou de silos proximos.

Deve analisar:

- Similaridade de palavra-chave.
- Similaridade de titulo.
- Overlap SERP.
- Intencao de busca.
- H2/H3 concorrentes.
- Necessidade de juntar, separar ou reposicionar conteudo.

Saidas desejadas:

- Resumo executivo: publicar agora, reescrever antes, monitorar ou OK.
- Pares prioritarios com conflito editorial e acao.
- Trechos tecnicos apenas quando precisam reescrita.
- Tipos: texto quase igual, mesma estrutura, keyword overlap, conflito de intencao, sobreposicao aceitavel.
- Acoes: reescrever, diferenciar angulo, mover trecho, linkar, canonicalizar, revisar ou ignorar.
- Link para abrir cada SERP.
- Recomendacao editorial clara.

Baixo risco deve ficar recolhido ou secundario. O objetivo principal e decisao editorial, nao relatorio bruto. O brief para GPT deve ser compacto e deve orientar preservacao de contexto local necessario.

## Linkagem semantica e anchors

Links internos devem fortalecer o silo sem parecer mecanicos.

Regras:

- Nao usar slug completo como anchor.
- Nao transformar todo link em exact-match.
- Preferir frases curtas derivadas de keyword, anchor KGR, slug variable e intencao.
- O Guardiao SEO sugere linguagem para meio/final do artigo.
- Links Internos IA decide/aplica oportunidades precisas no texto.
- Anchors bons conectam problema, solucao, localidade, servico ou etapa da jornada.

Exemplos de anchor semantica:

- `atrair pacientes`
- `consultorio odontologico`
- `busca local`
- `sem redes sociais`
- `plano de marketing`

Exemplo proibido:

- `como-atrair-pacientes-para-consultorio-odontologico`

## SERP

SERP e ferramenta de revisao e atualizacao.

Regras:

- No editor do post, Analise SERP do Post fica na aba Revisao.
- No painel do silo, SERP compara saude geral e oportunidades.
- Nao deve ser obrigatorio durante criacao inicial.
- Deve ser usado para atualizar artigos publicados ou em revisao.

## SEO tecnico

O Core deve cuidar de:

- Slug unico.
- Meta title.
- Meta description.
- OG image.
- Alt de imagem principal.
- Schema.
- Canonical.
- Sitemap.
- Robots.
- Publicacao/despublicacao.

A marca define:

- Tom editorial.
- Oferta.
- Entidades e fontes do nicho.
- Palavras-chave iniciais.
- Avisos legais especificos.

## Plano visual SEO

Imagens tambem entram na saude editorial:

- Capa obrigatoria com alt text.
- OG herda a capa no v1.
- Capas usam a variavel diferencial do slug/intencao e direcao de arte deterministica para variar camera, pose, acao e objeto principal.
- Artigos longos ou com marcacoes podem receber imagens de respiro 1:1.
- Respiros usam o trecho depois da marcacao e o H2/H3 seguinte como fonte principal do tema visual. O Agente Visual deve preferir HTML estruturado, extrair frase forte/termos especificos e marcar duplicidade visual quando duas marcacoes forem equivalentes.
- Respiros relacionados ao mesmo tema devem variar layout/metafora/objeto focal para nao repetir escudo, cards, browser ou mapa sem necessidade.
- Tabelas comparativas podem receber visual 5:4 complementar, sem substituir HTML.
- Prompt principal para imagem deve ser limpo, visual e com poucos elementos; metadados ficam no brief tecnico.

## Checklist de implementacao em nova marca

1. Definir lista de silos.
2. Definir slugs publicos.
3. Definir grupos editoriais por silo.
4. Seedar posts ou criar backlog.
5. Validar menu publico de duas linhas.
6. Rodar auditoria de linkagem.
7. Configurar prompts por nicho.
8. Validar SERP e fontes.

## Pendencias atuais

- Remover nomes Mini WordPress de seeds e prompts.
- Consolidar migrations de silo.
- Separar configuracao de grupos editoriais por marca.
- Criar export/import de silos por `brandConfig`.

## Auditor Semântico de Correspondência e Mapa Hierárquico de Silos (Adicionado em 2026-05-22)

Para alinhar os silos editoriais e auditorias de palavra-chave às diretrizes de PNL modernas, o Core do Mini WordPress incorporou novos motores de processamento semântico e visualização:

### 1. Motor de Stemming PT-BR e Filtro de Stop Words
Para evitar correspondências exatas engessadas e alertas falsos de SEO em parágrafos iniciais ou estruturais, o auditor local (`useContentGuardian.ts`) emprega:
* **Filtro de Conectivos (Stop Words)**: Na correspondência de termos de palavras-chave de cauda longa, o motor descarta conectivos comuns em português (`para, de, do, da, dos, das, em, um, uma, com, a, o, os, as, e, ou, por, sob, sobre, sua, seu, ao, aos, pelo, pela, num, numa, este, esta, aquele, aquela`), permitindo que a keyword principal seja validada conceitualmente mesmo dispersa de forma não linear na frase.
* **Flexão Singular/Plural (Stemming)**: Um motor heurístico de número em português lida de forma reativa com as variações (ex: `clínicas` matches `clínica`, `médicos` matches `médico` e vice-versa). Caso a palavra pesquisada ou o texto contenha flexão de número, a correspondência é atestada positivamente, o que previne reescritas artificiais apenas para bater a keyword literal.
* **Varredura de Texto Puro e Bypass de Placeholders**: O auditor extrai o `node.textContent` consolidado dos blocos pais para contornar nós ProseMirror fatiados por tags de formatação (negrito/itálico). Adicionalmente, pula nós vazios ou que sirvam de mero rascunho visual (ex: textos menores que 15 caracteres ou contendo placeholders como `[PLANO VISUAL]`), analisando estritamente a introdução da cópia real.

### 2. Mapa de Hierarquia e Badges de Silo (`LinkHygienePanel`)
A aba "Mapa de Links" (Higiene de Links) possui um painel interativo de silo com outline hierárquico reativo:
* **Identificação KGR**: Lista todos os artigos pertencentes ao silo editorial, ordenando-os por nível de hierarquia (`0` para Pilar, `1, 2, ...` para Suporte).
* **Badges de Conectividade**:
  * `Este artigo`: Identifica o post ativo aberto no editor.
  * `Ancorado`: (Verde) Exibe a palavra-chave exata ancorada no documento quando existe um hiperlink ativo apontando para o post irmão correspondente.
  * `Faltando`: (Vermelho) Identifica links que eram previstos no plano editorial canonico KGR mas que não foram criados no texto ainda, exibindo a âncora esperada.
  * `Sem link`: (Cinza) Sem link ativo e não esperado pelo planejamento do silo.
* **Navegação Dinâmica (Jump to Link)**: Ao clicar no badge "Ancorado" ou na palavra-chave ancorada, o editor ProseMirror rola a tela suavemente (`scrollIntoView`) e seleciona de forma ativa o exato link no documento, permitindo auditoria visual rápida da âncora no contexto do artigo.
* **Indicador nas Listas Individuais**: A lista plana de links do artigo (guia "Links") exibe esses mesmos badges numéricos KGR ao lado de cada link apontado, facilitando a identificação imediata sem precisar abrir o mapa completo.
