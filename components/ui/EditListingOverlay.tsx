import Link from "next/link";
import { Pencil } from "lucide-react";

// 31/10 (socio): en el perfil propio, editar tiene que ser lo más evidente. Con mouse, la foto entera se
// oscurece y lleva a editar; en pantallas táctiles (sin hover) queda solo el botón, siempre visible, y
// tocar el resto de la foto sigue abriendo el aviso. Va dentro de la tarjeta, encima del área de la foto.
export function EditListingOverlay({ href, title }: { href: string; title: string }) {
  return (
    <Link
      href={href}
      aria-label={`Editar ${title}`}
      className="group/edit absolute inset-x-0 top-0 z-20 flex aspect-[16/10] items-end p-2.5 transition-colors [@media(hover:hover)]:items-center [@media(hover:hover)]:justify-center [@media(hover:hover)]:hover:bg-[#00205B]/45 [@media(hover:none)]:pointer-events-none"
    >
      <span className="pointer-events-auto inline-flex min-h-9 items-center gap-1.5 rounded-full bg-white px-3.5 text-xs font-bold text-[#00205B] shadow-md transition-opacity [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover/edit:opacity-100 [@media(hover:hover)]:group-focus-visible/edit:opacity-100">
        <Pencil className="h-3.5 w-3.5" aria-hidden />
        Editar
      </span>
    </Link>
  );
}
