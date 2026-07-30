import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { MercadoPagoConfig, Preference } from "mercadopago";


const PLAN_PRICES: Record<string, { title: string; price: number }> = {
  "ad-banner-lateral": { title: "Banner Lateral / Búsqueda (30 días)", price: 25000 },
  "ad-banner-principal": { title: "Banner Principal Home (30 días)", price: 55000 },
  "ad-pack-anual": { title: "Sponsor Institucional (6 meses)", price: 180000 },
};

export default async function BannerRequestPage({
  searchParams,
}: {
  searchParams: Promise<{ plan?: string }>;
}) {
  const user = await getCurrentUser();
  const params = await searchParams;
  const selectedPlanKey = params.plan || "ad-banner-principal";
  const planInfo = PLAN_PRICES[selectedPlanKey] || PLAN_PRICES["ad-banner-principal"];

  if (!user) {
    redirect(`/login?callbackUrl=/banners?plan=${selectedPlanKey}`);
  }

  async function createAdBannerAndCheckout(formData: FormData) {
    "use server";

    const sessionUser = await getCurrentUser();
    if (!sessionUser) {
      redirect("/login");
    }

    const title = formData.get("title") as string;
    const description = formData.get("description") as string;
    const bannerImageUrl = formData.get("bannerImageUrl") as string;
    const linkUrl = formData.get("linkUrl") as string;
    const planKey = (formData.get("planKey") as string) || "ad-banner-principal";

    const currentPlan = PLAN_PRICES[planKey] || PLAN_PRICES["ad-banner-principal"];


    const newBanner = await prisma.adBanner.create({
      data: {
        userId: sessionUser.id,
        title: title || currentPlan.title,
        description: description || "Solicitud de Banner Publicitario",
        bannerImageUrl: bannerImageUrl || null,
        linkUrl: linkUrl || null,
        status: "PENDING_PAYMENT",
      },
    });


    const client = new MercadoPagoConfig({
      accessToken: process.env.MP_ACCESS_TOKEN || "",
    });

    const preference = new Preference(client);

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://tu-dominio.com";


    const response = await preference.create({
      body: {
        items: [
          {
            id: newBanner.id,
            title: `Anuncio: ${currentPlan.title}`,
            unit_price: currentPlan.price,
            quantity: 1,
            currency_id: "ARS",
          },
        ],
        payer: {
          email: sessionUser.email || undefined,
          name: sessionUser.name || undefined,
        },
        external_reference: newBanner.id, 
        back_urls: {
          success: `${baseUrl}/dashboard?payment=success&bannerId=${newBanner.id}`,
          failure: `${baseUrl}/dashboard?payment=failure`,
          pending: `${baseUrl}/dashboard?payment=pending`,
        },
        auto_return: "approved",
        notification_url: `${baseUrl}/api/webhooks/mercadopago`,
      },
    });

    if (response.init_point) {
      redirect(response.init_point);
    } else {
      throw new Error("No se pudo generar la pasarela de pago.");
    }
  }

  return (
    <main className="relative isolate overflow-hidden min-h-screen -mb-16">
        <Image
            src="/bkg-ads.jpg"
            alt="Fondo Publicidad"
            fill
            priority
            className="-z-20 object-cover object-center"
        />
        <div className="absolute inset-0 -z-10 bg-white/80 dark:bg-slate-950/80 backdrop-blur-sm" />

      <div className="container mx-auto px-4 pt-16 pb-36 max-w-2xl">
        <div className="mb-8 text-center">
          <Link
            href="/ads"
            className="text-xs font-bold text-[#001F58]/70 hover:text-[#001F58] mb-3 inline-block transition-colors"
          >
            ← Volver a ver planes
          </Link>
          <h1 className="font-heading text-3xl sm:text-4xl font-bold text-[#001F58]">
            Configurá tu Banner
          </h1>
          <p className="text-sm text-[#001F58]/70 mt-2 max-w-md mx-auto">
            Completá la información del anuncio. Serás redirigido a MercadoPago para abonar el servicio.
          </p>
        </div>

        <div className="bg-white/80 backdrop-blur-md rounded-2xl border border-[#001F58]/15 shadow-sm p-6 sm:p-8">
          <div className="mb-6 p-4 rounded-xl bg-[#001F58]/5 border border-[#001F58]/10 flex items-center justify-between">
            <div>
              <p className="text-[10px] uppercase font-bold text-[#001F58]/60">Plan Seleccionado</p>
              <p className="text-sm font-bold text-[#001F58]">{planInfo.title}</p>
            </div>
            <p className="text-base font-extrabold text-red-600">
              ${planInfo.price.toLocaleString("es-AR")} ARS
            </p>
          </div>

          <form action={createAdBannerAndCheckout} className="space-y-5">
            <input type="hidden" name="planKey" value={selectedPlanKey} />

            <div>
              <label className="block text-xs font-bold text-[#001F58] mb-1.5 uppercase tracking-wider">
                Título o Empresa
              </label>
              <input
                type="text"
                name="title"
                placeholder="Ej: Taller Aeronáutico San Fernando"
                className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-white/90 border border-[#001F58]/20 text-[#001F58] placeholder-[#001F58]/40 focus:outline-none focus:ring-2 focus:ring-[#001F58]/30 transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#001F58] mb-1.5 uppercase tracking-wider">
                Enlace de Destino (Sitio web o WhatsApp)
              </label>
              <input
                type="url"
                name="linkUrl"
                placeholder="https://tuempresa.com"
                className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-white/90 border border-[#001F58]/20 text-[#001F58] placeholder-[#001F58]/40 focus:outline-none focus:ring-2 focus:ring-[#001F58]/30 transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#001F58] mb-1.5 uppercase tracking-wider">
                URL de la Imagen del Banner
              </label>
              <input
                type="url"
                name="bannerImageUrl"
                placeholder="https://tu-almacen-de-imagenes.com/banner.jpg"
                className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-white/90 border border-[#001F58]/20 text-[#001F58] placeholder-[#001F58]/40 focus:outline-none focus:ring-2 focus:ring-[#001F58]/30 transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#001F58] mb-1.5 uppercase tracking-wider">
                Instrucciones / Comentarios adicionales *
              </label>
              <textarea
                name="description"
                rows={3}
                required
                placeholder="Indica aclaraciones sobre el diseño o requerimientos especiales. Si no tenés imagen, contanos y te la hacemos nosotros!"
                className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-white/90 border border-[#001F58]/20 text-[#001F58] placeholder-[#001F58]/40 focus:outline-none focus:ring-2 focus:ring-[#001F58]/30 transition-all resize-none"
              />
            </div>

            <Button
              type="submit"
              className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl transition-all shadow-md mt-2 flex items-center justify-center gap-2"
            >
              💳 Ir a Pagar
            </Button>
          </form>
        </div>
      </div>
    </main>
  );
}