import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import ProfileDashboardClient from "./profile-client";

export default async function ProfileDashboardPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const currentUser = await getCurrentUser();

  const isOwner = currentUser?.id === id;

  const userProfile = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      email: true,
      image: true,
      phone: true,
      instagram: true,
      facebook: true,
      city: true,
      province: true,
      createdAt: true,
      aircraftListingsBalance: true,
      sparePartsListingsBalance: true,
    },
  });

  if (!userProfile) {
    notFound();
  }

  const rawUserListings = await prisma.aircraft.findMany({
    where: {
      sellerId: id,
      ...(!isOwner && { status: "ACTIVE" }),
    },
    include: {
      images: {
        orderBy: { order: "asc" },
        take: 1,
      },
    },
    orderBy: { createdAt: "desc" },
  });

  // Convertimos el tipo Decimal de Prisma a number nativo para TypeScript y para evitar errores de serialización
  const userListings = rawUserListings.map((listing) => ({
    ...listing,
    price: listing.price ? listing.price.toNumber() : null,
  }));

  async function updateProfile(formData: FormData) {
    "use server";
    if (!currentUser || currentUser.id !== id) throw new Error("No autorizado");

    const name = formData.get("name") as string;
    const phone = formData.get("phone") as string;
    const city = formData.get("city") as string;
    const province = formData.get("province") as string;
    const instagram = formData.get("instagram") as string;
    const facebook = formData.get("facebook") as string;

    await prisma.user.update({
      where: { id },
      data: { name, phone, city, province, instagram, facebook },
    });

    redirect(`/profile/${id}?updated=true`);
  }

  async function deleteProfileImage() {
    "use server";
    if (!currentUser || currentUser.id !== id) throw new Error("No autorizado");

    await prisma.user.update({
      where: { id },
      data: { image: null },
    });

    redirect(`/profile/${id}?image_deleted=true`);
  }

  async function uploadProfileImage(formData: FormData) {
    "use server";
    if (!currentUser || currentUser.id !== id) throw new Error("No autorizado");

    const file = formData.get("avatar") as File;
    if (!file || file.size === 0) return;

    // Aquí guardas el archivo en tu proveedor (Cloudinary, AWS S3, Vercel Blob, etc.)
    const imageUrl = "/uploads/" + file.name; // Reemplazar por tu función de subida real

    await prisma.user.update({
      where: { id },
      data: { image: imageUrl },
    });

    redirect(`/profile/${id}?image_updated=true`);
  }

  async function extendListing(formData: FormData) {
    "use server";
    if (!currentUser || currentUser.id !== id) throw new Error("No autorizado");

    const listingId = formData.get("listingId") as string;
    const RENEWAL_COST = 1;

    const dbUser = await prisma.user.findUniqueOrThrow({
      where: { id: currentUser.id },
      select: { aircraftListingsBalance: true },
    });

    if ((dbUser.aircraftListingsBalance ?? 0) < RENEWAL_COST) {
      redirect("/planes?error=insufficient_aircraft_credits");
    }

    const listing = await prisma.aircraft.findUniqueOrThrow({
      where: { id: listingId },
    });

    const currentExpiration = listing.listingExpiresAt
      ? new Date(listing.listingExpiresAt)
      : new Date();
    const baseDate = currentExpiration > new Date() ? currentExpiration : new Date();
    const newExpiresAt = new Date(baseDate.getTime() + 45 * 24 * 60 * 60 * 1000);

    await prisma.$transaction([
      prisma.user.update({
        where: { id: currentUser.id },
        data: { aircraftListingsBalance: { decrement: RENEWAL_COST } },
      }),
      prisma.aircraft.update({
        where: { id: listingId },
        data: { listingExpiresAt: newExpiresAt, status: "ACTIVE" },
      }),
    ]);

    redirect(`/profile/${id}?renewed=true`);
  }

  return (
    <ProfileDashboardClient
      userProfile={userProfile}
      userListings={userListings}
      isOwner={isOwner}
      updateProfile={updateProfile}
      extendListing={extendListing}
      deleteProfileImage={deleteProfileImage}
      uploadProfileImage={uploadProfileImage}
    />
  );
}