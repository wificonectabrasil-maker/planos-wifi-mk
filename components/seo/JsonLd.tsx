export function JsonLd({ data }: { data: Record<string, any> | Array<Record<string, any>> }) {
  const json = JSON.stringify(data);
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: json }} />;
}
