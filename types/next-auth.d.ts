import type { DefaultSession } from "next-auth";

// Lo que agrega lib/auth.ts a la sesión y al token (VA-26). Antes se declaraban SellerType
// (no existe en Prisma) y role (no se usa), y Session estaba declarada dos veces.
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      isAdmin?: boolean;
      // VA-87: fecha (ISO) en que se verificó el email, leída de la base.
      emailVerifiedAt?: string | null;
      userTypeConfirmed?: boolean;
    } & DefaultSession["user"];
  }

  interface User {
    isAdmin?: boolean;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    isAdmin?: boolean;
    isAdminCheckedAt?: number;
    emailVerified?: string | null;
    userTypeConfirmed?: boolean;
  }
}
