import Link from "next/link";
import Image from "next/image";
import { SectionTitle } from "@/components/ui/home/SectionTitle";

// "Explorá por tipo de aeronave" (VA-86). Server component, sin JS de cliente. Ajuste del socio
// (10/10): en celular, grilla de 2 por fila (la séptima sola y centrada); imágenes y textos un 15 %
// más chicos que la primera versión. Correspondencia con AircraftCategory confirmada por el socio (10/10):
// Monomotor = MP + MT, Bimotor = BP + BT, Experimental / LSA = E, Agrícola = A,
// Helicóptero = H, Proyecto = PR, Otros = S/C. VA-149 (17/10): orden y nombre como en lib/aircraft-categories.ts.
const TYPES = [
  {
    name: "Monomotor",
    image: "monomotor",
    width: 484,
    height: 196,
    categories: ["MP", "MT"],
  },
  {
    name: "Bimotor",
    image: "bimotor",
    width: 484,
    height: 212,
    categories: ["BP", "BT"],
  },
  {
    name: "Experimental / LSA",
    image: "experimental-lsa",
    width: 494,
    height: 176,
    categories: ["E"],
  },
  {
    name: "Agrícola",
    image: "agricola",
    width: 496,
    height: 180,
    categories: ["A"],
  },
  {
    name: "Helicóptero",
    image: "helicoptero",
    width: 502,
    height: 224,
    categories: ["H"],
  },
  {
    name: "Proyecto",
    image: "proyecto",
    width: 486,
    height: 238,
    categories: ["PR"],
  },
  {
    name: "Otros",
    image: "otros",
    width: 494,
    height: 188,
    categories: ["S/C"],
    // Ajustado (10/10): los turbohélices tienen categoría propia (MT y BT).
  },
];

const hrefFor = (categories: string[]) => `/aircraft?${categories.map((c) => `category=${encodeURIComponent(c)}`).join("&")}`;

export function AircraftTypesSection({ counts }: { counts: Record<string, number> }) {
  return (
    <section className="py-14" aria-labelledby="aircraft-types-title">
      <div className="container mx-auto px-4">
        <SectionTitle id="aircraft-types-title" className="mb-8">
          Explorá por tipo de aeronave
        </SectionTitle>

        {/* Rediseño (25/10): una tira de instrumentos. Celdas iguales con líneas finas: 7 en una fila
            desde lg, 4 + 3 en tablet y 2 por fila en celular. Cada celda lleva su número de orden. */}
        <ul className="grid grid-cols-2 overflow-hidden rounded-md border border-[#00205B]/14 bg-white md:grid-cols-4 lg:grid-cols-7">
          {TYPES.map((type, i) => {
            const total = type.categories.reduce((sum, id) => sum + (counts[id] ?? 0), 0);
            return (
              <li key={type.name} className="-mb-px -mr-px border-r border-b border-[#00205B]/10">
                <Link
                  href={hrefFor(type.categories)}
                  className="group relative flex h-full flex-col px-4 pt-3 pb-4 outline-none transition-colors hover:bg-[#F5F5F5] focus-visible:bg-[#F5F5F5] focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#D62828]"
                >
                  <span className="flex items-center justify-between text-[10px] font-semibold tracking-[0.16em] tabular-nums">
                    <span className="text-[#D62828]">{String(i + 1).padStart(2, "0")}</span>
                    <span className={total > 0 ? "text-[#00205B]/70" : "text-slate-500"}>{total > 0 ? `${total} ${total === 1 ? "AVISO" : "AVISOS"}` : "SIN AVISOS"}</span>
                  </span>
                  {/* Caja de altura fija y la aeronave apoyada en la base, así los nombres quedan alineados. */}
                  <div className="relative mt-3 h-[4.5rem] w-full transition-transform duration-300 ease-out group-hover:translate-x-1.5 group-focus-visible:translate-x-1.5 motion-reduce:transition-none sm:h-[5.5rem]">
                    <Image
                      src={`/aircraft-types/${type.image}.webp`}
                      alt=""
                      fill
                      sizes="(min-width: 1024px) 160px, (min-width: 768px) 22vw, 42vw"
                      className="object-contain object-bottom"
                    />
                  </div>
                  <h3 className="mt-3 text-[0.95rem] leading-snug font-bold text-[#00205B]">
                    <span className="bg-[linear-gradient(#D62828,#D62828)] bg-[length:0%_2px] bg-left-bottom bg-no-repeat pb-0.5 transition-[background-size] duration-300 group-hover:bg-[length:100%_2px] group-focus-visible:bg-[length:100%_2px]">
                      {type.name}
                    </span>
                  </h3>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
