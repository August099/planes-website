import Link from "next/link";
import Image from "next/image";
import { SectionTitle } from "@/components/ui/home/SectionTitle";

// "Explorá por tipo de aeronave" (VA-86). Server component: el carrusel de celular es CSS puro
// (scroll-snap), no suma JS. Correspondencia con AircraftCategory confirmada por el socio (10/10):
// Monomotor = MP + MT, Bimotor = BP + BT, Experimental / Avión ligero = E, Agrícola = A,
// Helicóptero = H, Proyecto = PR, Otros = S/C.
const TYPES = [
  {
    name: "Monomotor",
    image: "monomotor",
    width: 402,
    height: 158,
    categories: ["MP", "MT"],
    description: "Un motor a pistón, de ala alta o baja. El avión privado por excelencia.",
  },
  {
    name: "Bimotor",
    image: "bimotor",
    width: 386,
    height: 166,
    categories: ["BP", "BT"],
    description: "Dos motores para viajar más lejos, más rápido y con más redundancia.",
  },
  {
    name: "Agrícola",
    image: "agricola",
    width: 396,
    height: 147,
    categories: ["A"],
    description: "Aeroaplicadores listos para trabajar, con su equipo de aplicación.",
  },
  {
    name: "Helicóptero",
    image: "helicoptero",
    width: 372,
    height: 171,
    categories: ["H"],
    description: "Helicópteros civiles para trabajo aéreo, traslados y uso privado.",
  },
  {
    name: "Experimental / Avión ligero",
    image: "avion-ligero",
    width: 417,
    height: 147,
    categories: ["E"],
    description: "Livianos y económicos de operar, ideales para instrucción y recreación.",
  },
  {
    name: "Proyecto",
    image: "proyecto",
    width: 308,
    height: 146,
    categories: ["PR"],
    description: "En restauración, fuera de servicio o incompletos, para ponerlos de nuevo en el aire.",
  },
  {
    name: "Otros",
    image: "otros",
    width: 435,
    height: 162,
    categories: ["S/C"],
    // Ajustado (10/10): los turbohélices tienen categoría propia (MT y BT).
    description: "Jets y todo lo que no entra en las categorías anteriores.",
  },
];

const hrefFor = (categories: string[]) => `/planes?${categories.map((c) => `category=${encodeURIComponent(c)}`).join("&")}`;

export function AircraftTypesSection({ counts }: { counts: Record<string, number> }) {
  return (
    <section className="py-12" aria-labelledby="aircraft-types-title">
      <div className="container mx-auto px-4">
        <SectionTitle id="aircraft-types-title" className="mb-10 text-center">
          Explorá por tipo de aeronave
        </SectionTitle>

        {/* Celular: carrusel horizontal con scroll-snap (se ven ~1,5 aeronaves). Desde md: 3 por fila;
            desde lg: 4 + 3 centradas, como la referencia. */}
        <ul className="-mx-4 flex snap-x snap-mandatory gap-6 overflow-x-auto scroll-px-4 px-4 pb-2 [scrollbar-width:none] md:mx-0 md:flex-wrap md:justify-center md:gap-y-12 md:overflow-visible md:px-0 md:pb-0 [&::-webkit-scrollbar]:hidden">
          {TYPES.map((type) => {
            const total = type.categories.reduce((sum, id) => sum + (counts[id] ?? 0), 0);
            return (
              <li key={type.name} className="w-[64%] shrink-0 snap-start md:w-[calc((100%-3rem)/3)] lg:w-[calc((100%-4.5rem)/4)]">
                <Link
                  href={hrefFor(type.categories)}
                  className="group block rounded-md text-center outline-none focus-visible:ring-2 focus-visible:ring-[#E70F1F] focus-visible:ring-offset-4 focus-visible:ring-offset-transparent"
                >
                  {/* Caja de altura fija y la aeronave apoyada en la base, así los nombres quedan alineados. */}
                  <div className="relative mx-auto h-28 w-full transition-transform duration-200 ease-out group-hover:translate-x-1.5 group-focus-visible:translate-x-1.5 motion-reduce:transition-none motion-reduce:group-hover:translate-x-0 motion-reduce:group-focus-visible:translate-x-0 sm:h-32 lg:h-36">
                    <Image
                      src={`/aircraft-types/${type.image}.webp`}
                      alt=""
                      fill
                      sizes="(min-width: 1280px) 290px, (min-width: 1024px) 23vw, (min-width: 768px) 31vw, 64vw"
                      className="object-contain object-bottom"
                    />
                  </div>
                  <h3 className="mt-4 text-lg font-bold text-[#001F58] decoration-[#E70F1F] decoration-2 underline-offset-4 group-hover:underline group-focus-visible:underline">
                    {type.name}
                  </h3>
                  <p className="mx-auto mt-1 max-w-[18rem] text-sm leading-relaxed text-slate-600">{type.description}</p>
                  <p
                    className={`mt-2 text-[11px] font-semibold uppercase tracking-[0.14em] tabular-nums ${
                      total > 0 ? "text-[#001F58]" : "text-slate-500"
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
