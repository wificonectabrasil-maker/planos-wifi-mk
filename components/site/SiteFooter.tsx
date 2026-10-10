import Link from "next/link";
import { Wifi } from "lucide-react";
import type { SiteHeaderLink } from "./SiteHeader";
import { commercialLinks } from "@/lib/telecom/navigation";
import { WhatsAppCTA } from "@/components/telecom/WhatsAppCTA";
export function SiteFooter(_props: { links?: SiteHeaderLink[] }) {
  return (
    <footer className="wifi-footer">
      <div className="wifi-container">
        <div className="wifi-footer-grid">
          <div>
            <Link prefetch={false} href="/" className="wifi-logo">
              <span className="wifi-logo-symbol">
                <Wifi size={26} />
              </span>
              <span>
                Wifi<span>Conecta</span>
              </span>
            </Link>
            <p>
              Seu pedido de internet, mais simples.
              <br />
              Uma pessoa pra ajudar você.
            </p>
            <p className="wifi-footer-small">
              A equipe explica as opções e ajuda a encaminhar o serviço que
              você escolher. Atendimento pelo WhatsApp.
            </p>
          </div>
          <div>
            <h2>Encontre seu plano</h2>
            {commercialLinks.slice(0, 5).map((l) => (
              <Link prefetch={false} key={l.href} href={l.href}>
                {l.label}
              </Link>
            ))}
          </div>
          <div>
            <h2>Escolha com clareza</h2>
            <Link prefetch={false} href="/planos-de-internet">Planos e contratação</Link>
            <Link prefetch={false} href="/wifi-e-fibra">Wi-Fi e fibra óptica</Link>
            <Link prefetch={false} href="/planos">Pacotes e promoções</Link>
            <WhatsAppCTA source="footer-help" variant="link" label="Consultar no WhatsApp" />
          </div>
          <div>
            <h2>WifiConecta</h2>
            <Link prefetch={false} href="/sobre">Sobre o projeto</Link>
            <Link prefetch={false} href="/contato">Contato</Link>
            <WhatsAppCTA
              source="footer"
              variant="link"
              label="Promoções no WhatsApp"
            />
            <Link prefetch={false} href="/politica-de-privacidade">Privacidade</Link>
            <Link prefetch={false} href="/politica-editorial">Política editorial</Link>
            <Link prefetch={false} href="/politica-de-afiliados">Transparência comercial</Link>
          </div>
        </div>
        <div className="wifi-footer-bottom">
          <span>© {new Date().getFullYear()} WifiConecta.</span>
          <p>
            Plataforma independente. Claro, Vivo, TIM e demais marcas pertencem
            aos respectivos titulares. Sua presença no site não implica vínculo
            oficial ou disponibilidade de oferta. Atendimento em São Paulo por enquanto.
            Promoções, valores e benefícios variam por bairro e são apresentados no WhatsApp.
          </p>
        </div>
      </div>
    </footer>
  );
}
