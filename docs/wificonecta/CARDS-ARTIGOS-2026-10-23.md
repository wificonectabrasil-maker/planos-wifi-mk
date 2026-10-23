# Cards completos de artigos — 23/10/2026

O primeiro artigo publicado já possuía metadescrição, capa em `/media/planos-de-internet/…/hero-1792787516987.webp`, alt e data de publicação. A leitura administrativa não foi necessária: esses dados foram confirmados por consulta pública somente de leitura na Turso. O silo não renderizava a imagem, e a home usava apenas uma lista de links para recomendar artigos.

## Implementação

- `components/site/PostCard.tsx`: componente único, com capa responsiva, alt, silo, indicação de guia principal quando aplicável, título completo, descrição completa, autoria, data registrada e ação “Ler artigo”. Há um único link de leitura por card, com nome acessível e foco visível. As ações de compartilhamento ficam fora dele.
- A imagem segue o mesmo resolvedor do artigo: `hero_image_url`, depois `cover_image`, depois `og_image_url`. URLs de mídia do próprio domínio são servidas pelo app. Imagens locais usam otimização Next/Image e espaço reservado em 16:9; fontes externas continuam suportadas sem exigir permissões novas de hostname.
- Metadescrição tem prioridade sobre excerpt. Quando ambos faltam, o card convida à leitura sem inventar conteúdo. Sem capa, mostra uma indicação neutra em vez de uma imagem quebrada. Datas inválidas/ausentes não são inventadas.
- `EditorialSiloHub` e `CommercialContent/EditorialResources` usam o componente na home, nos dois hubs e em recomendações de páginas comerciais. A estrutura pilar/suporte e os grupos editoriais foram preservados.
- `HomeClient`, `HomeSearchResults`, o hub genérico `app/[silo]/page.tsx` e a recuperação `app/pagina-nao-encontrada/page.tsx` também usam o mesmo card, removendo versões incompletas ou com estilos legados.
- `lib/types.ts` e as projeções públicas em `lib/db.ts` incluem excerpt, nome de autoria e data de publicação; nenhuma tabela ou registro remoto foi alterado.
- `app/wificonecta.css`: grid de duas colunas no desktop e uma no celular, capa com proporção reservada, leitura completa de título/descrição, identidade branco/azul/navy e estados de foco/hover discretos.

Cards de navegação de temas e links do menu continuam representando silos e navegação. As mudanças de artigo não alteram slugs, canônicos, conteúdo dos posts ou metadescrições.

Por solicitação do responsável, o final dos dois hubs mantém somente a navegação “Explorar [outro tema]”. A chamada comercial “Já sabe o que precisa para sua casa em São Paulo?”, o link para modalidades e o botão adicional de WhatsApp foram removidos desse bloco por repetirem outros caminhos de atendimento do site.

## Validação

- `pnpm exec playwright test tests/article-cards.spec.ts`: passou. Testa 24 combinações de home, silo, /planos e recuperação em 320/390/1440 px e preferências clara/escura. Confirma imagem carregada, alt, descrição, autoria, data ISO, URL canônica, um link por card, ausência de rascunhos, ausência de overflow e fallback para excerpt/capa legada/sem imagem. Escritas e exclusões usam somente `file:.cache-tests/e2e.db`.
- TypeScript independente e ESLint dos arquivos alterados: passaram, sem erros ou avisos novos.
- 11 testes unitários de SEO: passaram.
- Build de produção: passou, 63 páginas. Uma compilação adicional com saída/cache local separado permitiu verificar dados atuais sem reaproveitar o cache de quando o silo estava vazio.
- Navegação somente de leitura no build de produção local, com a Turso real: home e silo em 390/1440 px exibiram o primeiro artigo, a metadescrição original, Mike e a imagem real da Turso carregada. Capturas em `artifacts/published-article-card-{home,silo}-{390,1440}.png`.

Nenhum deploy, commit, push ou alteração de conteúdo remoto foi realizado.

## Compartilhar e copiar o link

`components/site/ArticleShare.tsx` é a pequena área interativa em todos os cards de artigo. O botão “Compartilhar” expande opções de WhatsApp, Facebook, X e LinkedIn; “Copiar link” fica disponível mesmo com as redes fechadas. O componente recebe apenas título e URL canônica absoluta, preservando o domínio oficial e evitando compartilhar localhost, parâmetros de busca, campanhas ou previews.

Links externos abrem em nova aba com `noopener noreferrer nofollow`. Nenhuma publicação é feita automaticamente. Ações não ficam dentro do link de leitura, não exigem SDK social e mantêm alvos de pelo menos 44 px, foco visível, estado expandido acessível e confirmação anunciada com `role="status"`. Se a API de clipboard falhar, aparece uma mensagem e um campo com o endereço selecionável para cópia manual.

A suíte `article-cards.spec.ts` passou novamente em todas as 24 combinações. Confirma os quatro links e seus parâmetros, a URL canônica usada na cópia, a confirmação, falha de permissão com cópia manual, controle por teclado e ausência de navegação ao acionar os botões. A área de transferência é simulada nos testes, sem sobrescrever a do usuário ou enviar mensagens para redes sociais. ESLint e TypeScript passaram sem erros.
