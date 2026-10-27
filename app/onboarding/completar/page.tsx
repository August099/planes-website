import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-helpers";
import { PageBackground } from "@/components/ui/PageBackground";
import { CompleteAccount } from "./CompleteAccount";
import SessionProvider from "@/components/ui/SessionProvider";

export const metadata: Metadata = {
  title: "Completá tu cuenta",
  robots: { index: false, follow: false },
};

// 27/10: para usar el sitio hace falta aceptar los términos y verificar el email, también entrando con Google o
// Facebook. AccountGate (en el header) y proxy.ts mandan acá a las cuentas a las que les falta algo.
// El destino de vuelta es siempre una ruta interna (no una URL libre).
export default async function CompleteAccountPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const user = await getCurrentUser();
  if (!user?.id) redirect("/login?callbackUrl=/onboarding/completar");
  const { next } = await searchParams;
  const safeNext = next && next.startsWith("/") && !next.startsWith("//") ? next : `/profile/${user.id}`;

  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { email: true, name: true, termsAcceptedAt: true, emailVerified: true, userTypeConfirmed: true },
  });
  if (!dbUser) redirect("/login");

  // Después de esto, si todavía no eligió el tipo de cuenta, va a esa pantalla (VA-87).
  const done = dbUser.userTypeConfirmed ? safeNext : "/onboarding/account-type";

  return (
    <main className="relative isolate min-h-[calc(100vh-80px)] px-4 py-12">
      <PageBackground page="login" />
      <SessionProvider>
        <CompleteAccount
          name={dbUser.name?.split(" ")[0] ?? null}
          email={dbUser.email}
          termsAccepted={!!dbUser.termsAcceptedAt}
          emailVerified={!!dbUser.emailVerified}
          next={done}
        />
      </SessionProvider>
    </main>
  );
}
