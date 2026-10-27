import Link from "next/link";
import Image from "next/image";
import { DisplayTitle } from "@/components/ui/home/DisplayTitle";

// "Explorá por tipo de aeronave" (VA-86). Server component, sin JS de cliente. Ajuste del socio
// (10/10): en celular, grilla de 2 por fila (la séptima sola y centrada); imágenes y textos un 15 %
// más chicos que la primera versión. Correspondencia con AircraftCategory confirmada por el socio (10/10):
// Monomotor = MP + MT, Bimotor = BP + BT, Experimental / LSA = E, Agrícola = A,
// Helicóptero = H, Proyecto = PR, Otros = S/C. VA-149 (17/10): orden y nombre como en lib/aircraft-categories.ts.
// 27/10: renders nuevos del socio, todos a la misma escala (Proyecto ya no se achica); se generan con
// scripts/process-aircraft-types.mjs.
const TYPES = [
  {
    name: "Monomotor",
    image: "monomotor",
    width: 500,
    height: 214,
    categories: ["MP", "MT"],
  },
  {
    name: "Bimotor",
    image: "bimotor",
    width: 500,
    height: 198,
    categories: ["BP", "BT"],
  },
  {
    name: "Experimental / LSA",
    image: "experimental-lsa",
    width: 500,
    height: 171,
    categories: ["E"],
  },
  {
    name: "Agrícola",
    image: "agricola",
    width: 500,
    height: 177,
    categories: ["A"],
  },
  {
    name: "Helicóptero",
    image: "helicoptero",
    width: 500,
    height: 234,
    categories: ["H"],
  },
  {
    name: "Proyecto",
    image: "proyecto",
    width: 500,
    height: 182,
    categories: ["PR"],
  },
  {
    name: "Otros",
    image: "otros",
    width: 500,
    height: 216,
    categories: ["S/C"],
    // Ajustado (10/10): los turbohélices tienen categoría propia (MT y BT).
  },
];

const hrefFor = (categories: string[]) => `/aircraft?${categories.map((c) => `category=${encodeURIComponent(c)}`).join("&")}`;

export function AircraftTypesSection({ counts }: { counts: Record<string, number> }) {
  return (
    <section className="py-16 sm:py-20" aria-labelledby="aircraft-types-title">
      <div className="container mx-auto px-4">
        <DisplayTitle id="aircraft-types-title" align="center" className="mb-12">
          Explorá por tipo de aeronave
        </DisplayTitle>

        {/* Celular: 2 por fila y la última centrada. Desde md: 3 por fila; desde lg: 4 + 3 centradas,
            como la referencia. */}
        <ul className="flex flex-wrap justify-center gap-x-4 gap-y-10 md:gap-x-6 md:gap-y-12">
          {TYPES.map((type) => {
            const total = type.categories.reduce((sum, id) => sum + (counts[id] ?? 0), 0);
            return (
              <li key={type.name} className="w-[calc((100%-1rem)/2)] md:w-[calc((100%-3rem)/3)] lg:w-[calc((100%-4.5rem)/4)]">
                <Link
                  href={hrefFor(type.categories)}
                  className="group block rounded-md text-center outline-none focus-visible:ring-2 focus-visible:ring-[#D62828] focus-visible:ring-offset-4 focus-visible:ring-offset-transparent"
                >
                  {/* Caja de altura fija y la aeronave apoyada en la base, así los nombres quedan alineados. */}
                  <div className="relative mx-auto h-[4.25rem] w-[85%] transition-transform duration-200 ease-out group-hover:translate-x-1.5 group-focus-visible:translate-x-1.5 motion-reduce:transition-none motion-reduce:group-hover:translate-x-0 motion-reduce:group-focus-visible:translate-x-0 sm:h-[6.8rem] lg:h-[7.65rem]">
                    <Image
                      src={`/aircraft-types/${type.image}.webp`}
                      alt=""
                      fill
                      // En celular la caja mide ~35vw (85% de media columna): así baja la de 256 px y no la de 384.
                      sizes="(min-width: 1280px) 250px, (min-width: 1024px) 20vw, (min-width: 768px) 27vw, 35vw"
                      className="object-contain object-bottom"
                    />
                  </div>
                  <h3 className="mt-3 text-[0.95rem] leading-snug font-bold text-[#00205B] decoration-[#D62828] decoration-2 underline-offset-4 group-hover:underline group-focus-visible:underline">
                    {type.name}
                  </h3>
                  <p
                    className={`mt-2 text-[0.6rem] font-semibold uppercase tracking-[0.14em] tabular-nums ${
                      total > 0 ? "text-[#00205B]" : "text-slate-500"
                    }`}
                  >
                    {total > 0 ? `${total} ${total === 1 ? "aviso" : "avisos"}` : "Sin avisos por ahora"}
                  </p>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
