// lib/auth.ts
import NextAuth, { CredentialsSignin } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import FacebookProvider from "next-auth/providers/facebook";
import { PrismaAdapter } from "@auth/prisma-adapter";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { isValidPasswordChangeProof } from "@/lib/password-proof";

// En Auth.js v5 un throw común en authorize() llega al cliente como "CredentialsSignin".
// Con CredentialsSignin + code, el login recibe res.code === "EmailNotVerified" (VA-20).
const ADMIN_RECHECK_MS = 5 * 60 * 1000;

class EmailNotVerifiedError extends CredentialsSignin {
  code = "EmailNotVerified";
}

export const { handlers, auth, signIn, signOut, unstable_update } = NextAuth({
  adapter: PrismaAdapter(prisma),
  providers: [
    FacebookProvider({
      clientId: process.env.AUTH_FACEBOOK_ID,
      clientSecret: process.env.AUTH_FACEBOOK_SECRET,
      allowDangerousEmailAccountLinking: true,
      profile(profile) {
        return {
          id: profile.id,
          name: profile.name,
          email: profile.email,
          image: profile.picture?.data?.url,
          // Marca el email como verificado con la fecha actual
          emailVerified: profile.email ? new Date() : null, 
        };
      },
    }),
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      allowDangerousEmailAccountLinking: true,
      profile(profile) {
        return {
          id: profile.sub,
          name: profile.name,
          email: profile.email,
          image: profile.picture,
          // Google devuelve email_verified como boolean
          emailVerified: profile.email_verified ? new Date() : null, 
        };
      },
    }),
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const user = await prisma.user.findUnique({
          where: { email: (credentials.email as string).toLowerCase() },
        });

        if (!user || !user.passwordHash) return null;

        const isValidPassword = await bcrypt.compare(
          credentials.password as string,
          user.passwordHash
        );

        if (!isValidPassword) return null;

        if (!user.emailVerified) {
          throw new EmailNotVerifiedError();
        }

        return user;
      },
    }),
  ],
  session: { strategy: "jwt" },
  // VA-87: después del primer login con Google, elegir el tipo de cuenta una sola vez.
  pages: { newUser: "/onboarding/account-type" },
  events: {
    // VA-87 · Causa del falso "email no verificado": Auth.js crea los usuarios de OAuth con
    // emailVerified: null (ignora lo que devuelve profile()) y, al vincular Google a una cuenta que
    // ya existía, no toca el usuario. Si Google confirma el email, se guarda acá, en los dos casos.
    // 26/10: también Facebook (solo devuelve emails que la persona ya confirmó en Facebook).
    async signIn({ user, account, profile }) {
      if (!user?.id || !user.email) return;
      const provider = account?.provider;
      const verifiedByProvider =
        provider === "facebook" || (provider === "google" && (profile as { email_verified?: boolean } | undefined)?.email_verified);
      if (!verifiedByProvider) return;
      await prisma.user.updateMany({
        where: { id: user.id, emailVerified: null },
        data: { emailVerified: new Date() },
      });
    },
  },
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id;
        // VA-105 · 3: cuándo se inició esta sesión (para cortarla si después cambia la contraseña).
        token.authAt = Date.now();
      }

      // isAdmin se consultaba en cada request (VA-13). Ahora: al iniciar sesión, con
      // update() y, para que quitar un admin no tarde días, como mucho cada 5 minutos.
      const checkedAt = typeof token.isAdminCheckedAt === "number" ? token.isAdminCheckedAt : 0;
      const stale = Date.now() - checkedAt > ADMIN_RECHECK_MS;
      if (token?.email && (user || trigger === "update" || stale)) {
        // VA-87: también emailVerified y userTypeConfirmed, leídos de la base (no del proveedor).
        const dbUser = await prisma.user.findUnique({
          where: { email: token.email },
          select: { id: true, isAdmin: true, emailVerified: true, userTypeConfirmed: true, passwordChangedAt: true },
        });
        // VA-105 · 3: la contraseña cambió después de iniciar esta sesión → se cierra (null borra la
        // cookie). El dispositivo que la cambió presenta la prueba firmada y sigue adentro. Como este
        // bloque corre como mucho cada ADMIN_RECHECK_MS, los otros dispositivos salen en ≤ 5 minutos.
        const changedAt = dbUser?.passwordChangedAt ?? null;
        if (dbUser && trigger === "update" && isValidPasswordChangeProof((session as { passwordChangeProof?: unknown } | undefined)?.passwordChangeProof, dbUser.id, changedAt)) {
          token.authAt = Date.now();
        }
        const authAt = typeof token.authAt === "number" ? token.authAt : 0;
        if (changedAt && changedAt.getTime() > authAt) return null;
        token.isAdmin = dbUser?.isAdmin ?? false;
        token.emailVerified = dbUser?.emailVerified ? dbUser.emailVerified.toISOString() : null;
        token.userTypeConfirmed = dbUser?.userTypeConfirmed ?? false;
        token.isAdminCheckedAt = Date.now();
      }

      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.sub as string;
        session.user.isAdmin = (token.isAdmin as boolean) || false;
        session.user.emailVerifiedAt = (token.emailVerified as string | null | undefined) ?? null;
        session.user.userTypeConfirmed = (token.userTypeConfirmed as boolean | undefined) ?? false;
      }
      return session;
    },
  },
});