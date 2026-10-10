# URLs canônicas e desempenho no celular

Atualização de 09/10/2026, conforme a orientação mais recente do responsável: a origem canônica da WifiConecta é exclusivamente `https://wificonecta.com.br`. Artigos usam `/{silo}/{slug}`; os hubs usam `/{silo}`.

## Estrutura vigente

| Conteúdo | URL canônica |
| --- | --- |
| Hub de planos e contratação | `https://wificonecta.com.br/planos-de-internet` |
| Exemplo do futuro pilar de planos | `https://wificonecta.com.br/planos-de-internet/como-escolher-plano-internet-residencial` |
| Hub de Wi-Fi e fibra óptica | `https://wificonecta.com.br/wifi-e-fibra` |
| Exemplo do futuro pilar de fibra | `https://wificonecta.com.br/wifi-e-fibra/internet-fibra-optica-ou-comum` |

Os exemplos de artigos são pautas futuras, sem páginas publicadas. Os 15 artigos serão escritos pelo responsável. Os dois hubs já existem e mostram apenas a apresentação do tema e o estado de preparação. Enquanto vazios, permanecem `noindex, follow` e fora do sitemap; a configuração de prévia também é respeitada quando houver publicações.

`brandConfig.useBrandCanonicalOrigin` fixa o domínio, mesmo quando o site é aberto por localhost ou por uma URL da Vercel. `buildSiloCanonicalPath` e `buildPostCanonicalPath` geram os caminhos simples. Metadados canônicos, Open Graph, dados estruturados, breadcrumbs, sitemap, publicação e sugestões de links do editor seguem essa origem e essa hierarquia.

`/blog` retorna 308 para `/planos-de-internet`. `/blog/planos-de-internet` e seus artigos retornam 308 diretamente aos respectivos caminhos sem `/blog`. As demais URLs substituídas seguem o [mapa de migração](AUDITORIA-E-MIGRACAO-EDITORIAL.md). Esses caminhos antigos servem apenas para encaminhar acessos anteriores; não recebem conteúdo, links de navegação ou entradas no sitemap.

## Ajustes de carregamento e navegação

- Home e hubs usam páginas pré-renderizadas com revalidação de uma hora. Os fluxos de publicação do CMS revalidam os caminhos editoriais e o sitemap.
- A navegação fixa dos dois silos dispensa as consultas ao banco que antes montavam submenus não utilizados pela WifiConecta. O comportamento dinâmico continua disponível para outras marcas do template.
- O rodapé é renderizado no servidor. Os botões de WhatsApp continuam interativos e usam o número configurado para o site.
- Cabeçalho e rodapé importam apenas as definições leves de navegação, sem carregar no navegador o validador do antigo catálogo comercial.
- Menu, rodapé, cards de silos e cards de artigos deixam de buscar antecipadamente todas as páginas vinculadas. Os links continuam presentes no HTML e acessíveis normalmente.
- No celular, o botão de menu tem 44 × 44 px. Links do menu e do rodapé têm altura mínima de 44 px; textos do menu podem quebrar linha em telas estreitas.
- O vídeo mantém os oito segundos completos, o loop silencioso, a ausência de controles e o atraso de três segundos após o carregamento. O poster, o texto e o CTA aparecem antes do MP4.

## Medição local antes e depois

Build de produção, Edge com emulação de Pixel 5, CPU quatro vezes mais lenta, latência de 80 ms e download de 1,6 Mbps. Cada página foi aberta em um contexto novo. A coleta ocorreu 1,2 segundo depois do evento `load`, antes do início adiado do vídeo.

| Métrica | Home antes | Home depois | Hub de planos antes | Hub de planos depois |
| --- | ---: | ---: | ---: | ---: |
| Resposta inicial, TTFB | 1.399 ms | 124 ms | 68 ms | 23 ms |
| Maior elemento visual, LCP | 3.156 ms | 1.720 ms | 1.124 ms | 1.108 ms |
| Deslocamento visual, CLS | 0 | 0 | 0 | 0 |
| JavaScript descomprimido carregado | 505.733 bytes | 439.738 bytes | 504.315 bytes | 439.738 bytes |
| JavaScript transferido, comprimido | 145.980 bytes | 129.827 bytes | 145.219 bytes | 129.827 bytes |
| Arquivos JavaScript | 9 | 8 | 8 | 8 |
| Rolagem horizontal | Não | Não | Não | Não |

A home carregou 13,05% menos JavaScript descomprimido e transferiu 11,07% menos bytes de JavaScript nesta medição. O hub anterior era `/blog/planos-de-internet`; a medição posterior usou `/planos-de-internet`, com o mesmo estado editorial vazio.

São duas execuções locais, uma por versão. Os tempos de resposta e renderização variam conforme máquina, cache, servidor e rede; não representam dados de usuários reais nem garantem resultados de SEO. A medição inicial não inclui o tráfego posterior do MP4. O carregamento e o loop completo do vídeo foram verificados separadamente pelos testes de navegador.

As evidências locais ficam em `artifacts/wificonecta-mobile-before.json`, `artifacts/wificonecta-mobile-after.json` e nas capturas `artifacts/mobile-final-*.png`, arquivos ignorados pelo Git.

## Validação

- Build de produção e TypeScript concluídos.
- Quatro testes unitários: preparação idempotente dos silos, preservação dos dados, limites das 15 pautas e origem canônica fixa.
- Onze testes de navegador: três de arquitetura editorial, cinco do atendimento comercial e três do vídeo da hero.
- Artigos temporários de teste, com pilar e suporte em cada silo, ficaram somente no banco local isolado dos testes. As verificações cobriram URLs canônicas, Open Graph, dados estruturados, hierarquia, links contextuais nos dois sentidos, sitemap e redirecionamento da estrutura anterior.
- Navegação verificada em 320 e 390 px; inspeção visual adicional do build de produção em 320 px. Home e os dois hubs não apresentaram rolagem horizontal, links para `/blog` ou erros de execução no navegador. Os CTAs apontaram para `5511948844107`.
- No servidor local de produção, sitemap e robots usaram o domínio da marca; os redirecionamentos antigos responderam 308 diretamente ao destino final.
- Lint dos arquivos de código alterados nesta etapa passou. Os oito erros anteriores do editor, documentados na auditoria, permanecem fora desta alteração.

O código está atualizado neste checkout. Nenhum deploy foi realizado nesta etapa. Não foram criados ou publicados os 15 artigos, enviados pedidos reais pelo WhatsApp ou alterados posts no banco conectado.
