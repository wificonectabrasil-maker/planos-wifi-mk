# Verificação de indexação — 25/10/2026

Verificação no Chrome autenticado, propriedade de domínio `wificonecta.com.br`, e nas respostas públicas de produção. Nenhum código, variável de ambiente, configuração de segurança ou deploy foi alterado.

## Evidências

- O relatório Sitemaps já informa **Processado**, com envio e última leitura em **25/10/2026**, **20 páginas encontradas** e zero vídeos. A captura enviada pelo responsável mostrava uma tentativa anterior com falha, mas esse não é mais o status atual.
- A inspeção de `https://wificonecta.com.br/` informa **Detectada, mas não indexada no momento**, sem último rastreamento registrado nessa visão do índice.
- O teste ao vivo de 25/10/2026 às 10:16, horário de São Paulo, retornou **O URL está disponível para o Google** e **É possível indexar a página**. Nos detalhes: rastreamento permitido **Sim**, busca de página **Com êxito**, indexação permitida **Sim**, canônico declarado `https://wificonecta.com.br/`.
- O relatório agregado de páginas ainda estava atualizado em **15/10/2026**. O exemplo de bloqueio por robots é `http://wificonecta.com.br/`, com rastreamento de 15/10. A resposta HTTP atual é **308**, com destino à versão HTTPS.
- `robots.txt`: HTTP 200, permite `/` e restringe somente `/admin`, `/api` e `/wp-json`, informando o sitemap oficial.
- `sitemap.xml`: HTTP 200, `application/xml`, namespace padrão e URLs do domínio oficial.
- `pnpm run seo:check https://wificonecta.com.br`: passou, **20 URLs**, todas HTTP 200, `errors: []`. A auditoria verifica robots, noindex HTTP/meta, canônicos, títulos/descrições, H1, idioma, imagens e JSON-LD, além das proteções do login e da resposta 404.

## Pedido manual de indexação

O botão de solicitação foi acionado após o teste ao vivo aprovado. O Search Console retornou erro de envio, acompanhado de **Não foi possível conectar-se ao serviço reCAPTCHA**. A página foi recarregada para tentar resolver a falha temporária. Não foi observada confirmação de envio; portanto, a solicitação manual não pode ser considerada concluída. Nenhum desafio foi resolvido ou contornado e nenhuma proteção foi desativada.

O sitemap aceito permite que o Google descubra as URLs independentemente desse pedido manual. Processamento do sitemap e teste ao vivo aprovado não equivalem a indexação concluída ou garantida.

## Capturas locais

- `artifacts/search-console-sitemap-processed-2026-10-25.png`
- `artifacts/search-console-home-live-2026-10-25.png`
- `artifacts/search-console-index-request-error-2026-10-25.png`

## Referências oficiais

- https://support.google.com/webmasters/answer/9012289?hl=pt-BR
- https://support.google.com/webmasters/answer/7440203?hl=pt-BR
- https://developers.google.com/search/docs/crawling-indexing/sitemaps/overview
