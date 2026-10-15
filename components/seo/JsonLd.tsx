export function JsonLd({ data }: { data: Record<string, unknown> | Array<Record<string, unknown>> }) {
  // A literal </script> inside CMS text must never close this script element.
  const json = JSON.stringify(data).replace(/</g, "\\u003c");
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: json }} />;
}
