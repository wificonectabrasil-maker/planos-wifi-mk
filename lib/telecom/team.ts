import type { CollaboratorProfile } from "@/lib/site/collaborators";

// Profile and photograph supplied by the project owner on 14/10/2026.
export const mikeProfile: CollaboratorProfile = {
  id: "mike",
  name: "Mike",
  siteRole: "Gerente de vendas",
  shortBio: "Mike faz parte da equipe da WifiConecta como gerente de vendas e assina os conteúdos do site.",
  fullBio: [],
  specialties: [],
  location: "",
  experienceSince: 0,
  profilePath: "/sobre#mike",
  image: {
    src: "/images/team/mike.webp",
    alt: "Mike, gerente de vendas da WifiConecta",
    width: 206,
    height: 206,
  },
  links: [
    { platform: "instagram", label: "Instagram · @mii_ke7", href: "https://www.instagram.com/mii_ke7/" },
    { platform: "facebook", label: "Facebook · Mike Rodrigues", href: "https://www.facebook.com/share/1DcqCCTa3n/" },
    { platform: "whatsapp", label: "WhatsApp · (11) 94884-4107", href: "https://wa.me/5511948844107" },
  ],
  reviewedByShort: "",
  expertBoxShort: "Gerente de vendas e integrante da equipe da WifiConecta. Assina os conteúdos do site.",
  aliases: ["Mike Rodrigues"],
};
