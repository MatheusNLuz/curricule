import { NextResponse } from "next/server";
import { logoutCurrentUser } from "@/lib/auth/logout";

export async function POST(request: Request) {
  try {
    await logoutCurrentUser();
    return NextResponse.redirect(new URL("/login", request.url), 303);
  } catch (error) {
    console.error("Erro ao encerrar sessão:", error);
    return NextResponse.json({ error: "Não foi possível sair da conta. Tente novamente." }, { status: 503 });
  }
}
