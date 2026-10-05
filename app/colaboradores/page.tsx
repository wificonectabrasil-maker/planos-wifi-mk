import { brandConfig } from "@/brand.config";
export const metadata = {title: "Colaboradores"};
export default function Page() {return <article className="space-y-6"><h1 className="text-3xl font-semibold">Colaboradores</h1>{brandConfig.collaborators.length ? brandConfig.collaborators.map(person => <section key={person.id}><h2 className="text-xl font-semibold">{person.name}</h2><p>{person.shortBio}</p>{person.fullBio.map((text,i) => <p key={i}>{text}</p>)}</section>) : <p>A equipe será apresentada pelo responsável pelo projeto.</p>}</article>;}
