import Image from "next/image";
import { requireUser } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { Preference, PreApproval } from "mercadopago";
import { mpClient } from "@/lib/mercadopago";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default async function PlanesPage() {
  const user = await requireUser();

  // Obtener los packs de créditos desde la BD
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

    const preapproval = await new PreApproval(mpClient).create({
      body: {
        reason: `Ventas Aeronáuticas - ${plan.name}`,
        external_reference: `${user.id}:${plan.id}`,
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

  const minoristas = creditPacks.filter((p) => (p.credits ?? 0) <= 10);
  const mayoristas = creditPacks.filter((p) => (p.credits ?? 0) > 10);

  return (
    <main className="relative isolate overflow-hidden min-h-screen -mb-16">
      <Image
        src="/bkg-plans.jpg"
        alt="Fondo de Planes"
        fill
        priority
        className="-z-20 object-cover"
      />
      <div className="absolute inset-0 -z-10 bg-background/85 backdrop-blur-[2px]" />

      <div className="container mx-auto px-4 pt-16 pb-36 max-w-6xl">
        <div className="text-center max-w-3xl mx-auto mb-14">
          <h1 className="font-heading text-3xl sm:text-5xl font-semibold text-[#001F58] tracking-tight mb-4">
            PLANES Y CRÉDITOS
          </h1>
          <div className="inline-flex flex-wrap items-center justify-center gap-2 sm:gap-3 bg-white/60 backdrop-blur-sm border border-[#001F58]/15 px-4 py-2.5 rounded-full shadow-sm text-xs sm:text-sm font-medium text-[#001F58]">
            <span>📦 <strong>1 repuesto</strong> = 1 crédito</span>
            <span className="opacity-30">•</span>
            <span>✈️ <strong>1 aeronave</strong> = 10 créditos</span>
            <span className="opacity-30">•</span>
            <span>⭐ <strong>Destacar aviso</strong> = +2 créditos</span>
          </div>
        </div>


        <div className="mb-16">
          <div className="mb-6">
            <h2 className="font-heading text-2xl font-bold text-[#001F58]">
              Packs de Créditos
            </h2>
            <p className="text-sm text-[#001F58]/70">
              Para publicaciones individuales u ocasionales sin costo de mantenimiento fijo.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch">
            {minoristas.map((plan) => (
              <CardPack key={plan.id} plan={plan} action={comprarPack} />
            ))}
          </div>
        </div>


        {mayoristas.length > 0 && (
          <div className="mb-16">
            <div className="mb-6">
              <h2 className="font-heading text-2xl font-bold text-[#001F58]">
                Packs Mayoristas
              </h2>
              <p className="text-sm text-[#001F58]/70">
                Ahorro importante por volumen de créditos para comercios y talleres.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch">
              {mayoristas.map((plan) => (
                <CardPack key={plan.id} plan={plan} action={comprarPack} isWholesale />
              ))}
            </div>
          </div>
        )}


        {subscriptions.length > 0 && (
          <div className="pt-8 border-t border-[#001F58]/15">
            <div className="mb-6">
              <h2 className="font-heading text-2xl font-bold text-[#001F58]">
                Suscripciones Mensuales (Ilimitadas)
              </h2>
              <p className="text-sm text-[#001F58]/70">
                Publicaciones continuas orientadas a concesionarias, talleres y brokers.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-stretch">
              {subscriptions.map((plan) => (
                <form key={plan.id} action={suscribirse} className="h-full">
                  <input type="hidden" name="planId" value={plan.id} />
                  <div className="flex flex-col justify-between bg-white/80 backdrop-blur-md rounded-2xl p-8 border border-[#001F58]/20 shadow-sm hover:shadow-md transition-all h-full">
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="font-heading font-bold text-xl text-[#001F58]">
                          {plan.name}
                        </h3>
                        {plan.includesVerifiedBadge && (
                          <Badge className="bg-blue-100 text-blue-900 border-blue-200">
                            ✓ Vendedor Verificado
                          </Badge>
                        )}
                      </div>

                      <div className="flex items-baseline gap-1 mb-4">
                        <span className="font-heading text-4xl font-extrabold text-[#001F58]">
                          ${Number(plan.price).toLocaleString("es-AR")}
                        </span>
                        <span className="text-sm font-medium text-[#001F58]/60">
                          /mes
                        </span>
                      </div>

                      <p className="text-sm text-[#001F58]/80 mb-6 leading-relaxed">
                        {plan.usageDescription}
                      </p>
                    </div>

                    <Button
                      type="submit"
                      className="w-full bg-[#E70F1F] hover:bg-[#c00d1a] text-white font-medium py-3 rounded-xl shadow-sm transition-all"
                    >
                      Suscribirme ahora
                    </Button>
                  </div>
                </form>
              ))}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}


function CardPack({
  plan,
  action,
  isWholesale = false,
}: {
  plan: any;
  action: (formData: FormData) => void;
  isWholesale?: boolean;
}) {
  return (
    <form action={action} className="h-full">
      <input type="hidden" name="planId" value={plan.id} />
      <div
        className={`flex flex-col justify-between backdrop-blur-md rounded-2xl p-7 h-full border transition-all duration-200 shadow-sm hover:shadow-md ${
          isWholesale
            ? "bg-[#E70F1F]/5 border-[#E70F1F]/25"
            : "bg-white/75 border-[#001F58]/15"
        }`}
      >
        <div>
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-heading font-bold text-lg text-[#001F58]">
              {plan.name}
            </h3>
            {!!plan.savingsPercent && (
              <Badge className="bg-emerald-600 text-white font-bold border-none">
                {plan.savingsPercent}% OFF
              </Badge>
            )}
          </div>

          <div className="flex items-baseline gap-1 mb-1">
            <span className="font-heading text-3xl font-extrabold text-[#001F58]">
              ${Number(plan.price).toLocaleString("es-AR")}
            </span>
          </div>

          <p className="text-xs font-semibold uppercase tracking-wider text-[#001F58]/70 mb-4">
            Incluye {plan.credits} {plan.credits === 1 ? "crédito" : "créditos"}
          </p>

          <p className="text-sm text-[#001F58]/80 mb-6 min-h-[38px] leading-relaxed">
            {plan.usageDescription}
          </p>
        </div>

        <Button
          type="submit"
          className={`w-full py-3 rounded-xl font-medium transition-all shadow-sm ${
            isWholesale
              ? "bg-[#E70F1F]/85 hover:bg-[#E70F1F] text-white"
              : "bg-[#001F58]/90 hover:bg-[#001F58] text-white"
          }`}
        >
          Comprar Pack
        </Button>
      </div>
    </form>
  );
}