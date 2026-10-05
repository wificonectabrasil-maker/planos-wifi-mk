# Contentor -> WordPress-like Adapter

This project exposes minimal WordPress REST endpoints so Contentor can publish into the CMS.

Base URL to use in Contentor:
- https://SEU_DOMINIO/wp-json/wp/v2

Endpoints implemented:
- GET /wp-json/wp/v2/users/me
- POST /wp-json/wp/v2/posts
- POST /wp-json/wp/v2/media
- GET /wp-json/wp/v2/posts?search=texto

Behavior:
- Posts are always imported as draft
- Silo/category is left empty (silo_id = null)
- content_html is stored as-is (HTML)
- raw payload is stored for auditing

Creating an Application Password (admin-only)
- POST /api/admin/wp-app-password
- Body: {"username":"seu_usuario","display_name":"Seu Nome"}
- Returns: { app_password: "xxxx xxxx xxxx xxxx xxxx xxxx" }

Example curl (requires admin session cookie):

curl -X POST https://SEU_DOMINIO/api/admin/wp-app-password \
  -H "Content-Type: application/json" \
  -H "Cookie: admin=1" \
  -d '{"username":"projeto_admin","display_name":"projeto"}'

Use in Contentor:
- Username: the same username
- Application Password: the returned app_password (spaces allowed)

Notes:
- If you want a quick local test, you can also set env vars:
  WP_FAKE_USER and WP_FAKE_PASSWORD
- Imports never publish automatically.
