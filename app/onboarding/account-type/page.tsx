import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-helpers";
import { PageBackground } from "@/components/ui/PageBackground";
import { USER_TYPE_OPTIONS } from "@/lib/user-types";
import { chooseAccountTypeAction } from "./actions";

export const metadata: Metadata = {
  title: "Tu tipo de cuenta",
  robots: { index: false, follow: false },
};

const HINTS: Record<string, string> = {
  PARTICULAR: "Vendés o comprás tu propia aeronave o repuestos.",
  RESELLER: "Publicás como empresa, taller, escuela o broker.",
};

interface Props {
  searchParams: Promise<{ error?: string; from?: string }>;
}

// VA-87: después del primer login con Google (pages.newUser en lib/auth.ts) se elige el tipo de
// cuenta una sola vez. Si ya está confirmado, no se vuelve a mostrar.
// VA-33: las cuentas que no lo confirmaron (Google anteriores a VA-87) llegan acá desde /publish
// con ?from=publish y, al elegir, vuelven a publicar.
export default async function AccountTypePage({ searchParams }: Props) {
  const user = await getCurrentUser();
  if (!user?.id) redirect("/login?callbackUrl=/onboarding/account-type");

  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { userTypeConfirmed: true, userType: true, name: true },
  });
  const { error, from } = await searchParams;
  const fromPublish = from === "publish";
  if (!dbUser || dbUser.userTypeConfirmed) redirect(fromPublish ? "/publish" : `/profile/${user.id}`);

  return (
    <main className="relative isolate min-h-[calc(100vh-80px)] px-4 py-12">
      <PageBackground page="login" />
      <div className="mx-auto max-w-lg rounded-lg border border-[#00205B]/10 bg-white p-6 sm:p-8">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
          {fromPublish ? "Antes de publicar" : "Un paso más"}
        </p>
        <h1 className="mt-1 text-2xl font-bold text-[#00205B]">
          {fromPublish ? (
            "¿Quién publica?"
          ) : (
            <>
              {dbUser.name ? `Hola, ${dbUser.name.split(" ")[0]}.` : "Hola."} ¿Cómo vas a usar tu cuenta?
            </>
          )}
        </h1>
        <p className="mt-2 text-sm text-slate-600">Lo vas a poder cambiar cuando quieras desde Mi perfil.</p>

        <form action={chooseAccountTypeAction} className="mt-6 space-y-3">
          {fromPublish && <input type="hidden" name="from" value="publish" />}
          <fieldset className="space-y-3">
            <legend className="sr-only">Tipo de cuenta</legend>
            {USER_TYPE_OPTIONS.map((o) => (
              <label
                key={o.value}
                className="flex cursor-pointer items-start gap-3 rounded-md border border-[#00205B]/15 p-4 transition-colors hover:border-[#00205B]/40 has-[:checked]:border-[#D62828] has-[:checked]:bg-red-50/40"
              >
                <input
                  type="radio"
                  name="userType"
                  value={o.value}
                  defaultChecked={o.value === dbUser.userType}
                  required
                  className="mt-1 accent-[#D62828]"
                />
                <span>
                  <span className="block font-semibold text-[#00205B]">{o.label}</span>
                  <span className="block text-sm text-slate-600">{HINTS[o.value]}</span>
                </span>
              </label>
            ))}
          </fieldset>
          {error && <p className="text-sm font-medium text-red-700">Elegí una de las opciones.</p>}
          <button
            type="submit"
            className="mt-2 inline-flex min-h-11 w-full items-center justify-center rounded-md bg-[#D62828] px-6 text-sm font-bold text-white transition-colors hover:bg-[#B71F1F]"
          >
            Continuar
          </button>
        </form>
      </div>
    </main>
  );
}
