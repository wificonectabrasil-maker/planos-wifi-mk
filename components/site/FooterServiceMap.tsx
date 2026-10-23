import { brandConfig } from "@/brand.config";
import { GoogleMapsLink } from "./GoogleMapsLink";

// Regional viewport centered on São Paulo city, not the business's physical location.
const saoPauloRegionMap = "https://www.google.com/maps/embed?origin=mfe&pb=!1m11!1m8!1m3!1d936319.683403878!2d-46.633308!3d-23.55052!3m2!1i1024!2i768!4f13.1!5e0!6i9!3m1!1spt-BR!5m1!1spt-BR";

export function FooterServiceMap() {
  if (!brandConfig.googleMapsUrl) return null;

  return (
    <section className="wifi-footer-map" aria-label="Área de atendimento da WifiConecta">
      <div className="wifi-footer-map-copy">
        <h2>WifiConecta em São Paulo</h2>
        <p>Atendimento pelo WhatsApp na capital e em outras cidades do estado. Opções e disponibilidade confirmadas para cada endereço.</p>
        <GoogleMapsLink label="Ver no Google Maps" />
      </div>
      <iframe
        src={saoPauloRegionMap}
        title="Mapa da região de São Paulo — atendimento remoto da WifiConecta"
        width="480"
        height="230"
        loading="lazy"
        referrerPolicy="strict-origin-when-cross-origin"
        allowFullScreen
      />
    </section>
  );
}
