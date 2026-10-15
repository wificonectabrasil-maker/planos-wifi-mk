# SEO técnico — lançamento WifiConecta, 15/10/2026

Domínio canônico: https://wificonecta.com.br.

## Diagnóstico antes da correção

O domínio público respondia com `meta robots="noindex, nofollow, nocache"` e `Disallow: /` no robots.txt. A marca exige aprovação explícita de indexação e essa aprovação não estava presente no ambiente de produção.

Lighthouse 13.5.0, com navegador isolado, registrou SEO 66 nos dois formatos. Performance: 97 no celular e 100 no desktop; LCP de 2,14 s e 0,52 s; CLS zero nos dois. O bloqueio de rastreamento era a única falha pontuada de SEO. Os relatórios completos ficam em `artifacts/seo-2026-10-15`, fora do Git.

## Implementação

- `.env.production` contém somente configuração pública: `NEXT_PUBLIC_ALLOW_INDEXING=true`. Senhas, tokens e credenciais continuam fora do código. Prévias continuam bloqueadas por `publicIndexingAllowed`; hosts `vercel.app` também recebem `X-Robots-Tag: noindex`.
- `/admin`, `/api` e `/wp-json` recebem proteção HTTP explícita de indexação, independente da regra das páginas públicas. A autenticação e os filtros públicos do banco permanecem ativos.
- Sitemap com URLs canônicas únicas, artigos públicos e hubs com conteúdo. Páginas estáticas não ganham datas fictícias em cada revalidação; artigos e hubs usam datas registradas no CMS. Rascunhos, itens excluídos, silos inativos, campanhas e aliases ficam fora.
- Exclusão em lote invalida também o cache dos artigos, hubs e páginas que os referenciam. Não executamos exclusões no banco real para validar isso.
- Metadados próprios de `/colaboradores` e imagem social de `/afiliados` corrigidos.
- JSON-LD serializado com escape de `<`. Article e Breadcrumb preservados; FAQ, HowTo e ofertas dependem de dados presentes no conteúdo exibido. Não são inferidos avaliações, rankings ou datas de vídeos a partir de dados de outro contexto.
- Contraste dos CTAs ajustado de 4,49:1 para 4,89:1. Nome acessível da logo corrigido. O vídeo, o atraso de carregamento e o fundo contínuo do cabeçalho foram preservados.

HTTP e `www` já redirecionavam permanentemente para HTTPS sem `www`. Canonicals, idioma, títulos, descrições, imagens com alt e links rastreáveis foram auditados. Hubs editoriais ainda vazios continuam com `noindex`; publicar conteúdo real é o que libera essas coleções.

## Verificação reproduzível

```powershell
pnpm run seo:check
# Para conferir uma compilação local em produção, mantendo o domínio canônico:
pnpm run seo:check http://localhost:3118
```

O comando consulta robots e sitemap e verifica as páginas listadas: status 200, indexação permitida, canonical correspondente, títulos e descrições distintos, H1, idioma, viewport, imagem social, alt e JSON-LD válido. Também confere a proteção do login administrativo e uma URL inexistente com status 404. Ele não envia formulários, publica conteúdo nem escreve no banco.

## Resultado no domínio publicado

Após a publicação de `05ca583`, o domínio oficial passou a entregar `index, follow`, o robots.txt passou a permitir `/` e o verificador técnico aprovou as 11 páginas do sitemap sem erros. Login administrativo conserva `noindex, nofollow, noarchive`. O endereço antigo `planos-wifi-mk.vercel.app` redireciona permanentemente para o domínio oficial.

| Lighthouse 13.5.0 | Celular | Desktop |
| --- | ---: | ---: |
| SEO antes → depois | 66 → 100 | 66 → 100 |
| Acessibilidade antes → depois | 96 → 100 | 95 → 100 |
| Boas práticas | 100 | 100 |
| Performance na medição posterior | 91 | 100 |
| LCP na medição posterior | 2,48 s | 0,52 s |
| CLS | 0 | 0 |

As métricas de desempenho são de laboratório e variam entre execuções; no teste inicial a performance mobile foi 97. Os resultados posteriores não indicam regressão de layout. O diagnóstico adicional de nome da logo foi tratado incluindo marca e slogan no nome acessível, em vez de esconder o slogan de leitores de tela. O teste de navegação mobile pela logo foi repetido e aprovado.

Validações: build com TypeScript, 28 testes unitários (incluindo 11 de SEO), fluxos de navegador e checagem do domínio real. As duas expectativas antigas de navegador foram atualizadas para a Home comercial e os contatos próprios do perfil da equipe, preservando os testes de CMS e de substituição do telefone dos CTAs.

Depois de cada publicação, repetir a verificação no domínio real. Variáveis definidas no painel da hospedagem têm prioridade sobre arquivos de configuração; uma pausa explícita com `NEXT_PUBLIC_ALLOW_INDEXING=false` continua bloqueando o site. O template neutro não recebe a aprovação de lançamento deste projeto.

## Acompanhamento na conta do responsável

No Google Search Console, verificar a propriedade do domínio, enviar `https://wificonecta.com.br/sitemap.xml` e inspecionar a Home. Isso requer acesso à conta Google do responsável e não foi executado nesta alteração. O robots.txt já informa o sitemap para descoberta por rastreadores.

## Referências

- [Google: bloqueio e liberação de indexação](https://developers.google.com/search/docs/crawling-indexing/block-indexing).
- [Google: URLs canônicas](https://developers.google.com/search/docs/crawling-indexing/consolidate-duplicate-urls).
- [Google: sitemap e datas de alteração](https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap).
- [Google: dados estruturados correspondentes ao conteúdo](https://developers.google.com/search/docs/appearance/structured-data/sd-policies).
- [Next.js: serialização de JSON-LD](https://nextjs.org/docs/app/guides/json-ld).
