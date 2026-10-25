import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";

// "¿Querés vender tu aeronave?" (VA-79 opción b, VA-84): banner dentro del contenedor que flota sobre
// el degradé de la Home. VA-84: la foto se ve entera; el velo azul solo cubre el lado del texto
// (abajo en celular, a la izquierda desde md), lo justo para que el texto blanco cumpla AA.
export function SellerCta() {
  return (
    <section className="container mx-auto px-4">
      <div className="relative isolate flex min-h-[340px] items-end overflow-hidden rounded-md bg-[#00205B] ring-1 ring-white/10 md:min-h-[380px] md:items-center">
        <Image
          src="/backgrounds/cta.webp"
          alt=""
          fill
          // VA-62: está lejos del primer pantallazo; sin priority no compite con el hero.
          sizes="(min-width: 1280px) 1248px, 100vw"
          className="-z-20 object-cover object-[center_60%]"
        />
        {/* Velo solo detrás del texto */}
        <div
          aria-hidden
          className="absolute inset-0 -z-10 bg-gradient-to-t from-[#00205B]/95 via-[#00205B]/80 to-[#00205B]/10 md:bg-gradient-to-r md:from-[#00205B]/95 md:via-[#00205B]/80 md:via-50% md:to-[#00205B]/0 md:to-80%"
        />
        {/* Acento rojo de marca */}
        <div aria-hidden className="absolute inset-y-0 left-0 w-1.5 bg-[#D62828]" />

        <div className="flex max-w-xl flex-col items-start space-y-3 px-6 py-8 sm:space-y-4 sm:px-10 md:py-12">
          <h2 className="text-[1.9rem] leading-[1.08] font-extrabold tracking-[-0.02em] text-white sm:text-[2.35rem]">
            ¿Querés vender tu aeronave?
          </h2>

          <p className="text-sm font-medium text-white/90 sm:text-base md:text-lg">
            Publicá en minutos y llegá a compradores de todo el país
          </p>

          <div className="pt-1">
            <Link href="/register">
              <Button
                size="lg"
                className="cursor-pointer rounded-md border-0 bg-[#D62828] px-8 py-6 text-base font-bold text-white transition-colors hover:bg-[#B71F1F] sm:text-lg"
              >
                Publicar mi avión
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
