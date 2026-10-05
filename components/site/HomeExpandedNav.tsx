"use client";

import Link from "next/link";



export function HomeExpandedNav({items}: {items: Array<{href: string; label: string}>}) {
 const middle = Math.ceil(items.length / 2);
  return (
    <nav
      aria-label="Navegação expandida da home"
      className="system-silo-nav-wrapper mx-auto mt-4 w-full max-w-6xl rounded-2xl border border-(--border) bg-[rgba(248,247,245,0.7)] p-2 shadow-sm backdrop-blur-md"
    >
      <div className="system-silo-nav-grid">
        {/* Início – ocupa 2 linhas à esquerda */}
        <Link
          href="/"
          className="system-silo-nav-start rounded-xl bg-(--brand-hot) px-5 py-3 text-sm font-semibold text-white transition hover:brightness-95"
        >
          Início
        </Link>


        <div className="system-silo-nav-center">
          {items.slice(0, middle).map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="system-silo-nav-item rounded-xl border border-transparent px-3 py-2.5 text-(--ink) transition-all hover:border-(--border) hover:bg-white hover:text-(--brand-hot) hover:shadow-sm"
            >
              {item.label}
            </Link>
          ))}
        </div>

        {/* Sobre – ocupa posição superior direita */}
        <Link
          href="/sobre"
          className="system-silo-nav-end-top rounded-xl border border-transparent px-4 py-2.5 text-sm font-medium text-(--ink) transition-all hover:border-(--border) hover:bg-white hover:text-(--brand-hot) hover:shadow-sm"
        >
          Sobre
        </Link>


        <div className="system-silo-nav-center">
          {items.slice(middle).map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="system-silo-nav-item rounded-xl border border-transparent px-3 py-2.5 text-(--ink) transition-all hover:border-(--border) hover:bg-white hover:text-(--brand-hot) hover:shadow-sm"
            >
              {item.label}
            </Link>
          ))}
        </div>

        {/* Contato – posição inferior direita */}
        <Link
          href="/contato"
          className="system-silo-nav-end-bottom rounded-xl border border-transparent px-4 py-2.5 text-sm font-medium text-(--ink) transition-all hover:border-(--border) hover:bg-white hover:text-(--brand-hot) hover:shadow-sm"
        >
          Contato
        </Link>
      </div>
    </nav>
  );
}
