import { requireAdminSession } from "@/lib/admin/auth";
import { buildWhatsAppInquiry, buildWhatsAppUrl, resolveWhatsAppPhone } from "@/lib/telecom/whatsapp";
import { SITE_WHATSAPP_PHONE } from "@/lib/site";
export const dynamic = "force-dynamic";
export const metadata = { title: "Atendimento comercial", robots: { index: false, follow: false } };
export default async function Page() {
  await requireAdminSession();
  const phone = resolveWhatsAppPhone(process.env.WIFICONECTA_WHATSAPP, SITE_WHATSAPP_PHONE);
  const url = buildWhatsAppUrl(phone, buildWhatsAppInquiry(""));
  return (
    <div className="space-y-4">
      <div className="admin-pane p-4">
        <h2 className="text-lg font-semibold">ATENDIMENTO COMERCIAL</h2>
        <p className="mt-2 text-sm text-(--muted)">Os pacotes, preços e benefícios são apresentados exclusivamente na conversa pelo WhatsApp.</p>
      </div>
      <div className="admin-pane space-y-3 p-4 text-sm">
        <p><strong>Região atual:</strong> São Paulo, por enquanto.</p>
        <p><strong>Canal:</strong> WhatsApp (11) 94884-4107.</p>
        <p>O site não cadastra planos fixos nem recebe consultas por formulário. Promoções temporárias e condições por bairro devem ser verificadas no atendimento.</p>
        {url ? <a className="admin-button" href={url} target="_blank" rel="noopener noreferrer">Abrir canal de atendimento</a> : <p role="alert">Configure WIFICONECTA_WHATSAPP para ativar o canal.</p>}
      </div>
      <div className="admin-pane p-4 text-sm text-(--muted)">Registros comerciais anteriores permanecem privados no banco, sem alimentar as páginas públicas. O editor e os silos continuam disponíveis para preparar os conteúdos do blog.</div>
    </div>
  );
}
