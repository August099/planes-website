// lib/auth.ts
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" }, // OBLIGATORIO para el proveedor Credentials
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

        // 1. Buscar el usuario en la BD de Prisma
        const user = await prisma.user.findUnique({
          where: { email },
        });

        // 2. Si no existe o no tiene contraseña (ej. se registró con Google)
        if (!user || !user.passwordHash) {
          return null;
        }

        // 3. Comparar la contraseña provista con el hash en la BD
        const isPasswordValid = await bcrypt.compare(
          password,
          user.passwordHash
        );

        if (!isPasswordValid) {
          return null;
        }

        // 4. Retornar el objeto de usuario REAL de la BD
        return {
          id: user.id,
          name: user.name,
          email: user.email,
          image: user.image,
        };
      },
    }),
  ],
  callbacks: {
    // Pasar el ID del usuario al token JWT
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      }
      return token;
    },
    // Pasar el ID del token JWT a la sesión que lee Next.js
    async session({ session, token }) {
      if (session.user && token.id) {
        session.user.id = token.id as string;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
});