import { servicePages } from "@/lib/telecom/catalog";
import { Breadcrumb, ContractProcess, FinalCTA, RegionNotice } from "./Shared";
import { WhatsAppCTA } from "./WhatsAppCTA";

export function ServiceLanding({ slug }: { slug: string }) {
  const page = servicePages[slug];
  return (
    <>
      <div className="wifi-page-tint">
        <div className="wifi-container">
          <Breadcrumb items={[{ label: page.eyebrow, href: `/${slug}` }]} />
          <div className="wifi-page-intro">
            <p className="wifi-eyebrow">{page.eyebrow}</p>
            <h1>{page.title}</h1>
            <p>{page.description}</p>
            <div className="wifi-page-actions">
              <WhatsAppCTA source="service-page" interest={page.eyebrow} label="Consultar pacotes no WhatsApp" />
            </div>
          </div>
        </div>
      </div>
      <section className="wifi-section wifi-container">
        <RegionNotice />
        <div className="wifi-section-heading">
          <div><p className="wifi-eyebrow">Antes de escolher</p><h2>Conte o que faz diferença pra você.</h2></div>
        </div>
        <div className="wifi-considerations">
          {page.considerations.map(([title, text]) => <div key={title}><h3>{title}</h3><p>{text}</p></div>)}
        </div>
      </section>
      <ContractProcess />
      <FinalCTA />
    </>
  );
}
