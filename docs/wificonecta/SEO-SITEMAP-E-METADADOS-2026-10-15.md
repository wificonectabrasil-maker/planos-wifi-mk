# Sitemap e metadados — 15/10/2026

O sitemap usa apenas as rotas institucionais e comerciais canônicas, além dos silos ativos com artigos publicados e dos respectivos artigos. Aliases que redirecionam, campanhas, admin e hubs ainda vazios continuam fora da lista. As consultas usam o escopo público do banco, que exclui rascunhos, posts excluídos e silos inativos.

`lib/seo/sitemap.ts` consolida URLs duplicadas. Os artigos usam a data registrada no CMS e o hub usa a data mais recente dos seus artigos. Datas ausentes ou inválidas são omitidas. Páginas estáticas não recebem uma data de modificação baseada no instante da geração ou da revalidação do sitemap.

`/colaboradores` tem descrição, canonical e metadados sociais próprios, sem herdar a URL social da Home. Não foram alterados os textos editoriais, as URLs dos artigos nem a regra de manter hubs sem artigos como `noindex`.

Validação: `pnpm.cmd exec tsx --test tests/seo-metadata.test.ts` cobre hubs vazios, silos não públicos, URLs duplicadas, datas estáveis e canonical da página de colaboradores. O teste não acessa o banco de produção.
