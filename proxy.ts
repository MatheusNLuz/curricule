import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getNeonAuth, hasNeonAuthConfig } from "@/lib/auth/server";

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname === "/" || pathname === "/login" || pathname === "/register" || pathname === "/api/auth" || pathname.startsWith("/api/auth/")) {
    return NextResponse.next();
  }

  if (pathname.includes("/preview") && request.nextUrl.searchParams.get("export") === "true") {
    return NextResponse.next();
  }

  if (!hasNeonAuthConfig()) {
    if (pathname.startsWith("/api/")) {
      if (request.cookies.get("session")?.value) return NextResponse.next();
      return NextResponse.json({ error: "Faça login para continuar." }, { status: 401 });
    }

    if (request.cookies.get("session")?.value) return NextResponse.next();

    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", `${pathname}${request.nextUrl.search}`);
    return NextResponse.redirect(loginUrl);
  }

  const auth = getNeonAuth();
  if (!auth) return NextResponse.next();

  return auth.middleware({ loginUrl: "/login" })(request);
}

export const config = {
  matcher: [
    "/",
    "/analysis/:path*",
    "/history/:path*",
    "/settings/:path*",
    "/api/:path*",
  ],
};
