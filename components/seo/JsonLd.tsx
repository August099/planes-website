// Datos estructurados (schema.org). Se escapa "<" para que un texto cargado por un
// usuario (título, descripción) no pueda cerrar el <script> (recomendación de la guía de Next).
export function JsonLd({ data }: { data: Record<string, unknown> | Record<string, unknown>[] }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }}
    />
  );
}
