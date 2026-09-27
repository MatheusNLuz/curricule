import { cache } from "react";
import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { prisma } from "@/lib/db";
import { getNeonAuth } from "@/lib/auth/server";

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "atsforge-default-ultra-secure-key-32chars-minimum"
);

export type SessionUser = {
  userId: string;
  email: string;
  name?: string | null;
};

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function signToken(payload: { userId: string; email: string }) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(JWT_SECRET);
}

export async function verifyToken(token: string) {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload as SessionUser;
  } catch {
    return null;
  }
}

export const getSessionUser = cache(async function getSessionUser() {
  const neonAuth = getNeonAuth();

  if (neonAuth) {
    try {
      const { data: session } = await neonAuth.getSession();
      const neonUser = session?.user;
      if (!neonUser?.id || !neonUser.email) return null;

      const existingUser = await prisma.user.findFirst({
        where: { OR: [{ neonAuthId: neonUser.id }, { email: neonUser.email }] },
      });

      const user = existingUser
        ? await prisma.user.update({
            where: { id: existingUser.id },
            data: { neonAuthId: neonUser.id, name: neonUser.name || existingUser.name },
            select: { id: true, email: true, name: true },
          })
        : await prisma.user.create({
            data: { neonAuthId: neonUser.id, email: neonUser.email, name: neonUser.name || null, password: null },
            select: { id: true, email: true, name: true },
          });

      return { userId: user.id, email: user.email, name: user.name } satisfies SessionUser;
    } catch (error) {
      console.error("Erro ao consultar sessão Neon Auth:", error);
      return null;
    }
  }

  const cookieStore = await cookies();
  const token = cookieStore.get("session")?.value;
  if (!token) return null;
  return verifyToken(token);
});
