# Proposta localizada para revisão

As versões completas em HTML e JSON nesta pasta são artefatos locais de revisão. Não foram gravadas no CMS e não devem ser importadas diretamente no banco. O editor do projeto salva o próprio registro público; a prévia atual não mantém uma versão separada. Para aplicação futura, usar editor em ambiente isolado ou outro fluxo de revisão seguro e conferir novamente as versões atuais antes de qualquer salvamento.

## Internet no meu CEP

URL e canonical originais: https://wificonecta.com.br/planos-de-internet/operadoras-internet-no-meu-cep
Slug: `operadoras-internet-no-meu-cep`. Silo: `planos-de-internet`.

Próximo ao começo, antes de “Como verificar a disponibilidade pelo CEP”, propõe-se um quadro com quatro situações: operadora no CEP, vizinho atendido, apartamento e instalação não liberada. Ele não substitui o passo a passo existente: resume como interpretar os resultados e o que perguntar depois. Acrescenta-se link contextual para `/planos`, sem descrevê-lo como verificador automático. Não se removeu texto, imagem ou link anterior.

[Diff restrito de CEP](operadoras-internet-no-meu-cep.diff)

## Pilar de planos residenciais

URL e canonical originais: https://wificonecta.com.br/planos-de-internet/como-escolher-plano-internet-residencial
Slug: `como-escolher-plano-internet-residencial`. Silo: `planos-de-internet`.

O parágrafo existente é ampliado com a frase solicitada e um link contextual para `/planos-de-internet/quantos-mega-de-internet-preciso`. Na versão consultada não havia outro link para esse destino. Nenhum outro parágrafo, imagem ou link foi removido.

[Diff restrito do pilar](como-escolher-plano-internet-residencial.diff)

## Conferência

Os dois registros foram lidos novamente do banco em modo somente leitura; os campos de conteúdo, slug, canonical, silo e data correspondiam aos snapshots anteriores. Os arquivos `baseline.json` identificam os valores e hashes para detectar mudanças posteriores. A proposta não altera títulos SEO, descriptions, Open Graph, imagens, autoria ou estado de publicação. Os destinos novos responderam HTTP 200 em 10/11/2026. As partes inseridas foram comparadas entre HTML e JSON localmente, incluindo lista, texto e destino do link. Ainda falta a validação pelo editor Tiptap e uma prévia real em ambiente isolado; os arquivos locais não constituem uma revisão salva no CMS.
