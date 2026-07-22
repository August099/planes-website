import { signIn } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { AuthLayout } from "@/components/ui/AuthLayout";
import Link from "next/link";
import { AuthError } from "next-auth";
import { redirect } from "next/navigation";

interface LoginPageProps {
  searchParams: Promise<{ error?: string }>;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const hasError = params?.error === "CredentialsSignin";

  return (
    <AuthLayout title="Bienvenido de nuevo" subtitle="Ingresá a tu cuenta">
      {/* Botón Google */}
      <form
        action={async () => {
          "use server";
          await signIn("google", { redirectTo: "/panel" });
        }}
      >
        <Button type="submit" variant="outline" className="w-full gap-2">
          <svg width="18" height="18" viewBox="0 0 48 48">
            <path
              fill="#EA4335"
              d="M24 9.5c3.9 0 6.6 1.7 8.1 3.1l6-5.9C34.6 3.4 30 1.5 24 1.5 14.9 1.5 7.1 6.9 3.6 14.6l7.1 5.5C12.4 14.1 17.7 9.5 24 9.5z"
            />
            <path
              fill="#4285F4"
              d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.6c-.5 3-2.2 5.5-4.7 7.2l7.1 5.5c4.2-3.9 6.5-9.6 6.5-17.2z"
            />
            <path
              fill="#FBBC05"
              d="M10.7 28.1c-.5-1.5-.8-3-.8-4.6s.3-3.1.8-4.6l-7.1-5.5C2 16.6 1.5 20.2 1.5 24s.5 7.4 2.1 10.6l7.1-5.5z"
            />
            <path
              fill="#34A853"
              d="M24 46.5c6 0 11-2 14.6-5.4l-7.1-5.5c-2 1.3-4.5 2.1-7.5 2.1-6.3 0-11.6-4.6-13.3-10.6l-7.1 5.5C7.1 41.1 14.9 46.5 24 46.5z"
            />
          </svg>
          Continuar con Google
        </Button>
      </form>

      {/* Botón Facebook */}
      <form
        action={async () => {
          "use server";
          await signIn("facebook", { redirectTo: "/panel" });
        }}
      >
        <Button type="submit" variant="outline" className="w-full gap-2">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="#1877F2">
            <path d="M24 12.07C24 5.4 18.63 0 12 0S0 5.4 0 12.07C0 18.1 4.39 23.09 10.13 24v-8.44H7.08v-3.49h3.05V9.41c0-3.02 1.79-4.7 4.53-4.7 1.31 0 2.68.24 2.68.24v2.97h-1.51c-1.49 0-1.95.93-1.95 1.89v2.26h3.32l-.53 3.49h-2.79V24C19.61 23.09 24 18.1 24 12.07z" />
          </svg>
          Continuar con Facebook
        </Button>
      </form>

      <div className="flex items-center gap-3 py-1">
        <Separator className="flex-1" />
        <span className="text-xs text-muted-foreground">o</span>
        <Separator className="flex-1" />
      </div>

      {/* Cartel de Alerta si la contraseña/email fallan */}
      {hasError && (
        <div className="rounded-md bg-red-50 p-3 text-sm text-red-600 border border-red-200 dark:bg-red-950/50 dark:border-red-900 dark:text-red-300">
          Email o contraseña incorrectos. Por favor, verificá tus datos.
        </div>
      )}

      {/* Formulario de Credentials */}
      <form
        action={async (formData) => {
          "use server";
          try {
            await signIn("credentials", {
              email: formData.get("email"),
              password: formData.get("password"),
              redirectTo: "/panel",
            });
          } catch (error) {
            if (error instanceof AuthError) {
              return redirect("/login?error=CredentialsSignin");
            }
            // Re-lanzamos cualquier otro error (incluyendo NEXT_REDIRECT de Next.js)
            throw error;
          }
        }}
        className="space-y-3"
      >
        <div className="space-y-1">
          <Label htmlFor="email">Email</Label>
          <Input id="email" name="email" type="email" required />
        </div>
        <div className="space-y-1">
          <Label htmlFor="password">Contraseña</Label>
          <Input id="password" name="password" type="password" required />
        </div>
        <Button type="submit" className="w-full bg-[#E70F1F] hover:bg-[#c00d1a]">
          Continuar con email
        </Button>
      </form>

      <p className="text-center text-sm text-muted-foreground">
        ¿No tenés cuenta?{" "}
        <Link href="/register" className="text-[#E70F1F] font-medium hover:underline">
          Registrate
        </Link>
      </p>
    </AuthLayout>
  );
}