import Link from "next/link";
import Image from "next/image";
import { ArrowRight } from "lucide-react";

// "¿Querés vender tu aeronave?" (VA-79, VA-84). Rediseño (25/10, v2): bloque partido, el único gran plano
// rojo de la Home; texto sobre rojo (blanco sobre #D62828: 4,9:1) y la foto con el corte diagonal de las
// "//" del logo. Moderno (26/10): tarjeta redondeada dentro del contenedor, con sombra roja suave y las
// franjas diagonales que se desplazan. En celular, foto arriba.
export function SellerCta() {
  return (
    <section className="container mx-auto px-4 py-16 sm:py-20">
      <div className="group relative isolate grid overflow-hidden rounded-[32px] bg-[linear-gradient(135deg,#D62828_0%,#B71F1F_100%)] shadow-[0_30px_60px_-28px_rgb(183_31_31/0.7)] md:min-h-[440px] md:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)]">
        <div className="va-stripes relative order-2 flex flex-col justify-center gap-5 px-6 py-12 sm:px-12 md:order-1 lg:px-16">
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

        {/* La foto se recorta en diagonal: deja ver el degradé rojo de la tarjeta (las "//" del logo). */}
        <div className="relative order-1 aspect-[16/10] md:order-2 md:aspect-auto md:[clip-path:polygon(112px_0,100%_0,100%_100%,0_100%)]">
          <Image
            src="/backgrounds/cta.webp"
            alt=""
            fill
            // VA-62: está lejos del primer pantallazo; sin priority no compite con el hero.
            sizes="(min-width: 768px) 50vw, 100vw"
            className="object-cover object-[center_60%] transition-transform duration-[1200ms] ease-out group-hover:scale-[1.04]"
          />
          {/* Segunda barra de las "//", en azul */}
          <div aria-hidden className="absolute inset-y-0 left-0 hidden w-36 bg-[#00205B] [clip-path:polygon(124px_0,138px_0,26px_100%,12px_100%)] md:block" />
        </div>
      </div>
    </section>
  );
}
