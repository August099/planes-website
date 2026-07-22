import { requireUser } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { Preference, PreApproval } from "mercadopago";
import { mpClient } from "@/lib/mercadopago";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default async function PlanesPage() {
  const user = await requireUser();

  const creditPacks = await prisma.plan.findMany({
    where: { type: "CREDIT_PACK", isActive: true },
    orderBy: { price: "asc" },
  });

  const subscriptions = await prisma.plan.findMany({
    where: { type: "SUBSCRIPTION", isActive: true },
    orderBy: { price: "asc" },
  });

  async function comprarPack(formData: FormData) {
    "use server";
    const planId = formData.get("planId") as string;
    const plan = await prisma.plan.findUniqueOrThrow({ where: { id: planId } });

    const purchase = await prisma.purchase.create({
      data: {
        userId: user.id,
        planId: plan.id,
        creditsTotal: plan.credits ?? 0,
        creditsRemaining: 0,
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
        auto_return: "approved",
        notification_url: `${process.env.APP_URL}/api/webhooks/mercadopago`,
      },
    });

    await prisma.purchase.update({
      where: { id: purchase.id },
      data: { mpPreferenceId: preference.id },
    });

    redirect(preference.init_point!);
  }

  async function suscribirse(formData: FormData) {
    "use server";
    const planId = formData.get("planId") as string;
    const plan = await prisma.plan.findUniqueOrThrow({ where: { id: planId } });

    // Opcional: Crear registro previo de suscripción pendiente si tu DB lo contempla
    // const subRecord = await prisma.subscription.create(...)

    const preapproval = await new PreApproval(mpClient).create({
      body: {
        reason: `Ventas Aeronáuticas - ${plan.name}`,
        external_reference: `${user.id}:${plan.id}`, // Guardamos usuario y plan en la referencia
        payer_email: user.email!,
        auto_recurring: {
          frequency: 1,
          frequency_type: "months",
          transaction_amount: Number(plan.price),
          currency_id: "ARS",
        },
        back_url: `${process.env.APP_URL}/panel?suscripcion=exitosa`,
      },
    });

    redirect(preapproval.init_point!);
  }

  // Opcional: Separar packs por créditos/categoría si lo deseas en UI
  const minoristas = creditPacks.filter((p) => (p.credits ?? 0) <= 10);
  const mayoristas = creditPacks.filter((p) => (p.credits ?? 0) > 10);

  return (
    <main className="container mx-auto px-4 py-12 max-w-5xl">
      <div className="text-center max-w-2xl mx-auto mb-10">
        <h1 className="text-3xl font-heading font-bold mb-3">Planes y Créditos</h1>
        <p className="text-sm text-muted-foreground">
          1 repuesto = 1 crédito · 1 instrumental = 3 créditos · 1 aeronave = 10 créditos · Destacar = +2 créditos
        </p>
      </div>

      {/* Packs Minoristas */}
      <div className="mb-10">
        <h2 className="text-xl font-heading font-semibold mb-4">Packs de Créditos</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {minoristas.map((plan) => (
            <CardPack key={plan.id} plan={plan} action={comprarPack} />
          ))}
        </div>
      </div>

      {/* Packs Mayoristas */}
      {mayoristas.length > 0 && (
        <div className="mb-12">
          <h2 className="text-xl font-heading font-semibold mb-1">Packs Mayoristas</h2>
          <p className="text-xs text-muted-foreground mb-4">Descuentos por volumen para talleres y comercios</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {mayoristas.map((plan) => (
              <CardPack key={plan.id} plan={plan} action={comprarPack} isWholesale />
            ))}
          </div>
        </div>
      )}

      {/* Suscripciones */}
      <div className="pt-6 border-t">
        <h2 className="text-xl font-heading font-semibold mb-1">Suscripciones Mensuales (Ilimitadas)</h2>
        <p className="text-xs text-muted-foreground mb-6">Para publicaciones continuas sin preocuparte por los créditos</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {subscriptions.map((plan) => (
            <form key={plan.id} action={suscribirse} className="h-full">
              <input type="hidden" name="planId" value={plan.id} />
              <div className="border border-primary/20 bg-primary/[0.02] rounded-xl p-6 h-full flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <p className="font-heading font-semibold text-lg">{plan.name}</p>
                    {plan.includesVerifiedBadge && (
                      <Badge variant="secondary" className="bg-blue-100 text-blue-800 border-none">
                        Vendedor Verificado
                      </Badge>
                    )}
                  </div>
                  <p className="text-3xl font-heading font-bold text-primary mb-2">
                    ${Number(plan.price).toLocaleString("es-AR")}
                    <span className="text-sm font-normal text-muted-foreground"> /mes</span>
                  </p>
                  <p className="text-sm text-muted-foreground mb-6">
                    {plan.usageDescription}
                  </p>
                </div>
                <Button type="submit" size="lg" className="w-full">
                  Suscribirme ahora
                </Button>
              </div>
            </form>
          ))}
        </div>
      </div>
    </main>
  );
}

// Componente auxiliar reutilizable para renderizar tarjetas de créditos
function CardPack({ plan, action, isWholesale = false }: { plan: any; action: (formData: FormData) => void; isWholesale?: boolean }) {
  return (
    <form action={action} className="h-full">
      <input type="hidden" name="planId" value={plan.id} />
      <div className={`border rounded-xl p-5 h-full flex flex-col justify-between ${isWholesale ? 'border-amber-500/20 bg-amber-500/5' : 'border-border bg-card'}`}>
        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="font-heading font-semibold">{plan.name}</p>
            {!!plan.savingsPercent && (
              <Badge className="bg-green-600 text-white font-bold">
                {plan.savingsPercent}% OFF
              </Badge>
            )}
          </div>
          <p className="text-2xl font-heading font-bold text-primary mb-1">
            ${Number(plan.price).toLocaleString("es-AR")}
          </p>
          <p className="text-xs font-medium text-muted-foreground mb-3">
            {plan.credits} créditos
          </p>
          <p className="text-sm text-muted-foreground mb-4">
            {plan.usageDescription}
          </p>
        </div>
        <Button type="submit" variant={isWholesale ? "default" : "outline"} className="w-full">
          Comprar Pack
        </Button>
      </div>
    </form>
  );
}