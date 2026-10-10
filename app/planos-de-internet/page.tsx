import { EditorialSiloHub, editorialHubMetadata } from "@/components/telecom/EditorialSiloHub";

export const revalidate = 3600;
export const generateMetadata = () => editorialHubMetadata("planos-de-internet");
export default function Page() { return <EditorialSiloHub slug="planos-de-internet" />; }
