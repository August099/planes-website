import Link from "next/link";

// VA-152: aviso corto del cupo Gratis ("Publicá gratis 1 avión y 3 repuestos. Sin vencimiento.", el cupo del plan Base) para
// registro, cómo publicar y planes. El texto lo arma la página con el cupo del admin (lib/promo.ts).
export function FreeQuotaNote({ text, className = "", showLink = false }: { text: string; className?: string; showLink?: boolean }) {
  return (
    <p className={`border-l-2 border-[#E70F1F] pl-3 text-sm text-slate-700 ${className}`}>
      <span className="font-semibold text-[#001F58]">{text}</span>
      {showLink && (
        <>
          {" "}
          <Link href="/register" className="font-semibold text-[#E70F1F] hover:underline">
            Crear cuenta
          </Link>
        </>
      )}
    </p>
  );
}
