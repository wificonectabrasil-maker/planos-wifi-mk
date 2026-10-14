"use client";
import { useEffect, useState, type ReactNode } from "react";
export function CampaignExpiry({ endsAt, children }: { endsAt: string; children: ReactNode }) {
  const [expired, setExpired] = useState(false);
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const check = () => {
      const remaining = Date.parse(endsAt) - Date.now();
      if (remaining <= 0) setExpired(true);
      else timer = setTimeout(check, Math.min(remaining, 2147483647));
    };
    timer = setTimeout(check, 0);
    const onVisible = () => { clearTimeout(timer); check(); };
    document.addEventListener("visibilitychange", onVisible);
    return () => { clearTimeout(timer); document.removeEventListener("visibilitychange", onVisible); };
  }, [endsAt]);
  return expired ? null : children;
}
