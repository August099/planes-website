import Link from "next/link";
import Image from "next/image";
import { ArrowRight } from "lucide-react";

// "¿Querés vender tu aeronave?" (VA-79, VA-84). Rediseño (25/10, v2): bloque partido a todo el ancho,
// el único gran plano rojo de la Home. Texto sobre rojo a la izquierda (blanco sobre #D62828: 4,9:1) y la
// foto entera a la derecha, con el corte diagonal de las "//" del logo. En celular, foto arriba.
export function SellerCta() {
  return (
    <section className="group relative isolate grid bg-[#D62828] md:min-h-[440px] md:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)]">
      <div className="order-2 flex flex-col justify-center gap-5 px-6 py-12 sm:px-12 md:order-1 lg:px-20">
        <h2 className="font-heading text-[2.4rem] leading-[0.92] font-black uppercase tracking-[-0.03em] text-white sm:text-[3.6rem] lg:text-[4.25rem]">
          ¿Querés vender tu aeronave?
        </h2>
        <p className="max-w-md text-base font-medium text-white sm:text-lg">Publicá en minutos y llegá a compradores de todo el país</p>
        <Link
          href="/register"
          className="inline-flex min-h-14 w-fit items-center gap-3 bg-[#00205B] px-8 text-base font-bold uppercase tracking-[0.06em] text-white transition-colors hover:bg-[#001331]"
        >
          Publicar mi avión
          <ArrowRight className="h-5 w-5 transition-transform duration-300 group-hover:translate-x-1" aria-hidden />
        </Link>
      </div>

      <div className="relative order-1 aspect-[16/10] md:order-2 md:aspect-auto">
        <Image
          src="/backgrounds/cta.webp"
          alt=""
          fill
          // VA-62: está lejos del primer pantallazo; sin priority no compite con el hero.
          sizes="(min-width: 768px) 50vw, 100vw"
          className="object-cover object-[center_60%]"
        />
        {/* Corte diagonal de la marca entre el rojo y la foto */}
        <div aria-hidden className="absolute inset-y-0 -left-px hidden w-28 bg-[#D62828] [clip-path:polygon(0_0,100%_0,0_100%)] md:block" />
        <div aria-hidden className="absolute inset-y-0 left-0 hidden w-36 bg-[#00205B] [clip-path:polygon(124px_0,138px_0,26px_100%,12px_100%)] md:block" />
      </div>
    </section>
  );
}
