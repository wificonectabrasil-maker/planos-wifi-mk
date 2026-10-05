"use client";

import { useEffect, useState } from "react";

export function AnimatedEffects() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted) return null;

  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
      {/* Floating decorative elements */}
      <div className="absolute left-[8%] bottom-[25%] float-slow opacity-[0.04]">
        {/* Droplet */}
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--brand-primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z" />
        </svg>
      </div>

      <div className="absolute right-[12%] top-[30%] float-mid opacity-[0.04]">
        {/* Sparkle */}
        <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="var(--brand-hot)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 3v18M3 12h18M5.636 5.636l12.728 12.728M18.364 5.636L5.636 18.364" />
        </svg>
      </div>

      <div className="absolute left-[20%] top-[40%] float-fast opacity-[0.03]">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="var(--brand-accent)"><circle cx="12" cy="12" r="5" /></svg>
      </div>

      <div className="absolute right-[30%] bottom-[40%] float-slow opacity-[0.02]">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="var(--brand-primary)"><circle cx="12" cy="12" r="10" /></svg>
      </div>

      <div className="absolute left-[40%] top-[80%] float-fast opacity-[0.03]">
        {/* Leaf */}
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--brand-hot)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M17 8c.5-2.8-.6-5.4-2.8-7C11.5 3.2 6 9 6 16a6 6 0 0 0 12 0" />
          <path d="M6 16c3-3 6-5 12-8" />
        </svg>
      </div>

      {/* Static Decorative Circles in Background */}
      <div className="absolute -left-32 -top-32 w-96 h-96 bg-(--accent-soft) opacity-10 blur-[80px] rounded-full" />
      <div className="absolute -right-32 top-1/2 w-80 h-80 bg-(--brand-hot) opacity-10 blur-[100px] rounded-full" />
    </div>
  );
}
