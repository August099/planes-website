import Link from "next/link";
import { RepublishButton } from "@/components/ui/profile/RepublishControls";
import type { RepublishView } from "@/lib/republish";

// VA-167: en el detalle de un aviso propio y activo, una franja con "Republicar" (Base y Pro) o el link a
// "Republicar todas" del perfil (Broker y admins). No se imprime en el PDF.
export function OwnerRepublishBar({ view, id, kind, profileHref }: { view: RepublishView; id: string; kind: "AIRCRAFT" | "SPARE_PART"; profileHref: string }) {
  if (view.mode === "NONE") return null;
  // Durante la espera no hay nada para hacer desde acá: la franja no se muestra (VA-178).
  if (view.mode === "COUNT" && view.waiting[id]) return null;
  if (view.mode === "ALL" && view.availableAt) return null;
  return (
    <div className="border-b border-[#001F58]/10 bg-white print:hidden">
      <div className="container mx-auto flex flex-wrap items-center justify-between gap-2 px-4 py-2 text-xs text-slate-600">
        <span>
          <span className="font-semibold text-[#001F58]">Es tu aviso.</span> Republicalo para que vuelva primero en Últimas publicaciones.
        </span>
        {view.mode === "COUNT" ? (
          <RepublishButton
            view={view}
            id={id}
            kind={kind}
            className="inline-flex min-h-9 items-center gap-1.5 rounded-md border border-[#001F58]/20 px-3 text-xs font-semibold text-[#001F58] hover:border-[#001F58] disabled:opacity-50 cursor-pointer"
          />
        ) : (
          <Link href={profileHref} className="font-semibold text-[#001F58] underline underline-offset-2 hover:text-[#E70F1F]">
            Republicar todas desde tu perfil
          </Link>
        )}
      </div>
    </div>
  );
}
