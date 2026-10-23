# Google Maps e identidade da WifiConecta — 23/10/2026

## Auditoria e validação do cadastro

- Site: `https://wificonecta.com.br/`.
- Perfil fornecido pelo responsável: `https://www.google.com/maps?cid=4276303967527817866`.
- O link foi aberto no navegador e exibiu exatamente “Wifi Conecta Internet para sua casa”. A ficha mostrava o site `wificonecta.com.br` e telefone `(11) 94884-4107`, consistentes com a marca. O acesso não exigiu login.
- A Home já possuía um único script JSON-LD, com Organization e WebSite no mesmo grafo. O identificador da organização é `https://wificonecta.com.br/#organization`; a área atendida é State / São Paulo.
- `/sobre` apresenta Mike e seu Person JSON-LD, com `worksFor` apontando ao mesmo identificador da organização. Preservado.
- `/contato` já apresentava atendimento humano por WhatsApp, condições por endereço e links de privacidade. Metadados preservados.
- O rodapé global é renderizado no servidor e já continha Instagram e WhatsApp. Esses canais foram mantidos.
- `components/seo/JsonLd.tsx` já escapava `<` ao serializar JSON. O componente e seu comportamento foram preservados.

## Implementação

`brand.config.ts` concentra `googleMapsUrl`. O preset neutro recebe um campo vazio, sem carregar o perfil desta marca para novos projetos.

A organização existente na Home recebe `sameAs` com Instagram e Maps, deduplicados. Não foi criado outro script ou outra organização. Nome, `@id`, domínio, logo, área atendida e WebSite anteriores foram mantidos. Nenhum LocalBusiness, endereço, GeoCoordinates, horário, avaliação ou classificação foi adicionado.

`hasMap` é uma propriedade de Place, segundo Schema.org. Como a entidade principal é Organization e não há estabelecimento físico informado, não foi aplicada diretamente nem foi criada uma entidade Place apenas para encaixar essa propriedade. `sameAs` identifica a ficha oficial sem atribuir um endereço à empresa.

`GoogleMapsLink` é um componente compartilhado, renderizado no servidor, sem SDK ou API key. A ficha oficial é aberta somente ao acionar o link. Possui ícone decorativo, identificação de nova aba e `rel="noopener noreferrer"`.

Em `/contato`, a seção “WifiConecta em São Paulo” usa a descrição fornecida pelo responsável e esclarece o atendimento inteiramente pelo WhatsApp. Há área de toque mínima de 44 px, quebra de texto e foco visível.

Por solicitação posterior do responsável em 23/10, o rodapé recebe um mapa regional de São Paulo no componente `FooterServiceMap`, junto ao link “Ver no Google Maps” para a ficha oficial. A URL incorporada foi gerada pelo próprio Google Maps a partir de uma visualização regional. Não contém o CID da empresa nem marcador de endereço; o centro geográfico serve somente para enquadrar a cidade, sem dados físicos da organização no JSON-LD. O iframe tem título acessível, dimensões reservadas, `loading="lazy"`, controles do provedor preservados e layout adaptável ao celular. A política de privacidade informa a conexão ao Google quando o mapa é carregado. Não são oferecidas rotas até uma suposta loja.

Slugs, canônicos, títulos, metadescrições, banco, contato do WhatsApp, identidade visual e conteúdo editorial existentes foram preservados.

## Pendências para decisão humana no Perfil da Empresa

| Campo | Site | Ficha observada | Decisão |
| --- | --- | --- | --- |
| Nome | WifiConecta | Wifi Conecta Internet para sua casa | Responsável deve decidir a padronização; nenhuma identidade foi alterada automaticamente. |
| Categoria | Consulta e intermediação de planos; não é a operadora | Operadora de internet | Revisar a categoria no cadastro conforme a atividade real. O site não reproduz essa classificação. |
| Horário | Não há horário confirmado no site | Aberto 24 horas | Confirmar se representa o atendimento humano real. Não foi copiado para o site ou para o JSON-LD. |

Nenhuma alteração foi feita no cadastro do Google. A associação melhora a consistência entre as referências da marca, sem garantir indexação, posicionamento ou resultados enriquecidos.

## Verificação

Arquivos alterados ou adicionados:

- `brand.config.ts`: URL oficial do perfil.
- `app/page.tsx`: vínculo `sameAs` na organização existente.
- `app/contato/page.tsx`: seção de atendimento em São Paulo.
- `components/site/GoogleMapsLink.tsx`: link externo acessível compartilhado.
- `components/site/FooterServiceMap.tsx`: mapa regional com carregamento adiado e link da ficha.
- `components/site/SiteFooter.tsx`: acesso discreto ao Maps.
- `app/politica-de-privacidade/page.tsx`: informação sobre o conteúdo externo do mapa.
- `app/wificonecta.css`: apresentação, alvo de toque e foco no escopo público.
- `templates/miniwordpress-3.1/brand.config.ts.txt`: campo vazio no preset neutro.
- `tests/google-maps.spec.ts`: verificações semânticas e de navegador.
- `docs/miniwordpress/BRAND_ADAPTER_GUIDE.md`: configuração documentada.
- `docs/wificonecta/GOOGLE-MAPS-2026-10-23.md`: auditoria, decisões e evidências.

Os testes em `tests/google-maps.spec.ts` verificam a organização no HTML renderizado, seu identificador, deduplicação de `sameAs`, ausência de dados físicos e preservação da referência do autor. Conferem também links externos seguros, apenas um iframe regional no rodapé, carregamento adiado, nomes acessíveis, foco, alvos de toque e ausência de rolagem horizontal em 320, 390, 768 e 1440 px. Capturas locais ficam em `artifacts/maps-{contact,footer}-*.png`, fora do Git. O mapa foi inspecionado visualmente com os elementos reais do Google carregados, em celular e desktop.

Comandos de validação:

```powershell
pnpm exec tsc --noEmit
pnpm run build
pnpm exec playwright test tests/google-maps.spec.ts
pnpm exec tsx --test tests/seo-indexing.test.ts tests/seo-metadata.test.ts tests/seo-schema.test.ts
```

Resultados em 23/10: TypeScript aprovado, build de produção aprovado (62 páginas geradas), ESLint dos arquivos TypeScript alterados aprovado, dois testes de navegador aprovados e 11 testes unitários de SEO aprovados. O JSON-LD foi lido e validado no HTML renderizado; não foi executado um validador remoto de resultados enriquecidos. As capturas de contato em mobile e rodapé em desktop também foram inspecionadas visualmente.

A implementação foi preparada para revisão local. Publicação e deploy dependem de solicitação do responsável.

## Referências

- [Ficha oficial fornecida e validada](https://www.google.com/maps?cid=4276303967527817866).
- [Schema.org: Organization e sameAs](https://schema.org/Organization).
- [Schema.org: hasMap é aplicável a Place](https://schema.org/hasMap).
