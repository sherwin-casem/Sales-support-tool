import NextAuth from "next-auth";
import { authConfig } from "@/lib/auth/auth.config.js";

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  secret: process.env.AUTH_SECRET,
});
