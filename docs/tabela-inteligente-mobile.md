# Como Usar a Tabela Inteligente no Mobile

## Objetivo
Manter o conteudo da tabela unico e ajustar apenas a exibicao por modo (`desktop`, `tablet`, `mobile`).

## Fluxo recomendado
1. No editor, selecione a tabela.
2. Troque para modo `mobile`.
3. Em `Render tabela`, escolha `Stack` para leitura em cards.
4. Defina `Titulo stack` com o numero da coluna-chave (ex.: `2` para nome do produto).
5. Se precisar, preencha `Ocultar colunas` (ex.: `3,4`) para remover campos longos no mobile.
6. Volte para `desktop` e confirme que continua em `Table`.

## Regras importantes
- Texto das celulas, links, linhas e colunas: **GLOBAL**.
- Render (`table/scroll/stack`), ocultar colunas, larguras e coluna-titulo: **MODO**.
- `Herdar desktop`: copia o snapshot do desktop para o modo atual.
- `Limpar override`: remove apenas o override do modo atual.

## Preset sugerido para afiliados
- Desktop: `Table`
- Tablet: `Scroll`
- Mobile: `Stack`
- Mobile `Titulo stack`: coluna do nome do produto
- Mobile `Ocultar colunas`: esconder colunas com texto muito longo
