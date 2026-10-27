import Link from "next/link";
import Image from "next/image";
import { ArrowRight } from "lucide-react";
import { LogoSlashes } from "@/components/ui/LogoSlashes";

// "¿Querés vender tu aeronave?" (VA-79, VA-84). Rediseño (25/10, v2): bloque partido, el único gran plano
// rojo de la Home; texto sobre rojo (blanco sobre #D62828: 4,9:1), la foto y las "//" del logo en el borde. Moderno (26/10): tarjeta redondeada dentro del contenedor, rojo liso y sombra roja suave.
// En celular, foto arriba.
export function SellerCta() {
  return (
    <section className="container mx-auto px-4 py-16 sm:py-20">
      <div className="group relative isolate grid overflow-hidden rounded-[32px] bg-[#D62828] shadow-[0_30px_60px_-28px_rgb(183_31_31/0.7)] md:min-h-[440px] md:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)]">
        <div className="relative order-2 flex flex-col justify-center gap-5 px-6 py-12 sm:px-12 md:order-1 lg:px-16">
          <h2 className="font-heading text-[2.4rem] leading-[0.95] font-extrabold tracking-[-0.035em] text-white sm:text-[3.4rem] lg:text-[4rem]">
            ¿Querés vender tu aeronave?
          </h2>
          <p className="max-w-md text-base font-medium text-white sm:text-lg">Publicá en minutos y llegá a compradores de todo el país</p>
          <Link
            href="/register"
            className="inline-flex min-h-14 w-fit items-center gap-3 rounded-full bg-white pl-7 pr-2 text-base font-bold text-[#B71F1F] shadow-lg transition-transform duration-300 hover:scale-[1.03]"
          >
            Publicar mi avión
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#00205B] text-white">
              <ArrowRight className="h-5 w-5 transition-transform duration-300 group-hover:translate-x-0.5" aria-hidden />
            </span>
          </Link>
        </div>

        <div className="relative order-1 aspect-[16/10] md:order-2 md:aspect-auto">
          <Image
            src="/backgrounds/cta.webp"
            alt=""
            fill
            // VA-62: está lejos del primer pantallazo; sin priority no compite con el hero.
            sizes="(min-width: 768px) 50vw, 100vw"
            className="object-cover object-[center_60%] transition-transform duration-[1200ms] ease-out group-hover:scale-[1.04]"
          />
        </div>
        {/* 27/10: las "//" del logo con sus proporciones reales (LogoSlashes), montadas sobre el borde entre el
            rojo y la foto: la barra ancha en rojo y la fina en azul. Reemplaza el corte diagonal, que no las respetaba. */}
        <LogoSlashes
          wide="#D62828"
          thin="#00205B"
          className="pointer-events-none absolute left-[51.2%] top-1/2 z-10 hidden h-24 -translate-x-[30%] -translate-y-1/2 md:block lg:h-28"
        />
      </div>
    </section>
  );
}
