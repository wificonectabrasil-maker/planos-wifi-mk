import { NextResponse } from "next/server";
function retiredCapture() {
  return NextResponse.json(
    { error: "O atendimento da WifiConecta é exclusivamente pelo WhatsApp. Consulte o canal na página de contato." },
    { status: 410, headers: { "Cache-Control": "no-store" } },
  );
}
export const GET = retiredCapture;
export const POST = retiredCapture;
