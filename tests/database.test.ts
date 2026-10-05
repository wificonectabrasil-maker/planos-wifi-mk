import assert from "node:assert/strict";
import { test } from "node:test";
import { randomBytes } from "node:crypto";
import { createClient } from "@libsql/client";
import { migrate } from "../lib/database/migrate";
import { createDatabase } from "../lib/database/query";
import { TABLES } from "../lib/database/schema";
import {
  storeMedia,
  loadMediaBytes,
  loadMediaMetadata,
} from "../lib/media/storage";

test("CMS schema, visibility, codecs, relations, constraints and media", async () => {
  const client = createClient({ url: ":memory:" });
  try {
    await migrate(client);
    await migrate(client);
    assert.equal(
      (await client.execute("SELECT count(*) n FROM _migrations")).rows[0].n,
      3,
    );
    for (const [name, fields] of Object.entries(TABLES)) {
      const columns = (
        await client.execute(`PRAGMA table_info(${name})`)
      ).rows.map((row) => row.name);
      assert.deepEqual(columns.sort(), Object.keys(fields).sort());
    }
    const db = createDatabase(client),
      pub = createDatabase(client, "public");
    const silo = await db
      .from("silos")
      .insert({ name: "Tema de teste", slug: "tema" })
      .select()
      .single();
    assert.equal(silo.error, null);
    assert.equal(silo.data?.is_active, true);
    assert.match(silo.data!.id, /^[0-9a-f-]{36}$/);
    const draft = await db
      .from("posts")
      .insert({
        silo_id: silo.data!.id,
        title: "Guia de teste",
        slug: "guia",
        supporting_keywords: ["ação", "contexto"],
        content_json: { type: "doc", content: [] },
      })
      .select("*,silo:silo_id(name,slug)")
      .single();
    assert.equal(draft.error, null);
    assert.equal(draft.data?.published, false);
    assert.deepEqual(draft.data?.supporting_keywords, ["ação", "contexto"]);
    assert.deepEqual(draft.data?.content_json, { type: "doc", content: [] });
    assert.deepEqual(draft.data?.silo, { name: "Tema de teste", slug: "tema" });
    assert.equal((await pub.from("posts").select()).data?.length, 0);
    assert.ok((await pub.from("posts").insert({ slug: "forbidden" })).error);
    assert.ok((await pub.from("wp_app_passwords").select()).error);
    const published = await db
      .from("posts")
      .update({
        published: true,
        status: "published",
        canonical_path: "/tema/guia",
      })
      .eq("id", draft.data!.id)
      .select()
      .single();
    assert.equal(published.error, null);
    assert.ok(published.data?.url_locked_at);
    assert.equal((await pub.from("posts").select()).data?.length, 1);
    assert.equal(
      (
        await db
          .from("posts")
          .update({ slug: "changed" })
          .eq("id", draft.data!.id)
      ).error?.code,
      "URL_LOCKED",
    );
    assert.equal(
      (
        await db
          .from("silos")
          .update({ slug: "changed" })
          .eq("id", silo.data!.id)
      ).error?.code,
      "URL_LOCKED",
    );
    assert.equal(
      (
        await db
          .from("posts")
          .update({ published: false, status: "draft" })
          .eq("id", draft.data!.id)
      ).error,
      null,
    );
    assert.equal(
      (
        await db
          .from("posts")
          .update({ canonical_path: "/new" })
          .eq("id", draft.data!.id)
      ).error?.code,
      "URL_LOCKED",
    );
    assert.equal((await pub.from("posts").select()).data?.length, 0);
    await db
      .from("posts")
      .update({ published: true, status: "published" })
      .eq("id", draft.data!.id);
    await db.from("silos").update({ is_active: false }).eq("id", silo.data!.id);
    assert.equal((await pub.from("posts").select()).data?.length, 0);
    await db.from("silos").update({ is_active: true }).eq("id", silo.data!.id);
    await db
      .from("posts")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", draft.data!.id);
    assert.equal((await pub.from("posts").select()).data?.length, 0);
    const group = await db
      .from("silo_groups")
      .upsert(
        {
          silo_id: silo.data!.id,
          key: "grupo",
          label: "Grupo",
          keywords: ["one"],
        },
        { onConflict: "silo_id,key" },
      )
      .select()
      .single();
    const updated = await db
      .from("silo_groups")
      .upsert(
        { silo_id: silo.data!.id, key: "grupo", label: "Grupo novo" },
        { onConflict: "silo_id,key" },
      )
      .select()
      .single();
    assert.equal(updated.error, null);
    assert.equal(updated.data?.id, group.data?.id);
    assert.deepEqual(updated.data?.keywords, ["one"]);
    const batch = await db
      .from("silo_batches")
      .insert({ silo_id: silo.data!.id, name: "Lote" })
      .select()
      .single();
    await db
      .from("silo_batch_posts")
      .insert({ batch_id: batch.data!.id, post_id: draft.data!.id });
    const nested = await db
      .from("silo_batch_posts")
      .select("position,post:post_id(title,silo:silo_id(slug))")
      .single();
    assert.equal(nested.error, null);
    assert.equal(nested.data?.post.silo.slug, "tema");
    const invalid = await db
      .from("posts")
      .insert([
        { slug: "atomic-first" },
        { slug: "atomic-second", silo_id: "missing" },
      ]);
    assert.equal(invalid.error?.code, "FOREIGN_KEY_VIOLATION");
    assert.equal(
      (await db.from("posts").select().eq("slug", "atomic-first")).data?.length,
      0,
    );
    const id = await db
      .from("wp_id_map")
      .insert({ entity_type: "post", entity_uuid: draft.data!.id })
      .select()
      .single();
    assert.equal(typeof id.data?.id, "number");
    assert.equal(
      (
        await db
          .from("wp_id_map")
          .insert({ entity_type: "post", entity_uuid: draft.data!.id })
      ).error?.code,
      "UNIQUE_VIOLATION",
    );
    assert.equal(
      (await db.from("posts").select().search(["title", "slug"], "' OR 1=1 --"))
        .data?.length,
      0,
    );
    assert.throws(() => db.from("posts").eq('id" OR 1=1 --', "x"));
    assert.equal(
      (await db.from("posts").select("id", { count: "exact" }).limit(0)).count,
      1,
    );
    await db
      .from("url_redirects")
      .insert({
        source_path: "/old",
        target_path: "/tema/guia",
        entity_type: "post",
      });
    assert.equal(
      (
        await pub
          .from("url_redirects")
          .select("target_path")
          .eq("source_path", "/old")
          .single()
      ).data?.target_path,
      "/tema/guia",
    );
    const bytes = randomBytes(900000),
      media = await storeMedia("test/image.webp", bytes, "image/webp", client);
    assert.equal(
      (await loadMediaMetadata("test/image.webp", client))?.sha256,
      media.sha256,
    );
    assert.deepEqual(
      Buffer.from(await loadMediaBytes(media.id, client)),
      bytes,
    );
    await assert.rejects(() =>
      storeMedia("../secret", bytes, "image/webp", client),
    );
    await assert.rejects(() =>
      storeMedia("bad/file.svg", bytes, "image/svg+xml", client),
    );
    assert.equal(
      (await client.execute("PRAGMA foreign_key_check")).rows.length,
      0,
    );
  } finally {
    client.close();
  }
});
