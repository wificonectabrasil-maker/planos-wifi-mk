import { test, expect, type Page } from "@playwright/test";
import { randomUUID } from "node:crypto";
import { createClient } from "@libsql/client";
import { createDatabase } from "../lib/database/query";
import { adminCreateDraftPost, adminDeletePosts, adminPublishPost } from "../lib/db";
import { renderEditorDocToHtml } from "../lib/editor/docRenderer";

const ownUrl = "https://wificonecta.com.br/planos-de-internet/como-escolher-plano-internet-residencial";
const sourceUrl = "https://www.gov.br/anatel/pt-br/consumidor/pesquisa";

async function openLink(page: Page, label: string) {
  const anchor = page.locator(".tiptap a").filter({ hasText: label }).first();
  await anchor.scrollIntoViewIfNeeded();
  await anchor.evaluate(el => {
    (el.closest('[contenteditable="true"]') as HTMLElement).focus();
    const range = document.createRange(); range.selectNodeContents(el);
    const selection = window.getSelection()!; selection.removeAllRanges(); selection.addRange(range);
    document.dispatchEvent(new Event("selectionchange"));
  });
  await page.getByRole("button", { name: "Link", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Super Link", exact: true });
  await expect(dialog.getByLabel("Texto do link", { exact: true })).toHaveValue(label);
  return dialog;
}

test("internal repairs and external Mention survive editing, saving, reopening and publication", async ({ page }) => {
  if (process.env.TURSO_DATABASE_URL !== "file:.cache-tests/e2e.db") throw new Error("Isolated database required");
  const client = createClient({ url: process.env.TURSO_DATABASE_URL });
  const db = createDatabase(client);
  const silo = await client.execute("SELECT id FROM silos WHERE slug='planos-de-internet'");
  const slug = "links-regressao-" + randomUUID();
  const post = await adminCreateDraftPost({ silo_id: String(silo.rows[0].id), title: "Verificação isolada de links", slug, target_keyword: "links editoriais" });
  const paragraph = (text: string, href: string, extra: Record<string, string>) => ({ type: "paragraph", content: [{ type: "text", text, marks: [{ type: "link", attrs: { href, ...extra } }] }] });
  const doc = { type: "doc", content: [
    paragraph("necessidade e condições", ownUrl, { "data-link-type": "affiliate", rel: "sponsored nofollow noopener noreferrer", target: "_blank" }),
    paragraph("pesquisa da Anatel", sourceUrl, { "data-link-type": "mention", "data-entity": "mention", "data-entity-type": "mention", rel: "mention noopener noreferrer", target: "_blank" }),
    paragraph("ranking da Anatel", "https://informacoes.anatel.gov.br/paineis/acessos/ranking", { "data-link-type": "affiliate", rel: "sponsored nofollow", target: "_blank" }),
    paragraph("produto Amazon", "https://a.co/exemplo", { "data-link-type": "affiliate", rel: "sponsored nofollow", target: "_blank" }),
  ] };
  const errors: string[] = []; page.on("pageerror", error => errors.push(error.message));
  try {
    expect((await db.from("posts").update({ content_json: doc, content_html: renderEditorDocToHtml(doc) }).eq("id", post.id)).error).toBeNull();
    expect((await page.request.post("/api/admin/login", { form: { email: "admin@example.com", password: process.env.ADMIN_PASSWORD! } })).status()).toBe(200);
    await page.goto("/admin/editor/" + post.id);
    let dialog = await openLink(page, "necessidade e condições");
    const type = dialog.getByLabel("Tipo do link", { exact: true });
    await expect(type).toHaveValue("internal"); await expect(type).toBeEnabled();
    await expect(dialog.getByLabel("URL", { exact: true })).toHaveValue(ownUrl);
    await type.selectOption("external"); await expect(type).toHaveValue("external");
    await type.selectOption("internal"); await expect(type).toHaveValue("internal");
    await page.screenshot({ path: "artifacts/editor-link-internal-fixed.png" });
    await dialog.getByRole("button", { name: "Aplicar link", exact: true }).click();
    const own = page.locator('.tiptap a[href="' + ownUrl + '"]');
    await expect(own).toHaveCount(1); await expect(own).toHaveAttribute("data-link-type", "internal");
    expect(await own.getAttribute("rel")).toBeNull(); expect(await own.getAttribute("target")).toBeNull();
    dialog = await openLink(page, "pesquisa da Anatel");
    await expect(dialog.getByLabel("Tipo do link")).toHaveValue("mention");
    await expect(dialog.getByLabel("URL", { exact: true })).toHaveValue(sourceUrl);
    await dialog.getByRole("button", { name: "Aplicar link", exact: true }).click();
    dialog = await openLink(page, "ranking da Anatel");
    await dialog.getByLabel("Tipo do link").selectOption("mention");
    await dialog.getByRole("button", { name: "Aplicar link", exact: true }).click();
    const ranking = page.locator('.tiptap a').filter({ hasText: "ranking da Anatel" });
    await expect(ranking).toHaveAttribute("data-link-type", "mention");
    await expect(ranking).toHaveAttribute("rel", "mention noopener noreferrer");
    dialog = await openLink(page, "produto Amazon");
    await expect(dialog.getByLabel("Tipo do link")).toHaveValue("affiliate");
    await expect(dialog.getByLabel("Tipo do link")).toBeDisabled();
    await dialog.getByRole("button", { name: "Cancelar", exact: true }).click();
    // Opening another link after Amazon must not reuse its forced affiliate state.
    dialog = await openLink(page, "necessidade e condições");
    await expect(dialog.getByLabel("Tipo do link")).toHaveValue("internal");
    await expect(dialog.getByLabel("Tipo do link")).toBeEnabled();
    await dialog.getByRole("button", { name: "Cancelar", exact: true }).click();
    await page.getByRole("button", { name: "Salvar", exact: true }).first().click();
    await expect.poll(async () => {
      const row = await client.execute({ sql: "SELECT content_html FROM posts WHERE id=?", args: [post.id] });
      return String(row.rows[0].content_html).includes('data-link-type="internal"');
    }).toBe(true);
    await page.reload();
    dialog = await openLink(page, "pesquisa da Anatel");
    await expect(dialog.getByLabel("Tipo do link")).toHaveValue("mention");
    await expect(dialog.getByLabel("URL", { exact: true })).toHaveValue(sourceUrl);
    await page.screenshot({ path: "artifacts/editor-link-external-mention.png" });
    await dialog.getByRole("button", { name: "Cancelar", exact: true }).click();
    expect(await page.locator('.tiptap a[href="' + ownUrl + '"]').getAttribute("rel")).toBeNull();
    await adminPublishPost({ id: post.id, published: true });
    await page.goto("/planos-de-internet/" + slug);
    const content = page.locator(".system-post-content");
    expect(await content.locator('a[href="' + ownUrl + '"]').getAttribute("rel")).toBeNull();
    const mention = content.locator('a[href="' + sourceUrl + '"]');
    await expect(mention).toHaveAttribute("data-link-type", "mention");
    await expect(mention).toHaveAttribute("rel", "mention noopener noreferrer");
    await expect(mention).toHaveAttribute("target", "_blank");
    const amazon = content.locator('a[href="https://a.co/exemplo"]');
    await expect(amazon).toHaveAttribute("rel", /sponsored/);
    expect(errors).toEqual([]);
  } finally {
    await adminDeletePosts([post.id], { allowPublicUrlDeletion: true, confirmedSlugs: [slug] }); client.close();
  }
});
