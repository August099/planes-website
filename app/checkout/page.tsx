import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-helpers";
import { getBillingSettings, resolveProduct } from "@/lib/payments/checkout";
import { CheckoutForm, type BillingDefaults } from "@/components/checkout/CheckoutForm";
import { PageBackground } from "@/components/ui/PageBackground";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { getSubscriptionSummary } from "@/lib/subscriptions";

export const metadata: Metadata = {
  title: "Pago",
  robots: { index: false, follow: false },
};

interface Props {
  searchParams: Promise<{ planId?: string; coupon?: string }>;
}

const LABEL = "text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500";

// VA-92 · Etapa 1: checkout de pago único (packs y la publicación suelta de un aviso pendiente). El producto
// y el precio los resuelve el servidor; el pago se hace en Mercado Pago (Checkout Pro) y la compra
// se activa con el webhook. Los planes mensuales se cobran con débito automático (preapproval).
export default async function CheckoutPage({ searchParams }: Props) {
  const params = await searchParams;
  const user = await getCurrentUser();
  if (!user?.id) {
    const query = new URLSearchParams(Object.entries(params).filter((e): e is [string, string] => typeof e[1] === "string"));
    redirect(`/login?callbackUrl=${encodeURIComponent(`/checkout?${query}`)}`);
  }

  const product = await resolveProduct(user.id, { planId: params.planId });
  const crumbs = [{ label: "Planes", href: "/plans" }, { label: "Pago" }];

  if ("error" in product) {
    return (
      <Shell crumbs={crumbs}>
        <section className="rounded-lg border border-[#00205B]/12 bg-white p-6 sm:p-8">
          <p className={LABEL}>Pago</p>
          <h1 className="mt-1 text-2xl font-bold text-[#00205B]">{product.error}</h1>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/plans" className="inline-flex min-h-11 items-center rounded-md bg-[#00205B] px-5 text-sm font-bold text-white hover:bg-[#001331]">
              Ver planes
            </Link>
            <Link href={`/profile/${user.id}`} className="inline-flex min-h-11 items-center rounded-md border border-[#00205B]/20 px-5 text-sm font-semibold text-[#00205B] hover:bg-slate-50">
              Ir a mis publicaciones
            </Link>
          </div>
        </section>
      </Shell>
    );
  }

  const [profile, settings, subscription] = await Promise.all([
    prisma.billingProfile.findUnique({ where: { userId: user.id } }),
    getBillingSettings(),
    product.recurring ? getSubscriptionSummary(user.id) : null,
  ]);
  // VA-121: con una suscripción vigente, pagar otro plan es un cambio de plan inmediato.
  const changingFrom =
    subscription?.active && !subscription.courtesy && subscription.planId !== product.planId ? subscription.planName : null;
  const defaults: BillingDefaults = profile
    ? {
        kind: profile.kind,
        name: profile.name,
        docNumber: profile.docNumber ?? "",
        ivaCondition: (["RI", "M", "E"].includes(profile.ivaCondition) ? profile.ivaCondition : "") as BillingDefaults["ivaCondition"],
        address: profile.address ?? "",
        email: profile.email,
      }
    : { kind: "CONSUMIDOR_FINAL", name: user.name ?? "", docNumber: "", ivaCondition: "", address: "", email: user.email ?? "" };

  return (
    <Shell crumbs={crumbs}>
      {changingFrom && (
        <p className="mb-4 border-l-2 border-[#D62828] bg-white px-4 py-3 text-sm text-slate-700">
          <strong className="text-[#00205B]">Cambio de plan:</strong> este plan reemplaza a <strong>{changingFrom}</strong> apenas se
          apruebe el primer pago, y se deja de cobrar el anterior. Lo que queda del período actual no se devuelve. Si no completás el
          pago, seguís con tu plan de siempre. Si el plan nuevo tiene menos cupo y tenés más avisos activos, se pausan los más nuevos
          (después elegís cuáles quedan activos).
        </p>
      )}
      <CheckoutForm
        productKey={product.key}
        product={{ name: product.name, includes: product.includes, price: product.price }}
        defaults={defaults}
        dniRequiredFrom={settings.dniRequiredFrom}
        initialCoupon={params.coupon ?? ""}
        recurring={product.recurring ? { per: product.billingPer } : undefined}
      />
    </Shell>
  );
}

function Shell({ crumbs, children }: { crumbs: { label: string; href?: string }[]; children: React.ReactNode }) {
  return (
    <main className="relative isolate min-h-[calc(100vh-80px)] px-4 pb-20 pt-6">
      <PageBackground page="plans" />
      <div className="container mx-auto max-w-4xl">
        <Breadcrumbs items={crumbs} className="mb-8" />
        {children}
      </div>
    </main>
  );
}
