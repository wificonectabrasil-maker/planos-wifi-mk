"use client";

import { useMemo, useState } from "react";
import { createPost } from "@/app/admin/actions";
import type { Silo } from "@/lib/types";

function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

export function NewPostForm({ silos }: { silos: Silo[] }) {
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);

  const slugValue = useMemo(() => {
    if (slugTouched) return slug;
    return slugify(title);
  }, [slugTouched, slug, title]);

  return (
    <form action={createPost} className="rounded-3xl border border-(--border) bg-(--paper) p-8 space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <label className="text-xs text-(--muted-2)" htmlFor="silo_id">
            Silo
          </label>
          <select
            id="silo_id"
            name="silo_id"
            required
            className="w-full rounded-xl border border-(--border) bg-(--paper) px-3 py-2 text-sm outline-none"
          >
            <option value="">Selecione</option>
            {silos.map((silo) => (
              <option key={silo.id} value={silo.id}>
                {silo.name}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <label className="text-xs text-(--muted-2)" htmlFor="title">
            Titulo (H1)
          </label>
          <input
            id="title"
            name="title"
            required
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            className="w-full rounded-xl border border-(--border) bg-(--paper) px-3 py-2 text-sm outline-none"
          />
        </div>

        <div className="space-y-2">
          <label className="text-xs text-(--muted-2)" htmlFor="slug">
            Slug
          </label>
          <input
            id="slug"
            name="slug"
            required
            value={slugValue}
            onChange={(event) => {
              setSlugTouched(true);
              setSlug(event.target.value);
            }}
            className="w-full rounded-xl border border-(--border) bg-(--paper) px-3 py-2 text-sm outline-none"
            placeholder="exemplo-de-slug"
          />
          <p className="text-[10px] text-(--muted-2)">Gerado automaticamente pelo titulo.</p>
        </div>

        <div className="space-y-2">
          <label className="text-xs text-(--muted-2)" htmlFor="target_keyword">
            Target keyword
          </label>
          <input
            id="target_keyword"
            name="target_keyword"
            required
            className="w-full rounded-xl border border-(--border) bg-(--paper) px-3 py-2 text-sm outline-none"
          />
        </div>

        <div className="space-y-2 md:col-span-2">
          <label className="text-xs text-(--muted-2)" htmlFor="meta_description">
            Meta description (opcional)
          </label>
          <input
            id="meta_description"
            name="meta_description"
            className="w-full rounded-xl border border-(--border) bg-(--paper) px-3 py-2 text-sm outline-none"
          />
        </div>

        <div className="space-y-2 md:col-span-2">
          <label className="text-xs text-(--muted-2)" htmlFor="supporting_keywords">
            Supporting keywords (1 por linha)
          </label>
          <textarea
            id="supporting_keywords"
            name="supporting_keywords"
            className="h-24 w-full resize-none rounded-xl border border-(--border) bg-(--paper) px-3 py-2 text-sm outline-none"
          />
        </div>

        <div className="space-y-2 md:col-span-2">
          <label className="text-xs text-(--muted-2)" htmlFor="entities">
            Entidades / LSI (1 por linha)
          </label>
          <textarea
            id="entities"
            name="entities"
            className="h-24 w-full resize-none rounded-xl border border-(--border) bg-(--paper) px-3 py-2 text-sm outline-none"
          />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          className="rounded-xl border border-(--border) bg-(--brand-primary) px-4 py-2 text-xs font-semibold hover:bg-(--brand-primary)"
        >
          Criar rascunho
        </button>
      </div>
    </form>
  );
}
