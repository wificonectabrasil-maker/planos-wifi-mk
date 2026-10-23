# Artigos e preview público — 23/10/2026

## Diagnóstico confirmado

O preview autenticado foi aberto no Chrome conforme solicitado. O DOM de produção tinha dois cabeçalhos, duas navegações com o mesmo `id="wifi-navigation"` e dois rodapés. A rota do preview criava `SiteHeader` e `SiteFooter` dentro do shell público que o layout raiz já renderizava. Além disso, a rota recebia o contêiner de página institucional, criando margens e uma página visualmente dentro da outra.

O preview mantinha uma cópia antiga da apresentação do artigo com `dark:bg-slate-950`, padrões de fundo, metadados em cinza claro e cartão de autor diferente da publicação. O tema do sistema podia ativar esse fundo escuro enquanto os títulos e parágrafos recebiam a cor escura da marca. A rota pública possuía outro markup, com gradiente fixo e tokens visuais antigos. A verificação atravessou Chrome → rota autenticada → código de renderização → shell público; não foi necessário alterar credenciais ou dados reais.

## Implementação

- `components/site/PostArticle.tsx` concentra capa, título, autoria, revisão informada, data registrada, breadcrumb, retorno ao silo, conteúdo, índice, aviso editorial, próximo passo, fontes e assinatura do autor.
- `app/admin/preview/[postId]/page.tsx` mantém a sessão obrigatória e o carregamento administrativo do rascunho. Renderiza apenas uma faixa de status clara e `PostArticle`. Inclui `noindex, nofollow` explícito, além do cabeçalho HTTP de proteção existente.
- `app/[silo]/[slug]/page.tsx` preserva consulta pública, redirects, canônicos, metadados e construção de Article/Breadcrumb/dados estruturados. A apresentação é delegada ao mesmo componente.
- `components/site/SiteChrome.tsx` usa a largura pública no preview, sem o contêiner de página institucional por fora do artigo. Cabeçalho, rodapé e WhatsApp continuam únicos no shell.
- `components/site/PostToc.tsx` recebe a classe de tema do portal móvel, abandona o cartão legado com gradiente e mantém o índice de H2/H3. A leitura do DOM é agendada após o layout; observers e animation frames são limpos ao desmontar. A instância é identificada pelo post para não reaproveitar índice de outro artigo.
- `app/wificonecta.css` aplica branco, azul, texto escuro, Arial, largura de leitura e espaçamentos no escopo público da marca. O portal móvel também recebe os tokens públicos. Os painéis administrativos mantêm seus tokens escuros.

O renderizador do conteúdo continua sendo `resolveContentHtmlForRender`; nenhuma edição do corpo, imagem, URL, slug ou metadado do artigo real foi realizada. A prévia passou a mostrar também o mesmo próximo passo, fontes e card de autoria que o visitante verá depois da publicação.

## Autoria e largura — complemento solicitado

- A coluna de texto tinha `max-width: 78ch`, deixando espaço vazio antes da borda direita da capa. Agora ocupa 100% da coluna disponível, preservando o índice e o comportamento móvel.
- A configuração de marca `useDefaultAuthorForArticles: true` designa Mike como autor de todos os artigos da WifiConecta, conforme orientação do responsável. A resolução pública não depende mais de nomes legados nos campos do post para mostrar o card. Cabeçalho, assinatura e Article JSON-LD usam o mesmo perfil de `/sobre#mike`, incluindo cargo e biografia cadastrados; credenciais legadas não são atribuídas a Mike.
- `lib/editor/defaultEeat.ts` fornece nome, cargo, biografia e links de identidade de Mike a rascunhos novos e existentes. A foto e os canais de contato vêm do cadastro central. A aba E-E-A-T mostra esses dados e o CTA padrão em painéis compactos. A identidade é configurada na marca, e revisor/data continuam opcionais, sem inventar revisão técnica.
- `EditorCanvas` mostra o CTA e o card fora do `EditorContent`. Os componentes não são inseridos no HTML/JSON do texto e não acumulam duplicatas ao salvar. O card é o último bloco editorial do artigo público, após CTA e eventuais fontes.
- A regra global que deixava todas as seções do artigo transparentes passou a excluir `site-author-card`, preservando o fundo da assinatura no preview e no editor.
- Nenhuma migração ou alteração em massa do banco remoto: os registros existentes exibem o perfil definido pelo template; o salvamento normal no editor persiste os padrões nos campos já disponíveis.

## Validação

`tests/article-preview.spec.ts` cria e remove artigos apenas em `file:.cache-tests/e2e.db`. Verifica:

- acesso à prévia exige login;
- rascunho permanece privado, em `draft` e com o HTML intacto após navegar;
- um cabeçalho, uma navegação, um main, um H1 e um rodapé;
- preview e publicação têm largura alinhada ao cabeçalho;
- fundo branco, título e parágrafos escuros e fonte Arial mesmo com preferência de sistema escura;
- responsividade em 320, 390 e 1440 px, sem rolagem horizontal;
- índice móvel/desktop, fontes, revisão informada e perfil de Mike;
- canônico, descrição, indexação e um único Article JSON-LD na publicação de teste;
- preview continua `noindex`.

Os dois testes novos e os dois testes existentes de autoria passaram. Após ajustar o ciclo de vida do índice, os dois testes novos foram repetidos e passaram. Os 11 testes unitários de SEO, o ESLint dos arquivos alterados, o TypeScript independente e o build de produção passaram (62 páginas geradas). Capturas em `artifacts/article-{preview,public}-{dark,light}-*.png` usam artigos de teste e não substituem o conteúdo do rascunho real.

No complemento de autoria, os cinco testes de navegador passaram (três de artigo/editor e dois de autoria). O teste do editor foi repetido com navegação por `/admin`, `/admin/silos` e `/admin/silos/planos-de-internet`, também com sucesso. A suíte confirma identidade Mike mesmo com metadados legados, largura alinhada à capa, assinatura única, links padrão, salvamento/reabertura e ausência dos blocos automáticos no conteúdo persistido. Os 11 testes unitários de SEO, o TypeScript e o build de produção passaram novamente (63 páginas geradas no estado atual). ESLint sem erros; dois avisos existentes de `<img>` no seletor de capas do inspector permanecem fora desta alteração. Captura do canvas e E-E-A-T em `artifacts/article-editor-mike.png`.

```powershell
pnpm exec playwright test tests/article-preview.spec.ts tests/authorship.spec.ts
pnpm exec tsx --test tests/seo-indexing.test.ts tests/seo-metadata.test.ts tests/seo-schema.test.ts
pnpm exec tsc --noEmit
pnpm run build
```

## Publicação

A correção é do template, não exige publicar o rascunho para funcionar. Depois do deploy do código, o preview autenticado online usa a apresentação corrigida mesmo com o artigo em rascunho. O post real não foi publicado nesta etapa.
