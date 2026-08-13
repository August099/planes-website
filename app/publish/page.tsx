import { getCurrentUser } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import PublishForm from "@/components/ui/PublishForm";

export default async function PublishPage() {
  const currentUser = await getCurrentUser();
  const userBalance = await prisma.user.findUnique({ where: {id: currentUser?.id}, select: {aircraftListingsBalance: true, sparePartsListingsBalance: true} })

  return (
    <main className="relative isolate overflow-hidden min-h-screen -mb-16">
        <PublishForm 
          userId={currentUser?.id ?? null}
          aBalance={userBalance?.aircraftListingsBalance ?? 0}
          sBalance={userBalance?.sparePartsListingsBalance ?? 0}
        />
    </main>
  );
}