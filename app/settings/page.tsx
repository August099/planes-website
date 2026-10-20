import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-helpers";
import { getMissingProfileFieldsCached } from "@/lib/cached-data";
import { getSubscriptionSummary, hasCustomPage, hasVerifiedBadge } from "@/lib/subscriptions";
import { getQuotaUsage } from "@/lib/quota";
import { getUserPurchases } from "@/lib/purchases";
import { ownerBillingProfile, quotaForView } from "@/lib/account-data";
import { PageBackground } from "@/components/ui/PageBackground";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { AccountSettings } from "@/components/ui/settings/AccountSettings";

export const metadata: Metadata = {
  title: "Ajustes",
  robots: { index: false, follow: false },
};

// VA-175: "Ajustes", con toda la configuración de la cuenta (datos, contraseña, plan, compras,
// facturación, notificaciones y la Página VA). Solo el dueño; "Mi cuenta" queda para ver.
export default async function SettingsPage() {
  const current = await getCurrentUser();
  if (!current?.id) redirect(`/login?callbackUrl=${encodeURIComponent("/settings")}`);
  const id = current.id;

  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      image: true,
      city: true,
      province: true,
      userType: true,
      facebook: true,
      instagram: true,
      passwordHash: true,
      businessName: true,
      bio: true,
      coverUrl: true,
      logoUrl: true,
      website: true,
      whatsapp: true,
    },
  });
  if (!user) redirect("/login");

  const storefront = (await hasCustomPage(id))
    ? {
        businessName: user.businessName,
        bio: user.bio,
        coverUrl: user.coverUrl,
        logoUrl: user.logoUrl,
        website: user.website,
        whatsapp: user.whatsapp,
        verified: await hasVerifiedBadge(id),
      }
    : null;

  return (
    <main className="relative container mx-auto min-h-[calc(100vh-80px)] max-w-2xl px-4 py-8 pb-16">
      <PageBackground page="profile" />
      <Breadcrumbs items={[{ label: "Mi cuenta", href: `/profile/${id}` }, { label: "Ajustes" }]} className="-mt-4 mb-2" />
      <div className="mb-8 flex flex-wrap items-end justify-between gap-3">
        <h1 className="font-heading text-3xl font-bold text-[#001F58]">Ajustes</h1>
        <Link href={`/profile/${id}`} className="text-sm font-semibold text-[#001F58] underline underline-offset-2 hover:text-[#E70F1F]">
          Ver mi cuenta
        </Link>
      </div>
      <AccountSettings
        user={{
          id: user.id,
          name: user.name,
          email: user.email,
          phone: user.phone,
          image: user.image,
          city: user.city,
          province: user.province,
          userType: user.userType,
          facebook: user.facebook,
          instagram: user.instagram,
        }}
        missingProfileFields={await getMissingProfileFieldsCached(id)}
        storefront={storefront}
        subscription={await getSubscriptionSummary(id)}
        quota={quotaForView(await getQuotaUsage(id))}
        purchases={await getUserPurchases(id)}
        billingProfile={await ownerBillingProfile(id, user.name, user.email)}
        hasPassword={!!user.passwordHash}
      />
    </main>
  );
}
