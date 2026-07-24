"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Check, Plane, Wrench, Zap, ArrowRight, ShieldCheck } from "lucide-react";

export default function PlansPage() {
  const [activeTab, setActiveTab] = useState<"aircraft" | "parts">("aircraft");

  // Definición de planes de Aeronaves (Base: $35.000)
  const aircraftPlans = [
    {
      id: "plane-1",
      name: "Posteo Individual",
      price: "$35.000",
      priceNum: 35000,
      postCount: "1 Posteo de Aeronave",
      badge: null,
      description: "Ideal para propietarios particulares que buscan vender su aeronave rápidamente.",
      popular: false,
      features: [
        "Publicación activa por 60 días",
        "Hasta 15 fotos de alta resolución",
        "Contacto directo vía WhatsApp y Email",
        "Inclusión en el buscador principal",
      ],
      buttonText: "Comprar 1 Posteo",
    },
    {
      id: "plane-3",
      name: "Pack 3 Aeronaves",
      price: "$94.500", // ~10% descuento ($31.500 c/u)
      priceNum: 94500,
      postCount: "3 Posteos de Aeronaves",
      badge: "Ahorrá 10%",
      description: "Pensado para hangares, vendedores frecuentes o propietarios con más de una unidad.",
      popular: true,
      features: [
        "3 Posteos de Aeronaves independientes",
        "Publicación activa por 90 días cada uno",
        "Hasta 20 fotos por publicación",
        "Mayor visibilidad en resultados de búsqueda",
        "Soporte prioritario para la carga",
      ],
      buttonText: "Comprar Pack 3",
    },
    {
      id: "plane-5",
      name: "Pack Broker (5 Aeronaves)",
      price: "$140.000", // ~20% descuento ($28.000 c/u)
      priceNum: 140000,
      postCount: "5 Posteos de Aeronaves",
      badge: "Ahorrá 20%",
      description: "Diseñado para brokers y empresas de aviación con rotación constante de flota.",
      popular: false,
      features: [
        "5 Posteos de Aeronaves",
        "Sin límite de tiempo de publicación",
        "Hasta 25 fotos e integración de video por posteo",
        "Panel de control para administración de consultas",
        "Publicación prioritaria destacada",
      ],
      buttonText: "Comprar Pack Broker",
    },
  ];

  // Definición de planes de Repuestos (Base: $4.500)
  const partsPlans = [
    {
      id: "part-1",
      name: "Posteo Individual",
      price: "$4.500",
      priceNum: 4500,
      postCount: "1 Posteo de Repuesto",
      badge: null,
      description: "Perfecto para vender una herramienta, aviónica o componente específico.",
      popular: false,
      features: [
        "Publicación activa por 60 días",
        "Hasta 5 fotos del repuesto",
        "Formulario directo de contacto",
        "Clasificación por categoría y N/P (Número de Parte)",
      ],
      buttonText: "Comprar 1 Posteo",
    },
    {
      id: "part-5",
      name: "Pack 5 Repuestos",
      price: "$19.000", // ~15% descuento ($3.800 c/u)
      priceNum: 19000,
      postCount: "5 Posteos de Repuestos",
      badge: "Ahorrá 15%",
      description: "Para mecánicos o talleres que renuevan stock de partes y componentes.",
      popular: true,
      features: [
        "5 Posteos de Repuestos",
        "Publicación activa por 90 días cada uno",
        "Hasta 8 fotos por repuesto",
        "Ubicación preferencial en el catálogo de repuestos",
      ],
      buttonText: "Comprar Pack 5",
    },
    {
      id: "part-15",
      name: "Pack Taller / Distribuidor",
      price: "$47.000", // ~30% descuento ($3.133 c/u)
      priceNum: 47000,
      postCount: "15 Posteos de Repuestos",
      badge: "Ahorrá 30%",
      description: "Solución integral para comercios y distribuidores aeronáuticos con amplio inventario.",
      popular: false,
      features: [
        "15 Posteos de Repuestos",
        "Sin fecha de vencimiento de las publicaciones",
        "Galería de fotos completa",
        "Soporte técnico para carga masiva de inventario",
      ],
      buttonText: "Comprar Pack Distribuidor",
    },
  ];

  const currentPlans = activeTab === "aircraft" ? aircraftPlans : partsPlans;

  return (
    <main className="relative isolate overflow-hidden min-h-screen -mb-16">
      {/* Fondo optimizado con la imagen bkg-plans.jpg */}
      <Image
        src="/bkg-plans.jpg"
        alt="Fondo Planes"
        fill
        priority
        className="-z-20 object-cover"
      />
      <div className="absolute inset-0 -z-10 bg-background/85" />

      <div className="container mx-auto px-4 pt-16 pb-36 max-w-6xl">
        {/* Encabezado Principal */}
        <div className="text-center max-w-3xl mx-auto mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#001F58]/10 border border-[#001F58]/20 text-[#001F58] text-xs font-semibold uppercase tracking-wider mb-4">
            <Zap className="w-4 h-4 text-red-600" />
            <span>Publicación Simple y Sin Comisiones</span>
          </div>
          <h1 className="font-heading text-3xl sm:text-5xl font-semibold text-[#001F58] mb-4">
            PLANES DE PUBLICACIÓN
          </h1>
          <p className="text-sm sm:text-base text-[#001F58]/80 leading-relaxed">
            Sin suscripciones ni cargos recurrentes. Elegí la cantidad de publicaciones que necesitas y usalas cuando quieras.
          </p>
        </div>

        {/* Selector de Pestañas: Aeronaves vs Repuestos */}
        <div className="flex justify-center mb-12">
          <div className="bg-white/80 p-1.5 rounded-2xl border border-[#001F58]/20 flex gap-2 shadow-sm backdrop-blur-sm">
            <button
              onClick={() => setActiveTab("aircraft")}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-semibold text-sm transition-all duration-200 ${
                activeTab === "aircraft"
                  ? "bg-[#001F58] text-white shadow-md"
                  : "text-[#001F58]/70 hover:text-[#001F58] hover:bg-[#001F58]/5"
              }`}
            >
              <Plane className="w-4 h-4" />
              <span>Posteos de Aviones</span>
            </button>
            <button
              onClick={() => setActiveTab("parts")}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-semibold text-sm transition-all duration-200 ${
                activeTab === "parts"
                  ? "bg-[#001F58] text-white shadow-md"
                  : "text-[#001F58]/70 hover:text-[#001F58] hover:bg-[#001F58]/5"
              }`}
            >
              <Wrench className="w-4 h-4" />
              <span>Posteos de Repuestos</span>
            </button>
          </div>
        </div>

        {/* Grilla de Planes */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-stretch mb-16">
          {currentPlans.map((plan) => (
            <div
              key={plan.id}
              className={`relative flex flex-col rounded-2xl p-7 transition-all duration-300 border ${
                plan.popular
                  ? "bg-[#001F58]/95 text-white border-red-600 shadow-2xl scale-105 backdrop-blur-sm"
                  : "bg-white/90 text-[#001F58] border-[#001F58]/20 hover:bg-white shadow-md backdrop-blur-sm"
              }`}
            >
              {/* Insignia de Más Popular */}
              {plan.popular && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-red-600 text-white text-[11px] font-bold uppercase tracking-wider px-3.5 py-1 rounded-full shadow-sm">
                  Más Elegido
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
                  {plan.badge && (
                    <span
                      className={`text-xs font-bold px-2 py-0.5 rounded border ${
                        plan.popular
                          ? "bg-white/10 text-white border-white/20"
                          : "bg-red-50 text-red-600 border-red-200"
                      }`}
                    >
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
                    / pago único
                  </span>
                </div>
                <div
                  className={`mt-3 inline-block px-3 py-1 rounded-md text-xs font-semibold ${
                    plan.popular
                      ? "bg-white/10 text-white border border-white/20"
                      : "bg-[#001F58]/5 text-[#001F58] border border-[#001F58]/10"
                  }`}
                >
                  {plan.postCount}
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

              {/* Botón */}
              <Link
                href={`/checkout?planId=${plan.id}`}
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

        {/* Garantía / Aviso de Uso */}
        <div className="bg-white/80 border border-[#001F58]/20 rounded-2xl p-6 backdrop-blur-sm max-w-3xl mx-auto flex flex-col sm:flex-row items-center gap-5 shadow-sm">
          <div className="bg-[#001F58] p-3 rounded-xl text-white shrink-0">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div className="text-center sm:text-left">
            <h4 className="font-heading font-semibold text-[#001F58] text-base mb-1">
              Publicá a tu propio ritmo
            </h4>
            <p className="text-xs sm:text-sm text-[#001F58]/80 leading-relaxed">
              Los créditos adquiridos quedan asignados a tu cuenta de usuario sin fecha de vencimiento inmediata para su consumo, dándote flexibilidad total para publicar tu inventario.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}