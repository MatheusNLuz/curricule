import { NextResponse } from "next/server";
import { logoutCurrentUser } from "@/lib/auth/logout";
import { createLogoutRedirectResponse } from "@/lib/auth/logout-response";

export async function POST() {
  try {
    await logoutCurrentUser();
    return createLogoutRedirectResponse();
  } catch (error) {
    console.error("Erro ao encerrar sessão:", error);
    return NextResponse.json({ error: "Não foi possível sair da conta. Tente novamente." }, { status: 503 });
  }
}
