import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { CALCULATORS, calculatorBySlug } from "@/lib/aero/calculators";
import { CALCULATORS_PATH } from "@/lib/flight-plan-flag";
import { CalculatorView } from "@/components/flight-plan/calculators/CalculatorView";

type Props = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return CALCULATORS.map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const calculator = calculatorBySlug((await params).slug);
  if (!calculator) return {};
  return { title: `${calculator.name} · Calculadoras`, description: calculator.description, robots: { index: false, follow: false } };
}

export default async function CalculatorPage({ params }: Props) {
  const calculator = calculatorBySlug((await params).slug);
  if (!calculator) notFound();
  return (
    <article>
      <Link href={CALCULATORS_PATH} className="inline-flex min-h-11 items-center text-sm font-semibold text-[#00205B] underline underline-offset-2 hover:text-[#D62828]">
        Todas las calculadoras
      </Link>
      <h2 className="mt-1 font-heading text-2xl font-bold text-[#00205B]">{calculator.name}</h2>
      <p className="mb-5 mt-1 text-sm text-slate-700">{calculator.description}</p>
      <Suspense fallback={<p className="text-sm text-slate-600">Cargando la calculadora…</p>}>
        <CalculatorView slug={calculator.slug} />
      </Suspense>
    </article>
  );
}
