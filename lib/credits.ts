import { prisma } from "@/lib/prisma";

export async function getAvailableCredits(userId: string): Promise<number> {
  const result = await prisma.purchase.aggregate({
    where: {
      userId,
      paymentStatus: "APPROVED",
      creditsRemaining: { gt: 0 },
    },
    _sum: { creditsRemaining: true },
  });

  return result._sum.creditsRemaining ?? 0;
}

export class NoCreditsError extends Error {
  constructor() {
    super("El usuario no tiene créditos disponibles");
    this.name = "NoCreditsError";
  }
}

export async function consumeCredit(userId: string): Promise<string> {
  return prisma.$transaction(async (tx) => {
    const purchase = await tx.purchase.findFirst({
      where: {
        userId,
        paymentStatus: "APPROVED",
        creditsRemaining: { gt: 0 },
      },
      orderBy: { createdAt: "asc" },
    });

    if (!purchase) {
      throw new NoCreditsError();
    }

    const updated = await tx.purchase.updateMany({
      where: { id: purchase.id, creditsRemaining: { gt: 0 } },
      data: { creditsRemaining: { decrement: 1 } },
    });

    if (updated.count === 0) {
      throw new NoCreditsError();
    }

    return purchase.id;
  });
}