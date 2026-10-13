import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

// Primera barrera para rutas que requieren sesión. Las páginas y server actions
// siguen verificando permisos por su cuenta: el proxy no es la única protección.
export default auth((req) => {
  const { pathname, search } = req.nextUrl;

  if (!req.auth?.user) {
    const loginUrl = new URL("/login", req.nextUrl.origin);
    loginUrl.searchParams.set("callbackUrl", pathname + search);
    return NextResponse.redirect(loginUrl);
  }

  if (pathname.startsWith("/admin") && !req.auth.user.isAdmin) {
    return NextResponse.redirect(new URL("/", req.nextUrl.origin));
  }

  return NextResponse.next();
});

// Rutas protegidas
export const config = {
  matcher: [
    "/publish/:path*",
    "/favs/:path*",
    "/questions/:path*",
    "/ads/:path*",
    "/banners/:path*",
    "/admin/:path*",
    // VA-92: pago y estado del pago
    "/checkout",
    "/payment/:path*",
  ],
};
