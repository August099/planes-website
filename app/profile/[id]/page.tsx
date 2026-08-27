import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-helpers";
import { notFound } from "next/navigation";
import { ProfileView } from "@/components/ui/ProfileView";
import Image from "next/image";

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
      facebook: true,
      instagram: true,
      createdAt: true,
      aircrafts: {
        where: isOwner ? undefined : { status: "ACTIVE" },
        include: {
          category: { select: { id: true, name: true } },
          images: { orderBy: { order: "asc" }, take: 1 },
          ...(isOwner && {
            _count: {
              select: {
                favorites: true,
                leads: true,
                analyticsEvents: true,
              },
            },
          }),
        },
        orderBy: { createdAt: "desc" },
      },
      spareParts: {
        where: isOwner ? undefined : { status: "ACTIVE" },
        include: {
          category: { select: { id: true, name: true } },
          images: { orderBy: { order: "asc" }, take: 1 },
          ...(isOwner && {
            _count: {
              select: {
                favorites: true,
                leads: true,
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

  // Sanitización de objetos Prisma (Decimal y Date) para el Client Component 
  // Esto es un fix del chat, me pioló
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
      <div className="fixed inset-0 -z-10 pointer-events-none">
        <Image
          src="/bkg-forms.png"
          alt="Fondo Perfil"
          fill
          priority
          className="object-cover"
        />
        <div className="absolute inset-0 bg-background/85" />
      </div>

      <ProfileView
        profileUser={profileUser}
        isOwner={isOwner}
        currentUserFavIds={currentUserFavIds}
      />
    </main>
  );
}