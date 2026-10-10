import Link from "next/link";
import { ArrowRight, ClipboardList, Router } from "lucide-react";
import { wifiEditorialSilos } from "@/lib/telecom/editorial-plan";

export function EditorialSiloCards() {
  return (
    <div className="wifi-guide-grid wifi-editorial-grid">
      {wifiEditorialSilos.map(silo => {
        const Icon = silo.icon === "plans" ? ClipboardList : Router;
        return (
          <Link prefetch={false} key={silo.slug} href={silo.path} className="wifi-guide-card">
            <div className="wifi-guide-icon"><Icon size={30} aria-hidden="true" /></div>
            <span className="wifi-eyebrow">Explore por assunto</span>
            <h3>{silo.name}</h3>
            <p>{silo.description}</p>
            <span className="wifi-text-link">Explorar tema <ArrowRight size={16} aria-hidden="true" /></span>
          </Link>
        );
      })}
    </div>
  );
}
