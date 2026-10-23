"use client";

import { useId, useState } from "react";
import { Check, Copy, Facebook, Linkedin, MessageCircle, Share2 } from "lucide-react";

/** Receives the canonical URL so previews and campaign parameters are never shared. */
export function ArticleShare({ title, url }: { title: string; url: string }) {
  const panelId = useId();
  const [expanded, setExpanded] = useState(false);
  const [copyState, setCopyState] = useState<"ready" | "copied" | "error">("ready");
  const encodedUrl = encodeURIComponent(url);
  const networks = [
    { name: "WhatsApp", href: `https://wa.me/?text=${encodeURIComponent(`${title}\n${url}`)}`, icon: MessageCircle },
    { name: "Facebook", href: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`, icon: Facebook },
    { name: "X", href: `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodeURIComponent(title)}`, icon: null },
    { name: "LinkedIn", href: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`, icon: Linkedin },
  ];

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(url);
      setCopyState("copied");
    } catch {
      setCopyState("error");
    }
  }

  return (
    <div className="system-article-share" role="group" aria-label={`Compartilhar artigo: ${title}`}>
      <div className="system-article-share-toolbar">
        <button type="button" aria-expanded={expanded} aria-controls={panelId} onClick={() => setExpanded(value => !value)}>
          <Share2 size={16} aria-hidden="true" /> Compartilhar
        </button>
        <button type="button" onClick={() => void copyLink()} aria-label={`Copiar link do artigo: ${title}`}>
          {copyState === "copied" ? <Check size={16} aria-hidden="true" /> : <Copy size={16} aria-hidden="true" />}
          {copyState === "copied" ? "Copiado" : "Copiar link"}
        </button>
      </div>
      <nav id={panelId} hidden={!expanded} className="system-article-share-networks" aria-label={`Redes sociais para compartilhar: ${title}`}>
        {networks.map(({ name, href, icon: Icon }) => (
          <a key={name} href={href} target="_blank" rel="noopener noreferrer nofollow" aria-label={`Compartilhar no ${name} (abre em nova aba)`} title={`Compartilhar no ${name}`}>
            {Icon ? <Icon size={18} aria-hidden="true" /> : <span aria-hidden="true">𝕏</span>}
            <span>{name}</span>
          </a>
        ))}
      </nav>
      <p className="system-article-share-status" role="status">{copyState === "copied" ? "Link copiado!" : copyState === "error" ? "Não foi possível copiar automaticamente. Selecione o link abaixo para copiar." : ""}</p>
      {copyState === "error" ? <input className="system-article-share-url" aria-label="Link do artigo para copiar manualmente" value={url} readOnly onFocus={event => event.currentTarget.select()} /> : null}
    </div>
  );
}
