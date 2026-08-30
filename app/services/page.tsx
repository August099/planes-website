import Image from "next/image";
import {
  Users,
  Wrench,
  Building2,
  CalendarDays,
  Briefcase,
  Rocket,
  MessageSquareCode,
} from "lucide-react";

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
      {/* Fondo adaptado igual al resto de las páginas */}
      <div className="fixed inset-0 -z-10 pointer-events-none">
        <Image
          src="/bkg-forms.png"
          alt="Fondo Servicios"
          fill
          priority
          className="object-cover"
        />
        <div className="absolute inset-0 bg-background/85" />
      </div>

      <div className="relative max-w-4xl mx-auto space-y-10 bg-white/70 backdrop-blur-md p-6 sm:p-10 rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
        {/* Cinta / Solapa Diagonal "PRÓXIMAMENTE" arriba a la derecha */}
        <div className="absolute top-0 right-0 w-36 h-36 overflow-hidden pointer-events-none z-20">
            <div className="absolute top-6 -right-10 w-44 bg-[#E70F1F] text-white text-[10px] font-black uppercase tracking-widest text-center py-1.5 rotate-45 shadow-md">
            Próximamente
            </div>
        </div>
        {/* Encabezado Principal */}
        <div className="text-center space-y-4">
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-[#001F58] tracking-tight">
            Todo el ecosistema aeronáutico, en un solo lugar.
          </h1>
          <p className="text-sm sm:text-base text-slate-600 max-w-2xl mx-auto leading-relaxed">
            Estamos construyendo la próxima etapa de Ventas Aeronáuticas. Hoy
            podés encontrar y publicar aeronaves y repuestos. Muy pronto,
            también vas a poder encontrar los servicios y profesionales que hacen
            posible que la aviación siga en el aire.
          </p>
        </div>

        {/* Grilla de Próximos Servicios */}
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
              profesionales, empresas y oportunidades. Hoy empezamos con el
              sitio de clasificados. El resto está en camino.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}