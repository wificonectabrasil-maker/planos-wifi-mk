# Adaptar a identidade

Edite `brand.config.ts`: nome, URL, descrição, tagline, logo, idioma, contato, autor padrão, transparência de afiliados, nicho, tom e política de fontes.

Na WifiConecta, `useBrandCanonicalOrigin: true` fixa canônicos, Open Graph, JSON-LD, sitemap e auditorias na URL da marca, independentemente do host de desenvolvimento ou deploy. Outros projetos sem essa opção mantêm a resolução por ambiente. `staticSiloNavigation: true` usa o plano configurado da marca no cabeçalho sem consultas de artigos ou grupos ao banco; nesta marca os dois hubs são entradas permanentes da navegação. Os hubs e a home usam cache com revalidação, e as ações administrativas invalidam as URLs ao publicar artigos. O rodapé está no servidor e a navegação pública fica em um módulo pequeno separado do catálogo e de seus validadores.

`whatsappPhone` guarda o telefone público da marca, com DDI e DDD. Os CTAs e o painel comercial usam esse número quando `WIFICONECTA_WHATSAPP` não fornece uma alternativa válida no servidor. O preset começa com esse campo vazio; configure o contato próprio de cada novo projeto.

O plano editorial, manifesto, fontes de apoio e colaboradores começam vazios. Adicione somente materiais do projeto novo. Não invente biografias, experiência, credenciais nem revisão por especialistas. Silos e artigos são criados no admin e armazenados na Turso; o menu e a home usam esses dados automaticamente.

O Core de IA preserva seus contratos JSON e aplica a identidade e os critérios definidos nesse arquivo. Gemini e SERP usam credenciais próprias opcionais. Um projeto sem plano editorial configurado continua podendo editar e publicar artigos.

Substitua `public/brand-logo.svg` e `app/icon.svg`; adapte tokens visuais em `app/globals.css`. Revise as páginas institucionais conforme as práticas do novo projeto antes de publicar.
