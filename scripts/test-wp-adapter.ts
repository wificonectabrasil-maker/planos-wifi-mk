import { Buffer } from "buffer";

const baseUrl = process.env.WP_ADAPTER_BASE_URL;
const username = process.env.WP_ADAPTER_USER;
const password = process.env.WP_ADAPTER_PASSWORD;

if (!baseUrl || !username || !password) {
  console.error("Missing env. Set WP_ADAPTER_BASE_URL, WP_ADAPTER_USER, WP_ADAPTER_PASSWORD");
  process.exit(1);
}

const auth = Buffer.from(`${username}:${password}`).toString("base64");
const headers = {
  Authorization: `Basic ${auth}`,
};

async function run() {
  const meRes = await fetch(`${baseUrl}/wp-json/wp/v2/users/me`, { headers });
  console.log("/users/me", meRes.status, await meRes.json());

  const postPayload = {
    title: "Post de teste Contentor",
    slug: "post-teste-contentor",
    content: "<h2>Intro</h2><p><strong>Teste</strong> <a href=\"https://example.com\" rel=\"nofollow sponsored\" target=\"_blank\">link</a></p><img src=\"https://example.com/image.jpg\" />",
    excerpt: "Resumo do post",
    status: "publish",
  };

  const postRes = await fetch(`${baseUrl}/wp-json/wp/v2/posts`, {
    method: "POST",
    headers: { ...headers, "Content-Type": "application/json" },
    body: JSON.stringify(postPayload),
  });
  console.log("/posts", postRes.status, await postRes.json());
}

run().catch((error) => {
  console.error("Test failed", error);
  process.exit(1);
});