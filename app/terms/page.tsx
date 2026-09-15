// app/terms/page.tsx
import Image from "next/image";
import { TermsContent, termsSections } from "@/lib/terms-content";

export default function TerminosPage() {
  return (
    <main className="relative isolate overflow-hidden min-h-screen -mb-16">
      <Image
        src="/bkg-terms.jpg"
        alt=""
        fill
        priority
        className="-z-20 object-cover"
      />
      <div className="absolute inset-0 -z-10 bg-background/85" />

      <div className="container mx-auto px-4 pt-20 pb-36 max-w-6xl">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 items-start">
          <aside className="md:col-span-1 flex flex-col gap-2 border-l border-[#001F58]/20 pl-4 md:sticky md:top-24">
            <p className="text-xs font-semibold text-[#001F58]/50 uppercase tracking-wider mb-2">
              Índice
            </p>
            {termsSections.map((section) => (
              <a
                key={section.id}
                href={`#${section.id}`}
                className="text-sm py-1.5 font-medium text-[#001F58]/70 hover:text-[#001F58] transition-colors scroll-smooth"
              >
                {section.title}
              </a>
            ))}
          </aside>

          <section className="md:col-span-3">
            <h1 className="font-heading text-3xl sm:text-4xl font-semibold text-[#001F58] mb-2">
              TÉRMINOS Y CONDICIONES DE USO
            </h1>
            <p className="text-sm text-[#001F58]/60 mb-12 border-b border-[#001F58]/20 pb-4">
              <strong>Última actualización:</strong> Julio 2026.
            </p>

            <div className="max-w-3xl font-sans text-sm">
              <TermsContent />
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}