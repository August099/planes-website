"use client";

import Link from "next/link";
import Image from "next/image";
import { Check, Megaphone, Target, BarChart3, Zap, ArrowRight, ShieldCheck } from "lucide-react";

export default function AdsPage() {
  const adPlans = [
    {
      id: "ad-banner-lateral",
      name: "Banner Lateral / Búsqueda",
      price: "$25.000",
      duration: "por 30 días",
      badge: null,
      description: "Ideal para empresas, talleres o servicios aeronáuticos que buscan presencia continua.",
      popular: false,
      features: [
        "Ubicación destacada en el lateral de búsquedas",
        "Enlace directo a tu sitio web o WhatsApp",
        "Formato de imagen de alta calidad",
        "Métricas de impresiones y clics acumulados",
      ],
      buttonText: "Contratar Banner Lateral",
    },
    {
      id: "ad-banner-principal",
      name: "Banner Principal Home",
      price: "$55.000",
      duration: "por 30 días",
      badge: "Máxima Visibilidad",
      description: "Ubicación VIP en la portada principal del sitio. Cautiva a todos los visitantes que ingresan.",
      popular: true,
      features: [
        "Ubicación privilegiada en la página de inicio (Home)",
        "Formato horizontal panorámico HD",
        "Enlace directo personalizado a tu oferta",
        "Soporte de diseño para adaptar tu pieza publicitaria",
        "Inclusión en nuestro newsletter mensual a pilotos",
      ],
      buttonText: "Contratar Banner Principal",
    },
    {
      id: "ad-pack-anual",
      name: "Sponsor Institucional",
      price: "$180.000",
      duration: "por 6 meses",
      badge: "Ahorrá 45%",
      description: "Para marcas y empresas que desean posicionamiento líder en la industria aeronáutica.",
      popular: false,
      features: [
        "Banner rotativo en Home + Secciones de catálogo",
        "Presencia destacada permanente por 6 meses",
        "Aparición preferencial en contenidos y newsletters",
        "Reportes mensuales de rendimiento y alcance",
        "Mantenimiento y actualización gratuita de arte",
      ],
      buttonText: "Ser Sponsor Oficial",
    },
  ];

  return (
    <main className="relative isolate overflow-hidden min-h-screen -mb-16">
      {/* Fondo optimizado con la imagen bkg-ads.jpg */}
      <Image
        src="/bkg-ads.jpg"
        alt="Fondo Publicidad"
        fill
        priority
        className="-z-20 object-cover"
      />
      <div className="absolute inset-0 -z-10 bg-background/85" />

      <div className="container mx-auto px-4 pt-16 pb-36 max-w-6xl">
        {/* Encabezado Principal */}
        <div className="text-center max-w-3xl mx-auto mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#001F58]/10 border border-[#001F58]/20 text-[#001F58] text-xs font-semibold uppercase tracking-wider mb-4">
            <Megaphone className="w-4 h-4 text-red-600" />
            <span>Publicidad y Posicionamiento de Marca</span>
          </div>
          <h1 className="font-heading text-3xl sm:text-5xl font-semibold text-[#001F58] mb-4">
            ESPACIOS PUBLICITARIOS
          </h1>
          <p className="text-sm sm:text-base text-[#001F58]/80 leading-relaxed">
            Llegá directamente a pilotos, propietarios de aeronaves, escuelas de vuelo y empresas del sector aeronáutico en todo el país.
          </p>
        </div>

        {/* Pilares del Servicio Publicitario */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-12">
          <div className="bg-white/80 border border-[#001F58]/20 rounded-xl p-4 backdrop-blur-sm flex items-center gap-3">
            <div className="bg-[#001F58]/10 p-2.5 rounded-lg text-[#001F58] shrink-0">
              <Target className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <h4 className="font-heading font-semibold text-[#001F58] text-sm">Audiencia 100% Nicho</h4>
              <p className="text-xs text-[#001F58]/70">Llegá únicamente a usuarios interesados en aviación.</p>
            </div>
          </div>

          <div className="bg-white/80 border border-[#001F58]/20 rounded-xl p-4 backdrop-blur-sm flex items-center gap-3">
            <div className="bg-[#001F58]/10 p-2.5 rounded-lg text-[#001F58] shrink-0">
              <BarChart3 className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <h4 className="font-heading font-semibold text-[#001F58] text-sm">Alto Impacto Visual</h4>
              <p className="text-xs text-[#001F58]/70">Ubicaciones clave diseñadas para convertir clics.</p>
            </div>
          </div>

          <div className="bg-white/80 border border-[#001F58]/20 rounded-xl p-4 backdrop-blur-sm flex items-center gap-3">
            <div className="bg-[#001F58]/10 p-2.5 rounded-lg text-[#001F58] shrink-0">
              <Zap className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <h4 className="font-heading font-semibold text-[#001F58] text-sm">Activación Inmediata</h4>
              <p className="text-xs text-[#001F58]/70">Subí tu banner y comenzá a recibir tráfico en 24hs.</p>
            </div>
          </div>
        </div>

        {/* Grilla de Planes de Publicidad */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-stretch mb-16">
          {adPlans.map((plan) => (
            <div
              key={plan.id}
              className={`relative flex flex-col rounded-2xl p-7 transition-all duration-300 border ${
                plan.popular
                  ? "bg-[#001F58]/95 text-white border-red-600 shadow-2xl scale-105 backdrop-blur-sm"
                  : "bg-white/90 text-[#001F58] border-[#001F58]/20 hover:bg-white shadow-md backdrop-blur-sm"
              }`}
            >
              {/* Insignia de Más Elegido / Destacado */}
              {plan.popular && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-red-600 text-white text-[11px] font-bold uppercase tracking-wider px-3.5 py-1 rounded-full shadow-sm">
                  {plan.badge}
                </div>
              )}

              {/* Título y Descripción */}
              <div className="mb-6">
                <div className="flex justify-between items-start mb-2">
                  <h3
                    className={`font-heading text-xl font-semibold ${
                      plan.popular ? "text-white" : "text-[#001F58]"
                    }`}
                  >
                    {plan.name}
                  </h3>
                  {!plan.popular && plan.badge && (
                    <span className="text-xs font-bold px-2 py-0.5 rounded border bg-red-50 text-red-600 border-red-200">
                      {plan.badge}
                    </span>
                  )}
                </div>
                <p
                  className={`text-xs sm:text-sm h-10 leading-relaxed ${
                    plan.popular ? "text-white/80" : "text-[#001F58]/70"
                  }`}
                >
                  {plan.description}
                </p>
              </div>

              {/* Precio */}
              <div
                className={`mb-6 pb-6 border-b ${
                  plan.popular ? "border-white/15" : "border-[#001F58]/15"
                }`}
              >
                <div className="flex items-baseline gap-1">
                  <span
                    className={`font-heading text-4xl font-bold ${
                      plan.popular ? "text-white" : "text-[#001F58]"
                    }`}
                  >
                    {plan.price}
                  </span>
                  <span
                    className={`text-xs ${
                      plan.popular ? "text-white/70" : "text-[#001F58]/60"
                    }`}
                  >
                    / {plan.duration}
                  </span>
                </div>
              </div>

              {/* Beneficios */}
              <ul className="space-y-3 mb-8 flex-1">
                {plan.features.map((feature, idx) => (
                  <li key={idx} className="flex items-start gap-2.5 text-xs sm:text-sm">
                    <Check
                      className={`w-4 h-4 shrink-0 mt-0.5 ${
                        plan.popular ? "text-red-400" : "text-red-600"
                      }`}
                    />
                    <span
                      className={plan.popular ? "text-white/90" : "text-[#001F58]/80"}
                    >
                      {feature}
                    </span>
                  </li>
                ))}
              </ul>

              {/* Botón de Acción */}
              <Link
                href={`/contact?reason=advertising&plan=${plan.id}`}
                className={`w-full py-3 px-5 rounded-xl font-medium text-sm text-center transition-all duration-200 flex items-center justify-center gap-2 ${
                  plan.popular
                    ? "bg-red-600 hover:bg-red-700 text-white shadow-md"
                    : "bg-[#001F58] hover:bg-[#001F58]/90 text-white shadow-sm"
                }`}
              >
                <span>{plan.buttonText}</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          ))}
        </div>

        {/* Banner o Consultas Personalizadas */}
        <div className="bg-white/80 border border-[#001F58]/20 rounded-2xl p-6 backdrop-blur-sm max-w-3xl mx-auto flex flex-col sm:flex-row items-center gap-5 shadow-sm">
          <div className="bg-[#001F58] p-3 rounded-xl text-white shrink-0">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div className="text-center sm:text-left">
            <h4 className="font-heading font-semibold text-[#001F58] text-base mb-1">
              ¿Necesitás una propuesta a medida?
            </h4>
            <p className="text-xs sm:text-sm text-[#001F58]/80 leading-relaxed">
              Diseñamos campañas específicas para eventos aeronáuticos, marcas globales o lanzamientos de productos. Escribinos directamente a <a href="mailto:aeronauticasventas@gmail.com" className="font-semibold underline hover:text-[#001F58]">aeronauticasventas@gmail.com</a>.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}