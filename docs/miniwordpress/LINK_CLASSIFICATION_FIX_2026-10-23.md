# Correção de classificação e edição de links

23 de outubro de 2026 · WifiConecta / Mini WordPress

## Problema confirmado

A detecção anterior buscava amazon., amzn.to ou a.co como trechos de texto na URL. O domínio wificonecta.com.br contém a.co, o que fazia o Super Link forçar Afiliado e impedir a escolha de Interno. A mesma heurística estava em importação, tabelas e auditorias. Além disso, URLs internas absolutas eram classificadas como externas em alguns fluxos, enquanto Mention era contado como interno independentemente do destino.

## Correções

- lib/links/classification.ts centraliza a detecção pelo hostname real, com domínios Amazon conhecidos e atalhos a.co/amzn.to. Caminhos, consultas e domínios que apenas contêm esse texto não são Amazon.
- URLs relativas e URLs absolutas do domínio da marca são reconhecidas como internas; www é tratado como equivalente. URLs externas relativas ao protocolo, como //example.com, continuam externas.
- Super Link reconhece o destino interno mesmo com metadados antigos de afiliado. Ao aplicar, remove sponsored, nofollow, target e marcações semânticas incompatíveis com o modo Interno. Trocar Afiliado por Externo, About ou Mention limpa os atributos herdados, que podem ser configurados novamente pelo usuário.
- A trava automática da Amazon foi retirada do efeito que podia reaproveitar o estado da URL anterior. Somente um domínio Amazon real mantém a regra de afiliado existente no projeto.
- O diálogo conserva a URL visível para reparar links existentes, inclui labels associados aos campos e permite rolagem do conteúdo sem perder os controles. Não promete indexação automática do destino.
- EntityLink deixa de recolocar os padrões _blank/nofollow do Tiptap quando os atributos foram limpos.
- Mention externo preserva href, tipo e dados de entidade, rel e target na edição, no salvamento e no HTML publicado. No diálogo alternativo, rel=mention também passou a ser emitido explicitamente. Essa marcação semântica é independente de sponsored/nofollow e não converte o destino externo em interno.
- O painel conta internos/externos pelo endereço de destino. Importação, sincronização de links, renderização de tabelas e relatórios compartilham a mesma detecção da Amazon.

## Links já salvos

Nenhum artigo real foi alterado em massa. Para gravar a limpeza em um link antigo, feche e reabra o Super Link, confira Interno e clique em Aplicar link; depois salve o artigo. A importação de HTML também limpa a falsa afiliação nos links da própria marca.

## Validação

- Quatro testes Node passaram: domínios reais e falsos positivos, URLs internas absolutas/relativas, importação/renderização e auditoria de links em HTML/JSON.
- Quatro testes de navegador passaram: três regressões do artigo/preview e um fluxo completo do editor. O fluxo cobre reparar um interno sem duplicar a âncora, salvar, reabrir, converter um externo de Afiliado para Mention, conferir uma menção existente, manter a regra de Amazon real e abrir outro link depois dela. A publicação descartável confirmou os atributos no HTML público.
- pnpm build passou, incluindo TypeScript.
- Comparação de lint com HEAD: nenhum erro novo. Os três arquivos com regras de efeitos preexistentes passaram de oito para seis erros no conjunto; os demais arquivos alterados e os novos testes/utilitário não apresentaram erros. Evidência local: artifacts/link-fix-lint-comparison.json.
- Capturas locais: [Interno](../../artifacts/editor-link-internal-fixed.png) e [Mention externo](../../artifacts/editor-link-external-mention.png). Artefatos são ignorados pelo Git.

Os testes usam exclusivamente file:.cache-tests/e2e.db. As publicações são descartáveis e removidas ao final. Não houve edição de rascunhos reais, publicação no site real, migration, commit, push ou deploy. O servidor do usuário não foi reiniciado.
