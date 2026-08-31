import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: "ADMIN" | "ORGANIZADOR" | "OPERADOR";
      isActive?: boolean;
    } & DefaultSession["user"];
  }

  interface User {
    role: "ADMIN" | "ORGANIZADOR" | "OPERADOR";
    isActive?: boolean;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role?: "ADMIN" | "ORGANIZADOR" | "OPERADOR";
    isActive?: boolean;
  }
}