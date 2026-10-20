import { prisma } from "@/lib/prisma";
import { activeListingWhere } from "@/lib/listing-filters";
import { getCurrentUser } from "@/lib/auth-helpers";
import { notFound, redirect } from "next/navigation";
import { ProfileView } from "@/components/ui/ProfileView";
import { getQuotaUsage } from "@/lib/quota";
import { getRepublishStatus, republishView } from "@/lib/republish";
import { moderationInfoFor } from "@/lib/moderation";
import { PageBackground } from "@/components/ui/PageBackground";
import { getMissingProfileFieldsCached } from "@/lib/cached-data";
import { getSubscriptionSummary, hasCustomPage, hasSellerMetrics, hasVerifiedBadge } from "@/lib/subscriptions";
import { TrackProfileView } from "@/components/ui/profile/TrackProfileView";
import { quotaForView } from "@/lib/account-data";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";

interface Props {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
}

export default async function ProfilePage({ params, searchParams }: Props) {
  const { id } = await params;
  const { tab } = await searchParams;
  const currentUser = await getCurrentUser();
  const isOwner = currentUser?.id === id;
  // VA-175: los links viejos a las pestañas de ajustes y compras del perfil van a Ajustes.
  if (isOwner && tab === "compras") redirect("/settings#compras");
  if (isOwner && (tab === "edit" || tab === "ajustes")) redirect("/settings");

  const rawProfileUser = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      email: isOwner,
      phone: isOwner,
      image: true,
      city: true,
      province: true,
      userType: true,
      facebook: true,
      instagram: true,
      createdAt: true,
      // VA-87: página personalizada
      businessName: true,
      bio: true,
      coverUrl: true,
      logoUrl: true,
      website: true,
      whatsapp: true,
      aircrafts: {
        where: isOwner ? undefined : activeListingWhere(),
        include: {
          category: { select: { id: true, name: true } },
          images: { orderBy: { order: "asc" }, take: 1 },
          ...(isOwner && {
            _count: {
              select: {
                favorites: true,
                questions: true,
                // VA-105 · 5.1: solo vistas (ya deduplicadas al registrarlas, VA-17), no clics de contacto.
                analyticsEvents: { where: { eventType: "AIRCRAFT_VIEW" } },
              },
            },
          }),
        },
        orderBy: { createdAt: "desc" },
      },
      spareParts: {
        where: isOwner ? undefined : activeListingWhere(),
        include: {
          category: { select: { id: true, name: true } },
          images: { orderBy: { order: "asc" }, take: 1 },
          ...(isOwner && {
            _count: {
              select: {
                favorites: true,
                questions: true,
                // VA-105 · 5.1: solo vistas (ya deduplicadas al registrarlas, VA-17), no clics de contacto.
                analyticsEvents: { where: { eventType: "SPARE_PART_VIEW" } },
              },
            },
          }),
        },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!rawProfileUser) {
    notFound();
  }

  // VA-87: con el beneficio del plan, el perfil se muestra como página personalizada.
  const storefront = (await hasCustomPage(id))
    ? {
        businessName: rawProfileUser.businessName,
        bio: rawProfileUser.bio,
        coverUrl: rawProfileUser.coverUrl,
        logoUrl: rawProfileUser.logoUrl,
        website: rawProfileUser.website,
        whatsapp: rawProfileUser.whatsapp,
        verified: await hasVerifiedBadge(id),
      }
    : null;

  // Sanitización de objetos Prisma (Decimal y Date) para el Client Component 
  const profileUser = {
    ...rawProfileUser,
    createdAt: rawProfileUser.createdAt.toISOString(),
    aircrafts: rawProfileUser.aircrafts.map((a) => ({
      ...a,
      price: a.price ? Number(a.price) : null,
      createdAt: a.createdAt.toISOString(),
      updatedAt: a.updatedAt.toISOString(),
      listingStartsAt: a.listingStartsAt?.toISOString() ?? null,
    })),
    spareParts: rawProfileUser.spareParts.map((s) => ({
      ...s,
      price: s.price ? Number(s.price) : null,
      createdAt: s.createdAt.toISOString(),
      updatedAt: s.updatedAt.toISOString(),
      listingStartsAt: s.listingStartsAt?.toISOString() ?? null,
    })),
  };

  let currentUserFavIds: string[] = [];
  if (currentUser) {
    const userFavs = await prisma.favorite.findMany({
      where: { userId: currentUser.id },
      select: { aircraftId: true, sparePartId: true },
    });
    currentUserFavIds = userFavs
      .flatMap((f) => [f.aircraftId, f.sparePartId])
      .filter((favId): favId is string => Boolean(favId));
  }

  return (
    <main className="relative min-h-[calc(100vh-80px)] container mx-auto px-4 py-8 pb-16">
      <PageBackground page="profile" />
      <Breadcrumbs items={[{ label: "Perfil" }, { label: rawProfileUser.name ?? "Usuario" }]} className="-mt-4 mb-2" />

      {/* VA-151: visitas a la Página VA (no cuenta al dueño ni a los admins). */}
      {!isOwner && <TrackProfileView profileUserId={id} />}
      <ProfileView
        profileUser={profileUser}
        isOwner={isOwner}
        currentUserFavIds={currentUserFavIds}
        missingProfileFields={isOwner ? await getMissingProfileFieldsCached(id) : []}
        storefront={storefront}
        subscription={isOwner ? await getSubscriptionSummary(id) : null}
        hasSellerMetrics={isOwner ? await hasSellerMetrics(id) : false}
        quota={isOwner ? quotaForView(await getQuotaUsage(id)) : null}
        republish={isOwner ? republishView(await getRepublishStatus(id)) : null}
        moderation={
          isOwner
            ? await moderationInfoFor([
                ...rawProfileUser.aircrafts.filter((a) => a.status === "MODERATED").map((a) => ({ kind: "AIRCRAFT" as const, id: a.id })),
                ...rawProfileUser.spareParts.filter((s) => s.status === "MODERATED").map((s) => ({ kind: "SPARE_PART" as const, id: s.id })),
              ])
            : {}
        }
      />
    </main>
  );
}
