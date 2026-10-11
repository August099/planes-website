import type { Metadata } from "next";
import { getAircraftDetail } from "@/lib/listing-data";
import { isListingActive } from "@/lib/listing-filters";
import { buildCompareSections } from "@/lib/compare-rows";
import { formatPrice } from "@/lib/format";
import { PLACEHOLDER_IMAGE } from "@/lib/constants";
import { PageBackground } from "@/components/ui/PageBackground";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { CompareTable, type CompareColumn } from "@/components/ui/compare/CompareTable";

// Combinaciones infinitas: no se indexa (VA-83).
export const metadata: Metadata = {
  title: "Comparar aeronaves",
  robots: { index: false, follow: true },
  alternates: { canonical: "/planes/compare" },
};

interface Props {
  searchParams: Promise<{ ids?: string }>;
}

// VA-83: comparador de hasta 3 aeronaves (/planes/compare?ids=a,b,c), con todos sus datos.
export default async function ComparePage({ searchParams }: Props) {
  const { ids = "" } = await searchParams;
  const wanted = [...new Set(ids.split(",").map((s) => s.trim()).filter(Boolean))].slice(0, 3);
  const found = (await Promise.all(wanted.map((id) => getAircraftDetail(id)))).filter((a) => a !== null);

  const now = new Date();
  const columns: CompareColumn[] = found.map((a) => ({
    id: a.id,
    title: a.title,
    href: `/planes/plane-details/${a.id}`,
    image: a.images[0]?.url ?? PLACEHOLDER_IMAGE,
    price: formatPrice(a.price, { fallback: "Precio a consultar" }),
    location: [a.city, a.province].filter(Boolean).join(", "),
    active: isListingActive(a, now),
  }));
  // Los avisos que ya no están disponibles no aportan datos a la comparación.
  const sections = buildCompareSections(found.map((a, i) => (columns[i].active ? a : null)));

  return (
    <main className="relative isolate min-h-screen">
      <PageBackground page="planes" />
      <div className="container mx-auto px-4 pb-16 pt-6">
        <Breadcrumbs items={[{ label: "Aviones", href: "/planes" }, { label: "Comparar" }]} className="mb-6" />
        <div className="mb-6 max-w-2xl">
          <h1 className="text-2xl font-bold text-[#001F58] sm:text-3xl">Comparar aeronaves</h1>
          <p className="mt-1 text-sm text-slate-600">
            Hasta 3 aeronaves, con todos los datos de cada aviso uno al lado del otro. Copiá el link para compartir esta
            comparación.
          </p>
        </div>
        <CompareTable columns={columns} sections={sections} />
      </div>
    </main>
  );
}
