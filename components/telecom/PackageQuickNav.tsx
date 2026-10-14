import Link from "next/link";

const interests = [
  ["Só internet", "internet-residencial"],
  ["Internet + celular", "internet-celular"],
  ["TV e streaming", "tv-streaming"],
  ["Internet + câmera", "internet-camera"],
] as const;

export function PackageQuickNav() {
  return <nav className="wifi-package-shortcuts wifi-container" aria-label="Escolha o tipo de pacote">
    <p>Vá direto ao que você procura</p>
    <div>{interests.map(([label, id]) => <Link prefetch={false} href={"#" + id} key={id}>{label}</Link>)}</div>
  </nav>;
}
