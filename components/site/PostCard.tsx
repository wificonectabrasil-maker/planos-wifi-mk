import Link from "next/link";
import type { PostWithSilo } from "@/lib/types";

export function PostCard({ post }: { post: PostWithSilo }) {
  const href = post.silo ? `/${post.silo.slug}/${post.slug}` : `/${post.slug}`;

  return (
    <Link
      href={href}
      className="brand-card group block rounded-2xl p-5 transition hover:brightness-95"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs text-(--muted-2)">{post.silo?.name ?? "Post"}</p>
          <h3 className="mt-1 text-base font-semibold leading-snug group-hover:text-(--brand-hot)">
            {post.title}
          </h3>
          <p className="mt-2 text-sm text-(--muted-2)">
            {post.meta_description ?? "Abrir artigo"}
          </p>
        </div>
        <span className="shrink-0 rounded-full border border-(--brand-accent) bg-(--brand-primary) px-3 py-1 text-xs text-(--ink)">
          Ver
        </span>
      </div>
    </Link>
  );
}

