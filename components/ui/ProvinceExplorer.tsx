import { PROVINCES, provinceShortName } from "@/lib/provinces";
import { ARGENTINA_VIEWBOX, CABA_MARKER, PROVINCE_PATHS } from "@/components/ui/argentina-map/paths";
import { ProvinceExplorerClient, type ProvinceCount } from "@/components/ui/ProvinceExplorerClient";
import { DisplayTitle } from "@/components/ui/home/DisplayTitle";

// "Explorá por provincia" (VA-77). El mapa SVG se arma en el servidor (los paths van en el HTML,
// no en el JS del cliente); ProvinceExplorerClient solo maneja hover y selección.
export type ProvinceCounts = Record<string, { aircraft: number; parts: number }>;

const avisos = (n: number) => `${n} ${n === 1 ? "aviso" : "avisos"}`;

export function ProvinceExplorer({ counts }: { counts: ProvinceCounts }) {
  const provinces: ProvinceCount[] = PROVINCES.map((p) => ({
    slug: p.slug,
    name: p.name,
    label: provinceShortName(p.name),
    aircraft: counts[p.slug]?.aircraft ?? 0,
    parts: counts[p.slug]?.parts ?? 0,
  })).sort((a, b) => a.label.localeCompare(b.label, "es"));

  const totalOf = (slug: string) => (counts[slug]?.aircraft ?? 0) + (counts[slug]?.parts ?? 0);

  // Estado base de cada provincia; hover y selección los pinta el cliente con data-slug.
  const shapeProps = (slug: string, focusable: boolean) => {
    const label = provinceShortName(PROVINCES.find((p) => p.slug === slug)!.name);
    return {
      "data-slug": slug,
      "data-has": totalOf(slug) > 0 ? "1" : "0",
      ...(focusable
        ? { tabIndex: 0, role: "button", "aria-label": `${label}, ${avisos(totalOf(slug))}` }
        : { "aria-hidden": true }),
      className:
        "cursor-pointer fill-[#CFCFCF]/70 data-[has=1]:fill-[#00205B]/40 stroke-white transition-[fill] duration-150 motion-reduce:transition-none outline-none",
    };
  };

  const map = (
    <svg viewBox={ARGENTINA_VIEWBOX} className="h-full w-auto max-w-full mx-auto" aria-labelledby="province-map-title">
      <title id="province-map-title">Mapa de la Argentina por provincia: elegí una para ver sus avisos</title>
      {PROVINCES.map((p) => (
        // CABA es muy chica para tocarla: su path no es enfocable y el círculo de abajo la reemplaza.
        <path key={p.slug} d={PROVINCE_PATHS[p.slug]} strokeWidth={0.6} {...shapeProps(p.slug, p.slug !== "caba")} />
      ))}
      <circle cx={CABA_MARKER.cx} cy={CABA_MARKER.cy} r={7} strokeWidth={1.5} {...shapeProps("caba", true)} />
    </svg>
  );

  return (
    <section aria-labelledby="province-explorer-title">
      <div className="mb-8">
        <DisplayTitle id="province-explorer-title">Explorá por provincia</DisplayTitle>
        <p className="mt-3 text-sm text-slate-600">Encontrá aeronaves y repuestos cerca tuyo</p>
      </div>
      <ProvinceExplorerClient provinces={provinces} map={map} />
    </section>
  );
}
