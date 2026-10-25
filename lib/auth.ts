import { cache } from "react";
import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { prisma } from "@/lib/db";
import { getNeonAuth } from "@/lib/auth/server";
import { getPreferredProfileName } from "@/lib/user-profile";

function jwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 32) return null;
  return new TextEncoder().encode(secret);
}

export type SessionUser = {
  userId: string;
  email: string;
  name?: string | null;
  image?: string | null;
  role?: string;
};

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function signToken(payload: { userId: string; email: string }) {
  const secret = jwtSecret();
  if (!secret) throw new Error("JWT_SECRET must contain at least 32 characters");
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(secret);
}

export async function verifyToken(token: string) {
  const secret = jwtSecret();
  if (!secret) return null;
  try {
    const { payload } = await jwtVerify(token, secret, { algorithms: ["HS256"] });
    if (typeof payload.userId !== "string" || typeof payload.email !== "string") return null;
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
            data: { neonAuthId: neonUser.id, name: getPreferredProfileName(existingUser.name, neonUser.name) },
            select: { id: true, email: true, name: true, role: true, status: true },
          })
        : await prisma.user.create({
            data: { neonAuthId: neonUser.id, email: neonUser.email, name: neonUser.name || null, password: null },
            select: { id: true, email: true, name: true, role: true, status: true },
          });

      if (user.status !== "ACTIVE") return null;
      return { userId: user.id, email: user.email, name: user.name, role: user.role, image: neonUser.image ?? null } satisfies SessionUser;
    } catch {
      console.error("Não foi possível validar a sessão.");
      return null;
    }
  }

  const cookieStore = await cookies();
  const token = cookieStore.get("session")?.value;
  if (!token) return null;
  const verified = await verifyToken(token);
  if (!verified) return null;
  const user = await prisma.user.findUnique({ where: { id: verified.userId }, select: { id: true, email: true, name: true, role: true, status: true } });
  if (!user || user.status !== "ACTIVE") return null;
  return { userId: user.id, email: user.email, name: user.name, role: user.role } satisfies SessionUser;
});
