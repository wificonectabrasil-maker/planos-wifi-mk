import { brandConfig } from "@/brand.config";
import { telecomMetadata } from "@/lib/telecom/metadata";

export const metadata = telecomMetadata(
  "Equipe e colaboradores",
  "Conheça as pessoas responsáveis pelos conteúdos da WifiConecta e seus perfis profissionais.",
  "/colaboradores",
);
export default function Page() {return <article className="space-y-6"><h1 className="text-3xl font-semibold">Colaboradores</h1>{brandConfig.collaborators.length ? brandConfig.collaborators.map(person => <section key={person.id}><h2 className="text-xl font-semibold">{person.name}</h2><p>{person.shortBio}</p>{person.fullBio.map((text,i) => <p key={i}>{text}</p>)}</section>) : <p>A equipe será apresentada pelo responsável pelo projeto.</p>}</article>;}
