import { prisma } from "@/lib/prisma";
import { activeListingWhere } from "@/lib/listing-filters";
import { getCurrentUser } from "@/lib/auth-helpers";
import { notFound } from "next/navigation";
import { ProfileView, type ProfileCoupon } from "@/components/ui/ProfileView";
import { PageBackground } from "@/components/ui/PageBackground";
import { getMissingProfileFieldsCached } from "@/lib/cached-data";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function ProfilePage({ params }: Props) {
  const { id } = await params;
  const currentUser = await getCurrentUser();
  const isOwner = currentUser?.id === id;

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
      isFoundingMember: true,
      facebook: true,
      instagram: true,
      createdAt: true,
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
                analyticsEvents: true,
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
                analyticsEvents: true,
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

  // Obtener los cupones guardados/utilizados por el usuario si es el propietario
  let userCoupons: ProfileCoupon[] = [];
  if (isOwner) {
    const usages = await prisma.couponUsage.findMany({
      where: { userId: id },
      include: {
        Coupon: true,
      },
      orderBy: { usedAt: "desc" },
    });

    userCoupons = usages.map((u) => ({
      usageId: u.id,
      usedAt: u.usedAt.toISOString(),
      code: u.Coupon.code,
      type: u.Coupon.type,
      discountType: u.Coupon.discountType,
      discountValue: Number(u.Coupon.discountValue),
      scope: u.Coupon.scope,
      isActive: u.Coupon.isActive,
      expiresAt: u.Coupon.expiresAt?.toISOString() ?? null,
      purchaseId: u.purchaseId,
      aircraftId: u.aircraftId,
      sparePartId: u.sparePartId,
    }));
  }

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
      listingExpiresAt: a.listingExpiresAt?.toISOString() ?? null,
    })),
    spareParts: rawProfileUser.spareParts.map((s) => ({
      ...s,
      price: s.price ? Number(s.price) : null,
      createdAt: s.createdAt.toISOString(),
      updatedAt: s.updatedAt.toISOString(),
      listingStartsAt: s.listingStartsAt?.toISOString() ?? null,
      listingExpiresAt: s.listingExpiresAt?.toISOString() ?? null,
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

      <ProfileView
        profileUser={profileUser}
        isOwner={isOwner}
        currentUserFavIds={currentUserFavIds}
        userCoupons={userCoupons}
        missingProfileFields={isOwner ? await getMissingProfileFieldsCached(id) : []}
      />
    </main>
  );
}