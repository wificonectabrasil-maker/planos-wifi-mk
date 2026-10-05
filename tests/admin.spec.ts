import { test, expect } from "@playwright/test";
import { createClient } from "@libsql/client";
import { createDatabase } from "../lib/database/query";
import { adminPublishPost, adminDeletePosts } from "../lib/db";
import sharp from "sharp";

test("admin, editor, publication, SEO, media and WordPress adapter on isolated Turso", async ({
  page,
  request,
}) => {
  const browserErrors: string[] = [];
  page.on("pageerror", (error) => browserErrors.push(error.message));
  await page.goto("/");
  await expect(
    page.getByRole("heading", { level: 1, name: /Internet pra sua casa/ }),
  ).toBeVisible();
  await expect(
    page.getByText("O que você quer conectar?"),
  ).toBeVisible();
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/admin\/login/);
  await expect(page.getByLabel("E-mail")).toHaveValue("admin@example.com");
  expect(
    (
      await request.post("/api/admin/login", {
        form: { email: "admin@example.com", password: "wrong" },
      })
    ).status(),
  ).toBe(401);
  expect(
    (await request.post("/api/admin/upload", { multipart: {} })).status(),
  ).toBe(401);
  await page.getByLabel("E-mail").fill("wrong@example.com");
  await page.getByLabel("Senha", { exact: true }).fill("wrong");
  await page.getByRole("button", { name: "Entrar no Painel" }).click();
  await expect(page.locator("form").getByRole("alert")).toHaveText("E-mail de administrador incorreto");
  await expect(page).toHaveURL(/\/admin\/login/);
  await page.getByLabel("E-mail").fill("admin@example.com");
  await page.getByRole("button", { name: "Entrar no Painel" }).click();
  await expect(page.locator("form").getByRole("alert")).toHaveText("Senha incorreta");
  await expect(page.getByLabel("E-mail")).toHaveValue("admin@example.com");
  await page
    .getByLabel("Senha", { exact: true })
    .fill(process.env.ADMIN_PASSWORD!);
  await page.getByRole("button", { name: "Entrar no Painel" }).click();
  await expect(page).toHaveURL(/\/admin$/);
  await page.goto("/admin/editor/new");
  await expect(page).toHaveURL(/\/admin\/editor\/[0-9a-f-]+$/);
  const postId = page.url().split("/").pop()!;
  await expect(page.locator('[contenteditable="true"]').first()).toBeVisible();
  const client = createClient({ url: process.env.TURSO_DATABASE_URL! }),
    db = createDatabase(client);
  try {
    const silo = await db
      .from("silos")
      .insert({ name: "Tema editorial", slug: "tema-editorial" })
      .select()
      .single();
    expect(silo.error).toBeNull();
    const saved = await db
      .from("posts")
      .update({
        silo_id: silo.data!.id,
        title: "Guia completo de teste",
        slug: "guia-de-teste",
        target_keyword: "guia de teste",
        meta_description: "Descrição editorial de teste",
        canonical_path: "/tema-editorial/guia-de-teste",
        content_html: "<p>Conteúdo editorial de teste.</p>",
        content_json: {
          type: "doc",
          content: [
            {
              type: "paragraph",
              content: [{ type: "text", text: "Conteúdo editorial de teste." }],
            },
          ],
        },
      })
      .eq("id", postId);
    expect(saved.error).toBeNull();
    await page.reload();
    await expect(
      page.locator('[contenteditable="true"]').first(),
    ).toContainText("Conteúdo editorial de teste.");
    await page.locator('[contenteditable="true"]').first().click();
    await page.keyboard.press("Control+End");
    await page.keyboard.type(" Texto salvo pelo editor.");
    await expect
      .poll(
        async () =>
          (
            await db
              .from("posts")
              .select("content_html")
              .eq("id", postId)
              .single()
          ).data?.content_html,
        { timeout: 25000 },
      )
      .toContain("Texto salvo pelo editor.");
    expect((await request.get("/tema-editorial/guia-de-teste")).status()).toBe(
      404,
    );
    await adminPublishPost({ id: postId, published: true });
    const post = await request.get("/tema-editorial/guia-de-teste");
    expect(post.status()).toBe(200);
    const html = await post.text();
    expect(html).toContain("Guia completo de teste");
    expect(html).toContain("application/ld+json");
    expect(html).toContain("Converse sobre o pacote que faz sentido pra você.");
    expect(await (await request.get("/sitemap.xml")).text()).toContain(
      "/tema-editorial/guia-de-teste",
    );
    expect(await (await request.get("/?q=Guia+completo")).text()).toContain(
      "Guia completo de teste",
    );
    expect(
      (await db.from("posts").update({ slug: "changed" }).eq("id", postId))
        .error?.code,
    ).toBe("URL_LOCKED");
    const image = await sharp({
      create: { width: 120, height: 80, channels: 3, background: "#14b8a6" },
    })
      .png()
      .toBuffer();
    const upload = await page.request.post("/api/admin/upload", {
      multipart: {
        file: { name: "image.png", mimeType: "image/png", buffer: image },
        postId,
        siloSlug: "tema-editorial",
        alt: "Imagem editorial",
      },
    });
    expect(upload.status()).toBe(200);
    const uploaded = await upload.json();
    expect(uploaded.url).toContain("/media/");
    const media = await request.get(uploaded.url);
    expect(media.status()).toBe(200);
    expect(media.headers()["content-type"]).toBe("image/webp");
    expect((await media.body()).length).toBeGreaterThan(0);
    expect((await request.head(uploaded.url)).headers()["content-length"]).toBe(
      media.headers()["content-length"],
    );
    expect(
      (
        await request.get(uploaded.url, {
          headers: { "if-none-match": media.headers().etag },
        })
      ).status(),
    ).toBe(304);
    expect(
      (
        await db
          .from("posts")
          .update({
            hero_image_url: uploaded.url,
            hero_image_alt: "Imagem editorial",
          })
          .eq("id", postId)
      ).error,
    ).toBeNull();
    await page.goto("/tema-editorial/guia-de-teste");
    const cover = page.getByRole("img", {
      name: "Imagem editorial",
      exact: true,
    });
    await expect(cover).toBeVisible();
    await expect
      .poll(() => cover.evaluate((img: HTMLImageElement) => img.naturalWidth))
      .toBeGreaterThan(0);
    const password = await page.request.post("/api/admin/wp-app-password", {
      data: { username: "contentor-test" },
    });
    expect(password.status()).toBe(200);
    const credentials = await password.json();
    const headers = {
      authorization:
        "Basic " +
        Buffer.from("contentor-test:" + credentials.app_password).toString(
          "base64",
        ),
    };
    expect(
      (await request.get("/wp-json/wp/v2/users/me", { headers })).status(),
    ).toBe(200);
    const wpmedia = await request.post("/wp-json/wp/v2/media", {
      headers,
      multipart: {
        file: { name: "wp.png", mimeType: "image/png", buffer: image },
        alt_text: "Alternativo",
      },
    });
    expect(wpmedia.status()).toBe(200);
    const attachment = await wpmedia.json();
    expect(attachment.id).toBeGreaterThan(0);
    expect((await request.get(attachment.source_url)).status()).toBe(200);
    const imported = await request.post("/wp-json/wp/v2/posts", {
      headers,
      data: {
        title: "Artigo importado de teste",
        content: "<p>Texto importado.</p>",
        slug: "artigo-importado",
      },
    });
    expect(imported.status()).toBe(200);
    expect((await imported.json()).id).toBeGreaterThan(0);
    expect(
      await (
        await request.get("/wp-json/wp/v2/posts?search=Artigo", { headers })
      ).text(),
    ).toContain("Artigo importado de teste");
    await page.goto("/admin/silos/tema-editorial/map");
    await expect(
      page.getByText("Guia completo de teste", { exact: true }).first(),
    ).toBeVisible();
    await page.goto("/admin/silos/tema-editorial");
    await page
      .getByRole("button", { name: "Mapa de Links", exact: true })
      .click();
    await expect
      .poll(
        async () =>
          (
            await db
              .from("silo_audits")
              .select("id", { count: "exact", head: true })
              .eq("silo_id", silo.data!.id)
          ).count,
        { timeout: 20000 },
      )
      .toBeGreaterThan(0);
    const guardian = await page.request.post("/api/admin/guardian-ai", {
      data: {
        title: "Guia completo de teste",
        keyword: "guia de teste",
        text: "Texto editorial de teste com fontes e contexto.",
      },
    });
    expect(guardian.status()).toBe(200);
    expect((await guardian.json()).source).toBe("local_fallback");
    await adminPublishPost({ id: postId, published: false });
    expect((await request.get("/tema-editorial/guia-de-teste")).status()).toBe(
      404,
    );
    await adminPublishPost({ id: postId, published: true });
    await adminDeletePosts([postId], {
      allowPublicUrlDeletion: true,
      confirmedSlugs: ["guia-de-teste"],
    });
    expect([307, 308]).toContain(
      (
        await request.get("/tema-editorial/guia-de-teste", { maxRedirects: 0 })
      ).status(),
    );
    expect(browserErrors).toEqual([]);
    await page.screenshot({
      path: "test-results/turso-admin.png",
      fullPage: true,
    });
  } finally {
    client.close();
  }
});
