# Frontend público

O preset tem identidade neutra em brand.config.ts. Neste checkout, a identidade é WifiConecta, com home comercial, interesses de consulta, páginas de serviços e blog. O atendimento e a apresentação de pacotes acontecem pelo WhatsApp; a home não publica velocidades ofertadas, valores ou planos fixos. Sem posts, o blog mostra orientações e estado editorial vazio. Silos ativos organizam temas e grupos. Artigos mantêm TOC, conteúdo, autoria, fontes, JSON-LD e imagens, além do CTA opcional de WhatsApp definido pela marca. A extração automática de FAQ foi desativada na configuração WifiConecta.

URLs são resolvidas por SITE_URL e configuração de deploy. Defina o domínio real antes de publicar. Conteúdos excluídos podem redirecionar para a página de recuperação. Tokens de UI ficam em app/globals.css; não use a estrutura de banco para guardar constantes visuais do Core.

Os estilos públicos de WifiConecta ficam em `app/wificonecta.css`, dentro de `.wifi-site`, preservando os tokens da administração. A navegação tem duas linhas no desktop e menu no celular. Consulte [o projeto](../wificonecta/README.md) para rotas, dados necessários e validação.
