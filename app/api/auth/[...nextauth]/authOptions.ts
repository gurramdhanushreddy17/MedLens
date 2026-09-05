import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

const isProd = process.env.NODE_ENV === "production";

export const authOptions: NextAuthOptions = {
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  useSecureCookies: isProd,
  cookies: isProd
    ? {
        sessionToken: {
          name: "__Secure-next-auth.session-token",
          options: {
            httpOnly: true,
            sameSite: "lax",
            path: "/",
            secure: true,
          },
        },
        callbackUrl: {
          name: "__Secure-next-auth.callback-url",
          options: {
            sameSite: "lax",
            path: "/",
            secure: true,
          },
        },
        csrfToken: {
          name: "__Host-next-auth.csrf-token",
          options: {
            httpOnly: true,
            sameSite: "lax",
            path: "/",
            secure: true,
          },
        },
      }
    : undefined,
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const rawEmail = credentials.email.trim();
        const normalizedEmail = rawEmail.toLowerCase();
        const searchEmail = normalizedEmail === "admin" ? "admin@medlens.dev" : normalizedEmail;

        const user = await prisma.user.findFirst({
          where: {
            email: { equals: searchEmail, mode: "insensitive" },
          },
        });

        if (!user) return null;

        // Enforce administrator login only — strictly for authorized administrative emails
        if (user.role !== "admin") {
          return null;
        }

        const passwordMatch = await bcrypt.compare(credentials.password, user.passwordHash);
        if (!passwordMatch) return null;

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: "admin",
        };
      },
    }),
  ],
  callbacks: {
    async redirect({ url, baseUrl }) {
      if (url.startsWith("/")) return url;
      try {
        const parsed = new URL(url);
        if (parsed.host.endsWith(".vercel.app") || parsed.origin === baseUrl) {
          return url;
        }
      } catch {}
      return baseUrl;
    },
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as { role: "admin" }).role;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as "admin";
      }
      return session;
    },
  },
};
