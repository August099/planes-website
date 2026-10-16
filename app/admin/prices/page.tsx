import { redirect } from "next/navigation";
import type { ListingKind } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-helpers";
import { getListingPrices } from "@/lib/listing-prices";
import { formatListingPrice, LISTING_KIND_LABELS, priceChangePercent } from "@/lib/listing-price-format";
import { ListingPriceEditor } from "@/components/admin/ListingPriceEditor";
import { RenewalPercentEditor } from "@/components/admin/RenewalPercentEditor";
import { getBillingSettings } from "@/lib/billing-settings";

export const dynamic = "force-dynamic";

const KINDS: ListingKind[] = ["AIRCRAFT", "SPARE_PART"];
const LABEL = "text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500";

// VA-59: precio por menor de publicar un avión y un repuesto, con historial de cambios.
export default async function AdminPricesPage() {
  const admin = await getCurrentUser();
  if (!admin?.isAdmin) redirect("/");

  const [prices, settings, changes] = await Promise.all([
    getListingPrices(),
    getBillingSettings(),
    prisma.listingPriceChange.findMany({
      orderBy: { createdAt: "desc" },
      take: 30,
      select: {
        id: true,
        kind: true,
        previousAmount: true,
        newAmount: true,
        createdAt: true,
        admin: { select: { name: true, email: true } },
      },
    }),
  ]);
  const dateFmt = new Intl.DateTimeFormat("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Argentina/Buenos_Aires",
  });

  return (
    <div className="max-w-4xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-[#001F58]">Precios de publicación</h1>
        <p className="mt-1 max-w-2xl text-sm text-slate-600">
          Lo que cuesta publicar un aviso suelto. Un cambio vale para las compras nuevas, no para las que ya están en
          curso. Los packs y las suscripciones van aparte.
        </p>
      </div>

      <section className="divide-y divide-[#001F58]/10 rounded-lg border border-[#001F58]/12 bg-white">
        {KINDS.map((kind) => (
          <div key={kind} className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className={LABEL}>{LISTING_KIND_LABELS[kind]}</p>
              <p className="mt-1 text-2xl font-bold tabular-nums text-[#001F58]">{prices[kind].label}</p>
              <p className="text-xs text-slate-500">Por aviso · pago único</p>
            </div>
            <ListingPriceEditor kind={kind} label={LISTING_KIND_LABELS[kind]} current={prices[kind].amount} />
          </div>
        ))}
      </section>

      {/* VA-105 (14/10): renovación de un aviso vencido. */}
      <section className="space-y-4 rounded-lg border border-[#001F58]/12 bg-white p-5">
        <div>
          <p className={LABEL}>Renovación de un aviso</p>
          <p className="mt-1 text-sm text-slate-600">
            Renovar un aviso (45 días más) cuesta este porcentaje del precio de arriba. Con una suscripción que deja ese tipo de aviso
            sin vencimiento, renovar es gratis.
          </p>
        </div>
        <RenewalPercentEditor current={settings.renewalPercent} />
        <p className="text-sm text-slate-700">
          Hoy:{" "}
          {KINDS.map((kind, i) => (
            <span key={kind}>
              {i > 0 && " · "}
              {LISTING_KIND_LABELS[kind]}{" "}
              <strong className="tabular-nums">{formatListingPrice(Math.round((prices[kind].amount * settings.renewalPercent) / 100))}</strong>
            </span>
          ))}
        </p>
      </section>

      <section>
        <h2 className={`mb-3 ${LABEL}`}>Historial de cambios</h2>
        {changes.length === 0 ? (
          <p className="text-sm text-slate-500">Todavía no hubo cambios: rigen los precios iniciales.</p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-[#001F58]/12 bg-white">
            <table className="w-full min-w-[640px] text-sm">
              <thead className="border-b border-[#001F58]/10 text-left">
                <tr className={LABEL}>
                  <th className="px-4 py-3 font-semibold">Fecha</th>
                  <th className="px-4 py-3 font-semibold">Tipo</th>
                  <th className="px-4 py-3 text-right font-semibold">Antes</th>
                  <th className="px-4 py-3 text-right font-semibold">Después</th>
                  <th className="px-4 py-3 text-right font-semibold">Variación</th>
                  <th className="px-4 py-3 font-semibold">Admin</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 tabular-nums">
                {changes.map((c) => {
                  const before = Number(c.previousAmount);
                  const after = Number(c.newAmount);
                  const pct = priceChangePercent(before, after);
                  return (
                    <tr key={c.id}>
                      <td className="whitespace-nowrap px-4 py-3 text-slate-600">{dateFmt.format(c.createdAt)}</td>
                      <td className="px-4 py-3 text-slate-700">{c.kind === "AIRCRAFT" ? "Avión" : "Repuesto"}</td>
                      <td className="px-4 py-3 text-right text-slate-500">{formatListingPrice(before)}</td>
                      <td className="px-4 py-3 text-right font-semibold text-[#001F58]">{formatListingPrice(after)}</td>
                      <td className="px-4 py-3 text-right text-slate-600">
                        {pct === null ? "—" : `${pct > 0 ? "+" : ""}${pct.toFixed(1).replace(".", ",")} %`}
                      </td>
                      <td className="px-4 py-3 text-slate-600">{c.admin?.name || c.admin?.email || "Usuario borrado"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
