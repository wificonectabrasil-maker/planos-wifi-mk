# Segunda fase — revisão editorial em andamento

## Integridade e limites

Em 10/11/2026, leitura direta dos oito registros comparou todos os campos presentes nos snapshots da primeira rodada: `content_html`, `content_json`, identidade do post, título, slug, `canonical_path`, `silo_id`, slug do silo, keywords, metadados salvos no snapshot, autoria, imagens, status, publicação e timestamps. Todos coincidiram. O teste de escrita revertido não deixou diferença nesses campos. Outros campos que não constavam do snapshot não podem ser comparados retroativamente; não afirmar igualdade integral de campos sem baseline. Não houve novas escritas.

O editor existente salva pelo `adminUpdatePost` o próprio registro `posts`, inclusive HTML e JSON, e atualiza `updated_at`. A prévia autenticada busca esse mesmo post por ID. Mudar `status` para `draft` ajusta `published` para falso. Não foi encontrada revisão paralela persistida que preserve simultaneamente a versão pública; portanto, não salvar os rascunhos nos registros publicados. A prévia existente, por si só, não é staging de uma revisão.

## Fontes diretas verificadas

- [TIM: consulta por CEP e número](https://www.tim.com.br/para-voce/internet/internet-para-casa/tim-casa-internet/consulta-disponibilidade): exemplo de fluxo real por endereço. A ferramenta é da operadora e não confirma automaticamente outras redes.
- [GuiaPreço: catálogo residencial](https://guiapreco.com.br/planos/internet/): mostra preço, velocidade, fidelidade e instalação, ressalvando que a cobertura não foi verificada. Preços da página não foram utilizados como oferta da WifiConecta.
- [Claro: cálculo de velocidade por uso](https://www.claro.com.br/blog/internet/quantos-mbps-ou-gbps-voce-precisa): organiza cenários por aparelhos e uso; faixas são orientação da prestadora, não padrão universal.
- [Melhor Plano: comparação de combos de TV](https://melhorplano.net/combo): combina preços, velocidades e serviços. A lista e os valores mudam; não foram tratados como vigentes na WifiConecta.
- [Claro: primeira fatura](https://www.claro.com.br/atendimento/entenda-sua-fatura): descreve cobrança proporcional, que pode deixar a primeira fatura maior ou menor.
- [Netflix: velocidades recomendadas](https://help.netflix.com/pt/node/306): distingue 3 Mbps para HD, 5 para Full HD e 15 para 4K; é uma recomendação do serviço e não determina por si só o plano da casa.
- [Anatel: oferta e contratação](https://www.gov.br/anatel/pt-br/consumidor/consumidor-novo/conheca-seus-direitos/oferta-e-contratacao): condições de fidelidade e informação. [Cobrança](https://www.gov.br/anatel/pt-br/consumidor/consumidor-novo/conheca-seus-direitos/cobranca): disponibilidade da conta com antecedência mínima de cinco dias.
- [Anatel: portabilidade](https://informacoes.anatel.gov.br/legislacao/resolucoes/2025/2022-resolucao-777): art. 103 apresenta prazo máximo do processo de até três dias úteis, sujeito às regras e condições aplicáveis.

## Revisão por artigo

As intenções continuam as mesmas; não há evidência suficiente para alterar keywords. "Rascunho" significa proposta local não validada no editor. Os diffs completos de HTML estão na pasta `diffs/`; os arquivos não são importadores nem devem ser gravados diretamente no banco.

### Internet no meu CEP

Intenção anterior e revisada: verificar operadoras na região e confirmar viabilidade no imóvel. Keyword `internet no meu cep` mantida. A TIM pede CEP e número; o artigo já explica isso e diferencia prédio e unidade. O acréscimo local reúne a resposta e o próximo passo em um bloco curto; diferencial pretendido: deixar explícito que um vizinho atendido não garante instalação. Os links internos e externos não foram alterados. Conflito potencial: a escolha entre operadoras pertence ao artigo de comparação; a conclusão deve permanecer focada na consulta. Pendência: evitar repetir a seção de passo a passo existente e validar o bloco no editor. [Diff completo](diffs/operadoras-internet-no-meu-cep.diff). URL, slug, canonical e silo iguais ao snapshot. Status: rascunho, não pronto.

### Pilar de planos residenciais

Intenção anterior e revisada: decisão geral entre cobertura, uso, custo e contratação. Keyword `planos de internet residencial` mantida. O acréscimo genérico da primeira rodada repetia o conteúdo existente e foi removido; o link contextual para o suporte de velocidade foi mantido. A simulação existente foi conferida: 3 × 89,90 + 9 × 119,90 = 1.348,80; 12 × 109,90 = 1.318,80, diferença de 30,00. O link novo aponta para `/planos-de-internet/quantos-mega-de-internet-preciso`; nenhum externo mudou. Conflito: não aprofundar dimensionamento ou custo além dos respectivos suportes. Pendência: revisar a narrativa completa e testar visualização. [Diff completo](diffs/como-escolher-plano-internet-residencial.diff). Campos de URL preservados. Status: rascunho, não pronto.

### Internet residencial barata

Intenção anterior e revisada: comparar custo total e desconto. Keyword `internet residencial barata` mantida. O exemplo novo repetia o já existente e foi removido: 3 × 79,90 + 9 × 109,90 + 99 = 1.327,80; 12 × 99,90 = 1.198,80; diferença de 129,00. Serviços extras 2 × 14,90 × 12 = 357,60. GuiaPreço demonstra por que mensalidade e taxa precisam ser avaliadas juntas, sem validar oferta específica. Links não foram alterados. Conflito: o passo a passo amplo pertence ao pilar. Pendência: rever todos os exemplos e verificar afirmação sobre periodicidade de reajuste na norma aplicável. [Diff completo](diffs/internet-residencial-barato.diff), atualmente vazio porque o acréscimo foi retirado. Campos de URL preservados. Status: ainda sem revisão efetiva, não pronto.

### Claro, Vivo ou TIM

Intenção anterior e revisada: comparação condicional por endereço e serviço fixo. Keyword `claro vivo ou tim internet residencial` mantida. A proposta acrescenta comparação de tecnologia, preços e atendimento para o mesmo imóvel, distinguindo métricas fixas de móveis; a Anatel publica indicadores por serviço e região. Nenhum link foi modificado. Conflito: disponibilidade detalhada pertence ao artigo de CEP. Pendência: examinar seção por seção as afirmações sobre cada operadora e a atualidade das fontes; evitar repetir critérios existentes. [Diff completo](diffs/claro-vivo-tim-internet-residencial.diff). URL, canonical e silo preservados. Status: rascunho, não pronto.

### Quantos Mega preciso?

Intenção anterior e revisada: dimensionar demanda simultânea; keyword `quantos mega de internet preciso` mantida. O rascunho reformula dois subtítulos que pareciam recomendar 1 Giga e propõe separar upload, download e Wi-Fi. A Netflix explicita requisitos diferentes por resolução e serviço; números não são uma regra universal por pessoa. Links não foram alterados. Conflito: não repetir diagnóstico aprofundado do segundo silo. Pendência: confrontar o bloco proposto com tabelas existentes e conferir referências numéricas por aplicativo. [Diff completo](diffs/quantos-mega-de-internet-preciso.diff). URL e canonical preservados. Status: rascunho, não pronto.

### Combo internet e celular

Intenção anterior e revisada: comparar serviços agrupados e separados, franquias e portabilidade. Keyword `combo internet e celular` mantida. A primeira rodada inseria uma segunda simulação anual, mas o artigo já contém uma comparação; o trecho novo foi retirado. A norma da Anatel traz prazo do processo de portabilidade, devendo ser lida com suas condições. Links não foram modificados. Conflito: TV e streaming já têm suporte próprio. Pendência: conferir cálculo existente de diferença anual, atualizar fontes e condensar a seção de TV quando apropriado. [Diff completo](diffs/combo-internet-e-celular.diff), atualmente vazio. URL e canonical preservados. Status: ainda sem revisão efetiva, não pronto.

### Internet, TV e streaming

Intenção anterior e revisada: comparar composição de canais, aplicativo e assinatura. Keyword `combo internet tv streaming` mantida. O rascunho distingue aplicativo disponível de assinatura efetivamente incluída e propõe conferir duração, telas e ativação. O comparador consultado mostra produtos diferentes, mas seus preços não foram reaproveitados. Nenhum link mudou. Conflito: não repetir comparação de telefonia móvel. Pendência: comparar o novo bloco com a seção existente sobre aplicativos, checar cálculo anual e validar serviços/planos de streaming em fontes originais. [Diff completo](diffs/melhor-internet-tv-streaming.diff). URL e canonical preservados. Status: rascunho, não pronto.

### Instalação e primeira fatura

Intenção anterior e revisada: viabilidade, agendamento e cobrança inicial. Keyword `instalação de internet residencial` mantida. O rascunho sugere uma sequência de etapas e exemplo ilustrativo de proporcionalidade: 90 ÷ 30 × 10 = 30; o método real depende do ciclo e da proposta. A Claro confirma que a primeira fatura pode diferir pelo proporcional; a Anatel aborda itens e antecedência da conta. Nenhum link mudou. Conflito: custos anuais pertencem ao artigo sobre preço. Pendência: cotejar exemplo com a simulação já existente e evitar duplicação; conferir condições da fonte e renderização. [Diff completo](diffs/instalacao-internet-primeira-fatura.diff). URL e canonical preservados. Status: rascunho, não pronto.

## Como viabilizar revisão segura no editor

1. Criar um ambiente de desenvolvimento isolado, com banco local ou staging separado e credenciais próprias, sem apontar para o Turso de produção.
2. Preparar cópias dos artigos nesse ambiente por um fluxo controlado, sem alterar registros ou URLs públicos. Preservar os originais e evitar dados privados ou credenciais.
3. Abrir as cópias no editor Tiptap, aplicar manualmente os trechos revisados, salvar e conferir que HTML e JSON representam a mesma versão. Usar a prévia autenticada e testar telas móveis, links, imagens, H1 e metadados.
4. Comparar novamente a versão de produção antes de qualquer aplicação, pois pode ter mudado depois do snapshot. Preparar revisão e aprovação separadas; a aplicação ao post publicado deve usar o fluxo oficial do editor, preservando explicitamente slug, canonical e silo.

Nenhum artigo desta etapa foi aprovado como pronto e nenhum foi publicado. A leitura integral, a validação de links, a conferência factual de todos os trechos e a prévia ainda precisam ser concluídas.

Na verificação automatizada HEAD dos 12 destinos externos únicos dos artigos originais, 11 responderam sem erro HTTP e o endereço de ajuda da Netflix retornou 403 ao HEAD; a mesma página foi acessível pela pesquisa web. Isso não verifica a precisão de todas as afirmações associadas nem substitui testes de navegação no editor.
