import type { Metadata } from "next";
import Link from "next/link";
import { PageBackground } from "@/components/ui/PageBackground";
import { GUIDES, GUIDES_PATH, guidePath } from "@/lib/guides";
import {
  ArrowRight,
  BookOpen,
  Users,
  Wrench,
  Building2,
  CalendarDays,
  Briefcase,
  Rocket,
  MessageSquareCode,
} from "lucide-react";

export const metadata: Metadata = {
  // El layout agrega " | Ventas Aeronáuticas".
  title: "Servicios aeronáuticos",
  description:
    "Guías para comprar y vender aeronaves (pre-compra, transferencia ante ANAC y glosario) y, muy pronto, talleres, hangares, profesionales y empresas del sector.",
  alternates: { canonical: "/services" },
};

export default function ServicesPage() {
  const upcomingServices = [
    {
      title: "Pilotos y profesionales",
      description:
        "Encontrá pilotos, mecánicos, instructores y especialistas del sector.",
      icon: Users,
    },
    {
      title: "Talleres y mantenimiento",
      description:
        "Conectate con talleres, servicios de mantenimiento y reparación aeronáutica.",
      icon: Wrench,
    },
    {
      title: "Hangares y espacios",
      description:
        "Encontrá hangares, espacios disponibles y servicios relacionados.",
      icon: Building2,
    },
    {
      title: "Eventos y actividades",
      description:
        "Descubrí eventos, encuentros, ferias y actividades de la comunidad aeronáutica.",
      icon: CalendarDays,
    },
    {
      title: "Empresas y servicios",
      description:
        "Conocé empresas y profesionales que ofrecen productos y servicios para el sector.",
      icon: Briefcase,
    },
    {
      title: "Foro de la comunidad",
      description:
        "Participá de debates, consultas técnicas, historias y novedades con otros apasionados de la aviación.",
      icon: MessageSquareCode,
    },
  ];

  return (
    <main className="relative min-h-[calc(100vh-80px)] container mx-auto px-4 py-12 pb-20">
      <PageBackground page="default" />

      <div className="relative max-w-4xl mx-auto space-y-10 bg-white/70 backdrop-blur-md p-6 sm:p-10 rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
        {/* Encabezado Principal */}
        <div className="text-center space-y-4">
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-[#001F58] tracking-tight">
            Todo el ecosistema aeronáutico, en un solo lugar.
          </h1>
          <p className="text-sm sm:text-base text-slate-600 max-w-2xl mx-auto leading-relaxed">
            Estamos construyendo la próxima etapa de Ventas Aeronáuticas. Hoy
            podés publicar y encontrar aeronaves y repuestos, y ya tenés
            disponibles nuestras guías para comprar y vender con más seguridad.
            Muy pronto vas a encontrar también los servicios y profesionales que
            hacen posible que la aviación siga en el aire.
          </p>
        </div>

        {/* Disponible ahora: las guías (cambio sobre VA-78). Toda la tarjeta lleva a /services/guides
            con un link que la cubre; los links a cada guía y el botón van por encima. */}
        <section aria-labelledby="available-now" className="space-y-4">
          <h2
            id="available-now"
            className="flex items-center gap-2 text-lg font-bold text-[#001F58]"
          >
            Disponible ahora
          </h2>
          <div className="group relative rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm transition-[transform,box-shadow,border-color] duration-200 hover:-translate-y-0.5 hover:border-[#E70F1F] hover:shadow-md motion-reduce:transition-none motion-reduce:hover:translate-y-0 sm:p-8">
            <Link
              href={GUIDES_PATH}
              className="absolute inset-0 rounded-2xl"
              aria-label="Ver las guías para comprar y vender"
            />
            <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
              <div className="w-fit rounded-xl bg-[#001F58]/10 p-4 text-[#001F58]">
                <BookOpen className="h-8 w-8" aria-hidden />
              </div>
              <div className="flex-1 space-y-3">
                <span className="inline-block rounded-full bg-emerald-100 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-emerald-800">
                  Disponible
                </span>
                <h3 className="text-xl font-bold text-[#001F58] sm:text-2xl">
                  Guías para comprar y vender
                </h3>
                <p className="text-sm leading-relaxed text-slate-600">
                  Checklist de pre-compra, cómo vender más rápido, el trámite de
                  transferencia ante ANAC y un glosario con TT, SMOH, TBO y más.
                </p>
                <ul className="grid gap-x-6 gap-y-1.5 text-sm sm:grid-cols-2">
                  {GUIDES.map((g) => (
                    <li key={g.slug}>
                      <Link
                        href={guidePath(g.slug)}
                        className="relative z-10 font-medium text-[#001F58] hover:text-[#C20D1A] hover:underline"
                      >
                        {g.title}
                      </Link>
                    </li>
                  ))}
                </ul>
                <Link
                  href={GUIDES_PATH}
                  className="relative z-10 mt-2 inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#E70F1F] px-6 text-sm font-bold text-white transition-colors hover:bg-[#C20D1A]"
                >
                  Ver las guías <ArrowRight className="h-4 w-4" aria-hidden />
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Próximamente: solo estas 6 tarjetas son a futuro */}
        <section aria-labelledby="coming-soon" className="space-y-4">
          <h2
            id="coming-soon"
            className="flex items-center gap-2 text-lg font-bold text-[#001F58]"
          >
            <span className="rounded-full bg-[#E70F1F] px-3 py-1 text-[10px] font-black uppercase tracking-widest text-white shadow-sm">
              Próximamente
            </span>
            En camino
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {upcomingServices.map((service, index) => {
              const Icon = service.icon;
              return (
                <div
                  key={index}
                  className="p-6 rounded-2xl bg-white/70 backdrop-blur-md border border-slate-200/80 shadow-sm hover:shadow-md transition-all duration-300 flex flex-col justify-between space-y-3"
                >
                  <div className="p-3 bg-[#001F58]/10 text-[#001F58] w-fit rounded-xl">
                    <Icon className="w-6 h-6" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="font-bold text-base text-[#001F58]">
                      {service.title}
                    </h3>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      {service.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Cierre / Mensaje Final */}
        <div className="p-8 rounded-2xl bg-[#001F58] text-white shadow-xl space-y-3 text-center md:text-left flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <h2 className="text-xl font-bold flex items-center justify-center md:justify-start gap-2">
              <Rocket className="w-5 h-5 text-red-500" />
              Estamos recién despegando.
            </h2>
            <p className="text-xs sm:text-sm text-slate-200 leading-relaxed">
              Nuestro objetivo es construir un punto de encuentro para todo el
              sector aeronáutico argentino: aeronaves, repuestos, servicios,
              profesionales, empresas y oportunidades. Hoy ya podés comprar,
              vender y consultar nuestras guías. El resto está en camino.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
