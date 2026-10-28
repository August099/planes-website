import type { Metadata } from "next";
import Link from "next/link";
import { PageBackground } from "@/components/ui/PageBackground";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { SuggestionForm } from "./SuggestionForm";
import { PageHeader } from "@/components/ui/PageHeader";
import { CONTACT_PHONE } from "@/lib/site";

export const metadata: Metadata = {
  title: "Nosotros",
  description:
    "Ventas Aeronáuticas es el marketplace argentino de aeronaves y repuestos, nacido en 2026 en Chajarí, Entre Ríos. Conocé nuestra misión, visión y valores.",
  alternates: { canonical: "/about" },
};

const LABEL = "text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500";

// VA-122: página "Nosotros" con los textos de los socios (26/10). Estructura: quiénes somos, misión,
// visión y valores, cómo funciona, hoy y mañana, y el formulario de sugerencias con los contactos.
const PILLARS: { code: string; title: string; text?: string; items?: { title: string; text: string }[] }[] = [
  {
    code: "01",
    title: "Nuestra misión",
    text: "Ofrecer un marketplace aeronáutico eficiente y dinámico que haga más simple publicar, encontrar y vender aeronaves y repuestos.",
  },
  {
    code: "02",
    title: "Nuestra visión",
    text: "Ser un marketplace aeronáutico líder a nivel mundial, con estándares de calidad y seguridad en cada publicación.",
  },
  {
    code: "03",
    title: "Nuestros valores",
    items: [
      { title: "Calidad y pasión", text: "nos esmeramos en ofrecer un servicio de alta calidad, hecho por gente que vive la aviación." },
      { title: "Compromiso", text: "hacer las cosas bien y mejorar todos los días." },
      {
        title: "Orientación al usuario",
        text: "guías, herramientas y una navegación simple para que publicar y buscar sea fácil para todos.",
      },
    ],
  },
];

const HOW_IT_WORKS = [
  { title: "Publicás gratis", text: "todas las cuentas pueden tener 1 avión y 3 repuestos publicados al mismo tiempo, sin vencimiento." },
  { title: "Sin intermediarios ni comisiones", text: "los compradores te contactan directo por WhatsApp, teléfono o email." },
  { title: "Fichas técnicas completas", text: "horas, motor, hélice, aviónica y documentación, para comparar con datos reales." },
  {
    title: "Para quienes venden más",
    text: "los planes Pro y Broker suman publicaciones, mayor visibilidad, métricas y una página personalizada.",
  },
];

const CONTACT = [
  { label: "WhatsApp", value: CONTACT_PHONE.display, href: `https://wa.me/${CONTACT_PHONE.e164.replace("+", "")}` },
  { label: "Instagram", value: "@ventas.aeronauticas", href: "https://instagram.com/ventas.aeronauticas" },
  { label: "Email", value: "aeronauticasventas@gmail.com", href: "mailto:aeronauticasventas@gmail.com" },
];

export default function AboutPage() {
  return (
    <main className="relative isolate overflow-hidden min-h-screen">
      <PageBackground page="faq" />
      <div className="container mx-auto max-w-6xl px-4 pt-6 pb-20">
        <Breadcrumbs items={[{ label: "Nosotros" }]} className="mb-6" />
        <PageHeader variant="plain"
          routeId="va-route-about"
          className="mb-10"
          title="Nosotros"
          subtitle="Somos el marketplace argentino de aeronaves y repuestos aeronáuticos."
        />

        <div className="grid gap-10 md:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
          <section>
            <h2 className={LABEL}>Quiénes somos</h2>
            <div className="mt-3 max-w-2xl space-y-4 text-base leading-relaxed text-slate-700">
              <p>
                Ventas Aeronáuticas nació en 2026 en Chajarí, Entre Ríos, como una startup argentina de comercio electrónico pensada solo
                para la aviación.
              </p>
              <p>
                Durante años, comprar o vender un avión en el país dependió de grupos de WhatsApp, avisos dispersos y de conocer a la
                persona indicada. Creamos un lugar donde encontrar aeronaves y repuestos de todo el país, con la información técnica que
                importa, y contactar directo con quien vende.
              </p>
            </div>

            <ol className="mt-10 divide-y divide-[#00205B]/10 rounded-lg border border-[#00205B]/12 bg-white">
              {PILLARS.map((p) => (
                <li key={p.code} className="flex gap-4 px-5 py-4">
                  <span className="w-6 shrink-0 font-semibold tabular-nums text-[#D62828]">{p.code}</span>
                  <div>
                    <h2 className="text-sm font-bold text-[#00205B]">{p.title}</h2>
                    {p.text && <p className="mt-1 text-sm leading-relaxed text-slate-600">{p.text}</p>}
                    {p.items && (
                      <ul className="mt-2 space-y-1.5 text-sm leading-relaxed text-slate-600">
                        {p.items.map((item) => (
                          <li key={item.title}>
                            <strong className="font-semibold text-[#00205B]">{item.title}:</strong> {item.text}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </li>
              ))}
            </ol>

            <h2 className={`${LABEL} mt-10`}>Cómo funciona</h2>
            <ul className="mt-3 divide-y divide-[#00205B]/10 rounded-lg border border-[#00205B]/12 bg-white">
              {HOW_IT_WORKS.map((item) => (
                <li key={item.title} className="px-5 py-4 text-sm leading-relaxed text-slate-600">
                  <strong className="font-semibold text-[#00205B]">{item.title}:</strong> {item.text}
                </li>
              ))}
            </ul>

            <h2 className={`${LABEL} mt-10`}>Hoy y mañana</h2>
            <p className="mt-3 max-w-2xl text-base leading-relaxed text-slate-700">
              Hoy reunimos aeronaves y repuestos. Mañana, todo el ecosistema aeronáutico en un solo lugar: hangares, talleres, profesionales y
              servicios.
            </p>

            <p className="mt-6 text-sm text-slate-600">
              ¿Tenés una consulta puntual? Mirá las{" "}
              <Link href="/faq" className="font-semibold text-[#00205B] hover:text-[#D62828] hover:underline">
                preguntas frecuentes
              </Link>{" "}
              o escribinos por cualquiera de nuestros contactos.
            </p>
          </section>

          <section aria-labelledby="sugerencias" className="h-fit rounded-lg border border-[#00205B]/12 bg-white p-6">
            <p className={LABEL}>Sugerencias</p>
            <h2 id="sugerencias" className="mt-1 scroll-mt-32 text-lg font-bold text-[#00205B]">
              Ayudanos a mejorar
            </h2>
            <p className="mt-2 mb-5 text-sm text-slate-600">
              ¿Qué te gustaría que agreguemos? ¿Qué te costó o qué te faltó? Escribinos: leemos cada mensaje y lo usamos para mejorar la
              plataforma.
            </p>
            <SuggestionForm />

            <h2 className={`${LABEL} mt-8 border-t border-[#00205B]/10 pt-6`}>Contacto</h2>
            <dl className="mt-3 space-y-2 text-sm">
              {CONTACT.map((c) => (
                <div key={c.label} className="flex items-center justify-between gap-3">
                  <dt className="text-slate-500">{c.label}</dt>
                  <dd className="min-w-0 truncate">
                    <a
                      href={c.href}
                      target={c.href.startsWith("http") ? "_blank" : undefined}
                      rel={c.href.startsWith("http") ? "noopener noreferrer" : undefined}
                      className="font-semibold text-[#00205B] hover:text-[#D62828] hover:underline"
                    >
                      {c.value}
                    </a>
                  </dd>
                </div>
              ))}
            </dl>
          </section>
        </div>
      </div>
    </main>
  );
}
