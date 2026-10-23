import { MapPin } from "lucide-react";
import { brandConfig } from "@/brand.config";

export function GoogleMapsLink({
  label = "Ver nosso perfil no Google Maps",
  className = "",
}: { label?: string; className?: string }) {
  if (!brandConfig.googleMapsUrl) return null;

  return (
    <a
      href={brandConfig.googleMapsUrl}
      target="_blank"
      rel="noopener noreferrer"
      className={`wifi-maps-link ${className}`.trim()}
      aria-label={`${label} (abre em nova aba)`}
    >
      <MapPin size={18} aria-hidden="true" />
      <span>{label}</span>
    </a>
  );
}
