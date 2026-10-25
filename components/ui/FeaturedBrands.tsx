// Server component (VA-79): la marquesina es solo CSS (keyframes "marquee" en app/globals.css),
// así no suma JS al cliente.
import Link from "next/link";
import Image from "next/image";
import { SectionTitle } from "@/components/ui/home/SectionTitle";

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
    <section className="py-12 overflow-hidden">

      <div className="container mx-auto px-4 mb-6">
        <SectionTitle>Explorá por Fabricante</SectionTitle>
      </div>

      {/* CONTENEDOR MÓVIL */}
      {/* VA-79: los bordes se esfuman con una máscara (antes, degradés con #FAF5F5 fijo), así funciona
          sobre cualquier fondo. */}
      <div className="relative w-full flex overflow-hidden py-4 [mask-image:linear-gradient(to_right,transparent,black_4rem,black_calc(100%-4rem),transparent)] sm:[mask-image:linear-gradient(to_right,transparent,black_6rem,black_calc(100%-6rem),transparent)]">

        {/* PISTA DE MARQUESINA */}
        <div className="flex w-max items-center animate-[marquee_60s_linear_infinite] hover:[animation-play-state:paused]">
          {repeatedBrands.map((brand, index) => {
            // Las copias (para el loop de la marquesina) son decorativas: fuera del orden de
            // tabulación y ocultas para lectores de pantalla.
            const isCopy = index >= brandsWithLogo.length;
            return (
            <Link
              key={`${brand.id}-${index}`}
              href={`/aircraft?brand=${encodeURIComponent(brand.id)}&page=1`}
              aria-hidden={isCopy || undefined}
              tabIndex={isCopy ? -1 : undefined}
              className="flex items-center justify-center mx-6 sm:mx-10 w-28 sm:w-36 h-16 sm:h-20 transition-transform duration-300 hover:scale-110 shrink-0 cursor-pointer overflow-visible"
            >
              <div className="relative w-full h-full flex items-center justify-center">
                {/* VA-73: next/image con tamaño fijo chico (antes <img> directo a Supabase, en tamaño
                    original y sin lazy). Tamaño fijo y no "fill": el srcset queda en 1x/2x en vez de
                    ~8 anchos (son 44 imágenes con las copias). Las copias reutilizan la misma URL. */}
                <Image
                  src={brand.logoUrl!}
                  alt={isCopy ? "" : brand.name}
                  width={144}
                  height={80}
                  loading="lazy"
                  className="max-w-full max-h-full w-auto h-auto object-contain filter grayscale opacity-75 hover:grayscale-0 hover:opacity-100 transition-all duration-300"
                />
              </div>
            </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}