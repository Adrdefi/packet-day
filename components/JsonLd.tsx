// Renders a JSON-LD <script> tag the way Next.js's own App Router guide
// recommends: JSON.stringify the data, then escape "<" so a literal
// "</script>" inside any field value can't prematurely close the tag.
export default function JsonLd({ data }: { data: object }) {
  const json = JSON.stringify(data).replace(/</g, "\\u003c");
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: json }}
    />
  );
}
