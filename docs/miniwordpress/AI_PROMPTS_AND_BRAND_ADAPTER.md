# IA e configuração editorial

Guardian SEO, melhoria de fragmentos, links internos, duplicação e planos visuais mantêm seus contratos de resposta e usam configuração editorial em `brand.config.ts`. Procedimentos Core vivem em `lib/editorial` e `lib/visual-editorial`.

As fontes de apoio e o plano de artigos começam vazios. Configure materiais pertinentes ao novo tema. Sugestões não devem inventar evidências, credenciais ou experiências; a autoria e as fontes devem ser verificáveis.

Neste checkout, `brand.config.ts` incorpora o relato do atendente da WifiConecta como base institucional: atendimento comercial humano, ajuda na escolha e encaminhamento do pedido após confirmação. A política admite mencionar Claro, Vivo, TIM e provedores de bairro, mantendo disponibilidade, preços, instalação e primeira cobrança sob consulta pelo WhatsApp. Os exemplos comerciais do relato não se tornam ofertas ou depoimentos. Essa identidade pertence ao adaptador da marca e não altera procedimentos nem contratos JSON do Core. Consulte [a base](../wificonecta/BASE-DA-MARCA.md).

Sem chave Gemini, recursos que possuem fallback determinístico continuam funcionando. Funções que exigem geração retornam indicação de configuração ausente. Para respostas de IA externas é necessário configurar o provedor; isso não depende do banco.
