"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { trackConversion } from "@/lib/telecom/analytics";

export function ConversionObserver() {
  const pathname = usePathname();
  useEffect(() => {
    const root = document.querySelector(".wifi-site");
    if (!root) return;
    const viewed = new Set<string>();
    const observed = new WeakSet<Element>();
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const id = (entry.target as HTMLElement).dataset.trackPlan;
          if (id && !viewed.has(id)) {
            viewed.add(id);
            trackConversion("plan_viewed", { plan_id: id });
          }
          observer.unobserve(entry.target);
        }
      },
      { threshold: 0.25 },
    );
    const observeCards = () => {
      root.querySelectorAll("[data-track-plan]").forEach((card) => {
        if (!observed.has(card)) {
          observed.add(card);
          observer.observe(card);
        }
      });
    };
    const onClick = (event: Event) => {
      const element = event.target;
      if (!(element instanceof Element)) return;
      const link = element.closest<HTMLElement>("[data-select-plan]");
      if (link?.dataset.selectPlan)
        trackConversion("plan_selected", {
          plan_id: link.dataset.selectPlan,
        });
    };
    observeCards();
    const mutations = new MutationObserver(observeCards);
    mutations.observe(root, { childList: true, subtree: true });
    root.addEventListener("click", onClick);
    return () => {
      observer.disconnect();
      mutations.disconnect();
      root.removeEventListener("click", onClick);
    };
  }, [pathname]);
  return null;
}
