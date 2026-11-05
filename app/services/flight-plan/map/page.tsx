import type { Metadata } from "next";
import { aeroStatus } from "@/lib/aero/import";
import { AeroMap } from "@/components/flight-plan/AeroMap";
import { JsonLd } from "@/components/seo/JsonLd";
import { MAP_PATH } from "@/lib/flight-plan-flag";
import { flightToolJsonLd } from "@/lib/structured-data";

const TITLE = "Mapa aeronáutico de Argentina: aeródromos, LAD, METAR y SIGMET";
const DESCRIPTION = "Mapa con los aeródromos, helipuertos y lugares aptos denunciados de Argentina, con ficha de cada uno, METAR y SIGMET vigentes. Gratis y sin cuenta.";
export const metadata: Metadata = { title: TITLE, description: DESCRIPTION, alternates: { canonical: MAP_PATH }, openGraph: { title: TITLE, description: DESCRIPTION, url: MAP_PATH } };
export const dynamic = "force-dynamic";

const LABEL = { MADHEL: "MADHEL", LAD: "LAD" } as const;
const date = (iso: string | null | undefined) => (iso ? new Date(iso).toLocaleDateString("es-AR", { timeZone: "America/Argentina/Buenos_Aires" }) : "sin fecha");

export default async function MapPage() {
  const status = await aeroStatus();
  return (
    <div className="space-y-3">
      <JsonLd data={flightToolJsonLd({ name: TITLE, description: DESCRIPTION, path: MAP_PATH })} />
      <AeroMap />
      <p className="text-xs text-slate-600">
        Vigencia: {status.map((s) => `${LABEL[s.dataset]} ${s.lastApplied ? date(s.lastApplied.sourceDate) : "sin cargar"}`).join(" · ")}. Fuente: ANAC. Los puntos pueden no reflejar los últimos cambios: verificá en el AIP y los NOTAM.
      </p>
    </div>
  );
}
