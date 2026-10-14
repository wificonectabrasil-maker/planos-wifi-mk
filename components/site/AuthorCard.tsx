import Image from "next/image";
import Link from "next/link";
import { Facebook, Instagram, Link2, MessageCircle } from "lucide-react";
import type { CollaboratorProfile } from "@/lib/site/collaborators";

const socialIcons = { instagram: Instagram, facebook: Facebook, whatsapp: MessageCircle };

export function AuthorCard({ profile, id, team = false }: {
  profile: CollaboratorProfile;
  id?: string;
  team?: boolean;
}) {
  const Heading = team ? "h3" : "h2";
  return <section id={id} className="site-author-card" aria-label={`Perfil de ${profile.name}`}>
    <Image src={profile.image.src} alt={profile.image.alt} width={profile.image.width} height={profile.image.height} sizes="96px" className="site-author-avatar" />
    <div className="site-author-details">
      <p className="site-author-eyebrow">{team ? "Nosso time · Autoria" : "Sobre o autor"}</p>
      <Heading>{profile.name}</Heading>
      <p className="site-author-role">{profile.siteRole}</p>
      <p className="site-author-bio">{profile.shortBio}</p>
      <nav className="site-author-socials" aria-label={`Redes sociais e contato de ${profile.name}`}>
        {profile.links.map(link => {
          const Icon = link.platform ? socialIcons[link.platform] : Link2;
          return <a href={link.href} key={link.href} target="_blank" rel="noopener noreferrer" aria-label={`${link.label} — ${profile.name} (abre em nova aba)`}>
            <Icon size={18} aria-hidden="true" /><span>{link.label}</span>
          </a>;
        })}
      </nav>
      {!team && <Link prefetch={false} className="site-author-profile-link" href={profile.profilePath ?? "/sobre"}>Conhecer {profile.name} e a equipe</Link>}
    </div>
  </section>;
}
