import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" },
  providers: [
    Credentials({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Contraseña", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const email = credentials.email as string;
        const password = credentials.password as string;

        const user = await prisma.user.findUnique({
          where: { email },
        });

        if (!user || !user.passwordHash) {
          return null;
        }

        const isPasswordValid = await bcrypt.compare(
          password,
          user.passwordHash
        );

        if (!isPasswordValid) {
          return null;
        }

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          image: user.image,
          isAdmin: user.isAdmin,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger }) {
      if (user) {
        token.id = user.id;
        token.isAdmin = (user as any).isAdmin;
        token.aircraftListingsBalance = user.aircraftListingsBalance;
        token.sparePartsListingsBalance = user.sparePartsListingsBalance;
      }
      if (user || trigger === "update") {
        const dbUser = await prisma.user.findUnique({
          where: { id: token.sub },
          select: {
            aircraftListingsBalance: true,
            sparePartsListingsBalance: true,
            sellerType: true,
            isAdmin: true,
            role: true,
          },
        });

        if (dbUser) {
          token.aircraftListingsBalance = dbUser.aircraftListingsBalance;
          token.sparePartsListingsBalance = dbUser.sparePartsListingsBalance;
        }
      }
      return token;
    },

    async session({ session, token }) {
      if (session.user) {
        session.user.aircraftListingsBalance = token.aircraftListingsBalance as number;
        session.user.sparePartsListingsBalance = token.sparePartsListingsBalance as number;
        if (token.id) session.user.id = token.id as string;
        (session.user as any).isAdmin = token.isAdmin ?? false;

      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
});