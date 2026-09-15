"use client";

import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";

export function SellerCta() {
  return (
    <section className="relative w-full overflow-hidden">
      <div className="relative w-full h-[280px] sm:h-[320px] md:h-[360px] flex items-center justify-center">
        <Image
          src="/bkg-cta.png"
          alt="Fondo CTA Vender Aeronave"
          fill
          priority
          className="object-cover object-[center_60%]"
        />

        <div className="absolute inset-0 bg-black/20" />

        <div className="relative z-10 container mx-auto px-4 flex flex-col items-center text-center space-y-3 sm:space-y-4 max-w-3xl">
          <div className="bg-[#001F58]/90 backdrop-blur-sm px-6 py-2.5 sm:px-8 sm:py-3 rounded-2xl shadow-lg border border-white/10">
            <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-white tracking-tight">
              ¿Queres vender tu aeronave?
            </h2>
          </div>

          <p className="text-white text-sm sm:text-base md:text-lg font-medium drop-shadow-md max-w-xl">
            Publica en minutos y llega a compradores de todo el país
          </p>

          <div className="pt-1">
            <Link href="/register">
              <Button
                size="lg"
                className="bg-[#D92D20] hover:bg-[#B42318] text-white text-base sm:text-lg font-bold px-8 py-6 rounded-2xl shadow-xl transition-transform active:scale-95 border-0 cursor-pointer"
              >
                Publicar mi avion
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}