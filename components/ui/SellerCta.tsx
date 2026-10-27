import Link from "next/link";
import Image from "next/image";
import { ArrowRight } from "lucide-react";

// "¿Querés vender tu aeronave?" (VA-79, VA-84). Rediseño (25/10, v2): bloque partido, el único gran plano
// rojo de la Home; texto sobre rojo (blanco sobre #D62828: 4,9:1) y la foto, con el rojo entrando en diagonal a 45°. Moderno (26/10): tarjeta redondeada dentro del contenedor, rojo liso y sombra roja suave.
// En celular, foto arriba.
export function SellerCta() {
  return (
    <section className="container mx-auto px-4 py-16 sm:py-20">
      <div className="group relative isolate grid overflow-hidden rounded-[32px] bg-[#D62828] shadow-[0_30px_60px_-28px_rgb(183_31_31/0.7)] md:min-h-[440px] md:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
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

        <div className="relative order-1 aspect-[16/10] overflow-hidden md:order-2 md:aspect-auto">
          <Image
            src="/backgrounds/cta.webp"
            alt=""
            fill
            // VA-62: está lejos del primer pantallazo; sin priority no compite con el hero.
            sizes="(min-width: 768px) 50vw, 100vw"
            className="object-cover object-[center_60%] transition-transform duration-[1200ms] ease-out group-hover:scale-[1.04]"
          />
          {/* 27/10: el rojo termina en una diagonal a 45° (el SVG es tan alto como la foto y su ancho sale del
              viewBox, así el ángulo no depende del tamaño) y le sigue una franja azul paralela, como las // del logo. */}
          <svg aria-hidden viewBox="0 0 118 100" preserveAspectRatio="xMinYMin meet" className="pointer-events-none absolute inset-y-0 -left-px hidden h-full aspect-[118/100] md:block">
            <polygon points="0,0 100,0 0,100" fill="#D62828" />
            <polygon points="106,0 118,0 18,100 6,100" fill="#00205B" />
          </svg>
        </div>
      </div>
    </section>
  );
}
