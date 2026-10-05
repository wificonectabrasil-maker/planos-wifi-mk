# Guia Rapido: Modos Responsivos no Editor

## Regra principal
- O post tem **conteudo unico**.
- O que muda por modo (`desktop`, `tablet`, `mobile`) e apenas **apresentacao/layout**.

## Fallback de atributos
- `desktop`: usa base.
- `tablet`: usa override de tablet; se vazio, herda desktop.
- `mobile`: usa override de mobile; se vazio, herda tablet; se vazio, herda desktop.

## O que e GLOBAL
- Editar texto de paragrafos.
- Editar conteudo de celulas de tabela.
- `Linha +`, `Linha -`, `Coluna +`, `Coluna -`.
- Inserir/remover/mover blocos no documento.

Tudo acima afeta todos os modos.

## O que e MODO
- Imagem: largura, alinhamento, wrap, spacing, visibilidade no modo atual.
- CTA: alinhamento, tamanho, full width, cores, spacing, visibilidade no modo atual.
- Tabela: `renderMode` (`table | scroll | stack`), `wrapCells`, `hiddenColumns`, `columnWidths`, visibilidade no modo atual.

## Tabela no mobile (fluxo recomendado)
1. Trocar para modo `mobile`.
2. Em `Render tabela`, escolher:
   - `stack`: cada linha vira card.
   - `scroll`: tabela com rolagem horizontal.
3. Se precisar, ajustar `Ocultar colunas` e `Larguras`.
4. Voltar para `desktop` para conferir que o desktop permanece normal.

## Botoes de override
- `Herdar desktop`: copia os estilos atuais de desktop para o modo ativo e permite ajustar dali.
- `Limpar override`: remove o override do modo ativo e volta a herdar do fallback.
