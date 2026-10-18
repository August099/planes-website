import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import PublishForm from "@/components/ui/PublishForm";
import { loadListingForEdit } from "@/lib/listing-edit";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { getQuotaUsage } from "@/lib/quota";

export const dynamic = "force-dynamic";

type Props = { searchParams: Promise<{ edit?: string; type?: string }> };

export default async function PublishPage({ searchParams }: Props) {
  const user = await getCurrentUser();
  const { edit, type } = await searchParams;

  if (!user) {
    redirect("/login?callbackUrl=/publish");
  }

  // Modo edición: /publish?edit=<id>&type=aircraft|parts (solo el dueño o un admin).
  const editListing = edit ? await loadListingForEdit(edit, type === "parts" ? "parts" : "aircraft") : null;
  if (edit && !editListing) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center gap-4 text-center p-6">
        <h1 className="text-2xl font-bold text-[#001F58]">No podés editar esta publicación</h1>
        <p className="text-sm text-slate-600 max-w-md">No existe o no es tuya.</p>
        <Link href={`/profile/${user.id}`} className="px-6 py-2.5 bg-[#001F58] text-white rounded-xl font-semibold">
          Ir a mi perfil
        </Link>
      </main>
    );
  }

  // VA-152: cupo de la cuenta (solo al crear) y si hay planes pagos para ofrecer.
  const [usage, plansAvailable] = edit
    ? [null, false]
    : await Promise.all([getQuotaUsage(user.id), prisma.plan.count({ where: { tier: { not: null }, isActive: true, archivedAt: null } }).then((n) => n > 0)]);

  // VA-46: sin teléfono el formulario pide cargarlo antes de publicar.
  const sellerPhone = await prisma.user.findUnique({
    where: { id: user.id },
    select: { phone: true, userTypeConfirmed: true },
  });

  // VA-33: el filtro "Publica" depende del tipo de cuenta; si nunca se confirmó (cuentas de Google
  // anteriores a VA-87), se pregunta antes de una publicación nueva.
  if (!edit && sellerPhone && !sellerPhone.userTypeConfirmed) {
    redirect("/onboarding/account-type?from=publish");
  }

  const rawBrands = await prisma.aircraftBrand.findMany({
    select: {
      id: true,
      name: true,
      models: {
        // defaultCategoryId y las variantes permiten sugerir el tipo de aeronave al elegir el modelo.
        select: {
          id: true,
          name: true,
          defaultCategoryId: true,
          variants: { select: { id: true, name: true, categoryOverride: true }, orderBy: { name: "asc" } },
        },
        orderBy: { name: "asc" },
      },
    },
    orderBy: { name: "asc" },
  });

  // Categorías de repuestos: traemos 3 niveles (Categoría Padre -> Subcategoría -> Sub-subcategoría),
  // ya que algunas subcategorías tienen a su vez opciones más específicas que hay que
  // mostrar y obligar a elegir cuando existen.
  const rawSpareCategories = await prisma.category.findMany({
    where: {
      parentId: null, // Categorías principales
    },
    select: {
      id: true,
      name: true,
      children: {
        select: {
          id: true,
          name: true,
          children: {
            select: {
              id: true,
              name: true,
            },
            orderBy: { name: "asc" },
          },
        },
        orderBy: { name: "asc" },
      },
    },
    orderBy: { name: "asc" },
  });

  return (
    <main className="min-h-screen">
      <Breadcrumbs items={[{ label: "Publicar" }]} className="container mx-auto px-4 pt-4" />
      <PublishForm
        userId={user.id}
        brandsData={JSON.parse(JSON.stringify(rawBrands))}
        spareCategoriesData={JSON.parse(JSON.stringify(rawSpareCategories))}
        editListing={editListing ?? undefined}
        needsPhone={!sellerPhone?.phone?.trim()}
        quota={
          usage
            ? {
                tier: usage.tier,
                planName: usage.planName,
                aircraft: { used: usage.used.AIRCRAFT, limit: usage.limits.AIRCRAFT },
                parts: { used: usage.used.SPARE_PART, limit: usage.limits.SPARE_PART },
              }
            : undefined
        }
        plansAvailable={plansAvailable}
      />
    </main>
  );
}