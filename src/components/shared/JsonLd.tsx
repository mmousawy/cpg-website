/**
 * Renders JSON-LD structured data as a script tag.
 * Use for schema.org markup to enable rich results in search engines.
 */
export default function JsonLd({ data }: { data: object | object[] }) {
  const json = Array.isArray(data) ? data : [data];
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(json.length === 1 ? json[0] : json),
      }}
    />
  );
}
