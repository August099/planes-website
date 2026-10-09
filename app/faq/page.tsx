import type { Metadata } from "next";
import { JsonLd } from "@/components/seo/JsonLd";
import { faqPageJsonLd } from "@/lib/structured-data";
import { PageBackground } from "@/components/ui/PageBackground";

const faqs = [
  { id: "pregunta-1", question: "Pregunta 1", answer: "Respuesta 1" },
  { id: "pregunta-2", question: "Pregunta 2", answer: "Respuesta 2" },
  { id: "pregunta-3", question: "Pregunta 3", answer: "Respuesta 3" },
  { id: "pregunta-4", question: "Pregunta 4", answer: "Respuesta 4" },
  { id: "pregunta-5", question: "Pregunta 5", answer: "Respuesta 5" },
  { id: "pregunta-6", question: "Pregunta 6", answer: "Respuesta 6" },
];

export const metadata: Metadata = {
  title: "Preguntas frecuentes",
  description: "Respuestas sobre cómo comprar, vender y publicar aviones y repuestos aeronáuticos en Ventas Aeronáuticas.",
  alternates: { canonical: "/faq" },
};

export default function FAQPage() {
  // FAQPage solo con preguntas reales: hoy la página tiene texto de ejemplo
  // ("Pregunta 1" / "Respuesta 1"), que no se publica como dato estructurado.
  const realFaqs = faqs.filter(
    (faq) => !/^Pregunta \d+$/.test(faq.question.trim()) && !/^Respuesta \d+$/.test(faq.answer.trim())
  );

  return (
    <main className="relative isolate overflow-hidden min-h-screen">
      {realFaqs.length > 0 && <JsonLd data={faqPageJsonLd(realFaqs)} />}
      <PageBackground page="faq" />

      <div className="container mx-auto px-4 pt-20 pb-20 max-w-6xl">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 items-start">
          
          <aside className="md:col-span-1 flex flex-col gap-2 border-l border-[#001F58]/20 pl-4 md:sticky md:top-24">
            <p className="text-xs font-semibold text-[#001F58]/50 uppercase tracking-wider mb-2">
              Preguntas
            </p>
            {faqs.map((faq) => (
              <a
                key={faq.id}
                href={`#${faq.id}`}
                className="text-sm py-1.5 font-medium text-[#001F58]/70 hover:text-[#001F58] transition-colors scroll-smooth"
              >
                {faq.question}
              </a>
            ))}
          </aside>

          <section className="md:col-span-3">
            <h1 className="font-heading text-3xl sm:text-4xl font-semibold text-[#001F58] mb-2">
              PREGUNTAS FRECUENTES
            </h1>
            <p className="text-sm text-[#001F58]/60 mb-12 border-b border-[#001F58]/20 pb-4">
              Todo lo que necesitás saber antes de comprar o publicar
            </p>

            <div className="flex flex-col gap-10">
              {faqs.map((faq) => (
                <div 
                  key={faq.id} 
                  id={faq.id} 
                  className="flex flex-col gap-2 scroll-mt-24" // scroll-mt evita que el header tape el título al hacer clic
                >
                  <h2 className="font-heading text-lg font-semibold text-[#001F58]">
                    {faq.question}
                  </h2>
                  <p className="font-sans text-sm text-[#001F58]/80 leading-relaxed max-w-3xl">
                    {faq.answer}
                  </p>
                </div>
              ))}
            </div>
          </section>

        </div>
      </div>
    </main>
  );
}
