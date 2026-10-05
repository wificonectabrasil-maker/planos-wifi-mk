"use client";

import { useState } from "react";
import { ChevronDown, FileText } from "lucide-react";
import { useEditorContext } from "@/components/editor/EditorContext";
import { GuardianPanel } from "@/components/editor/GuardianPanel";
import { TermsPanel } from "@/components/editor/TermsPanel";
import { LinkHygienePanel } from "@/components/editor/LinkHygienePanel";
import { InternalLinksPanel } from "@/components/editor/InternalLinksPanel";
import { TextSearchPanel } from "@/components/editor/TextSearchPanel";
import { VisualPlanPanel } from "@/components/editor/VisualPlanPanel";

export function ContentIntelligence() {
  const { outline, onJumpToHeading } = useEditorContext();
  const [isOutlineOpen, setOutlineOpen] = useState(false);

  return (
    <aside className="admin-sidebar admin-sidebar-left flex h-full min-h-0 w-[424px] shrink-0 flex-col border-r border-(--border) xl:w-[464px]">
      <div className="border-b border-(--border) px-3 py-1.5 text-[10px] font-semibold uppercase text-(--muted)">
        Inteligencia
      </div>

      <div
        id="intelligence-scroll-container"
        className="admin-scrollbar flex-1 space-y-2 overflow-y-auto px-2.5 py-2 md:px-2.5 md:py-2.5"
      >
        <TextSearchPanel />

        <section className="admin-subpane overflow-hidden">
          <button
            type="button"
            onClick={() => setOutlineOpen((v) => !v)}
            className="flex w-full items-center justify-between gap-2 px-2 py-1.5 text-left hover:bg-(--surface-elevated) transition-colors"
          >
            <h3 className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-(--muted)">
              <FileText size={13} />
              Estrutura (H2/H3/H4)
            </h3>
            <div className="flex items-center gap-1.5">
              {outline.length > 0 ? (
                <span className="text-[9px] text-(--muted-2)">{outline.length}</span>
              ) : null}
              <ChevronDown
                size={13}
                className={`text-(--muted) transition-transform duration-200 ${isOutlineOpen ? "rotate-180" : ""}`}
              />
            </div>
          </button>
          {isOutlineOpen ? (
            <div className="border-t border-(--border) px-2 py-1.5 space-y-1.5 border-l border-l-(--border) ml-4 max-h-[400px] overflow-y-auto admin-scrollbar">
              {outline.length === 0 ? (
                <p className="text-xs text-(--muted-2)">Nenhum heading ainda.</p>
              ) : (
                outline.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => onJumpToHeading(item.pos)}
                    className={`block w-full text-left text-[12px] leading-[1.35] text-(--text) hover:text-(--brand-accent) ${
                      item.level === 3 ? "pl-3 text-(--muted)" : item.level === 4 ? "pl-5 text-(--muted-2)" : ""
                    }`}
                  >
                    <span className="line-clamp-2">{item.text}</span>
                  </button>
                ))
              )}
            </div>
          ) : null}
        </section>

        <InternalLinksPanel />
        <LinkHygienePanel />
        <GuardianPanel />
        <VisualPlanPanel />
        <TermsPanel />
      </div>
    </aside>
  );
}
