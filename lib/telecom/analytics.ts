export type ConversionEvent =
  | "coverage_started"
  | "coverage_submitted"
  | "plan_viewed"
  | "plan_selected"
  | "compare_started"
  | "whatsapp_clicked"
  | "lead_submitted";
export function trackConversion(
  event: ConversionEvent,
  properties: Record<string, string | number> = {},
) {
  if (typeof window === "undefined") return;
  // No CEP, address, name or phone in analytics. A consented analytics adapter can listen to this event.
  window.dispatchEvent(
    new CustomEvent("wificonecta:conversion", {
      detail: { event, ...properties },
    }),
  );
}
