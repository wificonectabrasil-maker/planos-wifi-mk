export function normalizeWhatsAppPhone(value: string | null | undefined) {
  let phone = (value || "").replace(/\D/g, "");
  if (/^[1-9]\d{9,10}$/.test(phone)) phone = `55${phone}`;
  return /^55[1-9]\d{9,10}$/.test(phone) ? phone : null;
}

export function resolveWhatsAppPhone(
  configuredPhone: string | null | undefined,
  brandPhone: string | null | undefined,
) {
  return normalizeWhatsAppPhone(configuredPhone) || normalizeWhatsAppPhone(brandPhone);
}

export function buildWhatsAppUrl(
  phone: string | null | undefined,
  message: string,
) {
  const normalized = normalizeWhatsAppPhone(phone);
  return normalized
    ? `https://wa.me/${normalized}?text=${encodeURIComponent(message)}`
    : null;
}

export function buildWhatsAppInquiry(
  interest = "Internet, celular, TV ou combos",
) {
  const context = interest
    .replace(/[\r\n]+/g, " ")
    .trim()
    .slice(0, 240);
  return [
    "Olá! Vim pelo site da WifiConecta e quero consultar promoções, vantagens e pacotes.",
    "Busco atendimento em São Paulo.",
    `Tenho interesse em: ${context || "ajuda para escolher um plano"}.`,
    "Podem me ajudar a encontrar um pacote adequado à minha rotina e conferir as opções e condições para meu endereço?",
  ].join("\n");
}
