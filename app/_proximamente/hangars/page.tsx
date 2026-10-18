import type { Metadata } from "next";
import Link from "next/link";
import { HangarAircraftType, HangarService, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { activeListingWhere } from "@/lib/listing-filters";
import { provinceBySlug } from "@/lib/provinces";
import { HANGARS_PATH, OFFER_TYPES, type OfferType } from "@/lib/hangars";
import { HangarCard } from "@/components/ui/HangarCard";
import { HangarFiltersSidebar } from "@/components/ui/HangarFiltersSidebar";
import { SortDropdown } from "@/components/ui/SortDropdown";
import { PageBackground } from "@/components/ui/PageBackground";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";

interface Props {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

function toArray(value: string | string[] | undefined): string[] {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

const toNumber = (v: string | string[] | undefined) => {
  const n = typeof v === "string" && v !== "" ? Number(v) : NaN;
  return Number.isFinite(n) && n >= 0 ? n : undefined;
};

// Igual que /aircraft: los filtros apuntan al canonical del listado.
export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const params = await searchParams;
  const page = Number(params.page) || 1;
  const hasFilters = Object.keys(params).some((key) => key !== "page");
  const canonical = !hasFilters && page > 1 ? `${HANGARS_PATH}?page=${page}` : HANGARS_PATH;
  return {
    title: "Hangares en alquiler y venta",
    description:
      "Hangares completos, espacios en hangares compartidos y hangares en venta en aeródromos de Argentina. Filtrá por provincia, medidas de puerta, tipo de aeronave y servicios.",
    alternates: { canonical },
  };
}

const OFFER_WHERE: Record<OfferType, Prisma.HangarWhereInput> = {
  "rent-shared": { offersRent: true, rentalType: "SHARED_SPACE" },
  "rent-whole": { offersRent: true, rentalType: "WHOLE_HANGAR" },
  sale: { offersSale: true },
};

// El precio de venta va primero (es el que se ve grande cuando hay los dos); los avisos sin
// precio quedan al final. Con monedas distintas el orden es aproximado (no hay cotización).
const ORDER_BY: Record<string, Prisma.HangarOrderByWithRelationInput[]> = {
  price_desc: [{ salePrice: { sort: "desc", nulls: "last" } }, { rentPrice: { sort: "desc", nulls: "last" } }],
  price_asc: [{ salePrice: { sort: "asc", nulls: "last" } }, { rentPrice: { sort: "asc", nulls: "last" } }],
  recent: [{ createdAt: "desc" }],
  oldest: [{ createdAt: "asc" }],
  az: [{ title: "asc" }],
  za: [{ title: "desc" }],
};

const ITEMS_PER_PAGE = 21;

// VA-84: listado de hangares, con la misma estructura que /aircraft (filtros, orden y paginación).
export default async function HangarsPage({ searchParams }: Props) {
  const params = await searchParams;
  const currentPage = Math.max(1, Number(params.page) || 1);

  // Valores fuera de los enums se ignoran (no llegan a Prisma).
  const offerValues = OFFER_TYPES.map((o) => o.value) as string[];
  const types = toArray(params.type).filter((t): t is OfferType => offerValues.includes(t));
  const aircraft = toArray(params.aircraft).filter((a): a is HangarAircraftType =>
    (Object.values(HangarAircraftType) as string[]).includes(a)
  );
  const services = toArray(params.service).filter((s): s is HangarService =>
    (Object.values(HangarService) as string[]).includes(s)
  );
  const province = provinceBySlug(typeof params.province === "string" ? params.province : null);
  const minDoor = toNumber(params.minDoor);
  const minPrice = toNumber(params.minPrice);
  const maxPrice = toNumber(params.maxPrice);
  const currency = params.currency === "USD" ? "USD" : "ARS";
  const sort = typeof params.sort === "string" && params.sort in ORDER_BY ? params.sort : "recent";

  const priceRange =
    minPrice !== undefined || maxPrice !== undefined
      ? { ...(minPrice !== undefined && { gte: minPrice }), ...(maxPrice !== undefined && { lte: maxPrice }) }
      : null;

  const and: Prisma.HangarWhereInput[] = [];
  if (types.length > 0) and.push({ OR: types.map((t) => OFFER_WHERE[t]) });
  // El rango compara la venta o el alquiler, en la moneda elegida.
  if (priceRange) {
    and.push({
      OR: [
        { offersSale: true, saleCurrency: currency, salePrice: priceRange },
        { offersRent: true, rentCurrency: currency, rentPrice: priceRange },
      ],
    });
  }

  const where: Prisma.HangarWhereInput = {
    ...activeListingWhere(),
    ...(province && { province: province.name }),
    ...(minDoor !== undefined && { doorWidth: { gte: minDoor } }),
    ...(aircraft.length > 0 && { aircraftTypes: { hasSome: aircraft } }),
    ...(services.length > 0 && { services: { hasEvery: services } }),
    ...(and.length > 0 && { AND: and }),
  };

  const [hangars, total] = await Promise.all([
    prisma.hangar.findMany({
      where,
      select: {
        id: true,
        title: true,
        airfieldName: true,
        city: true,
        province: true,
        doorWidth: true,
        doorHeight: true,
        offersSale: true,
        salePrice: true,
        saleCurrency: true,
        offersRent: true,
        rentalType: true,
        rentPrice: true,
        rentCurrency: true,
        rentPeriod: true,
        images: { orderBy: { order: "asc" }, take: 5, select: { id: true, url: true, order: true } },
      },
      orderBy: ORDER_BY[sort],
      skip: (currentPage - 1) * ITEMS_PER_PAGE,
      take: ITEMS_PER_PAGE,
    }),
    prisma.hangar.count({ where }),
  ]);

  const totalPages = Math.ceil(total / ITEMS_PER_PAGE);

  const createPageUrl = (pageNumber: number) => {
    const urlParams = new URLSearchParams();
    types.forEach((t) => urlParams.append("type", t));
    if (province) urlParams.set("province", province.slug);
    if (minDoor !== undefined) urlParams.set("minDoor", String(minDoor));
    aircraft.forEach((a) => urlParams.append("aircraft", a));
    if (priceRange) urlParams.set("currency", currency);
    if (minPrice !== undefined) urlParams.set("minPrice", String(minPrice));
    if (maxPrice !== undefined) urlParams.set("maxPrice", String(maxPrice));
    services.forEach((s) => urlParams.append("service", s));
    urlParams.set("sort", sort);
    urlParams.set("page", String(pageNumber));
    return `?${urlParams.toString()}`;
  };

  const pageNumbers = (() => {
    const pages: (number | "...")[] = [];
    if (totalPages <= 5) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
      return pages;
    }
    pages.push(1);
    if (currentPage > 3) pages.push("...");
    for (let i = Math.max(2, currentPage - 1); i <= Math.min(totalPages - 1, currentPage + 1); i++) pages.push(i);
    if (currentPage < totalPages - 2) pages.push("...");
    pages.push(totalPages);
    return pages;
  })();

  const pageLinkClass = "px-3 py-2 border rounded-md hover:bg-neutral-100 text-sm font-medium transition-colors bg-white/80";
  const pageDisabledClass = "px-3 py-2 border rounded-md text-neutral-400 text-sm font-medium cursor-not-allowed bg-neutral-50";

  return (
    <main className="relative isolate min-h-screen px-4 py-8">
      <PageBackground page="default" />
      <Breadcrumbs items={[{ label: "Servicios", href: "/services" }, { label: "Hangares" }]} className="-mt-4 mb-2" />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
        <h1 className="text-2xl font-medium">
          Hangares en alquiler y venta <span className="text-slate-500 font-normal text-lg">({total})</span>
        </h1>
        <div className="hidden lg:block">
          <SortDropdown />
        </div>
      </div>

      <section className="flex flex-col lg:flex-row items-start gap-6">
        <div className="w-full flex lg:block items-center gap-3 lg:w-auto shrink-0">
          <div className="flex-1 lg:flex-none lg:w-72">
            <HangarFiltersSidebar />
          </div>
          <div className="flex-1 lg:hidden w-full *:w-full">
            <SortDropdown />
          </div>
        </div>

        <div className="w-full flex-1">
          {hangars.length === 0 ? (
            <div className="py-20 text-center text-slate-500 bg-white/50 backdrop-blur-sm rounded-2xl border border-slate-200 px-4">
              No se encontraron hangares con los criterios de búsqueda seleccionados.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
              {hangars.map((h) => (
                <HangarCard
                  key={h.id}
                  hangar={{
                    ...h,
                    salePrice: h.salePrice === null ? null : Number(h.salePrice),
                    rentPrice: h.rentPrice === null ? null : Number(h.rentPrice),
                  }}
                />
              ))}
            </div>
          )}

          {totalPages > 1 && (
            <nav aria-label="Páginas" className="flex justify-center items-center gap-2 mt-8 border-t border-slate-200/80 pt-6 flex-wrap">
              {currentPage > 1 ? (
                <Link href={createPageUrl(currentPage - 1)} className={pageLinkClass}>
                  Anterior
                </Link>
              ) : (
                <span className={pageDisabledClass}>Anterior</span>
              )}
              {pageNumbers.map((page, index) =>
                page === "..." ? (
                  <span key={`ellipsis-${index}`} className="px-3 py-2 text-sm text-neutral-400 font-medium">
                    ...
                  </span>
                ) : (
                  <Link
                    key={`page-${page}`}
                    href={createPageUrl(page)}
                    aria-current={page === currentPage ? "page" : undefined}
                    className={`px-3 py-2 border rounded-md text-sm font-medium transition-colors ${
                      page === currentPage
                        ? "bg-neutral-900 text-white border-neutral-900 pointer-events-none"
                        : "hover:bg-neutral-100 text-neutral-700 bg-white/80"
                    }`}
                  >
                    {page}
                  </Link>
                )
              )}
              {currentPage < totalPages ? (
                <Link href={createPageUrl(currentPage + 1)} className={pageLinkClass}>
                  Siguiente
                </Link>
              ) : (
                <span className={pageDisabledClass}>Siguiente</span>
              )}
            </nav>
          )}
        </div>
      </section>
    </main>
  );
}
