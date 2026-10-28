import { boundedJson } from "@/lib/read-bounded-body";
import { consumeRateLimit } from "@/lib/security-rate-limit";
import { apiError } from "@/lib/http-error";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getNeonAuth } from "@/lib/auth/server";
import { prisma } from "@/lib/db";
import { hashPassword, signToken } from "@/lib/auth";
import { validateRegistration } from "@/lib/form-validation";

export async function POST(req: Request) {
  try {
    await consumeRateLimit("auth-global-register","global",200);
    const body = await boundedJson(req,16*1024);
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Envie nome, e-mail e senha válidos." }, { status: 400 });
    }

    const { email, password, name } = body as { email?: unknown; password?: unknown; name?: unknown };

    if (typeof name !== "string" || typeof email !== "string" || typeof password !== "string") {
      return NextResponse.json({ error: "Nome, e-mail e senha são obrigatórios." }, { status: 400 });
    }

    const fieldErrors = validateRegistration({ name, email, password });
    if (Object.keys(fieldErrors).length > 0) {
      return NextResponse.json({ error: Object.values(fieldErrors)[0] ?? "Revise os dados informados.", fieldErrors }, { status: 400 });
    }

    const normalizedEmail = email.trim().toLowerCase();
    await consumeRateLimit("auth-account-register",normalizedEmail,12);
    const normalizedName = name.trim();

    const neonAuth = getNeonAuth();
    if (neonAuth) {
      const result = await neonAuth.signUp.email({ name: normalizedName, email: normalizedEmail, password });
      if (result.error) {
        return NextResponse.json({ error: result.error.message || "Não foi possível criar a conta." }, { status: 400 });
      }

      return NextResponse.json({ success: true });
    }

    const existingUser = await prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (existingUser) {
      return NextResponse.json({ error: "Este e-mail já está cadastrado." }, { status: 409 });
    }

    const user = await prisma.user.create({
      data: { email: normalizedEmail, password: await hashPassword(password), name: normalizedName },
    });
    const token = await signToken({ userId: user.id, email: user.email });
    const cookieStore = await cookies();
    cookieStore.set("session", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7,
      path: "/",
    });

    return NextResponse.json({
      success: true,
      user: { id: user.id, email: user.email, name: user.name },
    });
  } catch (error) {
    return apiError(error,"Não foi possível criar sua conta agora. Tente novamente em instantes.");
  }
}
