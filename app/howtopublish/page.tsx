import type { Metadata } from "next";
import Link from "next/link";
import { PageBackground } from "@/components/ui/PageBackground";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { getCachedFreeQuota } from "@/lib/quota";
import { MAX_LISTING_IMAGES } from "@/lib/listing-schema";

export const metadata: Metadata = {
  title: "Cómo publicar tu avión o repuesto",
  description: "Paso a paso para publicar tu avión o repuesto en Ventas Aeronáuticas y llegar a compradores de todo el país.",
  alternates: { canonical: "/howtopublish" },
};

// VA-191: la misma ruta de waypoints de "Cómo funciona" (Home), vertical y sobre fondo claro, en vez de
// cuatro tarjetas iguales con ícono. Al costado, el cupo de Base y la publicación asistida.
const STEPS: { title: string; body: React.ReactNode }[] = [
  {
    title: "Creá tu cuenta",
    body: (
      <>
        Con tu correo o con Google. Elegís si publicás como particular o como empresa, taller o broker, y cargás un teléfono de contacto: sin teléfono no se puede publicar.
      </>
    ),
  },
  {
    title: "Completá el formulario",
    body: (
      <ul className="mt-1 list-disc space-y-1 pl-5">
        <li>Tipo de aeronave, marca y modelo. Si tu marca o modelo no está en la lista, escribilo y queda sumado para los próximos avisos.</li>
        <li>Año, horas, precio (o &quot;a consultar&quot;) y ubicación.</li>
        <li>Hasta {MAX_LISTING_IMAGES} fotos y la descripción. Si adjuntás documentos, cualquier visitante los puede ver.</li>
      </ul>
    ),
  },
  {
    title: "Tu aviso queda publicado",
    body: <>Se ve al momento y no vence: sigue activo hasta que lo pauses o lo marques como vendido. Los interesados te escriben o te llaman directo, sin intermediarios.</>,
  },
  {
    title: "Mantenelo arriba",
    body: (
      <>
        Con las republicaciones de tu plan, el aviso vuelve primero en &quot;Últimas publicaciones&quot; sin cambiar nada. Cuando lo vendas, marcalo como vendido y liberás su lugar.
      </>
    ),
  },
];

export default async function HowToPublishPage() {
  // VA-152: cupo de Base vigente (se edita en /admin/plans).
  const free = await getCachedFreeQuota();
  return (
    <main className="relative isolate overflow-hidden min-h-screen">
      <PageBackground page="howtopublish" />

      <div className="container mx-auto max-w-6xl px-4 pt-6 pb-24">
        <Breadcrumbs items={[{ label: "Cómo publicar" }]} className="mb-8 sm:mb-12" />

        <header className="mb-12 max-w-2xl">
          <h1 className="font-heading text-3xl font-bold tracking-tight text-[#001F58] sm:text-4xl">Cómo publicar tu avión o repuesto</h1>
          <p className="mt-4 text-base leading-relaxed text-slate-700 sm:text-lg">
            Publicar es gratis dentro del cupo de tu cuenta y el aviso no vence. Estos son los pasos.
          </p>
        </header>

        <div className="grid gap-10 md:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] md:gap-12">
          <ol className="relative space-y-10">
            {/* Ruta punteada entre los waypoints */}
            <span aria-hidden className="absolute bottom-3 left-[11px] top-3 border-l border-dashed border-[#001F58]/30" />
            {STEPS.map((step, i) => (
              <li key={step.title} className="relative pl-10">
                <span aria-hidden className="absolute left-0 top-0 flex h-6 w-6 items-center justify-center rounded-full border-2 border-[#001F58] bg-white">
                  <span className="h-2 w-2 rounded-full bg-[#E70F1F]" />
                </span>
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#E70F1F] tabular-nums">Paso {String(i + 1).padStart(2, "0")}</p>
                <h2 className="mt-1 text-xl font-bold text-[#001F58]">{step.title}</h2>
                <div className="mt-2 max-w-xl text-base leading-relaxed text-slate-700">{step.body}</div>
              </li>
            ))}
          </ol>

          <aside className="space-y-6 md:sticky md:top-24 md:self-start">
            <section className="rounded-lg border border-[#001F58]/12 bg-white">
              <div className="p-5">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Plan Base · gratis</p>
                <p className="mt-1 text-sm text-slate-600">Avisos activos al mismo tiempo, en toda cuenta:</p>
              </div>
              <dl className="grid grid-cols-2 divide-x divide-[#001F58]/10 border-t border-[#001F58]/10 tabular-nums">
                <div className="px-5 py-3">
                  <dt className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Aviones</dt>
                  <dd className="mt-0.5 text-2xl font-bold text-[#001F58]">{free.AIRCRAFT ?? "Sin límite"}</dd>
                </div>
                <div className="px-5 py-3">
                  <dt className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Repuestos</dt>
                  <dd className="mt-0.5 text-2xl font-bold text-[#001F58]">{free.SPARE_PART ?? "Sin límite"}</dd>
                </div>
              </dl>
              <p className="border-t border-[#001F58]/10 px-5 py-3 text-sm text-slate-600">
                Con Pro o Broker / Empresa publicás más avisos a la vez.{" "}
                <Link href="/plans" className="font-semibold text-[#001F58] underline underline-offset-2">
                  Planes y precios
                </Link>
              </p>
            </section>

            <Link href="/publish" className="flex min-h-12 items-center justify-center rounded-md bg-[#E70F1F] px-6 text-base font-bold text-white transition-colors hover:bg-[#C20D1A]">
              Publicar mi aviso
            </Link>

            <section className="border-l-2 border-[#001F58] pl-4">
              <h2 className="text-base font-bold text-[#001F58]">¿Preferís que lo armemos nosotros?</h2>
              <p className="mt-1 text-sm leading-relaxed text-slate-700">
                Con la publicación asistida nos dejás tu nombre y tu WhatsApp, nos mandás las fotos y los datos, y armamos el aviso por vos. El formulario está al costado de la página de publicar.
              </p>
              <Link href="/publish" className="mt-2 inline-block text-sm font-semibold text-[#001F58] underline underline-offset-2">
                Pedir publicación asistida
              </Link>
            </section>

            <p className="text-sm text-slate-600">
              ¿Querés vender más rápido?{" "}
              <Link href="/services/guides/selling-your-aircraft" className="font-semibold text-[#001F58] underline underline-offset-2">
                Leé la guía para vender tu avión
              </Link>
            </p>
          </aside>
        </div>
      </div>
    </main>
  );
}
