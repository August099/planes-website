"use client";

import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";

// "¿Querés vender tu aeronave?" (VA-79, opción b): banner redondeado que flota sobre el degradé de
// la Home, en vez de una imagen a todo el ancho que cortaba el fondo. Detrás del banner, la zona
// pasa de clara a oscura (app/globals.css, .home-zone-3), así ese cambio no se ve como una franja.
export function SellerCta() {
  return (
    <section className="container mx-auto px-4">
      <div className="relative isolate overflow-hidden rounded-3xl bg-gradient-to-br from-[#001F58] to-[#0A4C96] px-6 py-12 text-center shadow-[0_30px_60px_-30px_rgb(0_19_49/0.65)] ring-1 ring-white/10 sm:px-12 sm:py-16">
        {/* Imagen sutil de fondo (la misma de antes, ya en WebP) */}
        <Image
          src="/backgrounds/cta.webp"
          alt=""
          fill
          // VA-62: está lejos del primer pantallazo; sin priority no compite con el hero.
          sizes="(min-width: 1280px) 1248px, 100vw"
          className="-z-20 object-cover object-[center_60%] opacity-30"
        />
        {/* Velo azul para que el texto blanco tenga contraste en todo el banner */}
        <div aria-hidden className="absolute inset-0 -z-10 bg-gradient-to-br from-[#001F58]/85 via-[#001F58]/70 to-[#0A4C96]/75" />
        {/* Acento rojo de marca */}
        <div aria-hidden className="absolute inset-y-0 left-0 w-1.5 bg-[#E70F1F]" />

        <div className="mx-auto flex max-w-3xl flex-col items-center space-y-3 sm:space-y-4">
          <h2 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
            <span aria-hidden className="mr-2 inline-block font-black tracking-tighter text-[#FF5A64]">
              {"//"}
            </span>
            ¿Querés vender tu aeronave?
          </h2>

          <p className="max-w-xl text-sm font-medium text-white/90 sm:text-base md:text-lg">
            Publicá en minutos y llegá a compradores de todo el país
          </p>

          <div className="pt-1">
            <Link href="/register">
              <Button
                size="lg"
                className="cursor-pointer rounded-2xl border-0 bg-[#E70F1F] px-8 py-6 text-base font-bold text-white shadow-xl transition-transform hover:bg-[#C20D1A] active:scale-95 sm:text-lg"
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
