import { boundedJson } from "@/lib/read-bounded-body";
import { consumeRateLimit } from "@/lib/security-rate-limit";
import { apiError } from "@/lib/http-error";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getNeonAuth } from "@/lib/auth/server";
import { prisma } from "@/lib/db";
import { signToken, verifyPassword } from "@/lib/auth";
import { validateLogin } from "@/lib/form-validation";

export async function POST(req: Request) {
  try {
    const body = await boundedJson(req,16*1024);
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Envie um e-mail e uma senha válidos." }, { status: 400 });
    }

    const { email, password } = body as { email?: unknown; password?: unknown };

    if (typeof email !== "string" || typeof password !== "string") {
      return NextResponse.json({ error: "E-mail e senha são obrigatórios." }, { status: 400 });
    }

    const fieldErrors = validateLogin({ email, password });
    if (Object.keys(fieldErrors).length > 0) {
      return NextResponse.json({ error: Object.values(fieldErrors)[0] ?? "Revise os dados informados.", fieldErrors }, { status: 400 });
    }

    const normalizedEmail = email.trim().toLowerCase();
    await consumeRateLimit("auth-global-login","global",200);
    await consumeRateLimit("auth-account-login",normalizedEmail,12);

    const neonAuth = getNeonAuth();
    if (neonAuth) {
      const result = await neonAuth.signIn.email({ email: normalizedEmail, password });
      if (result.error) {
        return NextResponse.json({ error: result.error.message || "Credenciais inválidas." }, { status: 401 });
      }

      return NextResponse.json({ success: true });
    }

    const user = await prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (!user?.password || !(await verifyPassword(password, user.password))) {
      return NextResponse.json({ error: "Credenciais inválidas." }, { status: 401 });
    }

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
    return apiError(error,"Não foi possível entrar agora. Tente novamente em instantes.");
  }
}
