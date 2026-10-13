import type { Metadata } from "next";
import Link from "next/link";
import { PageBackground } from "@/components/ui/PageBackground";
import { GuideIndex } from "@/components/ui/guides/GuideIndex";
import { GUIDES_PATH } from "@/lib/guides";
import { getPublishedGuides } from "@/lib/guides-data";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";

export const metadata: Metadata = {
  // El layout agrega " | Ventas Aeronáuticas".
  title: "Servicios aeronáuticos",
  description:
    "Guías para comprar y vender aeronaves (pre-compra, transferencia ante ANAC y glosario) y, muy pronto, talleres, hangares, profesionales y empresas del sector.",
  alternates: { canonical: "/services" },
};

const upcomingServices = [
  {
    title: "Pilotos y profesionales",
    description: "Encontrá pilotos, mecánicos, instructores y especialistas del sector.",
  },
  {
    title: "Talleres y mantenimiento",
    description: "Conectate con talleres, servicios de mantenimiento y reparación aeronáutica.",
  },
  {
    title: "Hangares y espacios",
    description: "Encontrá hangares, espacios disponibles y servicios relacionados.",
  },
  {
    title: "Eventos y actividades",
    description: "Descubrí eventos, encuentros, ferias y actividades de la comunidad aeronáutica.",
  },
  {
    title: "Empresas y servicios",
    description: "Conocé empresas y profesionales que ofrecen productos y servicios para el sector.",
  },
  {
    title: "Foro de la comunidad",
    description:
      "Participá de debates, consultas técnicas, historias y novedades con otros apasionados de la aviación.",
  },
];

const LABEL = "text-[11px] font-semibold uppercase tracking-[0.16em]";

// VA-85: sin panel de vidrio ni grilla de tarjetas con ícono. Encabezado a la izquierda, "Disponible
// ahora" asimétrico (presentación + índice de guías) y "Próximamente" como lista con códigos.
export default async function ServicesPage() {
  return (
    <main className="relative min-h-[calc(100vh-80px)] container mx-auto px-4 py-12 pb-20">
      <PageBackground page="default" />
      <Breadcrumbs items={[{ label: "Servicios" }]} className="mx-auto max-w-5xl -mt-8 mb-4" />

      <div className="mx-auto max-w-5xl space-y-14 rounded-lg border border-[#001F58]/10 bg-white p-6 sm:p-10">
        {/* Encabezado */}
        <header className="max-w-3xl space-y-4">
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-[#001F58] tracking-tight">
            Todo el ecosistema aeronáutico, en un solo lugar.
          </h1>
          <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
            Estamos construyendo la próxima etapa de Ventas Aeronáuticas. Hoy podés publicar y encontrar aeronaves y
            repuestos, y ya tenés disponibles nuestras guías para comprar y vender con más seguridad. Muy pronto vas a
            encontrar también los servicios y profesionales que hacen posible que la aviación siga en el aire.
          </p>
        </header>

        {/* Disponible ahora: toda la pieza lleva a las guías (link que la cubre); el índice y el botón
            quedan por encima. Al pasar, borde rojo (sin elevación, por las pautas). */}
        <section aria-labelledby="available-now" className="space-y-4">
          <h2 id="available-now" className={`${LABEL} flex items-center gap-2 text-[#001F58]`}>
            <span className="h-2 w-2 rounded-full bg-emerald-600" aria-hidden />
            Disponible ahora
          </h2>
          <div className="group relative grid gap-6 rounded-lg border border-[#001F58]/15 p-6 transition-colors hover:border-[#E70F1F] sm:p-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)] lg:gap-10">
            <Link href={GUIDES_PATH} className="absolute inset-0 rounded-lg" aria-label="Ver las guías para comprar y vender" />
            <div className="space-y-3">
              <span className="inline-block rounded-sm bg-emerald-100 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-emerald-800">
                Disponible
              </span>
              <h3 className="text-2xl font-bold text-[#001F58]">Guías para comprar y vender</h3>
              <p className="text-sm leading-relaxed text-slate-600">
                Checklist de pre-compra, cómo vender más rápido, el trámite de transferencia ante ANAC y un glosario con
                TT, SMOH, TBO y más.
              </p>
              <Link
                href={GUIDES_PATH}
                className="relative z-10 mt-2 inline-flex min-h-11 items-center rounded-md bg-[#E70F1F] px-6 text-sm font-bold text-white transition-colors hover:bg-[#C20D1A]"
              >
                Ver las guías →
              </Link>
            </div>
            <div className="relative z-10">
              <GuideIndex guides={await getPublishedGuides()} />
            </div>
          </div>
        </section>

        {/* Próximamente: solo estas 6 son a futuro */}
        <section aria-labelledby="coming-soon" className="space-y-4">
          <h2 id="coming-soon" className={`${LABEL} flex items-center gap-2 text-[#001F58]`}>
            <span className="rounded-sm bg-[#E70F1F] px-2 py-1 text-[10px] font-black tracking-[0.14em] text-white">
              Próximamente
            </span>
            En camino
          </h2>
          <ol className="grid border-t border-[#001F58]/12 md:grid-cols-2 md:gap-x-10">
            {upcomingServices.map((service, i) => (
              <li key={service.title} className="grid grid-cols-[3.5rem_1fr] gap-x-3 border-b border-[#001F58]/12 py-4">
                <span className={`${LABEL} pt-0.5 text-slate-500 tabular-nums`}>SV-{String(i + 1).padStart(2, "0")}</span>
                <div>
                  <h3 className="text-base font-semibold text-[#001F58]">{service.title}</h3>
                  <p className="mt-0.5 text-sm leading-relaxed text-slate-600">{service.description}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        {/* Cierre */}
        <div className="rounded-lg border-l-4 border-[#E70F1F] bg-[#001F58] p-6 text-white sm:p-8">
          <h2 className="text-xl font-bold">
            <span aria-hidden className="mr-2 font-black tracking-tighter text-[#FF5A64]">
              {"//"}
            </span>
            Estamos recién despegando.
          </h2>
          <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-200">
            Nuestro objetivo es construir un punto de encuentro para todo el sector aeronáutico argentino: aeronaves,
            repuestos, servicios, profesionales, empresas y oportunidades. Hoy ya podés comprar, vender y consultar
            nuestras guías. El resto está en camino.
          </p>
        </div>
      </div>
    </main>
  );
}
