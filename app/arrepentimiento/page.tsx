import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth-helpers";
import { PageBackground } from "@/components/ui/PageBackground";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";

export const metadata: Metadata = {
  title: "Botón de arrepentimiento",
  description: "Pedí la devolución de una compra hecha en Ventas Aeronáuticas dentro de los 10 días corridos desde el pago.",
  alternates: { canonical: "/arrepentimiento" },
};

// VA-125: acceso al botón de arrepentimiento desde el pie de todas las páginas (Resolución 424/2020).
// Con sesión, lleva directo a "Mis compras"; sin sesión, explica cómo hacerlo y pide iniciar sesión.
export default async function WithdrawalPage() {
  const user = await getCurrentUser();
  if (user?.id) redirect("/settings#compras"); // VA-175: "Mis compras" está en Ajustes

  return (
    <main className="relative isolate overflow-hidden min-h-screen">
      <PageBackground page="legal" />
      <div className="container mx-auto max-w-3xl px-4 pt-6 pb-20">
        <Breadcrumbs items={[{ label: "Botón de arrepentimiento" }]} className="mb-8 sm:mb-12" />
        <section className="rounded-lg border border-[#00205B]/12 bg-white p-6 sm:p-8">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Derecho de arrepentimiento</p>
          <h1 className="mt-1 font-heading text-2xl sm:text-3xl font-semibold text-[#00205B]">Botón de arrepentimiento</h1>
          <p className="mt-4 text-sm leading-relaxed text-slate-700">
            Podés arrepentirte de la contratación de una suscripción (Pro o Broker / Empresa) dentro de los <strong>10 días corridos</strong>
            desde el pago, sin dar explicaciones y sin costo. Te devolvemos el total por Mercado Pago, la suscripción termina y volvés al
            plan Base. Publicar dentro del cupo de Base no tiene costo.
          </p>
          <ol className="mt-6 divide-y divide-[#00205B]/10 rounded-lg border border-[#00205B]/12 text-sm">
            {["Iniciá sesión con la cuenta con la que pagaste.", "Entrá a Ajustes, en la sección Mis compras.", "En el pago, tocá “Arrepentirme” y confirmá."].map((step, i) => (
              <li key={step} className="flex gap-3 px-4 py-3">
                <span className="w-5 shrink-0 font-semibold tabular-nums text-[#D62828]">{String(i + 1).padStart(2, "0")}</span>
                <span className="text-slate-700">{step}</span>
              </li>
            ))}
          </ol>
          <Link
            href="/login?callbackUrl=%2Farrepentimiento"
            className="mt-6 inline-flex min-h-11 items-center rounded-md bg-[#00205B] px-5 text-sm font-bold text-white hover:bg-[#001331]"
          >
            Iniciar sesión para continuar
          </Link>
          <p className="mt-4 text-xs text-slate-500">
            ¿No podés entrar a tu cuenta? Escribinos a los datos de contacto del pie de la página y lo resolvemos.
          </p>
        </section>
      </div>
    </main>
  );
}
