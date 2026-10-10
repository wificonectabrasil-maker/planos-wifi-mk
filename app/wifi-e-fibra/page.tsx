import { EditorialSiloHub, editorialHubMetadata } from "@/components/telecom/EditorialSiloHub";
export const revalidate = 3600;
export const generateMetadata = () => editorialHubMetadata("wifi-e-fibra");
export default function Page() { return <EditorialSiloHub slug="wifi-e-fibra" />; }
