import { permanentRedirect } from "next/navigation";
import { wifiEditorialSilos } from "@/lib/telecom/editorial-plan";

export default function Page() {
  permanentRedirect(wifiEditorialSilos[0].path);
}
