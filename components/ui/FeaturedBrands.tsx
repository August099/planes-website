"use client";

import Link from "next/link";

export type BrandItem = {
  id: string;
  name: string;
  logoUrl?: string | null;
};

type FeaturedBrandsProps = {
  brands: BrandItem[];
};

export function FeaturedBrands({ brands }: FeaturedBrandsProps) {
  // FILTRO DINÁMICO: Solo marcas con logoUrl válido
  const brandsWithLogo = (brands || []).filter(
    (brand) => brand.logoUrl && brand.logoUrl.trim() !== ""
  );

  if (brandsWithLogo.length === 0) return null;

  // Duplicamos el array para lograr el loop continuo e infinito
  const repeatedBrands = [
    ...brandsWithLogo,
    ...brandsWithLogo,
    ...brandsWithLogo,
    ...brandsWithLogo,
  ];

  return (
    <section className="py-12 overflow-hidden border-y border-slate-200/60">
      {/* ANIMACIÓN INYECTADA DIRECTAMENTE PARA QUE SE MUEVA SIEMPRE */}
      <style jsx>{`
        @keyframes marqueeScroll {
          0% {
            transform: translateX(0%);
          }
          100% {
            transform: translateX(-50%);
          }
        }
        .animate-marquee-inline {
          display: flex;
          align-items: center;
          width: max-content;
          animation: marqueeScroll 60s linear infinite;
        }
        .animate-marquee-inline:hover {
          animation-play-state: paused;
        }
      `}</style>

      <div className="container mx-auto px-4 mb-6 text-center">
        <h2 className="text-xl sm:text-2xl font-bold text-[#001F58] tracking-tight">
          Explorá por Fabricante
        </h2>
      </div>

      {/* CONTENEDOR MÓVIL */}
      <div className="relative w-full flex overflow-hidden py-4">
        {/* DEGRADADOS LATERALES DE SUAVIZADO */}
        <div className="absolute left-0 inset-y-0 w-16 sm:w-24 bg-gradient-to-r from-[#FAF5F5] to-transparent z-10 pointer-events-none" />
        <div className="absolute right-0 inset-y-0 w-16 sm:w-24 bg-gradient-to-l from-[#FAF5F5] to-transparent z-10 pointer-events-none" />

        {/* PISTA DE MARQUESINA */}
        <div className="animate-marquee-inline">
          {repeatedBrands.map((brand, index) => (
            <Link
              key={`${brand.id}-${index}`}
              href={`/planes?brand=${encodeURIComponent(brand.id)}&page=1`}
              className="flex items-center justify-center mx-6 sm:mx-10 w-28 sm:w-36 h-16 sm:h-20 transition-transform duration-300 hover:scale-110 shrink-0 cursor-pointer overflow-visible"
            >
              <div className="relative w-full h-full flex items-center justify-center">
                <img
                  src={brand.logoUrl!}
                  alt={brand.name}
                  className="max-w-full max-h-full object-contain filter grayscale opacity-75 hover:grayscale-0 hover:opacity-100 transition-all duration-300"
                />
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}