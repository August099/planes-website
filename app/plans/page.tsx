// src/app/planes/page.tsx
import { requireUser } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import type { SellerType } from "@prisma/client";
import { MercadoPagoConfig, Preference } from "mercadopago";
import { mpClient } from "@/lib/mercadopago";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";

export default async function PlanesPage() {
  const user = await requireUser();

  const sellerType = ((user as { sellerType?: SellerType }).sellerType ?? "PARTICULAR") as SellerType;
  const plans = await prisma.plan.findMany({
    where: { sellerType, isActive: true },
    orderBy: { postsIncluded: "asc" },
  });

  async function comprarPlan(formData: FormData) {
    "use server";
    const planId = formData.get("planId") as string;

    const plan = await prisma.plan.findUniqueOrThrow({ where: { id: planId } });

    const userId = user.id;
    if (!userId) {
      throw new Error("User id is required");
    }

    const purchase = await prisma.purchase.create({
      data: {
        userId,
        planId: plan.id,
        creditsTotal: plan.postsIncluded,
        creditsRemaining: 0, // se activa recién cuando el webhook confirma el pago
        paymentStatus: "PENDING",
      },
    });

    const preference = await new Preference(mpClient).create({
      body: {
        items: [
          {
            id: plan.id,
            title: `Ventas Aeronáuticas - ${plan.name}`,
            quantity: 1,
            unit_price: Number(plan.price),
            currency_id: "ARS",
          },
        ],
        external_reference: purchase.id,
        back_urls: {
          success: `${process.env.APP_URL}/panel?compra=exitosa`,
          failure: `${process.env.APP_URL}/planes?compra=fallida`,
          pending: `${process.env.APP_URL}/panel?compra=pendiente`,
        },
        notification_url: `${process.env.APP_URL}/api/webhooks/mercadopago`,
      },
    });

    await prisma.purchase.update({
      where: { id: purchase.id },
      data: { mpPreferenceId: preference.id },
    });

    redirect(preference.init_point!);
  }

  return (
    <main className="container mx-auto px-4 py-12 max-w-2xl">
      <h1 className="text-2xl font-heading font-semibold mb-6">Planes para publicar</h1>
      <div className="grid gap-4">
        {plans.map((plan) => (
          <form key={plan.id} action={comprarPlan}>
            <input type="hidden" name="planId" value={plan.id} />
            <div className="border rounded-xl p-4 flex justify-between items-center">
              <div>
                <p className="font-medium">{plan.name}</p>
                <p className="text-sm text-muted-foreground">
                  {plan.postsIncluded} publicaciones
                </p>
              </div>
              <div className="flex items-center gap-4">
                <span className="font-heading font-bold text-primary">
                  ${Number(plan.price).toLocaleString("es-AR")}
                </span>
                <Button type="submit">Comprar</Button>
              </div>
            </div>
          </form>
        ))}
      </div>
    </main>
  );
}