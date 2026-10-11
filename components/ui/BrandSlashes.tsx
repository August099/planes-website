// Motivo "//" de la marca (las barras del logo), en SVG inline y muy tenue (VA-79 / VA-83).
// Se usa en la zona oscura de la Home y en el footer. El contenedor necesita `relative isolate`.
// Siempre con la misma orientación que el logo del header ("//", inclinadas a la derecha): no
// espejarlas con -scale-x-100 (VA-87 B, quedaban como "\\").
export function BrandSlashes({ className = "" }: { className?: string }) {
  return (
    <svg aria-hidden viewBox="0 0 400 160" fill="none" className={`brand-slashes ${className}`}>
      <path d="M150 4h120L126 156H6z" stroke="currentColor" strokeWidth="8" />
      <path d="M300 4h60L216 156h-60z" stroke="currentColor" strokeWidth="8" />
    </svg>
  );
}
