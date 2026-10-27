"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";

// 27/10 (socio): no se puede usar el sitio con una cuenta sin términos aceptados o sin email verificado
// (pasa sobre todo al entrar por primera vez con Google o Facebook). Va en el header, así está en todas las
// páginas sin volverlas dinámicas; las secciones protegidas también lo chequean en el servidor (proxy.ts).
// Las páginas de abajo quedan libres: completar la cuenta, leer los términos y verificar el mail.
const FREE = [/^\/onboarding\//, /^\/verify-email/, /^\/terms/, /^\/privacy/, /^\/arrepentimiento/, /^\/login/, /^\/register/];

export function AccountGate() {
  const { data, status } = useSession();
  const pathname = usePathname();
  const router = useRouter();
  const user = data?.user;
  const incomplete = status === "authenticated" && !!user && (!user.termsAccepted || !user.emailVerifiedAt);

  useEffect(() => {
    if (!incomplete || FREE.some((re) => re.test(pathname))) return;
    router.replace(`/onboarding/completar?next=${encodeURIComponent(pathname)}`);
  }, [incomplete, pathname, router]);

  return null;
}
