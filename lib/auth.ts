import NextAuth, { type User } from "next-auth";
import { db } from "@/lib/db";
import bcrypt from "bcryptjs";
import CredentialsProvider from "next-auth/providers/credentials";

export const { handlers, signIn, signOut, auth } = NextAuth({
  trustHost: true,
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Contraseña", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const email = String(credentials.email).toLowerCase().trim();
        const password = String(credentials.password);

        const user = await db.user.findUnique({ where: { email } });
        if (!user || !user.password) return null;

        if (user.lockUntil && new Date(user.lockUntil) > new Date()) {
          const remainingMs = new Date(user.lockUntil).getTime() - Date.now();
          const remainingMinutes = Math.max(1, Math.ceil(remainingMs / (60 * 1000)));
          throw new Error(`LOCKED_${remainingMinutes}`);
        }

        const isValid = await bcrypt.compare(password, user.password);
        if (!isValid) {
          const newAttempts = user.failedAttempts + 1;
          const shouldLock = newAttempts >= 5;
          await db.user.update({
            where: { id: user.id },
            data: {
              failedAttempts: newAttempts,
              lockUntil: shouldLock ? new Date(Date.now() + 15 * 60 * 1000) : null,
            },
          });
          return null;
        }

        if (user.failedAttempts > 0 || user.lockUntil) {
          await db.user.update({
            where: { id: user.id },
            data: { failedAttempts: 0, lockUntil: null },
          });
        }

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          isActive: user.isActive,
        } satisfies User;
      },
    }),
  ],
  callbacks: {
    async signIn({ user }) {
      if (user.isActive === false) return "/login?error=Desactivado";
      return true;
    },
    async jwt({ token, user }) {
      if (user) {
        token.sub = user.id;
        if (user.role) token.role = user.role;
        token.isActive = user.isActive;
      }
      return token;
    },
    async session({ session, token, user }) {
      if (token.sub || user?.id) {
        const uid = token.sub ?? user.id;
        const dbUser = await db.user.findUnique({
          where: { id: uid },
          select: { isActive: true, role: true },
        });
        if (!dbUser || !dbUser.isActive) {
          return null as unknown as typeof session;
        }
        session.user.id = uid;
        session.user.role = dbUser.role;
        session.user.isActive = dbUser.isActive;
      }
      return session;
    },
  },
});