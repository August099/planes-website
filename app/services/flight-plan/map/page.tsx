import type { Metadata } from "next";
import { aeroStatus } from "@/lib/aero/import";
import { AeroMap } from "@/components/flight-plan/AeroMap";

export const metadata: Metadata = { title: "Mapa aeronáutico", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

const LABEL = { MADHEL: "MADHEL", LAD: "LAD" } as const;
const date = (iso: string | null | undefined) => (iso ? new Date(iso).toLocaleDateString("es-AR", { timeZone: "America/Argentina/Buenos_Aires" }) : "sin fecha");

export default async function MapPage() {
  const status = await aeroStatus();
  return (
    <div className="space-y-3">
      <AeroMap />
      <p className="text-xs text-slate-600">
        Vigencia: {status.map((s) => `${LABEL[s.dataset]} ${s.lastApplied ? date(s.lastApplied.sourceDate) : "sin cargar"}`).join(" · ")}. Fuente: ANAC. Los puntos pueden no reflejar los últimos cambios: verificá en el AIP y los NOTAM.
      </p>
    </div>
  );
}
